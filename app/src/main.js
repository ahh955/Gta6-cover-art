// Vice Cast Cover Studio — wires the editor.
//
// Owns the cover state (photos, panels, words, look), the controls, the
// canvas interactions (click to select, drag to pan, wheel to zoom, drop a
// photo to fill), the face-aware crops, the undo/redo history and the PNG
// export in three post sizes. A `?shot=` query sets up a fixed scene for a
// screenshot instead (./shots.js).
import {
  GRADES,
  LAYOUTS,
  ROLE_TAGS,
  SAMPLE_CAST,
  SIZE_PRESETS,
  SUBTITLE_FONTS,
  TITLE_STYLES,
  drawCover,
  layoutPanels,
  panelAt,
} from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const statusEl = $('status');

/** The whole cover state, in one place so history can snapshot it. */
const state = {
  photos: [],
  panels: [],
  layout: 'hero',
  grade: 'sunset',
  titleStyle: 'sunset',
  subtitleFont: 'pacifico',
  title: 'VICE CAST',
  subtitle: 'Seven souls. One city.',
  tagline: 'Every crew has a story',
  quote: 'The cover of the summer',
  look: { paint: 0.5, grade: 0.7, halftone: 0.25, grain: 0.35, glow: 0.5, titleSize: 0.5 },
  size: '1x1',
  selected: 0,
};

for (let i = 0; i < 7; i += 1) {
  state.panels.push({ photo: null, zoom: 1, px: 0.5, py: 0.42, flip: false, role: ROLE_TAGS[i] });
}

let faceDetector = null;
try {
  if ('FaceDetector' in window) faceDetector = new FaceDetector({ fastMode: true });
} catch {
  faceDetector = null;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Finds the face in a photo with the browser's FaceDetector where available.
 * Returns the face centre in image fractions, or null when the browser has
 * no detector or no face was found.
 */
async function detectFace(img) {
  if (!faceDetector) return null;
  try {
    const faces = await faceDetector.detect(img);
    if (!faces.length) return null;
    const box = faces[0].boundingBox;
    return {
      x: (box.x + box.width / 2) / img.naturalWidth,
      y: (box.y + box.height / 2) / img.naturalHeight,
    };
  } catch {
    return null;
  }
}

/** The rule-of-thirds fallback for a photo with no detected face. */
function fallbackFace(img) {
  const tallPortrait = img.naturalHeight / img.naturalWidth >= 1.4;
  return { x: 0.5, y: tallPortrait ? 0.3 : 0.38 };
}

/**
 * Adds a photo to the tray and returns its index. The crop anchor is the
 * detected face, else the photo's known anchor (the sample cast ships with
 * one), else the rule-of-thirds fallback.
 */
async function addPhoto(img, name, knownFace) {
  const face = (await detectFace(img)) ?? knownFace ?? fallbackFace(img);
  state.photos.push({ img, name, face });
  renderTray();
  return state.photos.length - 1;
}

/** Fills empty panels with the sample crew, in cast order. */
async function loadSampleCrew() {
  setStatus('Loading the sample crew…');
  for (const member of SAMPLE_CAST) {
    if (state.photos.some((p) => p.name === member.name)) continue;
    try {
      const img = await loadImage(`samples/${member.file}`);
      await addPhoto(img, member.name, member.face);
    } catch {
      // A missing sample never blocks the rest of the crew.
    }
  }
  fillPanelsFromTray();
  setStatus('Sample crew loaded — drag, crop and caption them.');
}

/** Fills each empty panel with the next unplaced photo. */
function fillPanelsFromTray() {
  const used = new Set(state.panels.map((p) => p.photo).filter((i) => i != null));
  const free = state.photos.map((_, i) => i).filter((i) => !used.has(i));
  for (const panel of state.panels) {
    if (panel.photo == null && free.length) {
      const idx = free.shift();
      panel.photo = idx;
      centrePanelOnFace(panel, idx);
    }
  }
  pushHistory();
  render();
}

/** Points a panel's crop at its photo's face. */
function centrePanelOnFace(panel, photoIndex) {
  const photo = state.photos[photoIndex];
  if (!photo) return;
  panel.px = photo.face.x;
  panel.py = photo.face.y;
}

/** The preview canvas size for the chosen post size. */
function previewSize() {
  const preset = SIZE_PRESETS[state.size];
  // A cover screenshot fills the 1280x720 frame; the editor preview stays smaller.
  const budget = document.body.classList.contains('shot-cover') ? 1280 : 720;
  const scale = Math.min(budget / preset.w, 720 / preset.h);
  return { w: Math.round(preset.w * scale), h: Math.round(preset.h * scale) };
}

let renderQueued = false;
function render() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const { w, h } = previewSize();
    if (preview.width !== w || preview.height !== h) {
      preview.width = w;
      preview.height = h;
    }
    drawCover(preview, state);
    renderThumbs();
    syncPanelControls();
  });
}

