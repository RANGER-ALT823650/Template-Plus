import sharp from 'sharp';
import potrace from 'potrace';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const base=new URL('../references/additional-shapes/',import.meta.url);
await mkdir(base,{recursive:true});
const shapes=[
  {id:'sparkle',name:'四角星',left:741,top:41,width:124,height:124},
  {id:'clover',name:'四叶花',left:917,top:47,width:118,height:113},
  {id:'heart',name:'爱心',left:221,top:222,width:115,height:104},
  {id:'flower',name:'六瓣花',left:395,top:217,width:123,height:119},
  {id:'pentagon',name:'五边形',left:407,top:399,width:112,height:109},
  {id:'star',name:'六角星',left:567,top:390,width:125,height:120},
];
const source=await readFile(new URL('source.png',base));
const vectors=[];
for(const shape of shapes){
  const {data,info}=await sharp(source).extract({left:shape.left,top:shape.top,width:shape.width,height:shape.height}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const mask=Buffer.alloc(info.width*info.height,255);
  let minX=info.width,minY=info.height,maxX=0,maxY=0;
  for(let i=0;i<mask.length;i++)if(data[i*3]>=128&&data[i*3+1]>=128&&data[i*3+2]>=128){
    mask[i]=0;const x=i%info.width,y=Math.floor(i/info.width);
    minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
  }
  const png=await sharp(mask,{raw:{width:info.width,height:info.height,channels:1}}).png().toBuffer();
  await writeFile(new URL(`${shape.id}.png`,base),png);
  // Retain the screenshot's antialiasing before tracing at 4× resolution.
  // A 0.7-source-pixel smoothing radius removes screenshot pixel steps.
  const tracePNG=await sharp(source).extract({left:shape.left,top:shape.top,width:shape.width,height:shape.height}).greyscale().negate({alpha:false}).resize(info.width*4,info.height*4,{kernel:'cubic'}).blur(2.8).threshold(128).png().toBuffer();
  const traced=await new Promise((resolve,reject)=>potrace.trace(tracePNG,{threshold:128,turdSize:0,alphaMax:1.334,optCurve:true,optTolerance:1.6},(err,svg)=>err?reject(err):resolve(svg.match(/<path[^>]*d="([^"]+)"/)[1])));
  const path=traced.replace(/-?\d+(?:\.\d+)?/g,value=>String(Number((Number(value)/4).toFixed(4))));
  const scale=160/Math.max(maxX-minX+1,maxY-minY+1);
  const dx=100-(minX+maxX+1)/2*scale,dy=100-(minY+maxY+1)/2*scale;
  vectors.push({id:shape.id,name:shape.name,path,transform:`translate(${dx.toFixed(6)} ${dy.toFixed(6)}) scale(${scale.toFixed(6)})`});
}
await writeFile(new URL('manifest.json',base),JSON.stringify(shapes,null,2)+'\n');
await writeFile(new URL('../src/additional-shapes.js',import.meta.url),`// Additional silhouettes traced from references/additional-shapes/source.png.\nexport const ADDITIONAL_SHAPES = ${JSON.stringify(vectors,null,2)};\n`);
console.log(`Traced ${vectors.length} additional shapes.`);
