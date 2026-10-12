import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import sharp from 'sharp';
import {PDFDocument} from 'pdf-lib';
import {applyOperations,inspectDesign} from '../src/sticker-edit.mjs';
import {normalizeDesign} from '../src/design.js';
import {PHONES} from '../src/phones.js';
import {XML} from '../src/export-pdf.mjs';
const root=resolve('.'),empty={version:1,model:'iphone-air',name:'Agent',objects:[]};
const run=(args,input,cwd=root)=>spawnSync(process.execPath,[join(root,'sticker-cli.mjs'),...args],{encoding:'utf8',input,cwd});
function json(args,input,cwd){const r=run([...args,'--json'],input,cwd);assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);}
async function temporary(t){const dir=await mkdtemp(join(tmpdir(),'sticker-cli-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}

test('Agent discovery, empty creation, all presets and shape recipe interoperability',async t=>{
  const dir=await temporary(t),list=json(['list']);
  assert.equal(list.models.length,10);assert.equal(list.assets.length,34);assert.equal(list.shapes.length,14);assert.equal(list.colors.length,11);
  const path=join(dir,'layout.json'),recipe=join(dir,'avatar.json');
  assert.equal(json(['create','--model','iphone-18-pro','--out',path]).objects,0);
  await writeFile(recipe,JSON.stringify({shape:'cloud',color:'blue',padding:23,background:'white'}));
  json(['add','--config',path,'--id','friend','--avatar-config',recipe,'--x','-2.5','--rotation','-15','--out',path]);
  const d=JSON.parse(await readFile(path));assert.equal(d.objects[0].x,-2.5);assert.equal(d.objects[0].rotation,-15);assert.equal(d.objects[0].config.padding,23);assert.equal(d.objects[0].config.background,'white');
  assert.deepEqual(normalizeDesign(d,XML),d);
  for(const preset of ['1','2','3','4']){
    const d=json(['create','--preset',preset,'--model','iphone-17-pro-max','--dry-run']).design;
    assert.equal(d.objects.length,5);assert.equal(d.model,'iphone-17-pro-max');assert.deepEqual(normalizeDesign(d,XML),d);
  }
});

test('batch editing preserves ID, partial config, all layers, model mapping and shared fit geometry',async()=>{
  const start=await applyOperations(empty,[{op:'add',id:'a',shape:'cloud',color:'pink',x:20,y:10,width:9,padding:21},{op:'add',id:'b',color:'blue'}]);
  const snapshot=JSON.stringify(start);
  const d=await applyOperations(start,[{op:'update',id:'a',color:'red',rotation:-25},{op:'duplicate',id:'a',newId:'c'},
    {op:'back',id:'c'},{op:'front',id:'a'},{op:'reorder',ids:['a','b','c']},{op:'remove',id:'b'},
    {op:'model',model:'iphone-18-pro'},{op:'center',id:'c'},{op:'rename',name:'Revised'}]);
  assert.equal(JSON.stringify(start),snapshot);assert.deepEqual(d.objects.map(o=>o.id),['a','c']);assert.equal(d.name,'Revised');
  const a=d.objects[0],p=PHONES.find(p=>p.id==='iphone-18-pro').plateau;
  assert.equal(a.config.shape,'cloud');assert.equal(a.config.padding,21);assert.equal(a.config.color,'red');assert.equal(a.width,9);assert.equal(a.rotation,-25);
  assert.ok(Math.abs(a.x-20/PHONES[0].plateau.width*p.width)<1e-10);
  assert.equal(d.objects[1].x,p.width/2);assert.equal(d.objects[1].y,p.height/2);
  const cover=await applyOperations(d,[{op:'cover',id:'a'}]);assert.equal(cover.objects[0].width,p.width);assert.equal(cover.objects[0].rotation,0);
  assert.equal((await applyOperations(d,[{op:'clear'}])).objects.length,0);
});

test('local files and built-in assets embed safely, preserve aspect ratio and produce real exports/previews',async t=>{
  const dir=await temporary(t),path=join(dir,'layout.json'),image=join(dir,'photo.jpg'),vector=join(dir,'vector.svg');
  await sharp({create:{width:120,height:60,channels:3,background:'red'}}).jpeg().toFile(image);
  await writeFile(vector,'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 10"><rect width="40" height="10" fill="blue"/></svg>');
  const ops=join(dir,'ops.json');await writeFile(ops,JSON.stringify([
    {op:'add',id:'photo',file:'photo.jpg',width:30},{op:'add',id:'vector',file:'vector.svg'},
    {op:'add',id:'coffee',asset:'muse-png-04-coffee'},{op:'add',id:'dots',asset:'dots-svg-01-pink-headphones'},
    {op:'cover',id:'photo'},
  ]));
  json(['create','--model','iphone-18-pro','--ops',ops,'--out',path],undefined,tmpdir());
  await rm(image);await rm(vector);
  const d=JSON.parse(await readFile(path));assert.equal(d.objects[0].type,'png');assert.equal(d.objects[0].ratio,.5);assert.equal(d.objects[1].ratio,.25);
  assert.deepEqual(normalizeDesign(d,XML),d);
  const view=json(['inspect','--config',path]);assert.ok(view.objects[0].dpi>0);assert.equal(view.objects[1].height,3);assert.ok(!JSON.stringify(view).includes('data:image'));assert.ok(!JSON.stringify(view).includes('<svg'));
  json(['validate','--config',path]);
  for(const format of ['pdf','svg','png']){
    const out=join(dir,'art.'+format);json(['render','--config',path,'--out',out]);
    if(format==='pdf'){const pdf=await PDFDocument.load(await readFile(out)),p=PHONES.find(p=>p.id===d.model).plateau;assert.ok(Math.abs(pdf.getPage(0).getWidth()*25.4/72-(p.width+4))<1e-5);}
    if(format==='png'){const m=await sharp(out).metadata();assert.equal(m.density,600);assert.ok(m.hasAlpha);}
    if(format==='svg')assert.ok((await readFile(out,'utf8')).includes('data:image/png;base64,'));
  }
  for(const phone of PHONES){
    json(['model','--config',path,'--model',phone.id,'--out',path]);
    const png=join(dir,phone.id+'.png'),svg=join(dir,phone.id+'.svg');
    json(['preview','--config',path,'--phone-color',phone.colors[0].id,'--out',png]);
    json(['preview','--config',path,'--out',svg]);
    const meta=await sharp(png).metadata();assert.equal(meta.width,Math.round(phone.phone.width*150/25.4));assert.equal(meta.height,Math.round(phone.phone.height*150/25.4));
    const source=await readFile(svg,'utf8');assert.ok(source.includes('mockup-art-clip'));assert.ok(!source.includes('href="/assets/'));assert.ok(!source.includes('<?xml'));
  }
});

test('stdin/stdout pipelines, single edit commands, replacement and dry-run are reviewable',async t=>{
  const dir=await temporary(t),path=join(dir,'saved.json');
  let r=run(['create','--out','-']);assert.equal(r.status,0,r.stderr);let d=JSON.parse(r.stdout);assert.equal(d.objects.length,0);
  r=run(['add','--config','-','--id','a','--color','pink','--out','-','--json'],JSON.stringify(d));assert.equal(r.status,0,r.stderr);d=JSON.parse(r.stdout);
  json(['create','--ops','-','--out',path],JSON.stringify([{op:'add',id:'a'},{op:'add',id:'b'}]));
  const original=await readFile(path,'utf8');
  assert.equal(json(['update','--config',path,'--id','a','--x','33','--dry-run','--out',path]).design.objects[0].x,33);
  assert.equal(await readFile(path,'utf8'),original);
  json(['duplicate','--config',path,'--id','a','--new-id','c','--out',path]);
  json(['back','--config',path,'--id','c','--out',path]);json(['front','--config',path,'--id','a','--out',path]);
  json(['reorder','--config',path,'--ids','a,c,b','--out',path]);
  assert.deepEqual(json(['inspect','--config',path]).objects.map(o=>o.id),['a','c','b']);
  json(['remove','--config',path,'--id','b','--out',path]);
  json(['update','--config',path,'--id','a','--asset','ai-logos-svg-07-claude','--out',path]);
  assert.equal(json(['inspect','--config',path]).objects[0].type,'svg');
  const replacement=json(['update','--config',path,'--id','a','--color','blue','--avatar-config',join(root,'examples/avatar.json'),'--dry-run']);
  assert.equal(replacement.design.objects[0].type,'avatar');assert.equal(replacement.design.objects[0].config.color,'blue');
});

test('failed batches and unsafe sources leave existing files unchanged with machine-readable errors',async t=>{
  const dir=await temporary(t),path=join(dir,'layout.json'),ops=join(dir,'ops.json'),bad=join(dir,'bad.svg');
  json(['create','--preset','1','--out',path]);const original=await readFile(path,'utf8');
  await writeFile(bad,'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><image href="https://example.com/a.png"/></svg>');
  const cases=[
    ['update','--id','missing','--x','1'],['add','--id','preset-1'],['add','--width','0'],['add','--x','NaN'],
    ['add','--file',bad],['add','--asset','missing'],['add','--asset','dots-svg-01-pink-headphones','--color','red'],
    ['model','--model','not-a-phone'],['model'],['rename'],['reorder','--ids','preset-1'],['render','--format','png','--out',join(dir,'bad.svg')],
    ['inspect','--shape','drop'],['preview','--phone-color','glacierblue','--out',join(dir,'preview.png')],
  ];
  for(const args of cases){const r=run([...args,'--config',path,...(!['inspect','render','preview'].includes(args[0])?['--out',path]:[]),'--json']);assert.equal(r.status,1,args.join(' '));assert.equal(JSON.parse(r.stderr).ok,false);assert.equal(await readFile(path,'utf8'),original);}
  for(const failure of [{op:'update',id:'missing',x:2},{op:'add',id:'new',x:'20'},{op:'model'},{op:'add',config:null},{op:'update',id:'preset-1',colour:'red'}]){
    await writeFile(ops,JSON.stringify([{op:'rename',name:'Must not persist'},failure]));
    const r=run(['apply','--config',path,'--ops',ops,'--out',path,'--json']);assert.equal(r.status,1);assert.match(JSON.parse(r.stderr).error,/操作 2/);assert.equal(await readFile(path,'utf8'),original);
  }
  assert.ok(!(await readdir(dir)).some(f=>f.endsWith('.tmp')));
});
