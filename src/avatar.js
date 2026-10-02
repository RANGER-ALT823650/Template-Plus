import { REFERENCE } from './reference-data.js';

export const SHAPES = [
  ['circle','圆形'],['oval','椭圆'],['square','圆角方形'],['capsule','胶囊'],
  ['triangle','圆角三角'],['hexagon','六边形'],['cloud','云朵'],['drop','水滴'],
].map(([id,name])=>({id,name,...REFERENCE.bodies[id]}));
export const COLORS = ['black','brown','red','orange','yellow','green','teal','blue','purple','pink','gray']
  .map((id,i)=>({id,name:['黑色','棕色','红色','橙色','黄色','绿色','青色','蓝色','紫色','粉色','灰色'][i],hex:REFERENCE.colors[i]}));
export const DEFAULT_CONFIG = Object.freeze({version:1,shape:'drop',color:'brown',size:1024,padding:16,background:'transparent'});
const ALLOWED = new Set(Object.keys(DEFAULT_CONFIG));
export function normalizeConfig(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('配置必须是 JSON 对象');
  for (const key of Object.keys(input)) if (!ALLOWED.has(key)) throw new Error(`未知配置项：${key}`);
  const c = {...DEFAULT_CONFIG,...input};
  if (c.version !== 1) throw new Error('不支持的配置版本');
  if (!SHAPES.some(s=>s.id===c.shape)) throw new Error(`未知图案：${c.shape}`);
  if (!COLORS.some(s=>s.id===c.color)) throw new Error(`未知颜色：${c.color}`);
  if (!Number.isInteger(c.size) || c.size < 64 || c.size > 4096) throw new Error('尺寸必须是 64–4096 的整数');
  if (!Number.isFinite(c.padding) || c.padding < 0 || c.padding > 40) throw new Error('留白必须是 0–40 的百分比');
  if (!['transparent','white'].includes(c.background)) throw new Error('背景必须是 transparent 或 white');
  return c;
}
// Eyes are authored once from reference 2. Triangle gets one fixed inset to
// keep both eyes within its narrower upper body; there is no user eye control.
const EYE_OFFSET = {triangle:'translate(-9 18)'};
export function renderSVG(input = {}, {eyes=true} = {}) {
  const c = normalizeConfig(input);
  const shape=SHAPES.find(s=>s.id===c.shape),color=COLORS.find(s=>s.id===c.color);
  // Traced artwork lives in a 200-unit canvas with a 160-unit body envelope.
  // padding is the minimum margin in %; scale this envelope around its center.
  const scale=(100-2*c.padding)/80;
  const shift=100*(1-scale);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${c.size}" height="${c.size}" viewBox="0 0 200 200" role="img" aria-label="${shape.name} · ${color.name}"><title>${shape.name} · ${color.name}</title>${c.background==='white'?'<rect width="200" height="200" fill="#FFFFFF"/>':''}<g transform="translate(${shift} ${shift}) scale(${scale})"><path fill="${color.hex}" d="${shape.path}" transform="${shape.transform}"/>${eyes?`<g${EYE_OFFSET[c.shape]?` transform="${EYE_OFFSET[c.shape]}"`:''}><path fill="#FFFFFF" d="${REFERENCE.eyes.path}" transform="${REFERENCE.eyes.transform}"/></g>`:''}</g></svg>`;
}
export function toCLI(input={}) {
  const c=normalizeConfig(input);
  return `node cli.mjs render --shape ${c.shape} --color ${c.color} --size ${c.size} --padding ${c.padding} --background ${c.background} --out output/${c.shape}-${c.color}.png`;
}
