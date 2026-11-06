// Pending invitations, scoped to the current account. Refreshes never rerender the workout.
import {icon} from './icons.js';
const empty=()=>({friends:0,goals:0,records:0});
const amount=n=>n>99?'99+':String(n);
export function createNotifications(accounts){
 let owner=null,counts=null,error=false,opened=false,flight=null,generation=0,timer=null,started=false,lastAttempt=0;
 const uid=()=>accounts.user?.id||null;
 function scope(){if(owner===uid())return;owner=uid();generation++;counts=null;error=false;opened=false;flight=null;lastAttempt=0;}
 const total=()=>counts?counts.friends+counts.goals+counts.records:0;
 const label=()=>`Notifications${total()?` · ${total()} invitation${total()>1?'s':''} en attente`:''}`;
 function badge(kind){scope();const n=kind==='total'?total():kind==='challenges'?(counts?.goals||0)+(counts?.records||0):counts?.friends||0;return `<span class="notification-count" data-notification-count="${kind}" aria-hidden="true" ${n?'':'hidden'}>${n?amount(n):''}</span>`;}
 function html(){scope();queueMicrotask(update);if(!owner||!accounts.service)return '';return `<button type="button" class="notification-bell" data-action="notifications-toggle" aria-label="${label()}" aria-expanded="${opened}" aria-controls="notifications-panel">${icon('bell')}${badge('total')}</button><section id="notifications-panel" class="notification-panel" aria-label="Notifications" ${opened?'':'hidden'}><div class="row between"><h2>Notifications</h2><button type="button" class="small" data-action="notifications-close" aria-label="Fermer les notifications">✕</button></div><p data-notification-status role="status"></p>${['friends','goals','records'].map(kind=>`<button type="button" class="notification-link wide" data-action="notifications-${kind}" hidden><span data-notification-label="${kind}"></span><span aria-hidden="true">→</span></button>`).join('')}<button type="button" class="small" data-action="notifications-retry" hidden>Réessayer</button></section>`;}
 function update(){scope();const values={...(counts||empty()),total:total(),challenges:(counts?.goals||0)+(counts?.records||0)};
  document.querySelectorAll('[data-notification-count]').forEach(el=>{const n=values[el.dataset.notificationCount]||0;el.textContent=n?amount(n):'';el.hidden=!n;});
  const bell=document.querySelector('[data-action="notifications-toggle"]');if(bell){bell.setAttribute('aria-label',label());bell.setAttribute('aria-expanded',String(opened));}
  for(const [tab,kind]of [['friends','friends'],['challenges','challenges']]){const el=document.querySelector(`[data-action="rank-tab:${tab}"]`);if(el)el.setAttribute('aria-label',(tab==='friends'?'Amis':'Défis')+(values[kind]?` · ${values[kind]} invitation${values[kind]>1?'s':''} en attente`:''));}
  const panel=document.getElementById('notifications-panel');if(!panel)return;panel.hidden=!opened;
  const text=panel.querySelector('[data-notification-status]');text.textContent=!navigator.onLine?'Hors connexion · actualisation à la reconnexion.':error?'Actualisation indisponible. Réessaie.':counts?total()?'Invitations en attente de ta réponse.':'Aucune invitation en attente.':'Recherche des invitations…';
  const labels={friends:n=>`${n} ${n>1?'demandes d’amis':'demande d’ami'}`,goals:n=>`${n} défi${n>1?'s':''} entre amis`,records:n=>`${n} défi${n>1?'s':''} de record`};
  for(const kind of ['friends','goals','records']){const el=panel.querySelector(`[data-action="notifications-${kind}"]`);el.hidden=!values[kind];panel.querySelector(`[data-notification-label="${kind}"]`).textContent=labels[kind](values[kind]);}
  const retry=panel.querySelector('[data-action="notifications-retry"]');retry.hidden=!error||!navigator.onLine;retry.disabled=!!flight;
 }
 async function refresh(force=false){scope();if(!owner||!accounts.service||!navigator.onLine||document.visibilityState==='hidden'){update();return;}if(flight)return flight.promise;if(!force&&Date.now()-lastAttempt<1000)return;lastAttempt=Date.now();const account=owner,token=generation;
  const task={promise:null};flight=task;
  task.promise=(async()=>{try{const data=await accounts.service.communityRpc('social_notifications',{},account);if(uid()!==account||token!==generation)return;
   if(!data||!['friends','goals','records'].every(k=>Number.isSafeInteger(data[k])&&data[k]>=0))throw Error('Invalid notifications');counts={friends:data.friends,goals:data.goals,records:data.records};error=false;
  }catch{if(uid()===account&&token===generation)error=true;}finally{if(flight===task)flight=null;update();}})();return task.promise;
 }
 function close(focus=false){opened=false;update();if(focus)document.querySelector('[data-action="notifications-toggle"]')?.focus();}
 async function action(key){if(key==='notifications-toggle'){scope();opened=!opened;update();if(opened)await refresh(true);return true;}if(key==='notifications-close'){close(true);return true;}if(key==='notifications-retry'){await refresh(true);return true;}return false;}
 function schedule(){clearInterval(timer);timer=null;if(document.visibilityState!=='hidden'&&navigator.onLine)timer=setInterval(()=>void refresh(true),30000);}
 function foreground(){scope();schedule();update();if(document.visibilityState!=='hidden')void refresh(true);}
 function start(){if(started)return;started=true;document.addEventListener('visibilitychange',foreground);window.addEventListener('focus',foreground);window.addEventListener('online',foreground);window.addEventListener('offline',foreground);window.addEventListener('pageshow',foreground);window.addEventListener('pagehide',()=>{clearInterval(timer);timer=null;});document.addEventListener('click',e=>{if(opened&&!e.target.closest('[data-action="notifications-toggle"],#notifications-panel'))close();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){e.preventDefault();close(true);}});accounts.onStatus?.(()=>{const changed=owner!==uid();scope();update();if(changed)void refresh(true);});schedule();void refresh(true);}
 return {html,badge,update,refresh,start,close,action};
}
