import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {PDFDocument,PDFName,PDFDict} from 'pdf-lib';
import {importPNG} from '../src/png-import.js';
import {importSVG} from '../src/svg-import.js';
import {normalizeDesign,renderDesignSVG,objectHeight} from '../src/design.js';
import {XML,exportPrintAndCut} from '../src/export-pdf.mjs';
import {exportPNG} from '../src/export-png.mjs';
import {PHONE,mockupArtwork,PHONE_COLORS} from '../src/mockup.js';
import {PLATEAU} from '../src/plateau.js';
const object=(asset,type,id='asset')=>({id,name:id,type,...asset,x:32,y:12,width:12,rotation:0});
const design=objects=>normalizeDesign({version:1,name:'素材验证',objects},XML);
const png=async()=> 'data:image/png;base64,'+(await sharp({create:{width:120,height:60,channels:4,background:'#ff0000'}}).png().toBuffer()).toString('base64');
test('PNG derives its real dimensions, preserves round trips and rejects URLs, other formats and truncated files',async()=>{
 const url=await png(),asset=importPNG(url),d=design([object({...asset,ratio:9,pixelWidth:1},'png')]);
 assert.equal(d.objects[0].pixelWidth,120);assert.equal(objectHeight(d.objects[0]),6);
 assert.deepEqual(design(JSON.parse(JSON.stringify(d)).objects),d);
 for(const bad of ['https://example.com/image.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,YWJj',url.slice(0,-20)])assert.throws(()=>importPNG(bad));
 const huge=Buffer.from(url.slice(22),'base64');huge.writeUInt32BE(100000,16);assert.throws(()=>importPNG('data:image/png;base64,'+huge.toString('base64')));
 const svg=renderDesignSVG(d);assert.ok(svg.includes('href="data:image/png;base64,'));assert.ok(svg.includes('height="6"'));
});
test('PNG exports clip transparent exterior and all three holes; PDF embeds image alpha and retains cut layers',async()=>{
 const o=object(importPNG(await png()),'png');o.width=145;o.x=PLATEAU.width/2;o.y=PLATEAU.height/2;
 const d=design([o]),{data,info}=await sharp(await exportPNG(d)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const alpha=(x,y)=>data[(Math.round(y*600/25.4)*info.width+Math.round(x*600/25.4))*4+3];
 assert.equal(alpha(0,0),0);assert.equal(alpha(32,12),255);for(const [,x,y] of PLATEAU.holes)assert.equal(alpha(x,y),0);
 const pdf=await PDFDocument.load(await exportPrintAndCut(d)),page=pdf.getPage(0),res=page.node.Resources();
 const images=res.lookup(PDFName.of('XObject'),PDFDict).values().map(v=>pdf.context.lookup(v));
 assert.ok(images.some(image=>image.dict.get(PDFName.of('SMask'))),'PNG alpha remains a soft mask');
 const oc=pdf.catalog.lookup(PDFName.of('OCProperties'),PDFDict);assert.ok(oc.get(PDFName.of('OCGs')));
 assert.ok(Math.abs(page.getSize().width*25.4/72-(PLATEAU.width+4))<1e-5);
});
test('all 30 individual materials import, persist and export through shared renderers',async()=>{
 const catalog=JSON.parse(await readFile('assets/library/catalog.json','utf8'));
 assert.equal(catalog.length,30);assert.equal(catalog.filter(i=>i.group==='muse-png').length,8);assert.equal(catalog.filter(i=>i.group==='muse-svg').length,9);assert.equal(catalog.filter(i=>i.group==='dots-svg').length,5);assert.equal(catalog.filter(i=>i.group==='ai-logos-svg').length,8);
 for(const item of catalog){const buffer=await readFile(item.file.slice(1));const asset=item.type==='svg'?importSVG(buffer.toString(),XML):importPNG('data:image/png;base64,'+buffer.toString('base64'));const d=design([object(asset,item.type,item.id)]);
  assert.deepEqual(design(JSON.parse(JSON.stringify(d)).objects),d);
  const {data,info}=await sharp(await exportPNG(d)).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.ok(data.some((v,i)=>i%info.channels===3&&v>0),item.id+' renders visible content');
  const pdf=await PDFDocument.load(await exportPrintAndCut(d));assert.equal(pdf.getPageCount(),1,item.id);
 }
});
test('internal gradients and filters work with separate instance IDs while external references stay rejected',()=>{
 const base='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="paint"><stop stop-color="#ff0000"/><stop offset="1" stop-color="#0000ff"/></linearGradient></defs><rect width="10" height="10" fill="url(#paint)"/></svg>';
 const asset=importSVG(base,XML),output=renderDesignSVG(design([object(asset,'svg','a'),object(asset,'svg','b')]));
 assert.ok(output.includes('id="asset-a-paint"'));assert.ok(output.includes('fill="url(#asset-b-paint)"'));
 for(const bad of [base.replace('url(#paint)','url(https://example.com/a.svg#paint)'),base.replace('id="paint"','id="paint" href="file:///etc/passwd"'),base.replace('url(#paint)','url(#missing)'),base.replace('linearGradient','feImage')])assert.throws(()=>importSVG(bad,XML));
});
test('four back models use official body dimensions and the exact plateau origin, excluded from artwork',async()=>{
 assert.deepEqual(PHONE_COLORS.map(c=>c.name),['天蓝色','深空黑色','云白色','浅金色']);
 assert.equal(PHONE.plateauX+PLATEAU.holes[0][1],16.29);assert.equal(PHONE.plateauY+PLATEAU.holes[0][2],16.29);
 for(const c of PHONE_COLORS){const svg=await readFile(`assets/iphone-air/mockups/${c.id}-rear.svg`,'utf8');assert.ok(svg.includes('viewBox="0 0 74.7 156.2"'));assert.ok(svg.includes(PLATEAU.outer));}
 const d=design([]);assert.ok(mockupArtwork(d).includes(`x="${PHONE.plateauX}"`));assert.ok(!renderDesignSVG(d).includes('mockup'));
});
