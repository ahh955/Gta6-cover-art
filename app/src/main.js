// main.js — Vice Cast Cover Studio editor.
// Loads photos (yours or the built-in sample crew), detects faces for
// face-filling crops, and wires the dense 3-column editor around the poster
// engine in cover.js. Everything runs offline; photos never leave the device.

import {
  SIZES, LAYOUTS, GRADES, TITLE_STYLES, SCRIPT_FONTS,
  layoutRects, defaultState, renderPoster, exportPosterPNG,
} from './cover.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const SAMPLE_CREW = [
  { file: 'cast-01.jpg', name: 'Mara', role: 0 },
  { file: 'cast-02.jpg', name: 'Dante', role: 1 },
  { file: 'cast-03.jpg', name: 'Sal', role: 2 },
  { file: 'cast-04.jpg', name: 'Ruby', role: 3 },
  { file: 'cast-05.jpg', name: 'Rex', role: 4, focus: { x: 0.42, y: 0.42 }, zoomHint: 1.15 },
  { file: 'cast-06.jpg', name: 'Ingrid', role: 5 },
  { file: 'cast-07.jpg', name: 'Cap', role: 6 },
  { file: 'cast-08.jpg', name: 'Leo', role: 7 },
  { file: 'scene-car.jpg', name: 'Getaway car', scene: 0 },
  { file: 'scene-boat.jpg', name: 'Escape boat', scene: 1 },
];

const SURPRISE_TITLES = [
  ['GOLDEN GETAWAY', 'One last summer job'],
  ['PALM & PISTOL', 'Kings of the Causeway'],
  ['MIDNIGHT TIDE', 'Boulevard nights'],
  ['CORAL HEAT', 'The sun sets. The crew rises.'],
  ['SUNSET SYNDICATE', 'Seven players. One score.'],
  ['NEON HARBOR', 'Everyone wants a cut'],
];

const state = defaultState();
let photos = [];          // { id, src, img, name, face, isScene, sceneIndex }
let panels = [];          // { photoId, zoom, panX, panY, flip }
let selected = 0;
let photoSeq = 0;
let faceDetector = null;
try {
  if ('FaceDetector' in window) faceDetector = new FaceDetector({ fastMode: true });
} catch { faceDetector = null; }

const undoStack = [];
const redoStack = [];
let renderTimer = 0;

// ---- photos ---------------------------------------------------------------
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function detectFaceFor(photo) {
  if (!faceDetector || photo.isScene) return;
  try {
    const faces = await faceDetector.detect(photo.img);
    if (faces && faces.length) {
      const b = faces[0].boundingBox;
      const w = photo.img.naturalWidth, h = photo.img.naturalHeight;
      photo.face = { x: b.x / w, y: b.y / h, w: b.width / w, h: b.height / h };
      scheduleRender();
    }
  } catch { /* FaceDetector unavailable — the centre/rule-of-thirds fallback applies. */ }
}

async function addPhoto(src, name, meta = {}) {
  const img = await loadImage(src);
  const photo = {
    id: `p${++photoSeq}`, src, img, name,
    face: null, isScene: !!meta.scene, sceneIndex: meta.scene ?? null,
    focus: meta.focus || null, zoomHint: meta.zoomHint || null,
  };
  photos.push(photo);
  detectFaceFor(photo);
  return photo;
}

async function loadSampleCrew() {
  photos = [];
  for (const s of SAMPLE_CREW) {
    try {
      await addPhoto(`./samples/${s.file}`, s.name, {
        ...(s.scene !== undefined ? { scene: s.scene } : {}),
        ...(s.focus ? { focus: s.focus } : {}),
        ...(s.zoomHint ? { zoomHint: s.zoomHint } : {}),
      });
    } catch { /* a missing sample never blocks the editor */ }
  }
  autoFillPanels();
  renderTray();
}

function photoById(id) { return photos.find((p) => p.id === id) || null; }

function panelPhoto(panel) {
  const p = photoById(panel.photoId);
  if (!p) return null;
  return { img: p.img, face: p.face, isScene: p.isScene, sceneIndex: p.sceneIndex };
}

function resolvedPanels() {
  return panels.map((p) => ({ ...p, photo: panelPhoto(p) }));
}

