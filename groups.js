import {plannedSets} from './volume.js';
const uuid=()=>crypto.randomUUID();
const work=e=>(e.sets||[]).filter(s=>s.type!=='warmup');
export const exerciseByKey=(t,key)=>t.exercises.find(e=>e.instanceId===key);
export const groupForExercise=(t,key)=>(t.groups||[]).find(g=>g.members.includes(key));
export const allSteps=g=>[...g.steps,...(g.retainedSteps||[])];
export function stepSet(t,step){return exerciseByKey(t,step.exerciseKey)?.sets?.find(s=>s.groupStepId===step.id)}
export function pendingStep(t,g){return g.steps.find(s=>!stepSet(t,s)&&s.status!=='skipped')||null}
export function cursorStep(t,g){return g?.steps.find(s=>s.id===g.cursorStepId)||null}
export function groupConfig(t,g){return {id:g.id,name:g.name,mode:g.mode,members:[...g.members],common:g.common,restBetween:g.restBetween,restAfter:g.restAfter,offsets:structuredClone(g.offsets||[]),counts:Object.fromEntries(g.members.map(key=>[key,plannedSets(exerciseByKey(t,key))]))}}
export function ensureInstances(t){function ensure(e){e.instanceId??=uuid();if(e.alternative)ensure(e.alternative)}for(const e of t.exercises)ensure(e)}
export function buildSteps(t,c){
 if(!['fixed','rotating'].includes(c.mode)||!Array.isArray(c.members)||c.members.length<2||c.members.length>8||new Set(c.members).size!==c.members.length||c.members.some(key=>!exerciseByKey(t,key)))throw Error('Choisis entre deux et huit exercices distincts.');
 if(c.mode==='fixed'&&c.members.length>3)throw Error('Choisis deux exercices pour un superset ou trois pour un triset.');
 for(const key of c.members)if(!Number.isInteger(c.counts[key])||c.counts[key]<0||c.counts[key]>100)throw Error('Prévoyez de 0 à 100 séries par exercice.');
 const offset=key=>(c.offsets||[]).find(o=>o.exerciseKey===key)?.count||0,remaining=key=>Math.max(0,c.counts[key]-offset(key)),ordinals=Object.fromEntries(c.members.map(key=>[key,offset(key)])),steps=[];
 const add=(key,round)=>steps.push({id:uuid(),exerciseKey:key,round,ordinal:ordinals[key]++,status:'pending'});
 if(c.mode==='fixed'){const rounds=Math.max(0,...c.members.map(remaining));for(let r=0;r<rounds;r++)for(const key of c.members)if(remaining(key)>r)add(key,r+1)}else{
  if(!c.members.includes(c.common))throw Error('Choisis l’exercice commun.');const associates=c.members.filter(key=>key!==c.common),sum=associates.reduce((n,key)=>n+remaining(key),0);if(sum!==remaining(c.common))throw Error(`Les exercices associés prévoient ${sum} passages, contre ${remaining(c.common)} pour le commun. Ajustez les quantités ou alignez le commun.`);
  let round=0;for(const key of associates)for(let i=0;i<remaining(key);i++){round++;add(c.common,round);add(key,round)}
 }
 return steps;
}
export function configureGroup(t,c,bindExisting=true){
 ensureInstances(t);const old=(t.groups||[]).find(g=>g.id===c.id);for(const key of c.members){const conflict=(t.groups||[]).find(g=>g.id!==old?.id&&(g.members.includes(key)||(g.retainedSteps||[]).some(s=>s.exerciseKey===key)));if(conflict)throw Error('Un exercice appartient déjà à un autre groupe. Dissocie-le d’abord.');}
 if(typeof c.name!=='string'||!c.name.trim()||c.name.length>120)throw Error('Donnez un nom court au groupe.');if(![c.restBetween,c.restAfter].every(n=>Number.isInteger(n)&&n>=0&&n<=3600))throw Error('Le repos doit être compris entre 0 et 3600 secondes.');
 const generated=buildSteps(t,c),oldSteps=old?allSteps(old):[],lookup=new Map(oldSteps.map(s=>[s.exerciseKey+':'+s.ordinal,s])),steps=generated.map(s=>{const previous=lookup.get(s.exerciseKey+':'+s.ordinal);return previous?{...s,id:previous.id,status:previous.status}:s}),ids=new Set(steps.map(s=>s.id));
 const retainedSteps=oldSteps.filter(s=>!ids.has(s.id)&&stepSet(t,s));
 const g={id:old?.id||c.id||uuid(),name:c.name.trim(),mode:c.mode,members:[...c.members],common:c.mode==='rotating'?c.common:null,restBetween:c.restBetween,restAfter:c.restAfter,offsets:structuredClone(c.offsets||[]),steps,retainedSteps,cursorStepId:null,...(old?.templateGroupId?{templateGroupId:old.templateGroupId}:{})};
 if(!old&&bindExisting){for(const s of steps){const set=work(exerciseByKey(t,s.exerciseKey))[s.ordinal];if(set&&!set.groupStepId){set.groupStepId=s.id;set.groupId=g.id}}for(const key of c.members){const offset=(c.offsets||[]).find(o=>o.exerciseKey===key)?.count||0;work(exerciseByKey(t,key)).forEach((set,ordinal)=>{if(ordinal<offset||set.groupStepId)return;const extra={id:uuid(),exerciseKey:key,round:Math.max(1,...steps.map(s=>s.round)),ordinal,status:'pending'};set.groupStepId=extra.id;set.groupId=g.id;g.retainedSteps.push(extra)})}}
 g.cursorStepId=steps.some(s=>s.id===old?.cursorStepId&&!stepSet(t,s))?old.cursorStepId:pendingStep(t,g)?.id||null;
 for(const key of c.members)exerciseByKey(t,key).plannedSets=c.counts[key];
 t.groups??=[];const index=t.groups.findIndex(x=>x.id===g.id);if(index<0)t.groups.push(g);else t.groups[index]=g;
 for(const e of t.exercises)if(e.superset===g.id){delete e.superset;delete e.supersetStart}
 return g;
}
export function migrateGroups(t,active=false){
 ensureInstances(t);t.groups??=[];const ids=[...new Set(t.exercises.map(e=>e.superset).filter(Boolean))];for(const id of ids){const members=t.exercises.filter(e=>e.superset===id);if(members.length!==2)continue;if(!t.groups.some(g=>g.id===id)){
  const offsets=members.map(e=>({exerciseKey:e.instanceId,count:Number.isInteger(e.supersetStart)?e.supersetStart:0}));configureGroup(t,{id,name:'Superset',mode:'fixed',members:members.map(e=>e.instanceId),common:null,counts:Object.fromEntries(members.map(e=>[e.instanceId,plannedSets(e)])),offsets,restBetween:0,restAfter:members.some(e=>e.auto)?Math.max(...members.map(e=>e.rest)):0},true);
 }
 for(const e of members){delete e.superset;delete e.supersetStart}if(active&&t.currentGroupId===undefined){const g=t.groups.find(g=>g.id===id);t.currentGroupId=id;const step=cursorStep(t,g);if(step)t.currentExerciseKey=step.exerciseKey}
 }
 return t;
}
export function newSessionGroups(t,templates){t.groups=[];for(const source of templates||[]){const config=groupConfig(t,source);config.id=uuid();config.offsets=[];const g=configureGroup(t,config,false);g.templateGroupId=source.id}return t.groups}
export function dissociateGroup(t,id){const g=(t.groups||[]).find(g=>g.id===id);if(!g)return;const ids=new Set(allSteps(g).map(s=>s.id));for(const e of t.exercises){for(const set of e.sets||[])if(ids.has(set.groupStepId)||set.groupId===id){delete set.groupStepId;delete set.groupId}if(e.superset===id){delete e.superset;delete e.supersetStart}}if(t.entryDrafts){const belongs=(key,step)=>key===step.id||key.startsWith(step.id+'@');for(const step of allSteps(g))for(const draft of t.entryDrafts.filter(d=>belongs(d.key,step))){const key='free:'+step.exerciseKey+draft.key.slice(step.id.length);if(!t.entryDrafts.some(d=>d.key===key))t.entryDrafts.push({key,fields:structuredClone(draft.fields)})}t.entryDrafts=t.entryDrafts.filter(d=>!allSteps(g).some(step=>belongs(d.key,step)))}t.groups=t.groups.filter(g=>g.id!==id);if(t.currentGroupId===id)t.currentGroupId=null}
export function advanceGroup(t,g,step){const index=g.steps.findIndex(s=>s.id===step.id),next=g.steps.slice(index+1).find(s=>!stepSet(t,s)&&s.status!=='skipped')||null;g.cursorStepId=next?.id||null;const rest=!next?0:next.round!==step.round?g.restAfter:g.restBetween;return {next,rest:next?.exerciseKey===step.exerciseKey?Math.max(rest,exerciseByKey(t,step.exerciseKey).rest):rest}}
export function stageOrdinal(t,e){const g=(t.groups||[]).find(g=>g.id===t.currentGroupId),step=cursorStep(t,g);return step&&step.exerciseKey===e.instanceId&&!stepSet(t,step)?step.ordinal:null}
export function validGroups(t){
 if(!t||!Array.isArray(t.exercises)||t.exercises.some(e=>!e||typeof e!=='object'||e.sets!==undefined&&!Array.isArray(e.sets)))return false;
 const str=s=>typeof s==='string'&&s.length>0&&s.length<100000;
 if(t.groups===undefined)return t.currentGroupId===undefined&&t.currentExerciseKey===undefined&&t.entryDrafts===undefined&&t.restUntil===undefined&&!t.exercises.some(e=>(e.sets||[]).some(s=>s.groupStepId!==undefined||s.groupId!==undefined));if(!Array.isArray(t.groups)||t.groups.length>100||new Set(t.exercises.map(e=>e.instanceId)).size!==t.exercises.length||t.exercises.some(e=>!str(e.instanceId)))return false;
 const keys=new Set(t.exercises.map(e=>e.instanceId)),owners=new Set(),ids=new Set(),steps=new Map();
 for(const g of t.groups){if(!g||!str(g.id)||ids.has(g.id)||typeof g.name!=='string'||!g.name.trim()||g.name.length>120||!['fixed','rotating'].includes(g.mode)||!Array.isArray(g.members)||g.members.length<2||g.members.length>8||new Set(g.members).size!==g.members.length||g.members.some(k=>!keys.has(k)||owners.has(k))||g.mode==='fixed'&&g.members.length>3||g.mode==='rotating'&&!g.members.includes(g.common)||![g.restBetween,g.restAfter].every(n=>Number.isInteger(n)&&n>=0&&n<=3600)||!Array.isArray(g.steps)||!Array.isArray(g.retainedSteps)||g.steps.length+g.retainedSteps.length>100000||(g.templateGroupId!==undefined&&!str(g.templateGroupId))||!Array.isArray(g.offsets)||new Set(g.offsets.map(o=>o?.exerciseKey)).size!==g.offsets.length||g.offsets.some(o=>!o||!g.members.includes(o.exerciseKey)||!Number.isInteger(o.count)||o.count<0))return false;
  ids.add(g.id);g.members.forEach(k=>owners.add(k));const ordinals=new Set();for(const step of allSteps(g)){if(!step||!str(step.id)||steps.has(step.id)||!keys.has(step.exerciseKey)||g.steps.includes(step)&&!g.members.includes(step.exerciseKey)||!Number.isInteger(step.round)||step.round<1||!Number.isInteger(step.ordinal)||step.ordinal<0||!['pending','skipped'].includes(step.status)||ordinals.has(step.exerciseKey+':'+step.ordinal))return false;ordinals.add(step.exerciseKey+':'+step.ordinal);steps.set(step.id,{...step,group:g.id})}
  if(g.cursorStepId!==null&&!g.steps.some(s=>s.id===g.cursorStepId))return false;
 }
 for(const e of t.exercises)if(e.superset&&!t.groups.some(g=>g.id===e.superset&&g.members.length===2&&g.members.includes(e.instanceId)))return false;
 const bound=new Set();for(const e of t.exercises)for(const set of e.sets||[]){if(set.groupStepId===undefined&&set.groupId===undefined)continue;const step=steps.get(set.groupStepId);if(!step||step.exerciseKey!==e.instanceId||set.groupId!==step.group||set.type!=='work'||bound.has(step.id))return false;bound.add(step.id)}
 if(t.currentGroupId!==undefined&&t.currentGroupId!==null&&!ids.has(t.currentGroupId))return false;if(t.currentExerciseKey!==undefined&&!keys.has(t.currentExerciseKey))return false;
 if(t.restUntil!==undefined&&(!Number.isFinite(t.restUntil)||t.restUntil<0))return false;
 if(t.entryDrafts!==undefined&&(!Array.isArray(t.entryDrafts)||t.entryDrafts.length>10000||t.entryDrafts.some(d=>!d||!str(d.key)||!d.fields||['weight','reps','type','rir','notes','drops'].some(key=>typeof d.fields[key]!=='string')||Object.keys(d.fields).some(k=>!['weight','reps','type','rir','notes','drops'].includes(k))||Object.values(d.fields).some(v=>typeof v!=='string'||v.length>100000))))return false;
 return true;
}

// The first member's position anchors a group in legacy models too.
export function workoutBlocks(t){const seen=new Set(),blocks=[];for(const e of t.exercises){if(seen.has(e.instanceId))continue;const group=groupForExercise(t,e.instanceId),members=group?[...group.members]:[e.instanceId];members.forEach(key=>seen.add(key));blocks.push({name:group?.name||e.name,members,group:group||null})}return blocks}
export function moveWorkoutBlock(t,from,to){const blocks=workoutBlocks(t);if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=blocks.length||to>=blocks.length)return false;const [block]=blocks.splice(from,1);blocks.splice(to,0,block);t.exercises=blocks.flatMap(b=>b.members.map(key=>exerciseByKey(t,key)));return true}
