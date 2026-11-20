// The editor for Neon Palm Cover Studio.
//
// Owns the state (layout, grade, caption, per-panel photo placement), the
// preview canvas, the photo tray, undo/redo, shuffle and PNG export. The
// cover itself is drawn by cover.js; this file only decides what to draw
// and where the user's pointer lands.

import { LAYOUTS, layoutGeometry, layoutPanelCount } from './layouts.js';
import { GRADES, gradeById } from './grades.js';
import { renderCover, exportCoverCanvas, sizeById, EXPORT_SIZES } from './cover.js';
import { SAMPLES, PRESET_TITLES, readShotScene } from './shots.js';

const $ = (sel) => document.querySelector(sel);

/** The state a fresh studio opens with. */
function defaultState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    size: '1080x1080',
    title: 'NEON SHORE',
    subtitle: 'Vice City nights',
    badge: 'EST. 2026',
    badgeStyle: 'ribbon',
    stars: 4,
    frame: 'white',
    grain: true,
    vignette: true,
    halftone: false,
    panels: [],
  };
}

/** Make sure state.panels has one placement per panel of the layout. */
function ensurePanels(state) {
  const count = layoutPanelCount(state.layout);
  while (state.panels.length < count) {
    state.panels.push({ photo: state.panels.length % SAMPLES.length, x: 0.5, y: 0.5, zoom: 1 });
  }
  state.panels.length = count;
}

// ---------------------------------------------------------------- photos

/** Loaded photos: { img, label, mine } — samples first, uploads after. */
const photos = [];
/** The tray photo the user picked to place next, or -1. */
let pickedPhoto = 0;
/** The selected panel index, or -1. */
let selectedPanel = 0;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamples() {
  const loaded = await Promise.all(
    SAMPLES.map(async (s, i) => {
      try {
        const img = await loadImage(`samples/${s.file}`);
        return { img, label: s.label, mine: false, index: i };
      } catch {
        return null;
      }
    }),
  );
  for (const p of loaded.filter(Boolean)) photos.push(p);
}

// ---------------------------------------------------------------- state + history

let state = defaultState();
ensurePanels(state);
const undoStack = [];
const redoStack = [];
const HISTORY_MAX = 60;

function snapshot() {
  return JSON.stringify(state);
}

function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > HISTORY_MAX) undoStack.shift();
  redoStack.length = 0;
  syncHistoryButtons();
}

function restore(json) {
  state = JSON.parse(json);
  ensurePanels(state);
  syncControls();
  render();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncHistoryButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncHistoryButtons();
}

function syncHistoryButtons() {
  $('#undoBtn').disabled = undoStack.length === 0;
  $('#redoBtn').disabled = redoStack.length === 0;
}

/** Change the state with history: fn mutates the draft, then we re-render. */
function change(fn) {
  pushHistory();
  fn(state);
  ensurePanels(state);
  syncControls();
  render();
}

// ---------------------------------------------------------------- rendering

const canvas = $('#coverCanvas');
const ctx = canvas.getContext('2d');
const scene = readShotScene();
const coverMode = scene.mode === 'cover';

/** Size the preview canvas to the cover's aspect, long side at most 900px. */
function sizePreviewCanvas() {
  const size = sizeById(state.size);
  if (coverMode) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    return;
  }
  const scale = Math.min(1, 900 / Math.max(size.w, size.h));
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
}

function render() {
  sizePreviewCanvas();
  const imgs = photos.map((p) => p.img);
  renderCover(ctx, state, imgs, canvas.width, canvas.height);
  drawSelection();
  updateTraySelection();
}