// ---- panels ---------------------------------------------------------------
function ensurePanels() {
  const count = LAYOUTS[state.layout].panels;
  while (panels.length < count) panels.push({ photoId: null, zoom: 1, panX: 0, panY: 0, flip: false });
  panels.length = count;
  if (selected >= count) selected = 0;
}

function autoFillPanels() {
  ensurePanels();
  const cast = photos.filter((p) => !p.isScene);
  const scenes = photos.filter((p) => p.isScene);
  const pool = [...cast];
  panels.forEach((panel, i) => {
    // Mix one scene panel into the middle of the poster for story.
    if (scenes.length && i === Math.floor(panels.length / 2) && panels.length >= 6) {
      panel.photoId = scenes[i % scenes.length].id;
    } else if (pool.length) {
      panel.photoId = pool[i % pool.length].id;
    }
    panel.zoom = 1; panel.panX = 0; panel.panY = 0; panel.flip = false;
  });
  // Give the hero panel a slightly different crop so repeats never look cloned.
  if (panels[0]) panels[0].panY = -0.04;
}

function onePhotoAllPanels() {
  const p = photoById(panels[selected]?.photoId) || photos[0];
  if (!p) return;
  pushHistory();
  panels.forEach((panel, i) => {
    panel.photoId = p.id;
    panel.zoom = 1 + (i % 3) * 0.12;
    panel.panX = ((i * 37) % 11 - 5) / 40;
    panel.panY = ((i * 53) % 9 - 4) / 40;
  });
  scheduleRender();
  setStatus(`Every panel now shows ${p.name} — each with its own crop.`);
}

// ---- history --------------------------------------------------------------
function snapshot() {
  return JSON.stringify({ state, panels, selected });
}
function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
  updateUndoButtons();
}
function restore(json) {
  const data = JSON.parse(json);
  Object.assign(state, data.state);
  panels = data.panels;
  selected = data.selected || 0;
  syncInputs();
  scheduleRender();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  updateUndoButtons();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  updateUndoButtons();
}
function updateUndoButtons() {
  $('#undoBtn').disabled = !undoStack.length;
  $('#redoBtn').disabled = !redoStack.length;
}

// ---- rendering ------------------------------------------------------------
const posterCanvas = $('#poster');

function render() {
  ensurePanels();
  renderPoster(posterCanvas, state, resolvedPanels(), state.size);
  renderBadges();
  updatePanelBar();
  renderThumbsSoon();
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 30);
}

let thumbsTimer = 0;
function renderThumbsSoon() {
  clearTimeout(thumbsTimer);
  thumbsTimer = setTimeout(renderThumbs, 250);
}
function renderThumbs() {
  const rp = resolvedPanels();
  renderPoster($('#thumb11'), state, rp, '1:1');
  renderPoster($('#thumb45'), state, rp, '4:5');
  renderPoster($('#thumb169'), state, rp, '16:9');
}

// Panel number badges overlaid on the live preview.
function renderBadges() {
  const box = $('#badges');
  box.innerHTML = '';
  const rects = layoutRects(state.layout);
  const W = posterCanvas.width, H = posterCanvas.height;
  const panelLeft = W * 0.012, panelTop = H * 0.062;
  const panelW = W * 0.976, panelH = H * (0.878 - 0.062);
  rects.forEach((r, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `badge${i === selected ? ' sel' : ''}`;
    b.textContent = String(i + 1);
    b.draggable = true;
    b.style.left = `${((panelLeft + r[0] * panelW + 16) / W) * 100}%`;
    b.style.top = `${((panelTop + r[1] * panelH + 16) / H) * 100}%`;
    b.title = `Panel ${i + 1} — drag onto another panel to swap`;
    b.addEventListener('click', (e) => { e.stopPropagation(); selectPanel(i); });
    b.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/panel', String(i));
      e.dataTransfer.effectAllowed = 'move';
    });
    b.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    b.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = e.dataTransfer.getData('text/panel');
      if (from !== '' && Number(from) !== i) swapPanels(Number(from), i);
      const photoId = e.dataTransfer.getData('text/photo');
      if (photoId) assignPhoto(i, photoId);
    });
    box.appendChild(b);
  });
}

