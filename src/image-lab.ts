import './atelier.css';
import './image-lab.css';
import {Hero} from './hero';
import {frame,wash} from './atelier-ui';
import {frameGeometry} from './atelier-frame';
import {icon,mountAtelierIcons} from './atelier-icons';

type Method='wash'|'pigment'|'ai';
type Profile='scenery'|'portrait'|'still-life'|'interface';
type Accent={enabled:boolean;kind:'auto'|'light'|'pigment';amount:number;x:number|null;y:number|null};
type Settings={method:Method;profile:Profile;strength:number;night:number;detail:number;seed:number;accent:Accent};
type Original={id:string;url:string;width:number;height:number};
type Artwork={id:string;name:string;settings:Settings;accent?:{applied:boolean;kind:string;reason:string;point?:number[]};original:Original;image:string;drawing:string;width:number;height:number;nativeResolution?:boolean;bytes:number;paths:number;seconds:number;requestSeconds:number;cacheHit:boolean;aiCacheHit:boolean;device:string;model:string};
type Sample={id:string;title:string;type:Profile;credit:string;source:string;license:string;licenseUrl:string;original:Original;variants:Partial<Record<Method,Artwork>>};
type Job={id:string;state:'queued'|'running'|'complete'|'error'|'cancelled';phase:string;progress:number;message:string;result?:Artwork};
const names:Record<Method,string>={wash:'Wash',pigment:'Pigment',ai:'Local AI'};
const descriptions:Record<Method,string>={wash:'A gentle colour wash. Keeps the photograph’s structure.',pigment:'Softened colour fields and pigment grain. No generated details.',ai:'Painted night scenes, quiet light and indigo shadows. Source edges guide the composition.'};
const esc=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const action=(label:string,id:string,glyph:string,primary=false)=>`<button class="at-button${primary?' at-button--primary':''}" data-lab="${id}">${wash}${frame}${icon(glyph)}<span>${label}</span></button>`;

