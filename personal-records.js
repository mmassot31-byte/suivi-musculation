import {loadIdentity} from './identity.js';
import {exerciseLabel,matchesExercise} from './exercise-labels.js';
const signature=(id,identity,weight)=>JSON.stringify([id,identity.unit,identity.convention,identity.lateralMode,Number(weight)]);
// Offer real completed history even before its load convention has been confirmed.
// Local options never authorize a challenge: only a server proof does.
export function personalReferences(server,state,query=''){
 const best=new Map(),lookup=new Map();
 for(const session of state.sessions||[]){const ended=Date.parse(session.endedAt),started=Date.parse(session.date);if(!Number.isFinite(ended)||!Number.isFinite(started)||ended<started||ended>Date.now()||session.id===state.active?.id)continue;
 for(const exercise of session.exercises||[]){if(exercise.tracking)continue;
 for(const set of exercise.sets||[]){if(!set.id||set.type==='warmup'||set.validated===false||set.status&&!['validated','completed'].includes(set.status)||!Number.isFinite(set.w)||set.w<0||set.w>1000000||!Number.isInteger(set.r)||set.r<1||set.r>10000)continue;const recorded=Date.parse(set.recordedAt||session.date);if(!Number.isFinite(recorded)||recorded<started||recorded>ended)continue;
 const identity=loadIdentity(exercise,set),key=signature(exercise.id,identity,set.w),reference={label:exercise.name,identity,weight:set.w,reps:set.r,sessionId:session.id,setId:set.id,exerciseKey:exercise.instanceId,exerciseId:exercise.id,needsConfirmation:identity.certainty!=='known',pendingSync:identity.certainty==='known',date:session.date};lookup.set(session.id+'\0'+set.id,key);const old=best.get(key);if(!old||set.r>old.reps||set.r===old.reps&&session.date>old.date)best.set(key,reference);
 }}}
 const ready=new Map();for(const r of server||[]){const key=lookup.get(r.sessionId+'\0'+r.setId)||r.identityKey+'\0'+r.weight;ready.set(key,{...r,needsConfirmation:false,pendingSync:false})}
 for(const [key,r]of best)if(!ready.has(key))ready.set(key,r);
 return [...ready.values()].filter(r=>!query||matchesExercise(r.label,query)).sort((a,b)=>exerciseLabel(a.label).localeCompare(exerciseLabel(b.label),'fr')||Number(a.weight)-Number(b.weight));
}

export async function confirmPersonalHistory(state,reference,identity,future=true){
 const {confirmHistoricalIdentity,validLoadIdentity}=await import('./identity.js');
 if(!validLoadIdentity(identity)||identity.convention.match(/préciser|inconnu|ambigu|valeur indiquée/i))throw Error('Choisis ce que représente la charge.');
 const index=(state.sessions||[]).findIndex(s=>s.id===reference.sessionId),session=state.sessions?.[index],exercise=session?.exercises.find(e=>e.instanceId===reference.exerciseKey&&e.id===reference.exerciseId),set=exercise?.sets.find(s=>s.id===reference.setId);
 if(!session?.endedAt||!set||set.w!==reference.weight||set.r!==reference.reps||loadIdentity(exercise,set).unit!==identity.unit||loadIdentity(exercise,set).certainty==='known'||loadIdentity(exercise,set).convention!==reference.identity.convention||loadIdentity(exercise,set).lateralMode!==reference.identity.lateralMode)throw Error('Cette référence a changé. Relance la recherche.');
 const next=structuredClone(state),result=confirmHistoricalIdentity(session,exercise.instanceId,identity,[set.id]);next.sessions[index]=result.session;
 next.conventionConfirmations??=[];next.conventionConfirmations.push({id:crypto.randomUUID(),exerciseId:exercise.id,createdAt:new Date().toISOString(),from:session.date.slice(0,10),to:session.date.slice(0,10),patches:[result.patch]});
 // Keep raw conventions/IDs stable so existing references and entry proposals survive.
 if(future){const apply=e=>{if(e.id===exercise.id)e.loadIdentity={...identity};if(e.alternative)apply(e.alternative)};for(const template of next.templates||[])template.exercises.forEach(apply);for(const week of next.weekPlans||[])for(const entry of week.entries||[])if(!entry.sessionId)entry.plan.exercises.forEach(apply)}
 return next;
}
