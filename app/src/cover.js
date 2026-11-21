// cover.js — the poster engine for Vice Cast Cover Studio.
// Draws the dense edge-to-edge multi-panel poster onto any canvas: panels fill
// ~85% of the height, the striped-chrome title overlaps the panels mid-poster,
// and all furniture (quote, seal, billing, barcode, release line) sits in two
// compact strips. Pure 2D canvas, no network, no libraries.

export const SIZES = {
  '1:1': { w: 1080, h: 1080, label: '1:1 · 1080×1080' },
  '4:5': { w: 1080, h: 1350, label: '4:5 · 1080×1350' },
  '16:9': { w: 1920, h: 1080, label: '16:9 · 1920×1080' },
};

export const LAYOUTS = {
  hero: { name: 'Hero Mosaic', panels: 7 },
  six: { name: 'Six Grid', panels: 6 },
  diagonal: { name: 'Diagonal Strips', panels: 7 },
  seven: { name: 'Seven Mosaic', panels: 7 },
};

// Panel rectangles as fractions of the panel area [x, y, w, h].
export function layoutRects(layout) {
  const g = 0.008; // gap, as a fraction of panel-area width
  if (layout === 'six') {
    const w = (1 - 2 * g) / 3, h = (1 - g) / 2;
    const rects = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++)
      rects.push([c * (w + g), r * (h + g), w, h]);
    return rects;
  }
  if (layout === 'seven') {
    const tw = (1 - 3 * g) / 4, th = 0.52;
    const bw = (1 - 2 * g) / 3, bh = 1 - th - g;
    const rects = [];
    for (let c = 0; c < 4; c++) rects.push([c * (tw + g), 0, tw, th]);
    for (let c = 0; c < 3; c++) rects.push([c * (bw + g), th + g, bw, bh]);
    return rects;
  }
  // hero + diagonal share the grid: tall hero on the left, 3x2 small on the right.
  const hw = 0.395, sw = (1 - hw - 3 * g) / 3, sh = (1 - g) / 2;
  const rects = [[0, 0, hw, 1]];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++)
    rects.push([hw + g + c * (sw + g), r * (sh + g), sw, sh]);
  return rects;
}

export const GRADES = {
  sunset: {
    name: 'Sunset Gold',
    filter: 'saturate(1.55) contrast(1.2) brightness(1.05) sepia(0.28) hue-rotate(-10deg)',
    overlay: ['rgba(255,110,40,0.20)', 'rgba(255,0,120,0.10)', 'rgba(40,0,80,0.18)'],
    mode: 'overlay',
  },
  neon: {
    name: 'Neon Night',
    filter: 'saturate(1.7) contrast(1.28) brightness(0.96) hue-rotate(18deg)',
    overlay: ['rgba(255,0,150,0.22)', 'rgba(0,220,255,0.14)', 'rgba(10,0,50,0.22)'],
    mode: 'overlay',
  },
  teal: {
    name: 'Tropic Teal',
    filter: 'saturate(1.5) contrast(1.16) brightness(1.03) hue-rotate(24deg) sepia(0.12)',
    overlay: ['rgba(0,200,190,0.20)', 'rgba(255,180,60,0.10)', 'rgba(0,30,40,0.16)'],
    mode: 'soft-light',
  },
  golden: {
    name: 'Golden Hour',
    filter: 'saturate(1.45) contrast(1.14) brightness(1.08) sepia(0.38) hue-rotate(-14deg)',
    overlay: ['rgba(255,190,60,0.24)', 'rgba(255,120,20,0.10)', 'rgba(60,20,0,0.14)'],
    mode: 'overlay',
  },
  heat: {
    name: 'Heat Haze',
    filter: 'saturate(1.65) contrast(1.3) brightness(1.0) sepia(0.2) hue-rotate(-24deg)',
    overlay: ['rgba(255,60,0,0.26)', 'rgba(255,0,80,0.12)', 'rgba(50,0,0,0.18)'],
    mode: 'overlay',
  },
  dusk: {
    name: 'Ultraviolet',
    filter: 'saturate(1.4) contrast(1.22) brightness(0.94) hue-rotate(52deg) sepia(0.15)',
    overlay: ['rgba(140,0,255,0.24)', 'rgba(255,0,140,0.12)', 'rgba(10,0,40,0.20)'],
    mode: 'overlay',
  },
};

