// Profile-only presentation. No account writes, synthetic curves or badge attribution.
import {savedActivity,activitySummary,escapeHtml} from './design-ui.js';
import {volumeRange} from './volume-dashboard.js';
import {recordedSets} from './achievements.js';
import {trophyModel} from './trophy-room.js';
import {dayKey,tonnage} from './tracking.js';
import {weekStart} from './muscles.js';
import {icon} from './icons.js';
const esc=escapeHtml,fmt=n=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:2});
export function personalProfileStats(profile,state,today=dayKey()){
 if(!state)return profile;
 const saved=savedActivity(state.sessions,state.active?.id,today),start=weekStart(today);
 const metrics=sessions=>{const m=activitySummary(sessions);return {sessions:m.sessions,work_sets:m.sets,tonnage_kg:sessions.reduce((n,s)=>n+tonnage(s),0)}};
 return {...profile,totals:{...profile?.totals,...metrics(saved)},week:{...profile?.week,...metrics(saved.filter(s=>dayKey(s.date)>=start))}};
}
export function profileStats(profile,period='totals'){
 const data=profile?.[period]||{},week=period==='week',badges=week?(Number.isFinite(data.badges)?data.badges:null):trophyModel(profile).awards.length;
 return[['Séances','history',data.sessions],['Séries','tonnage',data.work_sets],['Tonnage','barbell',Number.isFinite(data.tonnage_kg)?fmt(data.tonnage_kg/1000)+' t':null],['Records','trophy',data.pr_events],['Badges','target',badges]].map(([label,picto,value])=>({label,picto,value:typeof value==='string'?value:Number.isFinite(value)?fmt(value):'—',unavailable:value===null||value===undefined}));
}
export function profileStatsHtml(profile,period='totals'){
 return `<div class="community-stats" data-period="${period}">${profileStats(profile,period).map(x=>`<div title="${x.unavailable?'Donnée non fournie pour cette période':esc(x.label)}">${icon(x.picto)}<strong>${esc(x.value)}</strong><small>${x.label}</small></div>`).join('')}</div>`;
}
export function profileProgressModel(state,today=dayKey()){
 const p=volumeRange(today,'4',today),all=savedActivity(state.sessions,state.active?.id,today),current=all.filter(s=>dayKey(s.date)>=p.start&&dayKey(s.date)<=p.through),previous=all.filter(s=>dayKey(s.date)>=p.previousStart&&dayKey(s.date)<=p.previousEnd),sets=activitySummary(current).sets,old=activitySummary(previous).sets;
 let total=0;const points=current.map(s=>({session:s,count:s.exercises.reduce((n,e)=>n+recordedSets(e).length,0)})).filter(x=>x.count>0).sort((a,b)=>Date.parse(a.session.date)-Date.parse(b.session.date)).map(x=>({date:x.session.date,time:Date.parse(x.session.date),value:total+=x.count}));
 return{period:p,sets,percent:old>0?(sets/old-1)*100:null,points,hasCurve:new Set(points.map(x=>x.time)).size>=2};
}
export function profileProgressHtml(state,today=dayKey()){
 const m=profileProgressModel(state,today),value=m.percent===null?`${fmt(m.sets)} séries`:`${m.percent>0?'+':''}${fmt(m.percent)} %`,first=m.points[0],last=m.points.at(-1),coordinates=m.hasCurve?m.points.map(p=>({x:8+(p.time-first.time)/(last.time-first.time)*164,y:62-p.value/Math.max(1,m.sets)*50})):[];
 const chart=m.hasCurve?`<svg class="profile-mini-chart" viewBox="0 0 180 70" role="img" aria-label="Séries de travail cumulées sur quatre semaines : ${m.points.map(p=>new Date(p.time).toLocaleDateString('fr-FR')+', '+p.value+' séries').join(' ; ')}"><polygon points="8,66 ${coordinates.map(p=>p.x+','+p.y).join(' ')} 172,66" fill="var(--accent)" opacity=".1"/><polyline points="${coordinates.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2"/>${coordinates.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3" fill="var(--accent)"/>`).join('')}</svg>`:`<span class="profile-progress-empty">${m.sets?'Une autre séance dessinera ta courbe.':'Après tes premières séries.'}</span>`;
 return `<section class="profile-progress-section"><div class="profile-progress-heading"><h2>Mes progrès</h2><span aria-hidden="true">›</span></div><button type="button" class="profile-progress-link" data-action="account-progress" aria-label="Voir mon volume des quatre dernières semaines"><span class="profile-progress-copy">${icon('progress')}<span>Volume cumulé<strong>${m.sets?value:'Tes progrès commencent ici.'}</strong><small>${m.percent===null?'sur 4 semaines':'sur 4 semaines · vs période préc.'}</small></span></span>${chart}</button></section>`;
}
