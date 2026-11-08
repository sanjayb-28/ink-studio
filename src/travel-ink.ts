import type {Point,Study,EngineId} from './material-score';
import {pressureRibbon} from './ink-nib.ts';
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{v=clamp(v);return v*v*(3-2*v);};
const cubic=(v:number)=>{v=clamp(v);return v<.5?4*v*v*v:1-Math.pow(-2*v+2,3)/2;};
export const PEN_PATHS=48,PATH_SAMPLES=200;
export type RGB=[number,number,number];
export type Nib={x:number;y:number;move:boolean;rgb:RGB;stroke:number;u:number;d:number};
export type Route={points:Nib[];length:number;id:number;seed:number};
export type Journey={route:Route;source:number;bridge:number;target:number;id:number};
export type Window={route:Route;start:number;end:number;arrival:number;targetStart:number;id:number};
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(b.x-a.x,b.y-a.y);
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
function measure(points:Nib[],id:number,seed:number):Route{let d=0;for(let i=0;i<points.length;i++){if(i&&!points[i].move)d+=distance(points[i-1],points[i]);points[i].d=d;}return{points,length:d,id,seed};}
const clone=(p:Nib):Nib=>({...p,rgb:[...p.rgb]});
export function at(route:Route,d:number):Nib{
 d=Math.max(0,Math.min(route.length,d));const points=route.points;let lo=1,hi=points.length-1;while(lo<hi){const m=(lo+hi)>>1;if(points[m].d<d)lo=m+1;else hi=m;}
 const a=points[lo-1]??points[0],b=points[lo]??a,t=b.move?0:clamp((d-a.d)/(b.d-a.d||1));return{x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),move:false,rgb:a.rgb.map((v,i)=>lerp(v,b.rgb[i],t)) as RGB,stroke:b.stroke,u:lerp(a.u,b.u,t),d};
}
export function slice(route:Route,start:number,end:number):Route{
 start=Math.max(0,start);end=Math.min(route.length,end);const points:Nib[]=[];
 if(end<=start){const p=at(route,start);p.move=true;return measure([p,{...p}],route.id,route.seed);}
 const first=at(route,start);first.move=true;points.push(first);
 for(const p of route.points)if((p.d>start||p.d===start&&p.move)&&p.d<end)points.push(clone(p));points.push(at(route,end));return measure(points,route.id,route.seed);
}
export function reverse(route:Route):Route{
 const p=route.points.map(clone).reverse();p.forEach((v,i)=>v.move=i===0||route.points[route.points.length-i]?.move===true);return measure(p,route.id,route.seed);
}
export function makeRoutes(study:Study,count=PEN_PATHS,refinement=.45):Route[]{
 const remaining=new Set(study.strokes.map((_,i)=>i)),ordered:{id:number;points:Nib[];length:number;seed:number}[]=[];
 const focus=study.motion?.focus??[.48,.52];let cursor={x:study.width*focus[0],y:study.height*focus[1]};
 while(remaining.size){let best=Infinity,pick=0,back=false;
  for(const i of remaining){const s=study.strokes[i],pts=s.ink??s.points,a=pts[0],b=pts.at(-1)!;for(const [v,rev]of [[a,false],[b,true]] as const){const d=Math.hypot(v[0]-cursor.x,v[1]-cursor.y);if(d<best){best=d;pick=i;back=rev;}}}
  const s=study.strokes[pick],raw=s.ink??s.points,colors=s.inkRGB??s.rgb;
  let points=raw.map((p,i)=>({x:p[0],y:p[1],move:i===0,rgb:(colors[i]??colors[0]) as RGB,stroke:pick,u:s.inkU?.[i]??i/(raw.length-1),d:0}));
  if(back)points=points.reverse().map((p,i)=>({...p,move:i===0}));const route=measure(points,pick,s.seed);ordered.push({id:pick,points,length:route.length,seed:s.seed});cursor=points.at(-1)!;remaining.delete(pick);
 }
 const continuous=measure(ordered.flatMap(s=>s.points.map(clone)),0,0),routes:Route[]=[];let cursorIndex=0,previousStroke=-1;
 for(let lane=0;lane<count;lane++){
  const points:Nib[]=[];
  for(let i=0;i<PATH_SAMPLES;i++){
   const d=continuous.length*(lane+i/(PATH_SAMPLES-1))/count;
   while(cursorIndex<continuous.points.length-2&&continuous.points[cursorIndex+1].d<d)cursorIndex++;
   const a=continuous.points[cursorIndex],b=continuous.points[cursorIndex+1]??a,same=a.stroke===b.stroke,t=same?clamp((d-a.d)/(b.d-a.d||1)):0;
   points.push({x:Math.fround(lerp(a.x,b.x,t)),y:Math.fround(lerp(a.y,b.y,t)),move:i===0||a.stroke!==previousStroke,rgb:a.rgb.map((v,k)=>lerp(v,b.rgb[k],t)) as RGB,stroke:a.stroke,u:lerp(a.u,b.u,t),d:0});previousStroke=a.stroke;
  }
  const refined=points.map(clone);
  // Keep the authored pen lifts and structural corners. Only soften the small
  // kinks within a stroke, with a strict subpixel displacement budget.
  if(refinement>0)for(let i=1;i<points.length-1;i++){
   const a=points[i-1],p=points[i],b=points[i+1];if(p.move||b.move)continue;
   const ux=p.x-a.x,uy=p.y-a.y,vx=b.x-p.x,vy=b.y-p.y,la=Math.hypot(ux,uy),lb=Math.hypot(vx,vy);
   if(la<.001||lb<.001||(ux*vx+uy*vy)/(la*lb)<.3)continue;
   const dx=((a.x+b.x)*.5-p.x)*refinement,dy=((a.y+b.y)*.5-p.y)*refinement,length=Math.hypot(dx,dy),scale=Math.min(1,.3/(length||1));refined[i].x+=dx*scale;refined[i].y+=dy*scale;
  }
  routes.push(measure(refined,lane,study.strokes[points[0].stroke]?.seed??0));
 }
 return routes;
}
export function project(routes:Route[],old:Point,next:Point,viewport:Point):Route[]{
 const [vw,vh]=viewport,os=Math.max(vw/old[0],vh/old[1]),ns=Math.max(vw/next[0],vh/next[1]);return routes.map(r=>measure(r.points.map(p=>({...clone(p),x:(p.x*os+(vw-old[0]*os)/2-(vw-next[0]*ns)/2)/ns,y:(p.y*os+(vh-old[1]*os)/2-(vh-next[1]*ns)/2)/ns})),r.id,r.seed));
}
function tangent(points:Nib[],end:boolean):Point{const i=end?points.length-1:0,p=points[i],q=points[end?Math.max(0,i-2):Math.min(points.length-1,2)];let x=end?p.x-q.x:q.x-p.x,y=end?p.y-q.y:q.y-p.y;const d=Math.hypot(x,y)||1;return[x/d,y/d];}
export function connectTravel(source:Route[],targets:Route[]):Journey[]{
 const left=new Set(targets.map((_,i)=>i));return source.map((old,i)=>{
  const a=old.points.at(-1)!;let best=Infinity,pick=0,back=false;
  for(const j of left){for(const rev of [false,true]){const r=targets[j],p=rev?r.points.at(-1)!:r.points[0],d=distance(a,p);if(d<best){best=d;pick=j;back=rev;}}}left.delete(pick);
  const target=back?reverse(targets[pick]):targets[pick],b=target.points[0],ta=tangent(old.points,true),tb=tangent(target.points,false),d=distance(a,b),handle=Math.min(140,Math.max(12,d*.38));
  const nx=-(b.y-a.y)/(d||1),ny=(b.x-a.x)/(d||1),bow=Math.min(28,d*.08)*Math.sin(i*2.4);
  const c1=[a.x+ta[0]*handle+nx*bow,a.y+ta[1]*handle+ny*bow],c2=[b.x-tb[0]*handle+nx*bow,b.y-tb[1]*handle+ny*bow];
  const bridge:Nib[]=[];for(let n=1;n<=48;n++){const t=n/48,q=1-t;bridge.push({x:q*q*q*a.x+3*q*q*t*c1[0]+3*q*t*t*c2[0]+t*t*t*b.x,y:q*q*q*a.y+3*q*q*t*c1[1]+3*q*t*t*c2[1]+t*t*t*b.y,move:false,rgb:a.rgb.map((v,j)=>lerp(v,b.rgb[j],smooth(t))) as RGB,stroke:-1,u:0,d:0});}
  const bridgeLength=measure([clone(a),...bridge.map(clone)],i,0).length;
  const points=[...old.points.map(clone),...bridge,...target.points.slice(1).map(clone)];
  return{route:measure(points,i,target.seed),source:old.length,bridge:bridgeLength,target:target.length,id:target.id};
 });
}
export const palette={shu:[255,67,55],murasaki:[152,107,255]} as const;
export function pigment(rgb:RGB,lane:number):RGB{
 // Two actual pens, not a rainbow sampled from the photograph. Violet is a
 // sparse cool accent; the rest of the structure stays electric vermilion.
 const ink=lane%5===0&&rgb[2]>rgb[0]*.95?palette.murasaki:palette.shu;
 return [...ink];
}
const penLights=new Map<string,HTMLCanvasElement>();
function penLight(rgb:RGB){const key=rgb.join(',');let tile=penLights.get(key);if(tile)return tile;tile=document.createElement('canvas');tile.width=tile.height=48;const c=tile.getContext('2d')!,g=c.createRadialGradient(24,24,0,24,24,24);g.addColorStop(0,'#fff1ea');g.addColorStop(.22,'#fff1eae0');g.addColorStop(.35,`rgba(${key},.55)`);g.addColorStop(.65,`rgba(${key},.14)`);g.addColorStop(1,`rgba(${key},0)`);c.fillStyle=g;c.fillRect(0,0,48,48);c.fillStyle='#fff1ea';c.beginPath();c.arc(24,24,5.2,0,Math.PI*2);c.fill();penLights.set(key,tile);return tile;}
export class TravelInk{
 readonly routes:Route[];readonly drawEnd:number;readonly completeAt:number;readonly duration:number;readonly absorb:number;readonly focus:Point;readonly direction:Point;readonly cues:number[];readonly retouchAt:number;readonly photoAt:number;readonly photoFade:number;
 private clocks:{start:number;duration:number;end:number}[]=[];
 private paths=new WeakMap<Route,{path:Path2D;start:number;end:number}[]>();
 private ribbons=new WeakMap<Route,Map<number,{path:Path2D;outline:Path2D;start:number;end:number}[]>>();
 private gradients=new WeakMap<CanvasRenderingContext2D,WeakMap<Route,{key:string;value:CanvasGradient}>>();
 private journeys?:Journey[];private oldAlpha=0;private spans=new Map<number,{lane:number;start:number;end:number;u0:number;u1:number;anchors:{u:number;d:number}[]}[]>();
 constructor(study:Study,source?:Route[],oldAlpha=0){this.routes=makeRoutes(study);this.oldAlpha=oldAlpha;if(source)this.journeys=connectTravel(source,this.routes);
  this.absorb=study.motion?.absorb??1.3;this.focus=study.motion?.focus??[.48,.52];this.direction=study.motion?.direction??[1,0];
  // Shared cadence: 48 staggered pens, a 1.4s first draw / 1.8s
  // cross-image travel on the original 1.7× wall clock.
  this.clocks=this.routes.map((_,i)=>{const start=i/PEN_PATHS*(source?1.53:5.1),duration=source?3.06:2.38;return{start,duration,end:start+duration};});
  const cadence=source?4.59:7.65;
  this.drawEnd=cadence;this.retouchAt=this.drawEnd+.08;
  this.photoAt=this.drawEnd+Math.max(this.absorb*.8,source ? .765 : 1.53);this.photoFade=source?1:1.9;
  this.completeAt=Math.max(this.photoAt+this.photoFade,source?7.4:11.75);this.duration=Math.max(this.completeAt+1.6,source?9:13.35);
  this.cues=[0,.3,.65,this.drawEnd*.57,this.retouchAt,this.photoAt,this.completeAt];
  const list=this.journeys?.map(j=>({route:j.route,offset:j.source+j.bridge}))??this.routes.map(route=>({route,offset:0}));
  list.forEach(({route,offset},lane)=>{const local=new Map<number,{lane:number;start:number;end:number;u0:number;u1:number;anchors:{u:number;d:number}[]}>();for(const p of route.points){if(p.d<offset||p.stroke<0)continue;let span=local.get(p.stroke);if(!span){span={lane,start:p.d,end:p.d,u0:p.u,u1:p.u,anchors:[]};local.set(p.stroke,span);const all=this.spans.get(p.stroke)??[];all.push(span);this.spans.set(p.stroke,all);}span.end=p.d;span.u1=p.u;span.anchors.push({u:p.u,d:p.d});}});

 }
 windows(t:number):Window[]{
  if(this.journeys)return this.journeys.map((j,i)=>{const clock=this.clocks[i],q=clamp((t-clock.start)/clock.duration);return{route:j.route,start:cubic(Math.pow(q,1.5))*(j.source+j.bridge),end:j.source+cubic(q)*(j.bridge+j.target),targetStart:j.source+j.bridge,arrival:q>=1?1:clamp((j.source+cubic(q)*(j.bridge+j.target)-j.source-j.bridge)/(j.target||1)),id:j.id};});
  return this.routes.map((route,i)=>{const clock=this.clocks[i],q=cubic((t-clock.start)/clock.duration);return{route,start:0,end:route.length*q,targetStart:0,arrival:q,id:route.id};});
 }
 arrivalTime(stroke:number,u:number){
  const spans=this.spans.get(stroke);if(!spans?.length)return this.drawEnd;
  const span=spans.find(s=>u>=Math.min(s.u0,s.u1)-1e-7&&u<=Math.max(s.u0,s.u1)+1e-7)??spans.reduce((a,b)=>Math.min(Math.abs(u-a.u0),Math.abs(u-a.u1))<Math.min(Math.abs(u-b.u0),Math.abs(u-b.u1))?a:b);
  let distance=span.start;
  if(u>=Math.min(span.u0,span.u1)&&u<=Math.max(span.u0,span.u1)){for(let i=1;i<span.anchors.length;i++){const a=span.anchors[i-1],b=span.anchors[i];if(u>=Math.min(a.u,b.u)&&u<=Math.max(a.u,b.u)){distance=lerp(a.d,b.d,clamp((u-a.u)/(b.u-a.u||1)));break;}}}
  else distance=Math.abs(u-span.u0)<Math.abs(u-span.u1)?span.start:span.end;
  const clock=this.clocks[span.lane],j=this.journeys?.[span.lane],progress=clamp(j?(distance-j.source)/(j.bridge+j.target||1):distance/(this.routes[span.lane].length||1));
  const inverse=progress<.5?Math.cbrt(progress/4):1-Math.cbrt((1-progress)/4);return clock.start+clock.duration*inverse;

 }
 score(t:number){
  const coverage=(lag:number)=>this.windows(t-lag).reduce((n,w)=>n+w.arrival,0)/PEN_PATHS;
  const ink=coverage(0),brush=coverage(.36),bleed=coverage(.36+this.absorb*.65),settle=smooth((t-this.photoAt)/this.photoFade);
  const retouch=this.clocks.reduce((n,c)=>n+Math.sin(clamp((t-c.end-this.absorb*.2)/(this.absorb*1.3))*Math.PI),0)/PEN_PATHS;
  const charge=Math.sin(clamp((t-this.retouchAt)/1.16)*Math.PI)*(1-settle);
  return{pen:ink,brush,bleed,retouch,charge,settle,hold:t>=this.completeAt};
 }
 get isTransition(){return !!this.journeys;}
 current(t:number){return this.windows(t).map(w=>slice(w.route,w.start,w.end));}
 canPaint(stroke:number,u:number,t:number,_windows?:Window[]){return t>this.arrivalTime(stroke,u);}
 opacity(t:number){return 1-smooth((t-this.photoAt)/(this.isTransition ? .8 : 1.1));}
 private routePath(route:Route){
  let list=this.paths.get(route);if(list)return list;list=[];let path:Path2D|undefined,start=0,last=0;
  for(const p of route.points){if(!path||p.move){if(path)list.push({path,start,end:last});path=new Path2D();path.moveTo(p.x,p.y);start=p.d;}else path.lineTo(p.x,p.y);last=p.d;}
  if(path)list.push({path,start,end:last});this.paths.set(route,list);return list;
 }
 private strokeWindow(ctx:CanvasRenderingContext2D,route:Route,start:number,end:number){
  for(const p of this.routePath(route)){if(p.end<=start||p.start>=end)continue;const a=Math.max(start,p.start),b=Math.min(end,p.end);if(a<=p.start&&b>=p.end){ctx.setLineDash([]);ctx.stroke(p.path);}else{ctx.setLineDash([Math.max(.001,b-a),route.length*2+1]);ctx.lineDashOffset=-(a-p.start);ctx.stroke(p.path);}}
  ctx.setLineDash([]);ctx.lineDashOffset=0;
 }
 private ribbonPath(route:Route,width:number){
  let cache=this.ribbons.get(route);if(!cache){cache=new Map();this.ribbons.set(route,cache);}const key=Math.round(width*10000),cached=cache.get(key);if(cached)return cached;
  const parts:{path:Path2D;outline:Path2D;start:number;end:number}[]=[];let points:Nib[]=[];
  const finish=()=>{if(points.length<2)return;const path=new Path2D(),outline=new Path2D();path.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))path.lineTo(p.x,p.y);
   const edge=pressureRibbon(points,width,route.seed);outline.moveTo(edge[0].x,edge[0].y);for(const p of edge.slice(1))outline.lineTo(p.x,p.y);outline.closePath();parts.push({path,outline,start:points[0].d,end:points.at(-1)!.d});};
  for(const p of route.points){if(p.move&&points.length){finish();points=[];}points.push(p);}finish();cache.set(key,parts);return parts;
 }
 private drawRibbon(ctx:CanvasRenderingContext2D,route:Route,start:number,end:number,width:number){
  for(const p of this.ribbonPath(route,width)){if(p.end<=start||p.start>=end)continue;const a=Math.max(start,p.start),b=Math.min(end,p.end);
   if(a<=p.start&&b>=p.end){ctx.fill(p.outline);continue;}
   // Only the travelling head/tail needs clipping. Completed contours are one
   // cached native fill; the pressure edge is not reconstructed each frame.
   ctx.save();ctx.clip(p.outline);ctx.lineWidth=width*1.15;ctx.setLineDash([Math.max(.001,b-a),route.length*2+1]);ctx.lineDashOffset=-(a-p.start);ctx.stroke(p.path);ctx.restore();
  }
 }
 drawRetouch(ctx:CanvasRenderingContext2D,t:number,style:EngineId,worldScale=1){
  ctx.lineCap=ctx.lineJoin='round';const settle=this.score(t).settle;this.routes.forEach((r,i)=>{const clock=this.clocks[this.journeys?.findIndex(j=>j.id===r.id)??i],q=clamp(style==='fude'?(t-this.retouchAt-i/PEN_PATHS*.442)/.714:(t-clock.end-this.absorb*.2)/(this.absorb*1.3));if(q<=0||q>=1)return;
   const end=r.length*q,start=Math.max(0,end-r.length*.18),b=at(r,end),color=pigment(b.rgb,i);ctx.globalAlpha=Math.sin(q*Math.PI)*(style==='haze'?.38:.5);ctx.strokeStyle=`rgb(${color.map(Math.round).join(' ')})`;ctx.lineWidth=(style==='fude'?1.9:1)/Math.max(.4,worldScale);this.strokeWindow(ctx,r,start,end);
   if(style==='fude'){ctx.globalAlpha=Math.sin(q*Math.PI)*.9*(1-settle);ctx.strokeStyle='#ffe2ed';ctx.lineWidth=.75/Math.max(.4,worldScale);this.strokeWindow(ctx,r,start,end);}
  });ctx.globalAlpha=1;
 }
 draw(ctx:CanvasRenderingContext2D,t:number,style:EngineId,opacity:number,only=false,worldScale=1,coreWidth?:number){
  const windows=this.windows(t);ctx.lineCap=ctx.lineJoin='round';const matrix=ctx.getTransform(),gradientKey=[matrix.a,matrix.d,matrix.e,matrix.f].join(',');
  let colors=this.gradients.get(ctx);if(!colors){colors=new WeakMap();this.gradients.set(ctx,colors);}
  windows.forEach((w,lane)=>{if(w.end-w.start<.3)return;const clock=this.clocks[lane],enter=this.journeys?this.oldAlpha+(1-this.oldAlpha)*smooth(t/.5):smooth(t/.2),alpha=only?enter:style==='fude'?enter*(1-.65*smooth((t-this.drawEnd)/.9))*this.opacity(t):enter*(1-smooth((t-clock.end-this.absorb*.45)/(this.absorb*2)));
   if(opacity*alpha<.005)return;const route=w.route,p=route.points,brush=1.75/Math.max(.4,worldScale),scale=style==='block'?.86:style==='haze'?.95:1;
   const cached=colors!.get(route);let gradient=cached?.key===gradientKey?cached.value:undefined;if(!gradient){const a=p[0],b=p.at(-1)!;gradient=ctx.createLinearGradient(a.x,a.y,b.x+.01,b.y+.01);(style==='fude'?[0,1]:[0,.35,.7,1]).forEach((fraction,i)=>{const v=at(route,route.length*(style==='fude'?.55:fraction)),color=pigment(v.rgb,style==='fude'?lane:lane+i);gradient!.addColorStop(fraction,`rgb(${color.map(Math.round).join(' ')})`);});colors!.set(route,{key:gradientKey,value:gradient});}
   ctx.strokeStyle=ctx.fillStyle=gradient;ctx.globalAlpha=opacity*alpha*(.94+route.seed*.06);if(style==='fude'){ctx.lineWidth=(coreWidth??(this.isTransition?1.2:1.4))/Math.max(.4,worldScale);this.strokeWindow(ctx,route,w.start,w.end);}else this.drawRibbon(ctx,route,w.start,w.end,scale*(.9+route.seed*.18)*brush);
   if(style==='fude'&&w.arrival<.999){const head=at(route,w.end),light=penLight(pigment(at(route,route.length*.55).rgb,lane)),radius=6/Math.max(.4,worldScale);ctx.globalAlpha=opacity*enter*.7;ctx.drawImage(light,head.x-radius,head.y-radius,radius*2,radius*2);const start=Math.max(w.start,w.end-30/Math.max(.4,worldScale));ctx.globalAlpha=opacity*alpha*.14;ctx.lineWidth=3.8/Math.max(.4,worldScale);this.strokeWindow(ctx,route,start,w.end);ctx.strokeStyle='#ffe2ed';ctx.globalAlpha=opacity*alpha*.9;ctx.lineWidth=.8/Math.max(.4,worldScale);this.strokeWindow(ctx,route,Math.max(start,w.end-10/Math.max(.4,worldScale)),w.end);}

  });ctx.globalAlpha=1;
 }
}