// Striped-chrome title styles: gradient stops + stripe colour + glow.
export const TITLE_STYLES = {
  sunset: { name: 'Sunset Chrome', stops: [[0, '#fff7d6'], [0.35, '#ffd23e'], [0.55, '#ff7a3d'], [0.75, '#ff2e88'], [1, '#b537f2']], stripe: 'rgba(120,0,60,0.55)', glow: '#ff2e88' },
  gold: { name: 'Gold Rush', stops: [[0, '#fffbe8'], [0.3, '#ffe066'], [0.55, '#ffb300'], [0.8, '#ff7b00'], [1, '#c2410c']], stripe: 'rgba(120,50,0,0.5)', glow: '#ffb300' },
  ice: { name: 'Ice Neon', stops: [[0, '#ffffff'], [0.3, '#b8f1ff'], [0.55, '#38c8ff'], [0.8, '#2563eb'], [1, '#7c3aed']], stripe: 'rgba(0,40,120,0.5)', glow: '#38c8ff' },
  tube: { name: 'Neon Tube', stops: [[0, '#ffe4f1'], [0.3, '#ff9ecf'], [0.55, '#ff4da6'], [0.8, '#e0218a'], [1, '#8b00ff']], stripe: 'rgba(90,0,70,0.55)', glow: '#ff4da6' },
  blade: { name: 'Blade Silver', stops: [[0, '#ffffff'], [0.3, '#e5e7eb'], [0.55, '#9ca3af'], [0.8, '#ef4444'], [1, '#7f1d1d']], stripe: 'rgba(30,30,30,0.5)', glow: '#e5e7eb' },
  vice: { name: 'Vice Fade', stops: [[0, '#fef9c3'], [0.3, '#f472b6'], [0.55, '#c026d3'], [0.8, '#22d3ee'], [1, '#0e7490']], stripe: 'rgba(40,0,80,0.55)', glow: '#f472b6' },
};

export const SCRIPT_FONTS = {
  pacifico: { name: 'Pacifico', family: "'Pacifico', cursive" },
  yellowtail: { name: 'Yellowtail', family: "'Yellowtail', cursive" },
};

export const DEFAULT_TAGS = [
  { role: 'THE DRIVER', sub: 'OCEAN DRIVE • 6:42 PM' },
  { role: 'THE BOSS', sub: 'MARINA CLUB • 7:05 PM' },
  { role: 'THE MECHANIC', sub: 'GARAGE 12 • 8:40 PM' },
  { role: 'THE FIXER', sub: 'ROOFTOP BAR • 7:30 PM' },
  { role: 'THE RIDER', sub: 'BOARDWALK • 5:55 PM' },
  { role: 'THE LOOKOUT', sub: 'PIER 9 • 6:15 PM' },
  { role: 'THE CAPTAIN', sub: 'SEAPLANE • 8:16 PM' }, // short sub: the gold seal sits just right of this tag in hero/diagonal layouts, and the longer 'SEAPLANE DOCK' text ran under it
  { role: 'THE WILDCARD', sub: 'LOT C • 9:10 PM' },
];

export const SCENE_TAGS = [
  { role: 'THE GETAWAY', sub: 'OCEAN DRIVE • 6:42 PM' },
  { role: 'THE ESCAPE', sub: 'BISCAYNE BAY • 7:48 PM' },
];

