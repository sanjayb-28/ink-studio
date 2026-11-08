import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ai = process.argv.includes('--ai');
const env = {
  ...process.env,
  HF_HOME: resolve(root, '.cache/ink-studio/hf'),
  HF_HUB_DISABLE_IMPLICIT_TOKEN: '1',
};
const run = (command, args) =>
  new Promise((done, fail) => {
    const child = spawn(command, args, { cwd: root, env, stdio: 'inherit' });
    child.on('error', fail);
    child.on('exit', (code) => (code === 0 ? done() : fail(new Error(command + ' failed'))));
  });
try {
  await access(resolve(root, '.venv/bin/python'));
} catch {
  await run('uv', ['venv', '--python', '3.12', '.venv']);
}
await run('uv', [
  'pip',
  'install',
  '--python',
  '.venv/bin/python',
  '-r',
  'compiler/' + (ai ? 'requirements-ai.txt' : 'requirements-cpu.txt'),
]);
if (ai) {
  await run('.venv/bin/hf', [
    'download',
    'Lykon/dreamshaper-8',
    '--revision',
    'a7e52b98680b1ba8ff7bce97c7f9f2e2e5337917',
    '--local-dir',
    '.cache/ink-studio/models/dreamshaper',
    '--include',
    'model_index.json',
    'scheduler/*',
    'tokenizer/*',
    'text_encoder/config.json',
    'text_encoder/model.fp16.safetensors',
    'unet/config.json',
    'unet/diffusion_pytorch_model.fp16.safetensors',
    'vae/config.json',
    'vae/diffusion_pytorch_model.fp16.safetensors',
    'feature_extractor/*',
  ]);
  await run('.venv/bin/hf', [
    'download',
    'lllyasviel/control_v11p_sd15_canny',
    '--revision',
    '115a470d547982438f70198e353a921996e2e819',
    '--local-dir',
    '.cache/ink-studio/models/controlnet',
    '--include',
    'config.json',
    'diffusion_pytorch_model.fp16.safetensors',
  ]);
}
console.log(
  ai
    ? 'CPU and local AI authoring are ready.'
    : 'CPU authoring is ready. Use compiler:setup -- --ai to add optional local AI.',
);
