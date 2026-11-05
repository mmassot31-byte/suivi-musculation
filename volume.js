import {dayKey,dayOffset,validDay} from './tracking.js';
import {muscles,muscleVolume,weeklyMuscleVolume,weekStart,weekSessions} from './muscles.js';
const known=id=>muscles.some(([key])=>key===id);
export const plannedSets=e=>e.plannedSets??e.refs.length;
export function setPlannedSets(e,n){if(!Number.isInteger(n)||n<0||n>100)throw Error('Le nombre prévu doit être compris entre 0 et 100.');e.plannedSets=n}
export function plannedVolume(template){return weeklyMuscleVolume([{...template,exercises:template.exercises.map(e=>({...e,sets:Array.from({length:plannedSets(e)},()=>({type:'work'}))}))}])}
export function activeSessions(state){return [...state.sessions,...(state.active&&!state.sessions.some(s=>s.id===state.active.id)?[state.active]:[])]}
export function targetForWeek(targets,muscle,start,today=dayKey()){const end=dayOffset(start,6),asOf=end<today?end:today;return targets.filter(t=>t.muscle===muscle&&t.effectiveDate<=asOf).sort((a,b)=>b.effectiveDate.localeCompare(a.effectiveDate))[0]||null}
export function targetStatus(value,target){return !target||target.min===null?'Sans cible':value<target.min?'Sous la cible':value>target.max?'Au-dessus de la cible':'Dans la cible'}
export function validTargets(list){return Array.isArray(list)&&list.every(t=>t&&known(t.muscle)&&validDay(t.effectiveDate)&&(t.method===undefined||['direct','fractional'].includes(t.method))&&(t.origin===undefined||['personal','preset'].includes(t.origin))&&(t.automatic===undefined||typeof t.automatic==='boolean')&&(!t.automatic||t.origin==='preset'&&t.method==='fractional')&&((t.min===null&&t.max===null)||(Number.isInteger(t.min)&&Number.isInteger(t.max)&&t.min>=0&&t.max>=t.min&&t.max<=1000)))&&new Set(list.map(t=>t.muscle+'@'+t.effectiveDate)).size===list.length}
export function validWeeks(list){return Array.isArray(list)&&list.every(w=>w&&validDay(w.week)&&weekStart(w.week)===w.week&&['normal','deload','pause','incomplete'].includes(w.kind)&&typeof w.complete==='boolean')&&new Set(list.map(w=>w.week)).size===list.length}
export function validPins(list){return Array.isArray(list)&&list.every(p=>p&&known(p.muscle)&&typeof p.pinned==='boolean')&&new Set(list.map(p=>p.muscle)).size===list.length}
export function firstTrackedWeek(state){const dates=activeSessions(state).filter(s=>s.exercises.some(e=>e.sets.some(x=>x.type!=='warmup'))).map(s=>dayKey(s.date)).sort();return dates.length?weekStart(dates[0]):null}
export function weekReport(state,start,today=dayKey()){
 const all=weekSessions(activeSessions(state),start),inSession=state.active&&!state.sessions.some(s=>s.id===state.active.id)?weekSessions([state.active],start):[],volume=weeklyMuscleVolume(all.filter(s=>s.id!==state.active?.id)),active=weeklyMuscleVolume(inSession),first=firstTrackedWeek(state),annotation=state.volumeWeeks.find(w=>w.week===start)||{week:start,kind:'normal',complete:false};
 return {start,end:dayOffset(start,6),volume,active,sessions:all.filter(s=>s.id!==state.active?.id),annotation,current:start===weekStart(today),past:start<weekStart(today),beforeTracking:!first||start<first,hasData:all.filter(s=>s.id!==state.active?.id).some(s=>s.exercises.some(e=>e.sets.some(x=>x.type!=='warmup')))}
}
export function muscleHistory(state,muscle,start,count=8,today=dayKey()){return Array.from({length:count},(_,i)=>{const week=weekReport(state,dayOffset(start,-7*(count-1-i)),today),target=targetForWeek(state.volumeTargets,muscle,week.start,today),value=week.volume.totals[muscle],eligible=week.past&&!week.beforeTracking&&week.annotation.kind==='normal'&&week.annotation.complete&&!week.volume.unclassified&&target?.min!==null&&!!target;return {...week,target,value,status:targetStatus(targetValue(value,target),target),eligible}})}
export function adherenceStats(rows){const eligible=rows.filter(r=>r.eligible),observed=rows.filter(r=>r.past&&!r.beforeTracking&&(r.hasData||r.annotation.complete));return {count:eligible.length,under:eligible.filter(r=>r.status==='Sous la cible').length,within:eligible.filter(r=>r.status==='Dans la cible').length,over:eligible.filter(r=>r.status==='Au-dessus de la cible').length,observed:observed.length,average:observed.length?observed.reduce((n,r)=>n+r.value.primary,0)/observed.length:null}}
export function repeatedGap(state,muscle,today=dayKey()){const last=dayOffset(weekStart(today),-7),rows=muscleHistory(state,muscle,last,3,today);if(rows.length!==3||!rows.every(r=>r.eligible)||new Set(rows.map(r=>targetMethod(r.target)+':'+r.target.min+':'+r.target.max)).size!==1)return null;const statuses=rows.map(r=>r.status);return statuses.every(s=>s==='Sous la cible')?'sous':statuses.every(s=>s==='Au-dessus de la cible')?'au-dessus':null}
export function mergeByKey(local,incoming,key){const result=[...local],keys=new Set(local.map(key));for(const item of incoming){const k=key(item);if(!keys.has(k)){result.push(structuredClone(item));keys.add(k)}}return result}

