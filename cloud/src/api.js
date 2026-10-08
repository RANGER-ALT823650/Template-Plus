import {Buffer} from 'buffer';
import {exportPrintAndCut,XML} from './export-pdf.js';
import {rasterize,withDPI} from './raster.js';
import {normalizeDesign,renderDesignSVG} from '../dist/src/design.js';
import {importSVG} from '../dist/src/svg-import.js';
import {getPlateau} from '../dist/src/phones.js';
import {importImage} from './image-import.js';
globalThis.Buffer=Buffer;
export async function cloudAPI(path,input){
 if(path==='/api/import-svg')return Response.json(importSVG(input.svg,XML));
 if(path==='/api/import-png'||path==='/api/import-image')return Response.json(await importImage(input.dataUrl));
 const design=normalizeDesign(input,XML);
 if(path==='/api/validate')return Response.json(design);
 if(path==='/api/export/pdf')return new Response(await exportPrintAndCut(design),{headers:{'Content-Type':'application/pdf'}});
 if(path==='/api/export/svg')return new Response(renderDesignSVG(design),{headers:{'Content-Type':'image/svg+xml'}});
 if(path==='/api/export/png'){const plateau=getPlateau(design),w=Math.round(plateau.width*600/25.4),h=Math.round(plateau.height*600/25.4);const svg=renderDesignSVG(design).replace(/width="[^"]+" height="[^"]+"/,`width="${w}" height="${h}"`);return new Response(withDPI(await rasterize(svg,w,h)),{headers:{'Content-Type':'image/png'}});}
 throw new Error('未知操作');
}
