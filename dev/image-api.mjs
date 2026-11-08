import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, unlink, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = resolve(root, 'apps/studio');
const python = resolve(root, '.venv/bin/python');
const compiler = resolve(root, 'compiler/ink_image.py');
const outputRoot = resolve(root, '.cache/ink-studio/output');
const env = {
  ...process.env,
  INK_PROJECT_ROOT: appRoot,
  INK_CACHE_DIR: resolve(root, '.cache/ink-studio'),
  HF_HOME: resolve(root, '.cache/ink-studio/hf'),
  HF_HUB_OFFLINE: '1',
  TRANSFORMERS_OFFLINE: '1',
  HF_HUB_DISABLE_IMPLICIT_TOKEN: '1',
  PYTORCH_ENABLE_MPS_FALLBACK: '1',
};
const exists = async (p) =>
  access(p).then(
    () => true,
    () => false,
  );
const jobs = new Map(),
  uploads = new Map();
let active,
  closing = false;

function run(args, onEvent) {
  const child = spawn(python, [compiler, ...args, '--output', outputRoot], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let buffer = '',
    message = '',
    result;
  const done = new Promise((accept, reject) => {
    child.stdout.on('data', (data) => {
      buffer += data;
      let split;
      while ((split = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, split);
        buffer = buffer.slice(split + 1);
        try {
          const event = JSON.parse(line);
          if (event.event === 'result') result = event.result;
          if (event.event === 'error') message = event.message;
          onEvent?.(event);
        } catch {}
      }
    });
    child.stderr.resume();
    child.once('error', () =>
      reject(new Error('The local compiler is unavailable. Run npm run compiler:setup.')),
    );
    child.once('exit', (code, signal) =>
      code === 0 && result
        ? accept(result)
        : reject(
            new Error(
              signal
                ? 'Render cancelled.'
                : message || 'The local compiler stopped. Try a smaller image.',
            ),
          ),
    );
  });
  const timeout = setTimeout(() => child.kill('SIGTERM'), 10 * 60 * 1000);
  done.finally(() => clearTimeout(timeout)).catch(() => {});
  return { child, done };
}
function pump() {
  if (active || closing) return;
  const job = [...jobs.values()].find((j) => j.state === 'queued');
  if (!job) return;
  active = job;
  job.state = 'running';
  const { input, settings: s } = job;
  const task = run(
    [
      'render',
      '--input',
      input,
      '--method',
      s.method,
      '--profile',
      s.profile,
      '--strength',
      String(s.strength),
      '--night',
      String(s.night),
      '--detail',
      String(s.detail),
      '--seed',
      String(s.seed),
      '--accent',
      JSON.stringify(s.accent),
    ],
    (e) => {
      if (e.event === 'progress' && job.state !== 'cancelled')
        Object.assign(job, { phase: e.phase, progress: e.progress, message: e.message });
    },
  );
  job.child = task.child;
  task.done
    .then(
      (result) => {
        if (job.state !== 'cancelled')
          Object.assign(job, {
            state: 'complete',
            progress: 100,
            message: result.cacheHit
              ? 'Loaded from the local cache'
              : 'Artwork and ink contours are ready',
            result,
          });
      },
      (error) => {
        if (job.state !== 'cancelled')
          Object.assign(job, { state: 'error', message: error.message });
      },
    )
    .finally(() => {
      delete job.child;
      active = undefined;
      pump();
    });
}
function publicJob({ id, state, phase, progress, message, result }) {
  return { id, state, phase, progress, message, result };
}
function cancel(job) {
  if (['queued', 'running'].includes(job.state)) {
    job.state = 'cancelled';
    job.message = 'Render cancelled. Your previous artwork is kept.';
    job.child?.kill('SIGTERM');
  }
}
async function body(req, max = 20000) {
  const parts = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max)
      throw new Error(max > 20000 ? 'Choose a file under 20 MB.' : 'Request is too large.');
    parts.push(chunk);
  }
  return Buffer.concat(parts);
}
export function imageApiPlugin() {
  return {
    name: 'local-image-lab',
    configureServer(server) {
      server.httpServer?.once('close', () => {
        closing = true;
        for (const job of jobs.values()) cancel(job);
      });
      // Vite snapshots public files. Watch ignores prevent render-time reloads, so
      // serve content-addressed additions directly instead of relying on that snapshot.
      server.middlewares.use(async (req, res, next) => {
        const path = new URL(req.url, 'http://localhost').pathname;
        if (
          !['GET', 'HEAD'].includes(req.method) ||
          !/^\/(?:paint\/lab-[a-f0-9]{20}\.jpg|drawings\/lab-[a-f0-9]{20}\.json|image-lab\/originals\/[a-f0-9]{20}\.jpg)$/.test(
            path,
          )
        )
          return next();
        try {
          const bytes = await readFile(resolve(outputRoot, path.slice(1))).catch(() =>
            readFile(resolve(appRoot, 'public', path.slice(1))),
          );
          res.setHeader('Content-Type', path.endsWith('.json') ? 'application/json' : 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('Content-Length', bytes.length);
          res.end(req.method === 'HEAD' ? undefined : bytes);
        } catch {
          res.statusCode = 404;
          res.end('Prepared image not found');
        }
      });
      server.middlewares.use('/api/image-lab', async (req, res) => {
        const send = (status, data) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(data));
        };
        try {
          const host = req.headers.host ?? '';
          if (!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host))
            return send(403, { error: 'Local authoring only.' });
          if (req.headers.origin && req.headers.origin !== `http://${host}`)
            return send(403, { error: 'Use the local studio to render images.' });
          const url = new URL(req.url, 'http://localhost'),
            path = url.pathname;
          if (req.method === 'GET' && path === '/status') {
            const available = await exists(python);
            return send(200, {
              available,
              ai:
                available &&
                (await exists(
                  resolve(
                    root,
                    '.cache/ink-studio/models/controlnet/diffusion_pytorch_model.fp16.safetensors',
                  ),
                )) &&
                (await exists(
                  resolve(
                    root,
                    '.cache/ink-studio/models/dreamshaper/unet/diffusion_pytorch_model.fp16.safetensors',
                  ),
                )),
              local: true,
            });
          }
          if (req.method === 'POST' && path === '/upload') {
            if (!(await exists(python)))
              return send(503, { error: 'Run npm run compiler:setup to enable local conversion.' });
            const bytes = await body(req, 20 * 1024 * 1024);
            if (!bytes.length) throw new Error('Choose an image first.');
            const id = randomUUID(),
              input = resolve(root, '.cache/ink-studio/uploads', id);
            await mkdir(dirname(input), { recursive: true });
            await writeFile(input, bytes);
            try {
              const result = await run(['normalize', '--input', input]).done;
              uploads.set(id, input);
              return send(201, { id, original: result });
            } catch (error) {
              await unlink(input).catch(() => {});
              throw error;
            }
          }
          if (req.method === 'POST' && path === '/jobs') {
            if (!(await exists(python)))
              return send(503, { error: 'Run npm run compiler:setup to enable local conversion.' });
            if (
              [...jobs.values()].filter((j) => ['running', 'queued'].includes(j.state)).length >= 3
            )
              return send(429, { error: 'The local queue is full. Wait for a render to finish.' });
            const data = JSON.parse((await body(req)).toString());
            const sources = JSON.parse(
              await readFile(resolve(root, 'apps/studio/assets/samples/sources.json'), 'utf8'),
            ).samples;
            const sample = sources.find((s) => s.id === data.source);
            const input = sample ? resolve(appRoot, sample.path) : uploads.get(data.source);
            if (!input) throw new Error('Select a sample or upload an image again.');
            const s = data.settings;
            if (
              !s ||
              !['wash', 'pigment', 'ai'].includes(s.method) ||
              !['scenery', 'portrait', 'still-life', 'interface'].includes(s.profile) ||
              !['strength', 'night', 'detail'].every(
                (k) => typeof s[k] === 'number' && Number.isFinite(s[k]) && s[k] >= 0 && s[k] <= 1,
              ) ||
              !Number.isInteger(s.seed) ||
              s.seed < 0 ||
              s.seed > 2147483647
            )
              throw new Error('Choose valid treatment settings.');
            if (s.method === 'ai' && s.profile === 'interface')
              throw new Error('Use a non-generative treatment for interface lettering.');
            const a = s.accent ??
              sample?.accent ?? {
                enabled: s.profile === 'scenery',
                kind: 'auto',
                amount: 0.8,
                x: null,
                y: null,
              };
            if (
              !a ||
              typeof a !== 'object' ||
              typeof a.enabled !== 'boolean' ||
              !['auto', 'light', 'pigment'].includes(a.kind) ||
              typeof a.amount !== 'number' ||
              !Number.isFinite(a.amount) ||
              a.amount < 0 ||
              a.amount > 1 ||
              !(
                (a.x == null && a.y == null) ||
                [a.x, a.y].every(
                  (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1,
                )
              )
            )
              throw new Error('Choose valid red accent settings and both placement coordinates.');
            s.accent = {
              enabled: a.enabled,
              kind: a.kind,
              amount: a.amount,
              x: a.x ?? null,
              y: a.y ?? null,
            };
            for (const [id, j] of jobs)
              if (jobs.size > 50 && !['running', 'queued'].includes(j.state)) jobs.delete(id);
            const job = {
              id: randomUUID(),
              state: 'queued',
              phase: 'queued',
              progress: 0,
              message: 'Waiting for the local compiler',
              input,
              settings: s,
            };
            jobs.set(job.id, job);
            pump();
            return send(202, publicJob(job));
          }
          const id = path.match(/^\/jobs\/([a-f0-9-]+)$/)?.[1],
            job = id && jobs.get(id);
          if (job && req.method === 'GET') return send(200, publicJob(job));
          if (job && req.method === 'DELETE') {
            cancel(job);
            return send(200, publicJob(job));
          }
          send(404, { error: 'This local render could not be found.' });
        } catch (error) {
          send(400, {
            error: error instanceof Error ? error.message : 'The image could not be processed.',
          });
        }
      });
    },
  };
}