// Proposed configuration, not muscle-specific thresholds demonstrated by research.
export const startingRanges={chest:[12,18],lats:[12,18],upper_back:[10,16],side_delts:[12,18],rear_delts:[8,14],front_delts:[6,12],biceps:[10,16],triceps:[10,16],quads:[10,16],hamstrings:[8,14],glutes:[10,16],calves:[8,14],abs:[6,12],traps:[6,12],forearms:[6,12],adductors:[6,12]};
export const targetMethod=t=>t?.method||'direct';
export const volumeEstimate=v=>v.primary+.5*v.secondary;
export const targetValue=(v,t)=>targetMethod(t)==='fractional'?volumeEstimate(v):v.primary;
export function activateVolumeReferences(state,today=dayKey()){
 if(state.volumeReferenceActivation)return false;
 state.volumeTargets??=[];state.volumeReferenceActivation={version:1,date:today};
 for(const [muscle,[min,max]] of Object.entries(startingRanges))if(!state.volumeTargets.some(t=>t.muscle===muscle))state.volumeTargets.push({muscle,min,max,effectiveDate:today,method:'fractional',origin:'preset',automatic:true});
 return true;
}
export function mergeTargets(local,incoming){
 const personal=new Set([...local,...incoming].filter(t=>(t.origin||'personal')==='personal').map(t=>t.muscle));
 const candidates=[...local,...incoming].filter(t=>!t.automatic||!personal.has(t.muscle)),result=[];
 // A personal incoming target takes precedence over an automatic default on the same date.
 for(const t of candidates){const index=result.findIndex(x=>x.muscle===t.muscle&&x.effectiveDate===t.effectiveDate);if(index<0)result.push(structuredClone(t));else if(result[index].automatic&&!t.automatic)result[index]=structuredClone(t)}
 return result.filter(t=>!t.automatic||!result.some(x=>x!==t&&x.automatic&&x.muscle===t.muscle&&x.effectiveDate<t.effectiveDate));
}
export function reportStatus(report,v,target){
 if(report.current&&(report.hasData||report.active?.sets))return 'Semaine en cours';
 if(!report.hasData&&!report.annotation.complete)return 'Données incomplètes';
 if(report.current)return 'Semaine en cours';
 if(report.annotation.kind==='deload')return 'Semaine allégée';if(report.annotation.kind==='pause')return 'Semaine de pause';if(!report.past||!report.annotation.complete||report.annotation.kind!=='normal'||report.volume.unclassified)return 'Données incomplètes';
 if(!target||target.min===null)return 'Sans repère';
 return targetStatus(targetValue(v,target),target).replace('la cible','le repère');
}
export function volumeRows(state,report,all=false){const pins=new Set(state.musclePins.filter(p=>p.pinned).map(p=>p.muscle));return [...muscles].sort((a,b)=>Number(pins.has(b[0]))-Number(pins.has(a[0]))).filter(([id])=>all||report.volume.totals[id].primary||report.volume.totals[id].secondary)}
export function volumeObservations(state,today=dayKey()){
 const report=weekReport(state,weekStart(today),today),pins=new Set(state.musclePins.filter(p=>p.pinned).map(p=>p.muscle));
 if(!report.hasData)return [];
 return volumeRows(state,report,true).map(([muscle,label])=>{const gap=repeatedGap(state,muscle,today),v=report.volume.totals[muscle];if(gap)return {muscle,label,v,text:`${label} : ${gap==='sous'?'sous ton repère':'au-dessus de ton repère'} sur trois semaines complètes. ${gap==='sous'?'Si ta progression stagne et que ta récupération est bonne, tu peux envisager un léger ajustement.':'Observe ta progression et ta récupération avant de changer ton programme.'}`};if(pins.has(muscle))return {muscle,label,v,text:label+' : '+(!v.primary&&!v.secondary?'Aucune série enregistrée cette semaine · à surveiller.':'Semaine en cours')};return null}).filter(Boolean).slice(0,3);
}
