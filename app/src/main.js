// Neon Palm Cover Studio: the editor. Wires the controls to the cover renderer,
// holds the 60-step undo history, the per-panel editing (click to select, drag to
// pan, wheel to zoom), the photo tray and uploads, and the PNG exports.

import { drawCover, defaultState, SAMPLES, EXPORT_SIZES, sampleById } from './cover.js';
import { LAYOUTS, LAYOUT_IDS, layoutCells } from './layouts.js';
import { GRADES, GRADE_IDS } from './grades.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('preview');
const ctx = canvas.getContext('2d');

let state = defaultState();
let images = {}; // photo id -> HTMLImageElement
let uploads = []; // { id, label, caption, focusX, focusY, url }
let uploadCount = 0;
let selected = 0;
let armedPhoto = null;
let past = [];
let future = [];
let wheelTimer = null;

const TITLES = ['NEON SHORE', 'SUNSET HEIST', 'NIGHT SHIFT', 'PALM ROYALE', 'OCEAN DRIVE', 'VICE CITY', 'PIER PRESSURE', 'GOLDEN HOUR'];

function photoMeta(id) {
  const up = uploads.find((u) => u.id === id);
  if (up) return up;
  return sampleById(id);
}

function allPhotos() {
  return [...SAMPLES, ...uploads];
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function snapshot() {
  return JSON.parse(JSON.stringify(state));
}

function pushHistory() {
  past.push(snapshot());
  if (past.length > 60) past.shift();
  future = [];
  updateUndoButtons();
}

function undo() {
  if (!past.length) return;
  future.push(snapshot());
  state = past.pop();
  clampSelection();
  updateControls();
  render();
  updateUndoButtons();
}

function redo() {
  if (!future.length) return;
  past.push(snapshot());
  state = future.pop();
  clampSelection();
  updateControls();
  render();
  updateUndoButtons();
}

function updateUndoButtons() {
  $('undoBtn').disabled = past.length === 0;
  $('redoBtn').disabled = future.length === 0;
}

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

function clampSelection() {
  selected = Math.max(0, Math.min(selected, panelCount() - 1));
}

function currentSize() {
  return EXPORT_SIZES.find((s) => s.id === state.size) ?? EXPORT_SIZES[0];
}

function setStatus(text) {
  $('status').textContent = text;
}

// ------------------------------------------------------------------ render

function render() {
  const size = currentSize();
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, state, images);
  drawSelection();
  updatePanelLabel();
}

function drawSelection() {
  if (document.body.classList.contains('shot-cover')) return; // cover shots stay clean
  const geo = layoutCells(state.layout, canvas.width, canvas.height);
  const rect = geo.panels[selected];
  if (!rect) return;
  ctx.save();
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = Math.max(3, Math.round(Math.min(canvas.width, canvas.height) * 0.004));
  ctx.setLineDash([14, 10]);
  if (rect.rot) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate((rect.rot * Math.PI) / 180);
    ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  } else {
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

function updatePanelLabel() {
  const panel = state.panels[selected];
  const meta = photoMeta(panel.photo);
  $('panelLabel').textContent = `Panel ${selected + 1} of ${panelCount()} · ${meta.label}`;
  $('zoomSlider').value = Math.round((panel.zoom || 1) * 100);
  $('zoomLabel').textContent = `${Math.round((panel.zoom || 1) * 100)}%`;
}

function updateControls() {
  document.querySelectorAll('#layoutBtns button').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradeBtns button').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('#sizeBtns button').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  document.querySelectorAll('#starBtns button').forEach((b) => b.classList.toggle('active', Number(b.dataset.stars) === state.stars));
  document.querySelectorAll('#frameBtns button').forEach((b) => b.classList.toggle('active', b.dataset.frame === state.frame));
  document.querySelectorAll('#badgeBtns button').forEach((b) => b.classList.toggle('active', b.dataset.badge === state.badge));
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('badgeText').value = state.badgeText;
  $('grainToggle').checked = state.grain;
  $('vignetteToggle').checked = state.vignette;
  $('halftoneToggle').checked = state.halftone;
  document.querySelectorAll('#tray .thumb').forEach((t) => t.classList.toggle('armed', t.dataset.photo === armedPhoto));
  updatePanelLabel();
}

// -------------------------------------------------------------- photo tray

function buildTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  allPhotos().forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.dataset.photo = p.id;
    btn.title = p.label;
    const img = document.createElement('img');
    img.src = p.file ?? p.url;
    img.alt = p.label;
    btn.appendChild(img);
    btn.addEventListener('click', () => {
      armedPhoto = p.id;
      setStatus(`Photo "${p.label}" armed — click a panel to place it, or press Fill panel.`);
      updateControls();
    });
    btn.addEventListener('dblclick', () => {
      placePhoto(selected, p.id);
    });
    tray.appendChild(btn);
  });
}

