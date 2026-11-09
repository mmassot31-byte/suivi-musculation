import {commonExercises} from '../exercise-catalogue.js';
// Explicit catalogue family IDs/legacy IDs only. Never substring matching on names.
const ids={chest_press:['elan-fam-developpe-couche','elan-fam-developpe-incline','elan-fam-developpe-decline'],shoulder_press:['elan-fam-developpe-epaules'],pulldown:['elan-fam-tirage-vertical','pulldown'],row:['elan-fam-rowing-horizontal'],squat_press:['elan-fam-squat','elan-fam-presse-a-cuisses','leg_press'],hip_thrust:['elan-fam-extension-de-hanche'],curl:['elan-fam-curl-biceps','curl'],triceps_extension:['elan-fam-extensions-triceps','triceps_extension']};
const legacy={chest_press:['Développé couché','Incliné chest press','Décliné chest press','Chest press'],shoulder_press:['Shoulder press'],pulldown:['Tirage vertical','lat-upper','lat-pull'],row:['Low row'],squat_press:['Pendulum squat'],hip_thrust:['Hip thrust','Glute bridge'],curl:['Curl biceps','Curl pupitre','Curl marteau'],triceps_extension:['Triceps haltère','Barre au front triceps','Triceps à la corde unilatéral']};
const lookup=new Map();for(const [family,fs] of Object.entries(ids))for(const e of commonExercises)if(fs.includes(e.familyId)){// Hip extension contains other movements: whitelist actual thrust/bridge variant keys.
 if(family==='hip_thrust'&&!['hip-thrust','glute-bridge'].includes(e.alternativeKey)&&!(e.legacyIds||[]).some(id=>legacy.hip_thrust.includes(id)))continue;
 for(const id of [e.id,...e.legacyIds||[],...e.legacyCanonicalIds||[]])lookup.set(id,family);
}for(const [family,list]of Object.entries(legacy))for(const id of list)lookup.set(id,family);
export const performanceFamily=e=>lookup.get(e?.libraryId)||lookup.get(e?.originExerciseId)||lookup.get(e?.id)||null;
export const familyMappings=Object.freeze(Object.fromEntries(lookup));
