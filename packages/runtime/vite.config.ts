import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  root,
  publicDir: false,
  build: {
    outDir: 'dist',
    lib: {
      entry: {
        index: root + 'src/index.ts',
        materials: root + 'src/materials.ts',
        threads: root + 'src/threads/renderer.ts',
      },
      formats: ['es'],
      fileName: (_, name) => name + '.js',
      cssFileName: 'theme',
    },
    rolldownOptions: { external: ['lucide'] },
  },
});
