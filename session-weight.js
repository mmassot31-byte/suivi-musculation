import catalogue from './session-weight-catalogue.js';
import {escapeHtml as esc} from './design-ui.js';
import {icon} from './icons.js';

const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
export function validWeightReference(r){return !!r&&r.actif===true&&typeof r.id==='string'&&!!r.id&&typeof r.categorie==='string'&&!!r.categorie&&positive(r.masse_kg)&&typeof r.nom_singulier==='string'&&!!r.nom_singulier&&typeof r.nom_pluriel==='string'&&!!r.nom_pluriel&&Number.isInteger(r.score_interet)&&r.score_interet>=1&&r.score_interet<=5&&typeof r.insolite==='boolean'&&positive(r.quantite_max)&&['un','une'].includes(r.article_indefini)&&typeof r.fractionnable==='boolean';}
export const weightReferences=Object.freeze(catalogue.references.filter(validWeightReference).map(r=>Object.freeze(r)));

// Consume the saved recap's already calculated amount. Uncertain conventions,
// unconverted units, partial totals and active sessions cannot yield a comparison.
export function sessionWeightKg(model){
 if(!model?.session?.endedAt||!Number.isFinite(Date.parse(model.session.endedAt))||!model.tonnage?.complete||model.partial||model.amountUnit!=='kg'||!positive(model.amount))return null;
 return model.amount;
}

const approximationTolerance=0.1+Number.EPSILON;
const nearOne=q=>Math.abs(1-q)/q<=approximationTolerance;
function comparisonQuantity(totalKg,reference){
 if(!positive(totalKg)||!validWeightReference(reference))return null;
 const q=totalKg/reference.masse_kg;
 // Counting objects below one is useful only when they reasonably mean one.
 // Actual volumes (water/materials) can also be expressed as tenths of a unit.
 return positive(q)&&q<=reference.quantite_max&&(q>=1||nearOne(q)||reference.fractionnable&&q>=0.1)?q:null;
}
export function eligibleWeightReferences(totalKg,references=weightReferences){return references.filter(r=>comparisonQuantity(totalKg,r)!==null);}

function recentReferenceIds(history){return history.flatMap(h=>Array.isArray(h.recentReferenceIds)?h.recentReferenceIds:h.referenceIds||[h.referenceId]).filter(id=>typeof id==='string');}
function weightedPick(items,weight,random){
 const weights=items.map(weight),sum=weights.reduce((n,w)=>n+w,0);
 let draw=Math.min(1-Number.EPSILON,Math.max(0,random()||0))*sum;
 return items.find((_,i)=>(draw-=weights[i])<0)||items.at(-1);
}

export function selectWeightReference(totalKg,{references=weightReferences,history=[],previousId=null,random=Math.random}={}){
 let pool=eligibleWeightReferences(totalKg,references);
 if(!pool.length)return null;
 const recent=history.slice(-5),timeline=recentReferenceIds(recent),lastId=previousId||recent.at(-1)?.referenceId;
 const alternatives=pool.filter(r=>r.id!==lastId);if(alternatives.length)pool=alternatives;
 const lastFive=timeline.slice(-5),fresh=pool.filter(r=>!lastFive.includes(r.id));
 if(fresh.length)pool=fresh;
 else{const oldest=Math.min(...pool.map(r=>lastFive.lastIndexOf(r.id)));pool=pool.filter(r=>lastFive.lastIndexOf(r.id)===oldest);}
 // Reserve an occasional lane for offbeat but eligible references, rather than
 // confusing an unusual subject with either a high or a low interest score.
 const offbeat=pool.filter(r=>r.insolite),familiar=pool.filter(r=>!r.insolite);
 if(offbeat.length&&familiar.length)pool=random()<0.15?offbeat:familiar;
 const recentCounts=new Map();for(const id of timeline.slice(-20))recentCounts.set(id,(recentCounts.get(id)||0)+1);
 const weight=r=>{
  const q=totalKg/r.masse_kg,fit=nearOne(q)?1.5:q<=30?1.25:q<=200?1:q<=1000?0.65:0.35;
  const sessionsUsed=recent.filter(h=>h.referenceIds?.includes(r.id)).length;
  return r.score_interet*fit/(1+0.5*(recentCounts.get(r.id)||0)+0.15*sessionsUsed);
 };
 // Category weights use a mean, not a sum: a large category cannot monopolise
 // the draws. Repeating the preceding category remains possible but discouraged.
 const categories=[...new Set(pool.map(r=>r.categorie))],lastCategory=recent.at(-1)?.category;
 const members=category=>pool.filter(r=>r.categorie===category);
 const category=weightedPick(categories,c=>members(c).reduce((n,r)=>n+weight(r),0)/members(c).length*(c===lastCategory?0.25:1),random);
 return weightedPick(members(category),weight,random);
}

