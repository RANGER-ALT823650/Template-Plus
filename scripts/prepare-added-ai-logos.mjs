// Exact source-pixel cutouts: exterior flood fill keeps enclosed black eyes.
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const assets=[
  ['09-ghost','jpg','dark'],['10-pixel','png','dark'],
  ['11-obsidian','jpg','dark'],['12-blue-wave','jpg','white'],
];
await mkdir(new URL('assets/library/ai-logos-png/',root),{recursive:true});
for(const [key,ext,background] of assets){
  const {data,info:{width:w,height:h}}=await sharp(fileURLToPath(new URL(`references/ai-logos/${key}-original.${ext}`,root))).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const n=w*h,exterior=new Uint8Array(n),queue=[];
  const isBackground=i=>{const r=data[i*3],g=data[i*3+1],b=data[i*3+2];return background==='white'?Math.min(r,g,b)>225:Math.max(r,g,b)<65;};
  const visit=i=>{if(!exterior[i]&&isBackground(i)){exterior[i]=1;queue.push(i);}};
  for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x);}for(let y=0;y<h;y++){visit(y*w);visit(y*w+w-1);}
  for(let j=0;j<queue.length;j++){const i=queue[j],x=i%w,y=Math.floor(i/w);if(x)visit(i-1);if(x<w-1)visit(i+1);if(y)visit(i-w);if(y<h-1)visit(i+w);}
  // Solid interior samples and solid background samples provide an RGB matte
  // at the antialiased contour, removing dark/white source-background fringes.
  const stable=new Uint8Array(n);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;let same=true;for(let dy=-2;dy<=2&&same;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h&&exterior[yy*w+xx]!==exterior[i]){same=false;break;}}stable[i]=same?1:0;}
  const rgba=Buffer.alloc(n*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x;let near=false;for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h&&exterior[yy*w+xx]!==exterior[i]){near=true;break;}}
    if(!near){if(!exterior[i]){data.copy(rgba,i*4,i*3,i*3+3);rgba[i*4+3]=255;}continue;}
    let f=-1,bg=-1,fd=Infinity,bd=Infinity;
    for(let dy=-7;dy<=7;dy++)for(let dx=-7;dx<=7;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const j=yy*w+xx,d=dx*dx+dy*dy;if(!stable[j])continue;if(exterior[j]){if(d<bd){bg=j;bd=d;}}else if(d<fd){f=j;fd=d;}}
    if(f<0||bg<0){if(!exterior[i]){data.copy(rgba,i*4,i*3,i*3+3);rgba[i*4+3]=255;}continue;}
    let dot=0,norm=0;for(let c=0;c<3;c++){const v=data[f*3+c]-data[bg*3+c];dot+=(data[i*3+c]-data[bg*3+c])*v;norm+=v*v;}
    let alpha=Math.max(0,Math.min(1,dot/Math.max(1,norm)));if(alpha<.025)alpha=0;if(alpha>.985)alpha=1;
    rgba[i*4+3]=Math.round(alpha*255);for(let c=0;c<3;c++)rgba[i*4+c]=alpha?Math.round(Math.max(0,Math.min(255,(data[i*3+c]-(1-alpha)*data[bg*3+c])/alpha))):0;
  }
  await sharp(rgba,{raw:{width:w,height:h,channels:4}}).png().toFile(fileURLToPath(new URL(`assets/library/ai-logos-png/${key}.png`,root)));
  console.log(`${key}: original ${w} × ${h}, exterior transparent, enclosed details preserved`);
}
const catalog=JSON.parse(await readFile(new URL('assets/library/catalog.json',root),'utf8'));
const names=['白色幽灵','橙色像素小怪兽','Obsidian','蓝色波浪'];
for(const [i,[key]] of assets.entries()){const id='ai-logos-png-'+key;if(!catalog.some(item=>item.id===id))catalog.push({id,group:'ai-logos-svg',label:'AI Logo · PNG',type:'png',name:names[i],file:`/assets/library/ai-logos-png/${key}.png`});}
await writeFile(new URL('assets/library/catalog.json',root),JSON.stringify(catalog,null,2)+'\n');
