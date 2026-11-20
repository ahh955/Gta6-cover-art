// Vice Cast Cover Studio — a gta6-cover-art-01 entry (Node 22, standard library only).
//
// The app lives in app/ beside this file: plain static files a desktop browser
// loads offline (app/index.html plus its ES modules, vendored fonts and sample
// cast photos; no network request anywhere). This program hands it in: it copies
// app/ and screenshots/ to the output directory and writes dossier.json, the
// summary the judge reads, with the vendored make.fun library.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files in all, or a path under app/ over 1000 bytes).
const DOSSIER_OPTIONS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

/** Counts the plain files under a directory, recursively. */
function countFiles(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    total += entry.isDirectory() ? countFiles(path) : 1;
  }
  return total;
}

/** Refuses a build the gate would refuse, before any byte is written. */
function validateInputs(): void {
  const appDir = join(here, 'app');
  if (!existsSync(join(appDir, 'index.html'))) throw new Error('app/index.html is missing');
  if (countFiles(appDir) > DOSSIER_OPTIONS.app_max_files) throw new Error('app/ holds too many files');
  const shotsDir = join(here, 'screenshots');
  if (!existsSync(shotsDir)) throw new Error('screenshots/ is missing');
  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
  if (shots.length < 3 || shots.length > DOSSIER_OPTIONS.screenshots.max) {
    throw new Error(`expected 3 or 4 screenshots, found ${shots.length}`);
  }
  for (const name of shots) {
    const bytes = statSync(join(shotsDir, name)).size;
    if (bytes > DOSSIER_OPTIONS.screenshots.max_bytes) {
      throw new Error(`screenshot ${name} is ${bytes} bytes, over the 256 KiB cap`);
    }
  }
}

validateInputs();
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
const dossierPath = join(out, 'dossier.json');
writeFileSync(dossierPath, buildDossier(out, DOSSIER_OPTIONS));

// The gate refuses a dossier over 1.5 MiB, so refuse it here too instead of
// handing in an entry that cannot pass.
const dossierBytes = statSync(dossierPath).size;
if (dossierBytes > 1572864) {
  throw new Error(`dossier.json is ${dossierBytes} bytes, over the 1.5 MiB cap`);
}
