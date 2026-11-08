import {dayKey,dayOffset,validDay} from './tracking.js';
import {weeklyMuscleVolume,muscles} from './muscles.js';
import {volumeEstimate} from './volume.js';
import {normalizedTonnage,sameLoadIdentity,loadIdentity} from './identity.js';
import {recordedSets,sessionRecap} from './achievements.js';
import {sameExerciseReference} from './exercise-reference.js';
export function periodEnd(start,period){if(period==='week')return dayOffset(start,6);const d=new Date(start+'T12:00:00');d.setDate(1);d.setMonth(d.getMonth()+1);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(Number(start.slice(8)),last));return dayOffset(dayKey(d),-1)}
export function mergeGoals(a=[],b=[]){const m=new Map();for(const g of [...a,...b])if(!m.has(g.id)||g.updatedAt>m.get(g.id).updatedAt)m.set(g.id,structuredClone(g));return [...m.values()]}
// Version 2 is additive: legacy periods remain readable and are never rewritten.
const finished=(state,today)=> (state.sessions||[]).filter(s=>s.endedAt&&s.id!==state.active?.id&&dayKey(s.date)<=today&&Date.parse(s.endedAt)<=Date.now());
function measure(g,sessions,all){
 if(g.type==='performance'){let value=null;for(const s of sessions)for(const e of s.exercises||[])if(sameExerciseReference(e,g.exercise))for(const st of recordedSets(e))if(st.r===Number(g.reps)&&sameLoadIdentity(g.exercise,e,null,st))value=value===null?st.w:(g.exercise?.measurement==='assistance'?Math.min(value,st.w):Math.max(value,st.w));return {value,uncertain:false};}
 if(g.type==='regularity')return {value:sessions.filter(s=>s.exercises?.some(e=>recordedSets(e).length||e.activityEntries?.length)).length};
 if(g.type==='volume')return {value:volumeEstimate(weeklyMuscleVolume(sessions).totals[g.muscle])};
 if(g.type==='records')return {value:sessions.reduce((n,s)=>n+sessionRecap(s,all).reduce((n,e)=>n+e.records.length,0),0)};
 const t=normalizedTonnage(sessions.flatMap(s=>s.exercises||[]));return {value:t.knownTonnage??0,uncertain:t.totalSets>0&&!t.complete};
}
export function goalBaseline(state,g){
 const all=finished(state,g.start),prior=all.filter(s=>dayKey(s.date)<g.start);
 if(g.type==='performance'){for(const session of prior.slice().sort((a,b)=>b.date.localeCompare(a.date))){const m=measure(g,[session],all);if(m.value!==null)return {value:m.value,source:'history',date:dayKey(session.date)};}return null;}
 if(!g.end&&['tonnage','records'].includes(g.type))return null;
 const days=['regularity','volume'].includes(g.type)?28:Math.max(1,Math.round((Date.parse(g.end||g.start)-Date.parse(g.start))/864e5)+1),from=dayOffset(g.start,-days),sample=prior.filter(s=>dayKey(s.date)>=from);if(!sample.length)return null;
 const m=measure(g,sample,all);return m.uncertain?null:{value:m.value/(['regularity','volume'].includes(g.type)?4:1),source:'history',date:from};
}
function longTermResults(state,today){const all=finished(state,today);return (state.sportGoals||[]).filter(g=>g.version===2&&!g.deleted).map(g=>{
 const end=g.end||'9999-12-31',cut=[today,end,g.stoppedAt||end].sort()[0],sessions=all.filter(s=>dayKey(s.date)>=g.start&&dayKey(s.date)<=cut&&!(g.pauses||[]).some(p=>dayKey(s.date)>=p.start&&dayKey(s.date)<(p.end||'9999-12-31'))),weekly=['regularity','volume'].includes(g.type);
 let m=measure(g,sessions,all),weeks=[],value=m.value;
 if(weekly){for(let start=g.start;dayOffset(start,6)<=cut;start=dayOffset(start,7)){const end=dayOffset(start,6);weeks.push(measure(g,sessions.filter(s=>dayKey(s.date)>=start&&dayKey(s.date)<=end),all).value);}const elapsed=Math.max(0,Math.floor((Date.parse(cut)-Date.parse(g.start))/864e5/7)),start=dayOffset(g.start,elapsed*7);value=measure(g,sessions.filter(s=>dayKey(s.date)>=start),all).value;}
 const baseline=g.baseline?.value??null,target=g.type==='performance'?g.weight:g.target,completed=weeks.filter(v=>v>=target).length,required=Number(g.weeks)||12;
 const decreasing=g.type==='performance'&&g.exercise?.measurement==='assistance';const achieved=weekly?!g.recurring&&completed>=required:!m.uncertain&&value!==null&&(decreasing?value<=target:value>=target);
 const percent=weekly?Math.min(100,Math.floor(completed/required*100)):baseline!==null&&value!==null&&(decreasing?target<baseline:target>baseline)&&!m.uncertain?Math.max(0,Math.min(100,Math.floor((value-baseline)/(target-baseline)*100))):null;
 return {goal:g,start:g.start,end:g.end,value,target,baseline,percent,uncertain:m.uncertain,weeks,completed,required,status:g.stoppedAt?'abandoned':achieved?'achieved':end<today?'expired':'active'};
 });}
