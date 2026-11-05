// Presentation only: never reads or writes training/account storage.
import {icon} from './icons.js';
import {exerciseProfile} from './catalogue.js';
const app=document.getElementById('app');
function glyph(host,name,cls='exercise-icon'){
 if(!host||host.querySelector('.'+cls))return;
 const tile=document.createElement('span');tile.className=cls;tile.setAttribute('aria-hidden','true');tile.innerHTML=icon(name);host.prepend(tile);
}
function exerciseGlyph(host){
 if(!host||host.querySelector('.exercise-icon'))return;
 const name=host.textContent.trim(),profile=exerciseProfile({id:name,name});
 let type=profile.equipment;
 if(/kettlebell/i.test(name))type='kettlebell';
 glyph(host,({dumbbell:'dumbbell',barbell:'barbell',cable:'cable',machine:'machine',bodyweight:'movement',kettlebell:'kettlebell'})[type]||'movement');
}
function decorate(){
 for(const b of app.querySelectorAll('nav [data-action^="nav:"]')){
  if(b.querySelector('.ico'))continue;
  const key=b.dataset.action.slice(4),label=b.textContent.trim().replace(/^[^\p{L}]+/u,'');
  b.innerHTML=icon(key)+`<span>${label}</span>`;
  if(b.classList.contains('active'))b.setAttribute('aria-current','page');
 }
 app.querySelector('nav')?.setAttribute('aria-label','Navigation principale');
 const brand=app.querySelector('.brand');
 if(brand&&!brand.querySelector('.ico'))brand.innerHTML=icon('bolt')+' élan<span>.</span>';

 for(const el of app.querySelectorAll('#exercise-entry h2,.exercise-open .grow>strong,.exercise-choice>strong,.model-plan-header h3,.profile-record h3'))exerciseGlyph(el);
 for(const span of app.querySelectorAll('.exercise-state')){
  if(span.textContent.trim()==='✓'){span.innerHTML=icon('check');span.closest('.exercise-summary')?.classList.add('exercise-complete')}
 }
 for(const el of app.querySelectorAll('.record-card h2')){
  const span=el.querySelector('span');if(span&&!span.dataset.icon){span.innerHTML=icon(/Tonnage/.test(el.textContent)?'tonnage':'barbell');span.dataset.icon='true'}
 }
 for(const el of app.querySelectorAll('.record-pair>div>small')){
  if(!el.querySelector('.ico'))el.insertAdjacentHTML('afterbegin',icon(/Tonnage/.test(el.textContent)?'tonnage':'barbell'));
 }
 for(const el of document.querySelectorAll('.achievement-badge')){
  if(!el.querySelector('.ico'))el.insertAdjacentHTML('afterbegin',icon(el.classList.contains('achievement-weight')?'barbell':el.classList.contains('achievement-tonnage')?'tonnage':'reps'));
 }
 for(const el of app.querySelectorAll('.recap-exercise h3'))exerciseGlyph(el);
 for(const el of app.querySelectorAll('.empty'))glyph(el,'movement','empty-icon');
 const rest=app.querySelector('#rest-dialog');
 if(rest&&!rest.querySelector('.rest-meter')){
  const meter=document.createElement('div');meter.className='rest-meter';meter.setAttribute('aria-hidden','true');meter.innerHTML='<i></i>';rest.querySelector('#rest-countdown').after(meter);
  rest.dataset.duration=String(parseTime(rest.querySelector('#rest-countdown').textContent));
 }
 const meter=rest?.querySelector('.rest-meter i');
 if(meter){const remaining=parseTime(rest.querySelector('#rest-countdown').textContent),duration=Number(rest.dataset.duration);meter.style.width=`${duration?Math.max(0,Math.min(100,remaining/duration*100)):0}%`}
}
function parseTime(s){const p=s.trim().split(':').map(Number);return p.length===2?p[0]*60+p[1]:0}
let scheduled=false;
new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate()})}).observe(app,{childList:true,subtree:true});
decorate();
