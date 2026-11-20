// Vice Cast Cover Studio — the cover renderer.
//
// One pure function, drawCover, paints the whole poster on a 2D canvas: the
// panel mosaic, the colour grade and print effects, the striped retro-chrome
// title over the art, and the movie-poster furniture (review quote, billing
// block, gold seal, barcode, COMING SOON). It draws the same way at preview
// size and at full export size, and it is deterministic: the grain, the
// halftone and the barcode all come from a seeded generator, never Math.random.

/** The three post sizes the app exports, in export pixels. */
export const SIZE_PRESETS = {
  '1x1': { label: '1:1 Post', w: 1080, h: 1080 },
  '4x5': { label: '4:5 Portrait', w: 1080, h: 1350 },
  '16x9': { label: '16:9 Wide', w: 1920, h: 1080 },
};

/** The cast tags each panel starts with, in panel order. */
export const ROLE_TAGS = [
  'THE BOSS',
  'THE DRIVER',
  'THE RIDER',
  'THE COURIER',
  'THE INSIDER',
  'THE LOOKOUT',
  'THE FIXER',
];

/**
 * The eight fictional sample-cast photos, in the order the crew fills panels.
 * Each carries its face anchor (the face centre in image fractions, measured
 * when the photo was made), so the sample crew crops face-first even where
 * the browser has no FaceDetector; a visitor's own photos are detected live.
 */
export const SAMPLE_CAST = [
  { file: 'cast-boss.jpg', role: 'THE BOSS', name: 'Mara Voss', face: { x: 0.55, y: 0.3 } },
  { file: 'cast-driver.jpg', role: 'THE DRIVER', name: 'Danny Reyes', face: { x: 0.5, y: 0.4 } },
  { file: 'cast-rider.jpg', role: 'THE RIDER', name: 'June Park', face: { x: 0.45, y: 0.22 } },
  { file: 'cast-courier.jpg', role: 'THE COURIER', name: 'Eddie Holt', face: { x: 0.5, y: 0.33 } },
  { file: 'cast-insider.jpg', role: 'THE INSIDER', name: 'Vera Lane', face: { x: 0.55, y: 0.35 } },
  { file: 'cast-skater.jpg', role: 'THE LOOKOUT', name: 'Marcus Bell', face: { x: 0.5, y: 0.18 } },
  { file: 'cast-queen.jpg', role: 'THE FIXER', name: 'Lola Cruz', face: { x: 0.5, y: 0.32 } },
  { file: 'cast-veteran.jpg', role: 'THE MENTOR', name: 'Sal Romero', face: { x: 0.5, y: 0.3 } },
];

/**
 * The four layouts. Each panel is a rectangle in fractions of the cover
 * (x, y, w, h), with an optional slant: the diagonal strips shear their top
 * edge right and their bottom edge left by that many fractions of the width.
 */
