// The cover renderer for Neon Palm Cover Studio.
//
// renderCover draws a whole poster onto any canvas at any size: the layout's
// photo panels (each graded, washed and leaked), the Anton title with its
// sunset gradient, the Pacifico neon subtitle, the star heat meter, the badge
// ribbon and the film effects. The editor preview and the PNG export both
// call it, so what you see is exactly what you share.

import { layoutGeometry } from './layouts.js';
import { gradeById, titleGradientStops, subtitleGlow } from './grades.js';

/** The four export sizes, id to pixels. */
export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
  { id: '1080x1920', label: 'Story · 1080 × 1920', w: 1080, h: 1920 },
];

/** Look an export size up by id; unknown ids fall back to square. */
export function sizeById(id) {
  return EXPORT_SIZES.find((s) => s.id === id) || EXPORT_SIZES[0];
}

/** A lazily built 128x128 film-grain tile, reused for every cover. */
let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const data = g.createImageData(128, 128);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.random() * 255;
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 22;
  }
  g.putImageData(data, 0, 0);
  grainTile = c;
  return c;
}

/** Draw one photo into a panel rect, cover-fit, panned by focus and zoomed. */
function drawPhotoPanel(ctx, img, rect, placement, grade, w, h) {
  const px = rect.x * w;
  const py = rect.y * h;
  const pw = rect.w * w;
  const ph = rect.h * h;
  ctx.save();
  ctx.translate(px + pw / 2, py + ph / 2);
  if (rect.rot) ctx.rotate((rect.rot * Math.PI) / 180);
  ctx.translate(-pw / 2, -ph / 2);
  if (rect.polaroid) {
    // A white polaroid card: the photo sits inside, with a fat bottom edge.
    const pad = pw * 0.035;
    const foot = ph * 0.13;
    ctx.fillStyle = '#fdfbf6';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = w * 0.02;
    ctx.shadowOffsetY = w * 0.008;
    ctx.fillRect(-pad, -pad, pw + 2 * pad, ph + pad + foot);
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.rect(0, 0, pw, ph);
    ctx.clip();
    drawGradedPhoto(ctx, img, 0, 0, pw, ph, placement, grade, w, h);
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.rect(0, 0, pw, ph);
  ctx.clip();
  drawGradedPhoto(ctx, img, 0, 0, pw, ph, placement, grade, w, h);
  ctx.restore();
}

/** The photo itself, graded and washed, inside an already-clipped rect. */
function drawGradedPhoto(ctx, img, x, y, pw, ph, placement, grade, w, h) {
  const zoom = placement.zoom || 1;
  const fx = placement.x ?? 0.5;
  const fy = placement.y ?? 0.5;
  const scale = Math.max(pw / img.width, ph / img.height) * zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  let dx = x + pw / 2 - fx * dw;
  let dy = y + ph / 2 - fy * dh;
  dx = Math.min(x, Math.max(x + pw - dw, dx));
  dy = Math.min(y, Math.max(y + ph - dh, dy));
  ctx.save();
  ctx.filter = grade.filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  // Shadow/highlight wash in soft light, then the warm light leak.
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const wash = ctx.createLinearGradient(x, y, x + pw, y + ph);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, pw, ph);
  ctx.restore();
  const leak = ctx.createRadialGradient(
    x + grade.leak.x * pw, y + grade.leak.y * ph, 0,
    x + grade.leak.x * pw, y + grade.leak.y * ph, Math.max(pw, ph) * 0.9,
  );
  leak.addColorStop(0, grade.leak.color);
  leak.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = leak;
  ctx.fillRect(x, y, pw, ph);
  ctx.restore();
}

