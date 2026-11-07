// Versioned per-set conventions: legacy series never inherit a new interpretation.
export const simpleLoadProtocol='elan-2';
export const simpleModes=['bilateral','unilateral'];
export const loadMetrics=['external_load','added_load','assistance','bodyweight','duration'];
export function validSimpleLoad(value){return value?.loadProtocol===undefined||value.loadProtocol===simpleLoadProtocol&&simpleModes.includes(value.loadMode)&&loadMetrics.includes(value.measurement);}
export function simpleLoadSnapshot(exercise){return exercise?.chargeProtocol===simpleLoadProtocol?{loadProtocol:simpleLoadProtocol,loadMode:exercise.loadMode||'bilateral',measurement:exercise.measurement||'external_load'}:{};}
export function recordedLoadFactor(set){if(set?.loadProtocol!==simpleLoadProtocol)return 1;if(['bodyweight','assistance','duration'].includes(set.measurement))return 0;return set.loadMode==='unilateral'?2:1;}
export function recordedSetTonnage(set,{validatedDrops=false}={}){const drops=(set.drops||[]).filter(x=>!validatedDrops||x.validated!==false&&x.type!=='warmup'&&(x.status===undefined||['validated','completed'].includes(x.status))&&Number.isFinite(x.w)&&x.w>=0&&Number.isFinite(x.r)&&x.r>0);return (set.w*set.r+drops.reduce((n,d)=>n+d.w*d.r,0))*recordedLoadFactor(set);}
export function isAssisted(exercise,set=null){return (set?.measurement||exercise?.measurement)==='assistance';}
export function loadFieldLabel(exercise){return exercise?.measurement==='assistance'?'Assistance · kg':exercise?.measurement==='added_load'?'Charge additionnelle · kg':exercise?.loadMode==='unilateral'?'Charge par côté · kg':'Charge totale · kg';}
export function exerciseReferenceSnapshot(exercise){const keys=['id','libraryId','libraryScope','originExerciseId','name','equipment','familyId','muscles','chargeProtocol','loadMode','measurement','alternativeKey','tracking','loadIdentity','convention'];return Object.fromEntries(keys.filter(key=>exercise[key]!==undefined).map(key=>[key,structuredClone(exercise[key])]));}
