// History presentation only: reuse recorded-work and duration helpers, never change the document.
import {activitySummary,durationLabel,escapeHtml} from './design-ui.js';
import {dayKey} from './tracking.js';
import {workoutTypeIcon} from './pictograms.js';
import {icon} from './icons.js';
const esc=escapeHtml;

export function historySessionFacts(session){
 const m=activitySummary([session]);
 return{sets:m.sets,minutes:m.measured?m.minutes:null,duration:m.measured?durationLabel(m.minutes):'—',exercises:(session.exercises||[]).length};
}

export function historySelectedDay(month,selection,sessions,today=dayKey()){
 if(selection&&selection.startsWith(month+'-'))return selection;
 const latest=(sessions||[]).map(s=>dayKey(s.date)).filter(d=>d.startsWith(month+'-')&&d<=today).sort().at(-1);
 return latest||(today.startsWith(month+'-')?today:month+'-01');
}

export function historyDayHtml(day,sessions){
 const list=sessions.filter(s=>dayKey(s.date)===day).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
 const label=new Date(day+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
 return `<aside class="history-day-summary" aria-label="Séances du ${esc(label)}">
  <h2><time datetime="${esc(day)}">${esc(label)}</time>${list.length>1?`<small>${list.length} séances</small>`:''}</h2>
  ${list.length?`<div class="history-day-sessions">${list.map(s=>{
   const m=historySessionFacts(s);
   return `<div class="history-day-item">
    <button type="button" class="history-day-open" data-action="history-day-open:${esc(s.id)}" aria-label="Voir la séance ${esc(s.name)} du ${esc(label)}">${workoutTypeIcon(s)}<strong>${esc(s.name)}</strong><span class="history-chevron" aria-hidden="true">›</span></button>
    <dl class="history-day-facts">
     <div><dt>${icon('tonnage')}<span class="sr-only">Séries</span></dt><dd>${m.sets} séries</dd></div>
     <div><dt>${icon('timer')}<span class="sr-only">Durée enregistrée</span></dt><dd>${m.duration}</dd></div>
     <div><dt>${icon('barbell')}<span class="sr-only">Exercices</span></dt><dd>${m.exercises} exercice${m.exercises>1?'s':''}</dd></div>
    </dl>
   </div>`;
  }).join('')}</div>`:'<p class="history-day-empty">Aucune séance ce jour.</p>'}
 </aside>`;
}

export function historySessionRow(session){
 const m=historySessionFacts(session),date=new Date(session.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'});
 return `<article class="history-session">
  <button type="button" class="history-session-open" data-action="detail:${esc(session.id)}" aria-label="Voir ${esc(session.name)} du ${esc(date)}, ${m.sets} séries, ${m.exercises} exercices">
   <span class="history-row-icon">${workoutTypeIcon(session)}</span>
   <span class="history-row-name"><strong>${esc(session.name)}</strong><small>${esc(date)}${m.minutes!==null?' · '+esc(m.duration):''}</small></span>
   <span class="history-row-number">${icon('tonnage')}<span>${m.sets} <small>séries</small></span></span>
   <span class="history-row-number">${icon('barbell')}<span>${m.exercises} <small>exos</small></span></span>
   <span class="history-chevron" aria-hidden="true">›</span>
  </button>
 </article>`;
}
