// Poster geometry for Neon Palm Cover Studio.
//
// Every layout is a function of the cover's aspect ratio that returns the
// panels (rectangles in 0..1 cover space, each with an optional rotation in
// degrees and a polaroid flag) plus where the title block goes. The renderer
// in cover.js draws whatever geometry comes back, so a layout never touches
// pixels itself.

export const LAYOUTS = [
  { id: 'hero', name: 'Hero + Three', panels: 4, blurb: 'One big moment, three supporting shots' },
  { id: 'corners', name: 'Four Corners', panels: 4, blurb: 'Four scenes around a centre title' },
  { id: 'bleed', name: 'Full Bleed', panels: 1, blurb: 'One photo edge to edge, title on top' },
  { id: 'nine', name: 'Nine Panel', panels: 8, blurb: 'A 3x3 grid with the title in the middle' },
  { id: 'tilted', name: 'Tilted Snapshots', panels: 4, blurb: 'Rotated polaroid cards on a sunset wall' },
  { id: 'strip', name: 'Film Strip', panels: 4, blurb: 'Four frames with sprocket holes' },
];

/** The gap between panels, as a fraction of the cover's short side. */
const GAP = 0.014;

/** A panel rectangle: x, y, w, h in 0..1, rot in degrees, polaroid for a white card border. */
function panel(x, y, w, h, rot = 0, polaroid = false) {
  return { x, y, w, h, rot, polaroid };
}

/** Hero + Three: a large panel and three small ones stacked beside it. */
function heroLayout(w, h) {
  const landscape = w >= h;
  const g = GAP;
  if (landscape) {
    const heroW = 0.62 - g;
    return {
      panels: [
        panel(g, g, heroW, 1 - 2 * g),
        panel(0.62 + g, g, 1 - 0.62 - 2 * g, (1 - 4 * g) / 3),
        panel(0.62 + g, g + (1 - 4 * g) / 3 + g, 1 - 0.62 - 2 * g, (1 - 4 * g) / 3),
        panel(0.62 + g, g + 2 * ((1 - 4 * g) / 3 + g), 1 - 0.62 - 2 * g, (1 - 4 * g) / 3),
      ],
      title: { x: 0.03, y: 0.78, w: 0.56, align: 'left', onPhoto: true },
    };
  }
  const heroH = 0.58 - g;
  return {
    panels: [
      panel(g, g, 1 - 2 * g, heroH),
      panel(g, 0.58 + g, (1 - 4 * g) / 3, 1 - 0.58 - 2 * g),
      panel(g + (1 - 4 * g) / 3 + g, 0.58 + g, (1 - 4 * g) / 3, 1 - 0.58 - 2 * g),
      panel(g + 2 * ((1 - 4 * g) / 3 + g), 0.58 + g, (1 - 4 * g) / 3, 1 - 0.58 - 2 * g),
    ],
    title: { x: 0.04, y: 0.40, w: 0.92, align: 'left', onPhoto: true },
  };
}

/** Four Corners: quadrants with a diamond title block in the centre. */
function cornersLayout() {
  const g = GAP;
  const half = (1 - 3 * g) / 2;
  return {
    panels: [
      panel(g, g, half, half),
      panel(1 - g - half, g, half, half),
      panel(g, 1 - g - half, half, half),
      panel(1 - g - half, 1 - g - half, half, half),
    ],
    title: { x: 0.30, y: 0.30, w: 0.40, h: 0.40, align: 'center', diamond: true, onPhoto: false },
  };
}

/** Full Bleed: a single photo, title low on the image. */
function bleedLayout() {
  return {
    panels: [panel(0, 0, 1, 1)],
    title: { x: 0.05, y: 0.74, w: 0.9, align: 'left', onPhoto: true },
  };
}

/** Nine Panel: a 3x3 grid, the centre cell holds the title. */
function nineLayout() {
  const g = GAP;
  const cell = (1 - 4 * g) / 3;
  const panels = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (row === 1 && col === 1) continue;
      panels.push(panel(g + col * (cell + g), g + row * (cell + g), cell, cell));
    }
  }
  return {
    panels,
    title: { x: g + cell + g, y: g + cell + g, w: cell, h: cell, align: 'center', cell: true, onPhoto: false },
  };
}

/** Tilted Snapshots: four polaroid cards, each rotated a few degrees. */
function tiltedLayout(w, h) {
  const landscape = w >= h;
  if (landscape) {
    return {
      panels: [
        panel(0.03, 0.10, 0.30, 0.62, -6, true),
        panel(0.27, 0.22, 0.30, 0.62, 4, true),
        panel(0.51, 0.08, 0.30, 0.62, -3, true),
        panel(0.68, 0.24, 0.30, 0.62, 7, true),
      ],
      title: { x: 0.05, y: 0.86, w: 0.9, align: 'center', onPhoto: false },
    };
  }
  return {
    panels: [
      panel(0.06, 0.06, 0.42, 0.34, -5, true),
      panel(0.52, 0.10, 0.42, 0.34, 5, true),
      panel(0.06, 0.44, 0.42, 0.34, 4, true),
      panel(0.52, 0.48, 0.42, 0.34, -6, true),
    ],
    title: { x: 0.05, y: 0.86, w: 0.9, align: 'center', onPhoto: false },
  };
}

/** Film Strip: four frames in a row (or column) with sprocket holes. */
function stripLayout(w, h) {
  const landscape = w >= h;
  const g = GAP;
  if (landscape) {
    const fw = (1 - 5 * g) / 4;
    const panels = [0, 1, 2, 3].map((i) => panel(g + i * (fw + g), 0.16, fw, 0.56));
    return { panels, title: { x: 0.05, y: 0.74, w: 0.9, h: 0.13, align: 'left', onPhoto: false, bottom: 0.88 }, strip: 'horizontal' };
  }
  const fh = (0.80 - 5 * g) / 4;
  const panels = [0, 1, 2, 3].map((i) => panel(0.16, g + i * (fh + g), 0.68, fh));
  return { panels, title: { x: 0.05, y: 0.82, w: 0.9, h: 0.15, align: 'left', onPhoto: false, bottom: 0.985 }, strip: 'vertical' };
}

const BUILDERS = { hero: heroLayout, corners: cornersLayout, bleed: bleedLayout, nine: nineLayout, tilted: tiltedLayout, strip: stripLayout };

/** The geometry for a layout id at cover size w x h (pixels). Falls back to hero. */
export function layoutGeometry(layoutId, w, h) {
  const build = BUILDERS[layoutId] || BUILDERS.hero;
  return build(w, h);
}

/** How many photo panels a layout has. */
export function layoutPanelCount(layoutId) {
  const entry = LAYOUTS.find((l) => l.id === layoutId);
  return entry ? entry.panels : 4;
}
