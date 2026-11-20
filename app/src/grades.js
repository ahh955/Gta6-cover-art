// Vice City colour grades for Neon Palm Cover Studio.
//
// A grade is three things applied in order: a CSS filter string the canvas
// uses while drawing each photo, a two-stop gradient wash drawn over the
// photo with a soft-light blend, and a light leak (a warm radial glow in one
// corner). Grades never touch the lettering, which keeps its own colours.

export const GRADES = [
  {
    id: 'sunset',
    name: 'Vice Sunset',
    filter: 'saturate(1.35) contrast(1.08) brightness(1.03) sepia(0.12)',
    wash: ['#ff5e3a', '#7b2ff7'],
    leak: { x: 0.85, y: 0.12, color: 'rgba(255, 170, 60, 0.55)' },
    sky: ['#2b1055', '#ff5e3a', '#ffc46b'],
  },
  {
    id: 'neon',
    name: 'Neon Nights',
    filter: 'saturate(1.55) contrast(1.14) brightness(0.96) hue-rotate(-12deg)',
    wash: ['#ff2d95', '#00e5ff'],
    leak: { x: 0.12, y: 0.15, color: 'rgba(255, 45, 149, 0.5)' },
    sky: ['#0b0620', '#3b0f66', '#ff2d95'],
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    filter: 'saturate(1.25) contrast(1.05) brightness(1.08) sepia(0.28)',
    wash: ['#ffb347', '#ff8c42'],
    leak: { x: 0.78, y: 0.2, color: 'rgba(255, 210, 120, 0.6)' },
    sky: ['#3d1c02', '#b45a1b', '#ffd97a'],
  },
  {
    id: 'mint',
    name: 'Miami Mint',
    filter: 'saturate(1.2) contrast(1.04) brightness(1.06) hue-rotate(18deg)',
    wash: ['#2affd5', '#2f9dff'],
    leak: { x: 0.15, y: 0.85, color: 'rgba(42, 255, 213, 0.45)' },
    sky: ['#02231f', '#0d5c52', '#7ef0d4'],
  },
  {
    id: 'noir',
    name: 'Cherry Noir',
    filter: 'saturate(0.72) contrast(1.22) brightness(0.92)',
    wash: ['#3a0a0a', '#ff2e4d'],
    leak: { x: 0.85, y: 0.85, color: 'rgba(255, 46, 77, 0.4)' },
    sky: ['#0a0a0c', '#1c0f16', '#5c1420'],
  },
  {
    id: 'chrome',
    name: 'Palm Chrome',
    filter: 'saturate(0.35) contrast(1.18) brightness(1.1)',
    wash: ['#cfe8ff', '#8a7bff'],
    leak: { x: 0.5, y: 0.05, color: 'rgba(220, 240, 255, 0.55)' },
    sky: ['#101418', '#2c3540', '#9fb6c9'],
  },
];

/** Look a grade up by id; unknown ids fall back to Vice Sunset. */
export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

/** The sunset gradient stops used for the title lettering of a grade. */
export function titleGradientStops(grade) {
  if (grade.id === 'neon') return ['#ffe259', '#ff2d95', '#7b2ff7'];
  if (grade.id === 'golden') return ['#fff3b0', '#ffb347', '#ff5e3a'];
  if (grade.id === 'mint') return ['#eafffb', '#2affd5', '#2f9dff'];
  if (grade.id === 'noir') return ['#ffd9de', '#ff2e4d', '#7a0e22'];
  if (grade.id === 'chrome') return ['#ffffff', '#cfe8ff', '#8a7bff'];
  return ['#fff6a3', '#ff9a3d', '#ff2d78'];
}

/** The neon glow colour for the Pacifico subtitle of a grade. */
export function subtitleGlow(grade) {
  if (grade.id === 'neon') return '#ff2d95';
  if (grade.id === 'mint') return '#2affd5';
  if (grade.id === 'noir') return '#ff2e4d';
  if (grade.id === 'chrome') return '#8ab8ff';
  return '#ff9a3d';
}
