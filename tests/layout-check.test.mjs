import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDesign} from '../src/design.js';
import {getPhone,PHONES} from '../src/phones.js';
import {XML} from '../src/export-pdf.mjs';
import {checkLayout,avoidLogo,objectFootprint,polygonDistance} from '../src/layout-check.js';
import {applyOperations} from '../src/sticker-edit.mjs';
import sharp from 'sharp';
const object=(id,x,y,width=20,rotation=0)=>({id,type:'avatar',name:id,config:{shape:'square',padding:0},x,y,width,rotation});
const layout=(objects,model='macbook-air-13')=>normalizeDesign({version:1,model,name:'Check',objects},XML);

test('checks rotated silhouettes rather than axis-aligned boxes and reports real gaps',async()=>{
  const a=object('a',60,60,20,45),b=object('b',80,80,20,45);
  assert.ok(polygonDistance(objectFootprint(a),objectFootprint(b))>8);
  assert.equal((await checkLayout(layout([a,b]))).summary.overlap,0);
  b.x=61;b.y=61;assert.equal((await checkLayout(layout([a,b]))).summary.overlap,1);
  const near=await checkLayout(layout([object('a',60,60),object('b',81,60)]));
  assert.equal(near.summary['object-clearance'],1);assert.ok(Math.abs(near.issues.find(i=>i.code==='object-clearance').actualMm-1)<.1);
  assert.equal((await checkLayout(layout([object('a',60,60),object('b',80,60)]),{clearance:0})).summary.overlap,0);
  assert.equal((await checkLayout(layout([object('a',60,60),object('b',82,60)]))).clear,true);
});