/** Outline the selected panel on the preview (editor mode only). */
function drawSelection() {
  if (coverMode || selectedPanel < 0) return;
  const geometry = layoutGeometry(state.layout, canvas.width, canvas.height);
  const rect = geometry.panels[selectedPanel];
  if (!rect) return;
  ctx.save();
  ctx.translate((rect.x + rect.w / 2) * canvas.width, (rect.y + rect.h / 2) * canvas.height);
  if (rect.rot) ctx.rotate((rect.rot * Math.PI) / 180);
  ctx.strokeStyle = '#2affd5';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect((-rect.w * canvas.width) / 2, (-rect.h * canvas.height) / 2, rect.w * canvas.width, rect.h * canvas.height);
  ctx.restore();
}

// ---------------------------------------------------------------- pointer: pick, drag, zoom

/** Which panel (if any) a canvas point lands in, rotation-aware. */
function panelAt(cx, cy) {
  const geometry = layoutGeometry(state.layout, canvas.width, canvas.height);
  const nx = cx / canvas.width;
  const ny = cy / canvas.height;
  for (let i = geometry.panels.length - 1; i >= 0; i--) {
    const r = geometry.panels[i];
    let px = nx;
    let py = ny;
    if (r.rot) {
      const a = (-r.rot * Math.PI) / 180;
      const ccx = r.x + r.w / 2;
      const ccy = r.y + r.h / 2;
      const dx = nx - ccx;
      const dy = ny - ccy;
      px = ccx + dx * Math.cos(a) - dy * Math.sin(a);
      py = ccy + dx * Math.sin(a) + dy * Math.cos(a);
    }
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

let drag = null;

canvas.addEventListener('pointerdown', (e) => {
  if (coverMode) return;
  const box = canvas.getBoundingClientRect();
  const cx = ((e.clientX - box.left) / box.width) * canvas.width;
  const cy = ((e.clientY - box.top) / box.height) * canvas.height;
  const hit = panelAt(cx, cy);
  if (hit < 0) return;
  canvas.setPointerCapture(e.pointerId);
  if (pickedPhoto >= 0 && state.panels[hit].photo !== pickedPhoto && e.shiftKey === false && lastTrayPickAt > Date.now() - 4000) {
    // A tray photo was just picked: place it here.
    change((s) => { s.panels[hit].photo = pickedPhoto; });
  }
  selectedPanel = hit;
  pushHistory();
  drag = { panel: hit, lastX: cx, lastY: cy };
  render();
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const box = canvas.getBoundingClientRect();
  const cx = ((e.clientX - box.left) / box.width) * canvas.width;
  const cy = ((e.clientY - box.top) / box.height) * canvas.height;
  const placement = state.panels[drag.panel];
  const geometry = layoutGeometry(state.layout, canvas.width, canvas.height);
  const rect = geometry.panels[drag.panel];
  const img = photos[placement.photo]?.img;
  if (img && rect) {
    const pw = rect.w * canvas.width;
    const ph = rect.h * canvas.height;
    const scale = Math.max(pw / img.width, ph / img.height) * (placement.zoom || 1);
    placement.x = clamp01(placement.x - (cx - drag.lastX) / (img.width * scale));
    placement.y = clamp01(placement.y - (cy - drag.lastY) / (img.height * scale));
  }
  drag.lastX = cx;
  drag.lastY = cy;
  render();
});

canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });

canvas.addEventListener('wheel', (e) => {
  if (coverMode || selectedPanel < 0) return;
  e.preventDefault();
  const placement = state.panels[selectedPanel];
  if (!placement) return;
  pushHistory();
  placement.zoom = Math.max(1, Math.min(2.6, (placement.zoom || 1) * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
  $('#zoomRange').value = String(Math.round(placement.zoom * 100));
  $('#zoomLabel').textContent = `${Math.round(placement.zoom * 100)}%`;
  render();
}, { passive: false });

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/** When the user last picked a tray photo (placing needs a fresh pick). */
let lastTrayPickAt = 0;

// ---------------------------------------------------------------- tray

function renderTray() {
  const tray = $('#tray');
  tray.innerHTML = '';
  photos.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tray-item';
    btn.title = p.label;
    const thumb = document.createElement('img');
    thumb.src = p.img.src;
    thumb.alt = p.label;
    btn.appendChild(thumb);
    const tag = document.createElement('span');
    tag.textContent = p.label;
    btn.appendChild(tag);
    btn.addEventListener('click', () => {
      pickedPhoto = i;
      lastTrayPickAt = Date.now();
      if (selectedPanel >= 0) {
        change((s) => { s.panels[selectedPanel].photo = i; });
      } else {
        updateTraySelection();
      }
    });
    tray.appendChild(btn);
  });
}