/** Wrap a title into lines that fit maxWidth at the given font. */
function wrapTitle(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** The biggest Anton size (px) whose wrapped title fits boxW x boxH. */
function fitTitle(ctx, text, boxW, boxH, start) {
  let size = start;
  while (size > 12) {
    ctx.font = `${size}px Anton, sans-serif`;
    const lines = wrapTitle(ctx, text, boxW);
    if (lines.length * size * 1.04 <= boxH && lines.every((l) => ctx.measureText(l).width <= boxW)) {
      return { size, lines };
    }
    size -= 2;
  }
  ctx.font = `${size}px Anton, sans-serif`;
  return { size, lines: wrapTitle(ctx, text, boxW) };
}

/** Draw the title, subtitle, stars and divider inside a title zone. */
function drawLettering(ctx, state, zone, grade, w, h) {
  const title = (state.title || '').trim() || 'NEON SHORE';
  const boxW = zone.w * w;
  const boxH = (zone.h || 0.22) * h;
  const boxX = zone.x * w;
  const boxY = zone.y * h;
  const align = zone.align || 'left';

  if (zone.diamond) {
    // A rotated square behind the centre title, centred on the title box.
    ctx.save();
    ctx.translate(boxX + boxW / 2, boxY + boxH / 2);
    ctx.rotate(Math.PI / 4);
    const side = Math.min(boxW, boxH) * 0.98;
    const grad = ctx.createLinearGradient(-side / 2, -side / 2, side / 2, side / 2);
    grad.addColorStop(0, grade.sky[0]);
    grad.addColorStop(1, grade.sky[2]);
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = w * 0.02;
    ctx.fillRect(-side / 2, -side / 2, side, side);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(2, w * 0.004);
    ctx.strokeRect(-side / 2, -side / 2, side, side);
    ctx.restore();
  }
  if (zone.cell) {
    // The nine-panel centre cell: a halftone sunset block.
    const grad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
    grad.addColorStop(0, grade.sky[1]);
    grad.addColorStop(1, grade.sky[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    drawHalftone(ctx, boxX, boxY, boxW, boxH, w * 0.012, 'rgba(0,0,0,0.18)');
  }

  const startSize = zone.cell || zone.diamond ? boxW * 0.34 : boxW * 0.22;
  const { size, lines } = fitTitle(ctx, title.toUpperCase(), boxW * 0.96, boxH * (zone.cell || zone.diamond ? 0.52 : 0.62), startSize);
  const lineH = size * 1.04;
  const totalH = lines.length * lineH;
  const sub = (state.subtitle || '').trim();
  const subSize = Math.max(14, size * 0.42);
  const starR = Math.max(8, size * 0.16);
  const stars = Math.max(0, Math.min(5, state.stars | 0));
  const hasRule = !zone.cell && !zone.diamond;
  // The whole lettering block (title + subtitle + rule + stars) must fit:
  // measure it first, then place its top so it ends inside the zone.
  const blockH = totalH + size * 0.14
    + (sub ? subSize * 1.5 : 0)
    + (hasRule ? h * 0.024 : 0)
    + (stars > 0 ? starR * 2 + h * 0.005 : 0);
  let titleTop;
  if (zone.cell || zone.diamond) {
    titleTop = boxY + Math.max(0, (boxH - blockH) / 2);
  } else {
    // The block ends above the zone's bottom edge (a layout may reserve
    // space, e.g. the film strip's sprocket band), never past the canvas.
    const bottomY = (zone.bottom ?? 1) * h;
    titleTop = Math.min(boxY, bottomY - blockH - h * 0.01);
    titleTop = Math.max(0, titleTop);
  }

  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  const tx = align === 'center' ? boxX + boxW / 2 : align === 'right' ? boxX + boxW : boxX;
  const grad = ctx.createLinearGradient(boxX, titleTop, boxX, titleTop + totalH);
  const stops = titleGradientStops(grade);
  grad.addColorStop(0, stops[0]);
  grad.addColorStop(0.55, stops[1]);
  grad.addColorStop(1, stops[2]);
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  lines.forEach((line, i) => {
    const ly = titleTop + i * lineH;
    ctx.strokeStyle = 'rgba(20, 8, 24, 0.95)';
    ctx.lineWidth = Math.max(2, size * 0.14);
    ctx.strokeText(line, tx, ly);
    ctx.fillStyle = grad;
    ctx.fillText(line, tx, ly);
  });

  // Neon script subtitle under the title.
  let cursorY = titleTop + totalH + size * 0.14;
  if (sub) {
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.shadowColor = subtitleGlow(grade);
    ctx.shadowBlur = subSize * 0.55;
    ctx.fillStyle = '#fff7ff';
    ctx.fillText(sub, tx, cursorY);
    ctx.shadowBlur = 0;
    cursorY += subSize * 1.5;
  }

  // Neon divider rule.
  const ruleW = Math.min(boxW * 0.6, w * 0.4);
  const ruleX = align === 'center' ? tx - ruleW / 2 : align === 'right' ? tx - ruleW : tx;
  if (!zone.cell && !zone.diamond) {
    const rule = ctx.createLinearGradient(ruleX, 0, ruleX + ruleW, 0);
    rule.addColorStop(0, stops[1]);
    rule.addColorStop(1, stops[2]);
    ctx.fillStyle = rule;
    ctx.shadowColor = subtitleGlow(grade);
    ctx.shadowBlur = Math.max(4, w * 0.006);
    ctx.fillRect(ruleX, cursorY, ruleW, Math.max(2, h * 0.0035));
    ctx.shadowBlur = 0;
    cursorY += h * 0.02;
  }

  // Star heat meter, 0-5.
  if (stars > 0) {
    const gap = starR * 2.4;
    const rowW = 5 * gap - starR * 0.4;
    const startX = align === 'center' ? tx - rowW / 2 : align === 'right' ? tx - rowW : tx;
    for (let i = 0; i < 5; i++) {
      drawStar(ctx, startX + i * gap + starR, cursorY + starR, starR, i < stars);
    }
  }
  ctx.restore();
}

/** One five-pointed star, filled gold or just outlined. */
function drawStar(ctx, cx, cy, r, filled) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = '#ffd23e';
    ctx.shadowColor = '#ff9a3d';
    ctx.shadowBlur = r * 0.6;
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = Math.max(1.5, r * 0.14);
    ctx.stroke();
  }
  ctx.restore();
}

/** A field of halftone dots over a rectangle. */
function drawHalftone(ctx, x, y, w, h, step, color) {
  ctx.save();
  ctx.fillStyle = color;
  for (let yy = y + step / 2; yy < y + h; yy += step) {
    for (let xx = x + step / 2; xx < x + w; xx += step) {
      ctx.beginPath();
      ctx.arc(xx, yy, step * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The badge: a ribbon in the corner, a pill under the title, or a strip. */
function drawBadge(ctx, state, grade, w, h) {
  const text = (state.badge || '').trim();
  if (!text || state.badgeStyle === 'none') return;
  const stops = titleGradientStops(grade);
  ctx.save();
  ctx.font = `${Math.max(12, w * 0.016)}px Anton, sans-serif`;
  const tw = ctx.measureText(text.toUpperCase()).width;
  if (state.badgeStyle === 'ribbon') {
    ctx.translate(w * 0.90, h * 0.10);
    ctx.rotate(Math.PI / 4);
    const bw = tw + w * 0.05;
    const bh = Math.max(18, w * 0.028);
    const grad = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    grad.addColorStop(0, stops[1]);
    grad.addColorStop(1, stops[2]);
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = w * 0.01;
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), 0, 1);
  } else if (state.badgeStyle === 'pill') {
    const bw = tw + w * 0.04;
    const bh = Math.max(20, w * 0.032);
    const bx = w * 0.05;
    const by = h * 0.04;
    ctx.fillStyle = 'rgba(10, 6, 18, 0.72)';
    ctx.strokeStyle = stops[1];
    ctx.lineWidth = Math.max(2, w * 0.002);
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), bx + bw / 2, by + bh / 2 + 1);
  } else {
    // strip: a band across the top edge.
    const bh = Math.max(22, h * 0.032);
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, grade.sky[0]);
    grad.addColorStop(0.5, stops[1]);
    grad.addColorStop(1, grade.sky[0]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, bh);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), w / 2, bh / 2 + 1);
  }
  ctx.restore();
}

