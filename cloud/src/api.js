import {Buffer} from 'buffer';
import {exportPrintAndCut,XML} from './export-pdf.js';
import {rasterize,withDPI} from './raster.js';
import {normalizeDesign,renderDesignSVG} from '../dist/src/design.js';
import {importSVG} from '../dist/src/svg-import.js';
import {importPNG} from '../dist/src/png-import.js';
import {PLATEAU} from '../dist/src/plateau.js';
globalThis.Buffer=Buffer;
export async function cloudAPI(path,input){
 if(path==='/api/import-svg')return Response.json(importSVG(input.svg,XML));
 if(path==='/api/import-png'){const asset=importPNG(input.dataUrl);const img=new Image();img.src=asset.dataUrl;await img.decode();return Response.json(asset);}
 const design=normalizeDesign(input,XML);
 if(path==='/api/validate')return Response.json(design);
 if(path==='/api/export/pdf')return new Response(await exportPrintAndCut(design),{headers:{'Content-Type':'application/pdf'}});
 if(path==='/api/export/svg')return new Response(renderDesignSVG(design),{headers:{'Content-Type':'image/svg+xml'}});
 if(path==='/api/export/png'){const w=Math.round(PLATEAU.width*600/25.4),h=Math.round(PLATEAU.height*600/25.4);const svg=renderDesignSVG(design).replace(/width="[^"]+" height="[^"]+"/,`width="${w}" height="${h}"`);return new Response(withDPI(await rasterize(svg,w,h)),{headers:{'Content-Type':'image/png'}});}
 throw new Error('未知操作');
}