/** The three live size thumbnails under the preview. */
function renderThumbs() {
  for (const [id, preset] of Object.entries(SIZE_PRESETS)) {
    const thumb = $(`thumb-${id}`);
    if (!thumb) continue;
    const scale = 132 / preset.w;
    const w = Math.round(preset.w * scale);
    const h = Math.round(preset.h * scale);
    if (thumb.width !== w || thumb.height !== h) {
      thumb.width = w;
      thumb.height = h;
    }
    const snap = { ...state, selected: -1 };
    drawCover(thumb, snap);
  }
}

/** The cast tray: a draggable thumbnail per photo. */
function renderTray() {
  const tray = $('tray');
  tray.replaceChildren();
  state.photos.forEach((photo, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tray-item';
    button.draggable = true;
    button.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    button.append(img);
    const tag = document.createElement('span');
    tag.textContent = photo.name;
    button.append(tag);
    button.addEventListener('click', () => {
      pushHistory();
      const panel = state.panels[state.selected];
      panel.photo = i;
      centrePanelOnFace(panel, i);
      render();
    });
    button.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/photo-index', String(i));
    });
    tray.append(button);
  });
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** A JSON snapshot of everything Undo/Redo restores (photos stay put). */
function snapshot() {
  return JSON.stringify({
    panels: state.panels,
    layout: state.layout,
    grade: state.grade,
    titleStyle: state.titleStyle,
    subtitleFont: state.subtitleFont,
    title: state.title,
    subtitle: state.subtitle,
    tagline: state.tagline,
    quote: state.quote,
    look: state.look,
    size: state.size,
    selected: state.selected,
  });
}

function restore(json) {
  const data = JSON.parse(json);
  Object.assign(state, data);
  syncControls();
  render();
}

const undoStack = [];
const redoStack = [];
function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 40) undoStack.shift();
  redoStack.length = 0;
}
function undo() {
  if (undoStack.length < 2) return;
  redoStack.push(undoStack.pop());
  restore(undoStack[undoStack.length - 1]);
}
function redo() {
  if (!redoStack.length) return;
  const next = redoStack.pop();
  undoStack.push(next);
  restore(next);
}

/** Renders the cover at full export size and downloads it as a PNG. */
async function exportPng(sizeId) {
  const preset = SIZE_PRESETS[sizeId];
  const canvas = document.createElement('canvas');
  canvas.width = preset.w;
  canvas.height = preset.h;
  const snap = { ...state, selected: -1 };
  drawCover(canvas, snap);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vice-cast-cover-${preset.w}x${preset.h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  setStatus(`Saved vice-cast-cover-${preset.w}x${preset.h}.png`);
}

async function exportAll() {
  for (const id of Object.keys(SIZE_PRESETS)) {
    await exportPng(id);
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
}

/** Picks a layout from the photos at hand: portraits favour the hero mosaic. */
function autoLayout() {
  const portraits = state.photos.filter((p) => p.img.naturalHeight > p.img.naturalWidth).length;
  const count = state.photos.length;
  if (count >= 7) state.layout = 'seven';
  else if (portraits >= count / 2) state.layout = 'hero';
  else if (count >= 6) state.layout = 'six';
  else state.layout = 'diagonal';
  pushHistory();
  syncControls();
  render();
}

const TAGLINES = [
  'Every crew has a story',
  'Outrun the night',
  'The city never sleeps',
  'Seven souls, one score',
  'Sunset is just the start',
];

/** A fresh random look: layout, grade, title style and tagline. */
function surpriseMe() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.layout = pick(Object.keys(LAYOUTS));
  state.grade = pick(Object.keys(GRADES));
  state.titleStyle = pick(Object.keys(TITLE_STYLES));
  state.tagline = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];
  pushHistory();
  syncControls();
  render();
}

