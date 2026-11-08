import {defineConfig} from 'vite';
export default defineConfig({publicDir:false,build:{outDir:'library',lib:{entry:{index:'src/engine.ts',materials:'src/materials-entry.ts',undertow:'src/undertow.ts'},formats:['es'],fileName:(_,name)=>name+'.js',cssFileName:'theme'},rollupOptions:{external:['lucide']}}});
