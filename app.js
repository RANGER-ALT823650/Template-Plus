import {SHAPES,COLORS,DEFAULT_CONFIG,normalizeConfig,renderSVG,toCLI} from './src/avatar.js';
const $=id=>document.getElementById(id);
const STORE='little-shape-config-v1';
let config={...DEFAULT_CONFIG};
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
try{
  const stored=location.hash?decodeURIComponent(location.hash.slice(1)):localStorage.getItem(STORE);
  if(stored)config=normalizeConfig(JSON.parse(stored));
}catch{toast('已使用默认配置：保存的配置无法读取。');}
function persist(){try{localStorage.setItem(STORE,JSON.stringify(config));}catch{/* GUI works without localStorage. */}}
function update(next){config=normalizeConfig({...config,...next});persist();render();}
function render(){
  $('avatar').innerHTML=renderSVG(config);
  const shape=SHAPES.find(s=>s.id===config.shape),color=COLORS.find(c=>c.id===config.color);
  $('character-name').textContent=`${shape.name} / ${color.name}`;
  $('character-meta').textContent=`${color.hex} · 白色眼睛`;
  $('shape-name').textContent=shape.name;
  $('color-value').innerHTML=`${color.name} <code>${color.hex}</code>`;
  for(const b of $('shapes').children)b.setAttribute('aria-pressed',String(b.dataset.id===config.shape));
  for(const b of $('colors').children)b.setAttribute('aria-pressed',String(b.dataset.id===config.color));
  // Imported CLI recipes can use any allowed integer size, not only UI presets.
  if(![...$('size').options].some(o=>Number(o.value)===config.size)){
    $('size').querySelector('option[data-custom]')?.remove();
    const option=new Option(`${config.size} × ${config.size}`,String(config.size));option.dataset.custom='true';$('size').add(option);
  }
  $('size').value=config.size;$('background').value=config.background;
  $('padding').value=config.padding;$('padding-value').value=`${config.padding}%`;
  $('cli-command').textContent=toCLI(config);
}
for(const shape of SHAPES){
  const b=document.createElement('button');b.className='shape-button';b.dataset.id=shape.id;b.setAttribute('aria-label',shape.name);b.setAttribute('aria-pressed','false');
  b.innerHTML=renderSVG({shape:shape.id,color:'brown',size:80,padding:10},{eyes:false})+`<span>${shape.name}</span>`;
  b.addEventListener('click',()=>update({shape:shape.id}));$('shapes').append(b);
}
for(const color of COLORS){
  const b=document.createElement('button');b.className='color-button';b.dataset.id=color.id;b.style.setProperty('--swatch',color.hex);b.title=`${color.name} ${color.hex}`;b.setAttribute('aria-label',`${color.name} ${color.hex}`);b.setAttribute('aria-pressed','false');
  b.addEventListener('click',()=>update({color:color.id}));$('colors').append(b);
}
for(const [shape,color] of [['circle','orange'],['square','blue'],['cloud','purple'],['triangle','green'],['capsule','pink'],['hexagon','teal']]){
  const b=document.createElement('button');b.setAttribute('aria-label',`${SHAPES.find(s=>s.id===shape).name} · ${COLORS.find(c=>c.id===color).name}`);
  b.innerHTML=renderSVG({shape,color,size:80,padding:10});b.addEventListener('click',()=>update({shape,color}));$('friends').append(b);
}
$('size').addEventListener('change',()=>update({size:Number($('size').value)}));
$('background').addEventListener('change',()=>update({background:$('background').value}));
$('padding').addEventListener('input',()=>update({padding:Number($('padding').value)}));
$('random').addEventListener('click',()=>{let shape,color;do{shape=SHAPES[Math.floor(Math.random()*SHAPES.length)].id;color=COLORS[Math.floor(Math.random()*COLORS.length)].id;}while(shape===config.shape&&color===config.color);update({shape,color});});
for(const [id,grid] of [['preview-light',false],['preview-grid',true]])$(id).addEventListener('click',()=>{
  $('stage').classList.toggle('checker',grid);
  for(const [other,active] of [['preview-light',!grid],['preview-grid',grid]]){$(other).classList.toggle('active',active);$(other).setAttribute('aria-pressed',String(active));}
});
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function exportImage(format){
  const buttons=['export-svg','export-png','export-webp'].map($);buttons.forEach(b=>b.disabled=true);
  // Capture the recipe before async rasterization so the filename matches it.
  const recipe={...config};const svg=renderSVG(recipe);const name=`${recipe.shape}-${recipe.color}.${format}`;
  try{
    if(format==='svg')download(new Blob([svg],{type:'image/svg+xml'}),name);
    else{
      const source=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
      try{
        const image=new Image();image.src=source;await image.decode();
        const canvas=document.createElement('canvas');canvas.width=recipe.size;canvas.height=recipe.size;
        const ctx=canvas.getContext('2d');if(!ctx)throw new Error('浏览器无法创建画布');
        ctx.drawImage(image,0,0,recipe.size,recipe.size);
        const mime=`image/${format}`;
        const blob=await new Promise(resolve=>canvas.toBlob(resolve,mime,1));
        if(!blob||blob.type!==mime)throw new Error(`此浏览器不支持 ${format.toUpperCase()} 导出`);
        download(blob,name);
      }finally{URL.revokeObjectURL(source);}
    }
    toast(`已导出 ${name}`);
  }catch(e){toast(`导出失败：${e.message}`);}finally{buttons.forEach(b=>b.disabled=false);}
}
for(const format of ['svg','png','webp'])$(`export-${format}`).addEventListener('click',()=>exportImage(format));
$('save-config').addEventListener('click',()=>{download(new Blob([JSON.stringify(config,null,2)+'\n'],{type:'application/json'}),'avatar.json');toast('已保存配置，可在 GUI 和 CLI 中重复使用。');});
$('load-config').addEventListener('click',()=>$('config-file').click());
$('config-file').addEventListener('change',async()=>{
  const file=$('config-file').files[0];if(!file)return;
  try{if(file.size>16384)throw new Error('配置文件超过 16 KB');config=normalizeConfig(JSON.parse(await file.text()));persist();render();toast('已恢复形象配置。');}
  catch(e){toast(`导入失败：${e.message}`);}finally{$('config-file').value='';}
});
$('reset').addEventListener('click',()=>{config={...DEFAULT_CONFIG};history.replaceState(null,'',location.pathname);persist();render();toast('已恢复参考图的棕色水滴。');});
$('show-agent').addEventListener('click',()=>$('agent-dialog').showModal());
document.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('copy-command').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(toCLI(config));toast('命令已复制。');}catch{toast('复制不可用，请手动选取上方命令。');}});
$('show-gallery').addEventListener('click',()=>{
  if(!$('gallery').children.length)for(const s of SHAPES)for(const c of COLORS){
    const b=document.createElement('button');b.title=`${s.name} · ${c.name}`;b.setAttribute('aria-label',b.title);b.innerHTML=renderSVG({shape:s.id,color:c.id,size:80,padding:10});b.addEventListener('click',()=>{update({shape:s.id,color:c.id});$('gallery-dialog').close();});$('gallery').append(b);
  }
  $('gallery-dialog').showModal();
});
render();

$('send-to-layout').addEventListener('click',()=>{location.href='/#avatar='+encodeURIComponent(JSON.stringify(config));});