function syncControls() {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('tagline').value = state.tagline;
  $('quote').value = state.quote;
  for (const el of document.querySelectorAll('[data-layout]')) {
    el.classList.toggle('active', el.dataset.layout === state.layout);
  }
  for (const el of document.querySelectorAll('[data-grade]')) {
    el.classList.toggle('active', el.dataset.grade === state.grade);
  }
  for (const el of document.querySelectorAll('[data-title-style]')) {
    el.classList.toggle('active', el.dataset.titleStyle === state.titleStyle);
  }
  for (const el of document.querySelectorAll('[data-subtitle-font]')) {
    el.classList.toggle('active', el.dataset.subtitleFont === state.subtitleFont);
  }
  for (const el of document.querySelectorAll('[data-size]')) {
    el.classList.toggle('active', el.dataset.size === state.size);
  }
  for (const [key, value] of Object.entries(state.look)) {
    const slider = $(`look-${key}`);
    if (slider) slider.value = value;
  }
  syncPanelControls();
}

function syncPanelControls() {
  const panel = state.panels[state.selected];
  $('panel-label').textContent = `Panel ${state.selected + 1} of ${layoutPanels(state.layout, 1, 1).length}`;
  $('role').value = panel ? panel.role : '';
  $('zoom').value = panel ? panel.zoom : 1;
  $('pan-x').value = panel ? panel.px : 0.5;
  $('pan-y').value = panel ? panel.py : 0.42;
}

/** Maps a pointer event on the preview to cover pixels. */
function eventToCover(e) {
  const rect = preview.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * preview.width,
    y: ((e.clientY - rect.top) / rect.height) * preview.height,
  };
}

let drag = null;
preview.addEventListener('pointerdown', (e) => {
  const { x, y } = eventToCover(e);
  const index = panelAt(state.layout, preview.width, preview.height, x, y);
  if (index === -1) return;
  state.selected = index;
  const panel = state.panels[index];
  drag = { panel, startX: x, startY: y, px: panel.px, py: panel.py };
  preview.setPointerCapture(e.pointerId);
  render();
});
preview.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const { x, y } = eventToCover(e);
  const photo = state.photos[drag.panel.photo];
  if (!photo) return;
  const rects = layoutPanels(state.layout, preview.width, preview.height);
  const rect = rects[state.selected];
  const scale = Math.max(rect.w / photo.img.naturalWidth, rect.h / photo.img.naturalHeight) * drag.panel.zoom;
  drag.panel.px = drag.px - (x - drag.startX) / (photo.img.naturalWidth * scale);
  drag.panel.py = drag.py - (y - drag.startY) / (photo.img.naturalHeight * scale);
  drag.panel.px = Math.min(1, Math.max(0, drag.panel.px));
  drag.panel.py = Math.min(1, Math.max(0, drag.panel.py));
  render();
});
preview.addEventListener('pointerup', () => {
  if (drag) {
    pushHistory();
    drag = null;
  }
});
preview.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selected];
  if (!panel || panel.photo == null) return;
  panel.zoom = Math.min(3, Math.max(1, panel.zoom - Math.sign(e.deltaY) * 0.12));
  pushHistory();
  render();
}, { passive: false });
preview.addEventListener('dragover', (e) => e.preventDefault());
preview.addEventListener('drop', async (e) => {
  e.preventDefault();
  const { x, y } = eventToCover(e);
  const index = panelAt(state.layout, preview.width, preview.height, x, y);
  if (index === -1) return;
  const photoIndex = e.dataTransfer.getData('text/photo-index');
  if (photoIndex !== '') {
    pushHistory();
    state.selected = index;
    const panel = state.panels[index];
    panel.photo = Number(photoIndex);
    centrePanelOnFace(panel, Number(photoIndex));
    render();
    return;
  }
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    const idx = await addPhoto(await loadImage(URL.createObjectURL(file)), file.name);
    pushHistory();
    state.selected = index;
    const panel = state.panels[index];
    panel.photo = idx;
    centrePanelOnFace(panel, idx);
    render();
  }
});

$('add-photos').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    if (!file.type.startsWith('image/')) continue;
    await addPhoto(await loadImage(URL.createObjectURL(file)), file.name);
  }
  fillPanelsFromTray();
  e.target.value = '';
});
$('sample-crew').addEventListener('click', loadSampleCrew);
$('one-photo').addEventListener('click', () => {
  if (!state.photos.length) return;
  pushHistory();
  const first = state.photos[0];
  state.panels.forEach((panel, i) => {
    panel.photo = 0;
    panel.px = first.face.x;
    panel.py = first.face.y;
    panel.zoom = 1 + (i % 3) * 0.35;
  });
  render();
});

