import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({
  configFile: 'apps/studio/vite.config.ts',
  server: { host: '127.0.0.1', port: 0, strictPort: false },
  logLevel: 'silent',
});
try {
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const manifest = JSON.parse(await readFile('apps/studio/public/image-lab/manifest.json', 'utf8'));
  const artwork = manifest.samples[0].variants.pigment;
  for (const path of [artwork.image, artwork.drawing, artwork.original.url]) {
    const response = await fetch(origin + path);
    assert.equal(
      response.status,
      200,
      'Prepared and newly generated assets use the app public directory.',
    );
    assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    assert.deepEqual(
      Buffer.from(await response.arrayBuffer()),
      await readFile('apps/studio/public' + path),
    );
  }
  const status = await fetch(origin + '/api/image-lab/status');
  assert.equal(status.status, 200);
  assert.equal((await status.json()).local, true);
  const crossOrigin = await fetch(origin + '/api/image-lab/jobs', {
    method: 'POST',
    headers: { Origin: 'https://unrelated.example' },
    body: '{}',
  });
  assert.equal(crossOrigin.status, 403, 'Only the local app may create image jobs.');
  const missing = await fetch(origin + '/paint/lab-00000000000000000000.jpg');
  assert.equal(missing.status, 404, 'Missing artwork must not return the app HTML.');
  console.log(
    'Local image API: app asset paths, immutable files, status and origin isolation passed.',
  );
} finally {
  await server.close();
}
