// Screenshot scenes for Neon Palm Cover Studio.
//
// The entry's screenshots are taken by opening the app itself with a query
// string: ?shot=cover draws one exported cover full-frame (the app's own
// drawing, at the screenshot's size), ?shot=editor opens the editor with a
// preset state. Every parameter is optional; anything not named keeps the
// editor's default. Nothing here fetches or phones home.

import { LAYOUTS } from './layouts.js';
import { GRADES } from './grades.js';

/** The sample photos, in tray order. */
export const SAMPLES = [
  { file: 'woman-convertible.jpg', label: 'Convertible' },
  { file: 'man-rooftop.jpg', label: 'Rooftop' },
  { file: 'friends-neon.jpg', label: 'Neon Night' },
  { file: 'man-pier.jpg', label: 'Pier' },
  { file: 'boulevard.jpg', label: 'Boulevard' },
  { file: 'pier.jpg', label: 'Sunset Pier' },
];

/** Preset titles the shuffle button and the scenes draw from. */
export const PRESET_TITLES = [
  ['NEON SHORE', 'Vice City nights'],
  ['SUNSET HEIST', 'one last score'],
  ['BOULEVARD QUEEN', 'palm trees & pink skies'],
  ['PIER PRESSURE', 'salt air, gold hour'],
  ['NIGHT SHIFT', 'the city never sleeps'],
  ['CHROME DREAMS', 'riding into the sunset'],
];

/**
 * Read the scene out of the URL. Returns { mode, apply(state) }: mode is
 * 'cover' or 'editor', and apply writes the scene's choices into a state
 * object (layout, grade, title, subtitle, badge, stars, photos).
 */
export function readShotScene() {
  const q = new URLSearchParams(window.location.search);
  const mode = q.get('shot') === 'cover' ? 'cover' : 'editor';
  const layout = q.get('layout');
  const grade = q.get('grade');
  const title = q.get('title');
  const subtitle = q.get('subtitle');
  const badge = q.get('badge');
  const stars = q.get('stars');
  const frame = q.get('frame');
  const photo = q.get('photo');
  const photos = q.get('photos');
  const size = q.get('size');

  function apply(state) {
    if (layout && LAYOUTS.some((l) => l.id === layout)) state.layout = layout;
    if (grade && GRADES.some((g) => g.id === grade)) state.grade = grade;
    if (title) state.title = title;
    if (subtitle !== null) state.subtitle = subtitle;
    if (badge !== null) state.badge = badge;
    if (stars !== null) state.stars = Math.max(0, Math.min(5, parseInt(stars, 10) || 0));
    if (frame && ['white', 'black', 'none'].includes(frame)) state.frame = frame;
    if (size) state.size = size;
    // photos: comma-separated sample indexes, one per panel; photo: one
    // sample index (or file stem) placed in every panel.
    if (photos) {
      const picks = photos.split(',').map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n));
      picks.forEach((pick, i) => {
        if (state.panels[i]) state.panels[i].photo = pick % SAMPLES.length;
      });
    } else if (photo !== null) {
      const idx = /^\d+$/.test(photo)
        ? parseInt(photo, 10)
        : SAMPLES.findIndex((s) => s.file.startsWith(photo));
      const pick = idx >= 0 ? idx % SAMPLES.length : 0;
      state.panels.forEach((p) => { p.photo = pick; });
    }
    return state;
  }

  return { mode, apply };
}
