import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {PDFDocument,PDFName,PDFRawStream,decodePDFRawStream} from 'pdf-lib';
import {MACBOOKS,macbookLogoMarkup} from '../src/macbooks.js';
import {PHONES,mockupPath} from '../src/phones.js';
import {normalizeDesign,changeDesignModel,renderDesignSVG,initialObjectWidth,presetObjects} from '../src/design.js';
import {applyOperations} from '../src/sticker-edit.mjs';
import {XML,exportPrintAndCut} from '../src/export-pdf.mjs';
import {exportPNG} from '../src/export-png.mjs';
import {mockupArtwork,loadMockupBody} from '../src/mockup.js';

test('new MacBook presets and imported assets use lid-sized defaults without resizing saved or explicit widths',async()=>{
  const placements=JSON.parse(await readFile('assets/iphone-air/placements.json'));
  const catalog=JSON.parse(await readFile('assets/library/catalog.json'));
  const sources=['png','svg'].map(type=>catalog.find(a=>a.type===type).id);
  const air=PHONES[0].plateau;
  for(const model of PHONES){
    const {width,height}=model.plateau,laptop=model.family==='macbook';
    const factor=laptop?Math.min(width/air.width,height/air.height):1;
    assert.equal(initialObjectWidth(model.id),12*factor);
    if(laptop)assert.ok(initialObjectWidth(model.id)>54&&initialObjectWidth(model.id)<66);
    for(const style of placements.styles){
      const objects=presetObjects(model.id,style.characters);
      for(const [i,o] of objects.entries()){
        const c=style.characters[i];
        assert.equal(o.width,c.canvas_size_mm*factor);
        assert.equal(o.x,c.center_mm[0]*width/air.width);assert.equal(o.y,c.center_mm[1]*height/air.height);
        assert.equal(o.rotation,c.angle_degrees);
      }
      const d={version:1,model:model.id,name:'Preset',objects};
      assert.deepEqual(normalizeDesign(JSON.parse(JSON.stringify(d)),XML),d);
    }
    const d=await applyOperations({version:1,model:model.id,name:'Imports',objects:[]},[
      {op:'add',id:'avatar'},...sources.map((asset,i)=>({op:'add',id:`asset-${i}`,asset})),
      {op:'add',id:'explicit',width:17},
    ]);
    for(const o of d.objects.slice(0,3)){
      assert.equal(o.width,12*factor);assert.equal(o.x,width/2);assert.equal(o.y,height/2);
      if(o.type!=='avatar')assert.ok(o.ratio>0);
    }
    assert.equal(d.objects[3].width,17);
    const restored=normalizeDesign(JSON.parse(JSON.stringify(d)),XML);
    const updated=await applyOperations(restored,[{op:'update',id:'explicit',color:'blue'},{op:'duplicate',id:'explicit',newId:'copy'}]);
    assert.equal(updated.objects[3].width,17);assert.equal(updated.objects[4].width,17);
  }
});

test('all five MacBooks retain published dimensions and all sixteen finish assets',async()=>{
  assert.deepEqual(MACBOOKS.map(m=>[m.plateau.width,m.plateau.height,m.colors.length]),[
    [304.1,215,4],[340.4,237.6,4],[312.6,221.2,2],[355.7,248.1,2],[297.5,206.4,4],
  ]);
  const schema=JSON.parse(await readFile('sticker.schema.json','utf8'));
  assert.deepEqual(schema.properties.model.enum,PHONES.map(m=>m.id));
  for(const m of MACBOOKS){
    const metadata=JSON.parse(await readFile(`assets/macbooks/${m.id}/dimensions.json`));
    assert.equal(metadata.source_url,m.specs);assert.equal(metadata.official_enclosure_mm.width,m.plateau.width);
    assert.match(metadata.method,/illustrative/);
    for(const c of m.colors){
      const body=await loadMockupBody(m.id,c.id,async path=>({ok:true,text:()=>readFile(path.slice(1),'utf8')}));
      assert.ok(body.includes(c.body));assert.ok(body.includes('data-logo'));
      assert.ok(body.includes(`url(#phone-body-${m.id}-${c.id}-body)`));
      const image=await sharp(Buffer.from(await readFile(mockupPath(m.id,c.id).slice(1),'utf8'))).resize({width:800}).png().toBuffer();
      assert.ok(image.length>1000);
    }
    await assert.rejects(loadMockupBody(m.id,'invalid'));
  }
});

