import {anatomicalProfile} from './muscles.js';
import {overviewMuscleGroup} from './performance-overview.js';
import {exercisePrimaryIcon} from './pictograms.js';
import {libraryExercise,exerciseSearchAliases} from './exercise-library.js';
import {normalizeSearch} from './exercise-labels.js';
import {equipmentTypes} from './catalogue.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,cls='')=>`<button type="button" class="${cls}" data-action="${esc(action)}">${label}</button>`;
export const personalLibraryFilters=[['','Tous'],['chest','Pectoraux'],['back','Dos'],['legs','Jambes'],['shoulders','Épaules'],['arms','Bras']];
export function personalLibraryRows(definitions,state,{query='',muscle='',replacement=false,recordedIds=new Set()}={}){
 const search=normalizeSearch(query),list=definitions.filter(d=>!replacement||d.libraryScope==='common').filter(d=>{
  const p=anatomicalProfile(d),groups=[...p.primary,...p.secondary].map(overviewMuscleGroup);
  return (!search||normalizeSearch(exerciseSearchAliases(d,state)).includes(search))&&(!muscle||groups.includes(muscle));
 });
 const priority=d=>d.libraryScope==='personal'?0:recordedIds.has(d.id)?1:(state.exerciseFavorites||[]).includes(d.id)?2:3;list.sort((a,b)=>priority(a)-priority(b)||a.name.localeCompare(b.name,'fr'));
 return {count:list.length,html:list.map(d=>{
  const id=encodeURIComponent(d.id),personal=d.libraryScope==='personal',convention=d.tracking?'Durée':d.measurement==='bodyweight'?'Poids du corps':d.legacySource?'À vérifier':d.loadMode==='unilateral'?'Par côté · unilatéral':'Charge totale · bilatéral';
  return `<article class="personal-exercise-row"><button type="button" class="personal-exercise-open" data-action="${replacement?'my-library-replace':'my-library-open'}:${id}"><span class="personal-exercise-icon">${exercisePrimaryIcon(libraryExercise(d))}</span><span class="personal-exercise-copy"><strong>${esc(d.name)}</strong><small>${esc(({machine:'Machine',cable:'Poulie'})[d.equipment]||equipmentTypes.find(x=>x[0]===d.equipment)?.[1]||'Matériel non précisé')}</small><span class="personal-exercise-tags"><small class="${personal?'is-personal':''}">${personal?'Personnel':'Public'}</small><small>${esc(convention)}</small></span></span></button>${replacement?'<span aria-hidden="true">›</span>':`<details class="personal-exercise-menu"><summary aria-label="Actions pour ${esc(d.name)}">…</summary><div>${button('Modifier','my-library-edit:'+id)}${recordedIds.has(d.id)&&!d.tracking&&!['bodyweight','added_load'].includes(d.measurement)?button('Corriger la convention','my-library-convention:'+id):''}${personal?button('Remplacer','my-library-start:'+id)+button('Retirer','my-library-remove:'+id,'danger'):''}</div></details>`}</article>`;
 }).join('')||'<p class="personal-library-empty">Aucun exercice correspondant.</p>'};
}
