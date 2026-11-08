import assert from 'node:assert/strict';
import {pressureRibbon} from '../src/ink-nib.ts';

const line=Array.from({length:41},(_,i)=>({x:i*2,y:0,d:i*2}));
const ribbon=pressureRibbon(line,2,.45);
assert.equal(ribbon.length,line.length*2);
assert.deepEqual(pressureRibbon(line,2,.45),ribbon,'Pressure must be stable between frames');
const widths=line.map((p,i)=>Math.hypot(ribbon[i].x-p.x,ribbon[i].y-p.y)*2);
assert.ok(widths[0]<widths[12]*.25&&widths.at(-1)<widths[28]*.25,'Each pen lift has a tapered start and finish');
assert.ok(Math.max(...widths)-Math.min(...widths)>.9,'Pressure changes the actual outline, not a blur');
assert.ok(widths.every(w=>w>0&&w<=2),'The nib stays within its physical width');

let d=0;const curve=Array.from({length:81},(_,i)=>{const t=i/80*Math.PI*1.5,x=Math.cos(t)*20,y=Math.sin(t)*20;if(i)d+=Math.hypot(x-Math.cos((i-1)/80*Math.PI*1.5)*20,y-Math.sin((i-1)/80*Math.PI*1.5)*20);return{x,y,d};});
for(const width of [.25,1,4]){
 const edge=pressureRibbon(curve,width,.8);
 assert.ok(edge.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),'Curved nib outlines remain finite');
 for(let i=0;i<curve.length;i++)assert.ok(Math.hypot(edge[i].x-curve[i].x,edge[i].y-curve[i].y)<=width*.5,'Bends must not introduce miter spikes');
}
assert.ok(pressureRibbon([{x:1,y:1,d:0},{x:1,y:1,d:0}],1,.5).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),'An interrupted zero-length route is safe');
console.log('PASS pressure nib: stable vector edges, tapered pen lifts, real width variation, bounded curved outlines and zero-length interruption.');
