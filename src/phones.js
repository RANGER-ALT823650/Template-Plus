import {PLATEAU} from './plateau.js';
import {PRO_GEOMETRY} from './pro-geometry.js';
const airColors=[{id:'skyblue',name:'天蓝色'},{id:'spaceblack',name:'深空黑色'},{id:'cloudwhite',name:'云白色'},{id:'lightgold',name:'浅金色'}];
const colors17=[{id:'silver',name:'银色',body:'#E4E4E1',panel:'#F2F1ED',metal:'#B7B9B9'},{id:'cosmicorange',name:'星宇橙色',body:'#D66B35',panel:'#E59B6E',metal:'#A54B28'},{id:'deepblue',name:'深蓝色',body:'#303D55',panel:'#5B687F',metal:'#232D41'}];
const colors18=[{id:'black',name:'黑色',body:'#292A2C',panel:'#303134',metal:'#161719'},{id:'silver',name:'银色',body:'#E2E3E3',panel:'#E7E8E8',metal:'#B4B8BB'},{id:'glacierblue',name:'冰川蓝色',body:'#AFBFCE',panel:'#B7C6D3',metal:'#879DAC'},{id:'burgundy',name:'勃艮第酒红色',body:'#63303F',panel:'#6E3948',metal:'#46222E'}];
export const PHONES=[{id:'iphone-air',name:'iPhone Air',plateau:PLATEAU,phone:{width:74.7,height:156.2,plateauX:4.772233022695842,plateauY:4.527459312435912},colors:airColors,specs:'https://www.apple.com.cn/iphone-air/specs/'},
 ...Object.entries(PRO_GEOMETRY).map(([id,geometry])=>({id,name:id.replace('iphone','iPhone').replaceAll('-',' ').replace('pro max','Pro Max').replace('pro','Pro'),...geometry,colors:id.includes('-17-')?colors17:colors18,specs:id.includes('-17-')?'https://support.apple.com/zh-cn/125090':'https://www.apple.com.cn/iphone-18-pro/specs/'}))];
export function getPhone(model='iphone-air'){
 const phone=PHONES.find(p=>p.id===model);if(!phone)throw new Error('不支持的 iPhone 机型');return phone;
}
export function getPlateau(design){return getPhone(design.model).plateau;}
export function mockupPath(model,color){return model==='iphone-air'?`/assets/iphone-air/mockups/${color}-rear.svg`:`/assets/phones/${model}/mockups/${color}-rear.svg`;}
