import {defineConfig} from 'vite';
import {imageLabPlugin} from './scripts/image-lab-server.mjs';
export default defineConfig({plugins:[imageLabPlugin()],server:{watch:{ignored:['**/.image-lab/**','**/.venv*/**']}}});
