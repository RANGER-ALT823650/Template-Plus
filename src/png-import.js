export const MAX_PNG_BYTES=5*1024*1024;
export const MAX_LAYOUT_BYTES=32*1024*1024;
const cache=new Map();
export function importPNG(dataUrl){
  if(typeof dataUrl!=='string'||dataUrl.length>Math.ceil(MAX_PNG_BYTES/3)*4+22||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl))throw new Error('PNG 须为内嵌图片，最大 5 MB');
  if(cache.has(dataUrl))return {...cache.get(dataUrl)};
  let bytes;try{bytes=Uint8Array.from(atob(dataUrl.slice(22)),c=>c.charCodeAt(0));}catch{throw new Error('PNG 编码无效');}
  if(bytes.length>MAX_PNG_BYTES||bytes.length<57||[137,80,78,71,13,10,26,10].some((v,i)=>bytes[i]!==v))throw new Error('无效的 PNG 文件');
  const view=new DataView(bytes.buffer),width=view.getUint32(16),height=view.getUint32(20);
  if(!width||!height||width>8192||height>8192||width*height>32*1024*1024)throw new Error('PNG 最大边长 8192，最多 3200 万像素');
  let pos=8,idat=false,end=false;
  while(pos+12<=bytes.length){
    const len=view.getUint32(pos),type=String.fromCharCode(...bytes.slice(pos+4,pos+8));
    if(len>bytes.length-pos-12)throw new Error('PNG 数据不完整');
    if(pos===8&&(type!=='IHDR'||len!==13))throw new Error('PNG 文件头无效');
    if(type==='acTL')throw new Error('请导入静态 PNG');
    if(type==='IDAT')idat=true;
    if(type==='IEND'){if(len!==0||pos+12!==bytes.length)throw new Error('PNG 文件尾无效');end=true;break;}
    pos+=len+12;
  }
  if(!idat||!end)throw new Error('PNG 数据不完整');
  const asset={dataUrl,pixelWidth:width,pixelHeight:height,ratio:height/width};
  if(cache.size>=20)cache.delete(cache.keys().next().value);cache.set(dataUrl,asset);
  return {...asset};
}
