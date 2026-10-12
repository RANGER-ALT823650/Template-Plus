import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import sharp from 'sharp';
import {normalizeDesign, objectMarkup} from '../src/design.js';
import {XML, exportPrintAndCut} from '../src/export-pdf.mjs';
import {exportPNG} from '../src/export-png.mjs';
import {PLATEAU} from '../src/plateau.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const revision=process.env.AIR_SHEET_REVISION==='v2';
const out=path.join(root,`output/air-square-20261002${revision?'-v2':''}`);
await fs.mkdir(path.join(out,'sources'),{recursive:true});
const ppm=30, w=PLATEAU.width,h=PLATEAU.height,left=20.7;
const pw=Math.round(w*ppm),ph=Math.round(h*ppm);
const wrap=content=>`<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="0 0 ${w} ${h}">${content}</svg>`;
async function mask(content){const {data}=await sharp(Buffer.from(wrap(content))).ensureAlpha().raw().toBuffer({resolveWithObject:true});return Uint8Array.from({length:pw*ph},(_,i)=>data[i*4+3]>8?1:0);}
const silhouette=await mask(`<path d="${PLATEAU.path}" fill="white" fill-rule="evenodd"/>`);
const clearance=revision?1.2:.85,r=Math.ceil(clearance*ppm),safe=new Uint8Array(pw*ph);
for(let y=r;y<ph-r;y++)for(let x=Math.ceil((left+clearance)*ppm);x<pw-r;x++){
  let ok=true;
  for(let dy=-r;dy<=r&&ok;dy+=3)for(let dx=-r;dx<=r;dx+=3){if(dx*dx+dy*dy>r*r)continue;if(!silhouette[(y+dy)*pw+x+dx]){ok=false;break;}}
  if(revision&&ok){
    const px=(x+.5)*w/pw,py=(y+.5)*h/ph;
    // Check nominal circles directly, independent of SVG clipping. The
    // extra 0.06 mm covers pixel rounding and antialiasing in the audit.
    ok=PLATEAU.holes.every(([,cx,cy,d])=>Math.hypot(px-cx,py-cy)>=d/2+clearance+.06);
  }
  safe[y*pw+x]=ok?1:0;
}
const add=(id,asset,x,y,width,rotation=0)=>({op:'add',id,asset,x,y,width,rotation});
const bot=(id,shape,color,x,y,width,rotation=0)=>({op:'add',id,shape,color,padding:0,x,y,width,rotation});
const specs=[
 {stem:'01-muse',name:'Muse',ops:[add('wave','muse-png-01-profile',26.3,6.8,11.5,-12),add('read','muse-png-05-reading',29,17.5,10.3,10),add('coffee','muse-png-04-coffee',38.4,11.8,13,-7),add('sleep','muse-png-08-sleeping',49,4.7,9,13),add('run','muse-png-02-treadmill',55,19,9,-10)]},
 {stem:'02-dots',name:'Dots',ops:[add('glasses','dots-svg-03-yellow-glasses',25.5,6.2,8.9,-14),add('green','dots-svg-04-green-wide-eyes',29,17.5,8.7,12),add('blue','dots-svg-02-blue-beret',38.3,11.8,9.5,-14),add('pink','dots-svg-01-pink-headphones',48.7,4.9,7.2,12),add('heart','dots-svg-05-magenta-heart',55.3,18.6,7.1,-10)]},
 {stem:'03-grok-bot-4',name:'Grok Bot / 4',ops:[bot('a','drop','pink',26.6,7,8.6,-18),bot('b','cloud','blue',29.5,17.2,8.7,12),bot('c','hexagon','purple',39,11.7,10,-12),bot('d','capsule','teal',53.3,18.7,7.4,17)]},
 {stem:'04-grok-bot-5',name:'Grok Bot / 5',ops:[bot('a','triangle','yellow',25.5,6.2,8.5,-19),bot('b','capsule','orange',29,17.3,8.3,14),bot('c','drop','purple',38.2,11.8,9.2,-17),bot('d','square','blue',49,4.8,6.7,13),bot('e','circle','green',55,19,6.5,-12)]},
 {stem:'05-grok-bot-6',name:'Grok Bot / 6',ops:[bot('a','cloud','pink',25.9,6.2,7.6,-15),bot('b','hexagon','teal',28.4,17.3,7.7,14),bot('c','oval','yellow',34.3,5.8,7.2,16),bot('d','triangle','blue',39.3,16.4,8.5,-12),bot('e','drop','red',48.5,4.6,6.4,19),bot('f','square','purple',54.8,19,6.3,-14)]},
 {stem:'06-grok-bot-7',name:'Grok Bot / 7',ops:[bot('a','square','purple',25.5,6.1,6.7,-15),bot('b','drop','blue',27,17.4,7.2,14),bot('c','cloud','yellow',34.2,5.4,6.8,12),bot('d','circle','pink',35.3,18.1,6.5,-12),bot('e','hexagon','green',41.2,10.7,7.2,18),bot('f','capsule','orange',49.2,4.2,5.9,-12),bot('g','triangle','teal',54.7,19.1,5.9,16)]}
];
const records=[];
for(const spec of specs){
 const opsPath=path.join(out,'sources',spec.stem+'.ops.json'),layoutPath=path.join(out,'sources',spec.stem+'.json');
 await fs.writeFile(opsPath,JSON.stringify(spec.ops,null,2));
 const result=spawnSync(process.execPath,['sticker-cli.mjs','create','--model','iphone-air','--name',spec.name,'--ops',opsPath,'--out',layoutPath,'--json'],{cwd:root,encoding:'utf8'});
 if(result.status!==0)throw new Error(result.stderr);
 const design=normalizeDesign(JSON.parse(await fs.readFile(layoutPath,'utf8')),XML);
 const occupied=new Uint8Array(pw*ph),masks=[];
 for(const object of design.objects){
  const original=object.width;
  for(let attempt=0;attempt<60;attempt++){
   const candidate=await mask(objectMarkup(object));
   const collision=candidate.some((v,i)=>v&&(!safe[i]||occupied[i]));
   if(!collision){
    const gap=Math.ceil(.7*ppm);
    for(let y=0;y<ph;y++)for(let x=0;x<pw;x++)if(candidate[y*pw+x]){
     for(let dy=-gap;dy<=gap;dy+=2)for(let dx=-gap;dx<=gap;dx+=2)if(dx*dx+dy*dy<=gap*gap&&x+dx>=0&&x+dx<pw&&y+dy>=0&&y+dy<ph)occupied[(y+dy)*pw+x+dx]=1;
    }
    masks.push({id:object.id,initial_width_mm:original,final_width_mm:object.width,visible_pixels:candidate.reduce((a,b)=>a+b,0)});break;
   }
   object.width*=.98;
   if(attempt===59||object.width<4.4)throw new Error(`Unable to place ${spec.stem}/${object.id}`);
  }
 }
 await fs.writeFile(layoutPath,JSON.stringify(design,null,2));
 await fs.writeFile(path.join(out,'sources',spec.stem+'.pdf'),await exportPrintAndCut(design));
 await fs.writeFile(path.join(out,'sources',spec.stem+'.png'),await exportPNG(design));
 records.push({stem:spec.stem,name:spec.name,model:design.model,object_count:design.objects.length,checks:masks});
 console.log(`${spec.stem}: ${design.objects.length} objects, clearance ${clearance} mm, gap 0.7 mm`);
}
await fs.writeFile(path.join(out,'design-verification.json'),JSON.stringify({plateau_mm:[w,h],frame_left_mm:left,frame_mm:[w-left,h],clearance_mm:clearance,gap_mm:.7,mask_pixels_per_mm:ppm,items:records},null,2));
