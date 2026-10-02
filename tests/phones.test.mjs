import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import net from 'node:net';
import sharp from 'sharp';
import {PDFDocument,PDFName,PDFDict,PDFRawStream,decodePDFRawStream} from 'pdf-lib';
import {PHONES,mockupPath} from '../src/phones.js';
import {normalizeDesign,renderDesignSVG} from '../src/design.js';
import {XML,exportPrintAndCut} from '../src/export-pdf.mjs';
import {exportPNG} from '../src/export-png.mjs';
import {importImage} from '../src/image-import.mjs';
import {mockupArtwork} from '../src/mockup.js';
const old=JSON.parse(await readFile('examples/iphone-air-layout.json','utf8'));
const imageURL=async(format,options={})=>'data:image/'+(format==='jpeg'?'jpeg':format)+';base64,'+(await sharp({create:{width:160,height:90,channels:4,background:'#1280ff80'}})[format](options).toBuffer()).toString('base64');
test('legacy layouts default to Air; selected model round trips and rejects unknown geometry',()=>{
 assert.equal(normalizeDesign(old,XML).model,'iphone-air');
 for(const p of PHONES){const d=normalizeDesign({...old,model:p.id},XML);assert.deepEqual(normalizeDesign(JSON.parse(JSON.stringify(d)),XML),d);}
 assert.throws(()=>normalizeDesign({...old,model:'iphone-99-pro'},XML));
 assert.throws(()=>normalizeDesign({...old,model:null},XML));
});
test('every model exports its own physical size, transparent exterior and ALL cut holes',async()=>{
 const asset=await importImage(await imageURL('jpeg'));
 for(const p of PHONES){
  const {width:w,height:h,holes}=p.plateau;
  const d=normalizeDesign({version:1,model:p.id,name:p.name,objects:[{id:'cover',name:'Photo',type:'png',...asset,x:w/2,y:h/2,width:140,rotation:0}]},XML);
  const {data,info}=await sharp(await exportPNG(d)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,Math.round(w*600/25.4));assert.equal(info.height,Math.round(h*600/25.4));
  const alpha=(x,y)=>data[(Math.round(y*600/25.4)*info.width+Math.round(x*600/25.4))*4+3];
  assert.equal(alpha(0,0),0,p.id+' exterior');assert.equal(alpha(w*(p.id==='iphone-air'?.5:.78),h*.5),255,p.id+' flat surface');
  for(const [name,x,y] of holes)assert.equal(alpha(x,y),0,p.id+' '+name);
  const pdf=await PDFDocument.load(await exportPrintAndCut(d)),page=pdf.getPage(0),size=page.getSize();
  assert.ok(Math.abs(size.width*25.4/72-w-4)<1e-5);assert.ok(Math.abs(size.height*25.4/72-h-4)<1e-5);
  const oc=pdf.catalog.lookup(PDFName.of('OCProperties'),PDFDict),layers=oc.lookup(PDFName.of('OCGs'));
  assert.equal(layers.lookup(1,PDFDict).lookup(PDFName.of('Usage'),PDFDict).lookup(PDFName.of('Print'),PDFDict).get(PDFName.of('PrintState')).toString(),'/OFF');
  const content=Buffer.from(decodePDFRawStream(pdf.context.lookup(page.node.get(PDFName.of('Contents')),PDFRawStream)).decode()).toString();
  assert.equal(content.split('/OC /CutContourLayer BDC')[1].match(/\nS\n/g).length,holes.length+1);
  assert.ok(mockupArtwork(d).includes(`x="${p.phone.plateauX}"`));assert.ok(renderDesignSVG(d).includes(`width="${w}mm"`));
 }
});
test('Pro mockups and retained source metadata exist for all official color choices',async()=>{
 assert.equal(PHONES.length,5);assert.deepEqual(PHONES.map(p=>p.colors.length),[4,3,3,4,4]);
 for(const p of PHONES.slice(1)){
  const dimensions=JSON.parse(await readFile(`assets/phones/${p.id}/dimensions.json`));
  assert.equal(dimensions.official_holes_name_x_y_diameter_mm.length,6);
  assert.equal((await readFile(`assets/phones/sources/${p.id}.pdf`)).subarray(0,4).toString(),'%PDF');
  for(const c of p.colors){const svg=await readFile(mockupPath(p.id,c.id).slice(1),'utf8');assert.ok(svg.includes(p.plateau.outer));assert.ok(svg.includes(`viewBox="0 0 ${p.phone.width} ${p.phone.height}"`));}
 }
});
test('image import handles JPEG orientation, PNG/WebP alpha, static GIF/TIFF and rejects bad/oversized/external input',async()=>{
 for(const format of ['jpeg','png','webp','gif','tiff']){const a=await importImage(await imageURL(format));assert.equal(a.pixelWidth,160);assert.equal(a.pixelHeight,90);assert.equal(a.ratio,90/160);}
 const oriented=await sharp({create:{width:80,height:40,channels:3,background:'#ff0080'}}).withMetadata({orientation:6}).jpeg().toBuffer();
 const a=await importImage('data:image/jpeg;base64,'+oriented.toString('base64'));assert.equal(a.pixelWidth,40);assert.equal(a.pixelHeight,80);
 for(const format of ['png','webp']){const a=await importImage(await imageURL(format)),{data}=await sharp(Buffer.from(a.dataUrl.slice(22),'base64')).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.ok(data[3]>100&&data[3]<150);}
 for(const value of ['https://example.com/a.jpg','data:image/svg+xml;base64,PHN2Zy8+','data:image/jpeg;base64,YWJj','data:image/png;base64,'+'A'.repeat(8*1024*1024)])await assert.rejects(importImage(value));
 const huge=await sharp({create:{width:8193,height:1,channels:3,background:'white'}}).png().toBuffer();await assert.rejects(importImage('data:image/png;base64,'+huge.toString('base64')));
});
test('local server image API and per-model exports/assets work together',async t=>{
 const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
 const proc=spawn(process.execPath,['server.mjs','--port',String(port)],{cwd:process.cwd(),stdio:['ignore','pipe','pipe']});t.after(()=>proc.kill());
 await new Promise((resolve,reject)=>{proc.stdout.once('data',resolve);proc.once('error',reject);proc.once('exit',code=>reject(new Error('server exited '+code)));});
 const base=`http://127.0.0.1:${port}`,post=(path,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const imported=await post('/api/import-image',{dataUrl:await imageURL('jpeg')});assert.equal(imported.status,200);const a=await imported.json();
 for(const p of PHONES){
  for(const c of p.colors)assert.equal((await fetch(base+mockupPath(p.id,c.id))).status,200);
  const d={version:1,model:p.id,name:p.name,objects:[{id:'jpg',name:'JPG',type:'png',...a,x:p.plateau.width/2,y:p.plateau.height/2,width:12,rotation:0}]};
  assert.equal((await (await post('/api/validate',d)).json()).model,p.id);
  for(const format of ['svg','png','pdf']){const r=await post('/api/export/'+format,d);assert.equal(r.status,200);assert.ok(r.headers.get('content-disposition').includes(p.id));assert.ok((await r.arrayBuffer()).byteLength>100);}
 }
 const bad=await post('/api/import-image',{dataUrl:'data:image/jpeg;base64,YWJj'});assert.equal(bad.status,400);
});