function selectPanel(i) {
  selected = i;
  scheduleRender();
}

function swapPanels(a, b) {
  pushHistory();
  const pa = panels[a].photoId;
  panels[a].photoId = panels[b].photoId;
  panels[b].photoId = pa;
  selected = b;
  scheduleRender();
  setStatus(`Panels ${a + 1} and ${b + 1} swapped.`);
}

function assignPhoto(panelIndex, photoId) {
  pushHistory();
  panels[panelIndex].photoId = photoId;
  panels[panelIndex].zoom = 1;
  panels[panelIndex].panX = 0;
  panels[panelIndex].panY = 0;
  selected = panelIndex;
  scheduleRender();
}

// ---- tray -----------------------------------------------------------------
function renderTray() {
  const tray = $('#tray');
  tray.innerHTML = '';
  const used = new Set(panels.map((p) => p.photoId));
  photos.forEach((photo, i) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `thumb${used.has(photo.id) ? ' used' : ''}`;
    el.draggable = true;
    el.title = `${photo.name} — drag onto a panel, or click to put it in the selected panel`;
    el.innerHTML = `<img src="${photo.src}" alt="${photo.name}"><span class="num">${i + 1}</span><span class="tag">${photo.name}</span>`;
    const rm = document.createElement('span');
    rm.className = 'rm';
    rm.textContent = '×';
    rm.title = 'Remove photo';
    rm.addEventListener('click', (e) => {
      e.stopPropagation();
      pushHistory();
      photos = photos.filter((p) => p.id !== photo.id);
      panels.forEach((p) => { if (p.photoId === photo.id) p.photoId = null; });
      renderTray();
      scheduleRender();
    });
    el.appendChild(rm);
    el.addEventListener('click', () => assignPhoto(selected, photo.id));
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/photo', photo.id);
      e.dataTransfer.effectAllowed = 'copy';
    });
    tray.appendChild(el);
  });
}

// ---- canvas interaction: click, drag-pan, wheel-zoom, double-click flip ---
function posterPoint(e) {
  const rect = posterCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / rect.width,
    y: (e.clientY - rect.top) / rect.height,
  };
}

function hitPanel(fx, fy) {
  const rects = layoutRects(state.layout);
  const px = 0.012, py = 0.062, pw = 0.976, ph = 0.878 - 0.062;
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (fx >= px + r[0] * pw && fx <= px + (r[0] + r[2]) * pw &&
        fy >= py + r[1] * ph && fy <= py + (r[1] + r[3]) * ph) return i;
  }
  return -1;
}

let drag = null;
posterCanvas.addEventListener('pointerdown', (e) => {
  const pt = posterPoint(e);
  const i = hitPanel(pt.x, pt.y);
  if (i < 0) return;
  selectPanel(i);
  posterCanvas.setPointerCapture(e.pointerId);
  posterCanvas.classList.add('dragging');
  drag = { i, x: pt.x, y: pt.y, moved: false, snap: snapshot() };
});
posterCanvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const pt = posterPoint(e);
  const dx = pt.x - drag.x, dy = pt.y - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
  if (drag.moved) {
    const panel = panels[drag.i];
    panel.panX -= dx * 1.6;
    panel.panY -= dy * 1.6;
    panel.panX = Math.max(-0.6, Math.min(0.6, panel.panX));
    panel.panY = Math.max(-0.6, Math.min(0.6, panel.panY));
    drag.x = pt.x; drag.y = pt.y;
    scheduleRender();
  }
});
posterCanvas.addEventListener('pointerup', () => {
  if (drag && drag.moved) {
    undoStack.push(drag.snap);
    redoStack.length = 0;
    updateUndoButtons();
  }
  drag = null;
  posterCanvas.classList.remove('dragging');
});
posterCanvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const pt = posterPoint(e);
  const i = hitPanel(pt.x, pt.y);
  if (i < 0) return;
  selectPanel(i);
  const panel = panels[i];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  $('#zoomSlider').value = panel.zoom;
  scheduleRender();
}, { passive: false });
posterCanvas.addEventListener('dblclick', (e) => {
  const pt = posterPoint(e);
  const i = hitPanel(pt.x, pt.y);
  if (i < 0) return;
  pushHistory();
  panels[i].flip = !panels[i].flip;
  scheduleRender();
});

