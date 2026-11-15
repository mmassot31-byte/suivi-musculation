import catalogue from './session-weight-catalogue.js';
import {escapeHtml as esc} from './design-ui.js';

const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
export function validWeightReference(r){return !!r&&r.actif===true&&typeof r.id==='string'&&!!r.id&&typeof r.categorie==='string'&&!!r.categorie&&positive(r.masse_kg)&&typeof r.nom_singulier==='string'&&!!r.nom_singulier&&typeof r.nom_pluriel==='string'&&!!r.nom_pluriel;}
export const weightReferences=Object.freeze(catalogue.references.filter(validWeightReference).map(r=>Object.freeze(r)));

// Consume the saved recap's already calculated amount. Uncertain conventions,
// unconverted units, partial totals and active sessions cannot yield a comparison.
export function sessionWeightKg(model){
 if(!model?.session?.endedAt||!Number.isFinite(Date.parse(model.session.endedAt))||!model.tonnage?.complete||model.partial||model.amountUnit!=='kg'||!positive(model.amount))return null;
 return model.amount;
}

export function eligibleWeightReferences(totalKg,references=weightReferences){
 if(!positive(totalKg))return [];
 const valid=references.filter(validWeightReference),quantity=r=>totalKg/r.masse_kg;
 const preferred=valid.filter(r=>quantity(r)>=1&&quantity(r)<=100);
 if(preferred.length)return preferred;
 // Bounded fallback: never thousands of objects or an imperceptible fraction.
 const fallback=valid.filter(r=>quantity(r)>=0.1&&quantity(r)<=200);
 if(!fallback.length)return [];
 const distance=r=>Math.abs(Math.log10(quantity(r)));
 const nearest=Math.min(...fallback.map(distance));
 return fallback.filter(r=>distance(r)<=nearest+0.3);
}

export function selectWeightReference(totalKg,{references=weightReferences,history=[],previousId=null,random=Math.random}={}){
 let pool=eligibleWeightReferences(totalKg,references).filter(r=>r.id!==previousId);
 if(!pool.length)return null;
 const recent=history.slice(-5),used=new Set(recent.flatMap(h=>h.referenceIds||[h.referenceId])),fresh=pool.filter(r=>!used.has(r.id));
 if(fresh.length)pool=fresh;
 // Choose the category first so categories with many references do not dominate.
 const categories=[...new Set(pool.map(r=>r.categorie))],lastCategory=recent.at(-1)?.category;
 const diverse=categories.filter(c=>c!==lastCategory),choices=diverse.length?diverse:categories;
 const index=length=>Math.min(length-1,Math.max(0,Math.floor(random()*length)||0));
 const category=choices[index(choices.length)],members=pool.filter(r=>r.categorie===category);
 const weights=members.map(r=>{const q=totalKg/r.masse_kg;return q>=2&&q<=30?3:1;}),sum=weights.reduce((n,w)=>n+w,0);
 let draw=Math.min(1-Number.EPSILON,Math.max(0,random()||0))*sum;
 return members.find((_,i)=>(draw-=weights[i])<0)||members.at(-1);
}

const number=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2});
const kgNumber=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:20});
export function formatWeightComparison(totalKg,reference){
 if(!positive(totalKg)||!validWeightReference(reference))return null;
 const quantity=totalKg/reference.masse_kg;if(!positive(quantity))return null;
 const digits=quantity<10?1:0,rounded=Number(quantity.toFixed(digits));
 if(!positive(rounded))return null;
 const name=rounded<2?reference.nom_singulier:reference.nom_pluriel;
 // All catalogue masses are indicative, including exact integer divisions.
 return {quantity,rounded,text:`Environ ${number.format(rounded)} ${name}`,approximate:true};
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
  const reference=selectWeightReference(kg,{references,history:ctx.history,previousId:current?.id,random});
  if(!reference)return current?result(current,kg):null;
  ctx.cache.set(id,{kg,reference});
  const entry={sessionId:id,kg,referenceId:reference.id,referenceIds:[...new Set([...(stored?.referenceIds||[]),reference.id])],category:reference.categorie};
  ctx.history=[...ctx.history.filter(h=>h.sessionId!==id),entry].slice(-5);
  try{getStorage()?.setItem(ctx.key,JSON.stringify(ctx.history));}catch{} // Private mode/quota: keep the in-memory experience.
  return result(reference,kg);
 }
 function result(reference,kg){return {reference,kg,...formatWeightComparison(kg,reference),canChange:eligibleWeightReferences(kg,references).some(r=>r.id!==reference.id)};}
 return {get:model=>comparison(model),next:model=>comparison(model,true)};
}

export function sessionWeightCardHtml(comparison){
 if(!comparison)return '';
 return `<section class="session-weight-card" aria-labelledby="session-weight-title" data-weight-reference="${esc(comparison.reference.id)}"><h2 id="session-weight-title">LE POIDS DE TA SÉANCE</h2><p class="session-weight-total"><strong>${esc(kgNumber.format(comparison.kg))} <span>kg</span></strong><span>soulevés</span></p><p class="session-weight-comparison" aria-live="polite" aria-atomic="true">${esc(comparison.text)}<span aria-hidden="true"> !</span></p><p class="session-weight-note">Équivalence approximative</p><button type="button" class="session-weight-next" data-action="session-weight-next"${comparison.canChange?'':' disabled'}>Autre comparaison <span aria-hidden="true">↻</span></button></section>`;
}

// Update only the comparison. Keep the button, focus, scroll and total in place.
export function updateSessionWeightCard(card,comparison){
 if(!card||!comparison)return;
 const line=card.querySelector('.session-weight-comparison');
 line.textContent=comparison.text+' !';card.dataset.weightReference=comparison.reference.id;
 card.querySelector('.session-weight-next').disabled=!comparison.canChange;
 if(!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
  line.getAnimations?.().forEach(animation=>animation.cancel());
  line.animate?.([{opacity:0.25,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:160,easing:'ease-out'});
 }
}
