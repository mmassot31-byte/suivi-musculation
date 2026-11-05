// Derived presentation only. Server results and training calculations remain authoritative.
import {homeCounts,dayKey} from './tracking.js';
import {recordTarget,recordedSets} from './achievements.js';

export function ownProfileSummary(state,today=dayKey()){
 const sessions=state.sessions||[],counts=homeCounts(sessions,today);
 const recent=[...sessions].filter(s=>Number.isFinite(Date.parse(s.date))&&dayKey(s.date)<=today).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
 let next=null;
 for(const session of recent){
  for(const exercise of session.exercises||[]){
   const set=recordedSets(exercise).at(-1);
   if(!set)continue;
   const target=recordTarget(sessions,exercise,set.w);
   if(target){next={exerciseId:exercise.id,name:exercise.name,...target};break;}
  }
  if(next)break;
 }
 return {counts,next};
}

export function challengePresentation(challenge,now=Date.now()){
 const target=Number(challenge.referenceReps)+1,best=Number.isFinite(challenge.bestReps)?challenge.bestReps:null;
 const progress=best===null||!Number.isFinite(target)||target<=0?0:Math.max(0,Math.min(100,best/target*100));
 const date=challenge.status==='pending'?challenge.inviteExpiresAt:challenge.deadline;
 const end=Date.parse(date),days=Number.isFinite(end)?Math.max(0,Math.ceil((end-now)/86400000)):null;
 return {target,best,progress,days,date};
}

export function challengeContacts(challenges,ownerId){
 const people=new Map();
 for(const c of challenges){
  const person=c.initiatorId===ownerId?{id:c.targetId,username:c.target}:c.targetId===ownerId?{id:c.initiatorId,username:c.initiator}:null;
  if(person?.id&&person.username)people.set(person.id,person);
 }
 return [...people.values()].sort((a,b)=>a.username.localeCompare(b.username,'fr'));
}