/** Film-strip sprocket holes along the strip layout's edges. */
function drawSprockets(ctx, geometry, w, h) {
  if (!geometry.strip) return;
  ctx.save();
  ctx.fillStyle = '#0d0a12';
  const hole = geometry.strip === 'horizontal' ? w * 0.014 : h * 0.014;
  const step = hole * 2.4;
  if (geometry.strip === 'horizontal') {
    ctx.fillRect(0, h * 0.04, w, h * 0.07);
    ctx.fillRect(0, h * 0.89, w, h * 0.07);
    ctx.fillStyle = '#f5f0e6';
    for (let x = hole; x < w; x += step) {
      ctx.fillRect(x, h * 0.055, hole, h * 0.04);
      ctx.fillRect(x, h * 0.905, hole, h * 0.04);
    }
  } else {
    ctx.fillRect(w * 0.02, 0, w * 0.09, h);
    ctx.fillRect(w * 0.89, 0, w * 0.09, h);
    ctx.fillStyle = '#f5f0e6';
    for (let y = hole; y < h; y += step) {
      ctx.fillRect(w * 0.045, y, w * 0.04, hole);
      ctx.fillRect(w * 0.915, y, w * 0.04, hole);
    }
  }
  ctx.restore();
}

/** Draw the whole cover onto ctx at size w x h. photos: HTMLImageElements. */
export function renderCover(ctx, state, photos, w, h) {
  const grade = gradeById(state.grade);
  const geometry = layoutGeometry(state.layout, w, h);

  // Sunset-sky background behind everything.
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.save();
  ctx.filter = 'none';
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // The photo panels.
  geometry.panels.forEach((rect, i) => {
    const placement = state.panels[i] || { photo: 0, x: 0.5, y: 0.5, zoom: 1 };
    const img = photos[placement.photo] || photos[0];
    if (!img) return;
    drawPhotoPanel(ctx, img, rect, placement, grade, w, h);
  });

  if (geometry.strip) drawSprockets(ctx, geometry, w, h);

  // Lettering, badge and effects on top.
  drawLettering(ctx, state, geometry.title, grade, w, h);
  drawBadge(ctx, state, grade, w, h);

  if (state.halftone) {
    drawHalftone(ctx, 0, h * 0.86, w, h * 0.14, Math.max(10, w * 0.014), 'rgba(255,255,255,0.16)');
  }
  if (state.vignette) {
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(8,4,16,0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (state.frame && state.frame !== 'none') {
    ctx.save();
    ctx.strokeStyle = state.frame === 'white' ? '#fdfbf6' : '#0d0a12';
    ctx.lineWidth = Math.max(4, w * 0.012);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
    ctx.restore();
  }
}

/** Render the cover at full export size and return the canvas. */
export function exportCoverCanvas(state, photos, sizeId) {
  const size = sizeById(sizeId);
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  renderCover(ctx, state, photos, size.w, size.h);
  return canvas;
}