test('MacBook layouts cover the full lid, export a single contour and keep nominal mm size',async()=>{
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1"><rect width="2" height="1" fill="#336699"/></svg>';
  for(const m of MACBOOKS){
    // A wide asset needs a width larger than the old 150 mm phone limit.
    const d={version:1,model:m.id,name:m.name,objects:[{id:'poster',name:'Poster',type:'svg',svg,x:0,y:0,width:12,rotation:0}]};
    const full=await applyOperations(d,[{op:'cover',id:'poster'}]);
    const o=full.objects[0],{width:w,height:h}=m.plateau;
    assert.equal(o.x,w/2);assert.equal(o.y,h/2);assert.equal(o.width,Math.max(w,h*2));
    assert.deepEqual(normalizeDesign(JSON.parse(JSON.stringify(full)),XML),full);
    const {data,info}=await sharp(await exportPNG(full,72)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,Math.round(w*72/25.4));assert.equal(info.height,Math.round(h*72/25.4));
    const alpha=(x,y)=>data[(Math.floor(y*info.height)*info.width+Math.floor(x*info.width))*4+3];
    assert.equal(alpha(0,0),0);assert.equal(alpha(.9,.9),255);assert.equal(alpha(.5,.5),255,'no logo cutout');
    const pdf=await PDFDocument.load(await exportPrintAndCut(full)),page=pdf.getPage(0);
    assert.ok(Math.abs(page.getWidth()*25.4/72-w-4)<1e-5);assert.ok(Math.abs(page.getHeight()*25.4/72-h-4)<1e-5);
    const content=Buffer.from(decodePDFRawStream(pdf.context.lookup(page.node.get(PDFName.of('Contents')),PDFRawStream)).decode()).toString();
    assert.equal(content.split('/OC /CutContourLayer BDC')[1].match(/\nS\n/g).length,1);
    assert.ok(renderDesignSVG(full).includes(`width="${w}mm"`));assert.ok(mockupArtwork(full).includes('x="0" y="0"'));
  }
});

test('duplicate near the MacBook far edge and phone/laptop switching preserve positions and mm widths',async()=>{
  const input={version:1,model:'macbook-pro-16',name:'Far edge',objects:[]};
  const d=await applyOperations(input,[{op:'add',id:'sticker',x:345,y:240,width:40},{op:'duplicate',id:'sticker',newId:'copy'}]);
  assert.equal(d.objects[1].x,346.5);assert.equal(d.objects[1].y,241.5);
  const before=structuredClone(d);changeDesignModel(d,'iphone-air');changeDesignModel(d,before.model);
  for(let i=0;i<2;i++){assert.ok(Math.abs(d.objects[i].x-before.objects[i].x)<1e-9);assert.ok(Math.abs(d.objects[i].y-before.objects[i].y)<1e-9);assert.equal(d.objects[i].width,40);}
  assert.deepEqual(normalizeDesign(d,XML),d);
});

test('calibrated logo includes the leaf, matches retained bounds and never enters artwork exports',async()=>{
  const report=JSON.parse(await readFile('assets/macbooks/sources/calibration.json','utf8'));
  for(const model of MACBOOKS){
    const {logo,plateau:{width,height}}=model;
    assert.deepEqual(logo,report.models[model.id].logo);
    assert.ok(logo.width>36&&logo.width<38);assert.ok(logo.height>44&&logo.height<47);
    // The complete silhouette's box is a little above center because of its leaf.
    assert.ok(Math.abs(logo.x+logo.width/2-width/2)<.6);
    assert.ok(height/2-logo.y-logo.height/2>3&&height/2-logo.y-logo.height/2<4.5);
    const guide=macbookLogoMarkup(model,{guide:true}),mockup=await readFile(mockupPath(model.id,model.colors[0].id).slice(1),'utf8');
    assert.ok(guide.includes('pointer-events="none"'));
    assert.ok(guide.includes(`translate(${logo.x} ${logo.y}) scale(${logo.width} ${logo.height})`));
    assert.ok(mockup.includes(macbookLogoMarkup(model,{fill:model.colors[0].metal})));
    const design={version:1,model:model.id,name:'No guide in print',objects:[]};
    assert.ok(!renderDesignSVG(design).includes('data-logo'));
    const {data}=await sharp(await exportPNG(design,72)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let i=3;i<data.length;i+=4)assert.equal(data[i],0);
  }
  const [air13,air15,pro14,pro16,neo]=MACBOOKS.map(m=>m.corner.equivalentRadiusMm);
  assert.ok(Math.abs(air13-air15)<.2);assert.ok(Math.abs(pro14-pro16)<.4);
  assert.ok(neo>air13&&air13>pro14);
});
