import {SHAPES,COLORS,normalizeConfig,renderSVG} from './avatar.js?v=20261008-shapes';
import {getPhone,getPlateau} from './phones.js';
import {importSVG} from './svg-import.js';
import {importPNG,MAX_LAYOUT_BYTES} from './png-import.js';
import {generationMetadata} from './generation.js';
export const DEFAULT_DESIGN={version:1,model:'iphone-air',name:'我的贴纸',objects:[
  {id:'first',name:'棕色水滴',type:'avatar',config:normalizeConfig({padding:0}),x:32,y:11.76,width:12,rotation:-12},
]};
// Shared GUI/CLI bounds also allow full-size MacBook lid layouts.
export const OBJECT_LIMITS={x:500,y:500,width:1000};
// Only new content scales to a laptop lid; saved and explicitly sized objects
// retain their millimetres. Use one uniform factor to preserve asset proportions.
export function initialObjectWidth(model,width=12){
  const target=getPhone(model),air=getPhone('iphone-air').plateau,p=target.plateau;
  return width*(target.family==='macbook'?Math.min(p.width/air.width,p.height/air.height):1);
}
export function presetObjects(model,characters,makeId=(_,i)=>`preset-${i+1}`){
  const p=getPhone(model).plateau,air=getPhone('iphone-air').plateau;
  return characters.map((c,i)=>({
    id:makeId(c,i),name:COLORS.find(o=>o.id===c.color).name+SHAPES.find(o=>o.id===c.shape).name,type:'avatar',
    config:normalizeConfig({shape:c.shape,color:c.color,padding:0,size:200}),
    x:c.center_mm[0]*p.width/air.width,y:c.center_mm[1]*p.height/air.height,
    width:initialObjectWidth(model,c.canvas_size_mm),rotation:c.angle_degrees,
  }));
}
const finite=(value,min,max,label)=>{if(!Number.isFinite(value)||value<min||value>max)throw new Error(`${label}须在 ${min}–${max} 之间`);return value;};
export function normalizeDesign(input,xml=globalThis){
  if(!input || input.version!==1 || !Array.isArray(input.objects) || input.objects.length>100)throw new Error('布局须为 version 1，最多 100 个形象');
  if(typeof input.name!=='string'||input.name.length>80)throw new Error('布局名称须小于 80 字符');
  if(JSON.stringify(input).length>MAX_LAYOUT_BYTES)throw new Error('布局文件超过 32 MB');
  const ids=new Set();
  const model=getPhone(input.model).id;
  return {version:1,model,name:input.name,objects:input.objects.map(o=>{
    if(!o || typeof o.id!=='string'|| !/^[\w-]{1,80}$/.test(o.id)||ids.has(o.id))throw new Error('形象 ID 无效或重复');ids.add(o.id);
    if(!['avatar','svg','png'].includes(o.type)||typeof o.name!=='string'||o.name.length>100)throw new Error('形象类型或名称无效');
    const asset=o.type==='avatar'?{config:normalizeConfig(o.config)}:o.type==='png'?importPNG(o.dataUrl):importSVG(o.svg,xml);
    if(o.generation!==undefined&&o.type!=='png')throw new Error('生成信息仅适用于图片素材');
    return {id:o.id,name:o.name,type:o.type,...asset,...(o.generation===undefined?{}:{generation:generationMetadata(o.generation)}),x:finite(o.x,-100,OBJECT_LIMITS.x,'X 坐标'),y:finite(o.y,-100,OBJECT_LIMITS.y,'Y 坐标'),width:finite(o.width,.5,OBJECT_LIMITS.width,'宽度'),rotation:finite(o.rotation,-360,360,'旋转角度')};
  })};
}
export function assetSVG(o){
  if(o.type==='avatar')return renderSVG(o.config);
  if(o.type==='png')return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o.pixelWidth} ${o.pixelHeight}" width="${o.pixelWidth}" height="${o.pixelHeight}"><image href="${o.dataUrl}" width="${o.pixelWidth}" height="${o.pixelHeight}"/></svg>`;
  // SVG IDs are document-wide even inside nested SVGs. Scope every instance.
  return o.svg.replace(/\bid="([^"]+)"/g,(_,id)=>`id="asset-${o.id}-${id}"`).replace(/url\(#([^)]*)\)/g,(_,id)=>`url(#asset-${o.id}-${id})`);
}
export function objectHeight(o){return o.width*(o.type!=='avatar'?o.ratio:1);}
// Shared GUI/CLI geometry operations. Object widths always stay in millimetres.
export function changeDesignModel(design,model){
  const old=getPlateau(design),next=getPhone(model);
  design.objects=design.objects.map(o=>({...o,x:o.x/old.width*next.plateau.width,y:o.y/old.height*next.plateau.height}));
  design.model=next.id;
}
export function centerDesignObject(design,o){
  const p=getPlateau(design);Object.assign(o,{x:p.width/2,y:p.height/2});
}
export function coverDesignObject(design,o){
  const p=getPlateau(design);centerDesignObject(design,o);
  Object.assign(o,{width:Math.max(p.width,p.height/(objectHeight(o)/o.width)),rotation:0});
}
export function objectTransform(o){return `translate(${o.x} ${o.y}) rotate(${o.rotation})`;}
export function objectMarkup(o){
  const h=objectHeight(o);
  const nested=assetSVG(o).replace(/<svg\b[^>]*>/,tag=>tag.replace(/\s(width|height)="[^"]*"/g,'').replace(/>$/,` x="${-o.width/2}" y="${-h/2}" width="${o.width}" height="${h}">`));
  return `<g transform="${objectTransform(o)}">${nested}</g>`;
}
export function renderDesignSVG(design,{cut=false}={}){
  const {width:w,height:h,path,margin:m}=getPlateau(design);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cut?w+2*m:w}mm" height="${cut?h+2*m:h}mm" viewBox="0 0 ${cut?w+2*m:w} ${cut?h+2*m:h}"><defs><clipPath id="plateau-clip"><path d="${path}" clip-rule="evenodd"/></clipPath></defs><g transform="translate(${cut?m:0} ${cut?m:0})"><g clip-path="url(#plateau-clip)">${design.objects.map(objectMarkup).join('')}</g>${cut?`<path d="${path}" fill="none" stroke="#ff00ff" stroke-width="0.1"/>`:''}</g></svg>`;
}
