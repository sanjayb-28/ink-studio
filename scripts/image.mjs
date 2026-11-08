import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const python = process.env.INK_PYTHON ?? root + '.venv/bin/python';
if (!existsSync(python))
  throw new Error('Run npm run compiler:setup to install the local CPU compiler.');
const args = process.argv.slice(2);
if (!args.includes('--help') && !args.includes('--input'))
  throw new Error('Usage: npm run image -- --input photo.jpg --output output/ --method pigment');
const result = spawnSync(python, [root + 'compiler/ink_image.py', 'render', ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    HF_HUB_OFFLINE: '1',
    TRANSFORMERS_OFFLINE: '1',
    HF_HUB_DISABLE_IMPLICIT_TOKEN: '1',
  },
});
process.exitCode = result.status ?? 1;
