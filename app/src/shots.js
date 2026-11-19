// Fixed scenes for screenshots: ?shot=cover shows the cover alone, full frame;
// ?shot=editor shows the editor with the scene applied. Every part of the scene
// comes from the query string, so each screenshot is reproducible from shots.json.
// window.__shotReady is set once the cover has been painted.

import { SAMPLES, sampleById } from './cover.js';

function parseBool(value, fallback) {
  if (value === null || value === undefined) return fallback;
  return value === '1' || value === 'true';
}

export async function runShot(query, api) {
  const shot = query.get('shot');
  const patch = {};
  for (const key of ['layout', 'grade', 'size', 'title', 'subtitle', 'badge', 'badgeText', 'frame']) {
    const value = query.get(key);
    if (value !== null) patch[key] = value;
  }
  const stars = query.get('stars');
  if (stars !== null) patch.stars = Number(stars);
  for (const key of ['grain', 'vignette', 'halftone']) {
    const value = query.get(key);
    if (value !== null) patch[key] = parseBool(value, patch[key]);
  }
  const photos = query.get('photos');
  if (photos) {
    const ids = photos.split(',').map((s) => s.trim()).filter(Boolean);
    patch.panels = Array.from({ length: 8 }, (_, i) => {
      const meta = sampleById(ids[i % ids.length]);
      return {
        photo: meta.id,
        zoom: 1,
        panX: 0,
        panY: 0,
        focusX: meta.focusX,
        focusY: meta.focusY,
      };
    });
  }
  api.setState(patch);
  if (shot === 'cover') document.body.classList.add('shot-cover');
  api.render();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}

export { SAMPLES };
