import {t,errorText,initI18n,localizeSVG} from './src/i18n.js';
import {SHAPES,COLORS,DEFAULT_CONFIG,normalizeConfig,renderSVG,toCLI} from './src/avatar.js?v=20261008-shapes';
const $=id=>document.getElementById(id);
const STORE='little-shape-config-v1';
let config={...DEFAULT_CONFIG};
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
try{
  const stored=location.hash?decodeURIComponent(location.hash.slice(1)):localStorage.getItem(STORE);
  if(stored)config=normalizeConfig(JSON.parse(stored));
}catch{toast(t('已使用默认配置：保存的配置无法读取。'));}
function persist(){try{localStorage.setItem(STORE,JSON.stringify(config));}catch{/* GUI works without localStorage. */}}
function update(next){config=normalizeConfig({...config,...next});persist();render();}
function render(){
  $('avatar').innerHTML=renderSVG(config);
  const shape=SHAPES.find(s=>s.id===config.shape),color=COLORS.find(c=>c.id===config.color);
  $('character-name').textContent=`${t(shape.name)} / ${t(color.name)}`;
  $('character-meta').textContent=`${color.hex} · ${t('白色眼睛')}`;
  $('shape-name').textContent=t(shape.name);
  $('color-value').innerHTML=`${t(color.name)} <code>${color.hex}</code>`;
  for(const b of $('shapes').children)b.setAttribute('aria-pressed',String(b.dataset.id===config.shape));
  for(const b of $('colors').children)b.setAttribute('aria-pressed',String(b.dataset.id===config.color));
  // Imported CLI recipes can use any allowed integer size, not only UI presets.
  if(![...$('size').options].some(o=>Number(o.value)===config.size)){
    $('size').querySelector('option[data-custom]')?.remove();
    const option=new Option(`${config.size} × ${config.size}`,String(config.size));option.dataset.custom='true';$('size').add(option);
  }
  $('size').value=config.size;$('background').value=config.background;
  $('padding').value=config.padding;$('padding-value').value=`${config.padding}%`;
  $('cli-command').textContent=toCLI(config);localizeSVG(document.body);
}
for(const shape of SHAPES){
  const b=document.createElement('button');b.className='shape-button';b.dataset.id=shape.id;b.setAttribute('aria-label',t(shape.name));b.dataset.helpText=t(shape.name);b.setAttribute('aria-pressed','false');
  b.innerHTML=renderSVG({shape:shape.id,color:'brown',size:80,padding:10},{eyes:false})+`<span>${shape.name}</span>`;
  b.addEventListener('click',()=>update({shape:shape.id}));$('shapes').append(b);
}
for(const color of COLORS){
  const b=document.createElement('button');b.className='color-button';b.dataset.id=color.id;b.style.setProperty('--swatch',color.hex);b.dataset.helpText=`${t(color.name)} ${color.hex}`;b.setAttribute('aria-label',b.dataset.helpText);b.setAttribute('aria-pressed','false');
  b.addEventListener('click',()=>update({color:color.id}));$('colors').append(b);
}
for(const [shape,color] of [['circle','orange'],['square','blue'],['cloud','purple'],['triangle','green'],['capsule','pink'],['hexagon','teal']]){
  const b=document.createElement('button');b.dataset.shape=shape;b.dataset.color=color;b.setAttribute('aria-label',`${t(SHAPES.find(s=>s.id===shape).name)} · ${t(COLORS.find(c=>c.id===color).name)}`);
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
        if(!blob||blob.type!==mime)throw new Error(t('此浏览器不支持 {format} 导出',{format:format.toUpperCase()}));
        download(blob,name);
      }finally{URL.revokeObjectURL(source);}
    }
    toast(t('已导出 {name}',{name}));
  }catch(e){toast(t('导出失败：{error}',{error:errorText(e)}));}finally{buttons.forEach(b=>b.disabled=false);}
}
for(const format of ['svg','png','webp'])$(`export-${format}`).addEventListener('click',()=>exportImage(format));
$('save-config').addEventListener('click',()=>{download(new Blob([JSON.stringify(config,null,2)+'\n'],{type:'application/json'}),'avatar.json');toast(t('已保存配置，可在 GUI 和 CLI 中重复使用。'));});
$('load-config').addEventListener('click',()=>$('config-file').click());
$('config-file').addEventListener('change',async()=>{
  const file=$('config-file').files[0];if(!file)return;
  try{if(file.size>16384)throw new Error('配置文件超过 16 KB');config=normalizeConfig(JSON.parse(await file.text()));persist();render();toast(t('已恢复形象配置。'));}
  catch(e){toast(t('导入失败：{error}',{error:errorText(e)}));}finally{$('config-file').value='';}
});
$('reset').addEventListener('click',()=>{config={...DEFAULT_CONFIG};history.replaceState(null,'',location.pathname);persist();render();toast(t('已恢复参考图的棕色水滴。'));});
$('show-agent').addEventListener('click',()=>$('agent-dialog').showModal());
document.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('copy-command').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(toCLI(config));toast(t('命令已复制。'));}catch{toast(t('复制不可用，请手动选取上方命令。'));}});
$('show-gallery').addEventListener('click',()=>{
  if(!$('gallery').children.length)for(const s of SHAPES)for(const c of COLORS){
    const b=document.createElement('button');b.dataset.shape=s.id;b.dataset.color=c.id;b.dataset.helpText=`${t(s.name)} · ${t(c.name)}`;b.setAttribute('aria-label',b.dataset.helpText);b.innerHTML=renderSVG({shape:s.id,color:c.id,size:80,padding:10});b.addEventListener('click',()=>{update({shape:s.id,color:c.id});$('gallery-dialog').close();});$('gallery').append(b);
  }
  renderLanguage();$('gallery-dialog').showModal();
});
render();

$('send-to-layout').addEventListener('click',()=>{location.href='/#avatar='+encodeURIComponent(JSON.stringify(config));});

function renderLanguage(){render();for(const b of $('shapes').children){const s=SHAPES.find(s=>s.id===b.dataset.id);b.setAttribute('aria-label',t(s.name));b.dataset.helpText=t(s.name);}for(const b of $('colors').children){const c=COLORS.find(c=>c.id===b.dataset.id);b.dataset.helpText=t(c.name)+' '+c.hex;b.setAttribute('aria-label',b.dataset.helpText);}for(const grid of ['friends','gallery'])for(const b of $(grid).children){b.dataset.helpText=t(SHAPES.find(s=>s.id===b.dataset.shape).name)+' · '+t(COLORS.find(c=>c.id===b.dataset.color).name);b.setAttribute('aria-label',b.dataset.helpText);}localizeSVG(document.body);$('toast').classList.remove('visible');}
initI18n(renderLanguage);renderLanguage();
