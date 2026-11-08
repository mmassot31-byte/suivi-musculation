import {exerciseOccurrences} from './exercise-replacement.js';
import {canonicalExerciseId,configureExerciseReferences} from './exercise-reference.js';
import {validLoadIdentity} from './identity.js';
import {chargeIdentity,libraryDefinitions} from './exercise-library.js';
const copy=x=>structuredClone(x),keys=['loadIdentity','loadProtocol','loadMode','measurement'];
const snapshot=s=>Object.fromEntries(keys.filter(k=>Object.hasOwn(s,k)).map(k=>[k,copy(s[k])]));
const modes=['bilateral','unilateral'],metrics=['external_load','added_load','assistance','bodyweight','duration'];
function explicitIdentity(i){if(!validLoadIdentity(i)||i.unit!=='kg'||/préciser|inconnu|ambigu|valeur indiquée/i.test(i.convention))return null;if(i.lateralMode==='total'&&!/haltère|par côté/i.test(i.convention))return 'bilateral';if(['both-sides','simultaneous-pair'].includes(i.lateralMode)&&/haltère|par côté/i.test(i.convention))return 'unilateral';return null;}
export function inferRecordedConvention(e,s){
 const ref=s.exerciseReference||e,identity=s.loadIdentity||ref.loadIdentity;
 if(identity?.unit&&identity.unit!=='kg')return null;
 const metric=s.measurement||ref.measurement||'external_load';if(!metrics.includes(metric))return null;
 // A per-set uncertainty is authoritative: never override it with today's definition.
 if(s.loadProtocol==='elan-2'&&modes.includes(s.loadMode))return {mode:s.loadMode,metric};
 if(s.loadIdentity){const mode=explicitIdentity(s.loadIdentity);return mode?{mode,metric}:null;}
 if(s.exerciseReference?.chargeProtocol==='elan-2'&&modes.includes(ref.loadMode))return {mode:ref.loadMode,metric};
 const mode=explicitIdentity(ref.loadIdentity);if(mode)return {mode,metric};
 // Explicit legacy labels describe the entered load, unlike equipment or a current catalogue default.
 if(!ref.loadIdentity&&/^(total|charge totale)$/i.test(ref.convention||''))return {mode:'bilateral',metric};
 return null;
}
export function analyzeLoadConventions(state){configureExerciseReferences(state);const automatic=[],groups=new Map(),normalizedExercises=new Set(),restoredKeys=new Set((state.loadConventionMigrations||[]).filter(j=>j.restored).flatMap(j=>j.entries.map(old=>JSON.stringify([old.sessionId,old.instanceId,old.setId,snapshot(old.before)]))));let normalizedSets=0;
 for(const row of exerciseOccurrences(state))for(const [index,s]of (row.exercise.sets||[]).entries()){
 if(!Number.isFinite(s.w)||!Number.isFinite(s.r)||row.exercise.tracking)continue;
 const ref=s.exerciseReference||row.exercise,id=canonicalExerciseId(ref),item={sessionId:row.session.id,instanceId:row.exercise.instanceId,path:row.path,setId:s.id,index,exerciseId:id};
 const restored=restoredKeys.has(JSON.stringify([item.sessionId,item.instanceId,item.setId,snapshot(s)]));const found=restored?null:inferRecordedConvention(row.exercise,s);
 if(found){const expected={loadProtocol:'elan-2',loadMode:found.mode,measurement:found.metric,loadIdentity:{...chargeIdentity(found.mode,found.metric),source:'confirmed'}};if(s.loadProtocol==='elan-2'&&s.loadMode===found.mode&&s.measurement===found.metric&&explicitIdentity(s.loadIdentity)===found.mode){normalizedSets++;normalizedExercises.add(id);}else automatic.push({...item,expected});continue;}
 const signature=JSON.stringify([id,ref.equipment||'unknown',s.loadIdentity||ref.loadIdentity||null,s.loadProtocol||null,s.loadMode||null,s.measurement||ref.measurement||null,ref.convention||'',ref.libraryId||ref.id]);
 if(!groups.has(signature))groups.set(signature,{key:signature,name:ref.name||row.exercise.name,equipment:ref.equipment||'unknown',convention:s.loadIdentity?.convention||ref.loadIdentity?.convention||ref.convention||'Non précisée',metric:s.measurement||ref.measurement||'external_load',unit:s.loadIdentity?.unit||ref.loadIdentity?.unit||'kg',items:[]});groups.get(signature).items.push(item);
 }
 return {automatic,groups:[...groups.values()],normalizedSets,normalizedExercises:normalizedExercises.size,automaticExercises:new Set(automatic.map(x=>x.exerciseId)).size,pendingSets:[...groups.values()].reduce((n,g)=>n+g.items.length,0),pendingExercises:new Set([...groups.values()].flatMap(g=>g.items.map(x=>x.exerciseId))).size};
}
function locate(state,item){const rows=exerciseOccurrences(state).filter(x=>x.session.id===item.sessionId&&(!item.instanceId||x.exercise.instanceId===item.instanceId));const byPath=item.path.reduce((v,k)=>v?.[k],state);const row=rows.find(x=>x.exercise===byPath)||(rows.length===1?rows[0]:null);if(!row)throw Error('Les séances ont changé. Relance l’analyse.');const s=item.setId?row.exercise.sets.find(s=>s.id===item.setId):row.exercise.sets[item.index];if(!s)throw Error('Série introuvable.');return s;}
export function normalizeLoadConventions(state,{groupKey=null,mode=null}={}){const report=analyzeLoadConventions(state),next=copy(state);let updates=report.automatic;
 if(groupKey!==null){const group=report.groups.find(g=>g.key===groupKey);if(!group||!modes.includes(mode)||group.unit!=='kg'||!metrics.includes(group.metric))throw Error('Confirmation incompatible.');updates=group.items.map(item=>({...item,expected:{loadProtocol:'elan-2',loadMode:mode,measurement:group.metric,loadIdentity:{...chargeIdentity(mode,group.metric),source:'confirmed'}}}));}
 if(!updates.length)return {state:next,report,changed:0};const journal={id:crypto.randomUUID(),date:new Date().toISOString(),kind:groupKey===null?'automatic':'confirmed',entries:[],restored:false};for(const item of updates){const s=locate(next,item);journal.entries.push({...item,before:snapshot(s),after:copy(item.expected)});Object.assign(s,copy(item.expected));}next.loadConventionMigrations??=[];next.loadConventionMigrations.push(journal);return {state:next,report:analyzeLoadConventions(next),changed:updates.length};}
