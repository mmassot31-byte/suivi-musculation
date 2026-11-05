import {anatomicalMuscles,anatomicalProfile} from './muscles.js';
const labels=new Map(anatomicalMuscles);
export const validRadarSet=set=>!!set&&set.type!=='warmup'&&set.validated!==false&&(set.status===undefined||['validated','completed'].includes(set.status))&&Number.isFinite(set.w)&&set.w>=0&&Number.isInteger(set.r)&&set.r>0;
const asSessions=value=>Array.isArray(value)?value:value?[value]:[];
/** Pure, derived anatomy: a dropset is one exposure, no side/dumbbell multiplier. */
export function sessionMusclesDetailed(input){
 const totals=Object.fromEntries(anatomicalMuscles.map(([id,label])=>[id,{id,label,direct:0,secondary:0,entries:[]}]));
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
   const n=valid.length,p=anatomicalProfile(exercise);sets+=n;
   if(!p.primary.length)unclassified+=n;
   for(const [role,field] of [['primary','direct'],['secondary','secondary']])for(const id of p[role]){
    if(!totals[id])continue;
    totals[id][field]+=n;
    totals[id].entries.push({sessionId:session.id,exerciseId:exercise.id,exerciseName:exercise.name||exercise.id,count:n,role:field});
   }
  }
 }
 const rows=anatomicalMuscles.map(([id])=>totals[id]).filter(row=>row.direct||row.secondary);
 return {totals,rows,sets,unclassified};
}
/** Stable anatomical order, same axes and scale for both sessions. No target inference. */
export function radarModel(current,comparison=null,{maxAxes=8}={}){
 const first=sessionMusclesDetailed(current),second=comparison?sessionMusclesDetailed(comparison):null;
 const active=anatomicalMuscles.map(([id,label],order)=>({id,label,order,current:first.totals[id],comparison:second?.totals[id]||null})).filter(row=>row.current.direct||row.current.secondary||row.comparison?.direct||row.comparison?.secondary);
 const cap=Math.max(3,Math.min(8,Math.floor(Number(maxAxes)||8)));
 // Keep the largest assigned exposures, retaining a consistent anatomical order.
 const axes=[...active].sort((a,b)=>Math.max(b.current.direct+b.current.secondary,(b.comparison?.direct||0)+(b.comparison?.secondary||0))-Math.max(a.current.direct+a.current.secondary,(a.comparison?.direct||0)+(a.comparison?.secondary||0))||a.order-b.order).slice(0,cap).sort((a,b)=>a.order-b.order);
 const maximum=Math.max(1,...axes.flatMap(row=>[row.current.direct,row.current.secondary,row.comparison?.direct||0,row.comparison?.secondary||0]));
 const scale=maximum<=5?5:Math.ceil(maximum/5)*5;
 return {first,second,axes,detail:active,omitted:active.length-axes.length,scale,mode:active.length===0?'empty':active.length<3?'bars':'radar',compared:!!second};
}
export const radarData=(current,{comparisonSessions=null,maxAxes=8}={})=>radarModel(current,comparisonSessions,{maxAxes});
export const muscleLabel=id=>labels.get(id)||id;
