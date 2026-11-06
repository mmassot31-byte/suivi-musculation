import {validCardioSettings} from './cardio-timer.js';
import {validLoadIdentity,withSetIdentity} from './identity.js';
// Non-strength counters are stored separately: never fabricate repetitions or load.
export const counters={duration:{label:'Durée',unit:'min',max:1440},distance:{label:'Distance',unit:'km',max:2000},calories:{label:'Calories',unit:'kcal',max:50000}};
export const isActivity=e=>['cardio','mobility'].includes(e?.tracking);
export function validActivity(e){if(!validCardioSettings(e))return false;if(e.tracking===undefined)return e.activityEntries===undefined&&e.counter===undefined;if(!isActivity(e)||!counters[e.counter]||e.tracking==='mobility'&&e.counter!=='duration'||e.sets?.length||e.plannedSets!==0)return false;return e.activityEntries===undefined||Array.isArray(e.activityEntries)&&e.activityEntries.length<=1000&&new Set(e.activityEntries.map(x=>x.id)).size===e.activityEntries.length&&e.activityEntries.every(x=>x&&typeof x.id==='string'&&x.id.length>0&&x.id.length<200&&counters[x.counter]&&(e.tracking!=='mobility'||x.counter==='duration')&&Number.isFinite(x.value)&&x.value>0&&x.value<=counters[x.counter].max&&typeof x.recordedAt==='string'&&Number.isFinite(Date.parse(x.recordedAt)))}
export function activityEntry(counter,value,id=crypto.randomUUID()){value=Number(String(value).replace(',','.'));if(!counters[counter]||!Number.isFinite(value)||value<=0||value>counters[counter].max)throw Error('Indique une valeur positive valide.');return {id,counter,value,recordedAt:new Date().toISOString()}}
export function setLaterality(e,value){if(!['bilateral','unilateral'].includes(value))throw Error('Choix de côtés invalide.');for(const set of e.sets||[])if(!validLoadIdentity(set.loadIdentity))Object.assign(set,withSetIdentity(e,set));e.laterality=value;e.loadIdentity={version:1,unit:e.loadIdentity?.unit||'kg',convention:e.convention||'Valeur indiquée (à préciser)',lateralMode:value==='unilateral'?'one-side':/haltère|par côté/i.test(e.convention)?'simultaneous-pair':'total',source:'entry'};}

export const hasRecorded=e=>!!(e?.sets?.length||e?.activityEntries?.length);
export const counterCount=e=>`${(e.activityEntries||[]).length} relevé${(e.activityEntries||[]).length===1?'':'s'}`;

// Duration entries remain minutes in storage/API; mobility is presented in seconds.
export const durationPresets=[15,30,45,60,90,120,180,300];
export const usesSeconds=(exercise,counter='duration')=>exercise?.tracking==='mobility'&&counter==='duration';
export function activityDisplayValue(exercise,entry){return usesSeconds(exercise,entry.counter)?Number((entry.value*60).toFixed(6)):entry.value;}
export function activityDisplayUnit(exercise,counter){return usesSeconds(exercise,counter)?'s':counters[counter]?.unit||'';}
export function activityInputValue(exercise,counter,value){const number=Number(String(value).replace(',','.'));return usesSeconds(exercise,counter)?number/60:number;}
export function activityKind(exercise){return exercise?.alternativeKey==='plank'||exercise?.family==='core_isometric'||exercise?.familyId==='core_isometric'||/^(gainage|plank)(\b|\s)/i.test(exercise?.name||'')?'Gainage':exercise?.tracking==='cardio'?'Cardio':'Mobilité';}
