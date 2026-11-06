// Keep the supplied SVG coordinates/transforms/viewBoxes; repair only evenodd subpath grouping.
const fs=require('node:fs'),path=require('node:path'),out={};
for(const family of ['muscles','workouts','cardio']){
 for(const file of fs.readdirSync(path.join('assets',family)).filter(f=>f.endsWith('.svg')).sort()){
  const raw=fs.readFileSync(path.join('assets',family,file),'utf8'),viewBox=raw.match(/viewBox="([^"]+)"/)?.[1];
  if(!viewBox||!viewBox.split(/\s+/).every(x=>Number.isFinite(Number(x)))||/<(?:script|image|rect)\b/i.test(raw))throw Error('Unexpected pictogram: '+file);
  let body=raw.slice(raw.indexOf('>')+1,raw.lastIndexOf('</svg>'));
  // Separate paths cannot cut holes in one another, even with an evenodd parent group.
  if(family==='muscles'&&['avant-bras.svg'].includes(file)){
   const contours=[...body.matchAll(/<path d="([^"]+)"\s*\/>/g)].map(m=>m[1]);let first=true;
   body=body.replace(/<path d="[^"]+"\s*\/>/g,()=>{if(!first)return '';first=false;return '<path d="'+contours.join(' ')+'"/>'});
  }
  out[family+'/'+file.slice(0,-4)]={viewBox,body};
 }
}
fs.writeFileSync('pictogram-source.js','// Generated from the supplied pictograms. Run node scripts/build-pictograms.cjs after asset changes.\nexport const pictogramSources='+JSON.stringify(out)+';\n');
