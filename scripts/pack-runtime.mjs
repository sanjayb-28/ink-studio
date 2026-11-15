import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  output = resolve(root, 'artifacts');
await mkdir(output, { recursive: true });
const result = spawnSync(
  'npm',
  ['pack', '--json', '--workspace', '@sanjayb-28/ink-runtime', '--pack-destination', output],
  { cwd: root, encoding: 'utf8' },
);
if (result.status !== 0) throw new Error(result.stderr || 'Could not package the runtime.');
const [archive] = JSON.parse(result.stdout);
const unexpected = archive.files.filter(
  (file) =>
    !['README.md', 'NOTICE.md', 'LICENSE', 'package.json'].includes(file.path) &&
    !/^dist\/.*\.(js|css|d\.ts)$/.test(file.path),
);
if (unexpected.length || archive.size > 200000)
  throw new Error('Runtime archive contains application assets or exceeds its size budget.');
console.log(
  archive.filename +
    ' · ' +
    Math.round(archive.size / 1024) +
    ' KB · ' +
    archive.files.length +
    ' runtime files.',
);
