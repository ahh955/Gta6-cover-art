// Neon Palm Cover Studio — the entry program for make.fun's
// gta6-cover-art-01 ("Make GTA 6 Cover Art").
//
// It hands the app in: it copies app/ and screenshots/ from this repository
// to the output directory and writes /output/dossier.json with the kit's
// buildDossier library (vendor/makefun-app.ts). Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output. Node 22, standard library only.

import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

/** The gate's own dossier cap: 1.5 MiB. */
const DOSSIER_MAX_BYTES = 1572864;

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

function copyTree(name) {
  const src = join(repoRoot, name);
  const dst = join(outDir, name);
  if (!existsSync(src)) throw new Error(`missing ${name}/ in the repository`);
  cpSync(src, dst, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
rmSync(join(outDir, 'app'), { recursive: true, force: true });
rmSync(join(outDir, 'screenshots'), { recursive: true, force: true });
rmSync(join(outDir, 'dossier.json'), { force: true });

copyTree('app');
copyTree('screenshots');

const dossier = buildDossier(outDir, DOSSIER_CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Validate what was just written, so a broken hand-in fails here loudly
// instead of at the gate: the dossier must parse, stay under its cap, and
// rebuild byte for byte; the page and every screenshot must be in place.
const parsed = JSON.parse(new TextDecoder().decode(dossier));
if (parsed.schema !== 'makefun/dossier/v1') throw new Error(`dossier schema is ${parsed.schema}, not makefun/dossier/v1`);
if (dossier.length > DOSSIER_MAX_BYTES) throw new Error(`dossier.json is ${dossier.length} bytes, over the ${DOSSIER_MAX_BYTES} cap`);
const rebuilt = buildDossier(outDir, DOSSIER_CAPS);
if (!Buffer.from(rebuilt).equals(Buffer.from(dossier))) throw new Error('dossier is not deterministic: a rebuild differs');
if (!existsSync(join(outDir, 'app', 'index.html'))) throw new Error('app/index.html missing from /output');
for (const shot of parsed.images ?? []) {
  const shotPath = join(outDir, 'screenshots', shot.name);
  if (!existsSync(shotPath)) throw new Error(`screenshot ${shot.name} missing from /output`);
  if (statSync(shotPath).size > 262144) throw new Error(`screenshot ${shot.name} is over the 256 KiB cap`);
}
console.log(`dossier.json written: ${dossier.length} bytes, ${parsed.images?.length ?? 0} screenshots, validated`);