export function restoreLoadConventions(state,id){const next=copy(state),journal=next.loadConventionMigrations?.find(j=>j.id===id&&!j.restored);if(!journal)throw Error('Sauvegarde introuvable.');for(const item of journal.entries){const s=locate(next,item);if(JSON.stringify(snapshot(s))!==JSON.stringify(snapshot(item.after)))throw Error('Une correction plus récente existe. Restauration annulée.');for(const key of keys)delete s[key];Object.assign(s,snapshot(item.before));}journal.restored=true;return next;}

// A direct correction targets only this reference, equipment and metric in saved sessions.
export function conventionCorrectionPreview(state,exerciseId){
 configureExerciseReferences(state);
 const definition=libraryDefinitions(state).find(d=>d.id===exerciseId);if(!definition)throw Error('Exercice introuvable.');
 const items=[];let excluded=0;
 for(const row of exerciseOccurrences(state).filter(row=>row.path[0]==='sessions'))for(const [index,set] of (row.exercise.sets||[]).entries()){
  const ref=set.exerciseReference||row.exercise;if(canonicalExerciseId(ref)!==exerciseId)continue;
  if(!Number.isFinite(set.w)||!Number.isFinite(set.r)||set.validated===false||set.status&&!['validated','completed'].includes(set.status))continue;
  const metric=set.measurement||ref.measurement||'external_load',unit=set.loadIdentity?.unit||ref.loadIdentity?.unit||'kg';
  if(ref.tracking||unit!=='kg'||!['external_load','assistance'].includes(metric)||metric!==(definition.measurement||'external_load')||(ref.equipment||'unknown')!==(definition.equipment||'unknown')){excluded++;continue;}
  items.push({sessionId:row.session.id,instanceId:row.exercise.instanceId,path:row.path,setId:set.id,index,exerciseId,metric});
 }
 return {definition,items,excluded,sessions:new Set(items.map(x=>x.sessionId)).size};
}
export function correctExerciseConvention(state,exerciseId,mode){
 if(!modes.includes(mode))throw Error('Convention invalide.');
 const preview=conventionCorrectionPreview(state,exerciseId);if(!preview.items.length)throw Error('Aucune série historique compatible.');
 const next=copy(state),journal={id:crypto.randomUUID(),date:new Date().toISOString(),kind:'exercise',exerciseName:preview.definition.name,entries:[],restored:false};
 for(const item of preview.items){const set=locate(next,item),after={loadProtocol:'elan-2',loadMode:mode,measurement:item.metric,loadIdentity:{...chargeIdentity(mode,item.metric),source:'confirmed'}};journal.entries.push({...item,before:snapshot(set),after:copy(after)});Object.assign(set,copy(after));}
 next.loadConventionMigrations??=[];next.loadConventionMigrations.push(journal);return {state:next,changed:journal.entries.length};
}
