#!/usr/bin/env node
import {readFile,mkdir,writeFile,rename,rm,stat} from 'node:fs/promises';
import {dirname,extname,resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {exportPNG} from './src/export-png.mjs';
import {normalizeDesign,renderDesignSVG,DEFAULT_DESIGN} from './src/design.js';
import {XML,exportPrintAndCut} from './src/export-pdf.mjs';
import {PHONES,getPhone,mockupPath} from './src/phones.js';
import {SHAPES,COLORS,normalizeConfig} from './src/avatar.js';
import {MAX_LAYOUT_BYTES} from './src/png-import.js';
import {mockupArtwork} from './src/mockup.js';
import {catalog,OPERATION_FIELDS,applyOperations,inspectDesign} from './src/sticker-edit.mjs';

const HELP=`Template Plus · 贴纸工作站 CLI（无需启动服务器）

  node sticker-cli.mjs list --json
  node sticker-cli.mjs create --model iphone-18-pro --out output/layout.json --json
  node sticker-cli.mjs create --preset 1 --out output/layout.json --json
  node sticker-cli.mjs inspect --config output/layout.json --json
  node sticker-cli.mjs validate --config output/layout.json --json
  node sticker-cli.mjs add --config output/layout.json --id buddy --shape drop --color brown --x 40 --y 15 --width 12 --out output/v2.json --json
  node sticker-cli.mjs add --config output/v2.json --asset muse-png-04-coffee --out output/v3.json --json
  node sticker-cli.mjs add --config output/v3.json --file image.jpg --out output/v4.json --json
  node sticker-cli.mjs update --config output/v4.json --id buddy --x 42 --rotation -15 --out output/v5.json --json
  node sticker-cli.mjs apply --config output/v5.json --ops operations.json --out output/final.json --json
  node sticker-cli.mjs render --config output/final.json --out output/design.pdf --json
  node sticker-cli.mjs preview --config output/final.json --phone-color glacierblue --out output/preview.png --json

编辑命令：add / update / remove / duplicate / front / back / reorder / center /
          cover / model / rename / clear；apply 按顺序运行 JSON 操作数组。
共同选项：--config <布局 JSON|-> --out <文件|-> --json --dry-run（编辑预检）
形象选项：--id --name --x --y --width --rotation（中心坐标/宽度为 mm，角度为度）
素材来源：--asset <素材 ID> 或 --file <本地文件> 或 --avatar-config <形象 JSON>
          --shape --color --size --padding --background（模板形象配置）
其他选项：--model <机型 ID> --preset <1..4> --new-id <复制 ID>
          --ids <从后到前的逗号分隔 ID> --ops <操作 JSON|->
          --format <pdf|svg|png> --phone-color <机身颜色 ID>

create 默认新建空布局；render 保留无 config 时的原默认示例。
布局 --out - 输出原始 JSON；render --out - --format svg 输出 SVG。
inspect 不输出素材正文；validate 检查完整内嵌素材。失败 stderr JSON，退出码 1。
同名文件会覆盖；编辑不会自动写回 config。GUI 用“导入布局”打开 CLI 布局。
详细契约见 STICKER-CLI.md、sticker.schema.json、sticker-operations.schema.json。
`;
const stringOptions=['config','out','model','name','preset','ops','id','new-id','ids','asset','file','avatar-config','shape','color','size','padding','background','x','y','width','rotation','format','phone-color'];
const numericKeys=['size','padding','x','y','width','rotation'];
const sharedEdit=['config','out','json','dry-run'];
const commands={
  list:['json'],create:['out','json','dry-run','model','name','preset','ops'],
  inspect:['config','json'],validate:['config','json'],apply:[...sharedEdit,'ops'],
  render:['config','out','json','format'],preview:['config','out','json','phone-color'],
  ...Object.fromEntries(Object.entries(OPERATION_FIELDS).map(([op,fields])=>[op,[...sharedEdit,...fields.filter(k=>k!=='config').map(k=>k==='newId'?'new-id':k),...(fields.includes('file')?['avatar-config']:[])]])),
};
// config in an operation is an avatar recipe. --config always names the layout.
async function readJSON(path){
  let bytes;
  if(path==='-'){
    const chunks=[];let length=0;
    for await(const chunk of process.stdin){length+=chunk.length;if(length>MAX_LAYOUT_BYTES)throw new Error('JSON 输入超过 32 MB');chunks.push(chunk);}
    bytes=Buffer.concat(chunks);
  }else{
    if((await stat(path)).size>MAX_LAYOUT_BYTES)throw new Error('JSON 输入超过 32 MB');
    bytes=await readFile(path);
  }
  if(bytes.length>MAX_LAYOUT_BYTES)throw new Error('JSON 输入超过 32 MB');
  return JSON.parse(bytes.toString('utf8'));
}
async function save(path,data){
  if(path==='-'){process.stdout.write(data);return;}
  const absolute=resolve(path);await mkdir(dirname(absolute),{recursive:true});
  const temp=absolute+'.'+randomUUID()+'.tmp';
  try{await writeFile(temp,data);await rename(temp,absolute);}finally{await rm(temp,{force:true});}
}
function report(data,json){console.log(json?JSON.stringify(data):JSON.stringify(data,null,2));}
function summary(design){return {model:design.model,name:design.name,objects:design.objects.length,ids:design.objects.map(o=>o.id)};}
async function layout(v,required=true){
  if(!v.config&&required)throw new Error('请使用 --config 指定布局 JSON');
  return normalizeDesign(v.config?await readJSON(v.config):DEFAULT_DESIGN,XML);
}
async function operation(command,v){
  const op={op:command};
  for(const key of OPERATION_FIELDS[command]){
    if(key==='config')continue;
    const flag=key==='newId'?'new-id':key;
    if(v[flag]!==undefined)op[key]=key==='ids'?v[flag].split(','):numericKeys.includes(key)?number(v[flag],key):v[flag];
  }
  if(v['avatar-config'])op.config=await readJSON(v['avatar-config']);
  return op;
}
function number(value,label){
  if(!value.trim()||!Number.isFinite(Number(value)))throw new Error(`${label}须为有限数值`);return Number(value);
}
async function mutations(command,v){
  if(!v.out&&!v['dry-run'])throw new Error('请使用 --out 指定布局文件，或使用 --dry-run 预检');
  if([v.config,v.ops,v['avatar-config']].filter(path=>path==='-').length>1)throw new Error('只能有一个 JSON 输入读取 stdin');
  let design;
  if(command==='create'){
    design={version:1,model:getPhone(v.model).id,name:v.name??'我的贴纸',objects:[]};
    if(v.preset!==undefined){
      if(!/^[1-4]$/.test(v.preset))throw new Error('preset 须为 1–4');
      const placements=JSON.parse(await readFile(new URL('./assets/iphone-air/placements.json',import.meta.url),'utf8'));
      const p=getPhone(design.model).plateau,air=PHONES[0].plateau;
      design.objects=placements.styles[Number(v.preset)-1].characters.map((c,i)=>({
        id:`preset-${i+1}`,name:COLORS.find(o=>o.id===c.color).name+SHAPES.find(o=>o.id===c.shape).name,type:'avatar',
        config:normalizeConfig({shape:c.shape,color:c.color,padding:0,size:200}),
        x:c.center_mm[0]*p.width/air.width,y:c.center_mm[1]*p.height/air.height,width:c.canvas_size_mm,rotation:c.angle_degrees,
      }));
    }
  }else design=await layout(v);
  let ops=[];
  if(['create','apply'].includes(command)){
    if(command==='apply'&&!v.ops)throw new Error('apply 须指定 --ops 操作 JSON');
    if(v.ops)ops=await readJSON(v.ops);
  }else ops=[await operation(command,v)];
  const baseDir=v.ops&&v.ops!=='-'?dirname(resolve(v.ops)):process.cwd();
  design=await applyOperations(design,ops,{baseDir});
  if(v['dry-run']){report({ok:true,dryRun:true,...summary(design),design},v.json);return;}
  await save(v.out,JSON.stringify(design,null,2)+'\n');
  if(v.out!=='-')report({ok:true,out:resolve(v.out),...summary(design)},v.json);
}

try{
  // parseArgs treats separate negative values as ambiguous flags. Coordinates
  // and angles commonly use them, so accept both --x -5 and --x=-5.
  const args=process.argv.slice(2);
  for(let i=0;i<args.length-1;i++)if(numericKeys.some(k=>args[i]==='--'+k)&&/^-(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(args[i+1]))args.splice(i,2,args[i]+'='+args[i+1]);
  const {values:v,positionals:p}=parseArgs({args,allowPositionals:true,options:{
    ...Object.fromEntries(stringOptions.map(k=>[k,{type:'string'}])),
    json:{type:'boolean'},'dry-run':{type:'boolean'},help:{type:'boolean',short:'h'},
  }});
  const command=p[0];
  if(v.help||!command)process.stdout.write(HELP);
  else{
    if(p.length!==1)throw new Error('多余的位置参数');
    if(!Object.hasOwn(commands,command))throw new Error(`未知命令：${command}。使用 --help 查看说明。`);
    for(const key of Object.keys(v))if(!commands[command].includes(key))throw new Error(`${command} 不支持 --${key}`);
    if(command==='list')report({ok:true,version:1,commands:Object.keys(commands),
      models:PHONES.map(p=>({id:p.id,name:p.name,plateau:{width:p.plateau.width,height:p.plateau.height,holes:p.plateau.holes.length},colors:p.colors.map(({id,name})=>({id,name}))})),
      shapes:SHAPES.map(({id,name})=>({id,name})),colors:COLORS,assets:catalog,presets:[1,2,3,4],
      formats:['pdf','svg','png'],schemas:{layout:'sticker.schema.json',operations:'sticker-operations.schema.json'},operationFields:OPERATION_FIELDS},v.json);
    else if(command==='inspect'||command==='validate'){
      const design=await layout(v);
      report(command==='inspect'?{ok:true,...inspectDesign(design)}:{ok:true,...summary(design)},v.json);
    }else if(command==='render'||command==='preview'){
      if(!v.out)throw new Error('请使用 --out 指定成品文件');
      const design=await layout(v,command==='preview'),format=v.format||extname(v.out).slice(1).toLowerCase();
      if(!['svg','png',...(command==='render'?['pdf']:[])].includes(format))throw new Error(command==='preview'?'预览格式须为 SVG 或 PNG':'导出格式须为 PDF、SVG 或 PNG');
      if(v.out==='-'&&(format!=='svg'||v.json))throw new Error('stdout 仅支持 SVG，且不能使用 --json');
      if(v.out!=='-'&&extname(v.out)&&extname(v.out).slice(1).toLowerCase()!==format)throw new Error('文件扩展名与导出格式不一致');
      let data;
      if(command==='preview'){
        const phone=getPhone(design.model),color=v['phone-color']??phone.colors[0].id;
        if(!phone.colors.some(c=>c.id===color))throw new Error('此机型不支持所选机身颜色');
        const mockup=await readFile(new URL('.'+mockupPath(phone.id,color),import.meta.url),'utf8');
        const {width,height}=phone.phone;
        const body=mockup.replace(/<svg\b[^>]*>/,`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">${body}${mockupArtwork(design)}</svg>`;
        const raster=svg.replace(/width="[^"]+" height="[^"]+"/,`width="${Math.round(width*150/25.4)}" height="${Math.round(height*150/25.4)}"`);
        data=format==='svg'?svg:await sharp(Buffer.from(raster)).withMetadata({density:150}).png().toBuffer();
      }else data=format==='pdf'?await exportPrintAndCut(design):format==='png'?await exportPNG(design):renderDesignSVG(design);
      await save(v.out,data);
      if(v.out!=='-')report({ok:true,out:resolve(v.out),format,...summary(design)},v.json);
    }else await mutations(command,v);
  }
}catch(error){console.error(JSON.stringify({ok:false,error:error.message}));process.exitCode=1;}
