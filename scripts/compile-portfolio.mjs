import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {access,readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const code=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(!process.env.INK_PROJECT_ROOT)throw new Error('Set INK_PROJECT_ROOT to the portfolio checkout. See README.md.');
const project=resolve(process.env.INK_PROJECT_ROOT),python=resolve(code,'.venv-image-lab/bin/python');
await access(resolve(project,'assets/portfolio/hero.json'));await access(python);
const jobs=['prepare_portfolio_art.py','prepare_education_art.py','prepare_experience_art.py','prepare_projects_art.py','prepare_writing_art.py','prepare_certifications_art.py','prepare_project_covers.py'];
const heroBytes=await readFile(resolve(project,'assets/portfolio/hero.json'));
const hero=JSON.parse(heroBytes),hash=createHash('sha256').update(heroBytes);
for(const scene of hero.scenes){hash.update(await readFile(resolve(project,scene.source)));}
for(const script of ['image_lab.py','vermilion.py','portfolio_art_preset.py','portfolio_banner_tone.py','prepare_portfolio_art.py'])hash.update(await readFile(resolve(code,'scripts',script)));
for(const page of ['education','experience','projects','writing','certifications']){
 const recipe=JSON.parse(await readFile(resolve(project,'assets/portfolio',page+'-art.json'),'utf8'));
 await access(resolve(project,recipe.source));
}
if(process.argv.includes('--check')){console.log('All nine banner sources and their external compiler inputs are accessible. No images were changed.');process.exit(0);}
const fingerprint=hash.digest('hex');
for(const job of jobs){
 const args=[resolve(code,'scripts',job),...(job==='prepare_portfolio_art.py'?['--fingerprint',fingerprint]:[])];
 await new Promise((done,fail)=>{const child=spawn(python,args,{cwd:code,env:{...process.env,INK_PROJECT_ROOT:project,HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1',HF_HUB_DISABLE_IMPLICIT_TOKEN:'1',PYTORCH_ENABLE_MPS_FALLBACK:'1'},stdio:'inherit'});child.on('error',fail);child.on('exit',status=>status===0?done():fail(new Error(job+' failed; existing prepared artwork is retained.')));});
}
console.log('Prepared portfolio artwork in '+project+'. Run its npm test before committing.');
