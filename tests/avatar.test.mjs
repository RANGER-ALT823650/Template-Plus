import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import sharp from 'sharp';
import {SHAPES,COLORS,normalizeConfig,renderSVG,DEFAULT_CONFIG} from '../src/avatar.js';
import {REFERENCE} from '../src/reference-data.js';
import {ADDITIONAL_SHAPES} from '../src/additional-shapes.js';

test('traced vectors preserve screenshot silhouettes at native resolution',async()=>{
  for(const [id,shape] of [...Object.entries(REFERENCE.bodies),['eyes',REFERENCE.eyes]]){
    const width=['drop','eyes'].includes(id)?166:80,height=['drop','eyes'].includes(id)?224:80;
    const mask=await sharp(`references/masks/${id}.png`).greyscale().raw().toBuffer();
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path d="${shape.path}" transform="scale(.25)"/></svg>`;
    const rgba=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
    let intersection=0,union=0;
    for(let i=0;i<mask.length;i++){const source=mask[i]<128,vector=rgba[i*4+3]>=128;intersection+=source&&vector;union+=source||vector;}
    assert.ok(intersection/union>(id==='eyes'?.97:.99),`${id}: reference silhouette fidelity`);
  }
});

test('additional shapes preserve the supplied screenshot silhouettes',async()=>{
  const manifest=JSON.parse(await readFile('references/additional-shapes/manifest.json','utf8'));
  for(const {id,width,height} of manifest){
    const shape=ADDITIONAL_SHAPES.find(s=>s.id===id);
    const mask=await sharp(`references/additional-shapes/${id}.png`).greyscale().raw().toBuffer();
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path d="${shape.path}"/></svg>`;
    const rgba=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
    let intersection=0,union=0;
    for(let i=0;i<mask.length;i++){const source=mask[i]<128,vector=rgba[i*4+3]>=128;intersection+=source&&vector;union+=source||vector;}
    assert.ok(intersection/union>.99,`${id}: screenshot silhouette fidelity`);
  }
});

test('all 154 combinations retain exact body color, white eyes, and transparency',async()=>{
  assert.equal(SHAPES.length,14);assert.equal(COLORS.length,11);
  for(const shape of SHAPES){
    const body=await sharp(Buffer.from(renderSVG({shape:shape.id,size:200,padding:10},{eyes:false}))).ensureAlpha().raw().toBuffer();
    for(const color of COLORS){
      const svg=renderSVG({shape:shape.id,color:color.id,size:200,padding:10});
      assert.ok(svg.includes(`fill="${color.hex}"`));assert.ok(svg.includes('fill="#FFFFFF"'));
      const rgba=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
      let whites=0,outside=0;
      for(let i=0;i<rgba.length;i+=4){
        if(rgba[i]===255&&rgba[i+1]===255&&rgba[i+2]===255&&rgba[i+3]===255){whites++;if(body[i+3]<250)outside++;}
      }
      assert.ok(whites>100,`${shape.id}: visible white eyes`);
      assert.equal(outside,0,`${shape.id}: eyes stay inside body`);
      assert.equal(rgba[3],0,'transparent corner');
    }
  }
});
test('strict configuration validation and white background',async()=>{
  for(const config of [{shape:'../bad'},{color:'<script>'},{size:0},{size:4097},{size:1.5},{padding:41},{padding:NaN},{background:'"/>'},{eyes:'red'},{version:2},null,[]])assert.throws(()=>normalizeConfig(config));
  assert.deepEqual(normalizeConfig({}),DEFAULT_CONFIG);
  const b=await sharp(Buffer.from(renderSVG({size:64,background:'white'}))).ensureAlpha().raw().toBuffer();
  assert.deepEqual([...b.subarray(0,4)],[255,255,255,255]);
});
test('CLI recipe round trip, raster formats, batch manifest, and error exit codes',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'little-shapes-'));
  const run=args=>execFileSync(process.execPath,['cli.mjs',...args],{encoding:'utf8'});
  const listed=JSON.parse(run(['list','--json']));assert.equal(listed.combinations,154);
  for(const format of ['svg','png','webp']){
    const path=join(dir,`drop.${format}`);
    const result=JSON.parse(run(['render','--config','examples/avatar.json','--size','256','--out',path,'--json']));
    assert.equal(result.config.size,256);
    if(format==='svg')assert.equal((await readFile(path,'utf8')).trim(),renderSVG({...DEFAULT_CONFIG,size:256}));
    else{const meta=await sharp(path).metadata();assert.equal(meta.width,256);assert.equal(meta.height,256);assert.equal(meta.format,format);assert.ok(meta.hasAlpha);}
  }
  assert.equal(run(['render','--out','-','--format','svg']).trim(),renderSVG());
  const batch=JSON.parse(run(['batch','--out',join(dir,'all'),'--formats','svg,png','--size','64','--json']));
  assert.equal(batch.count,308);assert.equal((await readdir(join(dir,'all'))).length,309);
  const manifest=JSON.parse(await readFile(batch.manifest,'utf8'));assert.equal(manifest.files.length,308);
  for(const args of [['render','--shape','wrong'],['render','--out','x.png','--format','svg'],['batch','--formats','svg,svg'],['render','--size','NaN'],['render','--out','-','--format','svg','--json']]){
    const result=spawnSync(process.execPath,['cli.mjs',...args],{encoding:'utf8'});assert.equal(result.status,1);assert.equal(JSON.parse(result.stderr).ok,false);
  }
});
