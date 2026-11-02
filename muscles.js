import {dayKey,dayOffset} from './tracking.js';
export const muscles=[['chest','Pectoraux'],['lats','Grands dorsaux'],['upper_back','Haut du dos'],['traps','Trapèzes'],['front_delts','Épaules · avant'],['side_delts','Épaules · côté'],['rear_delts','Épaules · arrière'],['biceps','Biceps'],['triceps','Triceps'],['forearms','Avant-bras'],['abs','Abdominaux'],['erectors','Lombaires'],['quads','Quadriceps'],['hamstrings','Ischio-jambiers'],['glutes','Fessiers'],['calves','Mollets'],['adductors','Adducteurs']];
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
export function defaultProfile(id){return structuredClone(defaults.get(id)||profile([]))}
export function validProfile(p){const valid=a=>Array.isArray(a)&&a.length<=muscles.length&&a.every(id=>muscles.some(([key])=>key===id))&&new Set(a).size===a.length;return !!p&&valid(p.primary)&&valid(p.secondary)&&!p.primary.some(id=>p.secondary.includes(id))&&(p.primary.length>0||p.secondary.length===0)}
export function validProfiles(profiles){return Array.isArray(profiles)&&profiles.every(p=>p&&typeof p.exerciseId==='string'&&p.exerciseId.length>0&&p.exerciseId.length<100000&&validProfile(p))&&new Set(profiles.map(p=>p.exerciseId)).size===profiles.length}
export function classifyExercise(e,profiles=[]){if(!e.muscles)e.muscles=structuredClone(profiles.find(p=>p.exerciseId===e.id)||defaultProfile(e.id));if(e.alternative)classifyExercise(e.alternative,profiles);return e}
export function weekStart(day=dayKey()){const d=new Date(day+'T12:00:00');return dayOffset(day,-((d.getDay()+6)%7))}
export function muscleVolume(sessions){const totals=Object.fromEntries(muscles.map(([id])=>[id,{primary:0,secondary:0,entries:[]}]));let unclassified=0,sets=0;for(const s of sessions)for(const e of s.exercises){const n=e.sets.filter(x=>x.type!=='warmup').length;if(!n)continue;sets+=n;const p=e.muscles||defaultProfile(e.id);if(!p.primary.length)unclassified+=n;for(const role of ['primary','secondary'])for(const id of p[role]){totals[id][role]+=n;totals[id].entries.push({session:s,exercise:e,count:n,role})}}return {totals,unclassified,sets}}
export function weekSessions(sessions,start){const end=dayOffset(start,6);return sessions.filter(s=>dayKey(s.date)>=start&&dayKey(s.date)<=end)}