export function imageLabMarkup(){return `<div class="atelier image-lab">
  <a class="at-skip" href="#lab-main">Skip to image lab</a>
  <header class="lab-header"><a class="lab-brand" href="/components/">sanjay <span>/ studio</span></a><nav aria-label="Studios"><a href="/components/#elements">Elements</a><a href="/">Ink engine</a><a href="/image-lab/" aria-current="page">Image lab</a></nav><span class="lab-edition">STUDY / 03</span></header>
  <main id="lab-main"><div class="lab-heading"><div><span class="lab-eyebrow"><i></i> An image, in another medium</span><h1>The pigment lab.</h1></div><p>Photograph → pigment → ink.<br>Prepared locally. Played lightly.</p></div>
  <div class="lab-workbench">
    <section class="lab-preview" aria-label="Image comparison">
      <div class="lab-canvas" data-view="split" aria-busy="true">
        <img class="lab-original" alt="Original source photograph" draggable="false"><img class="lab-artwork" alt="Locally treated artwork" draggable="false">
        <span class="lab-image-label lab-before">Original</span><span class="lab-image-label lab-after">Artwork</span>
        <span class="lab-divider" aria-hidden="true"><span>‹ ›</span></span>
        <input class="lab-scrub" type="range" min="0" max="100" value="50" aria-label="Before and after comparison" aria-valuetext="50 percent original, 50 percent artwork">
        <span class="lab-empty">Preparing the studies…</span>
      </div>
      <div class="lab-preview-toolbar"><div class="lab-view-switch" role="group" aria-label="Comparison view"><button data-view="original" aria-pressed="false">Original</button><button data-view="split" aria-pressed="true">Compare</button><button data-view="artwork" aria-pressed="false">Artwork</button></div><button class="at-text-link" data-lab="reveal" disabled>${icon('play')} Preview ink reveal</button></div>
      <div class="lab-caption"><span data-lab-title>Loading studies</span><span data-lab-result></span></div>
      <div class="lab-studies" role="group" aria-label="Source studies"></div>
      <p class="lab-credit" data-lab-credit></p>
    </section>
    <aside class="lab-inspector" aria-label="Treatment controls">
      <div class="lab-section-label"><span>01</span> Treatment</div>
      <div class="lab-methods" role="group" aria-label="Treatment method">${(['wash','pigment','ai'] as Method[]).map((m,i)=>`<button data-method="${m}" aria-pressed="${m==='ai'}"><span>0${i+1}</span>${names[m]}${icon('arrow-up-right')}</button>`).join('')}</div>
      <p class="lab-method-copy" data-lab-description>${descriptions.ai}</p>
      <div class="lab-section-label lab-adjust-heading"><span>02</span> Adjust</div>
      <label class="lab-profile">Subject<select aria-label="Image profile"><option value="scenery">Scenery</option><option value="portrait">Portrait</option><option value="still-life">Still life</option><option value="interface">Interface / preserve text</option></select></label>
      ${[['strength','Treatment'],['night','Nightfall'],['detail','Definition']].map(([id,label])=>`<label class="lab-control">${label}<output data-value="${id}">65</output><input aria-label="${label}" data-setting="${id}" type="range" min="0" max="100" value="65"></label>`).join('')}
      <details class="lab-accent"><summary><i></i> Vermilion accent <span data-accent-state>On</span>${icon('chevron-down')}</summary><div>
        <label class="lab-accent-enable"><input type="checkbox" data-accent-enabled checked> Add a red focal accent</label>
        <label class="lab-profile">Treatment<select aria-label="Red accent treatment" data-accent-kind><option value="auto">Existing red detail</option><option value="light">Glowing light</option><option value="pigment">Painted pigment</option></select></label>
        <label class="lab-control">Presence<output data-accent-value>80</output><input type="range" min="0" max="100" value="80" data-accent-amount aria-label="Red accent presence"></label>
        <div class="lab-accent-actions"><button data-lab="place-accent" aria-pressed="false">${icon('plus')} Place on image</button><button data-lab="auto-accent">Auto</button></div>
        <div class="lab-accent-position"><label>Across %<input type="number" min="0" max="100" step=".001" data-accent-x aria-label="Accent position across" placeholder="Auto"></label><label>Down %<input type="number" min="0" max="100" step=".001" data-accent-y aria-label="Accent position down" placeholder="Auto"></label></div>
        <p data-accent-note>One existing detail. Render to apply.</p>
      </div></details>
      <div class="lab-seed"><label for="lab-seed">Variation</label><input id="lab-seed" type="number" min="0" max="2147483647" step="1" value="241" inputmode="numeric" required><button data-lab="reset" aria-label="Reset treatment settings">${icon('rotate-ccw')}</button></div>
      <p class="lab-dirty" data-lab-dirty>Showing the prepared treatment.</p>
      ${action('Render treatment','render','pen-line',true)}
      <div class="lab-job" hidden><progress max="100" value="0" aria-label="Image conversion progress"></progress><div><span role="status" data-job-status></span><button data-lab="cancel">Cancel</button></div></div>
      <p class="lab-feedback" data-lab-feedback role="status">Connecting to the local compiler…</p>
      <div class="lab-upload" tabindex="0" role="button" aria-label="Choose your own image">${icon('plus')}<span>Try your own image<small>JPG, PNG, WebP · up to 20 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/tiff" hidden></div>
      <p class="lab-local" data-lab-local>Files stay on this computer.</p>
    </aside>
  </div>
  <section class="lab-output" aria-label="Prepared output"><div><span class="lab-section-label"><span>03</span> Prepared for the site</span><p data-lab-stats>Artwork, source-aware contours and a saved recipe.</p></div><div class="lab-export"><a class="at-text-link" data-lab-download download hidden>${icon('download')} Save artwork</a><a class="at-text-link" data-lab-contours download hidden>${icon('file-text')} Ink contours</a></div></section>
  <details class="lab-notes"><summary>What each treatment does ${icon('chevron-down')}</summary><div><p><strong>Wash & Pigment</strong> preserve the subject. Edge-aware smoothing, colour grading and seeded pigment texture run on the CPU.</p><p><strong>Local AI</strong> adds painted shapes and brushwork with DreamShaper + ControlNet. It can change faces and lettering; use a preservation treatment when those details matter.</p><p><strong>At build time</strong> the compiler saves a JPEG, contours from the finished image and a cached recipe. The site plays those prepared files. It does no model inference or image filtering in the animation loop.</p><p>New conversions work in the local development studio. A static build keeps the prepared studies and their ink previews.</p></div></details>
  </main><footer class="lab-footer"><span>A study in colour & restraint.</span><a href="/components/#elements">Back to the component studio ${icon('arrow-right')}</a></footer>
  <dialog class="lab-reveal-dialog" aria-label="Converted artwork ink reveal"><div class="lab-reveal-stage"></div><div class="lab-reveal-toolbar"><div><span data-reveal-title></span><p data-reveal-status role="status">Preparing the ink…</p></div><div>${action('Replay','replay','rotate-ccw')}${action('Close','close','x')}</div></div></dialog>
  </div>`;}

