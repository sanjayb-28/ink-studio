// A pressure ribbon is vector geometry. It is never blurred or enlarged from
// the pigment buffer. Distances and normals remain in the artwork's space.
export type NibPoint={x:number;y:number;d:number};
export function pressureRibbon(points:NibPoint[],width:number,seed:number){
 const first=points[0],last=points.at(-1)!;
 const length=last.d-first.d,taper=Math.min(14,length*.22);
 const left:{x:number;y:number}[]=[],right:{x:number;y:number}[]=[];
 for(let i=0;i<points.length;i++){
  const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
  const dx=b.x-a.x,dy=b.y-a.y,n=Math.hypot(dx,dy)||1,u=(p.d-first.d)/(length||1);
  const edge=Math.max(0,Math.min(1,Math.min(p.d-first.d,last.d-p.d)/(taper||1)));
  const pressure=(.78+.12*Math.sin(u*Math.PI*1.7+seed*3)+.06*Math.sin(u*Math.PI*4+seed))* (.16+.84*edge*edge*(3-2*edge));
  const r=width*.5*pressure,nx=-dy/n*r,ny=dx/n*r;
  left.push({x:p.x+nx,y:p.y+ny});right.push({x:p.x-nx,y:p.y-ny});
 }
 return [...left,...right.reverse()];
}