export function defaultState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    title: 'GOLDEN GETAWAY',
    titleStyle: 'sunset',
    script: 'One last summer job',
    scriptFont: 'pacifico',
    tagline: 'SEVEN SINNERS • ONE COAST • ZERO REGRETS',
    quote: 'THE HOTTEST RIDE OF THE YEAR',
    quoteSource: 'GOLDEN MILE GAZETTE',
    billing: 'A VICE CAST PICTURE  •  STARRING YOU AND YOUR CREW  •  SHOT ON YOUR OWN CAMERA  •  GRADED BY HAND  •  NO PHOTO EVER LEAVES YOUR DEVICE',
    seal: 'BEST CAST',
    sealRing: 'GOLDEN MILE FILM FESTIVAL',
    release: 'COMING SOON',
    edition: 'VOL. 1',
    size: '16:9',
    look: { paint: 0.65, gradeAmt: 1, halftone: 0.35, grain: 0.3, glow: 0.8, titleSize: 1, titleLift: 0 },
    tags: DEFAULT_TAGS.map((t) => ({ ...t })),
    sceneTags: SCENE_TAGS.map((t) => ({ ...t })),
  };
}

// ---- face-aware crop -------------------------------------------------------
// panel: { photo, zoom, panX, panY, flip } — photo: { img, face, isScene }.
// face: { x, y, w, h } in image fractions, or null.
// Returns the source rectangle to draw, so the face fills ~55% of the panel.
export function faceCropRect(photo, panel, pw, ph) {
  const img = photo.img;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const panelAspect = pw / ph;
  let fx = photo.focus?.x ?? 0.5, fy = photo.focus?.y ?? (photo.isScene ? 0.5 : 0.34);
  let zoom = photo.zoomHint ?? (photo.isScene ? 1.05 : 1.5);
  if (photo.face) {
    fx = photo.face.x + photo.face.w / 2;
    fy = photo.face.y + photo.face.h / 2;
    // Face height should be ~58% of panel height once cover-fitted.
    const coverScale = Math.max(pw / iw, ph / ih);
    const facePx = photo.face.h * ih * coverScale;
    zoom = Math.max(1.05, (ph * 0.58) / Math.max(facePx, 1));
    zoom = Math.min(zoom, 3.2);
  }
  zoom *= panel.zoom || 1;
  // Narrow panels (portrait posters) cannot show a face at full zoom without
  // slicing it: cap the base zoom by the panel's aspect ratio.
  const zCap = Math.max(1, Math.min(1.5, panelAspect * 2.1));
  zoom = Math.min(zoom, zCap * (panel.zoom || 1));
  // Base cover rect, then shrink around the focus point by zoom.
  let sw, sh;
  if (iw / ih > panelAspect) { sh = ih; sw = ih * panelAspect; }
  else { sw = iw; sh = iw / panelAspect; }
  sw /= zoom; sh /= zoom;
  const cx = fx * iw + (panel.panX || 0) * sw;
  const cy = fy * ih + (panel.panY || 0) * sh;
  let sx = cx - sw / 2, sy = cy - sh / 2;
  sx = Math.max(0, Math.min(iw - sw, sx));
  sy = Math.max(0, Math.min(ih - sh, sy));
  if (sw > iw) { sx = 0; sw = iw; }
  if (sh > ih) { sy = 0; sh = ih; }
  // Never cut a detected face in half: expand the crop to contain the whole
  // face box (with margin), keeping the panel's aspect ratio.
  if (photo.face) {
    const m = 0.18;
    const fx0 = Math.max(0, (photo.face.x - photo.face.w * m) * iw);
    const fy0 = Math.max(0, (photo.face.y - photo.face.h * m) * ih);
    const fx1 = Math.min(iw, (photo.face.x + photo.face.w * (1 + m)) * iw);
    const fy1 = Math.min(ih, (photo.face.y + photo.face.h * (1 + m)) * ih);
    let ux0 = Math.min(sx, fx0), uy0 = Math.min(sy, fy0);
    let ux1 = Math.max(sx + sw, fx1), uy1 = Math.max(sy + sh, fy1);
    let uw = ux1 - ux0, uh = uy1 - uy0;
    const needW = uh * panelAspect;
    if (needW > uw) { const d = (needW - uw) / 2; ux0 -= d; ux1 += d; uw = needW; }
    else { const needH = uw / panelAspect; const d = (needH - uh) / 2; uy0 -= d; uy1 += d; uh = needH; }
    if (ux0 < 0) { ux1 -= ux0; ux0 = 0; }
    if (uy0 < 0) { uy1 -= uy0; uy0 = 0; }
    if (ux1 > iw) { ux0 -= ux1 - iw; ux1 = iw; }
    if (uy1 > ih) { uy0 -= uy1 - ih; uy1 = ih; }
    ux0 = Math.max(0, ux0); uy0 = Math.max(0, uy0);
    sx = ux0; sy = uy0;
    sw = Math.min(iw - ux0, ux1 - ux0);
    sh = Math.min(ih - uy0, uy1 - uy0);
  }
  return { sx, sy, sw, sh };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function fitFont(ctx, text, maxWidth, startPx, family, weight = '') {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 8 && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function splitTitle(title) {
  const words = title.trim().split(/\s+/);
  if (words.length < 2) return [title.trim()];
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const diff = Math.abs(a.length - b.length);
    if (!best || diff < best.diff) best = { lines: [a, b], diff };
  }
  return best.lines;
}

// ---- the poster ------------------------------------------------------------
export function renderPoster(canvas, state, panels, sizeKey) {
  const size = SIZES[sizeKey || state.size] || SIZES['16:9'];
  const W = size.w, H = size.h;
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  const ctx = canvas.getContext('2d');
  const u = W / 1920; // unit scale: all sizes authored at 1920 wide
  const look = state.look || {};
  const grade = GRADES[state.grade] || GRADES.sunset;
  const gradeAmt = look.gradeAmt ?? 1;

  // Background: deep violet dusk gradient.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#160a2b');
  bg.addColorStop(0.5, '#241040');
  bg.addColorStop(1, '#12081f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const margin = Math.round(W * 0.012);
  const topH = H * 0.052;
  const panelTop = H * 0.062;
  const panelBottom = H * 0.878;
  const panelLeft = margin, panelRight = W - margin;
  const panelW = panelRight - panelLeft, panelH = panelBottom - panelTop;

  // ---- top strip: review quote + edition tag ----
  const starY = topH * 0.62;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd23e';
  ctx.font = `${Math.round(26 * u + 8)}px sans-serif`;
  ctx.fillText('★★★★★', margin + 4 * u, starY);
  const starsW = ctx.measureText('★★★★★').width;
  ctx.fillStyle = '#ffffff';
  const qSize = fitFont(ctx, `“${state.quote}”`, W * 0.62, Math.round(30 * u + 8), "'Anton', sans-serif");
  ctx.font = `${qSize}px 'Anton', sans-serif`;
  ctx.fillText(`“${state.quote}”`, margin + starsW + 18 * u, starY);
  const qW = ctx.measureText(`“${state.quote}”`).width;
  ctx.fillStyle = '#ffb300';
  ctx.font = `${Math.round(17 * u + 6)}px 'Anton', sans-serif`;
  ctx.fillText(`— ${state.quoteSource}`, margin + starsW + qW + 30 * u, starY + 2 * u);
  // Edition tag, top right.
  ctx.font = `${Math.round(22 * u + 7)}px 'Anton', sans-serif`;
  const edW = ctx.measureText(state.edition).width + 34 * u;
  const edH = topH * 0.72;
  ctx.fillStyle = '#ffd23e';
  roundRectPath(ctx, W - margin - edW, (topH - edH) / 2, edW, edH, 4 * u);
  ctx.fill();
  ctx.fillStyle = '#160a2b';
  ctx.textAlign = 'center';
  ctx.fillText(state.edition, W - margin - edW / 2, topH / 2 + 1 * u);
  ctx.textAlign = 'left';

  // ---- panels ----
  const rects = layoutRects(state.layout);
  const diagonal = state.layout === 'diagonal';
  const slant = panelW * 0.022;
  const frame = Math.max(2, Math.round(3 * u));

  rects.forEach((r, i) => {
    const px = panelLeft + r[0] * panelW;
    const py = panelTop + r[1] * panelH;
    const pw = r[2] * panelW, ph = r[3] * panelH;
    const panel = panels[i];
    const s = diagonal ? (i % 2 === 0 ? slant : -slant) : 0;
    ctx.save();
    ctx.beginPath();
    if (diagonal) {
      ctx.moveTo(px + s, py);
      ctx.lineTo(px + pw + s, py);
      ctx.lineTo(px + pw - s, py + ph);
      ctx.lineTo(px - s, py + ph);
    } else {
      ctx.rect(px, py, pw, ph);
    }
    ctx.closePath();
    ctx.clip();
    if (panel && panel.photo && panel.photo.img) {
      const src = faceCropRect(panel.photo, panel, pw, ph);
      ctx.filter = grade.filter;
      if (panel.flip) {
        ctx.translate(px + pw / 2, 0);
        ctx.scale(-1, 1);
        ctx.translate(-(px + pw / 2), 0);
      }
      ctx.drawImage(panel.photo.img, src.sx, src.sy, src.sw, src.sh, px, py, pw, ph);
      ctx.filter = 'none';
      // Grade overlay wash.
      if (gradeAmt > 0.01) {
        const og = ctx.createLinearGradient(px, py, px, py + ph);
        og.addColorStop(0, grade.overlay[0]);
        og.addColorStop(0.55, grade.overlay[1]);
        og.addColorStop(1, grade.overlay[2]);
        ctx.globalCompositeOperation = grade.mode;
        ctx.globalAlpha = Math.min(1, gradeAmt);
        ctx.fillStyle = og;
        ctx.fillRect(px, py, pw, ph);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
      // Painted look: warm screen light + darkened edges.
      const paint = look.paint ?? 0.65;
      if (paint > 0.01) {
        const pg = ctx.createRadialGradient(px + pw * 0.5, py + ph * 0.32, ph * 0.1, px + pw * 0.5, py + ph * 0.5, ph * 0.95);
        pg.addColorStop(0, `rgba(255,190,90,${0.10 * paint})`);
        pg.addColorStop(0.7, 'rgba(0,0,0,0)');
        pg.addColorStop(1, `rgba(20,0,40,${0.34 * paint})`);
        ctx.fillStyle = pg;
        ctx.fillRect(px, py, pw, ph);
      }
      // Halftone dots.
      const ht = look.halftone ?? 0.35;
      if (ht > 0.02) {
        ctx.fillStyle = `rgba(20,0,30,${0.16 * ht})`;
        const step = Math.max(5, Math.round(11 * u));
        for (let yy = py + step / 2; yy < py + ph; yy += step) {
          for (let xx = px + step / 2; xx < px + pw; xx += step) {
            ctx.beginPath();
            ctx.arc(xx, yy, Math.max(0.7, step * 0.16), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      // Bottom shade so the role tag always reads.
      const shade = ctx.createLinearGradient(0, py + ph * 0.62, 0, py + ph);
      shade.addColorStop(0, 'rgba(0,0,0,0)');
      shade.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = shade;
      ctx.fillRect(px, py + ph * 0.62, pw, ph * 0.38);
    } else {
      ctx.fillStyle = '#2c1548';
      ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = `${Math.round(20 * u + 8)}px 'Anton', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ADD PHOTO', px + pw / 2, py + ph / 2);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    // Frame.
    ctx.save();
    ctx.strokeStyle = 'rgba(255,240,200,0.9)';
    ctx.lineWidth = frame;
    ctx.beginPath();
    if (diagonal) {
      ctx.moveTo(px + s, py);
      ctx.lineTo(px + pw + s, py);
      ctx.lineTo(px + pw - s, py + ph);
      ctx.lineTo(px - s, py + ph);
    } else {
      ctx.rect(px, py, pw, ph);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Role tag with location + time sublabel.
    const tag = panel && panel.photo && panel.photo.isScene
      ? (state.sceneTags || SCENE_TAGS)[(panel.photo.sceneIndex || 0) % 2]
      : (state.tags || DEFAULT_TAGS)[i % (state.tags || DEFAULT_TAGS).length];
    if (tag && panel && panel.photo) {
      let rolePx = Math.max(11, Math.round(Math.min(pw, ph) * 0.085));
      let subPx = Math.max(8, Math.round(rolePx * 0.58));
      const measureTag = () => {
        ctx.font = `${rolePx}px 'Anton', sans-serif`;
        const rw = ctx.measureText(tag.role).width;
        ctx.font = `${subPx}px sans-serif`;
        const sw = ctx.measureText(tag.sub).width;
        return Math.max(rw, sw) + 26 * u + 10;
      };
      let tagW = measureTag();
      while (tagW > pw * 0.8 && subPx > 8) {
        rolePx -= 1; subPx = Math.max(8, Math.round(rolePx * 0.58));
        tagW = measureTag();
      }
      const tagH = rolePx + subPx + 16 * u;
      const tx = px + Math.max(8 * u, pw * 0.03);
      const ty = py + ph - tagH - Math.max(8 * u, ph * 0.03);
      ctx.fillStyle = 'rgba(8,2,18,0.88)';
      roundRectPath(ctx, tx, ty, tagW, tagH, 3 * u);
      ctx.fill();
      ctx.fillStyle = '#ffd23e';
      ctx.fillRect(tx, ty, 6 * u, tagH);
      ctx.fillStyle = '#ffffff';
      ctx.font = `${rolePx}px 'Anton', sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(tag.role, tx + 14 * u, ty + 5 * u);
      ctx.fillStyle = '#ffcf5c';
      ctx.font = `${subPx}px sans-serif`;
      ctx.fillText(tag.sub, tx + 14 * u, ty + 6 * u + rolePx);
      ctx.textBaseline = 'middle';
    }
  });

  // ---- the big striped-chrome title, OVERLAPPING the panels ----
  const style = TITLE_STYLES[state.titleStyle] || TITLE_STYLES.sunset;
  const titleTargetW = W * 0.92 * (look.titleSize ?? 1);
  const titleLift = (look.titleLift ?? 0) * H * 0.06;
  const compactBlock = state.layout === 'seven' || state.layout === 'six';
  const portrait = H > W * 1.1;
  const titleCenterY = H * (portrait ? 0.60 : compactBlock ? 0.585 : 0.575) - titleLift;
  const glowAmt = look.glow ?? 0.8;

  let lines = [state.title.toUpperCase()];
  let titlePx = Math.round(H * 0.19);
  ctx.font = `${titlePx}px 'Anton', sans-serif`;
  if (ctx.measureText(lines[0]).width > titleTargetW) {
    const two = splitTitle(state.title);
    const w0 = ctx.measureText(two[0]).width, w1 = ctx.measureText(two[1]).width;
    if (Math.max(w0, w1) < ctx.measureText(lines[0]).width * 0.62) {
      lines = two.map((l) => l.toUpperCase());
    }
  }
  const longest = lines.reduce((a, b) => (a.length >= b.length ? a : b), '');
  titlePx = fitFont(ctx, longest, titleTargetW, titlePx, "'Anton', sans-serif");
  // Portrait posters: a two-line title must stay short enough to clear both
  // rows of role tags.
  if (portrait && lines.length > 1) titlePx = Math.min(titlePx, Math.round(H * 0.115));
  const lineH = titlePx * 0.96;
  const titleTop = titleCenterY - (lines.length * lineH) / 2;

  // Pink glow bed behind the title so it lifts off the panels.
  if (glowAmt > 0.01) {
    const glow = ctx.createRadialGradient(W / 2, titleCenterY, 10, W / 2, titleCenterY, W * 0.5);
    glow.addColorStop(0, hexA(style.glow, 0.34 * glowAmt));
    glow.addColorStop(1, hexA(style.glow, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, titleTop - H * 0.05, W, lines.length * lineH + H * 0.1);
  }

  // Render the title on an offscreen canvas so stripes clip to the letters.
  const tc = document.createElement('canvas');
  tc.width = W; tc.height = Math.ceil(lines.length * lineH + titlePx * 0.6);
  const tctx = tc.getContext('2d');
  tctx.textAlign = 'center';
  tctx.textBaseline = 'middle';
  tctx.font = `${titlePx}px 'Anton', sans-serif`;
  const grad = tctx.createLinearGradient(0, 0, 0, tc.height);
  for (const [stop, color] of style.stops) grad.addColorStop(stop, color);
  lines.forEach((line, li) => {
    const y = titlePx * 0.3 + lineH * li + lineH / 2;
    // Dark outline + white halo, drawn as strokes under the fill.
    tctx.lineJoin = 'round';
    tctx.strokeStyle = '#160a2b';
    tctx.lineWidth = Math.max(4, titlePx * 0.16);
    tctx.strokeText(line, W / 2, y);
    tctx.strokeStyle = '#ffffff';
    tctx.lineWidth = Math.max(2, titlePx * 0.05);
    tctx.strokeText(line, W / 2, y);
    tctx.fillStyle = grad;
    tctx.fillText(line, W / 2, y);
  });
  // Horizontal chrome stripes clipped to the lettering.
  tctx.globalCompositeOperation = 'source-atop';
  const stripeH = Math.max(3, titlePx * 0.055);
  tctx.fillStyle = style.stripe;
  for (let y = stripeH; y < tc.height; y += stripeH * 2.4) {
    tctx.fillRect(0, y, W, stripeH);
  }
  // Top shine.
  const shine = tctx.createLinearGradient(0, 0, 0, tc.height * 0.5);
  shine.addColorStop(0, 'rgba(255,255,255,0.5)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  tctx.fillStyle = shine;
  tctx.fillRect(0, 0, W, tc.height * 0.5);
  tctx.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.shadowColor = style.glow;
  ctx.shadowBlur = Math.round(36 * u * glowAmt + 6);
  ctx.drawImage(tc, 0, titleTop - titlePx * 0.3);
  ctx.restore();

  // ---- script subtitle, tilted, overlapping the title's lower edge ----
  const scriptFont = SCRIPT_FONTS[state.scriptFont] || SCRIPT_FONTS.pacifico;
  const scriptY = titleTop + lines.length * lineH + titlePx * (compactBlock ? 0.06 : 0.10);
  const scriptPx = fitFont(ctx, state.script, W * 0.62, Math.round(titlePx * 0.52), scriptFont.family);
  ctx.save();
  ctx.translate(W / 2, scriptY);
  ctx.rotate(-0.045);
  ctx.font = `${scriptPx}px ${scriptFont.family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#3d0a2e';
  ctx.lineWidth = Math.max(3, scriptPx * 0.14);
  ctx.strokeText(state.script, 0, 0);
  ctx.fillStyle = '#ff8fd0';
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = Math.round(18 * u * glowAmt + 4);
  ctx.fillText(state.script, 0, 0);
  ctx.restore();

  // ---- tagline ribbon ----
  if (state.tagline && state.tagline.trim()) {
    const tagPx = fitFont(ctx, state.tagline, W * 0.8, Math.round(26 * u + 9), "'Anton', sans-serif");
    ctx.font = `${tagPx}px 'Anton', sans-serif`;
    const tagW = ctx.measureText(state.tagline).width + 56 * u;
    const tagH = tagPx * 1.7;
    const tagY = scriptY + scriptPx * (compactBlock ? 0.45 : 0.62);
    ctx.fillStyle = '#160a2b';
    roundRectPath(ctx, (W - tagW) / 2, tagY, tagW, tagH, 4 * u);
    ctx.fill();
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = Math.max(1.5, 2 * u);
    roundRectPath(ctx, (W - tagW) / 2, tagY, tagW, tagH, 4 * u);
    ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.tagline, W / 2, tagY + tagH / 2 + 1 * u);
    ctx.textAlign = 'left';
  }

  // ---- gold seal, overlapping the panel area's lower right ----
  const sealR = Math.min(W, H) * 0.058;
  const sealX = W - margin - sealR * 0.8;
  const sealY = panelBottom - sealR * 0.45;
  ctx.save();
  ctx.translate(sealX, sealY);
  ctx.fillStyle = '#d4a017';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * sealR * 0.98, Math.sin(a) * sealR * 0.98, sealR * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  const sg = ctx.createRadialGradient(-sealR * 0.3, -sealR * 0.3, sealR * 0.1, 0, 0, sealR);
  sg.addColorStop(0, '#fff3b0');
  sg.addColorStop(0.55, '#ffd23e');
  sg.addColorStop(1, '#c9920e');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(0, 0, sealR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a5a00';
  ctx.lineWidth = Math.max(1.5, 2.5 * u);
  ctx.beginPath();
  ctx.arc(0, 0, sealR * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#3a2a00';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(sealR * 0.34)}px 'Anton', sans-serif`;
  const sealLines = wrapLines(ctx, state.seal, sealR * 1.35);
  sealLines.forEach((ln, i) => ctx.fillText(ln, 0, (i - (sealLines.length - 1) / 2) * sealR * 0.34 - sealR * 0.08));
  ctx.font = `${Math.round(sealR * 0.16)}px sans-serif`;
  ctx.fillText('★ ★ ★', 0, sealR * 0.52);
  ctx.restore();

  // ---- bottom strip: release line, billing block, barcode ----
  const botTop = H * 0.888;
  const botH = H - botTop - H * 0.012;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(margin, botTop, W - 2 * margin, botH);
  ctx.fillStyle = '#ff8fa3';
  ctx.font = `${Math.round(30 * u + 8)}px 'Anton', sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(state.release, margin + 10 * u, botTop + botH / 2);
  const relW = ctx.measureText(state.release).width;

  // Barcode, bottom right.
  const barW = Math.max(90 * u, W * 0.075), barH = botH * 0.82;
  const barX = W - margin - barW - 6 * u, barY = botTop + (botH - barH) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(barX, barY, barW, barH);
  let seed = 0;
  for (const ch of state.title) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  let bx = barX + 6 * u;
  ctx.fillStyle = '#111111';
  while (bx < barX + barW - 6 * u) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const bw = (1 + (seed % 3)) * Math.max(1, 1.6 * u);
    if (seed % 5 !== 0) ctx.fillRect(bx, barY + 4 * u, bw, barH * 0.62);
    bx += bw + Math.max(1, 1.8 * u);
  }
  ctx.fillStyle = '#111111';
  ctx.font = `${Math.max(8, Math.round(13 * u + 4))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`0 ${10000 + (seed % 89999)} ${10000 + ((seed >> 7) % 89999)}`, barX + barW / 2, barY + barH * 0.86);
  ctx.textAlign = 'left';

  // Billing block, centred between release line and barcode.
  const billLeft = margin + relW + 40 * u;
  const billRight = barX - 24 * u;
  const billW = Math.max(100, billRight - billLeft);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const billPx = Math.max(9, Math.round(15 * u + 5));
  ctx.font = `${billPx}px sans-serif`;
  const billLines = wrapLines(ctx, state.billing, billW).slice(0, 2);
  ctx.textAlign = 'center';
  billLines.forEach((ln, i) => {
    ctx.fillText(ln, billLeft + billW / 2, botTop + botH / 2 + (i - (billLines.length - 1) / 2) * (billPx + 6 * u));
  });
  ctx.textAlign = 'left';

  // ---- film grain over the whole poster ----
  const grain = look.grain ?? 0.3;
  if (grain > 0.02) {
    const n = Math.round(W * H * 0.00012 * grain);
    ctx.fillStyle = `rgba(255,255,255,${0.05 * grain})`;
    for (let i = 0; i < n; i++) {
      ctx.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4);
    }
    ctx.fillStyle = `rgba(0,0,0,${0.06 * grain})`;
    for (let i = 0; i < n; i++) {
      ctx.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4);
    }
  }
  return { W, H };
}

function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// Export one PNG at the named size; resolves with the Blob.
export function exportPosterPNG(state, panels, sizeKey) {
  const canvas = document.createElement('canvas');
  renderPoster(canvas, state, panels, sizeKey);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