export function mountImageLab(root:HTMLElement){
  const $=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
  const canvas=$('.lab-canvas'),originalImage=$<HTMLImageElement>('.lab-original'),artImage=$<HTMLImageElement>('.lab-artwork'),scrub=$<HTMLInputElement>('.lab-scrub');
  const dialog=$<HTMLDialogElement>('.lab-reveal-dialog'),profile=$<HTMLSelectElement>('.lab-profile select');
  let samples:Sample[]=[],source:Sample|undefined,upload:Original|undefined,uploadId='',result:Artwork|undefined,method:Method='ai';
  let available=false,aiAvailable=false,busy=false,disposed=false,timer=0,jobId='',actor:Hero|undefined,scroll='',lastFocus:HTMLElement|undefined,placingAccent=false;
  let revealRatio=1;
  const requests=new AbortController();
  const defaultAccent=(p:Profile):Accent=>({enabled:p==='scenery',kind:'auto',amount:.8,x:null,y:null});
  const accent=():Accent=>({enabled:$<HTMLInputElement>('[data-accent-enabled]').checked,kind:$<HTMLSelectElement>('[data-accent-kind]').value as Accent['kind'],amount:Number($<HTMLInputElement>('[data-accent-amount]').value)/100,x:$<HTMLInputElement>('[data-accent-x]').value===''?null:Number((Number($<HTMLInputElement>('[data-accent-x]').value)/100).toFixed(5)),y:$<HTMLInputElement>('[data-accent-y]').value===''?null:Number((Number($<HTMLInputElement>('[data-accent-y]').value)/100).toFixed(5))});
  const settings=():Settings=>({method,profile:profile.value as Profile,strength:Number($<HTMLInputElement>('[data-setting="strength"]').value)/100,night:Number($<HTMLInputElement>('[data-setting="night"]').value)/100,detail:Number($<HTMLInputElement>('[data-setting="detail"]').value)/100,seed:Number($<HTMLInputElement>('#lab-seed').value),accent:accent()});
  const same=(a:Settings,b:Settings)=>['method','profile','strength','night','detail','seed'].every(k=>a[k as keyof Settings]===b[k as keyof Settings])&&JSON.stringify(a.accent)===JSON.stringify(b.accent??defaultAccent(b.profile));
  const feedback=(message:string,error=false)=>{$('[data-lab-feedback]').textContent=message;$('[data-lab-feedback]').classList.toggle('is-error',error);};
  async function api<T>(path:string,options:RequestInit={}):Promise<T>{
    const response=await fetch('/api/image-lab'+path,{...options,signal:requests.signal});
    if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('New conversions are available in the local development studio.');
    const data=await response.json();if(!response.ok)throw new Error(data.error||'The local compiler could not complete this request.');return data;
  }
  const borders=new ResizeObserver(entries=>entries.forEach(e=>{
    const el=e.target as HTMLElement,w=el.clientWidth,h=el.clientHeight,svg=el.querySelector<SVGSVGElement>(':scope>.at-frame');if(!svg||!w||!h)return;
    const geometry=frameGeometry(w,h,el.textContent?.length??0);svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.querySelectorAll('path').forEach((p,i)=>p.setAttribute('d',geometry.paths[Math.floor(i/2)]));
    const paint=el.querySelector<SVGSVGElement>('.at-wash-art');if(paint){paint.setAttribute('viewBox',`0 0 ${w} ${h}`);paint.querySelectorAll('path').forEach(p=>p.setAttribute('d',geometry.surface));}
  }));
  root.querySelectorAll<HTMLElement>('.at-button').forEach(el=>borders.observe(el));
  mountAtelierIcons(root);
  function updateControls(){
    root.querySelectorAll<HTMLButtonElement>('[data-method]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.method===method));b.disabled=busy||(b.dataset.method==='ai'&&profile.value==='interface');});
    $('.lab-inspector').querySelectorAll<HTMLInputElement|HTMLSelectElement>('input:not([type=file]),select').forEach(el=>el.disabled=busy||!available);
    root.querySelectorAll<HTMLButtonElement>('.lab-studies button').forEach(el=>el.disabled=busy);
    $<HTMLButtonElement>('[data-lab=render]').disabled=busy||!available||(!source&&!upload)||(method==='ai'&&!aiAvailable);
    $<HTMLButtonElement>('[data-lab=reset]').disabled=busy||!available;
    $('.lab-upload').setAttribute('aria-disabled',String(busy||!available));$('.lab-upload').tabIndex=busy||!available?-1:0;
    $('[data-lab-description]').textContent=descriptions[method];
    const dirty=!result||!same(settings(),result.settings);
    $('[data-lab-dirty]').textContent=busy?'Rendering the selected recipe…':dirty?'Settings changed. Render to apply.':'Showing the saved treatment.';
    $('[data-lab-dirty]').classList.toggle('is-dirty',dirty);
    const canCompare=!!result;
    scrub.disabled=!canCompare;root.querySelectorAll<HTMLButtonElement>('.lab-view-switch button,[data-lab=reveal]').forEach(b=>b.disabled=!canCompare);
    root.querySelectorAll<HTMLButtonElement>('.lab-methods button').forEach(b=>{if(!available)b.disabled=!source?.variants[b.dataset.method as Method];});
    const a=accent(),preserve=profile.value==='interface';
    $('.lab-accent').querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLButtonElement>('input,select,button').forEach(el=>el.disabled=busy||!available||preserve||(!a.enabled&&!el.hasAttribute('data-accent-enabled')));
    $('[data-accent-state]').textContent=preserve?'Preserved':a.enabled?'On':'Off';
    if((busy||preserve||!a.enabled)&&placingAccent)stopPlacement();
  }
  function applySettings(s:Settings){method=s.method;profile.value=s.profile;for(const key of ['strength','night','detail']as const){$<HTMLInputElement>(`[data-setting=${key}]`).value=String(s[key]*100);$(`[data-value=${key}]`).textContent=String(Math.round(s[key]*100));}$<HTMLInputElement>('#lab-seed').value=String(s.seed);const a=s.accent??defaultAccent(s.profile);$<HTMLInputElement>('[data-accent-enabled]').checked=a.enabled;$<HTMLSelectElement>('[data-accent-kind]').value=a.kind;$<HTMLInputElement>('[data-accent-amount]').value=String(Math.round(a.amount*100));$('[data-accent-value]').textContent=String(Math.round(a.amount*100));$<HTMLInputElement>('[data-accent-x]').value=a.x==null?'':String(Number((a.x*100).toFixed(3)));$<HTMLInputElement>('[data-accent-y]').value=a.y==null?'':String(Number((a.y*100).toFixed(3)));}
  function setView(view:string){canvas.dataset.view=view;root.querySelectorAll<HTMLButtonElement>('.lab-view-switch button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));scrub.tabIndex=view==='split'&&result?0:-1;}
  function showResult(next:Artwork|undefined){
    stopPlacement();
    result=next;canvas.setAttribute('aria-busy','true');
    if(next){artImage.src=next.image;artImage.alt=`${names[next.settings.method]} treatment of ${source?.title??'your image'}`;applySettings(next.settings);canvas.classList.add('has-result');
      $('[data-lab-result]').textContent=`${names[next.settings.method]} / ${next.settings.profile}`;
      $('[data-lab-stats]').textContent=`${next.width} × ${next.height}${next.nativeResolution?' native AI':''} · ${Math.round(next.bytes/1024)} KB JPEG · ${next.paths} source-aware paths · ${next.cacheHit?'cached in '+next.requestSeconds.toFixed(2)+' s':next.aiCacheHit?'finished cached repaint in '+next.seconds.toFixed(1)+' s':'prepared in '+next.seconds.toFixed(1)+' s'}`;
      const download=$<HTMLAnchorElement>('[data-lab-download]'),contours=$<HTMLAnchorElement>('[data-lab-contours]');download.href=next.image;download.download=`${source?.id??'my-image'}-${next.settings.method}.jpg`;download.hidden=false;contours.href=next.drawing;contours.download=`${next.name}.json`;contours.hidden=false;
      $('.lab-empty').hidden=true;setView('split');
      $('[data-accent-note]').textContent=next.accent?.applied?(next.accent.kind==='light'?'A selected light, recoloured with local bloom.':'A painted detail. Its original shading is kept.'):next.accent?.reason==='no-suitable-feature'?'No suitable detail found. The artwork is unchanged.':['place-on-a-detail','needs-object-placement'].includes(next.accent?.reason??'')?'Choose a relevant object before adding the accent.':next.accent?.reason==='disabled'?'Accent off.':next.accent?.reason==='interface-preserved'?'Interface lettering and colours are preserved.':'One existing detail. Render to apply.';
    }else{artImage.removeAttribute('src');canvas.classList.remove('has-result');$('.lab-empty').hidden=true;$('[data-lab-result]').textContent='Original / ready to treat';$('[data-lab-stats]').textContent='Render a treatment to prepare the artwork and its ink contours.';$('[data-lab-download]').hidden=true;$('[data-lab-contours]').hidden=true;setView('original');}
    updateControls();
  }
  function selectSource(id:string){
    if(busy)return;source=samples.find(s=>s.id===id);if(!source)return;
    upload=undefined;uploadId='';profile.value=source.type;originalImage.src=source.original.url;originalImage.alt=source.title;
    $('[data-lab-title]').textContent=source.title;
    $('[data-lab-credit]').innerHTML=`Source: <a href="${esc(source.source)}" target="_blank" rel="noreferrer">${esc(source.credit)}</a> · <a href="${esc(source.licenseUrl)}" target="_blank" rel="noreferrer">${esc(source.license)}</a>`;
    root.querySelectorAll<HTMLButtonElement>('[data-source]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.source===id)));
    const next=source.variants[method]??source.variants.pigment;showResult(next);feedback(available?'Prepared study loaded. Adjust the recipe or try your own image.':'Prepared study loaded. New conversions need the local development server.');
  }
  function chooseMethod(next:Method){if(busy)return;method=next;const baked=source?.variants[next];if(baked){showResult(baked);feedback('Showing the prepared '+names[next]+' treatment.');}else updateControls();}
  const onImage=()=>{canvas.setAttribute('aria-busy','false');};
  originalImage.addEventListener('load',onImage);artImage.addEventListener('load',onImage);
  const imageError=()=>{canvas.setAttribute('aria-busy','false');feedback('This prepared image could not load. Reopen the study or render it again.',true);};
  originalImage.addEventListener('error',imageError);artImage.addEventListener('error',imageError);
  async function poll(){
    if(!jobId||disposed)return;
    try{const job=await api<Job>('/jobs/'+jobId);if(disposed)return;
      $<HTMLProgressElement>('.lab-job progress').value=job.progress;$('[data-job-status]').textContent=job.message;
      if(['queued','running'].includes(job.state)){timer=window.setTimeout(poll,500);return;}
      busy=false;jobId='';$('.lab-job').hidden=true;
      if(job.state==='complete'&&job.result){showResult(job.result);feedback(job.result.cacheHit?'Loaded the identical recipe from cache.':job.result.aiCacheHit?`Finished the cached repaint in ${job.result.seconds.toFixed(1)} s. Artwork and contours saved locally.`:`Ready in ${job.result.seconds.toFixed(1)} s. Artwork and contours saved locally.`);}
      else{feedback(job.message,job.state==='error');updateControls();}
    }catch(error){if(disposed)return;busy=false;$('.lab-job').hidden=true;feedback((error as Error).message,true);updateControls();}
  }
  async function render(){
    if(busy||!available)return;const s=settings();
    if(!$<HTMLInputElement>('#lab-seed').checkValidity()||!Number.isInteger(s.seed)){feedback('Choose a whole variation number from 0 to 2147483647.',true);return;}
    if((s.accent.x==null)!==(s.accent.y==null)||!['x','y'].every(k=>$<HTMLInputElement>(`[data-accent-${k}]`).checkValidity())){feedback('Choose both accent coordinates from 0 to 100, or use Auto.',true);return;}
    busy=true;updateControls();feedback('The image stays local. You can keep comparing while it renders.');
    try{const job=await api<Job>('/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:source?.id??uploadId,settings:s})});if(disposed){void fetch('/api/image-lab/jobs/'+job.id,{method:'DELETE'});return;}jobId=job.id;$('.lab-job').hidden=false;$<HTMLProgressElement>('.lab-job progress').value=0;$('[data-job-status]').textContent=job.message;void poll();}
    catch(error){if(!disposed){busy=false;feedback((error as Error).message,true);updateControls();}}
  }
  async function uploadFile(file:File){
    if(!available||busy)return;if(file.size>20*1024*1024){feedback('Choose a file under 20 MB.',true);return;}
    busy=true;updateControls();feedback('Preparing your image locally…');
    try{const data=await api<{id:string;original:Original}>('/upload',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});if(disposed)return;
      source=undefined;upload=data.original;uploadId=data.id;originalImage.src=upload.url;originalImage.alt=file.name;$('[data-lab-title]').textContent=file.name;$('[data-lab-credit]').textContent='Your image · processed only on this computer.';
      applySettings({...settings(),accent:defaultAccent(settings().profile)});
      root.querySelectorAll<HTMLButtonElement>('[data-source]').forEach(b=>b.setAttribute('aria-pressed','false'));busy=false;showResult(undefined);feedback('Choose the subject and treatment, then render.');
    }catch(error){if(!disposed){busy=false;feedback((error as Error).message,true);updateControls();}}
    $<HTMLInputElement>('.lab-upload input').value='';
  }
  const fitReveal=()=>{const stage=$('.lab-reveal-stage'),w=stage.clientWidth-24,h=stage.clientHeight-24;if(w<=0||h<=0)return;const width=Math.min(w,h*revealRatio);stage.style.setProperty('--reveal-w',width+'px');stage.style.setProperty('--reveal-h',width/revealRatio+'px');};
  const revealResize=new ResizeObserver(fitReveal);revealResize.observe($('.lab-reveal-stage'));
  function closeReveal(){actor?.destroy();actor=undefined;if(dialog.open)dialog.close();$('.lab-reveal-stage').replaceChildren();document.documentElement.style.overflow=scroll;lastFocus?.focus();}
  function stopPlacement(){placingAccent=false;canvas.classList.remove('is-placing');$('[data-lab=place-accent]').setAttribute('aria-pressed','false');}
  function placeAccent(event:MouseEvent){if(!placingAccent)return;event.preventDefault();const im=result?artImage:originalImage,rect=canvas.getBoundingClientRect();const scale=Math.min(rect.width/im.naturalWidth,rect.height/im.naturalHeight),w=im.naturalWidth*scale,h=im.naturalHeight*scale,left=rect.left+(rect.width-w)/2,top=rect.top+(rect.height-h)/2,x=(event.clientX-left)/w,y=(event.clientY-top)/h;if(!Number.isFinite(x)||x<0||x>1||y<0||y>1){feedback('Choose a point inside the image.',true);return;}$<HTMLInputElement>('[data-accent-x]').value=String(Number((x*100).toFixed(3)));$<HTMLInputElement>('[data-accent-y]').value=String(Number((y*100).toFixed(3)));stopPlacement();$('[data-accent-note]').textContent='Placement saved. Render to apply the accent.';updateControls();}
  function openReveal(){
    if(!result||dialog.open)return;lastFocus=document.activeElement as HTMLElement;scroll=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
    $('.lab-reveal-stage').innerHTML='<canvas role="img" aria-label="Converted painting drawn in ink, then filled with pigment"></canvas>';$('[data-reveal-title]').textContent=source?.title??'Your artwork';$('[data-reveal-status]').textContent='Preparing the ink…';revealRatio=result.width/result.height;dialog.showModal();fitReveal();
    actor=new Hero($<HTMLCanvasElement>('.lab-reveal-stage canvas'),[result.name],{auto:false,parallax:true,pauseOnHover:false,theatre:true,feather:'none'});
    const current=actor;current.onFrame=(_t,phase)=>{if(current!==actor)return;const copy:Record<string,string>={drawing:'Drawing the image’s contours',morphing:'From ink into pigment',settling:'Letting the colour settle',alive:'Move across the painting to explore'};const text=copy[phase]??'Preparing the ink…';if($('[data-reveal-status]').textContent!==text)$('[data-reveal-status]').textContent=text;};
    current.ready.catch(()=>{if(current===actor)$('[data-reveal-status]').textContent='The ink preview could not load. Close and render the image again.';});$('[data-lab=close]').focus();
  }
  const onInput=(event:Event)=>{const input=event.target as HTMLInputElement;
    if(input===scrub){canvas.style.setProperty('--split',scrub.value+'%');scrub.setAttribute('aria-valuetext',`${scrub.value} percent original, ${100-Number(scrub.value)} percent artwork`);return;}
    if(input.dataset.setting){$(`[data-value=${input.dataset.setting}]`).textContent=input.value;updateControls();}
    if(input.id==='lab-seed')updateControls();
    if(input.hasAttribute('data-accent-amount')){$('[data-accent-value]').textContent=input.value;updateControls();}
    if(input.hasAttribute('data-accent-x')||input.hasAttribute('data-accent-y'))updateControls();
  };
  const onChange=(event:Event)=>{if(event.target===profile){if(profile.value==='interface'&&method==='ai')method='pigment';updateControls();}if(event.target===$('.lab-upload input')){const file=$<HTMLInputElement>('.lab-upload input').files?.[0];if(file)void uploadFile(file);}if((event.target as Element).matches('[data-accent-enabled],[data-accent-kind]'))updateControls();};
  const onClick=(event:Event)=>{
    const target=(event.target as Element).closest<HTMLElement>('button,[data-lab]');if(!target)return;
    if(target.dataset.source){selectSource(target.dataset.source);return;}if(target.dataset.method){chooseMethod(target.dataset.method as Method);return;}
    if(target.dataset.view){stopPlacement();setView(target.dataset.view);return;}
    const action=target.dataset.lab;
    if(action==='render')void render();
    if(action==='reset'){const p=source?.type??settings().profile;applySettings({method,profile:p,strength:.65,night:.65,detail:.65,seed:241,accent:source?.variants[method]?.settings.accent??defaultAccent(p)});stopPlacement();updateControls();}
    if(action==='place-accent'&&!busy&&available){if(placingAccent){stopPlacement();return;}placingAccent=true;setView(result?'artwork':'original');canvas.classList.add('is-placing');target.setAttribute('aria-pressed','true');$('[data-accent-note]').textContent='Pick a light or small detail on the image. Numeric placement also works.';feedback('Placement only. The saved artwork changes when you render.');}
    if(action==='auto-accent'){$<HTMLInputElement>('[data-accent-x]').value='';$<HTMLInputElement>('[data-accent-y]').value='';$<HTMLSelectElement>('[data-accent-kind]').value='auto';stopPlacement();$('[data-accent-note]').textContent='Only an existing red detail will be strengthened. Otherwise, the image stays unchanged.';updateControls();}
    if(action==='cancel'&&jobId){$<HTMLButtonElement>('[data-lab=cancel]').disabled=true;void api('/jobs/'+jobId,{method:'DELETE'}).catch(error=>feedback((error as Error).message,true)).finally(()=>{if(!disposed)$<HTMLButtonElement>('[data-lab=cancel]').disabled=false;});}
    if(action==='reveal')openReveal();if(action==='close')closeReveal();if(action==='replay')actor?.replay();
  };
  const uploadClick=(event:Event)=>{if(event.target!==$('.lab-upload input')&&available&&!busy)$<HTMLInputElement>('.lab-upload input').click();};
  const uploadKey=(event:KeyboardEvent)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();uploadClick(event);}};
  const drag=(event:DragEvent)=>{event.preventDefault();if(available&&!busy)$('.lab-upload').classList.add('is-dragging');};
  const leave=()=>$('.lab-upload').classList.remove('is-dragging');
  const drop=(event:DragEvent)=>{event.preventDefault();leave();const file=event.dataTransfer?.files[0];if(file)void uploadFile(file);};
  const cancelDialog=(event:Event)=>{event.preventDefault();closeReveal();};
  const escapePlacement=(event:KeyboardEvent)=>{if(event.key==='Escape'&&placingAccent){stopPlacement();feedback('Placement cancelled.');}};
  root.addEventListener('click',onClick);root.addEventListener('input',onInput);root.addEventListener('change',onChange);dialog.addEventListener('cancel',cancelDialog);
  canvas.addEventListener('click',placeAccent);root.addEventListener('keydown',escapePlacement);
  $('.lab-upload').addEventListener('click',uploadClick);$('.lab-upload').addEventListener('keydown',uploadKey);$('.lab-upload').addEventListener('dragover',drag);$('.lab-upload').addEventListener('dragleave',leave);$('.lab-upload').addEventListener('drop',drop);
  async function init(){
    const [manifest,status]=await Promise.allSettled([fetch('/image-lab/manifest.json',{signal:requests.signal}).then(r=>{if(!r.ok)throw new Error('Prepared studies are missing. Run npm run prepare:images.');return r.json() as Promise<{samples:Sample[]}>;}),api<{available:boolean;ai:boolean}>('/status')]);
    if(disposed)return;
    if(status.status==='fulfilled'){available=status.value.available;aiAvailable=status.value.ai;}
    $('[data-lab-local]').textContent=available?'Files stay on this computer. No paid API.':'Prepared study · new conversions need npm run dev.';
    feedback(available?(aiAvailable?'Local compiler ready · Apple GPU when available.':'CPU compiler ready · run npm run images:setup for AI.'):'Prepared studies are available. Start the local development server to convert your own images.');
    if(manifest.status==='rejected'){canvas.setAttribute('aria-busy','false');$('.lab-empty').textContent=manifest.reason.message;feedback(manifest.reason.message,true);updateControls();return;}
    samples=manifest.value.samples;
    $('.lab-studies').innerHTML=samples.map((s,i)=>`<button data-source="${esc(s.id)}" aria-pressed="false"><img src="${esc(s.original.url)}" alt="" loading="lazy"><span><small>0${i+1} / ${s.type==='still-life'?'Still life':s.type}</small>${esc(({street:'Shinjuku',portrait:'Portrait','still-life':'Still life',interface:'Interface'} as Record<string,string>)[s.id]??s.title)}</span></button>`).join('');
    selectSource(samples[0].id);
  }
  void init().catch(error=>{if(!disposed)feedback(error.message,true);});
  return()=>{disposed=true;requests.abort();clearTimeout(timer);borders.disconnect();revealResize.disconnect();if(jobId)void fetch('/api/image-lab/jobs/'+jobId,{method:'DELETE',keepalive:true}).catch(()=>{});if(dialog.open)closeReveal();else actor?.destroy();root.removeEventListener('click',onClick);root.removeEventListener('input',onInput);root.removeEventListener('change',onChange);canvas.removeEventListener('click',placeAccent);root.removeEventListener('keydown',escapePlacement);};
}
