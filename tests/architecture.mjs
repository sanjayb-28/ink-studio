import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
const root = process.cwd();
function files(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}
for (const directory of ['packages/runtime/src', 'compiler', 'apps/studio/src']) {
  for (const file of files(resolve(root, directory)).filter((file) =>
    /\.(ts|css|py|json)$/.test(file),
  )) {
    const text = readFileSync(file, 'utf8');
    assert.ok(
      !/assets\/portfolio|sanjay-portfolio|portfolioPace|compile:portfolio/i.test(text),
      'Product source must be consumer-independent: ' + relative(root, file),
    );
    if (directory === 'packages/runtime/src') {
      assert.ok(
        !/(from|import).*['"]node:|apps\/studio|\/compiler\//.test(text),
        'Runtime must not import tool/server code: ' + relative(root, file),
      );
    }
  }
}
const pkg = JSON.parse(readFileSync('packages/runtime/package.json', 'utf8'));
assert.equal(pkg.name, '@sanjayb-28/ink-runtime');
assert.deepEqual(pkg.files, ['dist', 'README.md', 'NOTICE.md']);
assert.ok(pkg.exports['.'].types.endsWith('/index.d.ts'));
const workspace = JSON.parse(readFileSync('package.json', 'utf8'));
assert.equal(workspace.name, 'ink-studio');
assert.ok(!workspace.scripts['compile:portfolio']);
console.log('App, runtime and compiler ownership boundaries passed.');
