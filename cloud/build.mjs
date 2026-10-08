import {build} from 'esbuild';
import {cpSync,existsSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),dist=new URL('./dist/',import.meta.url);
mkdirSync(dist,{recursive:true});mkdirSync(new URL('src/',dist),{recursive:true});
for(const file of ['src/export-pdf.mjs','src/export-png.mjs','src/image-import.mjs','src/sticker-edit.mjs','assets/phones/sources','assets/phones/previews'])rmSync(new URL(file,dist),{recursive:true,force:true});
if(existsSync(new URL('workstation.js',root))){
// Rebuild the hosted UI from the workstation source, keeping local and Sites UI in sync.
for(const file of ['index.html','avatar.html','workstation.css','ui.css','app.js','style.css','assets','STICKER-CLI.md','AVATAR-README.md','sticker.schema.json','sticker-operations.schema.json','avatar.schema.json'])cpSync(new URL(file,root),new URL(file,dist),{recursive:true,filter:path=>!/(?:^|\/)(sources|previews)(?:\/|$)/.test(String(path))});
for(const file of ['avatar.js','reference-data.js','additional-shapes.js','design.js','svg-import.js','png-import.js','phones.js','plateau.js','pro-geometry.js','mockup.js','layout-store.js','i18n.js'])cpSync(new URL('src/'+file,root),new URL('src/'+file,dist));
const source=readFileSync(new URL('workstation.js',root),'utf8');
const api=/async function api\(path,value\)\{[^\n]+\}/;
if(!api.test(source))throw new Error('Workstation API adapter not found');
writeFileSync(new URL('workstation.js',dist),"import {cloudAPI} from './cloud-api.js';\n"+source.replace(api,'async function api(path,value){return cloudAPI(path,value);}'));
}
// A standalone Sites source checkout builds its already-synced dist modules.
await build({entryPoints:[fileURLToPath(new URL('src/api.js',import.meta.url))],outfile:fileURLToPath(new URL('cloud-api.js',dist)),bundle:true,platform:'browser',format:'esm',minify:true});
