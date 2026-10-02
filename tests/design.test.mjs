import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import sharp from 'sharp';
import {PDFDocument,PDFName,PDFDict,PDFArray,PDFString,PDFRawStream,decodePDFRawStream} from 'pdf-lib';
import {normalizeDesign,renderDesignSVG,DEFAULT_DESIGN} from '../src/design.js';
import {XML,exportPrintAndCut} from '../src/export-pdf.mjs';
import {importSVG} from '../src/svg-import.js';
import {PLATEAU} from '../src/plateau.js';
import {rasterSVG} from '../src/export-png.mjs';
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect width="200" height="100" fill="#1084FD"/></svg>';
test('layout files preserve imported vectors and reject unsafe or invalid assets',()=>{
  const imported=importSVG(svg,XML);assert.equal(imported.ratio,.5);
  const d=normalizeDesign({...DEFAULT_DESIGN,objects:[{id:'import',name:'Imported',type:'svg',...imported,x:32,y:10,width:12,rotation:23}]},XML);
  assert.deepEqual(normalizeDesign(JSON.parse(JSON.stringify(d)),XML),d);
  for(const bad of ['<script>alert(1)</script>','<image href="file:///etc/passwd"/>','<g onload="alert(1)"/>','<path fill="url(http://example.com)"/>','<foreignObject/>'])assert.throws(()=>importSVG(svg.replace('<rect width="200" height="100" fill="#1084FD"/>',bad),XML));
  for(const bad of [{...DEFAULT_DESIGN,version:2},{...DEFAULT_DESIGN,objects:[{...DEFAULT_DESIGN.objects[0],x:NaN}]},{...DEFAULT_DESIGN,objects:[...DEFAULT_DESIGN.objects,...DEFAULT_DESIGN.objects]},{...DEFAULT_DESIGN,objects:[{...DEFAULT_DESIGN.objects[0],width:0}]}])assert.throws(()=>normalizeDesign(bad,XML));
});
test('artwork is transparent, clipped to the exact plateau and all three holes',async()=>{
  const d=normalizeDesign({...DEFAULT_DESIGN,objects:[{id:'large',name:'Cover',type:'svg',...importSVG(svg,XML),x:PLATEAU.width/2,y:PLATEAU.height/2,width:145,rotation:0}]},XML);
  const image=sharp(Buffer.from(rasterSVG(d,2540))).ensureAlpha();const {data,info}=await image.raw().toBuffer({resolveWithObject:true});
  const alpha=(x,y)=>data[(Math.round(y*100)*info.width+Math.round(x*100))*4+3];
  assert.equal(alpha(0,0),0);assert.equal(alpha(32,12),255);
  for(const [,x,y] of PLATEAU.holes)assert.equal(alpha(x,y),0);
  assert.equal(info.width,6516);assert.equal(info.height,2353);
});
test('print-and-cut PDF has exact mm page, vector art, spot color and print-disabled cut layer',async()=>{
  const recipe=JSON.parse(await readFile('examples/iphone-air-layout.json','utf8'));
  const buffer=await exportPrintAndCut(recipe),doc=await PDFDocument.load(buffer);
  const page=doc.getPage(0);assert.equal(doc.getPageCount(),1);
  const {width,height}=page.getSize();assert.ok(Math.abs(width*25.4/72-(PLATEAU.width+4))<1e-5);assert.ok(Math.abs(height*25.4/72-(PLATEAU.height+4))<1e-5);
  const oc=doc.catalog.lookup(PDFName.of('OCProperties'),PDFDict),layers=oc.lookup(PDFName.of('OCGs'),PDFArray);assert.equal(layers.size(),2);
  const art=layers.lookup(0,PDFDict),cut=layers.lookup(1,PDFDict);
  assert.equal(art.lookup(PDFName.of('Name'),PDFString).decodeText(),'Artwork - PRINT');
  assert.equal(cut.lookup(PDFName.of('Usage'),PDFDict).lookup(PDFName.of('Print'),PDFDict).lookup(PDFName.of('PrintState')).toString(),'/OFF');
  const res=page.node.Resources();const colors=res.lookup(PDFName.of('ColorSpace'),PDFDict);
  assert.ok(colors.values().some(v=>{const color=doc.context.lookup(v,PDFArray);return color.lookup(0).toString()==='/Separation'&&color.lookup(1).toString()==='/CutContour';}));
  const xobj=res.lookupMaybe(PDFName.of('XObject'),PDFDict);if(xobj)assert.equal(xobj.size(),0);
  const stream=doc.context.lookup(page.node.get(PDFName.of('Contents')),PDFRawStream);
  const content=Buffer.from(decodePDFRawStream(stream).decode()).toString();
  assert.ok(content.includes('/OC /Artwork BDC'));assert.ok(content.includes('/OC /CutContourLayer BDC'));assert.ok(content.includes('W* n'));
  assert.ok(content.includes('0.043 0 0 0.043'),'SVG viewport must scale the first 200-unit avatar to 8.6 mm');
  assert.equal(content.split('/OC /CutContourLayer BDC')[1].match(/\nS\n/g).length,4,'outer contour plus three holes');
});
test('sticker CLI exports real vector and raster files, rejects invalid formats',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'template-plus-'));
  for(const format of ['pdf','svg','png']){
    const path=join(dir,`artwork.${format}`);const report=JSON.parse(execFileSync(process.execPath,['sticker-cli.mjs','render','--config','examples/iphone-air-layout.json','--out',path,'--json'],{encoding:'utf8'}));assert.equal(report.objects,5);
    if(format==='png'){const meta=await sharp(path).metadata();assert.equal(meta.density,600);assert.ok(meta.hasAlpha);assert.equal(meta.width,1539);assert.equal(meta.height,556);}
    if(format==='svg')assert.ok((await readFile(path,'utf8')).includes('clip-rule="evenodd"'));
  }
  const failed=spawnSync(process.execPath,['sticker-cli.mjs','render','--out',join(dir,'art.jpg')],{encoding:'utf8'});assert.equal(failed.status,1);assert.equal(JSON.parse(failed.stderr).ok,false);
});
