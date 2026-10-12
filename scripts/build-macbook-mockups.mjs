import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {MACBOOKS,macbookLogoMarkup} from '../src/macbooks.js';
const calibration=JSON.parse(await readFile(new URL('../assets/macbooks/sources/calibration.json',import.meta.url),'utf8'));
for(const model of MACBOOKS){
  const {width:w,height:h,outer}=model.plateau;
  const folder=new URL(`../assets/macbooks/${model.id}/`,import.meta.url);
  await mkdir(new URL('mockups/',folder),{recursive:true});
  const dimensions={model:model.id,name:model.name,source_url:model.specs,checked_on:'2026-10-10',
    official_enclosure_mm:{width:w,depth:h,height:model.thickness},
    sticker_surface:'closed display lid, top view; origin at upper left; logo has no cutout',
    outline:{width:w,height:h,corner:model.corner,path:outer,holes:[]},
    logo_bounds_mm:model.logo,
    calibration_source:calibration.models[model.id].source,
    method:'Published enclosure width/depth define the nominal lid footprint. Logo bounds include the leaf. Corners and logo are derived from retained official Apple top-view images, or the Neo engineering vectors. The equivalent radius describes the corner near its diagonal, not a constant circular radius. Photo estimates have about 0.5-1 mm uncertainty; logo/radius values are not dimension callouts. Edge treatment and RGB colors remain illustrative; verify a paper template before cutting.',
    colors:model.colors};
  await writeFile(new URL('dimensions.json',folder),JSON.stringify(dimensions,null,2)+'\n');
  await writeFile(new URL('plateau-cutout.svg',folder),`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><path d="${outer}" fill="#d9dde2"/></svg>\n`);
  for(const c of model.colors){
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${c.panel}"/><stop offset=".5" stop-color="${c.body}"/><stop offset="1" stop-color="${c.panel}"/></linearGradient><linearGradient id="rim" x2="0" y2="1"><stop stop-color="${c.panel}"/><stop offset="1" stop-color="${c.metal}"/></linearGradient></defs><path d="${outer}" fill="url(#rim)"/><path d="${outer}" transform="translate(.7 .7) scale(${(w-1.4)/w} ${(h-1.4)/h})" fill="url(#body)" stroke="${c.metal}" stroke-width=".25"/>${macbookLogoMarkup(model,{fill:c.metal})}<path d="M 15 ${h-.6} H ${w-15}" stroke="${c.metal}" stroke-width=".35" opacity=".4"/></svg>\n`;
    await writeFile(new URL(`mockups/${c.id}-rear.svg`,folder),svg);
  }
}
