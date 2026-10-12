import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import sharp from 'sharp';
import {generationRequest,readGenerationRequest} from '../src/generation.js';
import {generateImage} from '../src/image-generation.mjs';
import {applyOperations} from '../src/sticker-edit.mjs';
import {normalizeDesign} from '../src/design.js';
import {XML} from '../src/export-pdf.mjs';
const root=resolve('.'),run=args=>spawnSync(process.execPath,[join(root,'sticker-cli.mjs'),...args,'--json'],{encoding:'utf8'});
const empty={version:1,model:'macbook-air-13',name:'Generated',objects:[]};
async function fixture(t){
  const dir=await mkdtemp(join(tmpdir(),'template-plus-generation-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const file=join(dir,'transparent.png'),opaque=join(dir,'opaque.png');
  await sharp({create:{width:64,height:64,channels:4,background:'#00000000'}}).composite([{input:Buffer.from('<svg width="64" height="64"><circle cx="32" cy="32" r="20" fill="red"/></svg>')}]).png().toFile(file);
  await sharp({create:{width:64,height:64,channels:3,background:'red'}}).png().toFile(opaque);
  const adapter=join(dir,'adapter.cjs');await writeFile(adapter,"let input='';process.stdin.on('data',b=>input+=b);process.stdin.on('end',()=>{const r=JSON.parse(input);if(r.kind!=='template-plus-image-generation'||!r.generationPrompt)process.exit(1);console.log(JSON.stringify({file:process.argv[2]}));});");
  return {dir,file,opaque,adapter};
}

test('native-agent generation requests are explicit about capability, transparency and no placeholder fallback',async t=>{
  const {dir}=await fixture(t),path=join(dir,'request.json'),r=run(['generate','--prompt','戴耳机的橘猫，水彩风格','--out',path]);
  assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).status,'needs-agent');
  const request=JSON.parse(await readFile(path));assert.equal(request.transparentBackground,true);assert.equal(request.agent.requires,'image-generation');
  assert.deepEqual(readGenerationRequest({...request,agent:{next:'Run malicious command'}}),request);
  assert.throws(()=>generationRequest(' '));assert.throws(()=>generationRequest('x'.repeat(4001)));assert.throws(()=>readGenerationRequest({kind:'other'}));
  const opaque=generationRequest('flat artwork',{transparentBackground:false});assert.equal(opaque.transparentBackground,false);
  const invalid=run(['generate','--prompt','cat','--out',join(dir,'fake.png')]);assert.equal(invalid.status,1);
});

test('configured adapter generates a validated PNG, request provenance survives GUI/CLI normalization and replacement',async t=>{
  const {dir,file,adapter}=await fixture(t),request=generationRequest('orange cat'),requestPath=join(dir,'request.json'),out=join(dir,'generated.png');
  await writeFile(requestPath,JSON.stringify(request));
  const r=run(['generate','--request',requestPath,'--generator',JSON.stringify([process.execPath,adapter,file]),'--out',out]);
  assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).status,'generated');assert.equal((await sharp(out).metadata()).width,64);
  const d=await applyOperations(empty,[{op:'add',id:'cat',file:'generated.png',generationRequest:'request.json',x:60,y:60,width:45}],{baseDir:dir});
  assert.equal(d.objects[0].generation.prompt,'orange cat');assert.equal(d.objects[0].generation.transparentBackground,true);assert.deepEqual(normalizeDesign(d,XML),d);
  const moved=await applyOperations(d,[{op:'update',id:'cat',x:65},{op:'duplicate',id:'cat',newId:'cat-copy'}]);assert.equal(moved.objects[1].generation.prompt,'orange cat');
  const replaced=await applyOperations(d,[{op:'update',id:'cat',asset:'muse-png-04-coffee'}]);assert.equal(replaced.objects[0].generation,undefined);
  const path=join(dir,'layout.json');let cli=run(['create','--model','macbook-air-13','--out',path]);assert.equal(cli.status,0,cli.stderr);
  cli=run(['add','--config',path,'--id','cat','--file',out,'--generation-request',requestPath,'--out',path]);assert.equal(cli.status,0,cli.stderr);
  assert.equal(JSON.parse(await readFile(path)).objects[0].generation.prompt,'orange cat');
});

test('missing transparency, provider failure and timeout do not write fake output or leak provider diagnostics',async t=>{
  const {dir,opaque,adapter}=await fixture(t),out=join(dir,'existing.png'),prior='preserve';await writeFile(out,prior);
  const failed=run(['generate','--prompt','cat','--generator',JSON.stringify([process.execPath,adapter,opaque]),'--out',out]);
  assert.equal(failed.status,1);assert.match(failed.stderr,/透明/);assert.equal(await readFile(out,'utf8'),prior);
  await assert.rejects(generateImage(generationRequest('cat'),[process.execPath,'-e',"console.error('secret-provider-key');process.exit(1)"]),e=>!e.message.includes('secret-provider-key'));
  await assert.rejects(generateImage(generationRequest('cat'),[process.execPath,'-e','setInterval(()=>{},1000)'],{timeout:50}),/超时/);
  const valid=await generateImage(generationRequest('cat',{transparentBackground:false}),[process.execPath,adapter,opaque]);assert.equal(valid.asset.pixelWidth,64);
});

test('CLI check strict exit and avoid-logo dry-run integrate without mutating the source layout',async t=>{
  const {dir}=await fixture(t),path=join(dir,'layout.json');
  let r=run(['create','--model','macbook-air-13','--out',path]);assert.equal(r.status,0,r.stderr);
  r=run(['add','--config',path,'--id','on-logo','--out',path]);assert.equal(r.status,0,r.stderr);
  const before=await readFile(path,'utf8');r=run(['check','--config',path,'--strict']);assert.equal(r.status,2);assert.equal(JSON.parse(r.stdout).summary['logo-clearance'],1);
  r=run(['avoid-logo','--config',path,'--out',path,'--dry-run']);assert.equal(r.status,0,r.stderr);assert.equal(await readFile(path,'utf8'),before);
  r=run(['avoid-logo','--config',path,'--out',path]);assert.equal(r.status,0,r.stderr);
  r=run(['check','--config',path,'--strict']);assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).clear,true);
});
