// Read-only overview. Comparisons reuse recorded work, identity and anatomical helpers.
import {progressOverviewModel,progressOverviewHtml,savedActivity,escapeHtml,durationLabel} from './design-ui.js';
import {recordedSets,segments} from './achievements.js';
import {sameLoadIdentity,loadIdentity} from './identity.js';
import {exerciseSheetData,timeCoordinates} from './exercise-sheet.js';
import {exerciseDisplayName} from './exercise-labels.js';
import {exercisePrimaryIcon,muscleIcon} from './pictograms.js';
import {anatomicalProfile,weeklyProfile} from './muscles.js';
import {validRadarSet} from './radar.js';
import {dayKey,dayOffset} from './tracking.js';
import {icon} from './icons.js';
const esc=escapeHtml,fmt=n=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:1});
const button=(text,action,cls='')=>`<button type="button" class="${cls}" data-action="${esc(action)}">${text}</button>`;
const percent=n=>n===null?'—':Math.abs(n)<.05?'0 %':`${n>0?'+':''}${fmt(n)} %`;
export const overviewMuscles=[['chest','Pectoraux','chest'],['back','Dos','lats'],['shoulders','Épaules','side_delts'],['arms','Bras','biceps'],['legs','Jambes','quads']];
const broad=id=>id==='chest'?'chest':['lats','upper_back','traps','erectors'].includes(id)?'back':['front_delts','side_delts','rear_delts'].includes(id)?'shoulders':['biceps','brachialis','triceps','forearms'].includes(id)?'arms':['quads','hamstrings','glutes','calves','adductors','abductors'].includes(id)?'legs':null;
export function overviewMuscleVolume(sessions){
 const totals=Object.fromEntries(overviewMuscles.map(([id])=>[id,0])),seenSessions=new Set();
 for(const s of sessions){if(s.id&&seenSessions.has(s.id))continue;if(s.id)seenSessions.add(s.id);const seen=new Set();
  for(const e of s.exercises||[]){const sets=(e.sets||[]).filter(x=>{if(!validRadarSet(x)||x.id&&seen.has(x.id))return false;if(x.id)seen.add(x.id);return true}),p=weeklyProfile(anatomicalProfile(e)),primary=new Set(p.primary.map(broad).filter(Boolean)),secondary=new Set(p.secondary.map(broad).filter(Boolean));
   for(const id of primary)totals[id]+=sets.length;
   for(const id of secondary)if(!primary.has(id))totals[id]+=.5*sets.length;
  }
 }return totals;
}
export function comparableTrend(exercise,sessions){
 const occurrences=sessions.map(s=>({s,sets:(s.exercises||[]).filter(e=>e.id===exercise.id).flatMap(e=>recordedSets(e).filter(x=>!x.drops?.length&&x.w>0&&sameLoadIdentity(exercise,e,null,x)))})).filter(x=>x.sets.length).sort((a,b)=>Date.parse(a.s.date)-Date.parse(b.s.date));
 if(occurrences.length<2)return null;
 const first=occurrences[0],last=occurrences.at(-1);
 if(Date.parse(first.s.date)>=Date.parse(last.s.date))return null;
 const reps=[...new Set(first.sets.map(x=>x.r))].filter(r=>last.sets.some(x=>x.r===r)).sort((a,b)=>b-a)[0];
 if(reps===undefined)return null;
 const filtered=sessions.map(s=>({...s,exercises:s.exercises.map(e=>({...e,sets:recordedSets(e).filter(x=>!x.drops?.length&&x.w>0&&x.r===reps)}))})),data=exerciseSheetData(exercise,filtered),points=data.points;
 if(points.length<2||points[0].value<=0)return null;
 return{reps,points,percent:(points.at(-1).value/points[0].value-1)*100};
}
export function performanceDashboardModel(state,{today=dayKey(),days=30}={}){
 const model=progressOverviewModel(state,today,days),start=dayOffset(today,1-days),previousStart=dayOffset(start,-days),all=savedActivity(state.sessions,state.active?.id,today),previous=all.filter(s=>dayKey(s.date)>=previousStart&&dayKey(s.date)<start);
 const trends=model.exercises.map(x=>({...x,trend:x.data?comparableTrend(x.data.exercise,model.recent):null}));
 const comparable=trends.filter(x=>x.trend),global=comparable.length?comparable.reduce((n,x)=>n+x.trend.percent,0)/comparable.length:null;
 const chartCandidates=trends.filter(x=>new Set(x.points.map(p=>p.time)).size>=2),featured=chartCandidates.find(x=>x.trend?.percent>0)||chartCandidates[0]||null;
 let chart=null;if(featured){const reference=featured.data.exercise,sets=model.recent.flatMap(s=>s.exercises.filter(e=>e.id===reference.id).flatMap(e=>segments({...e,sets:recordedSets(e).filter(x=>sameLoadIdentity(reference,e,null,x))}))),best=sets.reduce((a,b)=>!a||b.w>a.w||b.w===a.w&&b.r>a.r?b:a,null);chart={...featured,chartPoints:featured.trend?.points||featured.points,best,maxLoad:sets.length?Math.max(...sets.map(x=>x.w)):null};}
 const currentVolume=overviewMuscleVolume(model.recent),previousVolume=overviewMuscleVolume(previous),muscles=overviewMuscles.map(([id,label,picto])=>({id,label,picto,current:currentVolume[id],previous:previousVolume[id],percent:previousVolume[id]>0?(currentVolume[id]/previousVolume[id]-1)*100:null}));
 return{...model,days,start,previousStart,global,comparable:comparable.length,chart,muscles};
}
function recordHtml(x){
 const r=x.record,reference={...x.exercise,...(x.exercise.sets.find(s=>s.id===r.setId)?.loadIdentity?{loadIdentity:x.exercise.sets.find(s=>s.id===r.setId).loadIdentity}:{})},best=segments({...x.exercise,sets:recordedSets(x.exercise).filter(s=>sameLoadIdentity(reference,x.exercise,null,s))}).reduce((a,b)=>!a||b.w>a.w||b.w===a.w&&b.r>a.r?b:a,null),weight=r.kind==='weight'?r.value:r.kind==='reps'?r.weight:best?.w,reps=r.kind==='weight'?r.reps:r.kind==='reps'?r.value:best?.r,unit=loadIdentity(reference).unit;
 return button(`${exercisePrimaryIcon(x.exercise)}<span class="record-mini-name">${esc(exerciseDisplayName(x.exercise))}</span><strong>${weight===undefined?'—':fmt(weight)+' '+esc(unit)+' × '+reps}</strong><small class="record-gain">+${fmt(r.gain)} ${r.kind==='reps'?'rép.':esc(x.unit)}</small>`,'exercise-open:'+encodeURIComponent(x.exercise.id),'record-mini');
}
export function overviewChart(points,unit){
 const data=timeCoordinates(points,{width:300,height:142,padding:24}),minimum=Math.min(...points.map(p=>p.value)),maximum=Math.max(...points.map(p=>p.value)),padding=minimum===maximum?Math.max(.5,Math.abs(minimum)*.05):0,min=minimum-padding,max=maximum+padding;for(const p of data)p.y=118-(p.value-min)/(max-min)*94;const coords=data.map(p=>`${p.x},${p.y}`).join(' '),label=p=>new Date(p.time).toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
 return `<svg class="overview-trend-chart" viewBox="0 0 300 142" role="group" aria-label="Évolution chronologique de la charge, ${esc(unit)}"><path d="M24 18V118H280" fill="none" stroke="var(--line)"/><text x="20" y="20" text-anchor="end">${fmt(max)}</text><text x="20" y="117" text-anchor="end">${fmt(min)}</text><polygon points="${data[0].x},118 ${coords} ${data.at(-1).x},118" fill="var(--accent)" opacity=".12"/><polyline points="${coords}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>${data.map(p=>`<circle class="overview-point-target" cx="${p.x}" cy="${p.y}" r="13" tabindex="0" role="button" data-action="detail:${esc(p.id)}" aria-label="${esc(label(p))} : ${fmt(p.value)} ${esc(unit)}"><title>${esc(label(p))} · ${fmt(p.value)} ${esc(unit)}</title></circle><circle cx="${p.x}" cy="${p.y}" r="4" aria-hidden="true" pointer-events="none"/>`).join('')}<text x="24" y="138">${esc(label(data[0]))}</text><text x="276" y="138" text-anchor="end">${esc(label(data.at(-1)))}</text></svg>`;
}
const periodSelect=(days,allowAll=false,all=false)=>`<label class="overview-period-label"><span class="sr-only">Période de progression</span><select id="overview-period">${[7,30,90].map(n=>`<option value="${n}" ${n===days&&!all?'selected':''}>${n} derniers jours</option>`).join('')}${allowAll?`<option value="all" ${all?'selected':''}>Tout l’historique</option>`:''}</select></label>`;
export function performanceDashboardHtml(state,{tab='overview',muscle='',today=dayKey(),days=30,recordsAll=false}={}){
 if(!['overview','records'].includes(tab)){const group=muscle.startsWith('group-')?muscle.slice(6):null,muscleGroup=group?['chest','lats','upper_back','traps','erectors','front_delts','side_delts','rear_delts','biceps','brachialis','triceps','forearms','quads','hamstrings','glutes','calves','adductors','abductors'].filter(id=>broad(id)===group):null;return progressOverviewHtml(state,{tab,muscle,today,days,muscleGroup,muscleGroupLabel:group?overviewMuscles.find(x=>x[0]===group)?.[1]||'':''});}
 const m=performanceDashboardModel(state,{today,days});
 if(tab==='records'){const first=savedActivity(state.sessions,state.active?.id,today).map(s=>dayKey(s.date)).sort()[0]||today,span=Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(first+'T12:00:00Z'))/864e5)+1,records=recordsAll?progressOverviewModel(state,today,span).recordHistory:m.recordHistory;return `<section class="performance-record-list">${button('← Aperçu','overview-tab:overview','small section-back')}<div class="row between section-heading"><h2>Tous tes records</h2>${periodSelect(days,true,recordsAll)}</div><div class="record-history-list">${records.map(x=>`<article>${recordHtml(x)}<time>${new Date(x.session.date).toLocaleDateString('fr-FR')}</time></article>`).join('')||'<p class="empty">Aucun record sur cette période.</p>'}</div></section>`;}
 const c=m.chart;
 return `<section class="performance-overview performance-dashboard">
 <div class="row between section-heading overview-progress-heading"><h2>Tes progrès</h2>${periodSelect(days)}</div>
 <section class="overview-four-stats" aria-label="Progrès sur la période sélectionnée">${[[icon('progress'),percent(m.global),'Performances',`${m.comparable} exercices comparables`],[icon('history'),fmt(m.summary.sessions),'Séances',''],[icon('tonnage'),fmt(m.summary.sets),'Séries',''],[icon('timer'),m.summary.measured?durationLabel(m.summary.minutes):'—','Temps total','Durées enregistrées']].map(([ico,value,label,title])=>`<div title="${esc(title)}">${ico}<strong>${value}</strong><small>${label}</small></div>`).join('')}</section>
 <section class="recent-records"><div class="row between section-heading"><h2>${icon('trophy')}Records récents</h2>${button('Voir tout →','overview-tab:records','text-link')}</div><div class="record-mini-grid">${m.records.slice(0,3).map(recordHtml).join('')||'<p class="overview-record-empty">Ton prochain record apparaîtra ici.</p>'}</div></section>
 <div class="row between section-heading"><h2>Exercices en progression</h2>${button('Voir tout →','overview-tab:exercise','text-link')}</div>
 ${c?`<article class="progress-feature-card progress-exercise-card"><div class="progress-feature-main">${button(`${exercisePrimaryIcon(c.exercise)}<strong>${esc(exerciseDisplayName(c.exercise))}</strong>`,'exercise-open:'+encodeURIComponent(c.exercise.id),'progress-feature-title')}<p class="overview-metric">${c.trend?'Charge à '+fmt(c.trend.reps)+' rép.':'Charge maximale'} (${esc(c.data.identity.unit)})</p><div class="overview-chart">${overviewChart(c.chartPoints,c.data.identity.unit)}</div></div><dl class="progress-feature-facts"><div class="feature-evolution"><dt>Sur ${days} jours</dt><dd>${percent(c.trend?.percent??null)}</dd></div><div><dt>Charge max</dt><dd>${fmt(c.maxLoad)} ${esc(c.data.identity.unit)}</dd></div><div><dt>Meilleure série</dt><dd>${c.best?fmt(c.best.w)+' '+esc(c.data.identity.unit)+' × '+c.best.r:'—'}</dd></div></dl></article>`:`<div class="overview-chart-empty"><p>${m.exercises.length?'Encore une séance comparable pour tracer ton évolution.':'Tes premières séances dessineront ta progression.'}</p>${button(m.exercises.length?'Voir mes exercices':'Mes séances',m.exercises.length?'overview-tab:exercise':'home-sessions','small')}</div>`}
 <div class="row between section-heading"><h2>Progression par muscle <small>(volume)</small></h2>${button('Voir tout →','overview-tab:muscle','text-link')}</div>
 <div class="overview-muscle-grid" aria-label="Évolution du volume musculaire">${m.muscles.map(x=>button(`${muscleIcon(x.picto)}<strong>${x.label}</strong><span>${x.percent===null?(x.current?'Nouv.':'—'):percent(x.percent)}</span><small>${fmt(x.current)} séries pond.</small>`,'overview-muscle:group-'+x.id,'overview-muscle-card')).join('')}</div>
 <details class="progress-help overview-method"><summary>Comprendre tes évolutions</summary><p>Performances : moyenne des évolutions de charge de ${m.comparable} exercices comparables, à répétitions identiques, entre la première et la dernière séance de la période, hors échauffements et dégressives. Même exercice, matériel, unité, convention et côtés. Les baisses comptent aussi ; une première référence ne donne pas de pourcentage.</p><p>Volume : séries directes + 0,5 × séries secondaires. Une série compte une seule fois par groupe. Les ${days} jours sélectionnés sont comparés aux ${days} jours précédents ; « Nouv. » signifie qu’aucun volume n’était enregistré auparavant. Il s’agit du volume enregistré, pas d’un gain musculaire.</p>${button('Historique du tonnage','overview-tonnage','small')}</details>
 </section>`;
}
