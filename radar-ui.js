import {radarModel} from './radar.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('fr-FR');
const textual=model=>`Volume musculaire : ${model.axes.map(row=>`${row.label} : ${fmt(row.current.total)}`).join(' ; ')}. Maximum : ${fmt(model.scale)} séries. Détail anatomique disponible sous le graphique.`;
// Conservative glyph widths at 12px keep full names legible, including unbroken words.
const textWidth=text=>Array.from(text).reduce((sum,c)=>sum+(/[MWŒ@]/.test(c)?11:/[ilIjt .,'’/]/.test(c)?3.5:/[A-ZÀ-Ý]/.test(c)?8.8:6.5),0);
function labelLines(label,width=82){
 const lines=[];let line='';
 for(const word of String(label).replace(/-/g,'- ').split(/\s+/u)){
  if(line&&textWidth(line+' '+word)>width){lines.push(line);line='';}
  for(const char of word){
   if(textWidth(line+char)>width&&line){lines.push(line);line='';}
   line+=char;
  }
  line+=' ';
 }
 if(line.trim())lines.push(line.trim());
 return lines.map(s=>s.trim());
}
// Equal angular steps are independent of label placement. Side lanes preserve
// vertical order; actual multiline heights determine spacing and the SVG bounds.
export function radarLayout(axes){
 const radius=86,center={x:180,y:0},lineHeight=15,gap=10,padding=12;
 const nodes=axes.map((axis,i)=>{
  const angle=-Math.PI/2+i*2*Math.PI/axes.length,x=Math.cos(angle),y=Math.sin(angle);
  const side=Math.abs(x)<0.01?'middle':x>0?'start':'end';
  const lines=labelLines(axis.label,side==='middle'?112:82);
  return {axis,i,x,y,side,lines,labelHeight:lines.length*lineHeight,labelX:side==='middle'?180:side==='start'?272:88};
 });
 for(const side of ['start','end']){
  const lane=nodes.filter(n=>n.side===side).sort((a,b)=>a.y-b.y);
  let bottom=-Infinity;
  for(const n of lane){n.labelY=Math.max(n.y*(radius+12)-n.labelHeight/2,bottom+gap);bottom=n.labelY+n.labelHeight;}
  if(lane.length){const shift=(lane[0].labelY+bottom)/2;for(const n of lane)n.labelY-=shift;}
 }
 for(const n of nodes.filter(n=>n.side==='middle'))n.labelY=n.y<0?-radius-16-n.labelHeight:radius+16;
 const top=Math.min(-radius,...nodes.map(n=>n.labelY))-padding;
 const bottom=Math.max(radius,...nodes.map(n=>n.labelY+n.labelHeight))+padding;
 center.y=-top;
 for(const n of nodes)n.labelY-=top;
 return {nodes,height:bottom-top,center,radius,lineHeight};
}
export const compactRadarLayout=radarLayout;
let chartId=0;
function chart(model,compact=false,externalLabels=false){
 if(model.mode==='empty')return '<p class="empty">Aucune série de travail enregistrée à représenter.</p>';
 if(model.mode==='bars')return `<div class="muscle-radar-bars" role="img" aria-label="${esc(textual(model))}" data-scale="${model.scale}">${model.axes.map(row=>`<div class="radar-bar-row"><div class="radar-bar-heading"><strong>${esc(row.label)}</strong><span class="radar-axis-value">${fmt(row.current.total)}</span></div><div class="radar-bar-track"><i class="radar-direct-bar" style="width:${row.current.total/model.scale*100}%"></i></div></div>`).join('')}</div>`;
 const {nodes,height,center,radius,lineHeight}=radarLayout(model.axes),id=`muscle-surface-${++chartId}`;
 const point=(node,fraction=1)=>[center.x+node.x*radius*fraction,center.y+node.y*radius*fraction];
 const points=fraction=>nodes.map(node=>point(node,fraction).map(v=>v.toFixed(2)).join(',')).join(' ');
 const rings=[0.25,0.5,0.75,1].map(r=>`<polygon class="radar-grid" points="${points(r)}"/>`).join('');
 const spokes=nodes.map(node=>{const [x,y]=point(node);return `<line class="radar-spoke" x1="${center.x}" y1="${center.y}" x2="${x}" y2="${y}"/>`;}).join('');
 const guides=nodes.filter(node=>node.side!=='middle').map(node=>{const [x,y]=point(node);return `<path class="radar-label-guide" d="M ${x} ${y} L ${node.labelX+(node.side==='start'?-6:6)} ${node.labelY+node.labelHeight/2}"/>`;}).join('');
 const labels=nodes.map(({axis,side,labelX,labelY,lines})=>`<text class="${externalLabels?'radar-compact-label':'radar-axis-label'}" text-anchor="${side}" data-radar-axis="${esc(axis.id)}"><title>${esc(axis.label)}</title>${lines.map((line,j)=>`<tspan x="${labelX}" y="${labelY+12+j*lineHeight}">${esc(line)}</tspan>`).join('')}</text>`).join('');
 const surface=nodes.map(node=>point(node,node.axis.current.total/model.scale).map(v=>v.toFixed(2)).join(',')).join(' ');
 const dots=nodes.map(node=>{const [x,y]=point(node,node.axis.current.total/model.scale);return `<circle class="radar-vertex" cx="${x}" cy="${y}" r="2.6"/>`;}).join('');
 return `<svg class="muscle-radar" viewBox="0 0 360 ${height}" role="img" aria-label="${esc(textual(model))}" data-scale="${model.scale}" data-axes="${model.axes.map(row=>esc(row.id)).join(',')}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0.8" y2="1"><stop stop-color="#c4f65b" stop-opacity=".29"/><stop offset="1" stop-color="#668c32" stop-opacity=".06"/></linearGradient></defs>${rings}${spokes}${guides}<polygon class="radar-direct" points="${surface}" style="fill:url(#${id})"/>${dots}${labels}</svg>`;
}
export function radarHtml(current,comparison=null,{title='Muscles travaillés',comparisonLabel='Séance précédente',compact=false,volumeList=false,model:providedModel=null,unclassifiedControls=''}={}){
 const model=providedModel||radarModel(current,comparison);
 const full=`<section class="card muscle-radar-panel"><div class="radar-top"><h2>${esc(title)}</h2><span>${fmt(model.first.sets)} séries</span></div><details class="radar-help"><summary aria-label="Comprendre le radar"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></svg></summary><p>Une valeur par groupe : séries directes + 0,5 × séries secondaires. Chaque série compte une seule fois dans un même groupe ; le rôle direct prime sur le secondaire. Elle peut contribuer à plusieurs groupes.</p><p>Les deux régions de trapèzes et les trois faisceaux de l’épaule sont suivis séparément. Les muscles fléchisseurs du coude sont regroupés. Les fessiers et abducteurs suivent le regroupement du volume existant. Les axes dépendent uniquement des exercices réalisés.</p><p>Les échauffements sont exclus et une dégressive reste une seule série. Ce volume ne mesure pas l’activation musculaire. Un ou deux groupes sont représentés par des barres. Les valeurs d’origine et la séance comparée restent dans le détail.</p></details>${model.mode==='empty'&&model.first.sets?'<p class="empty">Renseigne les muscles pour afficher le graphique.</p>':chart(model,true)}${model.mode!=='empty'?`<p class="radar-scale">Maximum : ${fmt(model.scale)} séries</p>`:''}${model.detail.length?`<details class="radar-detail"><summary>Détail de tous les muscles</summary><p class="subtitle">Séries directes + 0,5 × séries secondaires, sans doublon dans un même groupe.</p><h3>Volume par groupe</h3>${model.groups.map(row=>`<div class="radar-group-detail"><strong>${esc(row.label)}</strong><span>${fmt(row.current.total)}</span><small>${fmt(row.current.direct)} directes · ${fmt(row.current.secondary)} secondaires${model.compared?` · ${esc(comparisonLabel)} : ${fmt(row.comparison?.total||0)}`:''}</small></div>`).join('')}<h3>Muscles détaillés</h3><div class="radar-detail-head"><span>Muscle</span><span>Directes</span><span>Secondaires</span></div>${model.detail.map(row=>`<div class="radar-detail-row"><strong>${esc(row.label)}</strong><span>${fmt(row.current.direct)}</span><span>${fmt(row.current.secondary)}</span>${model.compared?`<small>${esc(comparisonLabel)} : ${fmt(row.comparison?.direct||0)} directes · ${fmt(row.comparison?.secondary||0)} secondaires</small>`:''}</div>`).join('')}</details>`:''}${model.first.unclassified?`<p class="unclassified">${model.first.unclassified} séries sans attribution musculaire.</p>`:''}</section>`;
 if(!compact)return full;
 const detailStart=full.indexOf('<details class="radar-detail">'),detailEnd=full.indexOf('</details>',detailStart)+10;
 const detail=detailStart<0?'<details class="radar-detail session-muscles" data-muscle-session="'+esc(current.id)+'"><summary>Détails <span aria-hidden="true">›</span></summary></details>':full.slice(detailStart,detailEnd).replace('class="radar-detail"','class="radar-detail session-muscles" data-muscle-session="'+esc(current.id)+'"').replace('<summary>Détail de tous les muscles</summary>','<summary>Détails <span aria-hidden="true">›</span></summary>');
 const helpStart=full.indexOf('<details class="radar-help">'),helpEnd=full.indexOf('</details>',helpStart)+10,help=full.slice(helpStart,helpEnd);
 const most=[...model.axes].sort((a,b)=>b.current.total-a.current.total)[0];
 return `<section class="card muscle-radar-panel saved-muscles ${volumeList?'saved-muscle-volumes':''}"><div class="radar-top"><h2>${esc(title)}</h2>${volumeList?`<span>${fmt(model.first.sets)} séries</span>`:''}</div><div class="saved-muscle-layout ${volumeList?'saved-volume-'+model.mode:''}"><div class="saved-radar-graphic">${model.mode==='empty'&&model.first.sets?'<p class="empty">Renseigne les muscles pour afficher le graphique.</p>':chart(model,true,volumeList)}${model.mode!=='empty'?`<p class="radar-scale">Maximum : ${fmt(model.scale)} séries</p>`:''}</div>${volumeList&&model.mode==='radar'?`<div class="saved-muscle-volumes-list">${model.axes.map(row=>`<div><span>${esc(row.label)}</span><strong>${fmt(row.current.total)}</strong><i aria-hidden="true"><b style="width:${row.current.total/model.scale*100}%"></b></i></div>`).join('')}</div>`:''}<aside class="saved-muscle-facts ${volumeList?'sr-only':''}"><div><small>Muscle le plus sollicité</small><strong>${most?esc(most.label):'—'}</strong>${most?`<span>${fmt(most.current.total)} séries pondérées</span>`:''}</div><div><small>Total</small><strong>${fmt(model.first.sets)} séries</strong></div></aside></div>${detail.replace('</details>',(model.first.unclassified?`<p class="unclassified">${model.first.unclassified} séries sans attribution musculaire.</p>${unclassifiedControls}`:'')+help+'</details>')}</section>`;

}
export const renderMuscleRadar=(current,{comparisonSessions=null,...options}={})=>radarHtml(current,comparisonSessions,options);
