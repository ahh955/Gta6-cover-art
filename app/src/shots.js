// Fixed scenes for screenshots: ?shot=editor shows the editor with the sample
// crew loaded; ?shot=cover shows the cover alone, full frame. `layout`, `size`,
// `title`, `subtitle`, `grade` and `titleStyle` pick the scene. window.__shotReady
// is set once the cover is painted.
export async function runShot(shot, query, hooks) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await hooks.loadCrew();
  hooks.applyScene({
    layout: query.get('layout') ?? undefined,
    size: query.get('size') ?? undefined,
    title: query.get('title') ?? undefined,
    subtitle: query.get('subtitle') ?? undefined,
    grade: query.get('grade') ?? undefined,
    titleStyle: query.get('titleStyle') ?? undefined,
  });
  await hooks.whenReady();
  window.__shotReady = true;
}