const vector=(id,body,{x=60,y=60,width=20,rotation=0}={})=>({id,name:id,type:'svg',svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`,x,y,width,rotation});
const pairIssues=report=>report.issues.filter(i=>['overlap','object-clearance'].includes(i.code));
test('avatar padding and circle corners do not cause false overlap; opaque white canvas does',async()=>{
  const a={...object('a',60,60),config:{shape:'circle',padding:0}},b={...object('b',76,76),config:{shape:'circle',padding:0}};
  assert.equal(polygonDistance(objectFootprint(a),objectFootprint(b)),0);
  assert.deepEqual(pairIssues(await checkLayout(layout([a,b]))),[]);
  b.x=70;b.y=70;assert.equal((await checkLayout(layout([a,b]))).summary.overlap,1);
  a.config.padding=40;b.config.padding=40;
  assert.deepEqual(pairIssues(await checkLayout(layout([a,b]))),[]);
  a.config.background='white';b.config.background='white';
  assert.equal((await checkLayout(layout([a,b]))).summary.overlap,1);
});

test('SVG concavities, internal holes, disconnected islands, strokes and transforms retain their visible shape',async()=>{
  const ring=vector('ring','<path fill-rule="evenodd" d="M0 0H100V100H0Z M20 20V80H80V20Z"/>');
  const dot=vector('dot','<circle cx="50" cy="50" r="5"/>');
  assert.deepEqual(pairIssues(await checkLayout(layout([ring,dot]))),[]);
  dot.x=68;assert.equal((await checkLayout(layout([ring,dot]))).summary.overlap,1);
  const left=vector('left','<g transform="translate(5 0)"><rect width="10" height="100"/></g>',{rotation:90});
  const right=vector('right','<rect x="85" width="10" height="100"/>',{rotation:90});
  assert.deepEqual(pairIssues(await checkLayout(layout([left,right]))),[]);
  const stroke=vector('stroke','<circle cx="50" cy="50" r="40" fill="none" stroke="red" stroke-width="5"/>');
  dot.x=60;assert.deepEqual(pairIssues(await checkLayout(layout([stroke,dot]))),[]);
  dot.x=68;assert.equal((await checkLayout(layout([stroke,dot]))).summary.overlap,1);
  const concave=vector('concave','<path d="M0 0H100V20H20V100H0Z"/>');
  dot.x=63;dot.y=63;assert.deepEqual(pairIssues(await checkLayout(layout([concave,dot]))),[]);
});

test('PNG alpha controls overlap and true millimetre spacing after rotation, scaling and recipe changes',async()=>{
  const image=await sharp(Buffer.from('<svg width="100" height="100"><rect x="10" y="40" width="10" height="20" fill="red"/><rect x="80" y="40" width="10" height="20" fill="blue"/></svg>')).png().toBuffer();
  const png={id:'png',name:'PNG',type:'png',dataUrl:'data:image/png;base64,'+image.toString('base64'),x:60,y:60,width:20,rotation:90};
  const dot=vector('dot','<rect x="40" y="40" width="20" height="20"/>',{width:10});
  assert.deepEqual(pairIssues(await checkLayout(layout([png,dot]))),[]);
  dot.y=53;assert.equal((await checkLayout(layout([png,dot]))).summary.overlap,1);
  const a=vector('a','<rect x="40" y="40" width="20" height="20"/>'),b=vector('b','<rect x="40" y="40" width="20" height="20"/>',{x:65});
  const near=await checkLayout(layout([a,b]));
  assert.equal(near.method,'visible-alpha-mask');assert.equal(near.summary.overlap,0);
  assert.equal(near.issues.find(i=>i.code==='object-clearance').actualMm,1);
  assert.deepEqual(pairIssues(await checkLayout(layout([a,b]),{clearance:0})),[]);
  b.x=64;assert.equal((await checkLayout(layout([a,b]),{clearance:0})).summary.overlap,0);
  b.x=63.5;assert.equal((await checkLayout(layout([a,b]),{clearance:0})).summary.overlap,1);
  b.x=65;b.width=40;assert.equal((await checkLayout(layout([a,b]))).summary.overlap,1);
  b.svg=b.svg.replace('width="20"','width="1"').replace('x="40"','x="70"');
  assert.equal((await checkLayout(layout([a,b]))).summary.overlap,0);
});

test('fully transparent artwork is empty; semi-transparent visible artwork still overlaps',async()=>{
  const a=vector('a','<rect width="100" height="100" fill-opacity="0"/>'),b=vector('b','<rect width="100" height="100"/>');
  assert.deepEqual(pairIssues(await checkLayout(layout([a,b]))),[]);
  a.svg=a.svg.replace('fill-opacity="0"','fill-opacity="0.2"');
  assert.equal((await checkLayout(layout([a,b]))).summary.overlap,1);
});

test('process checks include rounded outer contours, holes, actual raster DPI and adjustable thresholds',async()=>{
  const corner=await checkLayout(layout([object('corner',5,5,8)]));assert.equal(corner.summary['edge-clearance'],1);
  const outside=await checkLayout(layout([object('outside',0,60)]));assert.ok(outside.issues[0].actualMm<0);
  for(const model of PHONES.filter(p=>p.plateau.holes.length)){
    const [,x,y]=model.plateau.holes[0],report=await checkLayout(layout([object('on-camera',x,y,2)],model.id));
    assert.ok(report.issues.some(i=>i.code==='hole-clearance'&&i.target===model.plateau.holes[0][0]));
    assert.equal(report.summary['logo-clearance'],0);
  }
  const d=await applyOperations(layout([]),[{op:'add',id:'raster',asset:'muse-png-04-coffee',x:60,y:60,width:150}]);
  assert.equal((await checkLayout(d)).summary['low-dpi'],1);
  assert.equal((await checkLayout(d,{minDpi:0})).summary['low-dpi'],0);
  await assert.rejects(checkLayout(d,{clearance:NaN}));await assert.rejects(checkLayout(d,{unknown:1}));
});

test('logo avoidance on all MacBooks preserves creative dimensions, rotation, IDs and layers',async()=>{
  for(const model of PHONES.filter(p=>p.logo)){
    const p=model.plateau,d=layout([object('logo',p.width/2,p.height/2,55,31),object('fixed',p.width-45,45,20)],model.id),original=JSON.stringify(d);
    assert.equal((await checkLayout(d)).summary['logo-clearance'],1);
    const result=avoidLogo(d);
    assert.equal(result.moved.length,1);assert.deepEqual(result.unresolved,[]);assert.equal((await checkLayout(result.design)).clear,true);
    assert.equal(JSON.stringify(d),original);assert.equal(result.design.objects[0].width,55);assert.equal(result.design.objects[0].rotation,31);
    assert.deepEqual(result.design.objects[1],d.objects[1]);assert.deepEqual(result.design.objects.map(o=>o.id),['logo','fixed']);
    assert.deepEqual(avoidLogo(result.design).moved,[]);
  }
  const phone=layout([object('a',30,15,8)],'iphone-air');assert.deepEqual(avoidLogo(phone).design,phone);
});

test('selective and impossible avoidance do not silently resize or partially write a batch',async()=>{
  const p=getPhone('macbook-air-13').plateau,d=layout([object('a',p.width/2,p.height/2,50),object('b',60,60)]);
  assert.deepEqual(avoidLogo(d,{ids:['b']}).moved,[]);assert.throws(()=>avoidLogo(d,{ids:['missing']}));
  const huge=layout([object('huge',p.width/2,p.height/2,1000)]),before=JSON.stringify(huge),result=avoidLogo(huge);
  assert.deepEqual(result.unresolved,['huge']);assert.equal(JSON.stringify(result.design),before);
  await assert.rejects(applyOperations(huge,[{op:'rename',name:'Must not change input'},{op:'avoid-logo'}]),/无法/);
  assert.equal(JSON.stringify(huge),before);
  const solved=await applyOperations(d,[{op:'avoid-logo',clearance:4}]);assert.equal((await checkLayout(solved,{clearance:4})).summary['logo-clearance'],0);
});
