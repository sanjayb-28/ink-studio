// Image-to-thread analysis from the supplied pixels.
export type V = { x: number; y: number };
export type Thread = { points: V[]; color: string; light: number; strength: number; delay: number; width: number; seed: number; center: V };
export type Field = { width: number; height: number; threads: Thread[]; rgba: Uint8ClampedArray };
export const unit = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (v: number) => { const x = unit(v); return x * x * (3 - 2 * x); };
export function random(seed: number) { let s = seed >>> 0; return () => { s = Math.imul(s ^ s >>> 15, 1 | s); s ^= s + Math.imul(s ^ s >>> 7, 61 | s); return ((s ^ s >>> 14) >>> 0) / 4294967296; }; }
function blur(a: Float32Array, w: number, h: number, passes = 1) {
  let b = a;
  for (let n = 0; n < passes; n++) {
    const out = new Float32Array(a.length);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      out[i] = (b[i] * 4 + (b[i-1] + b[i+1] + b[i-w] + b[i+w]) * 2 + b[i-w-1] + b[i-w+1] + b[i+w-1] + b[i+w+1]) / 16;
    }
    b = out;
  }
  return b;
}
export function resample(points: V[], count = 32): V[] {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i-1] + Math.hypot(points[i].x-points[i-1].x, points[i].y-points[i-1].y));
  const total = lengths.at(-1)!;
  if (!total) return Array.from({ length: count }, () => ({ ...points[0] }));
  let j = 1;
  return Array.from({ length: count }, (_, i) => {
    const d = total * i / (count - 1);
    while (j < points.length - 1 && lengths[j] < d) j++;
    const t = unit((d-lengths[j-1]) / (lengths[j]-lengths[j-1] || 1));
    return { x: points[j-1].x + (points[j].x-points[j-1].x)*t, y: points[j-1].y + (points[j].y-points[j-1].y)*t };
  });
}
export function buildField(rgba: Uint8ClampedArray, w: number, h: number, seed = 731): Field {
  const rand = random(seed), size = w*h;
  let lum: Float32Array = Float32Array.from({ length:size }, (_,i) => Math.pow((rgba[i*4]*.2126+rgba[i*4+1]*.7152+rgba[i*4+2]*.0722)/255, .66));
  lum = blur(lum,w,h,2);
  let xx: Float32Array = new Float32Array(size), yy: Float32Array = new Float32Array(size), xy: Float32Array = new Float32Array(size);
  const magnitude = new Float32Array(size);
  for (let y=2;y<h-2;y++) for(let x=2;x<w-2;x++) {
    const i=y*w+x, gx=(lum[i+1]-lum[i-1])*2+lum[i-w+1]-lum[i-w-1]+lum[i+w+1]-lum[i+w-1],
      gy=(lum[i+w]-lum[i-w])*2+lum[i+w-1]-lum[i-w-1]+lum[i+w+1]-lum[i-w+1];
    xx[i]=gx*gx; yy[i]=gy*gy; xy[i]=gx*gy; magnitude[i]=Math.hypot(gx,gy);
  }
  xx=blur(xx,w,h,4); yy=blur(yy,w,h,4); xy=blur(xy,w,h,4);
  const angle=Float32Array.from(xx,(_,i)=>.5*Math.atan2(2*xy[i],xx[i]-yy[i])+Math.PI/2);
  const seeds:{x:number;y:number;value:number}[]=[];
  for(let y=4;y<h-4;y+=3) for(let x=4;x<w-4;x+=3) {
    const sx=x+(rand()-.5)*2,sy=y+(rand()-.5)*2,i=Math.round(sy)*w+Math.round(sx);
    if(magnitude[i]>.012) seeds.push({x:sx,y:sy,value:magnitude[i]*(.65+rand()*.35)});
  }
  seeds.sort((a,b)=>b.value-a.value);
  const used=new Uint8Array(size), threads:Thread[]=[];
  const cell=(x:number,y:number)=>Math.max(0,Math.min(size-1,Math.round(y)*w+Math.round(x)));
  function trace(start:V,sign:number) {
    const points:V[]=[]; let p={...start},prev=angle[cell(p.x,p.y)]+(sign<0?Math.PI:0);
    for(let k=0;k<39;k++) {
      const i=cell(p.x,p.y);let a=angle[i];
      if(Math.cos(a-prev)<0) a+=Math.PI;
      const turn=Math.atan2(Math.sin(a-prev),Math.cos(a-prev));
      a=prev+Math.max(-.46,Math.min(.46,turn))*.72;
      p={x:p.x+Math.cos(a)*1.55,y:p.y+Math.sin(a)*1.55};
      if(p.x<3||p.x>w-4||p.y<3||p.y>h-4||(k>7&&magnitude[cell(p.x,p.y)]<.006)) break;
      if(k>9&&used[cell(p.x,p.y)]>1) break;
      points.push(p);prev=a;
    }
    return points;
  }
  for(const s of seeds) {
    if(threads.length>=720) break;
    if(used[cell(s.x,s.y)]) continue;
    const raw=[...trace(s,-1).reverse(),{x:s.x,y:s.y},...trace(s,1)];
    if(raw.length<7) continue;
    const points=resample(raw),center=points[16];
    let r=0,g=0,b=0,light=0;
    for(const p of points) {
      const i=cell(p.x,p.y);r+=rgba[i*4];g+=rgba[i*4+1];b+=rgba[i*4+2];light+=lum[i];
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(Math.abs(dx)+Math.abs(dy)<3) used[cell(p.x+dx,p.y+dy)]++;
    }
    r/=32;g/=32;b/=32;light/=32;
    const radial=Math.hypot((center.x/w-.46)*1.2,center.y/h-.52);
    threads.push({points,center,color:`rgb(${r.toFixed(0)} ${g.toFixed(0)} ${b.toFixed(0)})`,light,strength:unit(s.value*3),
      delay:radial*1.8+rand()*.9,width:1.4+rand()*4,seed:rand()*Math.PI*2});
  }
  // Stable spatial ordering makes the correspondence local during scene changes.
  threads.sort((a,b)=>Math.floor(a.center.y/24)*64+Math.floor(a.center.x/24)-Math.floor(b.center.y/24)*64-Math.floor(b.center.x/24));
  return {width:w,height:h,threads,rgba};
}
export function correspondence(previous: Field, next: Field): V[][] {
  if(!previous.threads.length) return next.threads.map(t=>t.points);
  const available=new Set(previous.threads.map((_,i)=>i));
  return next.threads.map(t=>{
    let chosen=-1,best=Infinity;
    const candidates=available.size?available:previous.threads.map((_,i)=>i);
    for(const i of candidates) {
      const c=previous.threads[i].center,dx=c.x/previous.width-t.center.x/next.width,dy=c.y/previous.height-t.center.y/next.height;
      const d=dx*dx+dy*dy;
      if(d<best){best=d;chosen=i;}
    }
    available.delete(chosen);
    const old=previous.threads[chosen].points.map(p=>({x:p.x/previous.width*next.width,y:p.y/previous.height*next.height}));
    const head=t.points[0],tail=t.points.at(-1)!,a=old[0],b=old.at(-1)!;
    if(Math.hypot(head.x-b.x,head.y-b.y)+Math.hypot(tail.x-a.x,tail.y-a.y)<Math.hypot(head.x-a.x,head.y-a.y)+Math.hypot(tail.x-b.x,tail.y-b.y))old.reverse();
    return old;
  });
}
export function threadPoint(t: Thread, i: number, time: number, from?: V[]): V {
  const p=t.points[i],age=time-t.delay;
  if(from) {
    const blend=ease((time-.08)/2.35),q=from[i];
    return {x:q.x+(p.x-q.x)*blend,y:q.y+(p.y-q.y)*blend};
  }
  const loose=1-ease(age/2.1),q=i/(t.points.length-1);
  return {x:p.x+loose*(Math.sin(q*Math.PI+t.seed)*20+(q-.5)*13),y:p.y+loose*Math.cos(q*Math.PI+t.seed)*15};
}
