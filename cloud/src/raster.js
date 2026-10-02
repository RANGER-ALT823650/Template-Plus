export async function rasterize(svg,width,height){
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try {const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(img,0,0,width,height);const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG 导出失败')),'image/png'));return new Uint8Array(await blob.arrayBuffer());}finally{URL.revokeObjectURL(url);}
}
export function withDPI(png,dpi=600){
 const chunk=new Uint8Array(21),view=new DataView(chunk.buffer);view.setUint32(0,9);chunk.set([112,72,89,115],4);const ppm=Math.round(dpi/0.0254);view.setUint32(8,ppm);view.setUint32(12,ppm);chunk[16]=1;let crc=0xffffffff;for(const b of chunk.slice(4,17)){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}view.setUint32(17,(crc^0xffffffff)>>>0);
 const result=new Uint8Array(png.length+21);result.set(png.slice(0,33));result.set(chunk,33);result.set(png.slice(33),54);return result;
}
