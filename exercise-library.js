import {exerciseProfile,genericAlternatives} from './catalogue.js';
import {configureExerciseReferences} from './exercise-reference.js';
import {legacyPersonalId,legacyExerciseKey} from './exercise-key.js';
// Fixed shared variants, owner-scoped personal copies and additive legacy references.
// This module never mutates a saved performance or chooses a convention for an old set.
import {commonExercises} from './exercise-catalogue.js';
const copy=x=>structuredClone(x);
export const libraryNormalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const builtin=new Map(commonExercises.map(e=>[e.id,e]));
export const chargeModes=[['bilateral','Bilatéral'],['unilateral','Unilatéral']];
export const measurementLabels={external_load:'Charge',bodyweight:'Poids du corps',added_load:'Charge additionnelle',assistance:'Assistance',duration:'Durée'};
export function chargeIdentity(mode='bilateral',measurement='external_load'){return {version:1,unit:'kg',convention:measurement==='assistance'?'Assistance':measurement==='added_load'?'Charge additionnelle':mode==='unilateral'?'Par côté':'Total',lateralMode:mode==='unilateral'?'both-sides':'total',source:'preset'};}
export function libraryExercise(definition){const d=copy(definition),historical=d.libraryScope==='personal'&&!d.originExerciseId?null:(genericAlternatives.find(a=>a.key===d.alternativeKey)||(d.legacyIds||[]).map(id=>exerciseProfile({id})).find(p=>!p.family.startsWith('personal:'))),activity=['cardio','mobility'].includes(d.tracking);return {...d,libraryId:d.id,libraryScope:d.libraryScope||'common',customName:d.libraryScope==='personal',originExerciseId:d.originExerciseId||null,chargeProtocol:'elan-2',note:'',convention:chargeIdentity(d.loadMode,d.measurement).convention,loadIdentity:chargeIdentity(d.loadMode,d.measurement),step:2.5,rest:90,auto:false,refs:[],refsAreTargets:true,plannedSets:activity?0:3,sets:[],...(activity?{counter:'duration',activityEntries:[]}:{}),catalogueFamilyId:d.familyId,familyId:historical?.family||d.familyId,movement:d.movement||historical?.movement||'unknown',demand:d.demand||historical?.demand||'moderate'};}
export function libraryState(state){state.exerciseLibrary??={common:[],personal:[],pending:[],aliases:[]};for(const key of ['common','personal','pending','aliases'])state.exerciseLibrary[key]??=[];configureExerciseReferences(state);return state.exerciseLibrary;}
export function sharedDefinitions(state){return [...new Map([...commonExercises,...(state.exerciseLibrary?.common||[])].map(d=>[d.id,d])).values()];}
export const matchesLegacyDefinition=(exercise,definition)=>!!definition.legacySource&&legacyExerciseKey(exercise)===legacyExerciseKey(definition.legacySource);
export function sharedMatch(exercise,state={}){
 if(exercise.libraryScope==='personal')return null;const definitions=sharedDefinitions(state),explicit=definitions.find(d=>d.id===exercise.libraryId&&exercise.libraryScope!=='personal');if(explicit)return explicit;if(state.exerciseLibrary?.personal?.some(d=>matchesLegacyDefinition(exercise,d)))return null;
 const name=libraryNormalize(exercise.name),equipment=exercise.equipment;
 // An old id alone is insufficient: a rename may have changed its movement completely.
 const matches=definitions.filter(d=>(!equipment||equipment==='unknown'||d.equipment===equipment||exercise.tracking==='cardio'&&d.tracking==='cardio')&&[d.name,...(d.legacyNames||[])].some(n=>libraryNormalize(n)===name)&&(!exercise.tracking||exercise.tracking===d.tracking));
 const byId=matches.filter(d=>(d.legacyIds||[]).includes(exercise.id)||d.id===exercise.id);return byId.length===1?byId[0]:matches.length===1&&(equipment&&equipment!=='unknown'||exercise.tracking==='cardio')?matches[0]:null;
}
export function legacyDefinitionKey(exercise,ownerId=null){return legacyPersonalId(exercise,ownerId)}
export function legacyDefinition(exercise,ownerId=null){const id=legacyDefinitionKey(exercise,ownerId),old=exercise.loadIdentity,mode=exercise.loadMode||(['both-sides','simultaneous-pair','one-side'].includes(old?.lateralMode)?'unilateral':'bilateral');return {id,name:exercise.name,familyId:exercise.familyId||'personal',familyLabel:'Mes exercices',equipment:exercise.equipment||'unknown',muscles:copy(exercise.muscles||{primary:[],secondary:[]}),loadMode:mode,measurement:exercise.measurement|| (exercise.tracking?'duration':exercise.equipment==='bodyweight'?'bodyweight':'external_load'),libraryScope:'personal',originExerciseId:null,legacyIds:[exercise.id],legacySource:{id:exercise.id,name:exercise.name,equipment:exercise.equipment||null,muscles:copy(exercise.muscles||null)},aliases:[exercise.name],...(exercise.id==='Shoulder press'&&/^elevations? lateral/.test(libraryNormalize(exercise.name))?{equipment:'unknown',muscles:{primary:['side_delts'],secondary:[]},familyLabel:'Élévations latérales'}:{}),...(exercise.tracking?{tracking:exercise.tracking}:{}),...(exercise.isometric?{isometric:true}:{})};}
export function libraryDefinitions(state){const shared=sharedDefinitions(state),own=new Map((state.exerciseLibrary?.personal||[]).filter(d=>!d.archived).map(d=>[d.id,d]));
 function visit(value){if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(visit);return}if(Array.isArray(value.exercises))for(const e of value.exercises){if(e.libraryScope==='personal'&&e.libraryId){if(!own.has(e.libraryId)&&!state.exerciseLibrary?.personal?.some(d=>d.id===e.libraryId&&d.archived))own.set(e.libraryId,{...legacyDefinition(e),id:e.libraryId,originExerciseId:e.originExerciseId||null});}else if(!sharedMatch(e,state)){const d=legacyDefinition(e,state.exerciseLibrary?.ownerId),linked=(state.exerciseLibrary?.personal||[]).filter(p=>matchesLegacyDefinition(e,p));if(!linked.length&&!own.has(d.id))own.set(d.id,d);}if(e.alternative)visit({exercises:[e.alternative]});}for(const [key,child]of Object.entries(value))if(key!=='exercises'&&key!=='exerciseLibrary')visit(child);}
 visit(state);return [...shared,...own.values()];
}
export function libraryChoices(state){return libraryDefinitions(state).map(libraryExercise);}
export function exerciseSearchAliases(exercise,state){const def=sharedDefinitions(state).find(d=>d.id===(exercise.libraryId||exercise.id))||(state.exerciseLibrary?.personal||[]).find(d=>d.id===(exercise.libraryId||exercise.id));return [exercise.name,exercise.familyLabel,...(exercise.aliases||[]),...(def?.aliases||[])].filter(Boolean).join(' ');}
export function matchingDefinitions(state,definition){const query=libraryNormalize(definition.name),tokens=query.split(' ').filter(t=>t.length>2);return libraryDefinitions(state).filter(d=>d.equipment===definition.equipment&&(!definition.tracking||d.tracking===definition.tracking)).map(d=>({definition:d,exact:libraryNormalize(d.name)===query,score:tokens.filter(t=>libraryNormalize([d.name,...d.aliases||[]].join(' ')).includes(t)).length})).filter(x=>x.exact||x.score>=Math.max(1,tokens.length-1)).sort((a,b)=>Number(b.exact)-Number(a.exact)||b.score-a.score).slice(0,5);}
export function createPersonalDefinition(state,source,changes={},ownerId=null,id='personal:'+crypto.randomUUID()){
 const store=libraryState(state),existing=source.libraryScope==='personal'?store.personal.find(d=>d.id===(source.libraryId||source.id)):null;
 const definition={...(existing||source),...copy(changes),id:existing?.id||id,libraryScope:'personal',ownerId,originExerciseId:existing?.originExerciseId||(source.libraryScope==='common'?(source.libraryId||source.id):source.originExerciseId||null),updatedAt:new Date().toISOString()};
 delete definition.sets;delete definition.refs;delete definition.activityEntries;delete definition.cardioTimer;delete definition.instanceId;store.personal=store.personal.filter(d=>d.id!==definition.id);store.personal.push(definition);queueDefinition(store,definition);return definition;
}
export function queueDefinition(store,definition){store.pending=store.pending.filter(item=>item.definition.id!==definition.id);store.pending.push({requestId:crypto.randomUUID(),definition:copy(definition)});}
export function createLibraryDefinition(state,definition,ownerId=null,scope='common',id=null){
 scope=ownerId?scope:'personal';const exact=matchingDefinitions(state,definition).find(m=>m.exact&&m.definition.measurement===definition.measurement&&(scope==='personal'||m.definition.libraryScope==='common'));if(exact)return scope==='personal'||exact.definition.loadMode!==definition.loadMode?createPersonalDefinition(state,exact.definition,definition,ownerId):exact.definition;id??=(scope==='common'?'community:':'personal:')+crypto.randomUUID();
 const d={...copy(definition),id,libraryScope:ownerId?scope:'personal',ownerId,aliases:definition.aliases||[],originExerciseId:null};const store=libraryState(state);store[d.libraryScope==='common'?'common':'personal'].push(d);queueDefinition(store,d);return d;
}
export function validLibraryState(value){if(value===undefined)return true;return value&&['common','personal','pending','aliases'].every(key=>Array.isArray(value[key])&&value[key].length<=2000)&&[...value.common,...value.personal,...value.pending.map(p=>p?.definition)].every(d=>d&&typeof d.id==='string'&&d.id.length>0&&d.id.length<=5000&&typeof d.name==='string'&&d.name.trim()&&d.name.length<=200&&['bilateral','unilateral'].includes(d.loadMode)&&Object.keys(measurementLabels).includes(d.measurement)&&d.muscles&&Array.isArray(d.muscles.primary)&&Array.isArray(d.muscles.secondary));}
// Reuse the account's existing persistent document and save queue, with idempotent RPC requests.
export function createLibrarySync(accounts,{state,save,onUpdated=()=>{}}){let flight=null,owner=null,generation=0;
 async function sync(){const uid=accounts.user?.id;if(owner!==uid){owner=uid;generation++;flight=null;if(uid)libraryState(state()).ownerId=uid}if(!uid||!accounts.service||!navigator.onLine)return;if(flight)return flight;const token=generation;
 flight=(async()=>{try{
  while(libraryState(state()).pending.length){
   if(token!==generation||uid!==accounts.user?.id)return;
   const item=copy(libraryState(state()).pending[0]),name=item.definition.libraryScope==='common'?'exercise_library_create':'exercise_library_personal_save';
   const data=await accounts.service.communityRpc(name,{p_id:item.definition.id,p_definition:item.definition},uid);
   if(!data||typeof data.id!=='string'||!['common','personal'].includes(data.libraryScope))throw Error('Library service unavailable');
   if(token!==generation||uid!==accounts.user?.id)return;
   const current=libraryState(state()),key=data.libraryScope==='common'?'common':'personal',newer=current.pending.some(p=>p.definition.id===item.definition.id&&p.requestId!==item.requestId);
   if(!newer){current[key]=current[key].filter(d=>d.id!==data.id&&d.id!==item.definition.id);current[key].push(data)}
   if(data.id!==item.definition.id&&!current.aliases.some(a=>a.from===item.definition.id))current.aliases.push({from:item.definition.id,to:data.id});
   current.pending=current.pending.filter(p=>p.requestId!==item.requestId);configureExerciseReferences(state());await save();
  }
  const data=await accounts.service.communityRpc('exercise_library_list',{},uid);if(token!==generation||uid!==accounts.user?.id)return;
  const current=libraryState(state());if(data&&Array.isArray(data.common)&&Array.isArray(data.personal)){
   let changed=false;for(const key of ['common','personal']){const incoming=key==='common'?data[key].filter(d=>!builtin.has(d.id)):data[key],next=[...new Map([...incoming,...current[key].filter(d=>current.pending.some(p=>p.definition.id===d.id))].map(d=>[d.id,d])).values()];if(JSON.stringify(current[key])!==JSON.stringify(next)){current[key]=next;changed=true}}
   if(changed){configureExerciseReferences(state());await save();onUpdated();}
  }
 }catch(error){/* Retain the existing local document/outbox and retry after reconnection. */}finally{if(token===generation)flight=null}})();return flight;
 }
 return {sync,start(){window.addEventListener('online',()=>void sync());window.addEventListener('focus',()=>void sync());accounts.onStatus?.(()=>{if(owner!==accounts.user?.id)void sync()});void sync();}};
}
