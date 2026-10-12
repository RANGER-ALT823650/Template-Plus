// Copy independent originals into Plus; never modify neighboring projects.
import {mkdir,readdir,copyFile,writeFile,readFile} from 'node:fs/promises';
import {XML} from '../src/export-pdf.mjs';
import {importSVG} from '../src/svg-import.js';
import {importPNG} from '../src/png-import.js';
const groups=[['muse-png','Muse · PNG','../../muse/png','png'],['dots-svg','Dots · SVG','../../dots','svg'],['muse-svg','Muse · SVG','../../muse','svg'],['ai-logos-svg','AI Logo · SVG','../assets/library/ai-logos-svg','svg'],['ai-logos-svg','AI Logo · PNG','../assets/library/ai-logos-png','png','ai-logos-png']];
const logoNames={'09-ghost.png':'白色幽灵','10-pixel.png':'橙色像素小怪兽','11-obsidian.png':'Obsidian','12-blue-wave.png':'蓝色波浪'};
const items=[];
for(const [group,label,source,format,folder=group] of groups){
  const target=new URL(`../assets/library/${folder}/`,import.meta.url);await mkdir(target,{recursive:true});
  const files=(await readdir(new URL(source+'/',import.meta.url))).filter(f=>new RegExp(`^\\d{2}-.+\\.${format}$`).test(f)).sort();
  for(const file of files){const from=new URL(source+'/'+file,import.meta.url),to=new URL(file,target);if(from.href!==to.href)await copyFile(from,to);
    const buffer=await readFile(to);if(format==='svg')importSVG(buffer.toString(),XML);else importPNG('data:image/png;base64,'+buffer.toString('base64'));
    const name=format==='svg'?buffer.toString().match(/<title(?:\s[^>]*)?>([^<]+)<\/title>/)?.[1]?.replace(/^MUSE\s*·\s*/,''):null;
    const pngNames=['打招呼','跑步机','耳机办公','喝咖啡','阅读','浇花','画画','睡觉'];
    items.push({id:folder+'-'+file.slice(0,-4),group,label,type:format,name:name||logoNames[file]||'Muse · '+pngNames[Number(file.slice(0,2))-1],file:`/assets/library/${folder}/${file}`});
  }
}
await writeFile(new URL('../assets/library/catalog.json',import.meta.url),JSON.stringify(items,null,2)+'\n');
console.log(`Imported ${items.length} independent assets`);
