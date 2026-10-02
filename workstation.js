import {loadLayout,saveLayout} from './src/layout-store.js';
import {MAX_PNG_BYTES,MAX_LAYOUT_BYTES} from './src/png-import.js';
import {mockupArtwork} from './src/mockup.js';
import {PHONES,getPhone,getPlateau,mockupPath} from './src/phones.js';
import {SHAPES,COLORS,normalizeConfig,renderSVG} from './src/avatar.js';
import {DEFAULT_DESIGN,normalizeDesign,assetSVG,objectMarkup,objectHeight,objectTransform,changeDesignModel,centerDesignObject,coverDesignObject} from './src/design.js';
const $=id=>document.getElementById(id),clone=value=>structuredClone(value);
let design=clone(DEFAULT_DESIGN),selected='first',recipe=normalizeConfig({padding:0}),showBase=true,showCut=true,zoom=1,drag=null,timer;
let past=[],future=[],catalog=[];
function trimHistory(list){let bytes=0;for(let i=list.length-1;i>=0;i--){bytes+=list[i].length;if(bytes>48*1024*1024||list.length-i>60){list.splice(0,i+1);break;}}}
const snapshot=()=>JSON.stringify(design),current=()=>design.objects.find(o=>o.id===selected),uid=()=>crypto.randomUUID();
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.remove('visible'),4000);}
let saveRevision=0;
function persist(){const revision=++saveRevision;$('save-status').textContent='正在自动保存…';saveLayout(snapshot()).then(()=>{if(revision===saveRevision)$('save-status').textContent='已自动保存于此浏览器';}).catch(()=>{if(revision===saveRevision)$('save-status').textContent='自动保存不可用，请下载布局文件';});}
function record(before){if(before!==snapshot()){past.push(before);trimHistory(past);future=[];persist();}}
function change(fn){const before=snapshot();try{fn();design=normalizeDesign(design);record(before);render();}catch(e){design=JSON.parse(before);render();toast(e.message);}}
function select(id){selected=id;const o=current();if(o?.type==='avatar')recipe=clone(o.config);render();}
function undo(){if(!past.length)return;future.push(snapshot());trimHistory(future);design=JSON.parse(past.pop());selected=design.objects.at(-1)?.id;persist();render();}
function redo(){if(!future.length)return;past.push(snapshot());trimHistory(past);design=JSON.parse(future.pop());selected=design.objects.at(-1)?.id;persist();render();}
function choose(next){recipe=normalizeConfig({...recipe,...next});const o=current();if(o?.type==='avatar')change(()=>{o.config=clone(recipe);o.name=avatarName(recipe);});else render();}
function avatarName(c){return COLORS.find(o=>o.id===c.color).name+SHAPES.find(o=>o.id===c.shape).name;}
function addAvatar(config=recipe){change(()=>{const c=normalizeConfig(config);const o={id:uid(),type:'avatar',name:avatarName(c),config:c,x:getPlateau(design).width/2,y:getPlateau(design).height/2,width:10,rotation:0};design.objects.push(o);selected=o.id;recipe=clone(c);});}
function renderCanvas(){
  const {width:w,height:h,path}=getPlateau(design),vw=(w+12)/zoom,vh=(h+18)/zoom;
  $('canvas').setAttribute('viewBox',`${(w-vw)/2} ${(h-vh)/2} ${vw} ${vh}`);
  const art=design.objects.map(o=>`<g data-object="${o.id}" style="cursor:move">${objectMarkup({...o,id:'editor-'+o.id})}</g>`).join('');
  const o=current();let handle='';
  if(o){const ht=objectHeight(o),x=-o.width/2,y=-ht/2;handle=`<g transform="${objectTransform(o)}" fill="none" stroke="#657953" stroke-width="0.15"><rect x="${x}" y="${y}" width="${o.width}" height="${ht}" pointer-events="none" stroke-dasharray=".6 .5"/><line x1="0" y1="${y}" x2="0" y2="${y-2.5}" pointer-events="none"/><circle data-handle="rotate" cx="0" cy="${y-2.5}" r=".65" fill="white" style="cursor:crosshair"/><rect data-handle="resize" x="${o.width/2-.6}" y="${ht/2-.6}" width="1.2" height="1.2" fill="white" style="cursor:nwse-resize"/></g>`;}
  $('canvas').innerHTML=`<defs><clipPath id="board-clip"><path d="${path}" clip-rule="evenodd"/></clipPath></defs>${showBase?`<path d="${path}" fill="#d9dde2" fill-rule="evenodd"/>`:''}<g clip-path="url(#board-clip)">${art}</g>${showCut?`<path d="${path}" fill="none" stroke="#c595af" stroke-width=".10" pointer-events="none"/>`:''}${handle}`;
  $('object-count').textContent=`${design.objects.length} 个形象`;
}
function render(){
  renderModel();renderCanvas();renderMockup();const o=current();
  for(const b of $('shapes').children)b.setAttribute('aria-pressed',String(b.dataset.id===recipe.shape));
  for(const b of $('colors').children)b.setAttribute('aria-pressed',String(b.dataset.id===recipe.color));
  $('recipe-hint').textContent=o?.type==='avatar'?'图案与颜色会应用于选中的形象。':'选图案与颜色，再添加到画布。';
  $('layers').replaceChildren();
  for(const item of [...design.objects].reverse()){
    const b=document.createElement('button');b.className='layer'+(selected===item.id?' selected':'');b.setAttribute('aria-label',`选择 ${item.name}`);b.setAttribute('aria-pressed',String(selected===item.id));
    const thumb=document.createElement('div');thumb.innerHTML=assetSVG({...item,id:'thumb-'+item.id});b.append(thumb.firstChild);
    const text=document.createElement('span');text.textContent=item.name;b.append(text);const meta=document.createElement('small');meta.textContent=`${item.width.toFixed(1)} mm`;b.append(meta);b.onclick=()=>select(item.id);$('layers').append(b);
  }
  if(!design.objects.length){const p=document.createElement('p');p.className='hint';p.textContent='还没有形象。从左侧添加一个吧。';$('layers').append(p);}
  $('object-fields').hidden=!o;$('selection-empty').hidden=!!o;
  if(o){$('object-name').value=o.name;$('pos-x').value=Number(o.x.toFixed(3));$('pos-y').value=Number(o.y.toFixed(3));$('obj-width').value=Number(o.width.toFixed(3));$('rotation').value=Number(o.rotation.toFixed(2));$('height-label').textContent=`画布高 ${objectHeight(o).toFixed(2)} mm · 宽高比例锁定`+(o.type==='avatar'&&o.config.background==='white'?' · 此形象带白色画布':'')+(o.type==='png'?` · 原图 ${o.pixelWidth} × ${o.pixelHeight} px · ${Math.round(o.pixelWidth/o.width*25.4)} DPI`:'');}
  $('design-name').value=design.name;
  for(const id of ['duplicate','front','back','delete','center','fill-plateau'])$(id).disabled=!o;
  $('undo').disabled=!past.length;$('redo').disabled=!future.length;
  for(const id of ['show-base','show-cut'])$(id).setAttribute('aria-pressed',String(id==='show-base'?showBase:showCut));
}
for(const s of SHAPES){const b=document.createElement('button');b.dataset.id=s.id;b.setAttribute('aria-label',s.name);b.innerHTML=renderSVG({shape:s.id,size:80,padding:8},{eyes:false})+`<span>${s.name}</span>`;b.onclick=()=>choose({shape:s.id});$('shapes').append(b);}
for(const c of COLORS){const b=document.createElement('button');b.dataset.id=c.id;b.style.setProperty('--swatch',c.hex);b.title=`${c.name} ${c.hex}`;b.setAttribute('aria-label',c.name);b.onclick=()=>choose({color:c.id});$('colors').append(b);}
for(let i=1;i<=4;i++){const b=document.createElement('button');b.textContent=`排版 0${i} ↗`;b.onclick=async()=>{try{const data=await (await fetch('/assets/iphone-air/placements.json')).json();const s=data.styles[i-1];change(()=>{design={version:1,model:design.model,name:`${getPhone(design.model).name} 排版 0${i}`,objects:s.characters.map((c,j)=>({id:uid(),name:avatarName(c),type:'avatar',config:normalizeConfig({shape:c.shape,color:c.color,padding:0,size:200}),x:c.center_mm[0]*getPlateau(design).width/PHONES[0].plateau.width,y:c.center_mm[1]*getPlateau(design).height/PHONES[0].plateau.height,width:c.canvas_size_mm,rotation:c.angle_degrees}))};selected=design.objects.at(-1).id;recipe=clone(current().config);});toast(`已载入排版 0${i}`);}catch(e){toast(e.message);}};$('presets').append(b);}
$('add-avatar').onclick=()=>addAvatar();$('undo').onclick=undo;$('redo').onclick=redo;
for(const [id,key] of [['pos-x','x'],['pos-y','y'],['obj-width','width'],['rotation','rotation'],['object-name','name']])$(id).onchange=()=>{const o=current();if(!o)return;change(()=>{o[key]=key==='name'?$(id).value:$(id).value===''?NaN:Number($(id).value);});};
$('design-name').onchange=()=>change(()=>{design.name=$('design-name').value;});
$('center').onclick=()=>change(()=>centerDesignObject(design,current()));
$('duplicate').onclick=()=>change(()=>{const o=clone(current());o.id=uid();o.name+=' 副本';o.x=Math.min(165,o.x+1.5);o.y=Math.min(124,o.y+1.5);design.objects.push(o);selected=o.id;});
$('delete').onclick=()=>change(()=>{design.objects=design.objects.filter(o=>o.id!==selected);selected=design.objects.at(-1)?.id;});
for(const side of ['front','back'])$(side).onclick=()=>change(()=>{const o=current();design.objects=design.objects.filter(v=>v.id!==o.id);design.objects[side==='front'?'push':'unshift'](o);});
$('clear').onclick=()=>change(()=>{design.objects=[];selected=null;});
$('show-base').onclick=()=>{showBase=!showBase;render();};$('show-cut').onclick=()=>{showCut=!showCut;render();};$('zoom').onchange=()=>{zoom=Number($('zoom').value);renderCanvas();};
function point(e){return new DOMPoint(e.clientX,e.clientY).matrixTransform($('canvas').getScreenCTM().inverse());}
$('canvas').addEventListener('pointerdown',e=>{
  if(e.button!==0)return;const handle=e.target.closest('[data-handle]')?.dataset.handle,id=e.target.closest('[data-object]')?.dataset.object;
  if(!handle&&!id){select(null);return;}if(id)select(id);$('canvas').focus({preventScroll:true});const o=current();if(!o)return;
  drag={mode:handle||'move',start:point(e),object:clone(o),before:snapshot(),pointer:e.pointerId};$('canvas').setPointerCapture(e.pointerId);e.preventDefault();
});
$('canvas').addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointer)return;const p=point(e),o=current(),base=drag.object;if(!o)return;
  if(drag.mode==='move'){o.x=Math.max(-100,Math.min(165,base.x+p.x-drag.start.x));o.y=Math.max(-100,Math.min(124,base.y+p.y-drag.start.y));}
  else if(drag.mode==='rotate')o.rotation=Math.atan2(p.y-o.y,p.x-o.x)*180/Math.PI+90;
  else {const angle=-base.rotation*Math.PI/180,dx=p.x-base.x,dy=p.y-base.y,lx=dx*Math.cos(angle)-dy*Math.sin(angle),ly=dx*Math.sin(angle)+dy*Math.cos(angle);o.width=Math.max(.5,Math.min(150,2*Math.max(Math.abs(lx),Math.abs(ly)/(objectHeight(base)/base.width))));}
  render();
});
function endDrag(e){if(!drag||e.pointerId!==drag.pointer)return;record(drag.before);drag=null;render();}
$('canvas').addEventListener('pointerup',endDrag);$('canvas').addEventListener('lostpointercapture',endDrag);
$('canvas').addEventListener('pointercancel',e=>{if(!drag)return;design=JSON.parse(drag.before);drag=null;render();});
window.addEventListener('keydown',e=>{
  if(e.target.closest('input,select,textarea,button,a'))return;
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
  if(!current())return;if(['Backspace','Delete'].includes(e.key)){e.preventDefault();$('delete').click();}
  const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(moves[e.key]){e.preventDefault();change(()=>{const o=current(),step=e.shiftKey?1:.1;o.x+=moves[e.key][0]*step;o.y+=moves[e.key][1]*step;});}
});
async function api(path,value){const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});if(!response.ok)throw new Error((await response.json()).error||'请求失败');return response;}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('import-svg').onclick=()=>$('svg-file').click();
$('svg-file').onchange=async()=>{const f=$('svg-file').files[0];if(!f)return;try{if(f.size>200000)throw new Error('SVG 必须小于 200 KB');const asset=await (await api('/api/import-svg',{svg:await f.text()})).json();change(()=>{const o={id:uid(),name:f.name.slice(0,100),type:'svg',...asset,x:getPlateau(design).width/2,y:getPlateau(design).height/2,width:12,rotation:0};design.objects.push(o);selected=o.id;});toast('已导入 SVG，保持矢量与宽高比例。');}catch(e){toast(`导入失败：${e.message}`);}finally{$('svg-file').value='';}};
function addAsset(asset,name,type){change(()=>{const o={id:uid(),name:name.slice(0,100),type,...asset,x:getPlateau(design).width/2,y:getPlateau(design).height/2,width:12,rotation:0};design.objects.push(o);selected=o.id;});}
function fileDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('读取图片失败'));r.readAsDataURL(file);});}
$('import-png').onclick=()=>$('png-file').click();
$('png-file').onchange=async()=>{const f=$('png-file').files[0];if(!f)return;try{if(f.size>MAX_PNG_BYTES)throw new Error('图片最大 5 MB');let dataUrl=await fileDataUrl(f);if(dataUrl.startsWith('data:application/octet-stream;')){const ext=f.name.split('.').at(-1).toLowerCase(),mime={jpg:'jpeg',jpeg:'jpeg',png:'png',webp:'webp',gif:'gif',tif:'tiff',tiff:'tiff'}[ext];if(mime)dataUrl=dataUrl.replace('application/octet-stream','image/'+mime);}const asset=await (await api('/api/import-image',{dataUrl})).json();addAsset(asset,f.name,'png');toast('已导入图片，保持比例与透明度；可点击“铺满平台”。');}catch(e){toast(`导入失败：${e.message}`);}finally{$('png-file').value='';}};
function renderLibrary(){
  const group=$('library-group').value,items=catalog.filter(item=>group==='all'||item.group===group);$('asset-library').replaceChildren();
  for(const item of items){const b=document.createElement('button');b.className='asset-card';b.setAttribute('aria-label',`添加 ${item.name} ${item.type.toUpperCase()}`);const img=document.createElement('img');img.src=item.file;img.alt='';img.loading='lazy';b.append(img);const name=document.createElement('span');name.textContent=item.name;b.append(name);const type=document.createElement('small');type.textContent=item.type.toUpperCase();b.append(type);b.onclick=async()=>{b.disabled=true;try{const response=await fetch(item.file);if(!response.ok)throw new Error('素材读取失败');let asset;if(item.type==='svg')asset=await (await api('/api/import-svg',{svg:await response.text()})).json();else {const dataUrl=await fileDataUrl(await response.blob());asset=await (await api('/api/import-png',{dataUrl})).json();}addAsset(asset,item.name,item.type);toast(`已添加 ${item.name}`);}catch(e){toast(e.message);}finally{b.disabled=false;}};$('asset-library').append(b);}
  $('library-count').textContent=`${items.length} / ${catalog.length} 款`;
}
$('library-group').onchange=renderLibrary;
fetch('/assets/library/catalog.json').then(r=>{if(!r.ok)throw new Error('素材目录加载失败');return r.json();}).then(data=>{catalog=data;renderLibrary();}).catch(e=>{$('library-status').textContent=e.message;});
let renderedModel;
for(const phone of PHONES){const option=document.createElement('option');option.value=phone.id;option.textContent=phone.name;$('phone-model').append(option);}
function renderModel(){
  const model=getPhone(design.model),{width,height}=model.plateau;
  $('phone-model').value=model.id;$('model-name').textContent=model.name;$('model-size').textContent=`${width.toFixed(4)} × ${height.toFixed(4)} mm · 1:1`;
  $('canvas').setAttribute('aria-label',`${model.name} 贴纸，拖动形象调整位置`);
  $('geometry-note').textContent=`灰底仅供预览。成品透明；外边界与 ${model.plateau.holes.length} 个孔位自动挖空。`;
  $('phone-specs').href=model.specs;
  if(renderedModel!==model.id){
    $('phone-color').replaceChildren(...model.colors.map(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.name;return o;}));
    try{const saved=localStorage.getItem('template-plus-phone-color-'+model.id)||(model.id==='iphone-air'?localStorage.getItem('template-plus-phone-color'):null);if(model.colors.some(c=>c.id===saved))$('phone-color').value=saved;}catch{}
    renderedModel=model.id;
  }
}
$('phone-model').onchange=()=>change(()=>changeDesignModel(design,$('phone-model').value));
$('fill-plateau').onclick=()=>change(()=>coverDesignObject(design,current()));
function renderMockup(){
  const model=getPhone(design.model),color=model.colors.find(c=>c.id===$('phone-color').value)||model.colors[0],{width,height}=model.phone;
  $('phone-preview').setAttribute('viewBox',`-4 -4 ${width+8} ${height+8}`);
  $('phone-preview').setAttribute('aria-label',`${model.name} ${color.name}整机背面贴纸预览`);
  $('phone-preview').innerHTML=`<image href="${mockupPath(model.id,color.id)}" width="${width}" height="${height}"/>${mockupArtwork(design)}`;
}
$('phone-color').onchange=()=>{try{localStorage.setItem('template-plus-phone-color-'+getPhone(design.model).id,$('phone-color').value);}catch{}renderMockup();};
$('toggle-mockup').onclick=()=>{const panel=$('mockup-panel');panel.hidden=!panel.hidden;$('toggle-mockup').setAttribute('aria-expanded',String(!panel.hidden));$('toggle-mockup').textContent=panel.hidden?'展开机模':'收起机模';};
$('save-layout').onclick=()=>{download(new Blob([JSON.stringify(design,null,2)+'\n'],{type:'application/json'}),getPhone(design.model).id+'-layout.json');toast('布局已保存，包含形象素材和位置。');};
$('show-agent').onclick=()=>{
  const o=current();
  $('agent-commands').textContent=[
    'node sticker-cli.mjs list --json',
    'node sticker-cli.mjs inspect --config layout.json --json',
    o?`node sticker-cli.mjs update --config layout.json --id ${o.id} --x ${o.x} --y ${o.y} --width ${o.width} --rotation ${o.rotation} --out layout-v2.json --json`:'node sticker-cli.mjs add --config layout.json --id buddy --shape drop --color brown --out layout-v2.json --json',
    'node sticker-cli.mjs apply --config layout.json --ops operations.json --out layout-v2.json --json',
    'node sticker-cli.mjs render --config layout-v2.json --out output/sticker.pdf --json',
    `node sticker-cli.mjs preview --config layout-v2.json --phone-color ${$('phone-color').value} --out output/preview.png --json`,
  ].join('\n\n');
  $('agent-dialog').showModal();
};
$('close-agent').onclick=()=>$('agent-dialog').close();
$('agent-save-layout').onclick=()=>{download(new Blob([JSON.stringify(design,null,2)+'\n'],{type:'application/json'}),'layout.json');toast('已保存布局，交给 Agent 后可重新导入。');};
$('copy-agent-commands').onclick=async()=>{try{await navigator.clipboard.writeText($('agent-commands').textContent);toast('命令已复制。');}catch{toast('复制不可用，请手动选取命令。');}};
$('load-layout').onclick=()=>$('layout-file').click();
$('layout-file').onchange=async()=>{const f=$('layout-file').files[0];if(!f)return;try{if(f.size>MAX_LAYOUT_BYTES)throw new Error('布局文件超过 32 MB');const validated=await (await api('/api/validate',JSON.parse(await f.text()))).json();change(()=>{design=validated;selected=design.objects.at(-1)?.id;});toast('已恢复布局。');}catch(e){toast(`导入失败：${e.message}`);}finally{$('layout-file').value='';}};
for(const format of ['pdf','svg','png'])$(`export-${format}`).onclick=async()=>{const buttons=['pdf','svg','png'].map(f=>$(`export-${f}`));buttons.forEach(b=>b.disabled=true);try{const captured=clone(design);const blob=await (await api(`/api/export/${format}`,captured)).blob();download(blob,`${getPhone(captured.model).id}-${format==='pdf'?'print-and-cut':format==='png'?'artwork-600dpi':'artwork'}.${format}`);toast(`已导出 ${format.toUpperCase()}${format==='pdf'?'，含独立印刷层和刀线层':''}。`);}catch(e){toast(`导出失败：${e.message}`);}finally{buttons.forEach(b=>b.disabled=false);}};
try{const saved=await loadLayout();if(saved){design=normalizeDesign(JSON.parse(saved));selected=design.objects.at(-1)?.id;}}catch(e){toast(`自动保存的布局无法读取：${e.message}`);}
if(location.hash.startsWith('#avatar=')){try{const config=normalizeConfig(JSON.parse(decodeURIComponent(location.hash.slice(8))));addAvatar(config);history.replaceState(null,'',location.pathname);toast('已将形象编辑器中的小伙伴添加到排版。');}catch(e){toast(e.message);}}
if(current()?.type==='avatar')recipe=clone(current().config);render();