export function goalResults(state,today=dayKey()){
 const all=(state.sessions||[]).filter(s=>s.endedAt&&s.id!==state.active?.id&&dayKey(s.date)<=today&&Date.parse(s.endedAt)<=Date.now());const result=longTermResults(state,today);
 for(const g of state.sportGoals||[]){if(g.deleted||g.version===2)continue;let start=g.start;for(let i=0;(i===0||start<=today);i++){
 const naturalEnd=g.period==='custom'?g.end:periodEnd(start,g.period),end=g.until&&g.until<naturalEnd?g.until:naturalEnd,cut=g.stoppedAt&&g.stoppedAt<end?g.stoppedAt:end;
 if(g.stoppedAt&&start>g.stoppedAt||g.until&&start>g.until)break;
 const sessions=all.filter(s=>{const d=dayKey(s.date);return d>=start&&d<=cut&&!(g.pauses||[]).some(p=>d>=p.start&&d<(p.end||'9999-12-31'))});let value=0,uncertain=false;
 if(g.type==='regularity')value=sessions.filter(s=>s.exercises.some(e=>recordedSets(e).length||e.activityEntries?.length)).length;
 if(g.type==='volume')value=volumeEstimate(weeklyMuscleVolume(sessions).totals[g.muscle]);
 if(g.type==='tonnage'){const t=normalizedTonnage(sessions.flatMap(s=>s.exercises));value=t.knownTonnage;uncertain=!t.complete}
 if(g.type==='records')value=sessions.reduce((n,s)=>n+sessionRecap(s,all).reduce((n,e)=>n+e.records.length,0),0);
 if(g.type==='performance')for(const s of sessions)for(const e of s.exercises)if(sameExerciseReference(e,g.exercise))for(const set of recordedSets(e))if(sameLoadIdentity(g.exercise,e,null,set))value=Math.max(value,g.version===3?(set.r===g.reps?(g.exercise?.measurement==='assistance'?g.weight/set.w:set.w/g.weight)*100:0):(set.r===g.reps?set.w/g.weight*100:0));
 const target=g.type==='performance'?100:g.target,achieved=value>=target&&!(g.version===3&&uncertain),paused=(g.pauses||[]).some(p=>!p.end),status=achieved?'achieved':g.stoppedAt&&g.stoppedAt<=end?'abandoned':end<today?'expired':paused?'paused':'active';
 result.push({goal:g,start,end:g.version===3&&end==='9999-12-31'?null:end,value,target,uncertain,status,percent:Math.min(100,Math.floor(value/target*100))});
 if(!g.recurring||end>=today||g.until&&end>=g.until||g.stoppedAt&&end>=g.stoppedAt)break;start=dayOffset(end,1);
 }}return result;
}
