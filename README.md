# Neon Palm Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ahh955/Gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ahh955/Gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns any photo and caption into GTA 6-style cover art:
the multi-panel poster look with bold lettering and a Vice City neon-sunset grade,
exported as a PNG to share. Built for the [Make GTA 6 Cover Art](https://make.fun/c/gta6-cover-art-01)
bounty on make.fun.

Everything runs in the browser from static files — no server, no upload, no
network request. Your photos never leave your machine.

## What it does

- **6 poster layouts** — Hero + Three, Four Corners, Full Bleed, Nine Panel
  (3×3 with a centre title cell), Tilted Snapshots (rotated polaroid cards) and
  Film Strip — each adapting to landscape, portrait and square covers.
- **6 Vice City grades** — Vice Sunset, Neon Nights, Golden Hour, Miami Mint,
  Cherry Noir, Palm Chrome. Each is a canvas filter pass plus a shadow/highlight
  gradient wash and a light leak.
- **4 export sizes** — 1080×1080, 1080×1350, 1920×1080, 1080×1920 as full-res
  PNG, one at a time or all four at once.
- **Lettering** — Anton titles with a sunset-gradient fill and dark outline,
  Pacifico neon-glow subtitles, a 0–5 star heat meter, a badge (ribbon, pill or
  strip) and a neon divider rule.
- **Effects** — film grain, vignette, halftone dots, white/black/no frame.
- **Per-panel editing** — click a panel to select it, drag its photo to
  reposition it, scroll or use the slider to zoom (100–260%), click a tray
  photo then a panel to place it, Fill panel, Next photo. Photos are placed
  with a smart face-aware pan, so wide panels never crop faces.
- **Undo/redo** (60 steps, Ctrl+Z / Ctrl+Y), **Shuffle** (random layout, grade,
  title and photos), **drag-and-drop upload** of your own photos.
- **6 sample photos** — two from the kit, four made with an image model — so the
  studio works with no upload at all.

## Try it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Pick a layout and a grade,
click a photo in the tray, click a panel to place it, write your caption, and
Export PNG.

## Layout

- `app/` — the studio itself: `index.html`, `style.css`, `src/main.js` (editor),
  `src/cover.js` (cover renderer), `src/layouts.js` (poster geometry),
  `src/grades.js` (colour grades), `src/shots.js` (screenshot scenes),
  `fonts/` (Anton + Pacifico, SIL Open Font License), `samples/` (photos).
- `screenshots/` — the four screenshots of the entry (see `shots.json` for the
  scene behind each one).
- `main.ts` — hands the app in: copies `app/` and `screenshots/` to `/output`
  and writes `/output/dossier.json` with the kit's vendored library.
- `serve.ts` — the local static server above.

## Originality

All art, lettering and code here are original. No Rockstar Games logo, wordmark,
official artwork, character or font is used anywhere. The fonts are Anton and
Pacifico under the SIL Open Font License (their `OFL-*.txt` texts ship beside
them in `app/fonts/`). The sample photos are the kit's two (free to use) plus
four made with an image model; no real person is pictured.

## License

MIT — see [LICENSE](LICENSE).
