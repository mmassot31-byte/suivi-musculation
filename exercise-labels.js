// Presentation and search only: never rewrite saved names or exercise identities.
const groups=[
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
export const normalizeSearch=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const lookup=new Map(groups.flatMap(([label,aliases])=>[label,...aliases].map(x=>[normalizeSearch(x),{label,aliases}])));
export function exerciseLabel(name){return lookup.get(normalizeSearch(name))?.label||name||'Exercice'}
export function exerciseSearchText(name){const normalized=normalizeSearch(name),g=lookup.get(normalized)||groups.map(([label,aliases])=>({label,aliases})).find(g=>[g.label,...g.aliases].some(a=>normalized.includes(normalizeSearch(a))));return normalizeSearch([name,g?.label,...(g?.aliases||[])].join(' '))}
export function matchesExercise(name,query){return exerciseSearchText(name).includes(normalizeSearch(query))}
export function exerciseSearchQueries(query){const q=normalizeSearch(query);if(q.length<2)return [query];const found=groups.filter(([label,aliases])=>[label,...aliases].some(x=>normalizeSearch(x).includes(q)));return [...new Set([query,...found.flatMap(([label,aliases])=>[label,...aliases])])].slice(0,12)}
