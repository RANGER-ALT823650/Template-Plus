import {getPhone,mockupPath} from './phones.js';
import {renderDesignSVG} from './design.js';
export const PHONE={width:74.7,height:156.2,plateauX:4.772233022695842,plateauY:4.527459312435912};
export const PHONE_COLORS=[{id:'skyblue',name:'天蓝色'},{id:'spaceblack',name:'深空黑色'},{id:'cloudwhite',name:'云白色'},{id:'lightgold',name:'浅金色'}];
export function mockupArtwork(design){
  const {phone:PHONE,plateau:PLATEAU}=getPhone(design.model);
  return renderDesignSVG({...design,objects:design.objects.map(o=>({...o,id:'preview-'+o.id}))}).replace(/<svg\b[^>]*>/,`<svg x="${PHONE.plateauX}" y="${PHONE.plateauY}" width="${PLATEAU.width}" height="${PLATEAU.height}" viewBox="0 0 ${PLATEAU.width} ${PLATEAU.height}">`).replaceAll('plateau-clip','mockup-art-clip');
}

// Fetch the built-in SVG once and render its vectors inline. Some WebKit
// contexts fail to decode a remote SVG inside another SVG's image element.
const mockupBodies=new Map();
export function loadMockupBody(model,color,fetchAsset=globalThis.fetch){
  const phone=getPhone(model);
  if(!phone.colors.some(c=>c.id===color))return Promise.reject(new Error('不支持的机身颜色'));
  const path=mockupPath(model,color);
  if(!mockupBodies.has(path)){
    const request=(async()=>{
      const response=await fetchAsset(path);
      if(!response.ok)throw new Error('机模加载失败');
      const svg=await response.text();
      if(!/^\s*<svg\b/.test(svg)||!/<\/svg>\s*$/.test(svg))throw new Error('机模文件无效');
      const prefix=`phone-body-${model}-${color}-`;
      return svg.replace(/^\s*<svg\b[^>]*>/,'').replace(/<\/svg>\s*$/,'')
        .replace(/\bid="([^"]+)"/g,(_,id)=>`id="${prefix}${id}"`)
        .replace(/url\(#([^)]*)\)/g,(_,id)=>`url(#${prefix}${id})`);
    })();
    mockupBodies.set(path,request);
    request.catch(()=>{if(mockupBodies.get(path)===request)mockupBodies.delete(path);});
  }
  return mockupBodies.get(path);
}
