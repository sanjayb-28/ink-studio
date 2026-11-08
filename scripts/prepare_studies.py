"""Independent contour and pigment preparation for the three material engines."""
from pathlib import Path
import cv2, numpy as np, json, re
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/studies'; OUT.mkdir(exist_ok=True)
def edge_chains(edge):
 # Trace each edge link once. findContours walks both sides of a one-pixel
 # Canny edge, producing the narrow doubled loops that look like neon tubing.
 ys,xs=np.nonzero(edge)
 pixels=set(zip(xs.tolist(),ys.tolist()))
 neighbors={}
 for x,y in pixels:
  links=[]
  for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)]:
   q=(x+dx,y+dy)
   if q not in pixels: continue
   if dx and dy and ((x+dx,y) in pixels or (x,y+dy) in pixels): continue
   links.append(q)
  neighbors[(x,y)]=links
 seen=set();chains=[]
 def link(a,b):return (a,b) if a<b else (b,a)
 def trace(a,b):
  points=[a];seen.add(link(a,b));previous,current=a,b
  while True:
   points.append(current)
   options=neighbors[current]
   if len(options)!=2: break
   following=options[0] if options[1]==previous else options[1]
   if link(current,following) in seen: break
   seen.add(link(current,following));previous,current=current,following
  if len(points)>7:chains.append(np.array(points,dtype=float))
 for p in sorted(pixels):
  if len(neighbors[p])==2:continue
  for q in neighbors[p]:
   if link(p,q) not in seen:trace(p,q)
 for p in sorted(pixels):
  for q in neighbors[p]:
   if link(p,q) not in seen:trace(p,q)
 return chains

