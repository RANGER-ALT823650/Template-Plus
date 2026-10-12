import {t,displayName,errorText,initI18n,localizeSVG} from './src/i18n.js';
import {loadLayout,saveLayout} from './src/layout-store.js';
import {MAX_PNG_BYTES,MAX_LAYOUT_BYTES} from './src/png-import.js';
import {mockupArtwork,loadMockupBody} from './src/mockup.js?v=20261008-inline';
import {PHONES,getPhone,getPlateau} from './src/phones.js';
import {macbookLogoMarkup} from './src/macbooks.js';
import {avoidLogo} from './src/layout-check.js';
import {generationRequest} from './src/generation.js';
import {SHAPES,COLORS,normalizeConfig,renderSVG} from './src/avatar.js?v=20261008-shapes';
import {DEFAULT_DESIGN,OBJECT_LIMITS,initialObjectWidth,presetObjects,normalizeDesign,assetSVG,objectMarkup,objectHeight,objectTransform,changeDesignModel,centerDesignObject,coverDesignObject} from './src/design.js';
const $=id=>document.getElementById(id),clone=value=>structuredClone(value);
let design=clone(DEFAULT_DESIGN),selected='first',recipe=normalizeConfig({padding:0}),showBase=true,showCut=true,showLogo=true,zoom=1,drag=null,timer;
let past=[],future=[],catalog=[];
function trimHistory(list){let bytes=0;for(let i=list.length-1;i>=0;i--){bytes+=list[i].length;if(bytes>48*1024*1024||list.length-i>60){list.splice(0,i+1);break;}}}
const snapshot=()=>JSON.stringify(design),current=()=>design.objects.find(o=>o.id===selected),uid=()=>crypto.randomUUID();
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.remove('visible'),4000);}
let saveRevision=0;
function setSaveStatus(key){$('save-status').dataset.i18n=key;$('save-status').textContent=t(key);}
function persist(){const revision=++saveRevision;setSaveStatus('正在自动保存…');saveLayout(snapshot()).then(()=>{if(revision===saveRevision)setSaveStatus('已自动保存于此浏览器');}).catch(()=>{if(revision===saveRevision)setSaveStatus('自动保存不可用，请下载布局文件');});}
function record(before){if(before!==snapshot()){past.push(before);trimHistory(past);future=[];persist();}}
function change(fn){const before=snapshot();try{fn();design=normalizeDesign(design);record(before);render();}catch(e){design=JSON.parse(before);render();toast(errorText(e));}}
function select(id){selected=id;const o=current();if(o?.type==='avatar')recipe=clone(o.config);render();}
function undo(){if(!past.length)return;future.push(snapshot());trimHistory(future);design=JSON.parse(past.pop());selected=design.objects.at(-1)?.id;persist();render();}
function redo(){if(!future.length)return;past.push(snapshot());trimHistory(past);design=JSON.parse(future.pop());selected=design.objects.at(-1)?.id;persist();render();}
function choose(next){recipe=normalizeConfig({...recipe,...next});const o=current();if(o?.type==='avatar')change(()=>{o.config=clone(recipe);o.name=avatarName(recipe);});else render();}
function avatarName(c){return COLORS.find(o=>o.id===c.color).name+SHAPES.find(o=>o.id===c.shape).name;}
function addAvatar(config=recipe){change(()=>{const c=normalizeConfig(config);const o={id:uid(),type:'avatar',name:avatarName(c),config:c,x:getPlateau(design).width/2,y:getPlateau(design).height/2,width:initialObjectWidth(design.model,10),rotation:0};design.objects.push(o);selected=o.id;avoidNew([o.id]);recipe=clone(c);});}
function avoidNew(ids){if($('auto-avoid-logo').checked&&getPhone(design.model).logo)design=avoidLogo(design,{ids,...layoutCheckOptions()}).design;}
function renderCanvas(){
  const {width:w,height:h,path}=getPlateau(design),vw=(w+12)/zoom,vh=(h+18)/zoom;
  $('canvas').setAttribute('viewBox',`${(w-vw)/2} ${(h-vh)/2} ${vw} ${vh}`);
  const art=design.objects.map(o=>`<g data-object="${o.id}" style="cursor:move">${objectMarkup({...o,id:'editor-'+o.id})}</g>`).join('');
  const model=getPhone(design.model),logo=model.family==='macbook'&&showLogo?macbookLogoMarkup(model,{fill:'#657953',guide:true}):'';
  const o=current();let handle='';
  if(o){const ht=objectHeight(o),x=-o.width/2,y=-ht/2,hs=getPhone(design.model).family==='macbook'?5:1;handle=`<g transform="${objectTransform(o)}" fill="none" stroke="#657953" stroke-width="${.15*hs}"><rect x="${x}" y="${y}" width="${o.width}" height="${ht}" pointer-events="none" stroke-dasharray="${.6*hs} ${.5*hs}"/><line x1="0" y1="${y}" x2="0" y2="${y-2.5*hs}" pointer-events="none"/><circle data-handle="rotate" cx="0" cy="${y-2.5*hs}" r="${.65*hs}" fill="white" style="cursor:crosshair"/><rect data-handle="resize" x="${o.width/2-.6*hs}" y="${ht/2-.6*hs}" width="${1.2*hs}" height="${1.2*hs}" fill="white" style="cursor:nwse-resize"/></g>`;}
  $('canvas').innerHTML=`<defs><clipPath id="board-clip"><path d="${path}" clip-rule="evenodd"/></clipPath></defs>${showBase?`<path d="${path}" fill="#d9dde2" fill-rule="evenodd"/>`:''}<g clip-path="url(#board-clip)">${art}${logo}</g>${showCut?`<path d="${path}" fill="none" stroke="#c595af" stroke-width=".10" pointer-events="none"/>`:''}${handle}`;
  localizeSVG($('canvas'));
  $('object-count').textContent=t('{count} 个形象',{count:design.objects.length});
}
function render(){
  renderModel();renderCanvas();renderMockup();const o=current();
  for(const b of $('shapes').children)b.setAttribute('aria-pressed',String(b.dataset.id===recipe.shape));
  for(const b of $('colors').children)b.setAttribute('aria-pressed',String(b.dataset.id===recipe.color));
  $('recipe-hint').textContent=t(o?.type==='avatar'?'图案与颜色会应用于选中的形象。':'选图案与颜色，再添加到画布。');
  $('layers').replaceChildren();
  for(const item of [...design.objects].reverse()){
    const b=document.createElement('button');b.className='layer'+(selected===item.id?' selected':'');b.setAttribute('aria-label',t('选择 {name}',{name:displayName(item.name)}));b.setAttribute('aria-pressed',String(selected===item.id));
    const thumb=document.createElement('div');thumb.innerHTML=assetSVG({...item,id:'thumb-'+item.id});b.append(thumb.firstChild);
    const text=document.createElement('span');text.textContent=displayName(item.name);b.append(text);const meta=document.createElement('small');meta.textContent=`${item.width.toFixed(1)} mm`;b.append(meta);b.onclick=()=>select(item.id);localizeSVG(b);$('layers').append(b);
  }
  if(!design.objects.length){const p=document.createElement('p');p.className='hint';p.textContent=t('选图案与颜色，再添加到画布。');$('layers').append(p);}
  $('object-fields').hidden=!o;$('selection-empty').hidden=!!o;
  if(o){$('object-name').value=displayName(o.name);$('pos-x').value=Number(o.x.toFixed(3));$('pos-y').value=Number(o.y.toFixed(3));$('obj-width').value=Number(o.width.toFixed(3));$('rotation').value=Number(o.rotation.toFixed(2));$('height-label').textContent=t('画布高 {height} mm · 宽高比例锁定',{height:objectHeight(o).toFixed(2)})+(o.type==='avatar'&&o.config.background==='white'?t(' · 此形象带白色画布'):'')+(o.type==='png'?t(' · 原图 {w} × {h} px · {dpi} DPI',{w:o.pixelWidth,h:o.pixelHeight,dpi:Math.round(o.pixelWidth/o.width*25.4)}):'');}
  $('design-name').value=displayName(design.name);
  for(const id of ['duplicate','front','back','delete','center','fill-plateau'])$(id).disabled=!o;
  $('undo').disabled=!past.length;$('redo').disabled=!future.length;
  for(const id of ['show-base','show-cut'])$(id).setAttribute('aria-pressed',String(id==='show-base'?showBase:showCut));
  $('show-logo').setAttribute('aria-pressed',String(showLogo));
  $('avoid-logo').disabled=!getPhone(design.model).logo||!design.objects.length;
  scheduleChecks();
}
for(const s of SHAPES){const b=document.createElement('button');b.dataset.id=s.id;b.setAttribute('aria-label',t(s.name));b.dataset.helpText=t(s.name);b.innerHTML=renderSVG({shape:s.id,size:80,padding:8},{eyes:false})+`<span>${s.name}</span>`;b.onclick=()=>choose({shape:s.id});$('shapes').append(b);}
for(const c of COLORS){const b=document.createElement('button');b.dataset.id=c.id;b.style.setProperty('--swatch',c.hex);b.dataset.helpText=`${t(c.name)} ${c.hex}`;b.setAttribute('aria-label',t(c.name));b.onclick=()=>choose({color:c.id});$('colors').append(b);}
for(let i=1;i<=4;i++){const b=document.createElement('button');b.dataset.preset=String(i);b.textContent=t('示例 {n}',{n:'0'+i});b.onclick=async()=>{try{const data=await (await fetch('/assets/iphone-air/placements.json')).json();const s=data.styles[i-1];change(()=>{design={version:1,model:design.model,name:`${getPhone(design.model).name} 排版 0${i}`,objects:presetObjects(design.model,s.characters,uid)};avoidNew(design.objects.map(o=>o.id));selected=design.objects.at(-1).id;recipe=clone(current().config);});toast(t('已载入排版 {n}',{n:'0'+i}));}catch(e){toast(errorText(e));}};$('presets').append(b);}
$('add-avatar').onclick=()=>addAvatar();$('undo').onclick=undo;$('redo').onclick=redo;
for(const [id,key] of [['pos-x','x'],['pos-y','y'],['obj-width','width'],['rotation','rotation'],['object-name','name']])$(id).onchange=()=>{const o=current();if(!o)return;change(()=>{o[key]=key==='name'?$(id).value:$(id).value===''?NaN:Number($(id).value);});};
$('design-name').onchange=()=>change(()=>{design.name=$('design-name').value;});
$('center').onclick=()=>change(()=>centerDesignObject(design,current()));
$('duplicate').onclick=()=>change(()=>{const o=clone(current());o.id=uid();o.name+=' 副本';o.x=Math.min(OBJECT_LIMITS.x,o.x+1.5);o.y=Math.min(OBJECT_LIMITS.y,o.y+1.5);design.objects.push(o);selected=o.id;avoidNew([o.id]);});
$('delete').onclick=()=>change(()=>{design.objects=design.objects.filter(o=>o.id!==selected);selected=design.objects.at(-1)?.id;});
for(const side of ['front','back'])$(side).onclick=()=>change(()=>{const o=current();design.objects=design.objects.filter(v=>v.id!==o.id);design.objects[side==='front'?'push':'unshift'](o);});
$('clear').onclick=()=>change(()=>{design.objects=[];selected=null;});
$('show-base').onclick=()=>{showBase=!showBase;render();};$('show-cut').onclick=()=>{showCut=!showCut;render();};$('zoom').onchange=()=>{zoom=Number($('zoom').value);renderCanvas();};
$('show-logo').onclick=()=>{showLogo=!showLogo;render();};
function point(e){return new DOMPoint(e.clientX,e.clientY).matrixTransform($('canvas').getScreenCTM().inverse());}
$('canvas').addEventListener('pointerdown',e=>{
  if(e.button!==0)return;const handle=e.target.closest('[data-handle]')?.dataset.handle,id=e.target.closest('[data-object]')?.dataset.object;
  if(!handle&&!id){select(null);return;}if(id)select(id);$('canvas').focus({preventScroll:true});const o=current();if(!o)return;
  drag={mode:handle||'move',start:point(e),object:clone(o),before:snapshot(),pointer:e.pointerId};$('canvas').setPointerCapture(e.pointerId);e.preventDefault();
});
$('canvas').addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointer)return;const p=point(e),o=current(),base=drag.object;if(!o)return;
  if(drag.mode==='move'){o.x=Math.max(-100,Math.min(OBJECT_LIMITS.x,base.x+p.x-drag.start.x));o.y=Math.max(-100,Math.min(OBJECT_LIMITS.y,base.y+p.y-drag.start.y));}
  else if(drag.mode==='rotate')o.rotation=Math.atan2(p.y-o.y,p.x-o.x)*180/Math.PI+90;
  else {const angle=-base.rotation*Math.PI/180,dx=p.x-base.x,dy=p.y-base.y,lx=dx*Math.cos(angle)-dy*Math.sin(angle),ly=dx*Math.sin(angle)+dy*Math.cos(angle);o.width=Math.max(.5,Math.min(OBJECT_LIMITS.width,2*Math.max(Math.abs(lx),Math.abs(ly)/(objectHeight(base)/base.width))));}
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
$('svg-file').onchange=async()=>{const f=$('svg-file').files[0];if(!f)return;try{if(f.size>200000)throw new Error('SVG 必须小于 200 KB');const asset=await (await api('/api/import-svg',{svg:await f.text()})).json();change(()=>{const o={id:uid(),name:f.name.slice(0,100),type:'svg',...asset,x:getPlateau(design).width/2,y:getPlateau(design).height/2,width:initialObjectWidth(design.model),rotation:0};design.objects.push(o);selected=o.id;avoidNew([o.id]);});toast(t('已导入 SVG，保持矢量与宽高比例。'));}catch(e){toast(t('导入失败：{error}',{error:errorText(e)}));}finally{$('svg-file').value='';}};
function addAsset(asset,name,type){change(()=>{const o={id:uid(),name:name.slice(0,100),type,...asset,x:getPlateau(design).width/2,y:getPlateau(design).height/2,width:initialObjectWidth(design.model),rotation:0};design.objects.push(o);selected=o.id;avoidNew([o.id]);});}
function fileDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('读取图片失败'));r.readAsDataURL(file);});}
$('import-png').onclick=()=>$('png-file').click();
$('png-file').onchange=async()=>{const f=$('png-file').files[0];if(!f)return;try{if(f.size>MAX_PNG_BYTES)throw new Error('图片最大 5 MB');let dataUrl=await fileDataUrl(f);if(dataUrl.startsWith('data:application/octet-stream;')){const ext=f.name.split('.').at(-1).toLowerCase(),mime={jpg:'jpeg',jpeg:'jpeg',png:'png',webp:'webp',gif:'gif',tif:'tiff',tiff:'tiff'}[ext];if(mime)dataUrl=dataUrl.replace('application/octet-stream','image/'+mime);}const asset=await (await api('/api/import-image',{dataUrl})).json();addAsset(asset,f.name,'png');toast(t('已导入图片，保持比例与透明度；可点击“铺满平台”。'));}catch(e){toast(t('导入失败：{error}',{error:errorText(e)}));}finally{$('png-file').value='';}};
function renderLibrary(){
  const group=$('library-group').value,items=catalog.filter(item=>group==='all'||item.group===group);$('asset-library').replaceChildren();
  for(const item of items){const b=document.createElement('button');b.className='asset-card';b.dataset.helpText=displayName(item.name)+' · '+item.type.toUpperCase();b.setAttribute('aria-label',t('添加 {name} {type}',{name:displayName(item.name),type:item.type.toUpperCase()}));const img=document.createElement('img');img.src=item.file;img.alt='';img.loading='lazy';b.append(img);const name=document.createElement('span');name.textContent=displayName(item.name);b.append(name);const type=document.createElement('small');type.textContent=item.type.toUpperCase();b.append(type);b.onclick=async()=>{b.disabled=true;try{const response=await fetch(item.file);if(!response.ok)throw new Error('素材读取失败');let asset;if(item.type==='svg')asset=await (await api('/api/import-svg',{svg:await response.text()})).json();else {const dataUrl=await fileDataUrl(await response.blob());asset=await (await api('/api/import-png',{dataUrl})).json();}addAsset(asset,item.name,item.type);toast(t('已添加 {name}',{name:displayName(item.name)}));}catch(e){toast(errorText(e));}finally{b.disabled=false;}};$('asset-library').append(b);}
  $('library-count').textContent=`${items.length} / ${catalog.length}`;
}
$('library-group').onchange=renderLibrary;
fetch('/assets/library/catalog.json').then(r=>{if(!r.ok)throw new Error('素材目录加载失败');return r.json();}).then(data=>{catalog=data;renderLibrary();}).catch(e=>{$('library-status').textContent=errorText(e);toast(errorText(e));});
let renderedModel;
for(const [family,label] of [['iphone','iPhone'],['macbook','MacBook']]){const group=document.createElement('optgroup');group.label=label;for(const model of PHONES.filter(p=>(p.family||'iphone')===family)){const option=document.createElement('option');option.value=model.id;option.textContent=model.name;group.append(option);}$('phone-model').append(group);}
function renderModel(){
  const model=getPhone(design.model),{width,height}=model.plateau;
  $('phone-model').value=model.id;$('model-name').textContent=model.name;$('model-size').textContent=`${width.toFixed(4)} × ${height.toFixed(4)} mm · 1:1`;
  $('canvas').setAttribute('aria-label',t('{model} 贴纸，拖动形象调整位置',{model:model.name}));
  const laptop=model.family==='macbook';
  $('show-logo').hidden=!laptop;
  $('surface-caption').dataset.i18n=laptop?'上盖 · 合盖俯视':'背面 · 镜头在左';$('surface-caption').textContent=t($('surface-caption').dataset.i18n);
  $('canvas').style.aspectRatio=laptop?`${width+12} / ${height+18}`:'';
  $('phone-preview').classList.toggle('macbook-preview',laptop);
  $('geometry-note').textContent=laptop?t('MacBook 上盖按官方宽深及官方图轮廓校准；Logo 占位仅供排版参考，不进入导出。图片推算尺寸，实裁前请核对纸样。'):t('灰底仅供预览。成品透明；外边界与 {count} 个孔位自动挖空。',{count:model.plateau.holes.length});
  for(const [id,key] of [['pos-x','x'],['pos-y','y'],['obj-width','width']])$(id).max=OBJECT_LIMITS[key];
  $('phone-specs').href=model.specs;
  if(renderedModel!==model.id){
    $('phone-color').replaceChildren(...model.colors.map(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=t(c.name);return o;}));
    try{const saved=localStorage.getItem('template-plus-phone-color-'+model.id)||(model.id==='iphone-air'?localStorage.getItem('template-plus-phone-color'):null);if(model.colors.some(c=>c.id===saved))$('phone-color').value=saved;}catch{}
    renderedModel=model.id;
  }
}
$('phone-model').onchange=()=>change(()=>changeDesignModel(design,$('phone-model').value));
$('fill-plateau').onclick=()=>change(()=>coverDesignObject(design,current()));
let mockupRevision=0;
async function renderMockup(){
  const revision=++mockupRevision;
  const model=getPhone(design.model),color=model.colors.find(c=>c.id===$('phone-color').value)||model.colors[0],{width,height}=model.phone;
  $('phone-preview').setAttribute('viewBox',`-4 -4 ${width+8} ${height+8}`);
  $('phone-preview').setAttribute('aria-label',t(model.family==='macbook'?'{model} {color}上盖贴纸预览':'{model} {color}整机背面贴纸预览',{model:model.name,color:t(color.name)}));
  try {
    const body=await loadMockupBody(model.id,color.id);
    if(revision!==mockupRevision)return;
    $('phone-preview').innerHTML=`<g data-phone-body>${body}</g>${mockupArtwork(design)}`;localizeSVG($('phone-preview'));
  }catch(e){if(revision===mockupRevision)toast(errorText(e));}
}
$('phone-color').onchange=()=>{try{localStorage.setItem('template-plus-phone-color-'+getPhone(design.model).id,$('phone-color').value);}catch{}renderMockup();};
let checkTimer,checkRevision=0;
function layoutCheckOptions(){const clearance=Number($('check-clearance').value),minDpi=Number($('check-dpi').value);if($('check-clearance').value===''||$('check-dpi').value==='')throw new Error('间距和 DPI 不能为空');return {clearance,edgeClearance:clearance,holeClearance:clearance,minDpi};}
async function renderChecks(){
  clearTimeout(checkTimer);$('check-issues').replaceChildren();
  const revision=++checkRevision;
  try{
    const report=await (await api('/api/check',{design,options:layoutCheckOptions()})).json();
    if(revision!==checkRevision)return;
    $('check-summary').textContent=t(report.clear?'检查通过':'{count} 项提醒',{count:report.issues.length});
    for(const issue of report.issues.slice(0,80)){
      const names=issue.ids.map(id=>displayName(design.objects.find(o=>o.id===id)?.name||id)).join(' / '),b=document.createElement('button');
      const label={'overlap':'图案重叠','object-clearance':'图案间距不足','logo-clearance':'Logo 间距不足','edge-clearance':'外轮廓间距不足','hole-clearance':'孔位间距不足','low-dpi':'图片分辨率偏低'}[issue.code];
      const detail=issue.code==='low-dpi'?`${Math.round(issue.dpi)} / ${issue.requiredDpi} DPI`:`${issue.actualMm} / ${issue.requiredMm} mm`;
      b.type='button';b.dataset.issue=issue.code;b.textContent=`${t(label)} · ${names} · ${detail}`;b.onclick=()=>select(issue.ids[0]);$('check-issues').append(b);
    }
    if(report.issues.length>80){const note=document.createElement('p');note.textContent=t('更多提醒请用 CLI check 查看。');$('check-issues').append(note);}
  }catch(e){if(revision===checkRevision)$('check-summary').textContent=errorText(e);}
}
function scheduleChecks(){++checkRevision;clearTimeout(checkTimer);checkTimer=setTimeout(renderChecks,160);}
for(const id of ['check-clearance','check-dpi'])$(id).onchange=renderChecks;
$('check-layout').onclick=renderChecks;
$('avoid-logo').onclick=()=>{
  try{const result=avoidLogo(design,layoutCheckOptions());change(()=>{design=result.design;});toast(t('已移动 {count} 个图案，{unresolved} 个未找到位置。',{count:result.moved.length,unresolved:result.unresolved.length}));}catch(e){toast(errorText(e));}
};
function currentGenerationRequest(){return generationRequest($('generation-prompt').value,{transparentBackground:$('generation-transparent').checked});}
$('show-generation').onclick=()=>$('generation-dialog').showModal();
$('close-generation').onclick=()=>$('generation-dialog').close();
$('save-generation-request').onclick=()=>{try{const request=currentGenerationRequest();download(new Blob([JSON.stringify(request,null,2)+'\n'],{type:'application/json'}),'image-request.json');}catch(e){toast(errorText(e));}};
$('copy-generation-request').onclick=async()=>{try{const request=currentGenerationRequest();await navigator.clipboard.writeText(t('请使用你的生图工具生成以下图案，保留透明背景（如要求），保存到本地并通过 Template Plus CLI 导入。若不支持生图请告知。')+'\n'+JSON.stringify(request,null,2));toast(t('生成请求已复制。'));}catch(e){toast(errorText(e));}};
$('import-generated').onclick=()=>{try{currentGenerationRequest();$('generated-file').click();}catch(e){toast(errorText(e));}};
$('generated-file').onchange=async()=>{const f=$('generated-file').files[0];if(!f)return;try{if(f.size>MAX_PNG_BYTES)throw new Error('图片最大 5 MB');const request=currentGenerationRequest(),asset=await (await api('/api/import-generated',{dataUrl:await fileDataUrl(f),request})).json();addAsset(asset,request.prompt,'png');$('generation-dialog').close();toast(t('已导入生成图片，提示词随布局保存。'));}catch(e){toast(errorText(e));}finally{$('generated-file').value='';}};
$('toggle-mockup').onclick=()=>{const panel=$('mockup-panel');panel.hidden=!panel.hidden;$('toggle-mockup').setAttribute('aria-expanded',String(!panel.hidden));updateMockupToggle();};
function updateMockupToggle(){const b=$('toggle-mockup'),key=$('mockup-panel').hidden?'展开机模':'收起机模';b.textContent=$('mockup-panel').hidden?'⌄':'⌃';b.setAttribute('aria-label',t(key));b.dataset.helpText=t(key);}
$('save-layout').onclick=()=>{download(new Blob([JSON.stringify(design,null,2)+'\n'],{type:'application/json'}),getPhone(design.model).id+'-layout.json');toast(t('布局已保存，包含形象素材和位置。'));};
$('show-agent').onclick=()=>{
  const o=current();
  $('agent-commands').textContent=[
    'node sticker-cli.mjs list --json',
    'node sticker-cli.mjs inspect --config layout.json --json',
    o?`node sticker-cli.mjs update --config layout.json --id ${o.id} --x ${o.x} --y ${o.y} --width ${o.width} --rotation ${o.rotation} --out layout-v2.json --json`:'node sticker-cli.mjs add --config layout.json --id buddy --shape drop --color brown --out layout-v2.json --json',
    'node sticker-cli.mjs apply --config layout.json --ops operations.json --out layout-v2.json --json',
    'node sticker-cli.mjs check --config layout-v2.json --clearance 2 --json',
    'node sticker-cli.mjs avoid-logo --config layout-v2.json --out layout-v3.json --json',
    'node sticker-cli.mjs render --config layout-v2.json --out output/sticker.pdf --json',
    `node sticker-cli.mjs preview --config layout-v2.json --phone-color ${$('phone-color').value} --out output/preview.png --json`,
  ].join('\n\n');
  $('agent-dialog').showModal();
};
$('close-agent').onclick=()=>$('agent-dialog').close();
$('agent-save-layout').onclick=()=>{download(new Blob([JSON.stringify(design,null,2)+'\n'],{type:'application/json'}),'layout.json');toast(t('已保存布局，交给 Agent 后可重新导入。'));};
$('copy-agent-commands').onclick=async()=>{try{await navigator.clipboard.writeText($('agent-commands').textContent);toast(t('命令已复制。'));}catch{toast(t('复制不可用，请手动选取命令。'));}};
$('load-layout').onclick=()=>$('layout-file').click();
$('layout-file').onchange=async()=>{const f=$('layout-file').files[0];if(!f)return;try{if(f.size>MAX_LAYOUT_BYTES)throw new Error('布局文件超过 32 MB');const validated=await (await api('/api/validate',JSON.parse(await f.text()))).json();change(()=>{design=validated;selected=design.objects.at(-1)?.id;});toast(t('已恢复布局。'));}catch(e){toast(t('导入失败：{error}',{error:errorText(e)}));}finally{$('layout-file').value='';}};
for(const format of ['pdf','svg','png'])$(`export-${format}`).onclick=async()=>{const buttons=['pdf','svg','png'].map(f=>$(`export-${f}`));buttons.forEach(b=>b.disabled=true);try{const captured=clone(design);const blob=await (await api(`/api/export/${format}`,captured)).blob();download(blob,`${getPhone(captured.model).id}-${format==='pdf'?'print-and-cut':format==='png'?'artwork-600dpi':'artwork'}.${format}`);toast(t(format==='pdf'?'已导出 {format}，含独立印刷层和刀线层。':'已导出 {format}。',{format:format.toUpperCase()}));}catch(e){toast(t('导出失败：{error}',{error:errorText(e)}));}finally{buttons.forEach(b=>b.disabled=false);}};
try{const saved=await loadLayout();if(saved){design=normalizeDesign(JSON.parse(saved));selected=design.objects.at(-1)?.id;}}catch(e){toast(t('自动保存的布局无法读取：{error}',{error:errorText(e)}));}
if(location.hash.startsWith('#avatar=')){try{const config=normalizeConfig(JSON.parse(decodeURIComponent(location.hash.slice(8))));addAvatar(config);history.replaceState(null,'',location.pathname);toast(t('已将形象编辑器中的小伙伴添加到排版。'));}catch(e){toast(errorText(e));}}
if(current()?.type==='avatar')recipe=clone(current().config);render();

function renderLanguage(){renderedModel=null;render();renderLibrary();for(const b of $('shapes').children){const s=SHAPES.find(s=>s.id===b.dataset.id);b.setAttribute('aria-label',t(s.name));b.dataset.helpText=t(s.name);}for(const b of $('colors').children){const c=COLORS.find(c=>c.id===b.dataset.id);b.setAttribute('aria-label',t(c.name));b.dataset.helpText=t(c.name)+' '+c.hex;}for(const b of $('presets').children)b.textContent=t('示例 {n}',{n:'0'+b.dataset.preset});updateMockupToggle();localizeSVG(document.body);$('toast').classList.remove('visible');}
setSaveStatus('自动保存于此浏览器');initI18n(renderLanguage);renderLanguage();
