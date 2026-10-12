import {readFile,stat} from 'node:fs/promises';
import {basename,extname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {SHAPES,COLORS,normalizeConfig} from './avatar.js';
import {normalizeDesign,OBJECT_LIMITS,initialObjectWidth,objectHeight,changeDesignModel,centerDesignObject,coverDesignObject} from './design.js';
import {getPhone} from './phones.js';
import {importSVG} from './svg-import.js';
import {importImage} from './image-import.mjs';
import {MAX_PNG_BYTES} from './png-import.js';
import {XML} from './export-pdf.mjs';
import {avoidLogo} from './layout-check.js';
import {readGenerationRequest,generationMetadata} from './generation.js';
import {assertGeneratedTransparency} from './image-generation.mjs';

export const catalog=JSON.parse(await readFile(new URL('../assets/library/catalog.json',import.meta.url),'utf8'));
const avatarKeys=['shape','color','size','padding','background'];
const objectKeys=['name','x','y','width','rotation'];
const sourceKeys=['asset','file','config','generationRequest',...avatarKeys];
export const OPERATION_FIELDS={
  add:['id',...objectKeys,...sourceKeys],update:['id',...objectKeys,...sourceKeys],
  remove:['id'],duplicate:['id','newId',...objectKeys],front:['id'],back:['id'],
  reorder:['ids'],center:['id'],cover:['id'],model:['model'],rename:['name'],clear:[],
  'avoid-logo':['ids','clearance','edgeClearance','holeClearance'],
};
const own=(o,k)=>Object.hasOwn(o,k);
function checkFields(o,keys,label){
  if(!o||typeof o!=='object'||Array.isArray(o))throw new Error(`${label}须为对象`);
  for(const key of Object.keys(o))if(!keys.includes(key))throw new Error(`${label}未知字段：${key}`);
}
function target(design,id){
  const o=design.objects.find(o=>o.id===id);if(!o)throw new Error(`找不到形象 ID：${id}`);return o;
}
function avatarConfig(input){
  checkFields(input,['version',...avatarKeys],'形象配置');return normalizeConfig(input);
}
async function source(op,baseDir,previous){
  const explicit=['asset','file','config'].filter(k=>own(op,k));
  const overrides=Object.fromEntries(avatarKeys.filter(k=>own(op,k)).map(k=>[k,op[k]]));
  if(explicit.length>1)throw new Error('asset、file、config 只能选择一个素材来源');
  if(own(op,'generationRequest')&&!own(op,'file'))throw new Error('generationRequest 须与 file 一起使用');
  if(own(op,'config'))checkFields(op.config,['version',...avatarKeys],'形象配置');
  if((own(op,'asset')||own(op,'file'))&&Object.keys(overrides).length)throw new Error('图片 / SVG 素材不能使用形象配置选项');
  if(own(op,'asset')||own(op,'file')){
    const item=own(op,'asset')?catalog.find(i=>i.id===op.asset):null;
    if(own(op,'asset')&&!item)throw new Error(`找不到素材 ID：${op.asset}`);
    const path=item?new URL('..'+item.file,import.meta.url):resolve(baseDir,op.file);
    const extension=extname(item?item.file:op.file).toLowerCase();
    const isSVG=extension==='.svg',mime={'.png':'png','.jpg':'jpeg','.jpeg':'jpeg','.webp':'webp','.gif':'gif','.tif':'tiff','.tiff':'tiff'}[extension];
    if(!isSVG&&!mime)throw new Error('素材文件须为 SVG、PNG、JPG、WebP、静态 GIF 或 TIFF');
    if((await stat(path)).size>(isSVG?200000:MAX_PNG_BYTES))throw new Error(isSVG?'SVG 必须小于 200 KB':'图片最大 5 MB');
    const bytes=await readFile(path);
    const asset=isSVG?importSVG(bytes.toString('utf8'),XML):await importImage(`data:image/${mime};base64,${bytes.toString('base64')}`);
    let generation;
    if(own(op,'generationRequest')){
      if(isSVG)throw new Error('生成请求仅适用于图片素材');
      const requestPath=resolve(baseDir,op.generationRequest);if((await stat(requestPath)).size>32000)throw new Error('生成请求最大 32 KB');
      const request=readGenerationRequest(JSON.parse(await readFile(requestPath,'utf8')));
      await assertGeneratedTransparency(asset,request);
      generation=generationMetadata({version:request.version,prompt:request.prompt,transparentBackground:request.transparentBackground});
    }
    return {type:isSVG?'svg':'png',...asset,...(generation?{generation}:{}),name:item?.name||basename(op.file)};
  }
  if(previous&&previous.type!=='avatar'&&!own(op,'config')){
    if(Object.keys(overrides).length)throw new Error('只有模板形象支持 shape / color 等配置；替换素材请使用 asset、file 或 config');
    return previous;
  }
  const config=avatarConfig({...((own(op,'config')?op.config:previous?.config)||{padding:0}),...overrides});
  return {type:'avatar',config,name:COLORS.find(c=>c.id===config.color).name+SHAPES.find(s=>s.id===config.shape).name};
}

// A batch runs entirely in memory. The caller writes only after every operation
// and imported asset has passed the same normalization used by the GUI.
export async function applyOperations(input,operations,{baseDir=process.cwd()}={}){
  if(!Array.isArray(operations)||operations.length>1000)throw new Error('操作须为 JSON 数组，最多 1000 步');
  let design=normalizeDesign(input,XML);
  for(const [index,op] of operations.entries()){
    try{
      const fields=Object.hasOwn(OPERATION_FIELDS,op?.op)?OPERATION_FIELDS[op.op]:null;if(!fields)throw new Error(`未知操作：${op?.op}`);
      checkFields(op,['op',...fields],'操作');
      if(op.op==='add'){
        const asset=await source(op,baseDir),p=getPhone(design.model).plateau;
        design.objects.push({id:own(op,'id')?op.id:randomUUID(),...asset,x:p.width/2,y:p.height/2,width:initialObjectWidth(design.model),rotation:0,...Object.fromEntries(objectKeys.filter(k=>own(op,k)).map(k=>[k,op[k]]))});
      }else if(op.op==='update'){
        const o=target(design,op.id),patch=Object.fromEntries(objectKeys.filter(k=>own(op,k)).map(k=>[k,op[k]]));
        if(sourceKeys.some(k=>own(op,k))){
          const asset=await source(op,baseDir,o);
          design.objects[design.objects.indexOf(o)]={id:o.id,...asset,x:o.x,y:o.y,width:o.width,rotation:o.rotation,name:o.name,...patch};
        }else Object.assign(o,patch);
      }else if(op.op==='remove'){
        target(design,op.id);design.objects=design.objects.filter(o=>o.id!==op.id);
      }else if(op.op==='duplicate'){
        const o=target(design,op.id);
        design.objects.push({...o,id:own(op,'newId')?op.newId:randomUUID(),name:o.name+' 副本',x:Math.min(OBJECT_LIMITS.x,o.x+1.5),y:Math.min(OBJECT_LIMITS.y,o.y+1.5),...Object.fromEntries(objectKeys.filter(k=>own(op,k)).map(k=>[k,op[k]]))});
      }else if(['front','back'].includes(op.op)){
        const o=target(design,op.id);design.objects=design.objects.filter(item=>item.id!==o.id);
        design.objects[op.op==='front'?'push':'unshift'](o);
      }else if(op.op==='reorder'){
        if(!Array.isArray(op.ids)||op.ids.length!==design.objects.length||new Set(op.ids).size!==op.ids.length)throw new Error('ids 须包含每个形象 ID 各一次，顺序为从后到前');
        design.objects=op.ids.map(id=>target(design,id));
      }else if(op.op==='center')centerDesignObject(design,target(design,op.id));
      else if(op.op==='cover')coverDesignObject(design,target(design,op.id));
      else if(op.op==='avoid-logo'){
        const {op:_,...settings}=op,result=avoidLogo(design,settings);
        if(result.unresolved.length)throw new Error(`无法在当前尺寸与间距下避让 Logo：${result.unresolved.join(', ')}；请减小图案或调整布局`);
        design=result.design;
      }
      else if(op.op==='model'){
        if(typeof op.model!=='string')throw new Error('model 操作须指定机型');
        changeDesignModel(design,op.model);
      }
      else if(op.op==='rename')design.name=op.name;
      else if(op.op==='clear')design.objects=[];
      design=normalizeDesign(design,XML);
    }catch(error){throw new Error(`操作 ${index+1} (${op?.op??'unknown'})：${error.message}`);}
  }
  return design;
}

export function inspectDesign(design){
  const p=getPhone(design.model).plateau;
  return {version:design.version,name:design.name,model:design.model,
    plateau:{width:p.width,height:p.height,holes:p.holes.length},
    units:{position:'mm',width:'mm',rotation:'degrees',origin:'plateau top-left',order:'back-to-front'},
    objects:design.objects.map((o,layer)=>{
      const {svg,dataUrl,...summary}=o;
      return {...summary,layer,height:objectHeight(o),...(o.type==='png'?{dpi:o.pixelWidth/o.width*25.4}:{})};
    })};
}
