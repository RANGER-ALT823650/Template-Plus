// Width/depth are Apple's published enclosure dimensions in millimeters.
// Logo and corners are calibrated from retained Apple top views / Neo vectors.
// These are derived preview measurements; RGB and edge treatment are illustrative.
import {MACBOOK_GEOMETRY,MACBOOK_LOGO_PATH} from './macbook-geometry.js';
const airColors=[
  {id:'skyblue',name:'天蓝色',body:'#C8D7E1',panel:'#E5EDF2',metal:'#97ABB9'},
  {id:'silver',name:'银色',body:'#D6D8DA',panel:'#F0F1F2',metal:'#A3A6AA'},
  {id:'starlight',name:'星光色',body:'#E3D9C8',panel:'#F4EEE3',metal:'#BAAD96'},
  {id:'midnight',name:'午夜色',body:'#303C4B',panel:'#536173',metal:'#1B2634'},
];
const proColors=[
  {id:'spaceblack',name:'深空黑色',body:'#343537',panel:'#58595C',metal:'#202123'},
  airColors[1],
];
const neoColors=[
  airColors[1],
  {id:'blush',name:'桃粉色',body:'#E9C5CC',panel:'#F6E1E5',metal:'#C2949E'},
  {id:'citrus',name:'柑橘黄色',body:'#DBDF87',panel:'#EFF1BB',metal:'#A6AB59'},
  {id:'indigo',name:'靛蓝色',body:'#727EAB',panel:'#A5AFD0',metal:'#495780'},
];
function macbook(id,name,width,height,thickness,colors,specs){
  const {outer,logo,corner}=MACBOOK_GEOMETRY[id];
  return {id,name,family:'macbook',plateau:{width,height,margin:2,outer,path:outer,holes:[]},
    phone:{width,height,plateauX:0,plateauY:0},thickness,logo,corner,colors,specs};
}
export const MACBOOKS=[
  macbook('macbook-air-13','MacBook Air 13″',304.1,215,11.3,airColors,'https://www.apple.com.cn/macbook-air/specs/'),
  macbook('macbook-air-15','MacBook Air 15″',340.4,237.6,11.5,airColors,'https://www.apple.com.cn/macbook-air/specs/'),
  macbook('macbook-pro-14','MacBook Pro 14″',312.6,221.2,15.5,proColors,'https://www.apple.com.cn/macbook-pro/specs/'),
  macbook('macbook-pro-16','MacBook Pro 16″',355.7,248.1,16.8,proColors,'https://www.apple.com.cn/macbook-pro/specs/'),
  macbook('macbook-neo','MacBook Neo 13″',297.5,206.4,12.7,neoColors,'https://www.apple.com.cn/macbook-neo/specs/'),
];
// Preview and editor guide share the complete Apple silhouette, including leaf.
// This helper is deliberately absent from the print artwork renderer.
export function macbookLogoMarkup(model,{fill='currentColor',guide=false}={}){
  const {x,y,width,height}=model.logo;
  return `<path ${guide?'data-logo-guide="true" pointer-events="none"':'data-logo="true"'} d="${MACBOOK_LOGO_PATH}" transform="translate(${x} ${y}) scale(${width} ${height})" fill="${fill}"${guide?' fill-opacity=".14" stroke="#657953" stroke-width=".009" stroke-dasharray=".035 .025" stroke-opacity=".85"':''}/>`;
}
