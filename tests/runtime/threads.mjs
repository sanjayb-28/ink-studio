import assert from 'node:assert/strict';
import {
  buildField,
  correspondence,
  resample,
  threadPoint,
} from '../../packages/runtime/src/threads/field.ts';

function raster(w, h, pixel) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const value = pixel(x, y);
      rgba.set([value, value, value, 255], (y * w + x) * 4);
    }
  return rgba;
}
const w = 128,
  h = 96;
const image = raster(w, h, (x, y) => (Math.hypot(x - 64, y - 48) < 28 ? 230 : 15));
const a = buildField(image, w, h),
  again = buildField(image, w, h);
assert.deepEqual(
  a,
  again,
  'Same image must produce stable geometry, including during scrub/replay',
);
assert.ok(a.threads.length > 10, 'A visible circular subject must yield contours');
assert.equal(
  buildField(
    raster(w, h, () => 0),
    w,
    h,
  ).threads.length,
  0,
  'An empty black image should have no invented detail',
);
assert.equal(
  buildField(new Uint8ClampedArray(4), 1, 1).threads.length,
  0,
  'Tiny images should not crash analysis',
);
let examined = 0;
for (const t of a.threads) {
  assert.equal(t.points.length, 32);
  for (const p of t.points) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.ok(p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h);
  }
  for (let at = 0; at <= 8.4; at += 0.07)
    for (let i = 0; i < 32; i++) {
      const p = threadPoint(t, i, at);
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
      examined++;
    }
  for (let i = 0; i < 32; i++)
    assert.deepEqual(
      threadPoint(t, i, 8.4),
      t.points[i],
      'Every thread must settle exactly into image geometry',
    );
}
const b = buildField(
  raster(96, 144, (x, y) => ((Math.floor(x / 17) + Math.floor(y / 20)) % 2 ? 210 : 25)),
  96,
  144,
);
const map = correspondence(a, b);
assert.equal(map.length, b.threads.length);
for (let i = 0; i < b.threads.length; i++) {
  const t = b.threads[i];
  assert.equal(map[i].length, 32);
  for (let j = 0; j < 32; j++) {
    assert.deepEqual(
      threadPoint(t, j, 0, map[i]),
      map[i][j],
      'Transition begins at the existing thread',
    );
    const end = threadPoint(t, j, 2.5, map[i]);
    assert.ok(Math.hypot(end.x - t.points[j].x, end.y - t.points[j].y) < 1e-10);
    const before = threadPoint(t, j, 1.1, map[i]),
      after = threadPoint(t, j, 1.101, map[i]);
    assert.ok(
      Math.hypot(before.x - after.x, before.y - after.y) < 0.2,
      'A transition must not jump between adjacent times',
    );
  }
}
const oldAtHalf = {
  ...a,
  threads: a.threads.map((t) => ({
    ...t,
    points: t.points.map((_, i) => threadPoint(t, i, 1.25)),
  })),
};
const interrupted = correspondence(oldAtHalf, b);
assert.ok(
  interrupted.every((p) => p.every((v) => Number.isFinite(v.x) && Number.isFinite(v.y))),
  'Interrupted transitions preserve finite current geometry',
);
const flat = { width: 1, height: 1, threads: [], rgba: new Uint8ClampedArray(4) };
assert.deepEqual(
  correspondence(flat, b),
  b.threads.map((t) => t.points),
);
assert.deepEqual(
  resample([
    { x: 7, y: 9 },
    { x: 7, y: 9 },
  ]),
  Array.from({ length: 32 }, () => ({ x: 7, y: 9 })),
);
console.log(
  `PASS Undertow: ${examined.toLocaleString()} sampled positions; deterministic analysis, contour bounds, settlement, cross-aspect morphs, interruption, empty/tiny images.`,
);
