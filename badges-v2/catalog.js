// IDs are public contracts: labels and future reward policies must not rename them.
export const catalogVersion = 2;
export const categories = Object.freeze([
  {id:'muscle_volume', label:'Volume musculaire', slots:48},
  {id:'performance', label:'Performance', slots:48},
  {id:'tonnage', label:'Tonnage', slots:12},
  {id:'consistency', label:'Régularité', slots:18},
  {id:'secrets', label:'Secrets', slots:12},
  {id:'feats', label:'Exploits', slots:12},
].map(Object.freeze));
export const muscleGroups = Object.freeze([
  ['chest','Pectoraux'], ['lats','Grand dorsal'], ['shoulders','Épaules'],
  ['biceps','Biceps'], ['triceps','Triceps'], ['quads','Quadriceps'],
  ['glutes','Fessiers'], ['calves','Mollets'],
].map(([id,label])=>Object.freeze({id,label})));
export const thresholds = Object.freeze([25,100,250,500,1000,2500]);
export const rarities = Object.freeze(['common','uncommon','rare','epic','legendary','mythic']);
const reward = Object.freeze({xp:null, status:'pending_policy', grantEnabled:false});
const volume = muscleGroups.flatMap(({id,label})=>thresholds.map((threshold,i)=>({
  id:`v2.muscle_volume.${id}.${threshold}`, version:2, category:'muscle_volume',
  label:`${label} · ${threshold} séries directes`, status:'calculable',
  rarity:rarities[i], condition:Object.freeze({kind:'cumulative_direct_work_sets', muscle:id, threshold}),
  reward,
})));
const reserved = categories.filter(c=>c.id!=='muscle_volume').flatMap(c=>
  Array.from({length:c.slots},(_,i)=>({
    id:`v2.${c.id}.slot_${String(i+1).padStart(2,'0')}`, version:2,
    category:c.id, label:null, status:'reserved', rarity:null, condition:null, reward,
  })));
export const catalog = Object.freeze([...volume,...reserved].map(Object.freeze));
