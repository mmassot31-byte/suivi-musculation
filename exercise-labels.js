// Presentation and search only: never rewrite saved names or exercise identities.
const groups=[
 ['Presse à cuisses',['Leg press']],
 ['Fentes bulgares',['Bulgarian split squat','Bulgarian squat']],
 ['Écarté inversé à la machine',['Machine reverse fly','Reverse pec deck']],
 ['Rotation interne de l’épaule',['Shoulder internal rotation']],
 ['Rotation externe de l’épaule',['Shoulder external rotation']],
 ['PAILs / RAILs · épaule',['PAILs','RAILs','pals','raill','Shoulder mobility']],
 ['Tapis de course',['Treadmill','Tapis']],
 ['Vélo',['Bike','Stationary bike']],
 ['Vélo elliptique',['Elliptical','Cross trainer']],
 ['Rameur',['Rowing machine','Ergometer']],
 ['Développé épaules',['Shoulder press','Shoulder dumbbell press','Overhead press']],
 ['Développé incliné',['Incliné chest press','Incline chest press','Incline bench press']],
 ['Développé décliné',['Décliné chest press','Decline chest press','Decline bench press']],
 ['Développé pectoraux',['Chest press']],
 ['Tirage horizontal',['Low row','Seated row','Cable row']],
 ['Tirage vertical',['Lat pulldown','Lat pull down','Pulldown']],
 ['Tirage vertical à la machine',['Lat pulldown machine']],
 ['Extension de hanche',['Hip thrust']],
 ['Pont fessier',['Glute bridge']],
 ['Extension du dos à la machine',['Back extension machine']],
 ['Écarté pectoraux',['Butterfly','Pec deck','Chest fly']],
 ['Dips à la machine',['Seated dips']],
 ['Élévations latérales',['Lateral raise','Lateral raises','Élévations latérales aux haltères']],
 ['Arrière d’épaule aux haltères',['Rear delt raise','Reverse fly']],
 ['Curl marteau',['Hammer curl']],
 ['Curl pupitre',['Preacher curl']],
 ['Tirage au visage',['Facepull','Face pull']],
 ['Développé couché',['Bench press','Barbell bench press']],
 ['Soulevé de terre roumain',['Romanian deadlift','RDL']],
 ['Extension des jambes',['Leg extension']],
 ['Flexion des jambes',['Leg curl']],
 ['Pendulum squat',['Squat pendulaire']]
];
const chestLabels=new Set(['Développé incliné','Développé décliné','Développé pectoraux','Développé couché','Écarté pectoraux']);
const searchTerms=label=>chestLabels.has(label)?['pectoraux','pecs','poitrine','chest']:[];
export const normalizeSearch=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const lookup=new Map(groups.flatMap(([label,aliases])=>[label,...aliases].map(x=>[normalizeSearch(x),{label,aliases}])));
export function exerciseLabel(name){return lookup.get(normalizeSearch(name))?.label||name||'Exercice'}
export function exerciseSearchText(name){const normalized=normalizeSearch(name),g=lookup.get(normalized)||groups.map(([label,aliases])=>({label,aliases,score:Math.max(0,...[label,...aliases].map(a=>normalized.includes(normalizeSearch(a))?normalizeSearch(a).length:0))})).filter(g=>g.score>0).sort((a,b)=>b.score-a.score)[0];return normalizeSearch([name,g?.label,...(g?.aliases||[]),...searchTerms(g?.label)].join(' '))}
export function matchesExercise(name,query){return exerciseSearchText(name).includes(normalizeSearch(query))}
export function exerciseSearchQueries(query){const q=normalizeSearch(query);if(q.length<2)return [query];const found=groups.filter(([label,aliases])=>[label,...aliases,...searchTerms(label)].some(x=>normalizeSearch(x).includes(q)));return [...new Set([query,...found.flatMap(([label,aliases])=>[label,...aliases])])].slice(0,32)}

export function exerciseNames(name){const item=lookup.get(normalizeSearch(name));return item?[item.label,...item.aliases]:[String(name||'Exercice')];}
