import sharp from 'sharp';
import {assetSVG,objectHeight} from './design.js';

// Sample the rendered alpha, keeping holes and disconnected components. Merge
// occupied pixel runs into rectangles; their union is the silhouette, not its
// bounding box. The small alpha threshold ignores faint antialiasing fringes.
export const ALPHA_THRESHOLD=16;
const cache=new Map(),MAX_CACHE_BYTES=16*1024*1024;
let cacheBytes=0;
async function silhouette(o){
  const height=objectHeight(o),scale=Math.min(12,2048/Math.max(o.width,height),Math.sqrt(1_000_000/(o.width*height)));
  const w=Math.max(1,Math.ceil(o.width*scale)),h=Math.max(1,Math.ceil(height*scale));
  const source=o.type==='png'?o.dataUrl:assetSVG({...o,id:'check-mask'}),key=`${w},${h}:${source}`;
  if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
  const input=o.type==='png'?Buffer.from(source.split(',')[1],'base64'):Buffer.from(source.replace(/<svg\b[^>]*>/,tag=>tag.replace(/\s(width|height)="[^"]*"/g,'').replace(/>$/,` width="${w}" height="${h}">`)));
  const {data,info}=await sharp(input).resize(w,h,{fit:'fill'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const rects=[];let previous=new Map();
  for(let y=0;y<h;y++){
    const next=new Map();let x=0;
    while(x<w){
      if(data[(y*w+x)*info.channels+info.channels-1]<ALPHA_THRESHOLD){x++;continue;}
      const start=x++;
      while(x<w&&data[(y*w+x)*info.channels+info.channels-1]>=ALPHA_THRESHOLD)x++;
      const run=`${start},${x}`,rect=previous.get(run);
      if(rect){rect[3]=y+1;next.set(run,rect);}
      else{const r=[start,y,x,y+1];rects.push(r);next.set(run,r);}
    }
    previous=next;
  }
  const value={rects,w,h};
  // Cache only local masks: movement/rotation reuses them, recipe edits do not.
  const bytes=key.length*2+rects.length*64;
  while(cache.size&&cacheBytes+bytes>MAX_CACHE_BYTES){const [old,v]=cache.entries().next().value;cache.delete(old);cacheBytes-=v.bytes;}
  value.bytes=bytes;if(bytes<=MAX_CACHE_BYTES){cache.set(key,value);cacheBytes+=bytes;}
  return value;
}
function bounds(polys){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const poly of polys)for(const [x,y] of poly){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  return [x0,y0,x1,y1];
}
function tree(items){
  if(!items.length)return null;
  const box=bounds(items),node={box};
  if(items.length<=4){node.polys=items;return node;}
  const axis=box[2]-box[0]>box[3]-box[1]?0:1;
  items.sort((a,b)=>a.reduce((n,p)=>n+p[axis],0)-b.reduce((n,p)=>n+p[axis],0));
  const mid=Math.floor(items.length/2);node.left=tree(items.slice(0,mid));node.right=tree(items.slice(mid));return node;
}
export async function artworkBody(o){
  const mask=await silhouette(o),height=objectHeight(o),angle=o.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const point=(x,y)=>{x=(x/mask.w-.5)*o.width;y=(y/mask.h-.5)*height;return [o.x+x*c-y*s,o.y+x*s+y*c];};
  const polygons=mask.rects.map(([x0,y0,x1,y1])=>[point(x0,y0),point(x1,y0),point(x1,y1),point(x0,y1)]);
  return {root:tree(polygons),resolutionMm:Math.max(o.width/mask.w,height/mask.h)};
}
const boxGap=(a,b)=>Math.hypot(Math.max(0,a[0]-b[2],b[0]-a[2]),Math.max(0,a[1]-b[3],b[1]-a[3]));
export function bodyDistance(a,b,limit,{intersect,polygonDistance}){
  let distance=limit,overlap=false;
  function visit(a,b){
    if(!a||!b||overlap||boxGap(a.box,b.box)>distance+1e-7)return;
    if(a.polys&&b.polys){
      for(const p of a.polys)for(const q of b.polys){
        if(intersect(p,q)){overlap=true;distance=0;return;}
        distance=Math.min(distance,polygonDistance(p,q));
      }
    }else if(!a.polys&&(b.polys||(a.box[2]-a.box[0])*(a.box[3]-a.box[1])>(b.box[2]-b.box[0])*(b.box[3]-b.box[1]))){visit(a.left,b);visit(a.right,b);}
    else{visit(a,b.left);visit(a,b.right);}
  }
  visit(a.root,b.root);return {overlap,distance};
}
