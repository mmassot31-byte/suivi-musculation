import {radarModel} from './radar.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('fr-FR');
const point=(i,n,value,scale,radius=91)=>{const a=-Math.PI/2+i*2*Math.PI/n;return [160+Math.cos(a)*radius*value/scale,132+Math.sin(a)*radius*value/scale]};
const polygon=(axes,field,side,scale)=>axes.map((axis,i)=>point(i,axes.length,axis[side]?.[field]||0,scale).map(v=>v.toFixed(2)).join(',')).join(' ');
const textual=model=>model.detail.map(row=>`${row.label} : ${row.current.direct} directes, ${row.current.secondary} secondaires${model.compared?`; comparaison : ${row.comparison?.direct||0} directes, ${row.comparison?.secondary||0} secondaires`:''}`).join('. ');
function chart(model){
 const n=model.axes.length;
 if(model.mode==='empty')return '<p class="empty">Aucune série de travail enregistrée à représenter.</p>';
 if(model.mode==='bars')return `<div class="muscle-radar-bars">${model.axes.map(row=>`<div class="radar-bar-row"><strong>${esc(row.label)}</strong><div class="radar-bar-track"><i class="radar-direct-bar" style="width:${row.current.direct/model.scale*100}%"></i><i class="radar-secondary-bar" style="width:${row.current.secondary/model.scale*100}%"></i></div><span>${row.current.direct} directes · ${row.current.secondary} secondaires</span>${model.compared?`<div class="radar-bar-track radar-bar-previous"><i class="radar-direct-bar" style="width:${(row.comparison?.direct||0)/model.scale*100}%"></i><i class="radar-secondary-bar" style="width:${(row.comparison?.secondary||0)/model.scale*100}%"></i></div><small>Comparaison : ${row.comparison?.direct||0} directes · ${row.comparison?.secondary||0} secondaires</small>`:''}</div>`).join('')}</div>`;
 const rings=[.25,.5,.75,1].map(r=>`<polygon class="radar-grid" points="${model.axes.map((_,i)=>point(i,n,model.scale*r,model.scale).join(',')).join(' ')}"/>`).join('');
 const spokes=model.axes.map((axis,i)=>{
  const [x,y]=point(i,n,model.scale,model.scale),[tx,ty]=point(i,n,model.scale,model.scale,113);
  const short=axis.label.replace('Épaules · ','Épaules ').replace('Ischio-jambiers','Ischio- jambiers');
  const words=short.split(' '),lines=words.length>1?[words.slice(0,-1).join(' '),words.at(-1)]:[short];
  const lx=tx<65?5:tx>255?315:tx,anchor=tx<65?'start':tx>255?'end':'middle';
  return `<line class="radar-grid" x1="160" y1="132" x2="${x}" y2="${y}"/><text x="${lx}" y="${ty}" text-anchor="${anchor}" dominant-baseline="middle">${lines.map((line,j)=>`<tspan x="${lx}" dy="${j===0?(lines.length>1?-5:0):12}">${esc(line)}</tspan>`).join('')}</text>`;
 }).join('');
 const previous=model.compared?`<polygon class="radar-previous" points="${polygon(model.axes,'direct','comparison',model.scale)}"/><polygon class="radar-previous-secondary" points="${polygon(model.axes,'secondary','comparison',model.scale)}"/>`:'';
 return `<svg class="muscle-radar" viewBox="0 0 320 270" role="img" aria-label="${esc(textual(model))}">${rings}${spokes}${previous}<polygon class="radar-secondary" points="${polygon(model.axes,'secondary','current',model.scale)}"/><polygon class="radar-direct" points="${polygon(model.axes,'direct','current',model.scale)}"/>${model.axes.map((axis,i)=>{const [cx,cy]=point(i,n,axis.current.direct,model.scale);return `<circle class="radar-dot" cx="${cx}" cy="${cy}" r="3"/>`}).join('')}</svg>`;
}
export function radarHtml(current,comparison=null,{title='Muscles travaillés',comparisonLabel='Séance précédente',maxAxes=8}={}){
 const model=radarModel(current,comparison,{maxAxes});
 return `<section class="card muscle-radar-panel"><div class="row between"><h2>${esc(title)}</h2><span class="subtitle">${fmt(model.first.sets)} séries validées</span></div>${chart(model)}${model.mode!=='empty'?`<div class="radar-legend"><span>● Directes</span><span>● Secondaires</span>${model.compared?`<span>┄ ${esc(comparisonLabel)}</span>`:''}</div><p class="subtitle">Volume attribué aux muscles, pas une mesure d’activation. Échelle commune : 0–${model.scale} séries.${model.omitted?` ${model.omitted} muscles supplémentaires dans le détail.`:''}</p><details class="radar-detail"><summary>Détail de tous les muscles</summary><div class="radar-detail-head"><span>Muscle</span><span>Directes</span><span>Secondaires</span></div>${model.detail.map(row=>`<div class="radar-detail-row"><strong>${esc(row.label)}</strong><span>${row.current.direct}</span><span>${row.current.secondary}</span>${model.compared?`<small>${esc(comparisonLabel)} : ${row.comparison?.direct||0} directes · ${row.comparison?.secondary||0} secondaires</small>`:''}</div>`).join('')}</details>`:''}${model.first.unclassified?`<p class="unclassified">${model.first.unclassified} séries sans attribution musculaire.</p>`:''}</section>`;
}
export const renderMuscleRadar=(current,{comparisonSessions=null,...options}={})=>radarHtml(current,comparisonSessions,options);
