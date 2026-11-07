import {sameExerciseReference} from './exercise-reference.js';
import {isAssisted} from './load-conventions.js';
import {sameLoadIdentity,normalizedTonnage,loadIdentity} from './identity.js';
// Personal milestones are derived from recorded work only. No saved flags or estimates.
const valid=s=>s&&s.validated!==false&&(s.status===undefined||['validated','completed'].includes(s.status))&&s.type!=='warmup'&&Number.isFinite(s.w)&&s.w>=0&&Number.isFinite(s.r)&&s.r>0;
export const sameExercise=(a,b)=>sameLoadIdentity(a,b);
export const recordedSets=e=>(e.sets||[]).filter(valid);
export const segments=e=>recordedSets(e).flatMap(s=>[s,...(s.drops||[]).filter(valid)]);
export const exerciseTonnage=e=>{const total=normalizedTonnage([e]);return total.complete?total.knownTonnage:total.rawTonnage};
const dayOnly=date=>/^\d{4}-\d{2}-\d{2}$/.test(date||'');
const sameDay=(a,b)=>String(a?.date||'').slice(0,10)===String(b?.date||'').slice(0,10);
const preceding=(session,sessions)=>(sessions||[]).filter(s=>s.id!==session.id&&Number.isFinite(Date.parse(s.date))&&Date.parse(s.date)<Date.parse(session.date)&&!(sameDay(s,session)&&(dayOnly(s.date)||dayOnly(session.date)))).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
const ambiguousOrder=(session,sessions,e)=>(sessions||[]).some(s=>s.id!==session.id&&sameDay(s,session)&&(dayOnly(s.date)||dayOnly(session.date)||Date.parse(s.date)===Date.parse(session.date))&&(s.exercises||[]).some(x=>sameExerciseReference(x,e)&&recordedSets(x).length));
const compatibleSegments=(e,query)=>segments({...e,sets:recordedSets(e).filter(set=>sameLoadIdentity(query,e,null,set))});
export function personalRecords(session,exercise,set,sessions){
 if(!valid(set)||ambiguousOrder(session,sessions,exercise))return [];
 const history=preceding(session,sessions).flatMap(s=>(s.exercises||[]).filter(e=>sameExerciseReference(e,exercise)).flatMap(e=>compatibleSegments(e,{...exercise,...(set.loadIdentity?{loadIdentity:set.loadIdentity}:{})})));
 if(!history.length)return []; // A first observation is a baseline, never an invented record.
 const query={...exercise,...(set.loadIdentity?{loadIdentity:set.loadIdentity}:{})};
 const earlier=(session.exercises||[]).filter(e=>sameExerciseReference(e,exercise)).flatMap(e=>compatibleSegments({...e,sets:recordedSets(e).filter(x=>set.id?x.id!==set.id:x!==set)},query));
 const prior=[...history,...earlier],result=[],top=Math.max(...prior.map(x=>x.w)),candidates=[set,...(set.drops||[]).filter(valid)],heaviest=candidates.reduce((a,b)=>b.w>a.w?b:a);
 if(!isAssisted(exercise,set)&&heaviest.w>top)result.push({kind:'weight',value:heaviest.w,previous:top,gain:heaviest.w-top,reps:heaviest.r});
 const repRecords=[];for(const candidate of candidates){const same=prior.filter(x=>x.w===candidate.w);if(same.length){const best=Math.max(...same.map(x=>x.r));if(candidate.r>best)repRecords.push({kind:'reps',value:candidate.r,previous:best,gain:candidate.r-best,weight:candidate.w})}}
 if(repRecords.length)result.push(repRecords.sort((a,b)=>b.gain-a.gain)[0]);
 return result;
}
export function exerciseRecap(session,e,sessions){
 const current=recordedSets(e),history=preceding(session,sessions),query={...e,...(current[0]?.loadIdentity?{loadIdentity:current[0].loadIdentity}:{})};
 const compatible=x=>sameExerciseReference(x,e)&&recordedSets(x).length&&recordedSets(x).every(set=>sameLoadIdentity(query,x,null,set));
 const unique=(session.exercises||[]).filter(x=>sameExerciseReference(x,e)).length===1&&current.every(set=>sameLoadIdentity(query,e,null,set));
 const priorSession=unique?history.find(s=>(s.exercises||[]).filter(x=>sameExerciseReference(x,e)).length===1&&(s.exercises||[]).some(compatible)):null;
 const previousExercises=priorSession?.exercises.filter(compatible)||[],previous=previousExercises.flatMap(recordedSets),volume=exerciseTonnage(e),previousVolume=previousExercises.reduce((n,x)=>n+exerciseTonnage(x),0);
 const historicalVolumes=history.map(s=>(s.exercises||[]).filter(compatible)).filter(list=>list.length).map(list=>list.reduce((n,x)=>n+exerciseTonnage(x),0));
 // Compare a set only against what had been recorded before it in this occurrence.
 const seen=[],records=[];
 for(const set of unique?current:[]){records.push(...personalRecords({...session,exercises:[{...e,sets:seen}]},e,set,sessions).map(r=>({...r,setId:set.id})));seen.push(set)}
 if(!isAssisted(e)&&unique&&!ambiguousOrder(session,sessions,e)&&session.endedAt&&historicalVolumes.length&&volume>Math.max(...historicalVolumes))records.push({kind:'tonnage',value:volume,previous:Math.max(...historicalVolumes),gain:volume-Math.max(...historicalVolumes)});
 const best=current.length?current.reduce((a,b)=>(isAssisted(e)?b.w<a.w:b.w>a.w)||b.w===a.w&&b.r>a.r?b:a):null;
 const repGain=best&&previous.filter(x=>x.w===best.w).length?best.r-Math.max(...previous.filter(x=>x.w===best.w).map(x=>x.r)):null;
 return {e,current,previous,priorSession,volume,previousVolume,deltaSets:previous.length?current.length-previous.length:null,deltaVolume:previous.length?volume-previousVolume:null,best,repGain,records};
}
export function sessionRecap(session,sessions){return (session.exercises||[]).map(e=>exerciseRecap(session,e,sessions))}
// Only a reusable source ID establishes a comparable session; names alone never do.
export function omittedExercises(session,sessions){
 if(!session.templateId)return [];
 const previous=preceding(session,sessions).find(s=>s.templateId===session.templateId);
 if(!previous)return [];
 return (previous.exercises||[]).filter(e=>recordedSets(e).length&&!(session.exercises||[]).some(current=>sameExercise(current,e))).map(e=>({name:e.name,sets:recordedSets(e).length,date:previous.date}));
}