function updateTraySelection() {
  document.querySelectorAll('.tray-item').forEach((el, i) => {
    el.classList.toggle('picked', i === pickedPhoto);
  });
  const placement = state.panels[selectedPanel];
  if (placement) {
    $('#zoomRange').value = String(Math.round((placement.zoom || 1) * 100));
    $('#zoomLabel').textContent = `${Math.round((placement.zoom || 1) * 100)}%`;
  }
}

// ---------------------------------------------------------------- uploads

function addUpload(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    loadImage(reader.result).then((img) => {
      photos.push({ img, label: file.name.replace(/\.[^.]+$/, '').slice(0, 14) || 'Photo', mine: true });
      pickedPhoto = photos.length - 1;
      lastTrayPickAt = Date.now();
      renderTray();
      if (selectedPanel >= 0) change((s) => { s.panels[selectedPanel].photo = pickedPhoto; });
      else render();
    }).catch(() => {});
  };
  reader.readAsDataURL(file);
}

$('#uploadInput').addEventListener('change', (e) => {
  for (const file of e.target.files) addUpload(file);
  e.target.value = '';
});

for (const zone of [document.body, canvas]) {
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    document.body.classList.add('dropping');
  });
  zone.addEventListener('dragleave', (e) => {
    if (e.target === document.body) document.body.classList.remove('dropping');
  });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    document.body.classList.remove('dropping');
    for (const file of e.dataTransfer.files) addUpload(file);
  });
}

// ---------------------------------------------------------------- controls

function buildChoiceButtons(container, items, get, set) {
  const el = $(container);
  el.innerHTML = '';
  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice';
    btn.dataset.id = item.id;
    btn.textContent = item.name;
    btn.title = item.blurb || item.name;
    btn.addEventListener('click', () => change(() => set(item.id)));
    el.appendChild(btn);
  });
  const sync = () => {
    el.querySelectorAll('.choice').forEach((b) => b.classList.toggle('active', b.dataset.id === get()));
  };
  return sync;
}

const syncLayout = buildChoiceButtons('#layoutChoices', LAYOUTS, () => state.layout, (id) => { state.layout = id; });
const syncGrade = buildChoiceButtons('#gradeChoices', GRADES, () => state.grade, (id) => { state.grade = id; });

function syncControls() {
  syncLayout();
  syncGrade();
  $('#titleInput').value = state.title;
  $('#subtitleInput').value = state.subtitle;
  $('#badgeInput').value = state.badge;
  $('#badgeStyle').value = state.badgeStyle;
  $('#frameSelect').value = state.frame;
  $('#sizeSelect').value = state.size;
  $('#grainCheck').checked = state.grain;
  $('#vignetteCheck').checked = state.vignette;
  $('#halftoneCheck').checked = state.halftone;
  document.querySelectorAll('#starRow button').forEach((b, i) => {
    b.classList.toggle('on', i < state.stars);
  });
  updateTraySelection();
}

function bindText(id, key) {
  $(id).addEventListener('input', (e) => {
    state[key] = e.target.value;
    render();
  });
  $(id).addEventListener('change', () => pushHistory());
}

bindText('#titleInput', 'title');
bindText('#subtitleInput', 'subtitle');
bindText('#badgeInput', 'badge');