// Drop photos (files or tray drags) onto the stage.
const stage = $('#stage');
stage.addEventListener('dragover', (e) => { e.preventDefault(); $('#dropHint').hidden = false; });
stage.addEventListener('dragleave', () => { $('#dropHint').hidden = true; });
stage.addEventListener('drop', async (e) => {
  e.preventDefault();
  $('#dropHint').hidden = true;
  const photoId = e.dataTransfer.getData('text/photo');
  const pt = posterPoint(e);
  const i = hitPanel(pt.x, pt.y);
  if (photoId && i >= 0) { assignPhoto(i, photoId); return; }
  const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
  if (files.length) await ingestFiles(files, i);
});

async function ingestFiles(files, targetPanel = -1) {
  for (const file of files) {
    try {
      const url = URL.createObjectURL(file);
      const photo = await addPhoto(url, file.name.replace(/\.[^.]+$/, ''));
      if (targetPanel >= 0) {
        panels[targetPanel].photoId = photo.id;
        targetPanel = -1;
      }
    } catch { /* unreadable file — skip it */ }
  }
  renderTray();
  scheduleRender();
  setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} added. Photos never leave this device.`);
}

document.addEventListener('paste', (e) => {
  const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
  if (files.length) { e.preventDefault(); ingestFiles(files, selected); }
});
$('#photoInput').addEventListener('change', (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  if (files.length) ingestFiles(files, selected);
});

// ---- panel bar ------------------------------------------------------------
function updatePanelBar() {
  const panel = panels[selected];
  const photo = panel ? photoById(panel.photoId) : null;
  $('#panelLabel').textContent = `PANEL ${selected + 1}${selected === 0 && state.layout !== 'six' ? ' · HERO' : ''}${photo ? ` — ${photo.name.toUpperCase()}` : ' — EMPTY'}`;
  $('#zoomSlider').value = panel ? panel.zoom : 1;
}
$('#prevPhotoBtn').addEventListener('click', () => cyclePhoto(-1));
$('#nextPhotoBtn').addEventListener('click', () => cyclePhoto(1));
function cyclePhoto(dir) {
  if (!photos.length) return;
  pushHistory();
  const panel = panels[selected];
  const cur = photos.findIndex((p) => p.id === panel.photoId);
  const next = photos[(cur + dir + photos.length) % photos.length];
  panel.photoId = next.id;
  panel.zoom = 1; panel.panX = 0; panel.panY = 0;
  scheduleRender();
}
$('#flipBtn').addEventListener('click', () => {
  pushHistory();
  panels[selected].flip = !panels[selected].flip;
  scheduleRender();
});
$('#zoomSlider').addEventListener('input', (e) => {
  panels[selected].zoom = Number(e.target.value);
  scheduleRender();
});
$('#zoomSlider').addEventListener('change', () => pushHistory());
$('#resetPanelBtn').addEventListener('click', () => {
  pushHistory();
  Object.assign(panels[selected], { zoom: 1, panX: 0, panY: 0, flip: false });
  scheduleRender();
});
$('#autoFillBtn').addEventListener('click', () => { pushHistory(); autoFillPanels(); scheduleRender(); });

// ---- left column: layouts + grades + look --------------------------------
const layoutBtns = $('#layoutBtns');
for (const [key, def] of Object.entries(LAYOUTS)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.layout = key;
  b.innerHTML = `<span class="mini"></span>${def.name}`;
  b.addEventListener('click', () => {
    if (state.layout === key) return;
    pushHistory();
    state.layout = key;
    ensurePanels();
    autoFillPanels();
    syncLayoutButtons();
    scheduleRender();
  });
  layoutBtns.appendChild(b);
}
function syncLayoutButtons() {
  $$('#layoutBtns button').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
}

const gradeSwatches = {
  sunset: 'linear-gradient(135deg,#ffd23e,#ff7a3d 50%,#ff2e88)',
  neon: 'linear-gradient(135deg,#ff2e88,#7c3aed 50%,#38c8ff)',
  teal: 'linear-gradient(135deg,#22d3ee,#14b8a6 50%,#fbbf24)',
  golden: 'linear-gradient(135deg,#fff3b0,#ffb300 50%,#ff7b00)',
  heat: 'linear-gradient(135deg,#ff7b00,#ef4444 50%,#7f1d1d)',
  dusk: 'linear-gradient(135deg,#c084fc,#7c3aed 50%,#ff2e88)',
};
const gradeBtns = $('#gradeBtns');
for (const [key, def] of Object.entries(GRADES)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.grade = key;
  b.innerHTML = `<span class="mini" style="background:${gradeSwatches[key]}"></span>${def.name}`;
  b.addEventListener('click', () => {
    if (state.grade === key) return;
    pushHistory();
    state.grade = key;
    syncGradeButtons();
    scheduleRender();
  });
  gradeBtns.appendChild(b);
}
function syncGradeButtons() {
  $$('#gradeBtns button').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
}

const lookSliders = [
  ['slPaint', 'paint', (v) => `${Math.round(v * 100)}%`],
  ['slGrade', 'gradeAmt', (v) => `${Math.round(v * 100)}%`],
  ['slHalftone', 'halftone', (v) => `${Math.round(v * 100)}%`],
  ['slGrain', 'grain', (v) => `${Math.round(v * 100)}%`],
  ['slGlow', 'glow', (v) => `${Math.round(v * 100)}%`],
  ['slTitleSize', 'titleSize', (v) => `${Math.round(v * 100)}%`],
  ['slTitleLift', 'titleLift', (v) => v.toFixed(2)],
];
for (const [id, key, fmt] of lookSliders) {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    state.look[key] = Number(el.value);
    el.nextElementSibling.textContent = fmt(state.look[key]);
    scheduleRender();
  });
  el.addEventListener('change', () => pushHistory());
}

// ---- right column: caption fields -----------------------------------------
const fieldMap = [
  ['fTitle', 'title'], ['fScript', 'script'], ['fTagline', 'tagline'],
  ['fQuote', 'quote'], ['fQuoteSource', 'quoteSource'], ['fBilling', 'billing'],
  ['fSeal', 'seal'], ['fSealRing', 'sealRing'], ['fRelease', 'release'], ['fEdition', 'edition'],
];
for (const [id, key] of fieldMap) {
  const el = document.getElementById(id);
  el.addEventListener('input', () => { state[key] = el.value; scheduleRender(); });
  el.addEventListener('change', () => pushHistory());
}
const titleStyleSel = $('#fTitleStyle');
for (const [key, def] of Object.entries(TITLE_STYLES)) {
  const o = document.createElement('option');
  o.value = key; o.textContent = def.name;
  titleStyleSel.appendChild(o);
}
titleStyleSel.value = state.titleStyle;
titleStyleSel.addEventListener('change', () => { pushHistory(); state.titleStyle = titleStyleSel.value; scheduleRender(); });

const scriptFontSel = $('#fScriptFont');
for (const [key, def] of Object.entries(SCRIPT_FONTS)) {
  const o = document.createElement('option');
  o.value = key; o.textContent = def.name;
  scriptFontSel.appendChild(o);
}
scriptFontSel.value = state.scriptFont;
scriptFontSel.addEventListener('change', () => { pushHistory(); state.scriptFont = scriptFontSel.value; scheduleRender(); });

function renderTagFields() {
  const box = $('#tagFields');
  box.innerHTML = '';
  state.tags.forEach((tag, i) => {
    const row = document.createElement('div');
    row.className = 'tag-row';
    row.innerHTML = `<span class="tn">${i + 1}</span>`;
    const role = document.createElement('input');
    role.type = 'text'; role.value = tag.role; role.maxLength = 20; role.placeholder = 'THE ROLE';
    role.addEventListener('input', () => { tag.role = role.value.toUpperCase(); scheduleRender(); });
    role.addEventListener('change', () => pushHistory());
    const sub = document.createElement('input');
    sub.type = 'text'; sub.value = tag.sub; sub.maxLength = 30; sub.placeholder = 'PLACE • TIME';
    sub.addEventListener('input', () => { tag.sub = sub.value.toUpperCase(); scheduleRender(); });
    sub.addEventListener('change', () => pushHistory());
    row.append(role, sub);
    box.appendChild(row);
  });
}

// ---- size tabs + export ----------------------------------------------------
$$('.size-tabs button').forEach((b) => {
  b.addEventListener('click', () => {
    if (state.size === b.dataset.size) return;
    pushHistory();
    state.size = b.dataset.size;
    $$('.size-tabs button').forEach((x) => x.classList.toggle('active', x === b));
    scheduleRender();
  });
});

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function exportOne(sizeKey) {
  setStatus(`Exporting ${SIZES[sizeKey].label}…`);
  const blob = await exportPosterPNG(state, resolvedPanels(), sizeKey);
  const slug = state.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
  downloadBlob(blob, `vice-cast-${slug}-${sizeKey.replace(':', 'x')}.png`);
  setStatus(`PNG exported — ${SIZES[sizeKey].label}. Share it anywhere.`);
}
$$('[data-export]').forEach((b) => b.addEventListener('click', () => exportOne(b.dataset.export)));
$('#exportAllBtn').addEventListener('click', async () => {
  for (const key of ['1:1', '4:5', '16:9']) {
    await exportOne(key);
    await new Promise((r) => setTimeout(r, 350));
  }
});

// ---- top actions ------------------------------------------------------------
$('#undoBtn').addEventListener('click', undo);
$('#redoBtn').addEventListener('click', redo);
$('#sampleBtn').addEventListener('click', async () => {
  pushHistory();
  await loadSampleCrew();
  setStatus('Sample crew loaded — 8 fictional cast members + 2 scene shots.');
});
$('#onePhotoBtn').addEventListener('click', onePhotoAllPanels);
$('#surpriseBtn').addEventListener('click', () => {
  pushHistory();
  const layouts = Object.keys(LAYOUTS);
  const grades = Object.keys(GRADES);
  const styles = Object.keys(TITLE_STYLES);
  const [title, script] = SURPRISE_TITLES[Math.floor(Math.random() * SURPRISE_TITLES.length)];
  state.layout = layouts[Math.floor(Math.random() * layouts.length)];
  state.grade = grades[Math.floor(Math.random() * grades.length)];
  state.titleStyle = styles[Math.floor(Math.random() * styles.length)];
  state.title = title;
  state.script = script;
  state.scriptFont = Math.random() < 0.5 ? 'pacifico' : 'yellowtail';
  ensurePanels();
  autoFillPanels();
  syncInputs();
  scheduleRender();
  setStatus(`Surprise! ${title} — ${LAYOUTS[state.layout].name}, ${GRADES[state.grade].name}.`);
});

function setStatus(msg) { $('#status').textContent = msg; }

function syncInputs() {
  for (const [id, key] of fieldMap) document.getElementById(id).value = state[key];
  titleStyleSel.value = state.titleStyle;
  scriptFontSel.value = state.scriptFont;
  $$('.size-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  syncLayoutButtons();
  syncGradeButtons();
  renderTagFields();
  for (const [id, key, fmt] of lookSliders) {
    const el = document.getElementById(id);
    el.value = state.look[key];
    el.nextElementSibling.textContent = fmt(state.look[key]);
  }
  renderTray();
}

// ---- ?shot= presets for deterministic screenshots ---------------------------
function applyShotPreset() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return false;
  const pick = (name, fallback) => q.get(name) || fallback;
  state.layout = pick('layout', state.layout);
  state.grade = pick('grade', state.grade);
  state.title = pick('title', state.title);
  state.titleStyle = pick('style', state.titleStyle);
  state.script = pick('script', state.script);
  state.scriptFont = pick('scriptFont', state.scriptFont);
  state.tagline = pick('tagline', state.tagline);
  state.size = pick('size', '16:9');
  if (q.get('quote')) state.quote = q.get('quote');
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');
  return true;
}

// ---- boot -------------------------------------------------------------------
async function boot() {
  syncLayoutButtons();
  syncGradeButtons();
  renderTagFields();
  updateUndoButtons();
  const isShot = applyShotPreset();
  await loadSampleCrew();
  try { await document.fonts.ready; } catch { /* fonts may already be loaded */ }
  syncInputs();
  render();
  renderThumbs();
  window.__shotReady = true;
  if (isShot) setStatus('Screenshot preset loaded.');
}

boot();
