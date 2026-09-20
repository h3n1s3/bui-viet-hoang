// Convert the isolated portrait into literal SVG text rows; no bitmap is shipped to browsers.
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const cols = 180;
const {data,info} = await sharp(fileURLToPath(new URL('../src/assets/elaina-source.png',import.meta.url))).resize(cols,160,{fit:'fill'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
const layers = {body:[],left:[],right:[]};
const ramp = ' .,:;i1tfLCG08@';
for(let y=0;y<info.height;y++) {
 const row={body:'',left:'',right:''};
 for(let x=0;x<cols;x++) {
  const i=(y*cols+x)*3, [r,g,b]=data.subarray(i,i+3);
  const light=.2126*r+.7152*g+.0722*b;
  const char=light<12?' ':ramp[Math.min(ramp.length-1,Math.floor(Math.pow(light/255,.85)*(ramp.length-1)))];
  const hair=y>46&&y<120&&b>r*1.03&&b>g&&light>95;
  const layer=hair&&x<75?'left':hair&&x>114?'right':'body';
  for(const key of Object.keys(row)) row[key]+=key===layer?char:' ';
 }
 for(const key of Object.keys(layers)) layers[key].push(row[key].trimEnd());
}
await writeFile(new URL('../src/data/elaina-ascii.json',import.meta.url),JSON.stringify(layers));

