import {workoutBlocks,exerciseByKey,stepSet} from './groups.js';
// Defaults follow the existing group chronology; an explicit choice only affects this context.
export function restContext(session,exercise,group=null,stage=null){
 let kind='solo',seconds=exercise.rest;
 if(group&&stage){const at=group.steps.findIndex(s=>s.id===stage.id),next=group.steps.slice(at+1).find(s=>!stepSet(session,s)&&s.status!=='skipped');kind=next?(next.round===stage.round?'between':'round'):'end';seconds=next?(kind==='between'?group.restBetween:group.restAfter):0;if(next?.exerciseKey===stage.exerciseKey)seconds=Math.max(seconds,exerciseByKey(session,stage.exerciseKey).rest);if(!next){const blocks=workoutBlocks(session),index=blocks.findIndex(b=>b.group?.id===group.id);if(index>=0&&index<blocks.length-1)seconds=group.restAfter}}
 const key=exercise.instanceId+':'+(group?group.id+':':'')+kind,chosen=session.restChoices?.[key];return {key,seconds:Number.isInteger(chosen)&&chosen>=0&&chosen<=3600?chosen:seconds};
}
export function validRestSettings(session){return (session.restOverlayOpen===undefined||typeof session.restOverlayOpen==='boolean')&&(session.restChoices===undefined||session.restChoices&&typeof session.restChoices==='object'&&!Array.isArray(session.restChoices)&&Object.entries(session.restChoices).length<=10000&&Object.entries(session.restChoices).every(([key,n])=>key.length>0&&key.length<=10000&&Number.isInteger(n)&&n>=0&&n<=3600))}
export const restLabel=seconds=>seconds?Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'):'Sans repos';
