import UTIF from 'utif';
import {importPNG,MAX_PNG_BYTES} from '../dist/src/png-import.js';

function validateSize(width,height){
  if(!width||!height||width>8192||height>8192||width*height>32*1024*1024)throw new Error('图片最大边长 8192，最多 3200 万像素');
}
function staticGIF(bytes){
  const skip=(pos)=>{while(pos<bytes.length){const size=bytes[pos++];if(!size)return pos;pos+=size;}throw new Error('GIF 数据不完整');};
  let pos=13+((bytes[10]&128)?3*(1<<((bytes[10]&7)+1)):0),frames=0;
  while(pos<bytes.length){
    const type=bytes[pos++];
    if(type===59)return;
    if(type===33){pos++;pos=skip(pos);}
    else if(type===44){if(++frames>1)throw new Error('请导入静态单帧图片');const flags=bytes[pos+8];pos+=9+((flags&128)?3*(1<<((flags&7)+1)):0);pos++;pos=skip(pos);}
    else throw new Error('GIF 数据无效');
  }
  throw new Error('GIF 数据不完整');
}
export async function importImage(dataUrl){
  if(typeof dataUrl!=='string'||dataUrl.length>Math.ceil(MAX_PNG_BYTES/3)*4+50)throw new Error('图片最大 5 MB');
  const match=/^data:image\/(png|jpeg|jpg|webp|gif|tiff);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if(!match)throw new Error('支持 PNG、JPG / JPEG、WebP、静态 GIF 和 TIFF');
  const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
  if(!bytes.length||bytes.length>MAX_PNG_BYTES)throw new Error('图片最大 5 MB');
  let canvas=document.createElement('canvas');
  if(match[1]==='tiff'){
    const buffer=bytes.buffer,images=UTIF.decode(buffer);
    if(images.length!==1)throw new Error('请导入单页 TIFF');
    const image=images[0],width=image.t256?.[0],height=image.t257?.[0];validateSize(width,height);
    UTIF.decodeImage(buffer,image);canvas.width=width;canvas.height=height;
    canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(UTIF.toRGBA8(image)),width,height),0,0);
    const orientation=image.t274?.[0]||1;
    if(orientation>1&&orientation<=8){
      const oriented=document.createElement('canvas');oriented.width=orientation>=5?height:width;oriented.height=orientation>=5?width:height;
      const transforms={2:[-1,0,0,1,width,0],3:[-1,0,0,-1,width,height],4:[1,0,0,-1,0,height],5:[0,1,1,0,0,0],6:[0,1,-1,0,height,0],7:[0,-1,-1,0,height,width],8:[0,-1,1,0,0,width]};
      const context=oriented.getContext('2d');context.setTransform(...transforms[orientation]);context.drawImage(canvas,0,0);canvas=oriented;
    }
  }else{
    if(match[1]==='png')importPNG(dataUrl);
    if(match[1]==='gif'){validateSize(bytes[6]|bytes[7]<<8,bytes[8]|bytes[9]<<8);staticGIF(bytes);}
    if(match[1]==='webp'){
      const view=new DataView(bytes.buffer);let pos=12;
      while(pos+8<=bytes.length){const type=String.fromCharCode(...bytes.slice(pos,pos+4)),size=view.getUint32(pos+4,true);if(type==='ANIM'||type==='ANMF')throw new Error('请导入静态单帧图片');pos+=8+size+(size%2);}
    }
    // Image decoding honors JPEG EXIF orientation and browser color management.
    const img=new Image();img.src=dataUrl;await img.decode();validateSize(img.naturalWidth,img.naturalHeight);
    if(match[1]==='png')return importPNG(dataUrl);
    canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d').drawImage(img,0,0);
  }
  const result=canvas.toDataURL('image/png');
  if(result.length>Math.ceil(MAX_PNG_BYTES/3)*4+22)throw new Error('图片转为 PNG 后超过 5 MB，请缩小原图再导入');
  return importPNG(result);
}
