import sharp from 'sharp';
import {renderDesignSVG} from './design.js';
import {getPlateau} from './phones.js';
export function rasterSVG(design,dpi=600){
  // Give librsvg explicit pixels: mm + an input density can scale twice in
  // current libvips. DPI belongs in the PNG metadata, not this SVG viewport.
  const plateau=getPlateau(design),w=Math.round(plateau.width*dpi/25.4),h=Math.round(plateau.height*dpi/25.4);
  return renderDesignSVG(design).replace(/width="[^"]+" height="[^"]+"/,`width="${w}" height="${h}"`);
}
export async function exportPNG(design,dpi=600){
  return sharp(Buffer.from(rasterSVG(design,dpi))).withMetadata({density:dpi}).png().toBuffer();
}