for (const [id, key] of [['title', 'title'], ['subtitle', 'subtitle'], ['tagline', 'tagline'], ['quote', 'quote']]) {
  $(id).addEventListener('input', (e) => {
    state[key] = e.target.value;
    render();
  });
  $(id).addEventListener('change', pushHistory);
}

document.querySelectorAll('[data-layout]').forEach((el) => {
  el.addEventListener('click', () => {
    state.layout = el.dataset.layout;
    pushHistory();
    syncControls();
    render();
  });
});
document.querySelectorAll('[data-grade]').forEach((el) => {
  el.addEventListener('click', () => {
    state.grade = el.dataset.grade;
    pushHistory();
    syncControls();
    render();
  });
});
document.querySelectorAll('[data-title-style]').forEach((el) => {
  el.addEventListener('click', () => {
    state.titleStyle = el.dataset.titleStyle;
    pushHistory();
    syncControls();
    render();
  });
});
document.querySelectorAll('[data-subtitle-font]').forEach((el) => {
  el.addEventListener('click', () => {
    state.subtitleFont = el.dataset.subtitleFont;
    pushHistory();
    syncControls();
    render();
  });
});
document.querySelectorAll('[data-size]').forEach((el) => {
  el.addEventListener('click', () => {
    state.size = el.dataset.size;
    pushHistory();
    syncControls();
    render();
  });
});

for (const key of Object.keys(state.look)) {
  $(`look-${key}`).addEventListener('input', (e) => {
    state.look[key] = Number(e.target.value);
    render();
  });
  $(`look-${key}`).addEventListener('change', pushHistory);
}

$('role').addEventListener('input', (e) => {
  state.panels[state.selected].role = e.target.value;
  render();
});
$('role').addEventListener('change', pushHistory);
$('zoom').addEventListener('input', (e) => {
  state.panels[state.selected].zoom = Number(e.target.value);
  render();
});
$('zoom').addEventListener('change', pushHistory);
$('pan-x').addEventListener('input', (e) => {
  state.panels[state.selected].px = Number(e.target.value);
  render();
});
$('pan-y').addEventListener('input', (e) => {
  state.panels[state.selected].py = Number(e.target.value);
  render();
});
$('face-btn').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  if (panel.photo == null) return;
  pushHistory();
  centrePanelOnFace(panel, panel.photo);
  render();
});
$('flip-btn').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  panel.flip = !panel.flip;
  pushHistory();
  render();
});
$('swap-btn').addEventListener('click', () => {
  const count = layoutPanels(state.layout, 1, 1).length;
  const next = (state.selected + 1) % count;
  pushHistory();
  const a = state.panels[state.selected];
  const b = state.panels[next];
  [a.photo, b.photo] = [b.photo, a.photo];
  [a.px, b.px] = [b.px, a.px];
  [a.py, b.py] = [b.py, a.py];
  state.selected = next;
  render();
});
$('reset-btn').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  pushHistory();
  panel.zoom = 1;
  panel.flip = false;
  panel.role = ROLE_TAGS[state.selected];
  if (panel.photo != null) centrePanelOnFace(panel, panel.photo);
  render();
});
$('empty-btn').addEventListener('click', () => {
  pushHistory();
  state.panels[state.selected].photo = null;
  render();
});
$('auto-layout').addEventListener('click', autoLayout);
$('surprise').addEventListener('click', surpriseMe);
$('undo-btn').addEventListener('click', undo);
$('redo-btn').addEventListener('click', redo);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) undo();
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) redo();
});
$('export-btn').addEventListener('click', () => exportPng(state.size));
$('export-all').addEventListener('click', exportAll);

pushHistory();
syncControls();

/** Loads the vendored fonts, then paints the first frame. */
async function boot() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px Pacifico'),
      document.fonts.ready,
    ]);
  } catch {
    // The app still draws with its fallback fonts.
  }
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    // A cover screenshot shows the poster, not the editor's selection outline.
    if (shot === 'cover') state.selected = -1;
    await runShot(shot, new URLSearchParams(location.search), {
      loadCrew: loadSampleCrew,
      applyScene: (scene) => {
        if (scene.layout) state.layout = scene.layout;
        if (scene.size) state.size = scene.size;
        if (scene.title) state.title = scene.title;
        if (scene.subtitle) state.subtitle = scene.subtitle;
        if (scene.grade) state.grade = scene.grade;
        if (scene.titleStyle) state.titleStyle = scene.titleStyle;
        pushHistory();
        syncControls();
      },
      whenReady: () => new Promise((resolve) => {
        render();
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
    });
  } else {
    await loadSampleCrew();
  }
  render();
}

boot();