export const LAYOUTS = {
  hero: {
    label: 'Hero mosaic',
    panels: [
      { x: 0.3, y: 0.062, w: 0.4, h: 0.648 },
      { x: 0.02, y: 0.062, w: 0.26, h: 0.2 },
      { x: 0.02, y: 0.278, w: 0.26, h: 0.2 },
      { x: 0.02, y: 0.494, w: 0.26, h: 0.216 },
      { x: 0.72, y: 0.062, w: 0.26, h: 0.2 },
      { x: 0.72, y: 0.278, w: 0.26, h: 0.2 },
      { x: 0.72, y: 0.494, w: 0.26, h: 0.216 },
    ],
  },
  six: {
    label: 'Six grid',
    panels: [
      { x: 0.02, y: 0.062, w: 0.3133, h: 0.315 },
      { x: 0.3433, y: 0.062, w: 0.3133, h: 0.315 },
      { x: 0.6666, y: 0.062, w: 0.3133, h: 0.315 },
      { x: 0.02, y: 0.393, w: 0.3133, h: 0.317 },
      { x: 0.3433, y: 0.393, w: 0.3133, h: 0.317 },
      { x: 0.6666, y: 0.393, w: 0.3133, h: 0.317 },
    ],
  },
  diagonal: {
    label: 'Diagonal strips',
    panels: [
      { x: 0.0, y: 0.062, w: 0.28, h: 0.648, slant: 0.05 },
      { x: 0.25, y: 0.062, w: 0.28, h: 0.648, slant: 0.05 },
      { x: 0.5, y: 0.062, w: 0.28, h: 0.648, slant: 0.05 },
      { x: 0.75, y: 0.062, w: 0.28, h: 0.648, slant: 0.05 },
    ],
  },
  seven: {
    label: 'Seven mosaic',
    panels: [
      { x: 0.02, y: 0.062, w: 0.47, h: 0.3 },
      { x: 0.51, y: 0.062, w: 0.47, h: 0.3 },
      { x: 0.02, y: 0.378, w: 0.3133, h: 0.16 },
      { x: 0.3433, y: 0.378, w: 0.3133, h: 0.16 },
      { x: 0.6666, y: 0.378, w: 0.3133, h: 0.16 },
      { x: 0.02, y: 0.554, w: 0.47, h: 0.156 },
      { x: 0.51, y: 0.554, w: 0.47, h: 0.156 },
    ],
  },
};

/** The six colour grades: a canvas filter plus a tint washed over the panels. */
export const GRADES = {
  sunset: {
    label: 'Sunset Gold',
    filter: 'saturate(1.28) contrast(1.09) brightness(1.03)',
    top: 'rgba(255, 122, 26, 0.20)',
    bottom: 'rgba(214, 36, 110, 0.28)',
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.45) contrast(1.12) brightness(0.98) hue-rotate(-12deg)',
    top: 'rgba(45, 226, 230, 0.16)',
    bottom: 'rgba(255, 46, 136, 0.30)',
  },
  teal: {
    label: 'Tropic Teal',
    filter: 'saturate(1.22) contrast(1.06) hue-rotate(14deg)',
    top: 'rgba(0, 190, 170, 0.20)',
    bottom: 'rgba(10, 60, 110, 0.30)',
  },
  golden: {
    label: 'Golden Hour',
    filter: 'saturate(1.18) contrast(1.05) brightness(1.06) sepia(0.22)',
    top: 'rgba(255, 200, 80, 0.22)',
    bottom: 'rgba(160, 60, 20, 0.26)',
  },
  heat: {
    label: 'Heatwave',
    filter: 'saturate(1.4) contrast(1.16) brightness(1.0)',
    top: 'rgba(255, 60, 20, 0.22)',
    bottom: 'rgba(120, 0, 40, 0.32)',
  },
  dusk: {
    label: 'Magenta Dusk',
    filter: 'saturate(1.32) contrast(1.1) hue-rotate(28deg)',
    top: 'rgba(190, 60, 255, 0.20)',
    bottom: 'rgba(40, 0, 80, 0.34)',
  },
};

/** The five striped retro-chrome 3D title styles. */
export const TITLE_STYLES = {
  sunset: {
    label: 'Sunset chrome',
    stops: ['#fff7d6', '#ffd23f', '#ff7a1a', '#ff2e88', '#7a1fa2'],
    stripe: 'rgba(60, 0, 40, 0.55)',
    extrude: '#2a0a2e',
    outline: '#1c0618',
    glow: 'rgba(255, 90, 160, 0.55)',
  },
  gold: {
    label: 'Golden leaf',
    stops: ['#fffbe8', '#ffe066', '#f5a623', '#b97a12', '#7a4d00'],
    stripe: 'rgba(70, 40, 0, 0.5)',
    extrude: '#3a2400',
    outline: '#241503',
    glow: 'rgba(255, 200, 60, 0.5)',
  },
  ice: {
    label: 'Ice neon',
    stops: ['#ffffff', '#b8f4ff', '#2de2e6', '#2b7fff', '#123a8a'],
    stripe: 'rgba(0, 30, 60, 0.55)',
    extrude: '#04122e',
    outline: '#020a1c',
    glow: 'rgba(45, 226, 230, 0.6)',
  },
  tube: {
    label: 'Neon tube',
    stops: ['#fff0fa', '#ffb3e6', '#ff2e88', '#b026ff', '#4d0a8a'],
    stripe: 'rgba(40, 0, 50, 0.55)',
    extrude: '#24002e',
    outline: '#16001d',
    glow: 'rgba(255, 46, 136, 0.7)',
  },
  blade: {
    label: 'Heat blade',
    stops: ['#fff3e0', '#ffc46b', '#ff5a1f', '#d21f3c', '#5c0018'],
    stripe: 'rgba(50, 0, 0, 0.55)',
    extrude: '#2e0008',
    outline: '#1c0005',
    glow: 'rgba(255, 90, 31, 0.6)',
  },
};

