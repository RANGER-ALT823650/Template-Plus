import {getPhone} from './phones.js';
import {objectHeight} from './design.js';

export const CHECK_DEFAULTS={clearance:2,edgeClearance:2,holeClearance:2,minDpi:300};
const EPS=1e-7,round=n=>Math.round(n*1000)/1000;
export function checkOptions(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('检查选项须为对象');
  for(const key of Object.keys(input))if(!Object.hasOwn(CHECK_DEFAULTS,key))throw new Error(`未知检查选项：${key}`);
  const options={...CHECK_DEFAULTS,...input};
  for(const [key,value] of Object.entries(options))if(!Number.isFinite(value)||value<0||value>(key==='minDpi'?2400:50))throw new Error(`${key} 须在 0–${key==='minDpi'?2400:50} 之间`);
  return options;
}
export function objectFootprint(o){
  const a=o.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),h=objectHeight(o);
  return [[-o.width/2,-h/2],[o.width/2,-h/2],[o.width/2,h/2],[-o.width/2,h/2]].map(([x,y])=>[o.x+x*c-y*s,o.y+x*s+y*c]);
}
function rectangle({x,y,width,height}){return [[x,y],[x+width,y],[x+width,y+height],[x,y+height]];}
function outerPolygon(p){
  // Retained, calibrated platform outlines are already flattened M/L/Z paths.
  if(/[^MLZ\s\d.,+eE-]/.test(p.outer))throw new Error('检查不支持此平台轮廓');
  const n=p.outer.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi).map(Number),points=[];
  for(let i=0;i<n.length;i+=2)points.push([n[i],n[i+1]]);
  return points;
}
const edges=p=>p.map((a,i)=>[a,p[(i+1)%p.length]]);
const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
function pointDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
function crossing(a,b,c,d){const x=cross(a,b,c),y=cross(a,b,d),u=cross(c,d,a),v=cross(c,d,b);return x*y<-EPS&&u*v<-EPS;}
function segmentDistance(a,b,c,d){return crossing(a,b,c,d)?0:Math.min(pointDistance(a,c,d),pointDistance(b,c,d),pointDistance(c,a,b),pointDistance(d,a,b));}
function boundaryDistance(point,poly){return Math.min(...edges(poly).map(([a,b])=>pointDistance(point,a,b)));}
function inside(point,poly){
  if(boundaryDistance(point,poly)<EPS)return true;
  let result=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])result=!result;
  }return result;
}
function intersect(a,b){
  // SAT for convex object rectangles and the Logo bounding rectangle.
  for(const poly of [a,b])for(const [p,q] of edges(poly)){
    const nx=q[1]-p[1],ny=p[0]-q[0];if(Math.hypot(nx,ny)<EPS)continue;
    const aa=a.map(v=>v[0]*nx+v[1]*ny),bb=b.map(v=>v[0]*nx+v[1]*ny);
    if(Math.max(...aa)<=Math.min(...bb)+EPS||Math.max(...bb)<=Math.min(...aa)+EPS)return false;
  }return true;
}
export function polygonDistance(a,b){
  if(intersect(a,b))return 0;
  let d=Infinity;for(const [p,q] of edges(a))for(const [r,s] of edges(b))d=Math.min(d,segmentDistance(p,q,r,s));return d;
}
function edgeDistance(poly,outer){
  const outside=poly.filter(p=>!inside(p,outer));
  if(outside.length)return -Math.max(...outside.map(p=>boundaryDistance(p,outer)));
  let d=Infinity;for(const [a,b] of edges(poly))for(const [c,e] of edges(outer)){
    if(crossing(a,b,c,e))return -EPS;
    d=Math.min(d,segmentDistance(a,b,c,e));
  }return d;
}
function holeDistance(poly,[,x,y,diameter]){return (inside([x,y],poly)?0:boundaryDistance([x,y],poly))-diameter/2;}
function context(design){const model=getPhone(design.model);return {model,outer:outerPolygon(model.plateau),logo:model.logo?rectangle(model.logo):null};}

