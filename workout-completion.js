// UI availability only: finishing still runs the existing confirmation and save path.
import {isActivity,counters} from './activity.js';
import {recordedSets} from './achievements.js';
import {plannedSets} from './volume.js';
import {groupForExercise,pendingStep,stepSet,exerciseByKey} from './groups.js';
const hasActivity=e=>(e.activityEntries||[]).some(x=>counters[x.counter]&&Number.isFinite(x.value)&&x.value>0);
export function sessionReadyToFinish(session){
 const exercises=session?.exercises||[];
 if(!exercises.length||!exercises.some(e=>isActivity(e)?hasActivity(e):recordedSets(e).length))return false;
 if(exercises.some(e=>e.cardioTimer&&e.cardioTimer.status!=='finished'))return false;
 return exercises.every(e=>{
  if(isActivity(e))return hasActivity(e);
  const group=groupForExercise(session,e.instanceId);
  if(group)return !pendingStep(session,group)&&group.steps.every(step=>step.status==='skipped'||recordedSets(exerciseByKey(session,step.exerciseKey)).includes(stepSet(session,step)));
  return recordedSets(e).length>=plannedSets(e);
 });
}
