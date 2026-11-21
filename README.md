# Vice Cast Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ahh955/Gta6-cover-art/rank.svg)](https://make.fun/c/gta6-cover-art-01/leaderboard)
[![reward](https://make.fun/badge/gta6-cover-art-01/ahh955/Gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns any photo and caption into dense, edge-to-edge
GTA 6-style cover art — the multi-panel poster look with bold striped-chrome
lettering and a Vice City sunset grade — exported as a PNG to share. Entry for
the make.fun **gta6-cover-art-01** bounty.

## What it does

- **Dense poster, no void.** Panels fill ~85% of the poster height; the big
  striped-chrome title overlaps the panels mid-poster at ~90% width; the
  review quote, gold seal, billing block, barcode and COMING SOON line sit in
  two compact strips. Nothing is left empty.
- **Face-filling crops.** FaceDetector finds the face in each photo (with a
  centre / rule-of-thirds fallback) and crops so the face fills ~55% of its
  panel. The hero panel is a tight face close-up.
- **4 layouts** (Hero Mosaic, Six Grid, Diagonal Strips, Seven Mosaic),
  **6 grades** (Sunset Gold, Neon Night, Tropic Teal, Golden Hour, Heat Haze,
  Ultraviolet), **6 striped-chrome title styles** and **2 script fonts**
  (Pacifico, Yellowtail), plus look sliders for paint, grade, halftone,
  grain, glow, title size and title lift.
- **Role tags with sublabels** on every panel ("THE DRIVER / OCEAN DRIVE •
  6:42 PM"), editable per panel, plus scene panels (car, boat) for story.
- **Per-panel controls:** click to select, drag to pan, wheel or slider to
  zoom, double-click to flip, drag a panel's number onto another panel to
  swap, drop a photo onto a panel to fill it.
- **3-step flow:** Add photos → Caption → Export PNG. Exports 1080×1080,
  1080×1350 and 1920×1080, one at a time or all three at once, with live
  size thumbnails. Undo/Redo, Surprise-me, "One photo, all panels" and a
  "Try sample crew" button (8 fictional cast portraits + 2 scenes, made
  with an image model for this app — no real people).
- **Offline and private.** The app makes no network request; photos never
  leave the device.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library (`vendor/makefun-app.ts`,
copied unchanged from the kit).

## Originality

All lettering, layouts and code are original to this entry. No Rockstar Games
logo, artwork or font is used. Fonts are Anton, Pacifico and Yellowtail under
the SIL Open Font License (see `app/fonts/OFL.txt`). Sample cast portraits
were generated with an image model for this app; they depict no real person.

## License

MIT — see [LICENSE](LICENSE).
