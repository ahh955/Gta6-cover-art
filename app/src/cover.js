// The cover renderer for Neon Palm Cover Studio: draws a whole poster onto any
// canvas at any size, from the editor state and the loaded photos. One function,
// drawCover, is used for the live preview, the PNG exports and the screenshot
// scenes, so what the editor shows is exactly what the PNG holds.

import { GRADES } from './grades.js';
import { layoutCells } from './layouts.js';

export const EXPORT_SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  { id: '1920x1080', w: 1920, h: 1080, label: 'Landscape · 1920 × 1080' },
  { id: '1080x1920', w: 1080, h: 1920, label: 'Story · 1080 × 1920' },
];

export const SAMPLES = [
  { id: 'woman-convertible', file: 'samples/woman-convertible.jpg', label: 'Convertible', caption: 'Vice City', focusX: 0.52, focusY: 0.28 },
  { id: 'man-rooftop', file: 'samples/man-rooftop.jpg', label: 'Rooftop', caption: 'Night Shift', focusX: 0.48, focusY: 0.42 },
  { id: 'friends-neon', file: 'samples/friends-neon.jpg', label: 'Neon Friends', caption: 'Neon Nights', focusX: 0.50, focusY: 0.38 },
  { id: 'speedboat', file: 'samples/speedboat.jpg', label: 'Speedboat', caption: 'Ocean Drive', focusX: 0.48, focusY: 0.55 },
  { id: 'boulevard', file: 'samples/boulevard.jpg', label: 'Boulevard', caption: 'Palm Row', focusX: 0.52, focusY: 0.16 },
  { id: 'pier', file: 'samples/pier.jpg', label: 'Pier', caption: 'Pier Pressure', focusX: 0.38, focusY: 0.22 },
];

export function sampleById(id) {
  return SAMPLES.find((s) => s.id === id) ?? SAMPLES[0];
}

/** Eight panel slots, each holding a photo id, a zoom, a pan and a focus point. */
export function defaultPanels() {
  return Array.from({ length: 8 }, (_, i) => {
    const sample = SAMPLES[i % SAMPLES.length];
    return {
      photo: sample.id,
      zoom: 1,
      panX: 0,
      panY: 0,
      focusX: sample.focusX,
      focusY: sample.focusY,
    };
  });
}

export function defaultState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    size: '1080x1080',
    title: 'NEON SHORE',
    subtitle: 'Vice City nights',
    stars: 4,
    badge: 'ribbon',
    badgeText: 'NEW',
    frame: 'white',
    grain: true,
    vignette: true,
    halftone: false,
    panels: defaultPanels(),
  };
}

// ---------------------------------------------------------------- helpers

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainCanvas = null;
function noisePattern(ctx) {
  if (!grainCanvas) {
    grainCanvas = document.createElement('canvas');
    grainCanvas.width = 160;
    grainCanvas.height = 160;
    const g = grainCanvas.getContext('2d');
    const img = g.createImageData(160, 160);
    const rand = mulberry32(20261119);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rand() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  return ctx.createPattern(grainCanvas, 'repeat');
}

function drawHalftone(ctx, rect, spacing, color) {
  ctx.save();
  ctx.fillStyle = color;
  const r = Math.max(1, spacing * 0.16);
  for (let y = rect.y + spacing / 2; y < rect.y + rect.h; y += spacing) {
    for (let x = rect.x + spacing / 2; x < rect.x + rect.w; x += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------- photo panels

/** Draws one photo into a panel rect, cover-fit, keeping the focus point in view. */
export function drawPhotoInto(ctx, img, rect, panel, filter) {
  const sample = sampleById(panel.photo);
  const focusX = panel.focusX ?? sample.focusX;
  const focusY = panel.focusY ?? sample.focusY;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const s = base * (panel.zoom || 1);
  const dw = iw * s;
  const dh = ih * s;
  // Centre the focus point, then clamp so the panel stays covered.
  let dx = rect.x + rect.w / 2 - focusX * dw;
  let dy = rect.y + rect.h / 2 - focusY * dh;
  if (dw > rect.w) dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx));
  else dx = rect.x + (rect.w - dw) / 2;
  if (dh > rect.h) dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy));
  else dy = rect.y + (rect.h - dh) / 2;
  // The user's pan, in fractions of the slack, clamped to keep coverage.
  if (dw > rect.w) dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx + (panel.panX || 0) * (dw - rect.w)));
  if (dh > rect.h) dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy + (panel.panY || 0) * (dh - rect.h)));
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (filter) ctx.filter = filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

