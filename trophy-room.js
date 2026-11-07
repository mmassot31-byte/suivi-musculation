import {badgeCatalogue as catalogue} from './social-catalogue.js';
export const trophyGroups=[['sessions','Séances',['sessions_total','sessions_week']],['sets','Séries',['sets_total','sets_week']],['tonnage','Tonnage',['tonnage_total','tonnage_week']],['regularity','Régularité',['streak_weeks','active_weeks']],['records','Records',['records_total','records_exercises']],['challenges','Défis',['personal_challenges','shared_challenges']]];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number(x||0).toLocaleString('fr-FR',{maximumFractionDigits:1});
const button=(content,action,cls='')=>`<button type="button" class="${cls}" data-action="community-${esc(action)}">${content}</button>`;
const image=(b,locked=false)=>`<img class="social-badge${locked?' trophy-pending':''}" src="${esc(b.asset)}" alt="" width="96" height="96">`;
const family=b=>catalogue.families.find(f=>f.id===b.family);
const tier=b=>`Palier ${b.tier} / ${family(b).badgeIds.length}`;
export function trophyModel(profile){
 const earned=new Map((profile?.badges||[]).map(a=>[a.badge_id,a]));
 const awards=catalogue.badges.filter(b=>earned.has(b.id));
 // Thresholds use different units; compare tier, then earned date, never raw kilograms/sessions.
 const highest=[...awards].sort((a,b)=>b.tier-a.tier||String(earned.get(b.id).earned_at||'').localeCompare(String(earned.get(a.id).earned_at||''))||catalogue.badges.indexOf(a)-catalogue.badges.indexOf(b));
 const seen=new Set(),showcase=highest.filter(b=>{if(seen.has(b.family))return false;seen.add(b.family);return true}).slice(0,3);
 const next=catalogue.families.map(f=>catalogue.badges.filter(b=>b.family===f.id&&!earned.has(b.id)).sort((a,b)=>a.threshold-b.threshold)[0]).filter(Boolean);
 return {earned,awards,showcase,next};
}
export function trophyProgress(profile,b){
 const value=Math.max(0,Number((b.window==='calendar_week'?profile.week:profile.totals)?.[b.metric])||0);
 return {value,shown:b.metric==='tonnage_kg'?value/1000:value,percent:Math.min(100,Math.floor(value/b.threshold*100))};
}
export function trophyShowcase(profile,{own=true}={}){
 const {showcase}=trophyModel(profile);
 return `<section class="trophy-profile"><div class="row between"><h2>Plus beaux trophées</h2>${button('Tout voir ('+trophyModel(profile).awards.length+')','collection','text-link')}</div>${showcase.length?`<div class="trophy-showcase" data-count="${showcase.length}" style="--trophy-count:${showcase.length}">${showcase.map(b=>button(`${image(b)}<strong>${esc(b.label)}</strong><small>${tier(b)}</small>`,'badge:'+b.id,'trophy-showpiece')).join('')}</div>`:`<p class="subtitle trophy-first">${own?'Chaque séance construit ta collection. Ton premier trophée t’attend.':'Les premières récompenses apparaîtront ici.'}</p>`}</section>`;
}
function progressHtml(profile,b){const p=trophyProgress(profile,b);return `<progress max="${b.threshold}" value="${Math.min(p.value,b.threshold)}" aria-label="${esc(b.label)} : ${num(p.percent)} %"></progress><small>${num(p.shown)} / ${num(b.displayThreshold)}${b.window==='calendar_week'?' cette semaine':''}</small>`;}
function tile(profile,b,earned){return button(`${image(b,!earned)}<span class="trophy-tier">${tier(b)}</span><strong>${esc(b.label)}</strong>${earned?'':progressHtml(profile,b)}`,'badge:'+b.id,'trophy-tile'+(earned?' trophy-earned':' trophy-goal'));}
export function trophyCollection(profile,{tab='earned',category='',detail=null}={}){
 const model=trophyModel(profile);
 if(detail){
  const b=catalogue.badges.find(b=>b.id===detail);if(!b)return '<p role="status">Ce badge n’est pas disponible.</p>';
  const highest=model.awards.filter(x=>x.family===b.family).sort((a,b)=>b.tier-a.tier)[0],award=model.earned.get(b.id),date=award&&new Date(award.earned_at),dateText=date&&Number.isFinite(date.getTime())?date.toLocaleDateString('fr-FR'):null;
  return `<article class="card badge-detail trophy-detail"><div class="row between">${button('Retour aux badges','badge-close','small')}${button('<span aria-hidden="true">×</span><span class="sr-only">Fermer la fiche</span>','badge-close','small trophy-close')}</div>${image(b,!award)}<p class="trophy-tier">${esc(family(b).title)} · ${tier(b)}</p><h2>${esc(b.label)}</h2><p>${esc(b.description)}</p><div class="trophy-detail-value"><small>${b.window==='calendar_week'?'Cette semaine':'Valeur cumulée'}</small><strong>${num(trophyProgress(profile,b).shown)} / ${num(b.displayThreshold)}</strong></div>${highest?`<p class="trophy-best-tier">Meilleur palier obtenu · ${esc(highest.label)}</p>`:''}${award?`<p class="trophy-won">${dateText?'Obtenu le '+esc(dateText):'Trophée obtenu'}</p>${b.repeatable?`<p class="subtitle">Remporté ${num(award.occurrences||1)} fois</p>`:''}`:`<p class="subtitle">En cours d’acquisition</p>${progressHtml(profile,b)}${trophyProgress(profile,b).value>=b.threshold?'<p class="subtitle">Attribution à confirmer après synchronisation.</p>':''}`}<details class="trophy-family-levels"><summary>Tous les paliers de cette famille</summary><div class="trophy-grid">${catalogue.badges.filter(x=>x.family===b.family).sort((a,b)=>a.tier-b.tier).map(x=>tile(profile,x,model.earned.has(x.id))).join('')}</div></details></article>`;
 }
 const pending=tab==='progress',ongoing=model.next.filter(b=>trophyProgress(profile,b).value>0),list=pending?ongoing:model.awards,locked=catalogue.badges.filter(b=>!model.earned.has(b.id)&&!ongoing.includes(b)&&(!category||trophyGroups.find(g=>g[0]===category)?.[2].includes(b.family)));
 const groups=trophyGroups.filter(g=>!category||g[0]===category);
 return `<div class="trophy-overview"><strong>${model.awards.length}<span> / ${catalogue.badges.length}</span></strong><p>trophée${model.awards.length===1?'':'s'} obtenu${model.awards.length===1?'':'s'}</p><div class="trophy-collection-line" aria-hidden="true"><span style="width:${model.awards.length/catalogue.badges.length*100}%"></span></div></div>
 <div class="trophy-tabs" role="group" aria-label="Récompenses">${button(`Obtenus · ${model.awards.length}`,'trophy-tab:earned',!pending?'selected':'').replace('<button ',`<button aria-pressed="${!pending}" `)}${button('En cours · '+ongoing.length,'trophy-tab:progress',pending?'selected':'').replace('<button ',`<button aria-pressed="${pending}" `)}</div>
 <div class="trophy-categories" role="group" aria-label="Catégories de badges">${[['','Tout'],...trophyGroups.map(g=>[g[0],g[1]])].map(([id,label])=>button(esc(label),'group:'+id,'small'+(id===category?' selected':'')).replace('<button ',`<button aria-pressed="${id===category}" `)).join('')}</div>
 <div class="trophy-wall" data-trophy-tab="${pending?'progress':'earned'}">${groups.map(g=>{const badges=list.filter(b=>g[2].includes(b.family)).sort((a,b)=>pending?g[2].indexOf(a.family)-g[2].indexOf(b.family):b.tier-a.tier||g[2].indexOf(a.family)-g[2].indexOf(b.family));if(!badges.length)return '';return `<section class="trophy-category"><h2>${esc(g[1])}<small>${badges.length}</small></h2><div class="trophy-grid">${badges.map(b=>tile(profile,b,!pending)).join('')}</div></section>`;}).join('')||`<div class="trophy-empty"><h2>${pending?(model.next.length?'Les prochains trophées t’attendent.':'Tous les paliers sont remportés.'):model.awards.length?'Aucun trophée dans cette catégorie.':'Le tableau de chasse commence ici.'}</h2>${!pending&&!model.awards.length?`<p>Retrouve tes prochains objectifs dans l’espace En cours.</p>${button('Voir les prochains objectifs','trophy-tab:progress','primary')}`:''}</div>`}${pending&&locked.length?`<details class="trophy-locked"><summary>À découvrir et paliers suivants · ${locked.length}</summary><div class="trophy-grid">${locked.map(b=>tile(profile,b,false)).join('')}</div></details>`:''}</div>`;
}
