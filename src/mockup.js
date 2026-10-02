import {getPhone} from './phones.js';
import {renderDesignSVG} from './design.js';
export const PHONE={width:74.7,height:156.2,plateauX:4.772233022695842,plateauY:4.527459312435912};
export const PHONE_COLORS=[{id:'skyblue',name:'天蓝色'},{id:'spaceblack',name:'深空黑色'},{id:'cloudwhite',name:'云白色'},{id:'lightgold',name:'浅金色'}];
export function mockupArtwork(design){
  const {phone:PHONE,plateau:PLATEAU}=getPhone(design.model);
  return renderDesignSVG({...design,objects:design.objects.map(o=>({...o,id:'preview-'+o.id}))}).replace(/<svg\b[^>]*>/,`<svg x="${PHONE.plateauX}" y="${PHONE.plateauY}" width="${PLATEAU.width}" height="${PLATEAU.height}" viewBox="0 0 ${PLATEAU.width} ${PLATEAU.height}">`).replaceAll('plateau-clip','mockup-art-clip');
}