/** The grade's wash over one panel: warm light from the top, shade at the foot. */
function gradeWash(ctx, rect, grade) {
  const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  wash.addColorStop(0, grade.highlight);
  wash.addColorStop(0.55, 'rgba(0,0,0,0)');
  wash.addColorStop(1, grade.shadow);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

// ---------------------------------------------------------------- lettering

function fitTitleLines(ctx, text, maxWidth, startSize) {
  const words = text.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (!words.length) return { lines: [], size: startSize };
  let size = startSize;
  const setFont = () => { ctx.font = `${size}px Anton, sans-serif`; };
  setFont();
  if (ctx.measureText(words.join(' ')).width <= maxWidth) {
    return { lines: [words.join(' ')], size };
  }
  // Two lines, split near the middle, then shrink until both fit.
  let best = null;
  for (let cut = 1; cut < words.length; cut++) {
    const a = words.slice(0, cut).join(' ');
    const b = words.slice(cut).join(' ');
    const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
    if (!best || w < best.w) best = { lines: [a, b], w };
  }
  if (best) {
    while (size > 10) {
      setFont();
      const w = Math.max(ctx.measureText(best.lines[0]).width, ctx.measureText(best.lines[1]).width);
      if (w <= maxWidth) break;
      size -= 2;
    }
    return { lines: best.lines, size };
  }
  while (size > 10 && ctx.measureText(words.join(' ')).width > maxWidth) {
    size -= 2;
    setFont();
  }
  return { lines: [words.join(' ')], size };
}

function drawTitleBlock(ctx, zone, state, grade) {
  const { title, subtitle, stars } = state;
  const align = zone.align || 'left';
  const x0 = zone.x;
  const cx = align === 'center' ? zone.x + zone.w / 2 : zone.x;
  ctx.textAlign = align === 'center' ? 'center' : 'left';
  ctx.textBaseline = 'alphabetic';

  // Size the title so the whole stack (subtitle, divider, title, stars) fits
  // the zone: shrink until it does, so nothing is ever clipped off-canvas.
  // The star meter is also capped by the zone's width, so its row never
  // overflows a narrow zone like the nine-panel title cell.
  const dividerH = Math.max(2, Math.round(zone.h * 0.02));
  const gap = Math.round(zone.h * 0.05);
  const hasSub = subtitle.trim().length > 0;
  const hasStars = stars > 0;
  let size = Math.round(zone.h * 0.40);
  let fitted = fitTitleLines(ctx, title, zone.w, size);
  let lineH;
  let subSize;
  let starR;
  let stackH;
  for (;;) {
    lineH = fitted.size * 1.02;
    subSize = Math.max(10, Math.round(fitted.size * 0.40));
    starR = Math.max(6, Math.min(Math.round(zone.h * 0.085), Math.round(zone.w / 12)));
    stackH = (hasSub ? subSize + gap : 0) + dividerH + gap + lineH * fitted.lines.length + (hasStars ? gap + starR * 2 : 0);
    if (stackH <= zone.h || size <= 12) break;
    size = Math.round(size * 0.9);
    fitted = fitTitleLines(ctx, title, zone.w, size);
  }
  let y = zone.y + Math.max(0, (zone.h - stackH) / 2);

  // Subtitle in neon script.
  if (subtitle.trim()) {
    ctx.save();
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = grade.subtitle;
    ctx.shadowColor = grade.neon;
    ctx.shadowBlur = subSize * 0.55;
    ctx.fillText(subtitle.trim(), cx, y + subSize);
    ctx.fillText(subtitle.trim(), cx, y + subSize);
    ctx.restore();
    y += subSize + gap;
  }

  // Neon divider rule.
  const divW = Math.min(zone.w * 0.45, 420);
  const divX = align === 'center' ? cx - divW / 2 : x0;
  const divGrad = ctx.createLinearGradient(divX, 0, divX + divW, 0);
  divGrad.addColorStop(0, 'rgba(255,255,255,0)');
  divGrad.addColorStop(0.5, grade.neon);
  divGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = divGrad;
  ctx.fillRect(divX, y, divW, dividerH);
  y += dividerH + gap;

  // Title in Anton, sunset gradient fill, dark outline, soft drop shadow.
  if (fitted.lines.length) {
    ctx.save();
    ctx.font = `${fitted.size}px Anton, sans-serif`;
    const grad = ctx.createLinearGradient(0, y, 0, y + lineH * fitted.lines.length);
    grad.addColorStop(0, grade.title[0]);
    grad.addColorStop(0.55, grade.title[1]);
    grad.addColorStop(1, grade.title[2]);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#160826';
    ctx.lineWidth = Math.max(2, fitted.size / 13);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = fitted.size * 0.14;
    ctx.shadowOffsetY = fitted.size * 0.04;
    fitted.lines.forEach((line, i) => {
      const ly = y + fitted.size + i * lineH;
      ctx.strokeText(line, cx, ly);
      ctx.fillStyle = grad;
      ctx.fillText(line, cx, ly);
    });
    ctx.restore();
    y += lineH * fitted.lines.length + gap;
  }

  // Star heat meter, 0-5.
  if (stars > 0) {
    const step = starR * 2.4;
    const total = step * 5 - step * 0.4;
    let sx = align === 'center' ? cx - total / 2 + starR : x0 + starR;
    const sy = y + starR;
    for (let i = 0; i < 5; i++) {
      starPath(ctx, sx + i * step, sy, starR);
      ctx.fillStyle = i < stars ? '#ffd319' : 'rgba(255, 255, 255, 0.16)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(20, 6, 32, 0.85)';
      ctx.lineWidth = Math.max(1, starR * 0.12);
      ctx.stroke();
    }
  }
}

// ------------------------------------------------------------------- badge

function drawBadge(ctx, W, H, state, grade) {
  const kind = state.badge;
  if (!kind || kind === 'none') return;
  const text = (state.badgeText || '').trim().toUpperCase() || 'NEW';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (kind === 'ribbon') {
    // Diagonal ribbon across the top-right corner.
    const band = Math.max(22, Math.round(Math.min(W, H) * 0.052));
    ctx.translate(W, 0);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(-W, -band / 2, W * 2, band);
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.round(band * 0.52)}px Anton, sans-serif`;
    ctx.fillText(text, Math.round(W * 0.16), 1);
  } else if (kind === 'pill') {
    const h = Math.max(24, Math.round(Math.min(W, H) * 0.05));
    ctx.font = `${Math.round(h * 0.5)}px Anton, sans-serif`;
    const w = ctx.measureText(text).width + h * 1.4;
    const x = Math.round(W * 0.03);
    const y = Math.round(H * 0.03);
    ctx.fillStyle = '#e11d48';
    roundRectPath(ctx, x, y, w, h, h / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  } else if (kind === 'strip') {
    const h = Math.max(20, Math.round(H * 0.04));
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(0, 0, W, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.round(h * 0.52)}px Anton, sans-serif`;
    ctx.fillText(text, W / 2, h / 2 + 1);
  }
  ctx.restore();
}