export function recordTarget(sessions,exercise,weight){if(!Number.isFinite(weight)||weight<0)return null;const sets=(sessions||[]).flatMap(s=>(s.exercises||[]).filter(e=>sameExerciseReference(e,exercise)).flatMap(e=>compatibleSegments(e,exercise))).filter(set=>set.w===weight);if(!sets.length)return null;const best=Math.max(...sets.map(s=>s.r));return {kind:'reps',weight,best,target:best+1,unit:'kg'};}

// A factual improvement over the last comparable occurrence, never an absolute record.
export function setProgression(session,exercise,set,sessions){
 if(!valid(set)||set.drops?.length||ambiguousOrder(session,sessions,exercise)||(session.exercises||[]).filter(e=>sameExerciseReference(e,exercise)).length!==1)return null;
 const query={...exercise,...(set.loadIdentity?{loadIdentity:set.loadIdentity}:{})};
 const last=preceding(session,sessions).find(s=>{
  const matches=(s.exercises||[]).filter(e=>sameExerciseReference(e,exercise));
  return matches.length===1&&recordedSets(matches[0]).some(old=>!old.drops?.length&&sameLoadIdentity(query,matches[0],null,old));
 });
 if(!last)return null;
 const e=last.exercises.find(e=>sameExerciseReference(e,exercise)),previous=recordedSets(e).filter(old=>!old.drops?.length&&sameLoadIdentity(query,e,null,old)),atWeight=previous.filter(old=>old.w===set.w);
 if(atWeight.length){const old=atWeight.reduce((a,b)=>b.r>a.r?b:a);return set.r>old.r?{kind:'reps',gain:set.r-old.r,old,set,date:last.date,unit:loadIdentity(exercise,set).unit}:null;}
 const atReps=previous.filter(old=>old.r===set.r);
 if(atReps.length){const old=atReps.reduce((a,b)=>b.w>a.w?b:a);if((isAssisted(exercise,set)?set.w<old.w:set.w>old.w))return {kind:'weight',gain:Math.abs(set.w-old.w),old,set,date:last.date,unit:loadIdentity(exercise,set).unit};}
 return null;
}
