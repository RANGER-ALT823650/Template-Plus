import potrace from 'potrace';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const base = new URL('../references/masks/', import.meta.url);
const trace = path => new Promise((resolve,reject) => potrace.trace(path, {
  threshold:128, turdSize:0, alphaMax:1.334, optCurve:true, optTolerance:.4,
}, (err,svg)=>err?reject(err):resolve(svg.match(/<path[^>]*d="([^"]+)"/)[1])));
const manifest = JSON.parse(await readFile(new URL('manifest.json',base)));
const bodies = {};
for (const s of manifest) bodies[s.id] = {
  path:await trace(fileURLToPath(new URL(s.id+'-trace.png',base))), transform:s.transform,
};
const eyes = {path:await trace(fileURLToPath(new URL('eyes-trace.png',base))),transform:manifest.at(-1).transform};
// potrace's JS implementation emits paths directly in image coordinates.
const colors = JSON.parse(await readFile(new URL('colors.json',base)));
await writeFile(new URL('../src/reference-data.js',import.meta.url),
  `// Vector silhouettes traced from the retained screenshots. Colors are ICC-converted to sRGB.\nexport const REFERENCE = ${JSON.stringify({bodies,eyes,colors},null,2)};\n`);
console.log('Wrote shared vector reference data.');
