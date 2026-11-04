// Personal milestones are derived from recorded work only. No saved flags or estimates.
const valid=s=>s&&s.type!=='warmup'&&Number.isFinite(s.w)&&s.w>=0&&Number.isFinite(s.r)&&s.r>0;
export const sameExercise=(a,b)=>!!a?.id&&a.id===b?.id&&typeof a.convention==='string'&&!!a.convention&&a.convention===b.convention;
export const recordedSets=e=>(e.sets||[]).filter(valid);
export const segments=e=>recordedSets(e).flatMap(s=>[s,...(s.drops||[]).filter(valid)]);
export const exerciseTonnage=e=>segments(e).reduce((n,s)=>n+s.w*s.r,0);
const preceding=(session,sessions)=>sessions.filter(s=>s.id!==session.id&&s.date<session.date).sort((a,b)=>b.date.localeCompare(a.date));
export function personalRecords(session,exercise,set,sessions){
 if(!valid(set))return [];
 const history=preceding(session,sessions).flatMap(s=>(s.exercises||[]).filter(e=>sameExercise(e,exercise)).flatMap(segments));
 if(!history.length)return []; // A first observation is a baseline, never an invented record.
 const earlier=(session.exercises||[]).filter(e=>sameExercise(e,exercise)).flatMap(e=>segments({...e,sets:recordedSets(e).filter(x=>set.id?x.id!==set.id:x!==set)}));
 const prior=[...history,...earlier],result=[],top=Math.max(...prior.map(x=>x.w)),candidates=[set,...(set.drops||[]).filter(valid)],heaviest=candidates.reduce((a,b)=>b.w>a.w?b:a);
 if(heaviest.w>top)result.push({kind:'weight',value:heaviest.w,previous:top,gain:heaviest.w-top,reps:heaviest.r});
 const repRecords=[];for(const candidate of candidates){const same=prior.filter(x=>x.w===candidate.w);if(same.length){const best=Math.max(...same.map(x=>x.r));if(candidate.r>best)repRecords.push({kind:'reps',value:candidate.r,previous:best,gain:candidate.r-best,weight:candidate.w})}}
 if(repRecords.length)result.push(repRecords.sort((a,b)=>b.gain-a.gain)[0]);
 return result;
}
export function exerciseRecap(session,e,sessions){
 const current=recordedSets(e),history=preceding(session,sessions),unique=(session.exercises||[]).filter(x=>sameExercise(x,e)).length===1,priorSession=unique?history.find(s=>(s.exercises||[]).filter(x=>sameExercise(x,e)).length===1&&(s.exercises||[]).some(x=>sameExercise(x,e)&&recordedSets(x).length)):null;
 const previousExercises=priorSession?.exercises.filter(x=>sameExercise(x,e))||[],previous=previousExercises.flatMap(recordedSets),volume=exerciseTonnage(e),previousVolume=previousExercises.reduce((n,x)=>n+exerciseTonnage(x),0);
 const historicalVolumes=history.map(s=>(s.exercises||[]).filter(x=>sameExercise(x,e))).filter(list=>list.some(x=>recordedSets(x).length)).map(list=>list.reduce((n,x)=>n+exerciseTonnage(x),0));
 // Compare a set only against what had been recorded before it in this occurrence.
 const seen=[],records=[];
 for(const set of unique?current:[]){records.push(...personalRecords({...session,exercises:[{...e,sets:seen}]},e,set,sessions).map(r=>({...r,setId:set.id})));seen.push(set)}
 if(unique&&session.endedAt&&historicalVolumes.length&&volume>Math.max(...historicalVolumes))records.push({kind:'tonnage',value:volume,previous:Math.max(...historicalVolumes),gain:volume-Math.max(...historicalVolumes)});
 const best=current.length?current.reduce((a,b)=>b.w>a.w||b.w===a.w&&b.r>a.r?b:a):null;
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
