import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const items=JSON.parse(await readFile(new URL('../assets/library/catalog.json',import.meta.url),'utf8')).filter(i=>i.group==='ai-logos-svg');
const tile=350,composites=[],output=new URL('../output/ai-logos/',import.meta.url);
for(const [i,item] of items.entries()){
  const x=(i%4)*tile,y=Math.floor(i/4)*tile;
  const source=new URL('..'+item.file,import.meta.url);
  const png=await sharp(fileURLToPath(source)).resize(270,270,{fit:'inside'}).png().toBuffer(),meta=await sharp(png).metadata();
  await writeFile(new URL(item.id+'.png',output),png);
  composites.push({input:png,left:x+Math.round((tile-meta.width)/2),top:y+35+Math.round((270-meta.height)/2)});
  composites.push({input:Buffer.from(`<svg width="350" height="350"><text x="175" y="330" text-anchor="middle" font-family="Arial" font-size="22" fill="#202630">${item.name}</text></svg>`),left:x,top:y});
}
const bg=Buffer.from('<svg width="1400" height="700" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="check" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#b8bec7"/><path d="M0 0h12v12H0zM12 12h12v12H12z" fill="#d1d5dc"/></pattern></defs><rect width="1400" height="700" fill="url(#check)"/></svg>');
await sharp(bg).composite(composites).png().toFile(fileURLToPath(new URL('ai-logos-preview.png',output)));
