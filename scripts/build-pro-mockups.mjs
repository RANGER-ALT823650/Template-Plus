import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {PHONES} from '../src/phones.js';
const original=await readFile(new URL('../assets/iphone-air/mockups/skyblue-rear.svg',import.meta.url),'utf8');
const logo=original.match(/<path d="([^"]+)" transform="translate\(30.35 59\)"/)[1];
for(const model of PHONES.filter(p=>p.id!=='iphone-air'&&p.family!=='macbook')){
 const {width:w,height:h,plateauX:x,plateauY:y}=model.phone,{outer,holes}=model.plateau;
 const folder=new URL(`../assets/phones/${model.id}/mockups/`,import.meta.url);await mkdir(folder,{recursive:true});
 for(const c of model.colors){
  const devices=holes.map(([name,hx,hy,d])=>name.startsWith('camera')?`<circle cx="${hx}" cy="${hy}" r="${d/2}" fill="url(#rim)"/><circle cx="${hx}" cy="${hy}" r="${d/2-.5}" fill="#181B20"/><circle cx="${hx}" cy="${hy}" r="${d/2-1.4}" fill="url(#lens)"/><ellipse cx="${hx-1.2}" cy="${hy-1.1}" rx="1.5" ry="2.3" fill="#5F82A8" opacity=".4"/>`:`<circle cx="${hx}" cy="${hy}" r="${d/2}" fill="${name==='flash'?'#F4EEDF':name==='lidar'?'#151A20':'#44484D'}" stroke="${c.metal}" stroke-width=".15"/>`).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="rim"><stop stop-color="${c.metal}"/><stop offset=".45" stop-color="${c.body}"/><stop offset="1" stop-color="${c.metal}"/></linearGradient><linearGradient id="body" x2=".8" y2="1"><stop stop-color="${c.panel}"/><stop offset="1" stop-color="${c.body}"/></linearGradient><radialGradient id="lens"><stop stop-color="#31445B"/><stop offset=".5" stop-color="#182331"/><stop offset="1" stop-color="#08090E"/></radialGradient></defs><rect x=".25" y=".25" width="${w-.5}" height="${h-.5}" rx="12.8" fill="url(#rim)" stroke="${c.metal}" stroke-width=".5"/><rect x="1" y="1" width="${w-2}" height="${h-2}" rx="12" fill="${c.body}"/><rect x="${x}" y="${y+model.plateau.height+3.8}" width="${model.plateau.width}" height="${h-y-model.plateau.height-8.8}" rx="10.5" fill="url(#body)" stroke="${c.metal}" stroke-width=".25"/><g transform="translate(${x} ${y})"><path d="${outer}" transform="translate(0 .8)" fill="#000" opacity=".15"/><path d="${outer}" fill="${c.body}" stroke="${c.panel}" stroke-width=".3"/>${devices}</g><path d="${logo}" transform="translate(${w/2-7} ${h*.52-20})" fill="${c.metal}" opacity=".7"/></svg>`;
  await writeFile(new URL(`${c.id}-rear.svg`,folder),svg);
 }
}
