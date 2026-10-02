import {build} from 'esbuild';
await build({entryPoints:['src/api.js'],outfile:'dist/cloud-api.js',bundle:true,platform:'browser',format:'esm',minify:true});
