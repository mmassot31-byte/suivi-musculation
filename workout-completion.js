// UI availability only: finishing still runs the existing confirmation and save path.
import {isActivity,counters} from './activity.js';
import {recordedSets} from './achievements.js';
import {plannedSets} from './volume.js';
import {plannedPassages} from './cardio-timer.js';
import {groupForExercise,pendingStep,stepSet,exerciseByKey} from './groups.js';
const hasActivity=e=>(e.activityEntries||[]).some(x=>counters[x.counter]&&Number.isFinite(x.value)&&x.value>0);
export function sessionReadyToFinish(session){
 const exercises=session?.exercises||[];
 if(!exercises.length||!exercises.some(e=>isActivity(e)?hasActivity(e):recordedSets(e).length))return false;
 if(exercises.some(e=>e.cardioTimer&&e.cardioTimer.status!=='finished'))return false;
 return exercises.every(e=>{
  const group=groupForExercise(session,e.instanceId);
  if(group)return !pendingStep(session,group)&&group.steps.every(step=>{if(step.status==='skipped')return true;const exercise=exerciseByKey(session,step.exerciseKey),entry=stepSet(session,step);return isActivity(exercise)?!!entry&&!!counters[entry.counter]&&Number.isFinite(entry.value)&&entry.value>0:recordedSets(exercise).includes(entry)});
  if(isActivity(e))return (e.activityEntries||[]).filter(x=>counters[x.counter]&&Number.isFinite(x.value)&&x.value>0).length>=plannedPassages(e);
  return recordedSets(e).length>=plannedSets(e);
 });
}
