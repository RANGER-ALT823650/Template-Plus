import {Buffer} from 'buffer';
import {rasterize} from './raster.js';
import PDFDocument from '../node_modules/pdfkit/js/pdfkit.standalone.js';
import SVGtoPDF from 'svg-to-pdfkit';
import {DOMParser,XMLSerializer} from '@xmldom/xmldom';
import {normalizeDesign,assetSVG,objectHeight} from '../dist/src/design.js';
import {PLATEAU} from '../dist/src/plateau.js';
export const XML={DOMParser,XMLSerializer};
export async function exportPrintAndCut(input){
  const design=normalizeDesign(input,XML),{width:w,height:h,margin:m,path}=PLATEAU,mm=72/25.4;
  const doc=new PDFDocument({size:[(w+2*m)*mm,(h+2*m)*mm],margin:0,pdfVersion:'1.5',compress:true,info:{Title:design.name,Author:'Template Plus',Subject:'1:1 millimeters; transparent artwork (vectors and embedded PNGs); nominal CutContour; 2 mm page margins'}});
  const chunks=[];
  const result=new Promise((resolve,reject)=>{doc.on('data',b=>chunks.push(b));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
  const layer=(name,print)=>{const ref=doc.ref({Type:'OCG',Name:new String(name),Usage:{View:{ViewState:'ON'},Print:{PrintState:print?'ON':'OFF'}}});ref.end();return ref;};
  const art=layer('Artwork - PRINT',true),cut=layer('CutContour - CUT ONLY - DO NOT PRINT',false),layers=[art,cut];
  doc._root.data.OCProperties={OCGs:layers,D:{Name:new String('Print artwork and cut geometry'),BaseState:'ON',Order:layers,AS:[{Event:'Print',Category:['Print'],OCGs:layers}]}};
  doc._root.data.PageMode='UseOC';
  doc.page.resources.data.Properties={Artwork:art,CutContourLayer:cut};
  doc.addContent('/OC /Artwork BDC');
  doc.save().translate(m*mm,m*mm).scale(mm).path(path).clip('even-odd');
  for(const o of design.objects){
    doc.save().translate(o.x,o.y).rotate(o.rotation);
    if(o.type==='png'||(o.type==='svg'&&/<filter\b/.test(o.svg))){
      // PDFKit cannot reproduce SVG filters. Rasterize only this asset at
      // 600 DPI (or its original pixel density), retaining vector cut paths.
      let data;
      if(o.type==='png')data=Buffer.from(o.dataUrl.slice(22),'base64');
      else {const width=Math.min(4096,Math.max(1,Math.ceil(o.width*600/25.4))),height=Math.min(4096,Math.max(1,Math.ceil(objectHeight(o)*600/25.4)));
        const source=o.svg.replace(/<svg\b[^>]*>/,tag=>tag.replace(/\s(width|height)="[^"]*"/g,'').replace(/>$/,` width="${width}" height="${height}">`));
        data=Buffer.from(await rasterize(source,width,height));}
      doc.image(data,-o.width/2,-objectHeight(o)/2,{width:o.width,height:objectHeight(o)});
      doc.restore();continue;
    }
    // Explicit root dimensions win over converter viewport options. Match them
    // to the layout's physical dimensions before applying the mm transform.
    const svg=assetSVG(o).replace(/<svg\b[^>]*>/,tag=>tag.replace(/\s(width|height)="[^"]*"/g,'').replace(/>$/,` width="${o.width}" height="${objectHeight(o)}">`));
    SVGtoPDF(doc,svg,-o.width/2,-objectHeight(o)/2,{width:o.width,height:objectHeight(o),assumePt:true,warningCallback:message=>{throw new Error(`SVG 转 PDF 失败：${message}`);}});
    doc.restore();
  }
  doc.restore().addContent('EMC');
  doc.addContent('/OC /CutContourLayer BDC');
  doc.addSpotColor('CutContour',0,100,0,0);
  const overprint=doc.ref({Type:'ExtGState',OP:true,op:true,OPM:1});overprint.end();
  doc.page.ext_gstates.CutOverprint=overprint;
  doc.save().translate(m*mm,m*mm).scale(mm).addContent('/CutOverprint gs');
  doc.strokeColor('CutContour').lineWidth(.1).path(PLATEAU.outer).stroke();
  for(const [,x,y,d] of PLATEAU.holes)doc.circle(x,y,d/2).stroke();
  doc.restore().addContent('EMC');doc.end();
  return result;
}
