import {spawn} from 'node:child_process';
import {access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const env={...process.env,HF_HOME:resolve(root,'.image-lab/hf'),HF_HUB_DISABLE_IMPLICIT_TOKEN:'1'};
const run=(command,args)=>new Promise((accept,reject)=>{const c=spawn(command,args,{cwd:root,env,stdio:'inherit'});c.once('error',reject);c.once('exit',code=>code===0?accept():reject(new Error(`${command} exited with ${code}`)));});
try{await access(resolve(root,'.venv-image-lab/bin/python'));}catch{await run('uv',['venv','--python','3.12','.venv-image-lab']);}
await run('uv',['pip','install','--python','.venv-image-lab/bin/python','-r','scripts/image-lab-requirements.txt']);
await run('.venv-image-lab/bin/hf',['download','Lykon/dreamshaper-8','--revision','a7e52b98680b1ba8ff7bce97c7f9f2e2e5337917','--local-dir','.image-lab/models/dreamshaper','--include','model_index.json','scheduler/*','tokenizer/*','text_encoder/config.json','text_encoder/model.fp16.safetensors','unet/config.json','unet/diffusion_pytorch_model.fp16.safetensors','vae/config.json','vae/diffusion_pytorch_model.fp16.safetensors','feature_extractor/*']);
await run('.venv-image-lab/bin/hf',['download','lllyasviel/control_v11p_sd15_canny','--revision','115a470d547982438f70198e353a921996e2e819','--local-dir','.image-lab/models/controlnet','--include','config.json','diffusion_pytorch_model.fp16.safetensors']);
console.log('Local image compiler ready. Run npm run prepare:images or open /image-lab/.');
