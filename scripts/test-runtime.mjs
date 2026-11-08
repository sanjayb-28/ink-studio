import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
for (const name of readdirSync(new URL('../tests/runtime/', import.meta.url))
  .filter((name) => name.endsWith('.mjs'))
  .sort()) {
  const result = spawnSync(
    process.execPath,
    [
      '--disable-warning=ExperimentalWarning',
      '--experimental-strip-types',
      'tests/runtime/' + name,
    ],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
