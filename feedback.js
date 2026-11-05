// Ephemeral presentation only: no storage, writes, replay queue or navigation delays.
export function createTrainingFeedback(){
 let element=null,expiry=null,enter=null;
 const seen=new Set();
 function clear(){clearTimeout(expiry);clearTimeout(enter);element?.remove();element=null;}
 function relocate(){
  if(!element)return;
  const slot=document.querySelector('#rest-dialog[open] .rest-feedback-slot')||document.querySelector('.work-feedback-slot');
  if(!slot){clear();return;}
  if(element.parentElement!==slot){if(element.parentElement)element.classList.remove('feedback-enter');slot.append(element);}
 }
 function show({key,kind,html}){
  if(seen.has(key))return;
  seen.add(key);clear();
  element=document.createElement('aside');element.className='set-feedback feedback-'+kind+(kind==='record'?' achievement-toast':'');
  element.dataset.feedbackKey=key;element.setAttribute('role','status');element.setAttribute('aria-live','polite');element.setAttribute('aria-atomic','true');element.innerHTML=html;
  relocate();if(!element)return;
  element.classList.add('feedback-enter');const current=element;
  enter=setTimeout(()=>current.classList.remove('feedback-enter'),400);
  expiry=setTimeout(clear,kind==='record'?5500:kind==='progress'?4000:2200);
  if(kind==='record'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){try{navigator.vibrate?.([12,40,12]);}catch{ /* Optional hardware feedback must never affect a saved set. */ }}
 }
 return {show,clear,relocate};
}
