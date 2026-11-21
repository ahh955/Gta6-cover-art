// main.ts — the entrypoint for the gta6-cover-art-01 bounty (Node 22, stdlib only).
//
// The app is this repository's app/ folder: plain static files a desktop
// browser loads offline (app/index.html plus its ES modules, fonts and sample
// photos; no library, no network request). This program hands it in: it copies
// app/ and screenshots/ from beside this file into the output directory and
// writes /output/dossier.json with the vendored make.fun library, exactly as
// the kit's starter does. The app itself is Vice Cast Cover Studio, a dense
// edge-to-edge multi-panel GTA 6-style cover maker with face-aware crops,
// six grades, four layouts and striped-chrome lettering.
//
// Run locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app with `node serve.ts` and open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail fast with a clear message when the app entry point is missing,
// instead of handing in an empty app/ the gate would refuse.
if (!existsSync(join(repoRoot, 'app', 'index.html'))) {
  throw new Error('app/index.html is missing — the app cannot be handed in without it');
}

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The gate's caps (reference/gate.json): only text_max_bytes shapes the
// dossier's bytes; the rest refuse an entry the scorer would refuse — more
// than 4 screenshots or one over 256 KiB; more than 993 files in app/ or
// 48 MiB of app files in all; or a path under app/ over 1000 bytes.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