for name in ['demo-street','demo-portrait','demo-still-life']:
 src=cv2.imread(str(ROOT/'public/paint'/f'{name}.jpg'))
 h0,w0=src.shape[:2]; w=720; h=round(w*h0/w0)
 im=cv2.resize(src,(w,h),interpolation=cv2.INTER_AREA)
 # Trace at source resolution, then retain floating-point artwork coordinates.
 gray=cv2.cvtColor(src,cv2.COLOR_BGR2GRAY)
 gray=cv2.bilateralFilter(gray,5,22,22)
 gray=cv2.createCLAHE(clipLimit=1.5,tileGridSize=(8,8)).apply(gray)
 edges=cv2.Canny(gray,30,75)
 contours=edge_chains(edges)
 rng=np.random.default_rng(241)
 strokes=[]
 for contour in contours:
  p=contour*np.array([w/w0,h/h0])
  if len(p)<8: continue
  lengths=np.r_[0,np.cumsum(np.linalg.norm(np.diff(p,axis=0),axis=1))]
  length=lengths[-1]
  if length<8: continue
  at=np.linspace(0,length,48)
  pts=np.c_[np.interp(at,lengths,p[:,0]),np.interp(at,lengths,p[:,1])]
  center=pts.mean(axis=0)
  ix=np.clip(pts[:,0].astype(int),0,w-1);iy=np.clip(pts[:,1].astype(int),0,h-1)
  rgb=im[iy,ix,::-1]
  fine_at=np.linspace(0,length,max(24,min(320,int(length/.8))))
  fine=np.c_[np.interp(fine_at,lengths,p[:,0]),np.interp(fine_at,lengths,p[:,1])]
  fine[1:-1]=(fine[:-2]+2*fine[1:-1]+fine[2:])/4
  fx=np.clip(fine[:,0].astype(int),0,w-1);fy=np.clip(fine[:,1].astype(int),0,h-1)
  strokes.append(dict(ink=np.round(fine,2).tolist(),inkRGB=im[fy,fx,::-1].astype(int).tolist(),points=np.round(pts,2).tolist(),rgb=rgb.astype(int).tolist(),length=round(length,2),center=np.round(center,2).tolist(),seed=float(rng.random()),focus=float(np.hypot((center[0]/w-.47)*1.2,center[1]/h-.5))))
 strokes=sorted(strokes,key=lambda s:s['length'],reverse=True)[:480]
 # Retain structural strokes rather than tracing every highlight/reflection.
 # Strong edges lead; a spatial occupancy mask suppresses nearby parallel rims.
 source_count=len(strokes);source_length=sum(s['length'] for s in strokes)
 contrast=np.hypot(cv2.Sobel(gray,cv2.CV_32F,1,0),cv2.Sobel(gray,cv2.CV_32F,0,1))
 def importance(s):
  pts=np.array(s['points']);ix=np.clip((pts[:,0]*w0/w).astype(int),0,w0-1);iy=np.clip((pts[:,1]*h0/h).astype(int),0,h0-1)
  strength=float(np.percentile(contrast[iy,ix],65))
  return np.sqrt(s['length'])*(.35+min(1,strength/180))/(.8+s['focus']*.5)
 occupied=np.zeros((h,w),np.uint8);selected=[];retained_length=0
 cap=max(36,min(190,round(source_count*.45)));length_budget=source_length*.48
 for stroke in sorted(strokes,key=importance,reverse=True):
  pts=np.array(stroke['ink']);ix=np.clip(pts[:,0].astype(int),0,w-1);iy=np.clip(pts[:,1].astype(int),0,h-1)
  if np.mean(occupied[iy,ix]>0)>.28:continue
  if retained_length+stroke['length']>length_budget and len(selected)>=8:continue
  selected.append(stroke);retained_length+=stroke['length']
  cv2.polylines(occupied,[np.round(pts).astype(np.int32)],False,255,5)
  if len(selected)>=cap:break
 # Split retained long curves when a sparse graphic has fewer than 32
 # journeys. This changes ownership only, adding no extra traced edge length.
 selected_count=len(selected)
 while len(selected)<32:
  at=max(range(len(selected)),key=lambda i:selected[i]['length']);s=selected.pop(at);raw=np.array(s['ink']);colors=s['inkRGB'];middle=len(raw)//2
  for start,end in [(0,middle+1),(middle,len(raw))]:
   fine=raw[start:end];dist=np.r_[0,np.cumsum(np.linalg.norm(np.diff(fine,axis=0),axis=1))];sample=np.linspace(0,dist[-1],48)
   pts=np.c_[np.interp(sample,dist,fine[:,0]),np.interp(sample,dist,fine[:,1])];ix=np.clip(pts[:,0].astype(int),0,w-1);iy=np.clip(pts[:,1].astype(int),0,h-1);center=pts.mean(axis=0)
   child=dict(s,ink=fine.tolist(),inkRGB=colors[start:end],points=np.round(pts,2).tolist(),rgb=im[iy,ix,::-1].astype(int).tolist(),length=round(float(dist[-1]),2),center=np.round(center,2).tolist(),focus=float(np.hypot((center[0]/w-.47)*1.2,center[1]/h-.5)))
   selected.append(child)
 strokes=selected
 selection=dict(sourceContours=source_count,retainedContours=selected_count,journeySegments=len(strokes),sourceLength=round(source_length,2),retainedLength=round(retained_length,2),lengthFraction=round(retained_length/source_length,4),spacing=5)
 strokes.sort(key=lambda s:s['focus']+s['seed']*.14)
 drawing_source='extracted'
 selection['mode']='selected-edges'
 for stroke in strokes:
  points=np.array(stroke['ink']);distance=np.r_[0,np.cumsum(np.linalg.norm(np.diff(points,axis=0),axis=1))];stroke['inkU']=(distance/(distance[-1] or 1)).tolist()
 dabs=[]
 for i,s in enumerate(strokes):
  s['delay']=round(s['focus']*1.3+s['seed']*.36,3)
  pts=s['points']
  for j in range(0,48,2):
   x,y=pts[j]; a=pts[max(0,j-1)];b=pts[min(47,j+1)]
   angle=float(np.arctan2(b[1]-a[1],b[0]-a[0]))
   for side in [-1,1]:
    off=float(rng.uniform(1,15));sx=np.clip(x-np.sin(angle)*off*side,0,w-1);sy=np.clip(y+np.cos(angle)*off*side,0,h-1)
    rgb=im[int(sy),int(sx),::-1].tolist()
    dabs.append([round(float(sx),2),round(float(sy),2),round(angle,3),float(rng.uniform(4,18)),float(rng.uniform(2,9)),*rgb,round(s['delay']+j/48*.8+float(rng.uniform(0,.28)),3),float(rng.random()),i,j/47])
 # Distributed interior washes fill regions rather than only outlining their borders.
 for y in range(6,h,11):
  for x in range(6,w,11):
   px=np.clip(x+rng.uniform(-5,5),0,w-1);py=np.clip(y+rng.uniform(-5,5),0,h-1)
   rgb=im[int(py),int(px),::-1].tolist()
   dist=float(np.hypot((px/w-.47)*1.2,py/h-.5))
   dabs.append([round(float(px),2),round(float(py),2),float(rng.uniform(-3.14,3.14)),float(rng.uniform(7,21)),float(rng.uniform(4,13)),*rgb,round(.5+dist*1.5+float(rng.uniform(0,.8)),3),float(rng.random()),-1,0])
 # Anchor interior color to the nearest actual pen point, not the center
 # of a possibly very long contour. Distance provides outward paint travel.
 # Project onto actual line segments, so even a long two-vertex source
 # contour releases paint continuously behind the travelling pen.
 starts=np.concatenate([np.array(stroke['ink'][:-1]) for stroke in strokes])
 ends=np.concatenate([np.array(stroke['ink'][1:]) for stroke in strokes]);vectors=ends-starts
 lengths2=np.maximum(1e-12,np.sum(vectors*vectors,axis=1))
 owners=np.concatenate([np.full(len(stroke['ink'])-1,i,dtype=np.int32) for i,stroke in enumerate(strokes)])
 params=np.concatenate([np.array(stroke['inkU'][:-1]) for stroke in strokes]);spans=np.concatenate([np.diff(stroke['inkU']) for stroke in strokes])
 for d in dabs:
  eligible=np.arange(len(owners)) if d[10]<0 else np.flatnonzero(owners==d[10])
  delta=np.array(d[:2])-starts[eligible];fraction=np.clip(np.sum(delta*vectors[eligible],axis=1)/lengths2[eligible],0,1)
  residual=delta-vectors[eligible]*fraction[:,None];nearest=int(np.argmin(np.sum(residual*residual,axis=1)));segment=eligible[nearest]
  d[10]=int(owners[segment]);d[11]=float(params[segment]+spans[segment]*fraction[nearest]);d.append(round(float(np.linalg.norm(residual[nearest])),2))
 dabs.sort(key=lambda d:d[8])
 # Match the renderer's existing stride offline, avoiding unused network/JSON work.
 dabs=dabs[::max(1,int(np.ceil(len(dabs)/1800)))]
 # A subject-specific focal point and material profile drive the runtime clock.
 color=cv2.cvtColor(im,cv2.COLOR_BGR2HSV).astype(np.float32)
 lum=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)/255
 gx=cv2.Sobel(lum,cv2.CV_32F,1,0);gy=cv2.Sobel(lum,cv2.CV_32F,0,1)
 grad=np.hypot(gx,gy);sal=(lum**1.6)*.45+color[:,:,1]/255*.2+np.minimum(1,grad)*.35
 sal=cv2.GaussianBlur(sal,(0,0),18)
 yy,xx=np.mgrid[0:h,0:w];sal*=.75+.25*np.exp(-((xx/w-.5)**2+(yy/h-.5)**2)*3)
 fy,fx=np.unravel_index(np.argmax(sal),sal.shape)
 theta=.5*np.arctan2(float((2*gx*gy).sum()),float((gx*gx-gy*gy).sum()))+np.pi/2
 motion=dict(focus=[round(float(fx/w),4),round(float(fy/h),4)],direction=[round(float(np.cos(theta)),4),round(float(np.sin(theta)),4)],absorb=round(1.1+float(lum.std())*.9,3),complexity=round(min(1,len(strokes)/300)*.5+min(1,float(grad.mean())*8)*.5,3))
 data=dict(width=w,height=h,strokes=strokes,dabs=dabs,motion=motion,selection=selection,drawingSource=drawing_source)
 (OUT/f'{name}.json').write_text(json.dumps(data,separators=(',',':')))
 print(name,drawing_source,len(strokes),'source contours;',48,'pen paths × 200 samples;',len(dabs),'pigment marks')

