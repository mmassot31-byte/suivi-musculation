import {canonicalExerciseId,sameExerciseReference} from './exercise-reference.js';
import {isAssisted} from './load-conventions.js';
// Read-only overview. Comparisons reuse recorded work, identity and anatomical helpers.
import {progressOverviewModel,progressOverviewHtml,savedActivity,escapeHtml} from './design-ui.js';
import {recordedSets,segments} from './achievements.js';
import {sameLoadIdentity,loadIdentity} from './identity.js';
import {timeCoordinates} from './exercise-sheet.js';
import {exerciseDisplayName} from './exercise-labels.js';
import {exercisePrimaryIcon} from './pictograms.js';
import {anatomicalProfile,weeklyProfile} from './muscles.js';
import {validRadarSet} from './radar.js';
import {dayKey,dayOffset} from './tracking.js';
import {icon} from './icons.js';
const esc=escapeHtml,fmt=n=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:1});
const button=(text,action,cls='')=>`<button type="button" class="${cls}" data-action="${esc(action)}">${text}</button>`;
const percent=n=>n===null?'—':Math.abs(n)<.05?'0 %':`${n>0?'+':''}${fmt(n)} %`;
export const overviewMuscles=[['chest','Pectoraux','chest'],['back','Dos','lats'],['shoulders','Épaules','side_delts'],['arms','Bras','biceps'],['legs','Jambes','quads']];
export const overviewMuscleGroup=id=>id==='chest'?'chest':['lats','upper_back','traps','erectors'].includes(id)?'back':['front_delts','side_delts','rear_delts'].includes(id)?'shoulders':['biceps','brachialis','triceps','forearms'].includes(id)?'arms':['quads','hamstrings','glutes','calves','adductors','abductors'].includes(id)?'legs':null;
const broad=overviewMuscleGroup;
export function overviewMuscleVolume(sessions){
 const totals=Object.fromEntries(overviewMuscles.map(([id])=>[id,0])),seenSessions=new Set();
 for(const s of sessions){if(s.id&&seenSessions.has(s.id))continue;if(s.id)seenSessions.add(s.id);const seen=new Set();
  for(const e of s.exercises||[]){const sets=(e.sets||[]).filter(x=>{if(!validRadarSet(x)||x.id&&seen.has(x.id))return false;if(x.id)seen.add(x.id);return true}),unused=null;for(const st of sets){const p=weeklyProfile(anatomicalProfile(st.exerciseReference||e)),primary=new Set(p.primary.map(broad).filter(Boolean)),secondary=new Set(p.secondary.map(broad).filter(Boolean));for(const id of primary)totals[id]++;for(const id of secondary)if(!primary.has(id))totals[id]+=.5;}
  }
 }return totals;
}
// Epley estimate: one best working set per session, within a conservative rep range.
export function comparableTrend(exercise,sessions){
 if(isAssisted(exercise)||['bodyweight','added_load','duration'].includes(exercise.measurement)||exercise.tracking&&exercise.tracking!=='strength')return null;
 const seen=new Set(),points=[];
 for(const session of sessions){
  if(session.id&&seen.has(session.id))continue;if(session.id)seen.add(session.id);
  const sets=(session.exercises||[]).flatMap(e=>recordedSets(e).filter(set=>{
   const reference=set.exerciseReference||e;
   return sameExerciseReference(reference,exercise)&&sameLoadIdentity(exercise,e,null,set)&&!isAssisted(reference,set)&&!['bodyweight','added_load','duration'].includes(set.measurement||reference.measurement)&&!set.drops?.length&&set.w>0&&Number.isInteger(set.r)&&set.r>=1&&set.r<=12;
  }));
  if(!sets.length)continue;
  const best=sets.reduce((a,b)=>b.w*(1+b.r/30)>a.w*(1+a.r/30)?b:a);
  points.push({id:session.id,date:session.date,time:Date.parse(session.date),value:best.w*(1+best.r/30),weight:best.w,reps:best.r});
 }
 points.sort((a,b)=>a.time-b.time);
 if(points.length<2||!Number.isFinite(points[0].time)||points[0].time>=points.at(-1).time)return null;
 return{points,percent:(points.at(-1).value/points[0].value-1)*100};
}
export function performanceDashboardModel(state,{today=dayKey(),days=30}={}){
 const model=progressOverviewModel(state,today,days),start=dayOffset(today,1-days),previousStart=dayOffset(start,-days),all=savedActivity(state.sessions,state.active?.id,today),previous=all.filter(s=>dayKey(s.date)>=previousStart&&dayKey(s.date)<start);
 const trends=model.exercises.map(x=>({...x,trend:x.data?comparableTrend(x.data.exercise,model.recent):null}));
 const comparable=trends.filter(x=>x.trend),global=comparable.length?comparable.reduce((n,x)=>n+x.trend.percent,0)/comparable.length:null;
 const chartCandidates=trends.filter(x=>x.trend),featured=chartCandidates.find(x=>x.trend?.percent>0)||chartCandidates[0]||null;
 let chart=null;if(featured&&!isAssisted(featured.data.exercise)){const reference=featured.data.exercise,sets=model.recent.flatMap(s=>s.exercises.filter(e=>sameExerciseReference(e,reference)).flatMap(e=>segments({...e,sets:recordedSets(e).filter(x=>sameLoadIdentity(reference,e,null,x))}))),best=sets.reduce((a,b)=>!a||b.w>a.w||b.w===a.w&&b.r>a.r?b:a,null);chart={...featured,chartPoints:featured.trend?.points||featured.points,best,maxLoad:sets.length?Math.max(...sets.map(x=>x.w)):null};}
 const currentVolume=overviewMuscleVolume(model.recent),previousVolume=overviewMuscleVolume(previous),muscles=overviewMuscles.map(([id,label,picto])=>({id,label,picto,current:currentVolume[id],previous:previousVolume[id],percent:previousVolume[id]>0?(currentVolume[id]/previousVolume[id]-1)*100:null}));
 return{...model,days,start,previousStart,global,comparable:comparable.length,chart,muscles};
}
function recordHtml(x){
 const r=x.record,reference={...x.exercise,...(x.exercise.sets.find(s=>s.id===r.setId)?.loadIdentity?{loadIdentity:x.exercise.sets.find(s=>s.id===r.setId).loadIdentity}:{})},best=segments({...x.exercise,sets:recordedSets(x.exercise).filter(s=>sameLoadIdentity(reference,x.exercise,null,s))}).reduce((a,b)=>!a||b.w>a.w||b.w===a.w&&b.r>a.r?b:a,null),weight=r.kind==='weight'?r.value:r.kind==='reps'?r.weight:best?.w,reps=r.kind==='weight'?r.reps:r.kind==='reps'?r.value:best?.r,unit=loadIdentity(reference).unit;
 return button(`${exercisePrimaryIcon(x.exercise)}<span class="record-mini-name">${esc(exerciseDisplayName(x.exercise))}</span><strong>${weight===undefined?'—':fmt(weight)+' '+esc(unit)+' × '+reps}</strong><small class="record-gain">+${fmt(r.gain)} ${r.kind==='reps'?'rép.':esc(x.unit)}</small>`,'exercise-open:'+encodeURIComponent(x.exercise.id),'record-mini');
}
// Full record history has its own presentation; the dashboard stays unchanged.
export function distinctRecordHistory(state,{today=dayKey(),days=30,all=false,kind='all'}={}){
 const sessions=savedActivity(state.sessions,state.active?.id,today),first=sessions.map(s=>dayKey(s.date)).sort()[0]||today;
 const span=all?Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(first+'T12:00:00Z'))/864e5)+1:days;
 const seen=new Set();
 return progressOverviewModel(state,today,span).recordHistory.filter(x=>{
  if(kind!=='all'&&x.record.kind!==kind)return false;
  const r=x.record,set=x.exercise.sets.find(s=>s.id===r.setId),identity=loadIdentity(x.exercise,set);
  const key=JSON.stringify([canonicalExerciseId(x.exercise),identity.unit,identity.convention,identity.lateralMode,set?.loadProtocol,set?.measurement,set?.loadMode,dayKey(x.session.date),r.kind,r.value,r.weight,r.reps]);
  if(seen.has(key))return false;seen.add(key);return true;
 }).map(x=>{
  const r=x.record,set=x.exercise.sets.find(s=>s.id===r.setId),reference={...x.exercise,...(set?.loadIdentity?{loadIdentity:set.loadIdentity}:{})};
  // Repetitions compare the same load; load gains require the same rep count.
  let gain=null;
  if(r.kind==='reps'&&r.previous>0&&r.gain>0)gain={value:r.gain,unit:'rép.'};
  if(r.kind==='weight'){
   const prior=sessions.filter(s=>s.id!==x.session.id&&Date.parse(s.date)<Date.parse(x.session.date)).flatMap(s=>s.exercises.filter(e=>sameExerciseReference(e,x.exercise)).flatMap(e=>segments({...e,sets:recordedSets(e).filter(st=>sameLoadIdentity(reference,e,null,st))}))).filter(st=>st.r===r.reps);
   const best=prior.length?Math.max(...prior.map(st=>st.w)):null;
   if(best!==null&&r.value>best)gain={value:r.value-best,unit:loadIdentity(reference).unit};
  }
  if(r.kind==='tonnage'&&r.previous>0&&r.gain>0)gain={value:r.gain,unit:x.unit};
  return {...x,gain};
 });
}
function historyRecordHtml(x){
 const r=x.record,set=x.exercise.sets.find(s=>s.id===r.setId),unit=loadIdentity(x.exercise,set).unit;
 const value=r.kind==='tonnage'?fmt(r.value)+' '+x.unit:fmt(r.kind==='weight'?r.value:r.weight)+' '+unit+' × '+(r.kind==='reps'?r.value:r.reps);
 const type=r.kind==='weight'?'Charge':r.kind==='reps'?'Répétitions':'Tonnage de séance',date=new Date(x.session.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'});
 const action='record-open:'+encodeURIComponent(x.session.id)+':'+x.session.exercises.indexOf(x.exercise);
 return `<article>${button(`${exercisePrimaryIcon(x.exercise)}<span class="history-record-name"><strong>${esc(exerciseDisplayName(x.exercise))}</strong><small><time datetime="${esc(x.session.date)}">${esc(date)}</time> · ${type}</small></span><span class="history-record-value"><strong>${esc(value)}</strong>${x.gain?`<small class="history-record-gain">+${fmt(x.gain.value)} ${esc(x.gain.unit)}</small>`:''}</span><span class="history-record-chevron" aria-hidden="true">›</span>`,action,'history-record-row')}</article>`;
}
export function overviewChart(points,unit){
 const data=timeCoordinates(points,{width:300,height:142,padding:24}),minimum=Math.min(...points.map(p=>p.value)),maximum=Math.max(...points.map(p=>p.value)),padding=minimum===maximum?Math.max(.5,Math.abs(minimum)*.05):0,min=minimum-padding,max=maximum+padding;for(const p of data)p.y=118-(p.value-min)/(max-min)*94;const coords=data.map(p=>`${p.x},${p.y}`).join(' '),label=p=>new Date(p.time).toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
 return `<svg class="overview-trend-chart" viewBox="0 0 300 142" role="group" aria-label="Évolution chronologique de la force estimée, ${esc(unit)}"><path d="M24 18V118H280" fill="none" stroke="var(--line)"/><text x="20" y="20" text-anchor="end">${fmt(max)}</text><text x="20" y="117" text-anchor="end">${fmt(min)}</text><polygon points="${data[0].x},118 ${coords} ${data.at(-1).x},118" fill="var(--accent)" opacity=".12"/><polyline points="${coords}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>${data.map(p=>`<circle class="overview-point-target" cx="${p.x}" cy="${p.y}" r="13" tabindex="0" role="button" data-action="detail:${esc(p.id)}" aria-label="${esc(label(p))} : ${fmt(p.value)} ${esc(unit)}"><title>${esc(label(p))} · ${fmt(p.value)} ${esc(unit)}</title></circle><circle cx="${p.x}" cy="${p.y}" r="4" aria-hidden="true" pointer-events="none"/>`).join('')}<text x="24" y="138">${esc(label(data[0]))}</text><text x="276" y="138" text-anchor="end">${esc(label(data.at(-1)))}</text></svg>`;
}
const periodSelect=(days,allowAll=false,all=false)=>`<label class="overview-period-label"><span class="sr-only">Période de progression</span><select id="overview-period">${[7,30,90].map(n=>`<option value="${n}" ${n===days&&!all?'selected':''}>${n} derniers jours</option>`).join('')}${allowAll?`<option value="all" ${all?'selected':''}>Tout l’historique</option>`:''}</select></label>`;
export function performanceDashboardHtml(state,{tab='overview',muscle='',today=dayKey(),days=30,recordsAll=false,recordKind='all'}={}){
 if(!['overview','records'].includes(tab)){const group=muscle.startsWith('group-')?muscle.slice(6):null,muscleGroup=group?['chest','lats','upper_back','traps','erectors','front_delts','side_delts','rear_delts','biceps','brachialis','triceps','forearms','quads','hamstrings','glutes','calves','adductors','abductors'].filter(id=>broad(id)===group):null;return progressOverviewHtml(state,{tab,muscle,today,days,muscleGroup,muscleGroupLabel:group?overviewMuscles.find(x=>x[0]===group)?.[1]||'':''});}
 const m=performanceDashboardModel(state,{today,days});
 if(tab==='records'){const records=distinctRecordHistory(state,{today,days,all:recordsAll,kind:recordKind});return `<section class="performance-record-list">${button('← Retour','overview-tab:overview','small records-back')}<h2>${icon('trophy')}Tous tes records</h2><p class="records-subtitle">Tes meilleures performances par exercice.</p><div class="records-toolbar">${periodSelect(days,true,recordsAll)}<div class="records-kind" role="group" aria-label="Type de record">${[['all','Tous'],['weight','Charge'],['reps','Répétitions']].map(([key,label])=>`<button type="button" data-action="record-kind:${key}" aria-pressed="${recordKind===key}">${label}</button>`).join('')}</div></div><div class="record-history-list">${records.map(historyRecordHtml).join('')||'<p class="empty">Aucun record sur cette période pour ce filtre.</p>'}</div></section>`;}
 const c=m.chart,secondary=m.progressing.filter(x=>!c||!sameExerciseReference(x.exercise,c.exercise)).slice(0,2),newRecords=distinctRecordHistory(state,{today,days}).length;
 return `<section class="performance-overview performance-dashboard">
 <div class="row between section-heading overview-progress-heading"><h2>Tes progrès</h2>${periodSelect(days)}</div>
 <section class="overview-four-stats" aria-label="Progrès sur la période sélectionnée">${[[icon('progress'),percent(m.global),'Force estimée',`${m.comparable} exercice${m.comparable>1?'s':''} comparable${m.comparable>1?'s':''} · évolution de la force estimée sur ${days} jours`],[icon('history'),fmt(m.summary.sessions),'Séances',''],[icon('trophy'),fmt(newRecords),'Nouveaux records','Records distincts établis sur la période sélectionnée'],[icon('progress'),fmt(m.progressing.length),'Exercices en progression','Exercices dont la dernière comparaison enregistrée progresse sur la période']].map(([ico,value,label,title])=>`<div title="${esc(title)}">${ico}<strong>${value}</strong><small>${label}</small></div>`).join('')}</section>
 <section class="recent-records"><div class="row between section-heading"><h2>${icon('trophy')}Records récents</h2>${button('Tous les records →','overview-tab:records','text-link')}</div><div class="record-mini-grid">${m.records.slice(0,3).map(recordHtml).join('')||'<p class="overview-record-empty">Ton prochain record apparaîtra ici.</p>'}</div></section>
 <section class="progressing-exercises"><div class="row between section-heading"><h2>${icon('progress')}Exercices en progression</h2>${button('Voir tout →','overview-tab:exercise','text-link')}</div>
 ${c?`<article class="progress-feature-card progress-exercise-card"><div class="progress-feature-main">${button(`${exercisePrimaryIcon(c.exercise)}<strong>${esc(exerciseDisplayName(c.exercise))}</strong>`,'exercise-open:'+encodeURIComponent(c.exercise.id),'progress-feature-title')}<p class="overview-metric">Force estimée (${esc(c.data.identity.unit)})</p><div class="overview-chart">${overviewChart(c.chartPoints,c.data.identity.unit)}</div></div><dl class="progress-feature-facts"><div class="feature-evolution"><dt>Sur ${days} jours</dt><dd>${percent(c.trend?.percent??null)}</dd></div><div><dt>Charge max</dt><dd>${fmt(c.maxLoad)} ${esc(c.data.identity.unit)}</dd></div><div><dt>Meilleure série</dt><dd>${c.best?fmt(c.best.w)+' '+esc(c.data.identity.unit)+' × '+c.best.r:'—'}</dd></div></dl></article>`:`<div class="overview-chart-empty"><p>${m.exercises.length?'Encore une séance comparable pour tracer ton évolution.':'Tes premières séances dessineront ta progression.'}</p>${button(m.exercises.length?'Voir mes exercices':'Mes séances',m.exercises.length?'overview-tab:exercise':'home-sessions','small')}</div>`}
 <div class="progress-secondary-list">${secondary.map(x=>button(`${exercisePrimaryIcon(x.exercise)}<strong>${esc(exerciseDisplayName(x.exercise))}</strong><span class="progress-secondary-gain">+${fmt(x.gain.gain)} ${x.gain.kind==='reps'?'rép. à '+fmt(x.last.w)+' '+esc(x.gain.unit):esc(x.gain.unit)+' à '+x.last.r+' rép.'}</span><span aria-hidden="true">›</span>`,'exercise-open:'+encodeURIComponent(x.exercise.id),'progress-secondary-row')).join('')}</div>
 <details class="progress-help overview-method"><summary>Comment sont calculées les progressions ?</summary><p>Force estimée : moyenne des évolutions de ${m.comparable} exercices comparables entre la première et la dernière séance des ${days} jours sélectionnés. Pour chaque séance, on retient la meilleure estimation : charge × (1 + répétitions / 30), sur les séries de 1 à 12 répétitions (formule d’Epley). Elle prend en compte les gains de charge et de répétitions ; ce n’est pas une charge maximale mesurée. Même exercice, matériel, unité, convention et côtés. Échauffements, dégressives, assistance et poids du corps sont exclus. Les baisses comptent aussi ; sans deux séances comparables, aucun pourcentage n’est affiché.</p><p>Nouveaux records : records distincts établis sur la période sélectionnée. Exercices en progression : exercices dont la dernière performance sur cette période progresse par rapport à la dernière séance comparable. Les lignes compactes reprennent ces gains réels ; sans comparaison fiable, aucun gain n’est inventé.</p>${button('Historique du tonnage','overview-tonnage','small')}</details>
 </section></section>`;
}
