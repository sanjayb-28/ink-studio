import {TravelInk,project,at,pigment,type Window} from './travel-ink';
import {smooth,type EngineId,type Layer,type Study} from './material-score';
import {InkLens} from './ink-lens.ts';
const surface=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const context=(c:HTMLCanvasElement)=>c.getContext('2d')!;
type Mark={matrix:number[];color:string;seed:number;stroke:number;u:number;distance:number};
type Tip={path:Path2D;wash:HTMLCanvasElement};
export type Prepared={image:HTMLImageElement;data:Study;key:HTMLImageElement;warm:HTMLImageElement;cool:HTMLImageElement;grain:HTMLImageElement;marks:Mark[]};
const cache=new Map<string,Promise<Prepared>>();
let tips:Tip[]|undefined;
function brushTips(){if(tips)return tips;tips=Array.from({length:32},(_,seed)=>{
 const path=new Path2D();for(let j=0;j<=20;j++){const a=j/20*Math.PI*2,r=.82+.1*Math.sin(j*2.7+seed)+.07*Math.cos(j*4.2+seed);if(j)path.lineTo(Math.cos(a)*r,Math.sin(a)*r);else path.moveTo(Math.cos(a)*r,Math.sin(a)*r);}path.closePath();
 const wash=surface(64,64),c=context(wash);c.setTransform(30,0,0,30,32,32);const g=c.createRadialGradient(0,0,.08,0,0,1);g.addColorStop(0,'#fff');g.addColorStop(.6,'#ffffffd0');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fill(path);return{path,wash};
 });return tips;}
