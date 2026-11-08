// Presentation and per-account bookmarks only. Exercise definitions and IDs stay intact.
import {commonExercises} from './exercise-catalogue.js';
import {canonicalExerciseId} from './exercise-reference.js';
import {normalizeSearch} from './exercise-labels.js';
const families=new Map(commonExercises.filter(e=>e.candidateId).map(e=>[e.familyId,e.familyLabel]));
export const pickerFavoriteId=e=>canonicalExerciseId(e)||e.id;
export const pickerFavoriteIds=state=>new Set((state.exerciseFavorites||[]).map(id=>pickerFavoriteId({id,libraryId:id})));
export const validExerciseFavorites=value=>value===undefined||Array.isArray(value)&&value.length<=2000&&value.every(id=>typeof id==='string'&&id.length>0&&id.length<=5000)&&new Set(value).size===value.length;
export const mergeExerciseFavorites=(a=[],b=[])=>[...new Set([...a,...b])];
export function pickerRecentIds(state){return new Set((state.sessions||[]).filter(s=>Number.isFinite(Date.parse(s.date))&&Date.parse(s.date)<=Date.now()).flatMap(s=>s.exercises.map(pickerFavoriteId)));}
function movement(e){
 const id=e.catalogueFamilyId||e.familyId,label=families.get(id),name=normalizeSearch(e.name);
 if(e.libraryScope==='personal'||!label||label!==e.familyLabel)return null;
 let title=label,prefix=label;
 if(label==='Développé couché'&&name.startsWith('floor press'))title=prefix='Floor press';
 if(label==='Squat'&&name.startsWith('squat bulgare'))title=prefix='Squat bulgare';
 if(label==='Soulevé de terre'&&!name.startsWith('souleve de terre'))return null;
 if(label==='Tirage vertical'&&name.startsWith('pullover')){title='Pull-over';prefix='Pullover';}
 if(label==='Pompes et dips'){const match=['Pompes','Dips'].find(p=>name.startsWith(normalizeSearch(p)));if(!match)return null;title=prefix=match;}
 if(label==='Fentes'&&name.startsWith('step-up'))title=prefix='Step-up';
 if(label==='Extension de jambes'&&!name.startsWith('leg extension'))return null;
 if(label==='Extension de hanche'){
  const match=['Hip thrust','Glute bridge','Kickback'].find(p=>name.startsWith(normalizeSearch(p)));if(!match)return null;title=prefix=match;
 }
 if(label==='Abduction et adduction'){
  if(/^abduct|^abduction/.test(name)){title='Abduction de hanche';prefix='Abduction hanche';}
  else if(/^adduct|^adduction/.test(name)){title='Adduction de hanche';prefix='Adduction hanche';}else return null;
 }
 if(label==='Arrière épaules'){
  if(name.startsWith('face pull'))title=prefix='Face pull';
  else if(name.startsWith('oiseau')||name.startsWith('reverse pec deck')){title='Écartés inversés';prefix='Oiseau';}else return null;
 }
 if(label==='Trapèzes'){if(!name.startsWith('shrug'))return null;title=prefix='Shrug';}
 if(label==='Mollets'&&name.startsWith('tibialis'))return null;
 if(label==='Extensions triceps'&&name.startsWith('jm press'))return null;
 if(label==='Avant-bras'){
  const match=['Flexion poignets','Extension poignets'].find(p=>name.startsWith(normalizeSearch(p)));if(!match)return null;title=prefix=match;
 }
 if(label==='Abdominaux'){
  const match=['Crunch','Relevé de jambes','Relevé de genoux','Planche'].find(p=>name.startsWith(normalizeSearch(p)));if(!match)return null;title=prefix=match;
 }
 if(label==='Cardio'){
  if(/tapis/.test(name)){title='Tapis de course';prefix=/^marche/.test(name)?'':/^course/.test(name)?'':'Tapis';}
  else if(name.startsWith('velo ')&&!name.includes('elliptique'))title=prefix='Vélo';else return null;
 }
 if(label==='Conditionnement')return null;
 return {key:id+':'+title,title,prefix};
}
function variantName(e,group){
 let name=e.name;if(group.prefix&&normalizeSearch(name).startsWith(normalizeSearch(group.prefix)+' '))name=name.slice(group.prefix.length).trim();
 if(name===e.name){const prefixes={'Écartés pectoraux':'Écartés','Rowing horizontal':'Rowing','Curl biceps':'Curl','Extensions triceps':'Extension triceps'};const prefix=prefixes[group.title];if(prefix&&normalizeSearch(name).startsWith(normalizeSearch(prefix)+' '))name=name.slice(prefix.length).trim();}
 return name?name[0].toLocaleUpperCase('fr')+name.slice(1):e.name;
}
export function pickerGroups(choices){
 const groups=new Map();for(const [index,exercise]of choices.entries()){const group=movement(exercise),key=group?.key||'exercise:'+index;if(!groups.has(key))groups.set(key,{key,title:group?.title||exercise.name,grouped:!!group,entries:[]});groups.get(key).entries.push({exercise,index,label:group?variantName(exercise,group):exercise.name});}
 return [...groups.values()].map(g=>g.entries.length>1?g:{...g,grouped:false,entries:g.entries.map(x=>({...x,label:x.exercise.name}))});
}
export const pickerStar=()=>'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.6l6.2-.9Z"/></svg>';
