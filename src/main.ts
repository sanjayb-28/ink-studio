import '@fontsource/geist/latin-400.css';
import '@fontsource/geist-mono/latin-400.css';
import './atelier.css';
import './painting.css';
import './transition.css';
import './studio.css';
import {inkStudioMarkup,mountInkStudio} from './ink-studio';
import {atelierMarkup,mountAtelier} from './atelier';
import {imageLabMarkup,mountImageLab} from './image-lab';
import {materialsMarkup,mountMaterials} from './materials-studio';
const root=document.querySelector<HTMLDivElement>('#app')!,path=location.pathname.replace(/\/+$/,'')||'/';
document.body.classList.add('atelier-active');
let cleanup:(()=>void)|undefined;
if(path==='/components'){root.dataset.page='atelier';root.innerHTML=atelierMarkup();cleanup=mountAtelier(root);}
else if(path==='/image-lab'){root.dataset.page='image-lab';root.innerHTML=imageLabMarkup();cleanup=mountImageLab(root);}
else if(path==='/materials'){root.innerHTML=materialsMarkup();cleanup=mountMaterials(root);}
else if(path==='/'||path==='/studio'){root.innerHTML=inkStudioMarkup();cleanup=mountInkStudio(root);}
else{document.title='Page not found · Ink Studio';root.innerHTML='<main class="is-main"><h1>Page not found</h1><a href="/">Open Ink Studio →</a></main>';}
window.addEventListener('pagehide',()=>cleanup?.(),{once:true});
