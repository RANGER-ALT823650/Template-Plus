import {importImage} from './src/image-import.mjs';
import {PHONES,mockupPath} from './src/phones.js';
import {MAX_LAYOUT_BYTES} from './src/png-import.js';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {exportPNG} from './src/export-png.mjs';
import {exportPrintAndCut,XML} from './src/export-pdf.mjs';
import {normalizeDesign,renderDesignSVG} from './src/design.js';
import {importSVG} from './src/svg-import.js';
const args=process.argv.slice(2),portIndex=args.indexOf('--port'),port=portIndex<0?4174:Number(args[portIndex+1]);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid port');
const files=new Map([['/','index.html'],...['STICKER-CLI.md','sticker.schema.json','sticker-operations.schema.json','index.html','workstation.js','workstation.css','avatar.html','app.js','style.css','src/avatar.js','src/reference-data.js','src/design.js','src/svg-import.js','src/plateau.js','src/png-import.js','src/layout-store.js','src/mockup.js','src/phones.js','src/pro-geometry.js','assets/library/catalog.json','assets/iphone-air/placements.json','assets/iphone-air/iphone-air-plateau-cutout.svg','assets/iphone-air/dimensions.json'].map(f=>['/'+f,f])]);
const catalog=JSON.parse(await readFile(new URL('assets/library/catalog.json',import.meta.url),'utf8'));
for(const item of catalog)files.set(item.file,item.file.slice(1));
for(const phone of PHONES){for(const color of phone.colors){const path=mockupPath(phone.id,color.id);files.set(path,path.slice(1));}if(phone.id!=='iphone-air')for(const file of ['dimensions.json','plateau-cutout.svg'])files.set(`/assets/phones/${phone.id}/${file}`,`assets/phones/${phone.id}/${file}`);}
const mime={md:'text/plain; charset=utf-8',html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json; charset=utf-8',svg:'image/svg+xml',png:'image/png'};
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  try{
    if(req.method==='POST' && url.pathname.startsWith('/api/')){
      if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}`)throw new Error('仅接受本站请求');
      if(!req.headers['content-type']?.startsWith('application/json'))throw new Error('请求须为 application/json');
      const chunks=[];let length=0;
      for await(const chunk of req){length+=chunk.length;if(length>MAX_LAYOUT_BYTES)throw new Error('布局文件超过 32 MB');chunks.push(chunk);}
      const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(url.pathname==='/api/import-svg')return sendJSON(importSVG(input.svg,XML));
      if(url.pathname==='/api/import-png'||url.pathname==='/api/import-image')return sendJSON(await importImage(input.dataUrl));
      const design=normalizeDesign(input,XML);
      if(url.pathname==='/api/validate')return sendJSON(design);
      let data,type,filename;
      if(url.pathname==='/api/export/pdf'){data=await exportPrintAndCut(design);type='application/pdf';filename=design.model+'-print-and-cut.pdf';}
      else if(url.pathname==='/api/export/svg'){data=renderDesignSVG(design);type='image/svg+xml';filename=design.model+'-artwork.svg';}
      else if(url.pathname==='/api/export/png'){data=await exportPNG(design);type='image/png';filename=design.model+'-artwork-600dpi.png';}
      else{res.writeHead(404);return res.end('Not found');}
      res.writeHead(200,{'Content-Type':type,'Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'no-store'});return res.end(data);
    }
    if(req.method!=='GET' && req.method!=='HEAD'){res.writeHead(405);return res.end();}
    if(url.pathname==='/health')return sendJSON({ok:true,application:'Template Plus'});
    const file=files.get(url.pathname);if(!file){res.writeHead(404);return res.end('Not found');}
    const body=await readFile(new URL(file,import.meta.url));res.writeHead(200,{'Content-Type':mime[file.split('.').at(-1)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
  }catch(e){if(!res.headersSent){res.writeHead(400,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:e.message}));}else res.end();}
  function sendJSON(value){res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`端口 ${port} 已被占用。使用 npm start -- --port ${port+1}。`:e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Template Plus → http://127.0.0.1:${port}`));
