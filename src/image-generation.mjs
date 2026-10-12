import {spawn} from 'node:child_process';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readGenerationRequest} from './generation.js';
import {importImage} from './image-import.mjs';
import sharp from 'sharp';

export async function assertGeneratedTransparency(asset,request){
  if(request.transparentBackground){
    const image=sharp(Buffer.from(asset.dataUrl.split(',')[1],'base64')),meta=await image.metadata();
    if(!meta.hasAlpha||(await image.stats()).channels[3]?.min===255)throw new Error('生成图片缺少真实透明背景，请让生成器重试或选择不要求透明背景');
  }
}

// A trusted, explicitly configured adapter bridges the hosting agent's image
// tool. No provider credentials or arbitrary shell text come from the browser.
export async function generateImage(input,generator,{timeout=180000}={}){
  const request=readGenerationRequest(input);
  if(!Array.isArray(generator)||!generator.length||generator.length>20||generator.some(s=>typeof s!=='string'||!s||s.length>4096))throw new Error('generator 须为非空 argv JSON 数组');
  const result=await new Promise((accept,reject)=>{
    const child=spawn(generator[0],generator.slice(1),{stdio:['pipe','pipe','pipe'],shell:false});
    let stdout='',length=0,settled=false;
    const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):accept(value);};
    const timer=setTimeout(()=>{child.kill('SIGKILL');finish(new Error('文生图生成器超时'));},timeout);
    child.on('error',()=>finish(new Error('无法启动文生图生成器')));
    child.stdin.on('error',()=>{});
    child.stdout.on('data',chunk=>{length+=chunk.length;if(length>1000000){child.kill('SIGKILL');finish(new Error('生成器返回超过 1 MB'));}else stdout+=chunk;});
    // Drain diagnostics but do not expose provider stderr, which may contain credentials.
    child.stderr.resume();
    child.on('close',code=>{if(code!==0)return finish(new Error(`文生图生成器失败（退出码 ${code}）`));try{finish(null,JSON.parse(stdout));}catch{finish(new Error('生成器须返回单个 JSON 对象'));}});
    child.stdin.end(JSON.stringify(request));
  });
  if(typeof result?.file!=='string'||!result.file)throw new Error('生成器未返回本地图片 file');
  const path=resolve(result.file);if((await stat(path)).size>5000000)throw new Error('生成图片最大 5 MB');
  const bytes=await readFile(path),asset=await importImage('data:image/png;base64,'+bytes.toString('base64'));
  await assertGeneratedTransparency(asset,request);
  return {asset,request};
}
