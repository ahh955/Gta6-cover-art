# Vice Cast Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ahh955/Gta6-cover-art/rank.svg)](https://make.fun/c/gta6-cover-art-01/leaderboard)
[![reward](https://make.fun/badge/gta6-cover-art-01/ahh955/Gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns your photos into GTA 6-style multi-panel cover
art. Built for the make.fun bounty **gta6-cover-art-01** ("Make GTA 6 Cover
Art"). Everything runs in the browser from static files — your photos never
leave your device, and the app makes no network request.

## What it does

- **Hero-mosaic covers**: one big centre hero panel plus six numbered side
  panels, in four layouts — Hero mosaic, Six grid, Diagonal strips and Seven
  mosaic.
- **People-first, face-aware**: an eight-person sample cast of original
  fictional people (made with an image model, no real celebrities), plus your
  own photos. Crops centre on the face where the browser's FaceDetector API
  is available, with a centre / rule-of-thirds fallback; every panel has a
  Face button to re-centre on the face.
- **Role tags**: each panel carries an editable cast tag — THE BOSS,
  THE DRIVER, THE RIDER, THE COURIER, THE INSIDER and more.
- **Striped retro-chrome 3D titles**: five chrome title styles with
  horizontal stripes and extrusion, laid over the art as the dominant
  element, plus two script subtitle fonts and a tagline ribbon.
- **Movie-poster furniture**: review quote with five stars, billing block /
  credits line, gold seal rosette, Vol. 1 tag, barcode and a COMING SOON line.
- **Six colour grades** (Sunset Gold, Neon Night, Tropic Teal, Golden Hour,
  Heatwave, Magenta Dusk) and look sliders: Paint, Grade, Halftone, Grain,
  Glow and Title size.
- **Per-panel controls**: click to select, drag to pan, wheel or slider to
  zoom, Flip, Swap, Reset, and drop a photo onto a panel to fill it.
- **Three-step flow**: 1 Add photos → 2 Caption → 3 Export PNG, with
  "Try sample crew", Auto layout and Surprise me helpers, plus Undo / Redo.
- **PNG export in three post sizes**: 1:1 (1080 × 1080), 4:5 (1080 × 1350)
  and 16:9 (1920 × 1080), one at a time or all three at once.

## Try it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Or open `app/index.html`
directly from the files — the app needs no server and no network.

## How it is built

- `app/index.html` — the editor page.
- `app/style.css` — the editor's styling.
- `app/src/cover.js` — the cover renderer: panels, grades, chrome titles and
  poster furniture, all drawn on one canvas.
- `app/src/main.js` — wires the editor: photos, panels, captions, history
  and PNG export.
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=editor`,
  `?shot=cover`).
- `app/samples/` — eight original fictional-people sample photos.
- `app/fonts/` — Anton and Pacifico, both under the SIL Open Font License.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to the
  output directory and writes `dossier.json` with the kit's library.
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged.

## Originality

Every photo, title and design in this entry is original: the sample cast are
fictional people made with an image model, the lettering uses Anton and
Pacifico (SIL OFL), and nothing here is a Rockstar Games logo, artwork,
character or font.

## License

MIT — see [LICENSE](LICENSE).
