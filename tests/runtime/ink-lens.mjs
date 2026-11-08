import assert from 'node:assert/strict';
import { InkLens } from '../../packages/runtime/src/materials/lens.ts';
const lens = new InkLens();
lens.move(120, 90, 0);
assert.equal(lens.opacity(0), 0);
assert.ok(
  lens.opacity(0.225) > 0.7 && lens.opacity(0.225) < 0.9,
  'The entrance follows the CSS ease curve',
);
assert.equal(lens.opacity(0.45), 1);
assert.equal(lens.opacity(20), 1, 'A stationary hover stays illuminated');
lens.move(240, 100, 20);
assert.equal(lens.opacity(20), 1, 'Moving does not restart the fade');
assert.equal(lens.x, 240);
assert.equal(lens.y, 100);
lens.leave(21);
assert.equal(lens.opacity(21), 1);
assert.equal(lens.opacity(21.45), 0);
assert.equal(lens.active, false);
lens.move(50, 60, 22);
const before = lens.opacity(22.15);
lens.leave(22.15);
assert.equal(lens.opacity(22.15), before, 'Interrupted entrance is continuous');
const fading = lens.opacity(22.25);
lens.move(55, 62, 22.25);
assert.equal(lens.opacity(22.25), fading, 'Re-entry reverses from the current opacity');
assert.equal(lens.opacity(22.7), 1);
lens.clear();
assert.equal(lens.opacity(25), 0);
assert.equal(lens.active, false);
assert.equal(InkLens.radius, 150);
assert.equal(InkLens.fade, 0.45);
console.log(
  'PASS ink lens: 150px feather radius, CSS easing, 450ms entry/exit, stationary persistence, direct pointer tracking and continuous interruption.',
);