$('#badgeStyle').addEventListener('change', (e) => change((s) => { s.badgeStyle = e.target.value; }));
$('#frameSelect').addEventListener('change', (e) => change((s) => { s.frame = e.target.value; }));
$('#sizeSelect').addEventListener('change', (e) => change((s) => { s.size = e.target.value; }));
$('#grainCheck').addEventListener('change', (e) => change((s) => { s.grain = e.target.checked; }));
$('#vignetteCheck').addEventListener('change', (e) => change((s) => { s.vignette = e.target.checked; }));
$('#halftoneCheck').addEventListener('change', (e) => change((s) => { s.halftone = e.target.checked; }));

document.querySelectorAll('#starRow button').forEach((btn, i) => {
  btn.addEventListener('click', () => change((s) => { s.stars = i + 1; }));
});

$('#zoomRange').addEventListener('input', (e) => {
  const placement = state.panels[selectedPanel];
  if (!placement) return;
  placement.zoom = Number(e.target.value) / 100;
  $('#zoomLabel').textContent = `${e.target.value}%`;
  render();
});
$('#zoomRange').addEventListener('change', () => pushHistory());

$('#fillBtn').addEventListener('click', () => {
  change((s) => { s.panels.forEach((p) => { p.photo = pickedPhoto; }); });
});
$('#nextPhotoBtn').addEventListener('click', () => {
  if (selectedPanel < 0 || !photos.length) return;
  change((s) => {
    const p = s.panels[selectedPanel];
    p.photo = (p.photo + 1) % photos.length;
    pickedPhoto = p.photo;
  });
});
$('#shuffleBtn').addEventListener('click', () => shuffle());
$('#undoBtn').addEventListener('click', undo);
$('#redoBtn').addEventListener('click', redo);

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
    e.preventDefault();
    redo();
  }
});

/** A fresh random cover: layout, grade, title and photo placement. */
function shuffle() {
  change((s) => {
    s.layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)].id;
    s.grade = GRADES[Math.floor(Math.random() * GRADES.length)].id;
    const [title, subtitle] = PRESET_TITLES[Math.floor(Math.random() * PRESET_TITLES.length)];
    s.title = title;
    s.subtitle = subtitle;
    s.stars = 3 + Math.floor(Math.random() * 3);
    ensurePanels(s);
    s.panels.forEach((p) => {
      p.photo = Math.floor(Math.random() * photos.length);
      p.x = 0.35 + Math.random() * 0.3;
      p.y = 0.35 + Math.random() * 0.3;
      p.zoom = 1 + Math.random() * 0.4;
    });
    selectedPanel = 0;
  });
}

// ---------------------------------------------------------------- export

function downloadCanvas(canvasEl, name) {
  canvasEl.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
  }, 'image/png');
}

function slug(text) {
  return (text || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
}

$('#exportBtn').addEventListener('click', () => {
  const size = sizeById(state.size);
  const out = exportCoverCanvas(state, photos.map((p) => p.img), state.size);
  downloadCanvas(out, `${slug(state.title)}-${size.id}.png`);
  flashExport(`Exported ${size.label}`);
});

$('#exportAllBtn').addEventListener('click', () => {
  EXPORT_SIZES.forEach((size, i) => {
    setTimeout(() => {
      const out = exportCoverCanvas(state, photos.map((p) => p.img), size.id);
      downloadCanvas(out, `${slug(state.title)}-${size.id}.png`);
    }, i * 450);
  });
  flashExport('Exporting all 4 sizes…');
});

function flashExport(msg) {
  const el = $('#exportNote');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}

// ---------------------------------------------------------------- boot

async function boot() {
  if (coverMode) document.body.classList.add('shot-cover');
  scene.apply(state);
  ensurePanels(state);
  try {
    await document.fonts.load('80px Anton');
    await document.fonts.load('40px Pacifico');
    await document.fonts.ready;
  } catch { /* fonts fall back to sans-serif; the app still works */ }
  await loadSamples();
  renderTray();
  syncControls();
  syncHistoryButtons();
  render();
  if (coverMode) {
    window.addEventListener('resize', render);
    document.title = `${state.title} — Neon Palm Cover Studio`;
  }
}

boot();
