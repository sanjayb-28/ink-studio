import { createHash } from 'node:crypto';
import { readFile, writeFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = resolve(root, 'apps/studio');
const methods = process.argv.includes('--methods')
  ? process.argv[process.argv.indexOf('--methods') + 1]
  : 'wash,pigment';
const manifestPath = resolve(root, 'apps/studio/public/image-lab/manifest.json');
const sourcePath = resolve(root, 'apps/studio/assets/samples/sources.json');
const sources = JSON.parse(await readFile(sourcePath, 'utf8'));
const hash = createHash('sha256')
  .update(await readFile(sourcePath))
  .update(await readFile(resolve(root, 'compiler/ink_image.py')));
hash.update(await readFile(resolve(root, 'compiler/accents.py')));
for (const s of sources.samples) hash.update(await readFile(resolve(appRoot, s.path)));
const fingerprint = hash.digest('hex');
let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch {}
const complete =
  manifest?.buildFingerprint === fingerprint &&
  sources.samples.every((s) => {
    const variants = manifest.samples.find((v) => v.id === s.id)?.variants;
    return methods
      .split(',')
      .filter((m) => s.type !== 'interface' || m !== 'ai')
      .every((m) => variants?.[m]);
  });
let filesPresent = complete;
if (complete)
  for (const s of manifest.samples)
    for (const v of Object.values(s.variants))
      for (const p of [v.image, v.drawing, v.original.url])
        try {
          await access(resolve(appRoot, 'public', p.slice(1)));
        } catch {
          filesPresent = false;
        }
if (filesPresent) {
  console.log('Image lab: prepared artwork is unchanged; no inference needed.');
  process.exit(0);
}
const python = resolve(root, '.venv/bin/python');
try {
  await access(python);
} catch {
  throw new Error(
    'Artwork inputs changed. Run npm run compiler:setup, then npm run samples:build. Prepared static builds need no Python.',
  );
}
console.log('Image lab: preparing changed source images locally…');
await new Promise((accept, reject) => {
  const child = spawn(python, ['compiler/ink_image.py', 'batch', '--methods', methods], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      HF_HUB_OFFLINE: '1',
      TRANSFORMERS_OFFLINE: '1',
      HF_HUB_DISABLE_IMPLICIT_TOKEN: '1',
      PYTORCH_ENABLE_MPS_FALLBACK: '1',
    },
  });
  child.once('error', reject);
  child.once('exit', (code) =>
    code === 0
      ? accept()
      : reject(new Error('The artwork compiler failed. Existing prepared artwork is retained.')),
  );
});
manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.buildFingerprint = fingerprint;
await writeFile(manifestPath, JSON.stringify(manifest));