const number=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2});
const kgNumber=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:20});
const tonnesNumber=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1});
export function formatSessionWeightTotal(kg){
 if(!positive(kg))return '';
 return kg>=1000?`${tonnesNumber.format(kg/1000)} t`:`${(kg<0.01?kgNumber:number).format(kg)} kg`;
}
export function formatWeightComparison(totalKg,reference){
 const quantity=comparisonQuantity(totalKg,reference);if(quantity===null)return null;
 // Prefer whole objects within 10% of the actual quotient. Small quantities
 // keep a decimal when an integer would distort the comparison.
 const integer=Math.round(quantity),rounded=integer>0&&Math.abs(integer-quantity)/quantity<=approximationTolerance?integer:Number(quantity.toFixed(1));
 if(!positive(rounded))return null;
 const name=rounded<2?reference.nom_singulier:reference.nom_pluriel;
 // All catalogue masses are indicative, including exact integer divisions.
 const quantityLabel=rounded===1?reference.article_indefini:number.format(rounded);
 return {quantity,rounded,quantityLabel,name,text:`Environ ${quantityLabel} ${name}`,approximate:true};
}

// Only presentation preferences live in localStorage, independently of workout
// documents, exports and Supabase. Account scope prevents cross-account history.
export function createSessionWeightComparisons({getScope=()=> 'local',getStorage=()=>globalThis.localStorage,random=Math.random,references=weightReferences}={}){
 const scopes=new Map();
 function context(){
  const scope=getScope(),key='elan-session-weight-v1:'+scope;
  if(!scopes.has(scope)){
   let history=[];try{const stored=JSON.parse(getStorage()?.getItem(key)||'[]');if(Array.isArray(stored))history=stored.filter(h=>h&&typeof h.sessionId==='string'&&Array.isArray(h.referenceIds)&&h.referenceIds.every(id=>typeof id==='string')).slice(-5);}catch{}
   scopes.set(scope,{key,history,cache:new Map()});
  }
  return scopes.get(scope);
 }
 function comparison(model,another=false){
  const kg=sessionWeightKg(model);if(kg===null)return null;
  const ctx=context(),id=model.session.id;if(typeof id!=='string'||!id)return null;
  const cached=ctx.cache.get(id),stored=ctx.history.find(h=>h.sessionId===id);
  const current=cached?.kg===kg?cached.reference:stored?.kg===kg?eligibleWeightReferences(kg,references).find(r=>r.id===stored.referenceId):null;
  if(current&&!another)return result(current,kg);
  const reference=selectWeightReference(kg,{references,history:ctx.history,previousId:current?.id||ctx.history.at(-1)?.referenceId,random});
  if(!reference)return current?result(current,kg):null;
  ctx.cache.set(id,{kg,reference});
  const entry={sessionId:id,kg,referenceId:reference.id,referenceIds:[...new Set([...(stored?.referenceIds||[]),reference.id])],recentReferenceIds:[...recentReferenceIds(stored?[stored]:[]),reference.id].slice(-20),category:reference.categorie};
  ctx.history=[...ctx.history.filter(h=>h.sessionId!==id),entry].slice(-5);
  try{getStorage()?.setItem(ctx.key,JSON.stringify(ctx.history));}catch{} // Private mode/quota: keep the in-memory experience.
  return result(reference,kg);
 }
 function result(reference,kg){return {reference,kg,...formatWeightComparison(kg,reference),canChange:eligibleWeightReferences(kg,references).some(r=>r.id!==reference.id)};}
 return {get:model=>comparison(model),next:model=>comparison(model,true)};
}

const comparisonHtml=comparison=>`<span class="sr-only">Environ </span><strong class="session-weight-quantity">${esc(comparison.quantityLabel)}</strong> <span class="session-weight-reference">${esc(comparison.name)}</span>`;

export function sessionWeightCardHtml(comparison){
 if(!comparison)return '';
 return `<section class="session-weight-card" aria-labelledby="session-weight-title" data-weight-reference="${esc(comparison.reference.id)}"><div class="session-weight-heading"><h2 id="session-weight-title">LE POIDS DE TA SÉANCE</h2><p class="session-weight-total" title="${esc(kgNumber.format(comparison.kg))} kg soulevés" aria-label="${esc(kgNumber.format(comparison.kg))} kilogrammes soulevés">${esc(formatSessionWeightTotal(comparison.kg))}</p></div><p class="session-weight-intro">C’est l’équivalent d’environ</p><p class="session-weight-comparison" aria-live="polite" aria-atomic="true">${comparisonHtml(comparison)}</p><div class="session-weight-footer"><p class="session-weight-note">Masse indicative</p><button type="button" class="session-weight-next" data-action="session-weight-next"${comparison.canChange?'':' disabled'}>Autre comparaison ${icon('reps','session-weight-refresh')}</button></div></section>`;
}

// Update only the comparison. Keep the button, focus, scroll and total in place.
export function updateSessionWeightCard(card,comparison){
 if(!card||!comparison)return;
 const line=card.querySelector('.session-weight-comparison');
 line.innerHTML=comparisonHtml(comparison);card.dataset.weightReference=comparison.reference.id;
 card.querySelector('.session-weight-next').disabled=!comparison.canChange;
 const refresh=card.querySelector('.session-weight-refresh');
 for(const element of [line,refresh])element.getAnimations?.().forEach(animation=>animation.cancel());
 if(!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
  line.animate?.([{opacity:0.3},{opacity:1}],{duration:150,easing:'ease-out'});
  refresh.animate?.([{transform:'rotate(0)'},{transform:'rotate(180deg)'}],{duration:180,easing:'ease-out'});
 }
}
