import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {PLATEAU} from '../src/plateau.js';
import {normalizeDesign,objectMarkup} from '../src/design.js';
import {XML} from '../src/export-pdf.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'output/air-square-20261002-v2');
await fs.mkdir(path.join(out,'output'),{recursive:true});
const records=JSON.parse(await fs.readFile(path.join(out,'design-verification.json'),'utf8'));
const w=PLATEAU.width,h=PLATEAU.height,left=records.frame_left_mm;
const pw=Math.round(w*60),ph=Math.round(h*60),pixelRadius=Math.hypot(w/pw,h/ph)/2;
const envelope=(content)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="0 0 ${w} ${h}">${content}</svg>`;
const silhouette=(await sharp(Buffer.from(envelope(`<path d="${PLATEAU.path}" fill="white" fill-rule="evenodd"/>`))).ensureAlpha().raw().toBuffer());
const result=[];let rows='';
for(let i=0;i<records.items.length;i++){
 const rec=records.items[i];
 const design=normalizeDesign(JSON.parse(await fs.readFile(path.join(out,'sources',rec.stem+'.json'),'utf8')),XML);
 const markup=design.objects.map(objectMarkup).join('');
 // Deliberately render without the normal outer/hole clip. This catches
 // artwork that was cropped away by export rather than genuinely avoided.
 const rgba=await sharp(Buffer.from(envelope(markup))).ensureAlpha().raw().toBuffer();
 const gaps=PLATEAU.holes.map(()=>Infinity);let outside=0,minX=Infinity,maxX=-Infinity;
 for(let y=0;y<ph;y++)for(let x=0;x<pw;x++){
  const index=(y*pw+x)*4+3;if(rgba[index]<=8)continue;
  if(silhouette[index]<240)outside++;
  const px=(x+.5)*w/pw,py=(y+.5)*h/ph;
  minX=Math.min(minX,px-pixelRadius);maxX=Math.max(maxX,px+pixelRadius);
  PLATEAU.holes.forEach(([,cx,cy,d],j)=>gaps[j]=Math.min(gaps[j],Math.hypot(px-cx,py-cy)-d/2-pixelRadius));
 }
 if(outside||minX<left||gaps.some(v=>v<1.2))throw new Error(`${rec.stem}: failed ${JSON.stringify({outside,minX,gaps})}`);
 result.push({theme:rec.name,unclipped_artwork_outside_plateau_or_in_holes_pixels:outside,artwork_bounds_x_mm:[minX,maxX],minimum_clearance_mm:Object.fromEntries(PLATEAU.holes.map(([name],j)=>[name,gaps[j]]))});
 const x=4+(i%2)*72,y=15+Math.floor(i/2)*31;
 rows+=`<text x="${x}" y="${y-2}" font-size="2.3" fill="#222">${rec.name}</text><g transform="translate(${x} ${y})"><path d="${PLATEAU.path}" fill="#e4e6e9" fill-rule="evenodd"/>`;
 for(const [name,cx,cy,d] of PLATEAU.holes){
  rows+=`<circle cx="${cx}" cy="${cy}" r="${d/2+1.2}" fill="none" stroke="#d64545" stroke-width=".13" stroke-dasharray=".5 .4"/><circle cx="${cx}" cy="${cy}" r="${d/2}" fill="#454a50"/>`;
  if(name!=='camera')rows+=`<text x="${cx}" y="${cy+.6}" text-anchor="middle" font-size="1.5" fill="white">${name==='flash'?'F':'M'}</text>`;
 }
 rows+=`<line x1="${left}" y1="0" x2="${left}" y2="${h}" stroke="#d47c10" stroke-width=".18"/>${markup}</g>`;
}
const camera=PLATEAU.holes[0],cameraRight=camera[1]+camera[3]/2,available=w-cameraRight;
if(w-left+.12>available)throw new Error('Printed sticker exceeds available length');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1480" height="1140" viewBox="0 0 148 114"><rect width="148" height="114" fill="white"/><text x="4" y="4.8" font-family="Arial" font-size="2.5">iPhone Air / actual plateau geometry / M: microphone / F: flash</text><text x="4" y="8" font-family="Arial" font-size="1.9" fill="#777">Red dashed circles: 1.2 mm keep-clear margin. Orange line: sticker left edge.</text>${rows}<text x="4" y="109" font-size="2.2">Available length: ${available.toFixed(2)} mm / sticker including outline: ${(w-left+.12).toFixed(2)} mm</text><text x="4" y="112.5" font-size="1.9" fill="#777">Verification preview only. Gray plateau and hole markers are excluded from the print PDF.</text></svg>`;
await fs.writeFile(path.join(out,'output/plateau-overlay.svg'),svg);
await sharp(Buffer.from(svg)).png().toFile(path.join(out,'output/plateau-overlay.png'));
await fs.writeFile(path.join(out,'actual-plateau-audit.json'),JSON.stringify({pixels_per_mm:60,alpha_threshold:8,source_geometry:'assets/iphone-air/dimensions.json',camera_right_edge_mm:cameraRight,available_length_mm:available,sticker_centerline_length_mm:w-left,sticker_length_including_stroke_mm:w-left+.12,artwork_checks_use_unclipped_render:true,items:result},null,2));
console.log(JSON.stringify(result.map(r=>({theme:r.theme,gaps:r.minimum_clearance_mm})),null,2));
