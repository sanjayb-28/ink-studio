import {createHash} from 'node:crypto';
import {readFile,writeFile,access} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifestPath=resolve(root,'public/image-lab/manifest.json');
const sourcePath=resolve(root,'assets/image-lab/sources.json');
const sources=JSON.parse(await readFile(sourcePath,'utf8'));
const hash=createHash('sha256').update(await readFile(sourcePath)).update(await readFile(resolve(root,'scripts/image_lab.py')));
hash.update(await readFile(resolve(root,'scripts/vermilion.py')));
for(const s of sources.samples)hash.update(await readFile(resolve(root,s.path)));
const fingerprint=hash.digest('hex');
let manifest;try{manifest=JSON.parse(await readFile(manifestPath,'utf8'));}catch{}
const complete=manifest?.buildFingerprint===fingerprint&&sources.samples.every(s=>{
  const variants=manifest.samples.find(v=>v.id===s.id)?.variants;
  return (s.type==='interface'?['wash','pigment']:['wash','pigment','ai']).every(m=>variants?.[m]);
});
let filesPresent=complete;
if(complete)for(const s of manifest.samples)for(const v of Object.values(s.variants))for(const p of [v.image,v.drawing,v.original.url])try{await access(resolve(root,'public',p.slice(1)));}catch{filesPresent=false;}
if(filesPresent){console.log('Image lab: prepared artwork is unchanged; no inference needed.');process.exit(0);}
const python=resolve(root,'.venv-image-lab/bin/python');
try{await access(python);}catch{throw new Error('Artwork inputs changed. Run npm run images:setup, then npm run prepare:images. Prepared static builds need no Python.');}
console.log('Image lab: preparing changed source images locally…');
await new Promise((accept,reject)=>{
  const child=spawn(python,['scripts/image_lab.py','batch','--methods','wash,pigment,ai'],{cwd:root,stdio:'inherit',env:{...process.env,HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1',HF_HUB_DISABLE_IMPLICIT_TOKEN:'1',PYTORCH_ENABLE_MPS_FALLBACK:'1'}});
  child.once('error',reject);child.once('exit',code=>code===0?accept():reject(new Error('The artwork compiler failed. Existing prepared artwork is retained.')));
});
manifest=JSON.parse(await readFile(manifestPath,'utf8'));manifest.buildFingerprint=fingerprint;
await writeFile(manifestPath,JSON.stringify(manifest));