/** The two script subtitle fonts: Pacifico (vendored) and the system script. */
export const SUBTITLE_FONTS = {
  pacifico: { label: 'Pacifico script', family: "'Pacifico', cursive" },
  retro: { label: 'Retro script', family: "'Segoe Script', 'Brush Script MT', cursive" },
};

/** A tiny deterministic generator, so the grain and barcode never change. */
export function seededRandom(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Panel rectangles in pixels for a layout at a cover size. */
export function layoutPanels(layoutId, w, h) {
  const layout = LAYOUTS[layoutId] ?? LAYOUTS.hero;
  return layout.panels.map((p) => ({
    x: p.x * w,
    y: p.y * h,
    w: p.w * w,
    h: p.h * h,
    slant: (p.slant ?? 0) * w,
  }));
}

/** Finds the panel index under a point in cover pixels, or -1. */
export function panelAt(layoutId, w, h, x, y) {
  const panels = layoutPanels(layoutId, w, h);
  for (let i = panels.length - 1; i >= 0; i -= 1) {
    const p = panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

function clipPanel(ctx, p) {
  ctx.beginPath();
  if (p.slant) {
    ctx.moveTo(p.x + p.slant, p.y);
    ctx.lineTo(p.x + p.w + p.slant, p.y);
    ctx.lineTo(p.x + p.w - p.slant, p.y + p.h);
    ctx.lineTo(p.x - p.slant, p.y + p.h);
    ctx.closePath();
  } else {
    ctx.rect(p.x, p.y, p.w, p.h);
  }
  ctx.clip();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Draws one photo into one panel: cover-fit, zoomed, panned so the panel's
 * centre shows the photo point (px, py) in image fractions, optionally flipped.
 */
function drawPanelPhoto(ctx, panel, photo, rect, grade, look) {
  const img = photo.img;
  const zoom = panel.zoom ?? 1;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const px = panel.px ?? 0.5;
  const py = panel.py ?? 0.42;
  let ox = cx - px * dw;
  let oy = cy - py * dh;
  ox = Math.min(rect.x, Math.max(rect.x + rect.w - dw, ox));
  oy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, oy));
  ctx.save();
  ctx.filter = grade.filter;
  if (look.paint > 0) ctx.filter += ` contrast(${1 + look.paint * 0.12}) saturate(${1 + look.paint * 0.15})`;
  if (panel.flip) {
    ctx.translate(cx, 0);
    ctx.scale(-1, 1);
    ctx.translate(-cx, 0);
  }
  ctx.drawImage(img, ox, oy, dw, dh);
  ctx.restore();
  ctx.save();
  clipPanel(ctx, rect);
  const tint = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  tint.addColorStop(0, grade.top);
  tint.addColorStop(1, grade.bottom);
  ctx.globalAlpha = 0.35 + look.grade * 0.65;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const vig = ctx.createRadialGradient(cx, cy, Math.min(rect.w, rect.h) * 0.35, cx, cy, Math.max(rect.w, rect.h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,0,20,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** The number badge and role tag of one panel. */
function drawPanelFurniture(ctx, rect, index, role, selected, unit) {
  const bx = rect.x + unit * 0.55;
  const by = rect.y + unit * 0.55;
  const br = unit * 0.85;
  ctx.save();
  ctx.beginPath();
  ctx.arc(bx + br, by + br, br, 0, Math.PI * 2);
  ctx.fillStyle = selected ? '#ff2e88' : 'rgba(12, 6, 24, 0.85)';
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, unit * 0.09);
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.round(unit * 1.05)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(index + 1), bx + br, by + br + unit * 0.06);
  if (selected) {
    ctx.lineWidth = Math.max(2, unit * 0.16);
    ctx.strokeStyle = '#ff2e88';
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  }
  const label = (role ?? '').trim().toUpperCase();
  if (label) {
    ctx.font = `${Math.round(unit * 0.82)}px Anton, sans-serif`;
    const tw = ctx.measureText(label).width;
    const pad = unit * 0.55;
    const th = unit * 1.5;
    const tx = rect.x + unit * 0.45;
    const ty = rect.y + rect.h - th - unit * 0.45;
    ctx.fillStyle = 'rgba(12, 6, 24, 0.88)';
    roundRectPath(ctx, tx, ty, tw + pad * 2, th, th / 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.textAlign = 'left';
    ctx.fillText(label, tx + pad, ty + th / 2 + unit * 0.05);
  }
  ctx.restore();
}

/** A halftone dot screen over the panel band. */
function drawHalftone(ctx, w, h, amount, unit) {
  if (amount <= 0.01) return;
  const step = Math.max(6, unit * 1.1);
  const r = step * 0.22 * amount;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 0, 20, 0.5)';
  for (let y = step / 2; y < h * 0.72; y += step) {
    for (let x = step / 2; x < w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Film grain from a seeded tile, tiled over the whole cover. */
let grainTile = null;
function drawGrain(ctx, w, h, amount) {
  if (amount <= 0.01) return;
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = 160;
    grainTile.height = 160;
    const g = grainTile.getContext('2d');
    const img = g.createImageData(160, 160);
    const rand = seededRandom(20261120);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rand() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 28;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  const pattern = ctx.createPattern(grainTile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** A warm sky glow behind the title. */
function drawGlow(ctx, w, h, amount) {
  if (amount <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(w / 2, h * 0.62, 0, w / 2, h * 0.62, w * 0.6);
  glow.addColorStop(0, `rgba(255, 140, 60, ${0.5 * amount})`);
  glow.addColorStop(0.6, `rgba(255, 46, 136, ${0.22 * amount})`);
  glow.addColorStop(1, 'rgba(255, 46, 136, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * The striped retro-chrome 3D title: extruded layers, a vertical chrome
 * gradient, dark horizontal stripes cut into the letters, and a dark outline.
 */
function drawChromeTitle(ctx, text, style, cx, baselineY, size, w, tilt) {
  const words = text.trim().toUpperCase();
  if (!words) return;
  let fontSize = size;
  ctx.font = `${fontSize}px Anton, sans-serif`;
  while (ctx.measureText(words).width > w * 0.94 && fontSize > 10) {
    fontSize -= 2;
    ctx.font = `${fontSize}px Anton, sans-serif`;
  }
  const depth = Math.max(3, Math.round(fontSize * 0.07));
  ctx.save();
  ctx.translate(cx, baselineY);
  ctx.rotate(tilt);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${fontSize}px Anton, sans-serif`;
  ctx.shadowColor = style.glow;
  ctx.shadowBlur = fontSize * 0.25;
  for (let i = depth; i >= 1; i -= 1) {
    ctx.fillStyle = style.extrude;
    ctx.shadowBlur = 0;
    ctx.fillText(words, i * 0.55, i);
  }
  ctx.shadowBlur = fontSize * 0.25;
  const face = document.createElement('canvas');
  const fw = Math.ceil(ctx.measureText(words).width) + fontSize;
  face.width = fw;
  face.height = Math.ceil(fontSize * 1.6);
  const f = face.getContext('2d');
  f.font = `${fontSize}px Anton, sans-serif`;
  f.textAlign = 'center';
  f.textBaseline = 'alphabetic';
  const grad = f.createLinearGradient(0, 0, 0, fontSize * 1.2);
  style.stops.forEach((color, i) => grad.addColorStop(i / (style.stops.length - 1), color));
  f.fillStyle = grad;
  f.fillText(words, fw / 2, fontSize * 1.1);
  f.globalCompositeOperation = 'source-atop';
  f.fillStyle = style.stripe;
  const stripeStep = Math.max(4, fontSize / 7);
  for (let y = fontSize * 0.12; y < fontSize * 1.25; y += stripeStep) {
    f.fillRect(0, y, fw, Math.max(1, stripeStep * 0.28));
  }
  const sheen = f.createLinearGradient(0, 0, 0, fontSize * 0.45);
  sheen.addColorStop(0, 'rgba(255,255,255,0.55)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  f.fillStyle = sheen;
  f.fillRect(0, 0, fw, fontSize * 0.45);
  f.globalCompositeOperation = 'source-over';
  f.lineWidth = Math.max(1.5, fontSize * 0.045);
  f.strokeStyle = style.outline;
  f.lineJoin = 'round';
  f.strokeText(words, fw / 2, fontSize * 1.1);
  ctx.drawImage(face, -fw / 2, -fontSize * 1.1);
  ctx.restore();
}

/** The gold seal rosette: a starburst disc with BEST CAST inside. */
function drawSeal(ctx, cx, cy, radius) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const spikes = 20;
  for (let i = 0; i < spikes * 2; i += 1) {
    const r = i % 2 === 0 ? radius : radius * 0.84;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  const gold = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
  gold.addColorStop(0, '#ffe98a');
  gold.addColorStop(0.6, '#f5b81e');
  gold.addColorStop(1, '#9a6a00');
  ctx.fillStyle = gold;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, radius * 0.05);
  ctx.strokeStyle = '#5c3d00';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.68, 0, Math.PI * 2);
  ctx.fillStyle = '#fff3c4';
  ctx.fill();
  ctx.fillStyle = '#7a4d00';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(radius * 0.3)}px Anton, sans-serif`;
  ctx.fillText('BEST', 0, -radius * 0.18);
  ctx.fillText('CAST', 0, radius * 0.16);
  ctx.font = `${Math.round(radius * 0.26)}px sans-serif`;
  ctx.fillText('★ ★ ★', 0, radius * 0.44);
  ctx.restore();
}

/** A deterministic barcode with its number line. */
function drawBarcode(ctx, x, y, w, h) {
  const rand = seededRandom(8675309);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 16);
  ctx.fillStyle = '#111111';
  let bx = x;
  while (bx < x + w - 3) {
    const bw = 1 + Math.floor(rand() * 4);
    if (rand() > 0.42) ctx.fillRect(bx, y, bw, h);
    bx += bw + 1 + Math.floor(rand() * 3);
  }
  // The number line is 16 monospace characters (about 9.6em wide), so it is
  // sized to fit the box rather than spilling past the cover's edge.
  ctx.font = `${Math.max(4, Math.round(Math.min(h * 0.32, w / 9.6)))}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('8 901234 567890', x + w / 2, y + h + 2);
  ctx.restore();
}

/**
 * Draws the whole cover on `canvas` from `state`:
 * photos (with img + face), panels (photo index, zoom, pan, flip, role),
 * layout, grade, title style, subtitle font, words and look sliders.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const unit = w / 100;
  const look = state.look;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const style = TITLE_STYLES[state.titleStyle] ?? TITLE_STYLES.sunset;
  const subFont = SUBTITLE_FONTS[state.subtitleFont] ?? SUBTITLE_FONTS.pacifico;

  ctx.save();
  ctx.fillStyle = '#160b22';
  ctx.fillRect(0, 0, w, h);

  const panels = layoutPanels(state.layout, w, h);
  panels.forEach((rect, i) => {
    const panel = state.panels[i];
    ctx.save();
    clipPanel(ctx, rect);
    ctx.fillStyle = '#241534';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    if (panel && panel.photo != null && state.photos[panel.photo]) {
      drawPanelPhoto(ctx, panel, state.photos[panel.photo], rect, grade, look);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.font = `${Math.round(unit * 1.6)}px Anton, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DROP A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
    ctx.restore();
    ctx.save();
    clipPanel(ctx, rect);
    ctx.lineWidth = Math.max(2, unit * 0.28);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
    ctx.restore();
    drawPanelFurniture(ctx, rect, i, panel ? panel.role : ROLE_TAGS[i], i === state.selected, unit);
  });

  drawHalftone(ctx, w, h, look.halftone, unit);
  drawGlow(ctx, w, h, look.glow);
  drawGrain(ctx, w, h, look.grain);

  const titleSize = w * 0.105 * (0.7 + look.titleSize * 0.6);
  drawChromeTitle(ctx, state.title, style, w / 2, h * 0.735, titleSize, w, -0.028);

  const subtitle = (state.subtitle ?? '').trim();
  if (subtitle) {
    ctx.save();
    ctx.font = `${Math.round(w * 0.036)}px ${subFont.family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = unit;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, w / 2, h * 0.795);
    ctx.restore();
  }

  const tagline = (state.tagline ?? '').trim().toUpperCase();
  if (tagline) {
    ctx.save();
    ctx.font = `${Math.round(unit * 1.5)}px Anton, sans-serif`;
    const tw = ctx.measureText(tagline).width;
    const pad = unit * 1.6;
    const rw = tw + pad * 2;
    const rh = unit * 2.7;
    const rx = (w - rw) / 2;
    const ry = h * 0.815;
    ctx.fillStyle = '#ff2e88';
    ctx.beginPath();
    ctx.moveTo(rx + rh * 0.4, ry);
    ctx.lineTo(rx + rw, ry);
    ctx.lineTo(rx + rw - rh * 0.4, ry + rh);
    ctx.lineTo(rx, ry + rh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagline, w / 2, ry + rh / 2 + unit * 0.08);
    ctx.restore();
  }

  const quote = (state.quote ?? '').trim();
  if (quote) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd23f';
    ctx.font = `${Math.round(unit * 1.5)}px sans-serif`;
    ctx.fillText('★ ★ ★ ★ ★', w / 2, h * 0.026);
    ctx.fillStyle = '#ffffff';
    ctx.font = `italic ${Math.round(unit * 1.35)}px Georgia, serif`;
    const q = `“${quote}”  —  THE SUNSET HERALD`;
    ctx.fillText(q, w / 2, h * 0.026 + unit * 1.7);
    ctx.restore();
  }

  drawSeal(ctx, w * 0.075, h * 0.865, w * 0.052);
  ctx.save();
  ctx.font = `${Math.round(unit * 1.4)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const vol = 'VOL. 1';
  const vw = ctx.measureText(vol).width + unit * 2;
  ctx.fillStyle = '#ffd23f';
  roundRectPath(ctx, w - vw - unit * 1.2, h * 0.02, vw, unit * 2.4, unit * 0.5);
  ctx.fill();
  ctx.fillStyle = '#160b22';
  ctx.fillText(vol, w - vw / 2 - unit * 1.2, h * 0.02 + unit * 1.28);
  ctx.restore();

  drawBarcode(ctx, w * 0.885, h * 0.9, w * 0.09, h * 0.032);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.round(unit * 1.7)}px Anton, sans-serif`;
  ctx.fillText('C O M I N G   S O O N', w / 2, h * 0.915);
  const cast = panels
    .map((_, i) => (state.panels[i] ? state.panels[i].role : ROLE_TAGS[i]))
    .filter(Boolean)
    .map((r) => r.toUpperCase())
    .join('  •  ');
  ctx.font = `${Math.round(unit * 0.95)}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('VICE CAST COVER STUDIO  PRESENTS  A PALM PICTURES PRODUCTION', w / 2, h * 0.948);
  ctx.fillText(`STARRING  ${cast}`, w / 2, h * 0.972);
  ctx.restore();

  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(5,0,15,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
