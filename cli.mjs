#!/usr/bin/env node
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { dirname,extname,resolve } from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { SHAPES,COLORS,normalizeConfig,renderSVG } from './src/avatar.js';
const HELP=`Little Shape Studio — GUI / Agent 共用的形象模板

  node cli.mjs list [--json]
  node cli.mjs render --shape drop --color brown --out output/avatar.svg
  node cli.mjs render --config avatar.json --out output/avatar.png [--size 2048]
  node cli.mjs batch --out output/all --formats svg,png [--size 512]

选项：--shape <id> --color <id> --size <64..4096> --padding <0..40>
      --background <transparent|white> --config <JSON file> --json
      --format <svg|png|webp> --out <path> --formats <comma-separated formats>

render 可将 SVG 写到 stdout：--out - --format svg。错误退出码为 1。
batch 导出 88 种组合，并写入 manifest.json。显式参数覆盖配置文件。
`;
const formats=['svg','png','webp'];
async function save(config,format,path) {
  const svg=renderSVG(config);
  if(path==='-') {
    if(format!=='svg') throw new Error('stdout 只支持 SVG');
    process.stdout.write(svg+'\n');return;
  }
  await mkdir(dirname(resolve(path)),{recursive:true});
  if(format==='svg') await writeFile(path,svg+'\n');
  else await sharp(Buffer.from(svg)).toFormat(format).toFile(path);
}
try {
  const {values:v,positionals:p}=parseArgs({allowPositionals:true,options:{
    shape:{type:'string'},color:{type:'string'},size:{type:'string'},padding:{type:'string'},
    background:{type:'string'},config:{type:'string'},format:{type:'string'},formats:{type:'string'},
    out:{type:'string'},json:{type:'boolean'},help:{type:'boolean',short:'h'},
  }});
  const command=p[0];
  if(v.help || !command){process.stdout.write(HELP);}
  else if(command==='list') {
    if(p.length>1) throw new Error('list 不接收位置参数');
    const data={version:1,shapes:SHAPES.map(({id,name})=>({id,name})),colors:COLORS,combinations:88,formats};
    process.stdout.write(v.json?JSON.stringify(data,null,2)+'\n':`图案：${data.shapes.map(s=>s.id).join(', ')}\n颜色：${COLORS.map(c=>`${c.id} (${c.hex})`).join(', ')}\n`);
  } else if(['render','batch'].includes(command)) {
    if(p.length!==1) throw new Error('多余的位置参数');
    const input=v.config?JSON.parse(await readFile(v.config,'utf8')):{};
    for(const key of ['shape','color','size','padding','background']) if(v[key]!==undefined) input[key]=['size','padding'].includes(key)?Number(v[key]):v[key];
    const config=normalizeConfig(input);
    if(command==='render') {
      if(v.formats) throw new Error('render 使用 --format；batch 使用 --formats');
      const path=v.out || `output/${config.shape}-${config.color}.${v.format || 'svg'}`;
      const format=v.format || extname(path).slice(1).toLowerCase();
      if(!formats.includes(format)) throw new Error('格式必须是 svg、png 或 webp');
      if(path==='-' && v.json) throw new Error('stdout SVG 和 --json 不能同时使用');
      const extension=extname(path).slice(1).toLowerCase();
      if(path!=='-' && extension && extension!==format) throw new Error('文件扩展名与导出格式不一致');
      await save(config,format,path);
      if(path!=='-') console.log(v.json?JSON.stringify({ok:true,path:resolve(path),format,config}):`已导出 ${resolve(path)}`);
    } else {
      if(v.shape || v.color || v.format) throw new Error('batch 生成全部图案与颜色，使用 --formats 指定格式');
      const selected=(v.formats || 'svg,png').split(',');
      if(!selected.length || selected.some(f=>!formats.includes(f)) || new Set(selected).size!==selected.length) throw new Error('formats 必须是不重复的 svg,png,webp 子集');
      const dir=resolve(v.out || 'output/all');
      const files=[];
      for(const s of SHAPES) for(const c of COLORS) for(const format of selected) {
        const path=resolve(dir,`${s.id}-${c.id}.${format}`);
        await save({...config,shape:s.id,color:c.id},format,path);
        files.push({shape:s.id,color:c.id,hex:c.hex,format,path});
      }
      await writeFile(resolve(dir,'manifest.json'),JSON.stringify({version:1,config,files},null,2)+'\n');
      console.log(v.json?JSON.stringify({ok:true,directory:dir,count:files.length,manifest:resolve(dir,'manifest.json')}):`已导出 ${files.length} 个文件 → ${dir}`);
    }
  } else throw new Error(`未知命令：${command}。使用 --help 查看说明。`);
} catch(error) { console.error(JSON.stringify({ok:false,error:error.message}));process.exitCode=1; }