function loadImage(src:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('The painting could not be loaded.'));im.src=src;});}
export function prepareStudy(name:string):Promise<Prepared>{
 if(!cache.has(name))cache.set(name,Promise.all([
  fetch(`/studies/${name}.json`).then(r=>{if(!r.ok)throw Error('The drawing could not be loaded.');return r.json() as Promise<Study>;}),
  loadImage(`/paint/${name}.jpg`),loadImage(`/studies/${name}-key.webp`),loadImage(`/studies/${name}-warm.webp`),loadImage(`/studies/${name}-cool.webp`),loadImage('/studies/grain.png')
 ]).then(([data,image,key,warm,cool,grain])=>({data,image,key,warm,cool,grain,marks:data.dabs.filter((_,i)=>i%Math.ceil(data.dabs.length/1800)===0).map(d=>{const c=Math.cos(d[2]),s=Math.sin(d[2]);return{matrix:[d[3]*1.55*c,d[3]*1.55*s,-d[4]*1.55*s,d[4]*1.55*c,d[0],d[1]],color:`rgb(${d[5]} ${d[6]} ${d[7]})`,seed:d[9],stroke:d[10],u:d[11],distance:d[12]??0};})})).catch(e=>{cache.delete(name);throw e;}));return cache.get(name)!;
}
type Event={at:number;mark:number;stage:number};
const queues=new WeakMap<TravelInk,Event[]>();
function paintQueue(flow:TravelInk,marks:Mark[]){let events=queues.get(flow);if(events)return events;events=[];
 marks.forEach((m,i)=>{const birth=flow.arrivalTime(m.stroke,m.u)+.2+Math.min(.9,m.distance/70);events!.push({at:birth,mark:i,stage:0},{at:birth+flow.absorb*.45,mark:i,stage:1},{at:birth+flow.absorb,mark:i,stage:2});});
 events.sort((a,b)=>a.at-b.at);queues.set(flow,events);return events;
}
export class MaterialRenderer{
 private ctx:CanvasRenderingContext2D;private art?:Prepared;private prior?:HTMLCanvasElement;private flow?:TravelInk;
 private pigment=surface(1,1);private mask=surface(1,1);private wetMask=surface(1,1);private bloomMask=surface(1,1);private imageLayer=surface(1,1);private scene=surface(1,1);private hoverLayer=surface(1,1);private hoverMask=surface(1,1);private vapor=surface(1,1);
 private queue:Event[]=[];private cursor=0;private paintTime=-1;private deposited=0;private w=1;private h=1;private dpr=1;
 private scale=1;private ox=0;private oy=0;private time=0;private disposed=false;private traces:{x:number;y:number;birth:number}[]=[];private pointerWall=0;private resize:ResizeObserver;private off:(()=>void)[]=[];private currentLayer:Layer='all';
 private lens=new InkLens();private inkCache=surface(1,1);private glowCache=surface(1,1);private lensTile=surface(1,1);private lensMask=surface(1,1);private glowFlow?:TravelInk;private lensOpacity=0;
 public renderMs=0;public onPointer?:()=>void;
 get duration(){return this.flow?.duration??16;}get completeAt(){return this.flow?.completeAt??12;}get cues(){return this.flow?.cues??[0,.6,1.3,4,7,9,12];}get choreography(){return this.flow;}get progress(){return this.flow?.score(this.time);}
 get hasHoverPaint(){return this.id==='fude'&&this.lensOpacity>.001;}
 constructor(readonly canvas:HTMLCanvasElement,readonly id:EngineId){
  canvas.classList.add('material-canvas');this.ctx=context(canvas);this.resize=new ResizeObserver(()=>{this.fit();if(this.art)this.render(this.time,this.pointerWall,this.currentLayer);});this.resize.observe(canvas);this.fit();
  const pointer=(event:PointerEvent)=>{if(matchMedia('(prefers-reduced-motion:reduce)').matches||!this.art)return;const r=canvas.getBoundingClientRect(),now=performance.now()/1000;
   if(this.id==='fude')this.lens.move(event.clientX-r.left,event.clientY-r.top,now);
   else{this.traces.push({x:(event.clientX-r.left-this.ox)/this.scale,y:(event.clientY-r.top-this.oy)/this.scale,birth:now});if(this.traces.length>8)this.traces.shift();}this.onPointer?.();};
  const leave=()=>{this.lens.leave(performance.now()/1000);this.onPointer?.();};const release=(event:PointerEvent)=>{if(event.pointerType!=='mouse')leave();};
  for(const name of ['pointerenter','pointermove','pointerdown'])canvas.addEventListener(name,pointer as EventListener);
  for(const name of ['pointerleave','pointercancel'])canvas.addEventListener(name,leave);
  canvas.addEventListener('pointerup',release);this.off.push(()=>{for(const name of ['pointerenter','pointermove','pointerdown'])canvas.removeEventListener(name,pointer as EventListener);for(const name of ['pointerleave','pointercancel'])canvas.removeEventListener(name,leave);canvas.removeEventListener('pointerup',release);});
 }
 private fit(){const w=Math.max(1,this.canvas.clientWidth),h=Math.max(1,this.canvas.clientHeight),dpr=2;if(w===this.w&&h===this.h&&Math.abs(dpr-this.dpr)<.01)return;this.w=w;this.h=h;this.dpr=dpr;this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}
 setArt(next:Prepared,transition=true,shared?:TravelInk){
  let source,oldAlpha=0;if(this.art&&this.flow&&transition){this.prior=surface(this.canvas.width,this.canvas.height);context(this.prior).drawImage(this.canvas,0,0);if(!shared)source=project(this.flow.current(this.time),[this.art.data.width,this.art.data.height],[next.data.width,next.data.height],[this.w,this.h]);oldAlpha=this.currentLayer==='ink'?1:this.flow.opacity(this.time);}else this.prior=undefined;
  this.flow=shared??new TravelInk(next.data,source,oldAlpha);this.art=next;this.time=0;this.traces=[];this.lens.clear();this.cursor=0;this.deposited=0;this.paintTime=-1;this.queue=paintQueue(this.flow,next.marks);brushTips();
  for(const c of [this.pigment,this.mask,this.wetMask,this.bloomMask,this.imageLayer,this.scene,this.hoverLayer,this.hoverMask,this.vapor]){c.width=next.data.width;c.height=next.data.height;}return this.flow;
 }
 replay(shared?:TravelInk){if(this.art){this.flow=shared??new TravelInk(this.art.data);this.queue=paintQueue(this.flow,this.art.marks);}this.prior=undefined;this.paintTime=-1;this.traces=[];return this.flow;}
 private advancePaint(t:number){
  const a=this.art!,p=context(this.pigment),mask=context(this.mask),wet=context(this.wetMask),bloom=context(this.bloomMask);
  if(t<this.paintTime||this.paintTime<0){for(const c of [p,mask,wet,bloom]){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,a.data.width,a.data.height);}this.cursor=0;this.deposited=0;}
  const tips=brushTips(),events:Event[]=[];while(this.cursor<this.queue.length&&this.queue[this.cursor].at<=t)events.push(this.queue[this.cursor++]);
  // Batch each destination surface. Alternating four GPU-backed contexts per stamp
  // forces costly synchronization during a large region's first arrival.
  for(const e of events){const m=a.marks[e.mark],tip=tips[Math.floor(m.seed*31.99)],v=m.matrix,grow=[.72,1.28,1.9][e.stage];p.setTransform(v[0]*grow,v[1]*grow,v[2]*grow,v[3]*grow,v[4],v[5]);p.fillStyle=m.color;p.globalAlpha=[.48,.19,.11][e.stage];p.fill(tip.path);if(e.stage===0)this.deposited++;}
  for(const [c,minStage,alpha]of [[mask,0,0],[wet,1,.65],[bloom,2,.8]] as const){for(const e of events){if(e.stage<minStage)continue;const m=a.marks[e.mark],tip=tips[Math.floor(m.seed*31.99)],v=m.matrix,grow=[.72,1.28,1.9][e.stage];c.setTransform(v[0]*grow,v[1]*grow,v[2]*grow,v[3]*grow,v[4],v[5]);c.globalAlpha=alpha||[.5,.45,.55][e.stage];c.drawImage(tip.wash,-1,-1,2,2);}}
  for(const c of [p,mask,wet,bloom]){c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;}this.paintTime=t;
 }
 private maskedImage(source:CanvasImageSource,mask:HTMLCanvasElement){const{width:w,height:h}=this.art!.data,c=context(this.imageLayer);c.clearRect(0,0,w,h);c.globalCompositeOperation='source-over';c.drawImage(source,0,0,w,h);c.globalCompositeOperation='destination-in';c.drawImage(mask,0,0);c.globalCompositeOperation='source-over';return this.imageLayer;}
 private ink(c:CanvasRenderingContext2D,t:number,opacity:number){this.flow?.draw(c,t,this.id,opacity,this.currentLayer==='ink',Math.max(this.w/this.art!.data.width,this.h/this.art!.data.height));}
 private fude(c:CanvasRenderingContext2D,t:number,layer:Layer){const s=this.flow!.score(t),a=this.art!,{width:w,height:h}=a.data;
  if(layer!=='ink'){c.drawImage(this.pigment,0,0);c.globalAlpha=.86;c.drawImage(this.maskedImage(a.image,this.wetMask),0,0);c.globalAlpha=.7;c.drawImage(this.maskedImage(a.image,this.bloomMask),0,0);c.globalAlpha=s.settle;c.drawImage(this.maskedImage(a.image,this.bloomMask),0,0);c.globalAlpha=smooth((s.settle-.65)/.35);c.drawImage(a.image,0,0,w,h);c.globalAlpha=1;}
 }
 private block(c:CanvasRenderingContext2D,t:number,layer:Layer){const s=this.flow!.score(t),a=this.art!,offset=(1-s.bleed)*5,dir=this.flow!.direction;
  if(layer!=='ink'){c.globalAlpha=.95;c.drawImage(this.maskedImage(a.key,this.mask),0,0);c.globalCompositeOperation='screen';c.globalAlpha=.7;c.drawImage(this.maskedImage(a.cool,this.wetMask),-dir[0]*offset,-dir[1]*offset);c.globalAlpha=.62;c.drawImage(this.maskedImage(a.warm,this.bloomMask),dir[0]*offset,dir[1]*offset);c.globalCompositeOperation='source-over';c.globalAlpha=s.settle;c.drawImage(a.image,0,0,a.data.width,a.data.height);c.globalAlpha=1;}
 }
 private smoke(target:CanvasRenderingContext2D,t:number,windows:Window[]){const{width,height}=this.art!.data,c=context(this.vapor);c.clearRect(0,0,width,height);c.lineCap='round';
  windows.forEach((w,i)=>{if(i%4||w.arrival>=.995||w.end<1)return;const tip=at(w.route,w.end),back=at(w.route,Math.max(w.start,w.end-18)),dx=tip.x-back.x,dy=tip.y-back.y,len=Math.hypot(dx,dy)||1,color=pigment(tip.rgb,i);c.strokeStyle=`rgb(${color.map(Math.round).join(' ')})`;c.globalAlpha=.055;c.lineWidth=6;c.beginPath();c.moveTo(tip.x,tip.y);c.bezierCurveTo(tip.x-dx/len*14,tip.y-dy/len*14-5,tip.x-dx/len*28-dy/len*8,tip.y-dy/len*28+dx/len*8-12,tip.x-dx/len*42,tip.y-dy/len*42-22);c.stroke();});c.globalAlpha=1;target.drawImage(this.vapor,0,0);
 }
 private haze(c:CanvasRenderingContext2D,t:number,layer:Layer){const flow=this.flow!,s=flow.score(t),a=this.art!,{width:w,height:h}=a.data;
  if(layer!=='ink'){const image=this.maskedImage(a.image,this.mask),amplitude=Math.sin(Math.PI*s.bleed)*(1-s.settle)*5,focus=flow.focus[1]*h,dir=flow.direction;
   if(amplitude>.2){for(let y=0;y<h;y+=4){const dx=Math.sin((y-focus)*.045-t*.65)*amplitude*(.35+Math.abs(dir[0]));c.drawImage(image,0,y,w,Math.min(4,h-y),dx,y,w,Math.min(4,h-y));}}else c.drawImage(image,0,0);
   c.globalAlpha=s.settle;c.drawImage(a.image,0,0,w,h);c.globalAlpha=1;
  }
  if(layer==='all')this.smoke(c,t,flow.windows(t));
 }
 private prepareGlow(){
  if(this.id!=='fude'||this.glowFlow===this.flow&&this.glowCache.width===this.canvas.width&&this.glowCache.height===this.canvas.height)return;
  this.glowFlow=this.flow;for(const canvas of [this.inkCache,this.glowCache]){canvas.width=this.canvas.width;canvas.height=this.canvas.height;}
  const ink=context(this.inkCache);ink.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,this.ox*this.dpr,this.oy*this.dpr);this.flow!.draw(ink,this.flow!.completeAt,'fude',1,true,this.scale,1.6);
  const glow=context(this.glowCache);glow.globalAlpha=.35;glow.filter=`blur(${6*this.dpr}px) saturate(1.6) brightness(1.5)`;glow.drawImage(this.inkCache,0,0);glow.globalAlpha=.8;glow.filter=`blur(${.8*this.dpr}px) brightness(1.6)`;glow.drawImage(this.inkCache,0,0);glow.filter='brightness(1.5)';glow.globalAlpha=1;glow.drawImage(this.inkCache,0,0);glow.filter='none';
  const size=Math.ceil(InkLens.radius*2*this.dpr);for(const canvas of [this.lensMask,this.lensTile]){canvas.width=size;canvas.height=size;}
  const mask=context(this.lensMask),r=size/2,g=mask.createRadialGradient(r,r,r*.25,r,r,r*.75);g.addColorStop(0,'#fff');g.addColorStop(1,'#ffffff00');mask.fillStyle=g;mask.fillRect(0,0,size,size);
 }
 private fudeInteraction(c:CanvasRenderingContext2D,t:number,wall:number){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)this.lens.clear();this.lensOpacity=this.lens.opacity(wall);if(t<this.completeAt||this.lensOpacity<.001)return;
  const r=InkLens.radius,x=this.lens.x-r,y=this.lens.y-r,tile=context(this.lensTile);tile.clearRect(0,0,this.lensTile.width,this.lensTile.height);tile.drawImage(this.glowCache,-x*this.dpr,-y*this.dpr);tile.globalCompositeOperation='destination-in';tile.drawImage(this.lensMask,0,0);tile.globalCompositeOperation='source-over';
  c.save();c.setTransform(this.dpr,0,0,this.dpr,0,0);c.globalAlpha=this.lensOpacity;c.globalCompositeOperation='screen';c.drawImage(this.lensTile,x,y,r*2,r*2);c.restore();
 }
 private interaction(c:CanvasRenderingContext2D,t:number,wall:number){if(t<this.flow!.drawEnd||!this.traces.length)return;const a=this.art!,{width:w,height:h}=a.data,m=context(this.hoverMask),v=context(this.hoverLayer);m.clearRect(0,0,w,h);this.traces=this.traces.filter(p=>wall-p.birth<1.6);
  for(const p of this.traces){const age=wall-p.birth,r=34+Math.sin(age*3)*8;m.globalAlpha=Math.exp(-age*2.3);const g=m.createRadialGradient(p.x,p.y,3,p.x,p.y,r);g.addColorStop(0,'#fff');g.addColorStop(1,'transparent');m.fillStyle=g;m.beginPath();m.ellipse(p.x,p.y,r,r*.8,-.4,0,Math.PI*2);m.fill();}m.globalAlpha=1;v.clearRect(0,0,w,h);
  if(this.id==='block')v.drawImage(a.key,0,0);else if(this.id==='fude'){v.fillStyle='#080908';v.fillRect(0,0,w,h);}else{const p=this.traces.at(-1);if(p){for(let y=0;y<h;y+=4){const f=Math.exp(-Math.pow((y-p.y)/65,2))*Math.exp(-(wall-p.birth)*2)*8;v.drawImage(a.image,0,y,w,Math.min(4,h-y),Math.sin((y-p.y)*.12-wall*7)*f,y,w,Math.min(4,h-y));}}}
  v.globalCompositeOperation='destination-in';v.drawImage(this.hoverMask,0,0);v.globalCompositeOperation='source-over';c.drawImage(this.hoverLayer,0,0);
 }
 render(t:number,wall:number,layer:Layer='all'){if(!this.art||!this.flow||this.disposed)return;const started=performance.now();this.fit();this.time=t;this.pointerWall=wall;this.currentLayer=layer;
  const a=this.art,{width:w,height:h}=a.data,s=context(this.scene),state=this.flow.score(t);this.scale=Math.max(this.w/w,this.h/h);this.ox=(this.w-w*this.scale)/2;this.oy=(this.h-h*this.scale)*.5;
  if(layer!=='ink'&&!state.hold)this.advancePaint(t);const afterPaint=performance.now();s.clearRect(0,0,w,h);s.globalCompositeOperation='source-over';s.globalAlpha=1;
  const finalPhoto=layer==='all'&&state.settle>=1;if(finalPhoto){}else if(this.id==='fude')this.fude(s,t,layer);else if(this.id==='block')this.block(s,t,layer);else this.haze(s,t,layer);
  if(layer==='all'&&this.id!=='fude')this.interaction(s,t,wall);const afterMaterial=performance.now();  const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.w,this.h);if(finalPhoto)c.drawImage(a.image,this.ox,this.oy,w*this.scale,h*this.scale);if(this.prior&&state.settle<1&&layer==='all'){const k=Math.max(this.w/this.prior.width,this.h/this.prior.height),pw=this.prior.width*k,ph=this.prior.height*k;c.globalAlpha=(1-state.brush)*.78+.22*(1-state.settle);c.drawImage(this.prior,(this.w-pw)/2,(this.h-ph)*.5,pw,ph);c.globalAlpha=1;}c.drawImage(this.scene,this.ox,this.oy,w*this.scale,h*this.scale);
  this.prepareGlow();if(this.id==='fude'&&layer==='all'&&state.charge>.001){c.save();c.globalCompositeOperation='screen';c.globalAlpha=state.charge*.9;c.drawImage(this.glowCache,0,0,this.w,this.h);c.restore();}
  // Pigment is raster material; ink stays vector until the display-resolution
  // canvas. Never enlarge a 720px rasterized pen stroke with the paint.
  c.save();c.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,this.ox*this.dpr,this.oy*this.dpr);
  if(layer!=='pigment'&&!finalPhoto){this.ink(c,t,this.id==='block'?.98:1);if(layer==='all'&&this.id!=='block')this.flow.drawRetouch(c,t,this.id,this.scale);}
  c.restore();if(layer==='all'&&this.id==='fude')this.fudeInteraction(c,t,wall);
  this.renderMs=performance.now()-started;this.canvas.dataset.profile=JSON.stringify({paint:+(afterPaint-started).toFixed(2),material:+(afterMaterial-afterPaint).toFixed(2),composite:+(performance.now()-afterMaterial).toFixed(2)});Object.assign(this.canvas.dataset,{time:t.toFixed(3),engine:this.id,renderMs:this.renderMs.toFixed(2),wake:String(this.traces.length),dabs:String(this.deposited),duration:this.duration.toFixed(2),ink:state.pen.toFixed(3),color:state.brush.toFixed(3),bloom:state.bleed.toFixed(3),charge:state.charge.toFixed(3),settle:state.settle.toFixed(3),lineModel:'native-pressure-ribbons',inkResolution:`${this.canvas.width}×${this.canvas.height}`,paintResolution:`${w}×${h}`,pixelRatio:this.dpr.toFixed(2),lensActive:String(this.lens.active),lensOpacity:this.lensOpacity.toFixed(3),lensCenter:`${this.lens.x.toFixed(1)},${this.lens.y.toFixed(1)}`,hoverDimming:'0',revealModel:this.id==='fude'?'stroke-led-regional-wash':'regional-plates',inkColors:'2',contours:String(a.data.strokes.length),paths:String(this.flow.routes.length),samples:String(this.flow.routes.reduce((n,r)=>n+r.points.length,0)),coreCss:String(this.flow.isTransition?1.2:1.4),hoverModel:this.id==='fude'?'additive-ink-only':'pigment-trail'});
 }
 destroy(){this.disposed=true;this.resize.disconnect();this.off.forEach(f=>f());this.traces=[];this.prior=undefined;this.art=undefined;}
}
