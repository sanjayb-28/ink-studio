import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildGeometry,measure,traceStroke,connect} from '../src/painting-geometry.ts';
import {makeDabs} from '../src/paint-dabs.ts';
const drawing={w:100,h:100,d:['M0 0 L30 0','M70 100 L100 100'],len:[30,30]};
for(const [width,height] of [[284,192],[620,192],[1280,720],[390,844]]){
 const geometry=buildGeometry(drawing,width,height);
 assert.equal(geometry.paths.length,48);assert.ok(geometry.position>=0&&geometry.position<=1);
 for(const path of geometry.paths){assert.equal(path.points.length,200);assert.equal(path.points[0].move,true);assert.ok(path.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));for(let i=1;i<path.distance.length;i++)assert.ok(path.distance[i]>=path.distance[i-1]);}
 const connected=connect(geometry.paths,buildGeometry({...drawing,d:['M0 100 L100 0']},width,height).paths);
 assert.equal(connected.length,48);for(const ribbon of connected){assert.ok(ribbon.bridge>=0);assert.ok(ribbon.path.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));}
}
assert.throws(()=>buildGeometry({...drawing,d:[]},100,100));
assert.throws(()=>buildGeometry(drawing,0,100));
const pen={commands:[],moveTo(x,y){this.commands.push(['M',x,y]);},lineTo(x,y){this.commands.push(['L',x,y]);}};
const broken=measure([{x:0,y:0,move:true},{x:100,y:0,move:false},{x:1000,y:1000,move:true},{x:1100,y:1000,move:false}]);
traceStroke(pen,broken,.8);assert.deepEqual(pen.commands[2],['M',1000,1000],'Pen lifts must never become long diagonal lines.');
const line=measure([{x:0,y:0,move:true},{x:100,y:0,move:false},{x:200,y:0,move:false}]);
assert.ok(Math.abs(traceStroke(pen,line,.2009).x-traceStroke(pen,line,.2001).x-.16)<1e-8,'The leading light must move between samples.');
const oldDocument=globalThis.document;
globalThis.document={createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(256*80*4).fill(120)})})})};
try{
 const art={...buildGeometry(drawing,620,192),image:{naturalWidth:620,naturalHeight:192}};
 const first=makeDabs(art,620,192),second=makeDabs(art,620,192);
 assert.deepEqual(first,second,'The same painting must prepare the same pigment on replay.');assert.ok(first.length>100&&first.length<9000);
 for(const mark of first){for(const key of ['x','y','angle','width','length','opacity','delay','point','group'])assert.ok(Number.isFinite(mark[key]));assert.ok(mark.group>=0&&mark.group<48);assert.ok(mark.point>=0&&mark.point<200);assert.ok(mark.width>0&&mark.length>0);}
}finally{globalThis.document=oldDocument;}
for(const scene of JSON.parse(readFileSync('src/studio-scenes.json','utf8'))){const data=JSON.parse(readFileSync('public/drawings/'+scene.name+'.json','utf8'));assert.equal(buildGeometry(data,620,192).paths.length,48);}
console.log('Runtime geometry, pen lifts, fractional light, pigment determinism and independent demo assets passed.');
