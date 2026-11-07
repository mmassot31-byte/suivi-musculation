import {anatomicalMuscles,anatomicalProfile,weeklyProfile} from './muscles.js';
const labels=new Map(anatomicalMuscles);
export const validRadarSet=set=>!!set&&set.type!=='warmup'&&set.validated!==false&&(set.status===undefined||['validated','completed'].includes(set.status))&&Number.isFinite(set.w)&&set.w>=0&&Number.isInteger(set.r)&&set.r>0;
const asSessions=value=>Array.isArray(value)?value:value?[value]:[];
// Display groups only: stored classifications and the weekly volume engine stay intact.
export const radarGroups=[['chest','Pectoraux'],['lats','Grands dorsaux'],['upper_back','Haut du dos'],['shoulders','Épaules'],['elbow_flexors','Fléchisseurs du coude'],['triceps','Triceps'],['forearms','Avant-bras'],['abs','Abdominaux'],['erectors','Lombaires'],['quads','Quadriceps'],['hamstrings','Ischio-jambiers'],['glutes','Fessiers'],['calves','Mollets'],['adductors','Adducteurs']];
function displayProfile(p,exercise){
 // Existing anatomy distinguishes the elbow-flexion contribution of the forearm
 // during curls via the brachial. A wrist-only forearm profile stays separate.
 const known=anatomicalProfile({id:exercise.id,name:exercise.name});
 const elbow=[...known.primary,...known.secondary].includes('brachialis')&&[...p.primary,...p.secondary].includes('brachialis');
 const map=id=>id==='traps'?'upper_back':['front_delts','side_delts','rear_delts'].includes(id)?'shoulders':id==='biceps'||id==='forearms'&&elbow?'elbow_flexors':id;
 const folded=weeklyProfile(p),primary=[...new Set(folded.primary.map(map))];
 return {primary,secondary:[...new Set(folded.secondary.map(map))].filter(id=>!primary.includes(id))};
}

/** Pure, derived anatomy: a dropset is one exposure, no side/dumbbell multiplier. */
export function sessionMusclesDetailed(input){
 const totals=Object.fromEntries(anatomicalMuscles.map(([id,label])=>[id,{id,label,direct:0,secondary:0,entries:[]}]));
 const groupTotals=Object.fromEntries(radarGroups.map(([id,label])=>[id,{id,label,direct:0,secondary:0,total:0}]));
 let sets=0,unclassified=0;const sessionsSeen=new Set();
 for(const session of asSessions(input)){
  if(!session)continue;
  if(session.id&&sessionsSeen.has(session.id))continue;
  if(session.id)sessionsSeen.add(session.id);
  const setIds=new Set();
  for(const exercise of session.exercises||[]){
   const valid=(exercise.sets||[]).filter(set=>{
    if(!validRadarSet(set))return false;
    if(set.id&&setIds.has(set.id))return false;
    if(set.id)setIds.add(set.id);
    return true;
   });
   if(!valid.length)continue;
   for(const set of valid){
   const n=1,source=set.exerciseReference||exercise,p=anatomicalProfile(source);sets+=n;
   if(!p.primary.length)unclassified+=n;
   const grouped=displayProfile(p,source);
   for(const [role,field]of [['primary','direct'],['secondary','secondary']])for(const id of grouped[role])if(groupTotals[id])groupTotals[id][field]+=n;

   for(const [role,field] of [['primary','direct'],['secondary','secondary']])for(const id of p[role]){
    if(!totals[id])continue;
    totals[id][field]+=n;
    totals[id].entries.push({sessionId:session.id,exerciseId:source.id,exerciseName:source.name||source.id,count:n,role:field});
   }
   }
  }
 }
 const rows=anatomicalMuscles.map(([id])=>totals[id]).filter(row=>row.direct||row.secondary);
 for(const row of Object.values(groupTotals))row.total=row.direct+0.5*row.secondary;
 return {totals,rows,sets,unclassified,groupTotals};
}
/** All groups actually worked in the current session, with one common automatic scale. */
export function radarModel(current,comparison=null){
 const first=sessionMusclesDetailed(current),second=comparison?sessionMusclesDetailed(comparison):null;
 const detail=anatomicalMuscles.map(([id,label])=>({id,label,current:first.totals[id],comparison:second?.totals[id]||null})).filter(row=>row.current.direct||row.current.secondary||row.comparison?.direct||row.comparison?.secondary);
 const groups=radarGroups.map(([id,label])=>({id,label,current:first.groupTotals[id],comparison:second?.groupTotals[id]||null}));
 const axes=groups.filter(row=>row.current.total>0);
 const maximum=Math.max(0,...axes.map(row=>row.current.total));
 const step=maximum<=5?0.5:maximum<=10?1:maximum<=25?5:10**Math.max(1,Math.floor(Math.log10(maximum))-1);
 const scale=maximum?Math.ceil(maximum/step)*step:1;
 return {first,second,axes,detail,groups:groups.filter(row=>row.current.total||row.comparison?.total),omitted:0,scale,mode:axes.length===0?'empty':axes.length<3?'bars':'radar',compared:!!second};
}
export const radarData=(current,{comparisonSessions=null}={})=>radarModel(current,comparisonSessions);
export const muscleLabel=id=>labels.get(id)||id;
