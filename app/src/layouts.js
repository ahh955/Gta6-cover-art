// Poster layouts for Neon Palm Cover Studio. Each layout turns a canvas size into
// photo cells plus a title zone. Geometry is expressed in fractions of the canvas
// so every layout adapts to landscape, portrait and square covers. The title zone
// is where cover.js stacks the subtitle, the title and the star meter; it never
// overlaps the badge, which lives in a corner of its own.

export const LAYOUTS = {
  hero: { name: 'Hero + Three', panels: 4 },
  four: { name: 'Four Corners', panels: 4 },
  full: { name: 'Full Bleed', panels: 1 },
  nine: { name: 'Nine Panel', panels: 8 },
  tilted: { name: 'Tilted Snapshots', panels: 4 },
  film: { name: 'Film Strip', panels: 4 },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);

/** Photo cells + title zone for `layout` on a W x H canvas. */
export function layoutCells(layout, W, H) {
  const g = Math.max(6, Math.round(Math.min(W, H) * 0.012));
  switch (layout) {
    case 'hero': {
      const heroH = Math.round(H * 0.64);
      const rowY = heroH + g;
      const rowH = H - rowY;
      const cellW = Math.round((W - 2 * g) / 3);
      return {
        panels: [
          { x: 0, y: 0, w: W, h: heroH },
          { x: 0, y: rowY, w: cellW, h: rowH },
          { x: cellW + g, y: rowY, w: cellW, h: rowH },
          { x: 2 * (cellW + g), y: rowY, w: W - 2 * (cellW + g), h: rowH },
        ],
        titleZone: { x: W * 0.045, y: H * 0.46, w: W * 0.91, h: H * 0.19, align: 'left' },
        background: 'panels',
      };
    }
    case 'four': {
      const cw = Math.round((W - g) / 2);
      const ch = Math.round((H - g) / 2);
      return {
        panels: [
          { x: 0, y: 0, w: cw, h: ch },
          { x: cw + g, y: 0, w: W - cw - g, h: ch },
          { x: 0, y: ch + g, w: cw, h: H - ch - g },
          { x: cw + g, y: ch + g, w: W - cw - g, h: H - ch - g },
        ],
        titleZone: { x: W * 0.10, y: H * 0.40, w: W * 0.80, h: H * 0.20, align: 'center' },
        background: 'panels',
      };
    }
    case 'full': {
      return {
        panels: [{ x: 0, y: 0, w: W, h: H }],
        titleZone: { x: W * 0.05, y: H * 0.66, w: W * 0.90, h: H * 0.30, align: 'left' },
        background: 'panels',
      };
    }
    case 'nine': {
      const cw = Math.round((W - 2 * g) / 3);
      const ch = Math.round((H - 2 * g) / 3);
      const panels = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (row === 1 && col === 1) continue; // centre cell is the title block
          const x = col * (cw + g);
          const y = row * (ch + g);
          panels.push({
            x, y,
            w: col === 2 ? W - x : cw,
            h: row === 2 ? H - y : ch,
          });
        }
      }
      const pad = Math.round(Math.min(cw, ch) * 0.09);
      return {
        panels,
        titleZone: {
          x: cw + g + pad, y: ch + g + pad,
          w: cw - 2 * pad, h: ch - 2 * pad, align: 'center',
        },
        titleCell: { x: cw + g, y: ch + g, w: cw, h: ch },
        background: 'panels',
      };
    }
    case 'tilted': {
      // Polaroid cards in a 2x2 scatter below the title zone, with room for their
      // rotation so no card touches the title or the canvas edge.
      const top = Math.round(H * 0.215);
      const bottom = Math.round(H * 0.965);
      const left = Math.round(W * 0.05);
      const right = Math.round(W * 0.95);
      const cw = Math.round((right - left - g) / 2);
      const ch = Math.round((bottom - top - g) / 2);
      const rots = [-6, 5, -4, 6];
      const panels = [
        { x: left, y: top, w: cw, h: ch, rot: rots[0] },
        { x: left + cw + g, y: top, w: right - left - cw - g, h: ch, rot: rots[1] },
        { x: left, y: top + ch + g, w: cw, h: bottom - top - ch - g, rot: rots[2] },
        { x: left + cw + g, y: top + ch + g, w: right - left - cw - g, h: bottom - top - ch - g, rot: rots[3] },
      ];
      return {
        panels,
        titleZone: { x: W * 0.06, y: H * 0.025, w: W * 0.88, h: H * 0.16, align: 'center' },
        background: 'solid',
        cards: true,
      };
    }
    case 'film': {
      // Landscape and square: one horizontal strip of four frames. Portrait and
      // story: a 2x2 grid of tall frames, so no frame is ever a letterbox slit.
      if (W >= H) {
        const stripY = Math.round(H * 0.235);
        const stripH = Math.round(H * 0.64);
        const sprocket = Math.round(stripH * 0.11);
        const frameW = Math.round((W * 0.92 - 3 * g) / 4);
        const frameH = stripH - 2 * sprocket;
        const x0 = Math.round(W * 0.04);
        const panels = [0, 1, 2, 3].map((i) => ({
          x: x0 + i * (frameW + g),
          y: stripY + sprocket,
          w: i === 3 ? x0 + W * 0.92 - (x0 + 3 * (frameW + g)) : frameW,
          h: frameH,
        }));
        return {
          panels,
          titleZone: { x: W * 0.06, y: H * 0.03, w: W * 0.88, h: H * 0.15, align: 'center' },
          background: 'solid',
          strip: { x: x0, y: stripY, w: Math.round(W * 0.92), h: stripH, sprockets: 'row', sprocket },
        };
      }
      const top = Math.round(H * 0.22);
      const bottom = Math.round(H * 0.96);
      const left = Math.round(W * 0.10);
      const right = Math.round(W * 0.90);
      const cw = Math.round((right - left - g) / 2);
      const ch = Math.round((bottom - top - g) / 2);
      return {
        panels: [
          { x: left, y: top, w: cw, h: ch },
          { x: left + cw + g, y: top, w: right - left - cw - g, h: ch },
          { x: left, y: top + ch + g, w: cw, h: bottom - top - ch - g },
          { x: left + cw + g, y: top + ch + g, w: right - left - cw - g, h: bottom - top - ch - g },
        ],
        titleZone: { x: W * 0.06, y: H * 0.03, w: W * 0.88, h: H * 0.15, align: 'center' },
        background: 'solid',
        strip: { x: Math.round(W * 0.06), y: top - Math.round(H * 0.015), w: Math.round(W * 0.88), h: bottom - top + Math.round(H * 0.03), sprockets: 'sides', sprocket: Math.round(W * 0.025) },
      };
    }
    default:
      return layoutCells('hero', W, H);
  }
}
