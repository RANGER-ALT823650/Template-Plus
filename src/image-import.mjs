import sharp from 'sharp';
import {importPNG,MAX_PNG_BYTES} from './png-import.js';
export async function importImage(dataUrl){
 if(typeof dataUrl!=='string'||dataUrl.length>Math.ceil(MAX_PNG_BYTES/3)*4+50)throw new Error('图片最大 5 MB');
 const match=/^data:image\/(png|jpeg|jpg|webp|gif|tiff);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
 if(!match)throw new Error('支持 PNG、JPG / JPEG、WebP、静态 GIF 和 TIFF');
 const bytes=Buffer.from(match[2],'base64');if(!bytes.length||bytes.length>MAX_PNG_BYTES)throw new Error('图片最大 5 MB');
 const source=sharp(bytes,{limitInputPixels:32*1024*1024,failOn:'error'}),meta=await source.metadata();
 if(!['png','jpeg','webp','gif','tiff'].includes(meta.format))throw new Error('图片格式无效');
 if(!meta.width||!meta.height||meta.width>8192||meta.height>8192||meta.width*meta.height>32*1024*1024)throw new Error('图片最大边长 8192，最多 3200 万像素');
 if((meta.pages||1)>1)throw new Error('请导入静态单帧图片');
 // Normalize orientation/color and preserve alpha, using the existing PNG layout
 // contract so old saved layouts, SVG and PDF share one embedded image format.
 const decoded=await source.rotate().toColourspace('srgb').png().toBuffer();
 if(decoded.length>MAX_PNG_BYTES)throw new Error('图片转为 PNG 后超过 5 MB，请缩小原图再导入');
 return importPNG('data:image/png;base64,'+decoded.toString('base64'));
}