function placePhoto(index, photoId) {
  pushHistory();
  const meta = photoMeta(photoId);
  state.panels[index] = {
    photo: photoId,
    zoom: 1,
    panX: 0,
    panY: 0,
    focusX: meta.focusX ?? 0.5,
    focusY: meta.focusY ?? 0.4,
  };
  armedPhoto = null;
  setStatus(`Placed "${meta.label}" in panel ${index + 1}.`);
  updateControls();
  render();
}

async function addUpload(file) {
  if (!file || !file.type.startsWith('image/')) return;
  uploadCount += 1;
  const id = `upload-${uploadCount}`;
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  images[id] = img;
  uploads.push({
    id,
    label: file.name.replace(/\.[^.]+$/, '').slice(0, 18) || `Photo ${uploadCount}`,
    caption: 'My Shot',
    focusX: 0.5,
    focusY: 0.4,
    url,
  });
  buildTray();
  placePhoto(selected, id);
  setStatus(`Uploaded "${file.name}" — placed in panel ${selected + 1}. Your photo never leaves this machine.`);
}

// ------------------------------------------------------------------ export

function exportSize(sizeId) {
  const size = EXPORT_SIZES.find((s) => s.id === sizeId) ?? EXPORT_SIZES[0];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, state, images);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-palm-${size.id}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, 'image/png');
  });
}

async function exportAll() {
  setStatus('Exporting all four sizes…');
  for (const s of EXPORT_SIZES) {
    await exportSize(s.id);
    await new Promise((r) => setTimeout(r, 350));
  }
  setStatus('Exported all four sizes as PNG.');
}

// ------------------------------------------------------------------- canvas

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

function hitPanel(p) {
  const geo = layoutCells(state.layout, canvas.width, canvas.height);
  for (let i = geo.panels.length - 1; i >= 0; i--) {
    const rect = geo.panels[i];
    let x = p.x;
    let y = p.y;
    if (rect.rot) {
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      const a = (-(rect.rot * Math.PI)) / 180;
      const dx = x - cx;
      const dy = y - cy;
      x = cx + dx * Math.cos(a) - dy * Math.sin(a);
      y = cy + dx * Math.sin(a) + dy * Math.cos(a);
    }
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) return i;
  }
  return -1;
}

let dragging = null;

canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = hitPanel(p);
  if (hit === -1) return;
  if (armedPhoto) {
    placePhoto(hit, armedPhoto);
    return;
  }
  selected = hit;
  pushHistory();
  dragging = { index: hit, lastX: p.x, lastY: p.y, moved: false };
  canvas.setPointerCapture(e.pointerId);
  updateControls();
  render();
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const p = canvasPoint(e);
  const geo = layoutCells(state.layout, canvas.width, canvas.height);
  const rect = geo.panels[dragging.index];
  const panel = state.panels[dragging.index];
  const dx = p.x - dragging.lastX;
  const dy = p.y - dragging.lastY;
  if (Math.abs(dx) + Math.abs(dy) > 1) dragging.moved = true;
  panel.panX = Math.max(-0.5, Math.min(0.5, (panel.panX || 0) + dx / rect.w));
  panel.panY = Math.max(-0.5, Math.min(0.5, (panel.panY || 0) + dy / rect.h));
  dragging.lastX = p.x;
  dragging.lastY = p.y;
  render();
});