# Prepare color impressions offline as well: no per-pixel plate processing at runtime.
for name in ['demo-street','demo-portrait','demo-still-life']:
 src=cv2.imread(str(ROOT/'public/paint'/f'{name}.jpg'))
 h0,w0=src.shape[:2]; im=cv2.resize(src,(720,round(720*h0/w0)),interpolation=cv2.INTER_AREA).astype(np.float32)
 l=im[:,:,2]*.2126+im[:,:,1]*.7152+im[:,:,0]*.0722
 key=np.stack([l*175/255,l*192/255,l*197/255],axis=-1)
 warm=im*np.array([.28,.62,1.0]);cool=im*np.array([1.0,.88,.4])
 for label,plate in [('key',key),('warm',warm),('cool',cool)]:
  cv2.imwrite(str(OUT/f'{name}-{label}.webp'),np.clip(plate,0,255).astype(np.uint8),[cv2.IMWRITE_WEBP_QUALITY,92])
rng=np.random.default_rng(2847);noise=rng.integers(0,256,(96,96),dtype=np.uint8)
grain=np.stack([noise,noise,noise,np.full((96,96),70,dtype=np.uint8)],axis=-1)
cv2.imwrite(str(OUT/'grain.png'),grain)
# Runtime paper and edge alpha are static textures; no SVG filters or live gradient masks.
paper=np.clip(rng.normal(8,1.15,(96,96,3)),0,255).astype(np.uint8)
cv2.imwrite(str(OUT/'paper.png'),paper)
y,x=np.mgrid[0:128,0:256];u=x/255;v=y/127
alpha=np.minimum(np.minimum(u/.07,(1-u)/.07),1)*np.minimum(np.minimum(v/.16,(1-v)/.24),1)
feather=np.full((128,256,4),255,dtype=np.uint8);feather[:,:,3]=np.round(np.clip(alpha,0,1)*255).astype(np.uint8)
cv2.imwrite(str(OUT/'feather.png'),feather)
