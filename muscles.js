import {dayKey,dayOffset} from './tracking.js';
export const muscles=[['chest','Pectoraux'],['lats','Grands dorsaux'],['upper_back','Haut du dos'],['traps','Trapèzes'],['front_delts','Épaules · avant'],['side_delts','Épaules · côté'],['rear_delts','Épaules · arrière'],['biceps','Biceps'],['triceps','Triceps'],['forearms','Avant-bras'],['abs','Abdominaux'],['erectors','Lombaires'],['quads','Quadriceps'],['hamstrings','Ischio-jambiers'],['glutes','Fessiers'],['calves','Mollets'],['adductors','Adducteurs']];
// The weekly reference remains 17 groups. Anatomy can distinguish elbow flexors
// without inventing a separate weekly target or rewriting stored profiles.
export const anatomicalMuscles=[...muscles,['brachialis','Brachial']];
const profile=(primary,secondary=[])=>({primary,secondary});
const defaults=new Map();
function register(ids,primary,secondary=[]){for(const id of ids)defaults.set(id,profile(primary,secondary))}
register(['Pendulum squat'],['quads'],['glutes','adductors']);
register(['Machine à mollets'],['calves']);register(['Hip thrust','Glute bridge'],['glutes'],['hamstrings']);register(['Adducteurs'],['adductors']);
register(['Shoulder press'],['front_delts'],['side_delts','triceps']);
register(['Incliné chest press','Décliné chest press','Développé couché','Chest press'],['chest'],['front_delts','triceps']);
register(['Low row'],['upper_back'],['lats','biceps','rear_delts']);
register(['Tirage vertical','lat-upper','lat-pull'],['lats'],['biceps','upper_back']);
register(['Élévations latérales aux haltères','laterales-push'],['side_delts']);
register(['Curl biceps','Curl pupitre'],['biceps']);register(['Curl marteau'],['biceps'],['forearms']);
register(['Triceps haltère','Barre au front triceps','Triceps à la corde unilatéral'],['triceps']);
register(['Tirage menton à la barre'],['side_delts','traps'],['biceps']);
register(['Rear delt barre','Arrière d’épaule aux haltères'],['rear_delts'],['upper_back']);register(['Butterfly'],['chest']);
register(['Facepull'],['rear_delts','upper_back'],['traps']);register(['Seated dips'],['triceps'],['chest','front_delts']);
// Back extension machines vary by movement and setup: leave them to classify.
export function defaultProfile(id){return structuredClone(defaults.get(id)||curlDefault(id)||profile([]))}
export function validProfile(p){const valid=a=>Array.isArray(a)&&a.length<=anatomicalMuscles.length&&a.every(id=>anatomicalMuscles.some(([key])=>key===id))&&new Set(a).size===a.length;return !!p&&valid(p.primary)&&valid(p.secondary)&&!p.primary.some(id=>p.secondary.includes(id))&&(p.primary.length>0||p.secondary.length===0)}
export function validProfiles(profiles){return Array.isArray(profiles)&&profiles.every(p=>p&&typeof p.exerciseId==='string'&&p.exerciseId.length>0&&p.exerciseId.length<100000&&validProfile(p))&&new Set(profiles.map(p=>p.exerciseId)).size===profiles.length}
export function classifyExercise(e,profiles=[]){if(!e.muscles)e.muscles=structuredClone(profiles.find(p=>p.exerciseId===e.id)||defaultProfile(e.id));if(e.alternative)classifyExercise(e.alternative,profiles);return e}
export function weekStart(day=dayKey()){const d=new Date(day+'T12:00:00');return dayOffset(day,-((d.getDay()+6)%7))}
export function muscleVolume(sessions){const totals=Object.fromEntries(muscles.map(([id])=>[id,{primary:0,secondary:0,entries:[]}]));let unclassified=0,sets=0;for(const s of sessions)for(const e of s.exercises){const n=e.sets.filter(x=>x.type!=='warmup'&&x.validated!==false&&(x.status===undefined||['validated','completed'].includes(x.status))).length;if(!n)continue;sets+=n;const p=e.muscles||defaultProfile(e.id);if(!p.primary.length)unclassified+=n;for(const role of ['primary','secondary'])for(const id of new Set(p[role])){if(!totals[id]||(role==='secondary'&&p.primary.includes(id)))continue;totals[id][role]+=n;totals[id].entries.push({session:s,exercise:e,count:n,role})}}return {totals,unclassified,sets}}
export function weekSessions(sessions,start){const end=dayOffset(start,6);return sessions.filter(s=>dayKey(s.date)>=start&&dayKey(s.date)<=end)}

/** Folding is per series/profile, never the sum of separate muscle counters. */
export function weeklyProfile(p){
 const map=id=>id==='brachialis'?'biceps':id;
 const primary=[...new Set((p?.primary||[]).map(map))];
 return {primary,secondary:[...new Set((p?.secondary||[]).map(map))].filter(id=>!primary.includes(id))};
}
const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
const curlFamilies=new Map([
 ...['Curl biceps','Curl pupitre','Curl incliné','Curl incliné aux haltères','Incline dumbbell curl','Curl à la poulie','Curl poulie','Cable curl','Biceps curl','Curl barre','Curl à la barre','Curl barre EZ'].map(x=>[normalized(x),'classic']),
 ...['Curl marteau','Curl marteau aux haltères','Hammer curl','Curl marteau à la corde','Curl marteau poulie'].map(x=>[normalized(x),'hammer']),
 ...['Curl inversé','Curl inverse','Reverse curl','Curl pronation','Curl inversé à la barre','Curl inversé à la poulie'].map(x=>[normalized(x),'reverse'])
]);
function curlDefault(id){
 const family=curlFamilies.get(normalized(id));
 return family?profile(['biceps'],family==='classic'?[]:['forearms']):null;
}
const sameProfile=(a,b)=>['primary','secondary'].every(role=>JSON.stringify([...(a?.[role]||[])].sort())===JSON.stringify([...(b?.[role]||[])].sort()));
/** Anatomical display only. Explicit personal classifications always win. */
export function anatomicalProfile(exercise){
 const stored=exercise?.muscles,base=stored||defaultProfile(exercise?.id);
 const family=curlFamilies.get(normalized(exercise?.id))||curlFamilies.get(normalized(exercise?.name));
 const fallback=defaultProfile(exercise?.id);
 // A changed classification, including an explicit brachial choice, is authoritative.
 if(!family||stored&&!stored.primary?.length||stored&&!sameProfile(stored,fallback)&&!(fallback.primary.length===0&&sameProfile(stored,{primary:['biceps'],secondary:[]})))return cleanAnatomicalProfile(base);
 if(family==='hammer')return profile(['brachialis'],['biceps','forearms']);
 if(family==='reverse')return profile(['brachialis','forearms'],['biceps']);
 return profile(['biceps'],['brachialis']);
}
export const anatomyProfile=anatomicalProfile;
export function cleanAnatomicalProfile(p){
 const known=new Set(anatomicalMuscles.map(([id])=>id));
 const primary=[...new Set(p?.primary||[])].filter(id=>known.has(id));
 return {primary,secondary:[...new Set(p?.secondary||[])].filter(id=>known.has(id)&&!primary.includes(id))};
}

/** Weekly elbow-flexor union; no extra target and no duplicated direct/secondary set. */
export function weeklyMuscleVolume(sessions){
 return muscleVolume(sessions.map(s=>({...s,exercises:(s.exercises||[]).map(e=>({...e,muscles:weeklyProfile(anatomicalProfile(e))}))})));
}