canvas.addEventListener('pointerup', () => {
  if (dragging && !dragging.moved) past.pop(); // a click is not a drag: drop its history row
  dragging = null;
  updateUndoButtons();
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = canvasPoint(e);
  const hit = hitPanel(p);
  if (hit === -1) return;
  selected = hit;
  if (!wheelTimer) pushHistory();
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(() => { wheelTimer = null; }, 450);
  const panel = state.panels[hit];
  panel.zoom = Math.max(1, Math.min(2.6, (panel.zoom || 1) * Math.exp(-e.deltaY * 0.0012)));
  updateControls();
  render();
}, { passive: false });

// --------------------------------------------------------------- controls

function wireGroup(containerId, key, after) {
  $(containerId).addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    pushHistory();
    state[key] = btn.dataset[key];
    if (key === 'stars') state.stars = Number(state.stars);
    if (key === 'layout') clampSelection();
    updateControls();
    render();
    if (after) after();
  });
}

function buildGroups() {
  const layoutBtns = $('layoutBtns');
  LAYOUT_IDS.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = id;
    b.textContent = LAYOUTS[id].name;
    layoutBtns.appendChild(b);
  });
  const gradeBtns = $('gradeBtns');
  GRADE_IDS.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = id;
    b.className = 'swatch';
    b.title = GRADES[id].name;
    b.style.background = `linear-gradient(135deg, ${GRADES[id].title[0]}, ${GRADES[id].title[2]})`;
    const label = document.createElement('span');
    label.textContent = GRADES[id].name;
    b.appendChild(label);
    gradeBtns.appendChild(b);
  });
  const sizeBtns = $('sizeBtns');
  EXPORT_SIZES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.size = s.id;
    b.textContent = `${s.w} × ${s.h}`;
    sizeBtns.appendChild(b);
  });
  const starBtns = $('starBtns');
  for (let n = 0; n <= 5; n++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.stars = String(n);
    b.textContent = n === 0 ? 'No stars' : '★'.repeat(n);
    starBtns.appendChild(b);
  }
  const frameBtns = $('frameBtns');
  [['none', 'No frame'], ['white', 'White'], ['black', 'Black']].forEach(([id, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.frame = id;
    b.textContent = label;
    frameBtns.appendChild(b);
  });
  const badgeBtns = $('badgeBtns');
  [['none', 'None'], ['ribbon', 'Ribbon'], ['pill', 'Pill'], ['strip', 'Strip']].forEach(([id, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.badge = id;
    b.textContent = label;
    badgeBtns.appendChild(b);
  });
}

$('titleInput').addEventListener('input', (e) => {
  state.title = e.target.value;
  render();
});
$('titleInput').addEventListener('change', () => pushHistory());
$('subtitleInput').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  render();
});
$('subtitleInput').addEventListener('change', () => pushHistory());
$('badgeText').addEventListener('input', (e) => {
  state.badgeText = e.target.value;
  render();
});
$('badgeText').addEventListener('change', () => pushHistory());

[['grainToggle', 'grain'], ['vignetteToggle', 'vignette'], ['halftoneToggle', 'halftone']].forEach(([id, key]) => {
  $(id).addEventListener('change', (e) => {
    pushHistory();
    state[key] = e.target.checked;
    render();
  });
});

$('zoomSlider').addEventListener('input', (e) => {
  state.panels[selected].zoom = Number(e.target.value) / 100;
  $('zoomLabel').textContent = `${e.target.value}%`;
  render();
});
$('zoomSlider').addEventListener('change', () => pushHistory());