export async function checkLayout(design,input={}){
  const options=checkOptions(input),{model,outer,logo}=context(design),issues=[],polys=design.objects.map(objectFootprint);
  const {artworkBody,bodyDistance,ALPHA_THRESHOLD}=await import('./artwork-mask.mjs'),bodies=[];
  for(const o of design.objects)bodies.push(await artworkBody(o));
  const issue=(code,ids,actualMm,requiredMm,extra={})=>issues.push({code,severity:'warning',ids,...(actualMm===null?{}:{actualMm:round(actualMm),requiredMm}),...extra});
  design.objects.forEach((o,i)=>{
    const poly=polys[i],edge=edgeDistance(poly,outer);
    if(edge<options.edgeClearance-EPS)issue('edge-clearance',[o.id],edge,options.edgeClearance);
    for(const hole of model.plateau.holes){const d=holeDistance(poly,hole);if(d<options.holeClearance-EPS)issue('hole-clearance',[o.id],d,options.holeClearance,{target:hole[0]});}
    if(logo){const d=polygonDistance(poly,logo);if(intersect(poly,logo)||d<options.clearance-EPS)issue('logo-clearance',[o.id],d,options.clearance);}
    if(o.type==='png'){const dpi=o.pixelWidth/o.width*25.4;if(dpi<options.minDpi)issue('low-dpi',[o.id],null,null,{dpi:round(dpi),requiredDpi:options.minDpi});}
    for(let j=0;j<i;j++){
      const {overlap,distance}=bodyDistance(bodies[i],bodies[j],options.clearance,{intersect,polygonDistance});
      if(overlap)issue('overlap',[design.objects[j].id,o.id],0,options.clearance);
      else if(distance<options.clearance-EPS)issue('object-clearance',[design.objects[j].id,o.id],distance,options.clearance);
    }
  });
  return {version:1,model:model.id,method:'visible-alpha-mask',alphaThreshold:ALPHA_THRESHOLD,platformMethod:'rotated-canvas-bounds',options,clear:issues.length===0,
    logo:model.logo||null,objects:design.objects.map((o,i)=>({id:o.id,name:o.name,footprint:polys[i].map(p=>p.map(round)),resolutionMm:round(bodies[i].resolutionMm)})),
    summary:Object.fromEntries(['overlap','object-clearance','logo-clearance','edge-clearance','hole-clearance','low-dpi'].map(code=>[code,issues.filter(i=>i.code===code).length])),issues};
}

export function avoidLogo(input,{ids,...settings}={}){
  const options=checkOptions(settings),design=structuredClone(input),{model,outer,logo}=context(design),moved=[],unresolved=[];
  if(ids!==undefined&&(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>!design.objects.some(o=>o.id===id))))throw new Error('避让 ids 须为已存在且不重复的对象 ID');
  if(!logo)return {design,moved,unresolved};
  for(const o of design.objects){
    if(ids&&!ids.includes(o.id))continue;
    const poly=objectFootprint(o);
    if(!intersect(poly,logo)&&polygonDistance(poly,logo)>=options.clearance-EPS)continue;
    const from={x:o.x,y:o.y},xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),hx=(Math.max(...xs)-Math.min(...xs))/2,hy=(Math.max(...ys)-Math.min(...ys))/2;
    const l=model.logo,c=options.clearance+.001;
    const candidates=[];
    for(const x of [o.x,l.x-hx-c,l.x+l.width+hx+c])for(const y of [o.y,l.y-hy-c,l.y+l.height+hy+c])candidates.push({x,y});
    // A bounded fallback also finds a place in layouts crowded around the Logo.
    const step=Math.max(5,Math.min(o.width,objectHeight(o))/3);
    for(let y=hy+c;y<=model.plateau.height-hy-c;y+=step)for(let x=hx+c;x<=model.plateau.width-hx-c;x+=step)candidates.push({x,y});
    candidates.sort((a,b)=>Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y));
    const found=candidates.find(pos=>{
      const p=objectFootprint({...o,...pos});
      if(intersect(p,logo)||polygonDistance(p,logo)<options.clearance-EPS||edgeDistance(p,outer)<options.edgeClearance-EPS)return false;
      if(model.plateau.holes.some(h=>holeDistance(p,h)<options.holeClearance-EPS))return false;
      return !design.objects.some(other=>other.id!==o.id&&(intersect(p,objectFootprint(other))||polygonDistance(p,objectFootprint(other))<options.clearance-EPS));
    });
    if(found){Object.assign(o,found);moved.push({id:o.id,from,to:found});}else unresolved.push(o.id);
  }
  return {design,moved,unresolved};
}
