// Run after prepare-ai-logos.py. All final artwork is paths + SVG gradients.
import potrace from 'potrace';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {importSVG} from '../src/svg-import.js';
import {XML} from '../src/export-pdf.mjs';
const work=new URL('../output/ai-logos/',import.meta.url);
const target=new URL('../assets/library/ai-logos-svg/',import.meta.url);
await mkdir(target,{recursive:true});
const manifest=JSON.parse(await readFile(new URL('manifest.json',work),'utf8'));
const num=n=>Number(n.toFixed(4));
const trace=file=>new Promise((resolve,reject)=>potrace.trace(fileURLToPath(new URL(file,work)),{
  threshold:128,turdSize:2,alphaMax:1,optCurve:true,optTolerance:.2,
},(err,svg)=>err?reject(err):resolve(svg.match(/<path[^>]*d="([^"]+)"/)[1])));
for(const item of manifest){
  const backing=await trace(item.key+'-backing.png');
  let defs='',body='';
  for(const layer of item.layers){
    const path=await trace(layer.mask);
    body+=`<path d="${path}" fill="${layer.color}" fill-rule="evenodd"/>\n`;
    if(item.gradients){
      for(const [i,g] of item.gradients.entries()){
        const id=`${item.key}-gradient-${i}`;
        const stops=Array.from({length:33},(_,j)=>{const t=j/32;return `<stop offset="${num(t)}" stop-color="${g.color}" stop-opacity="${num(t===1?0:Math.min(1,g.strength*Math.exp(-.5*(t*4)**2)))}"/>`;}).join('');
        defs+=`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="4" gradientTransform="translate(${num(g.cx)} ${num(g.cy)}) scale(${num(g.sx)} ${num(g.sy)})">${stops}</radialGradient>\n`;
        body+=`<path d="${path}" fill="url(#${id})"/>\n`;
      }
    }
  }
  const vb=item.viewBox.map(num);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${vb[2]}" height="${vb[3]}" viewBox="${vb.join(' ')}">\n<title>${item.name}</title>\n<desc>${item.name} Logo，透明背景、白色等距边框。</desc>\n${defs?'<defs>'+defs+'</defs>\n':''}<path d="${backing}" fill="#ffffff" stroke="#ffffff" stroke-width="${num(item.border*2)}" stroke-linejoin="round" stroke-linecap="round"/>\n${body}</svg>\n`;
  importSVG(svg,XML);
  await writeFile(new URL(item.file,target),svg);
  console.log(`${item.name}: ${Buffer.byteLength(svg)} bytes`);
}