$('fillBtn').addEventListener('click', () => {
  placePhoto(selected, armedPhoto ?? state.panels[selected].photo);
  const panel = state.panels[selected];
  panel.zoom = 1;
  panel.panX = 0;
  panel.panY = 0;
  render();
});

$('nextPhotoBtn').addEventListener('click', () => {
  const photos = allPhotos();
  const cur = photos.findIndex((p) => p.id === state.panels[selected].photo);
  const next = photos[(cur + 1) % photos.length];
  placePhoto(selected, next.id);
});

$('undoBtn').addEventListener('click', undo);
$('redoBtn').addEventListener('click', redo);

$('shuffleBtn').addEventListener('click', () => {
  pushHistory();
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.layout = pick(LAYOUT_IDS);
  state.grade = pick(GRADE_IDS);
  state.title = pick(TITLES);
  const photos = allPhotos();
  state.panels = state.panels.map(() => {
    const p = pick(photos);
    return { photo: p.id, zoom: 1, panX: 0, panY: 0, focusX: p.focusX ?? 0.5, focusY: p.focusY ?? 0.4 };
  });
  clampSelection();
  setStatus('Shuffled: new layout, grade, title and photos.');
  updateControls();
  render();
});

$('exportBtn').addEventListener('click', async () => {
  await exportSize(state.size);
  setStatus(`Exported neon-palm-${state.size}.png`);
});
$('exportAllBtn').addEventListener('click', exportAll);

$('uploadBtn').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', async (e) => {
  for (const file of e.target.files) await addUpload(file);
  e.target.value = '';
});

['dragover', 'dragenter'].forEach((ev) => {
  document.body.addEventListener(ev, (e) => {
    e.preventDefault();
    document.body.classList.add('dragging');
  });
});
['dragleave', 'drop'].forEach((ev) => {
  document.body.addEventListener(ev, (e) => {
    e.preventDefault();
    document.body.classList.remove('dragging');
  });
});
document.body.addEventListener('drop', async (e) => {
  const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
  for (const file of files) await addUpload(file);
});

document.addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '');
  if (typing) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
    e.preventDefault();
    redo();
  }
});

// -------------------------------------------------------------------- boot

wireGroup('layoutBtns', 'layout');
wireGroup('gradeBtns', 'grade');
wireGroup('sizeBtns', 'size');
wireGroup('starBtns', 'stars');
wireGroup('frameBtns', 'frame');
wireGroup('badgeBtns', 'badge');
buildGroups();

async function boot() {
  for (const s of SAMPLES) {
    try {
      images[s.id] = await loadImage(s.file);
    } catch {
      // A missing sample leaves its panels dark; the rest still works.
    }
  }
  // Panels carry their own focus points so uploads work like samples.
  state.panels = state.panels.map((p) => {
    const meta = photoMeta(p.photo);
    return { ...p, focusX: meta.focusX ?? 0.5, focusY: meta.focusY ?? 0.4 };
  });
  buildTray();
  updateControls();
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px Pacifico'),
      document.fonts.ready,
    ]);
  } catch {
    // The canvas falls back to sans-serif; the cover still draws.
  }
  const query = new URLSearchParams(location.search);
  if (query.get('shot')) {
    await runShot(query, {
      get state() { return state; },
      setState(next) { state = { ...state, ...next }; clampSelection(); updateControls(); },
      images,
      loadImage,
      render,
    });
  } else {
    render();
    setStatus('Loaded 6 sample photos. Pick a layout, a grade, then Export PNG.');
  }
  updateUndoButtons();
}

// Exposed for the screenshot scenes and for end-to-end checks.
window.__studio = {
  get state() { return state; },
  images,
  render,
  undo,
  redo,
  exportSize,
  placePhoto,
  canvas,
};

boot();
