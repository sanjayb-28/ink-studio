import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { imageApiPlugin } from '../../dev/image-api.mjs';
const project = fileURLToPath(new URL('../../', import.meta.url));
export default defineConfig({
  root: project + 'apps/studio',
  plugins: [imageApiPlugin()],
  resolve: {
    alias: [
      {
        find: '@sanjayb-28/ink-runtime/theme.css',
        replacement: project + 'packages/runtime/src/ui/theme.css',
      },
      {
        find: '@sanjayb-28/ink-runtime/materials',
        replacement: project + 'packages/runtime/src/materials.ts',
      },
      {
        find: /^@sanjayb-28\/ink-runtime$/,
        replacement: project + 'packages/runtime/src/index.ts',
      },
    ],
  },
  build: { outDir: project + 'dist/studio', emptyOutDir: true },
  server: {
    fs: { allow: [project] },
    watch: {
      ignored: [
        '**/.cache/**',
        '**/.venv/**',
        '**/public/paint/**',
        '**/public/drawings/**',
        '**/public/image-lab/originals/**',
      ],
    },
  },
});