// -------------------------------------------------------------------- cover

/**
 * Draws the whole cover onto `canvas` at its own size.
 * `images` maps photo ids to loaded HTMLImageElements (missing ones are skipped).
 */
export function drawCover(canvas, state, images) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const geo = layoutCells(state.layout, W, H);

  // Keep the title clear of a top strip badge and of corner badges on
  // top-title layouts: shift or narrow the zone before anything is drawn.
  const zone = { ...geo.titleZone };
  if (state.badge === 'strip') {
    const stripH = Math.max(20, Math.round(H * 0.04));
    if (zone.y < stripH + 6) {
      const shift = stripH + 6 - zone.y;
      zone.y += shift;
      zone.h = Math.max(zone.h - shift, H * 0.08);
    }
  }
  if ((state.badge === 'ribbon' || state.badge === 'pill') && (state.layout === 'tilted' || state.layout === 'film')) {
    zone.w *= 0.72;
    zone.x = (W - zone.w) / 2;
  }

  // Background.
  if (geo.background === 'solid') {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, grade.bg[0]);
    bg.addColorStop(1, grade.bg[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    if (state.halftone) drawHalftone(ctx, { x: 0, y: 0, w: W, h: H }, Math.max(18, Math.round(Math.min(W, H) * 0.035)), 'rgba(255,255,255,0.07)');
  } else {
    ctx.fillStyle = '#150722';
    ctx.fillRect(0, 0, W, H);
  }

  // Film strip backing + sprocket holes, behind the frames.
  if (geo.strip) {
    const s = geo.strip;
    ctx.fillStyle = '#0d0d12';
    roundRectPath(ctx, s.x, s.y, s.w, s.h, Math.round(Math.min(W, H) * 0.01));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const hole = Math.max(5, Math.round(s.sprocket * 0.45));
    if (s.sprockets === 'row') {
      const step = Math.max(hole * 2.4, Math.round(s.w / 28));
      for (let x = s.x + step / 2; x < s.x + s.w - hole; x += step) {
        roundRectPath(ctx, x, s.y + (s.sprocket - hole) / 2, hole * 1.6, hole, hole / 2);
        ctx.fill();
        roundRectPath(ctx, x, s.y + s.h - s.sprocket + (s.sprocket - hole) / 2, hole * 1.6, hole, hole / 2);
        ctx.fill();
      }
    } else {
      const step = Math.max(hole * 2.4, Math.round(s.h / 24));
      for (let y = s.y + step / 2; y < s.y + s.h - hole; y += step) {
        roundRectPath(ctx, s.x + (s.sprocket - hole) / 2, y, hole, hole * 1.6, hole / 2);
        ctx.fill();
        roundRectPath(ctx, s.x + s.w - s.sprocket + (s.sprocket - hole) / 2, y, hole, hole * 1.6, hole / 2);
        ctx.fill();
      }
    }
  }

  // Photo panels.
  geo.panels.forEach((rect, i) => {
    const panel = state.panels[i] ?? state.panels[0];
    const img = images[panel.photo];
    if (geo.cards) {
      // Polaroid card: white border, photo inset, script caption in the strip.
      const border = Math.round(rect.w * 0.05);
      const stripH = Math.round(rect.h * 0.20);
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(((rect.rot || 0) * Math.PI) / 180);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = Math.round(Math.min(W, H) * 0.02);
      ctx.shadowOffsetY = Math.round(Math.min(W, H) * 0.008);
      ctx.fillStyle = '#fdfdf8';
      ctx.fillRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      const photoRect = {
        x: -rect.w / 2 + border,
        y: -rect.h / 2 + border,
        w: rect.w - 2 * border,
        h: rect.h - border - stripH,
      };
      if (img) {
        drawPhotoInto(ctx, img, photoRect, panel, grade.filter);
        gradeWash(ctx, photoRect, grade);
      } else {
        ctx.fillStyle = '#3a2b4a';
        ctx.fillRect(photoRect.x, photoRect.y, photoRect.w, photoRect.h);
      }
      ctx.fillStyle = '#374151';
      ctx.font = `${Math.max(10, Math.round(stripH * 0.42))}px Pacifico, cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sampleById(panel.photo).caption, 0, rect.h / 2 - stripH / 2);
      ctx.restore();
      return;
    }
    if (img) {
      drawPhotoInto(ctx, img, rect, panel, grade.filter);
      gradeWash(ctx, rect, grade);
    } else {
      ctx.fillStyle = '#3a2b4a';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
  });

  // Nine-panel centre title cell.
  if (geo.titleCell) {
    const c = geo.titleCell;
    ctx.fillStyle = '#160826';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    drawHalftone(ctx, c, Math.max(14, Math.round(Math.min(c.w, c.h) * 0.09)), 'rgba(255,255,255,0.08)');
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
  }

  // Scrim behind the title block, so lettering reads on any photo.
  if (state.layout === 'four') {
    const pad = Math.round(Math.min(W, H) * 0.02);
    ctx.fillStyle = grade.scrim;
    roundRectPath(ctx, zone.x - pad, zone.y - pad, zone.w + 2 * pad, zone.h + 2 * pad, pad * 1.2);
    ctx.fill();
  } else if (state.layout === 'hero' || state.layout === 'full') {
    const pad = Math.round(Math.min(W, H) * 0.02);
    const scrim = ctx.createLinearGradient(zone.x - pad, 0, zone.x + zone.w + pad, 0);
    scrim.addColorStop(0, grade.scrim);
    scrim.addColorStop(0.7, grade.scrim.replace(/[\d.]+\)$/, '0.25)'));
    scrim.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(zone.x - pad, zone.y - pad, zone.w + 2 * pad, zone.h + 2 * pad);
  }

  // Lettering: subtitle, divider, title, stars.
  drawTitleBlock(ctx, zone, state, grade);

  // Badge, then the light leak, grain and vignette over the whole cover.
  drawBadge(ctx, W, H, state, grade);
  const leak = grade.leak;
  const leakGrad = ctx.createRadialGradient(
    W * leak.x, H * leak.y, 0,
    W * leak.x, H * leak.y, Math.max(W, H) * leak.r,
  );
  leakGrad.addColorStop(0, leak.color);
  leakGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = leakGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = noisePattern(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.vignette) {
    const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(5, 0, 12, 0.34)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  // Frame around the whole cover.
  if (state.frame === 'white' || state.frame === 'black') {
    const fw = Math.max(4, Math.round(Math.min(W, H) * 0.012));
    ctx.strokeStyle = state.frame === 'white' ? '#fdfdf8' : '#0b0b10';
    ctx.lineWidth = fw;
    ctx.strokeRect(fw / 2, fw / 2, W - fw, H - fw);
  }
}
