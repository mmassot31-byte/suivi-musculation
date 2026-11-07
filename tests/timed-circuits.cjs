const assert=require('node:assert/strict');
(async()=>{
 const timer=await import('../cardio-timer.js'),groups=await import('../groups.js'),{validActivity}=await import('../activity.js'),{sessionReadyToFinish}=await import('../workout-completion.js'),{cleanPlan}=await import('../planning.js'),{estimateDuration}=await import('../programming.js'),{defaultPreferences}=await import('../catalogue.js');
 const now=1800000000000,activity=(key,tracking='cardio')=>({id:key,instanceId:key,name:tracking==='mobility'?'Gainage':'Rameur',tracking,counter:'duration',plannedSets:0,refs:[],sets:[],rest:0,note:'',convention:'Sans charge',step:1,activityDurationSeconds:45,cardioDuration:3,activityEntries:[]});
 const t={exercises:[activity('a'),activity('b','mobility')]};
 const g=groups.configureGroup(t,{name:'Circuit',mode:'fixed',members:['a','b'],counts:{a:3,b:2},offsets:[],restBetween:0,restAfter:15});
 assert.deepEqual(g.steps.map(s=>s.exerciseKey),['a','b','a','b','a']);assert.deepEqual(t.exercises.map(e=>e.plannedSets),[0,0]);assert.deepEqual(groups.groupConfig(t,g).counts,{a:3,b:2});assert(groups.validGroups(t));
 const prefs={...defaultPreferences({templates:[],sessions:[]}),warmupMinutes:0,marginMinutes:0,transitionSeconds:0};const estimate=estimateDuration(t,prefs);assert.equal(estimate.tasks.filter(x=>x.kind==='cardio').length,5);assert.equal(estimate.workSets,0);assert.equal(estimate.seconds,45);
 for(let i=0;i<g.steps.length;i++){
  const step=groups.cursorStep(t,g),e=groups.exerciseByKey(t,step.exerciseKey);assert.equal(step,g.steps[i]);
  e.cardioTimer={...timer.startCardio(e,now+i*10000,'step'+i),groupId:g.id,groupStepId:step.id};assert(validActivity(e));assert(!sessionReadyToFinish(t));timer.finishCardio(e,now+i*10000+3000);assert.equal(timer.finishCardio(e,now+i*10000+4000),false);assert.equal(groups.stepSet(t,step).value,.05);groups.advanceGroup(t,g,step);assert(groups.validGroups(t));
 }
 assert.equal(estimateDuration(t,prefs,{remaining:true,nowMs:now+999999}).seconds,0);assert(sessionReadyToFinish(t));assert.deepEqual(t.exercises.map(e=>e.activityEntries.length),[3,2]);assert.equal(t.exercises.reduce((n,e)=>n+e.sets.length,0),0);
 assert.equal(groups.validGroups({...t,exercises:[{...t.exercises[0],activityEntries:{}}]}),false);
 const copy=structuredClone(t);copy.exercises[0].activityEntries.push({...copy.exercises[0].activityEntries[0],id:'duplicate'});assert(!groups.validGroups(copy));
 const plan=cleanPlan(t);assert(groups.validGroups(plan));assert(plan.exercises.every(e=>e.activityEntries.length===0&&!e.cardioTimer));assert.deepEqual(plan.exercises.map(timer.plannedPassages),[3,2]);assert(!sessionReadyToFinish(plan));
 const plank=activity('p','mobility');delete plank.cardioDuration;assert.equal(timer.plannedCardioSeconds(plank),45);assert(timer.isTimedExercise(plank));assert(!timer.isTimedExercise({...plank,name:'PAILs / RAILs · épaule'}));assert.equal(timer.plannedCardioSeconds({tracking:'cardio'}),600);
 for(const n of [-1,1.5,101])assert(!validActivity({...plank,activityRounds:n}));
 const modified=groups.configureGroup(t,{...groups.groupConfig(t,g),counts:{a:1,b:1}},false);assert.equal(modified.retainedSteps.length,3);assert(groups.validGroups(t));groups.dissociateGroup(t,g.id);assert(groups.validGroups(t));assert(t.exercises.every(e=>e.activityEntries.every(x=>!x.groupId&&!x.groupStepId)));
 // Existing linked history is copied without carrying completed entries into a new workout.
 const fresh=cleanPlan(plan);groups.newSessionGroups(fresh,plan.groups);assert.deepEqual(groups.groupConfig(fresh,fresh.groups[0]).counts,{a:3,b:2});assert(groups.validGroups(fresh));
 const mixed={exercises:[activity('a'),activity('b','mobility'),{id:'c',instanceId:'c',refs:[],plannedSets:1,sets:[],rest:0}]};const rotating=groups.configureGroup(mixed,{name:'Circuit alterné',mode:'rotating',members:['a','b','c'],common:'a',counts:{a:2,b:1,c:1},offsets:[],restBetween:0,restAfter:0});assert.deepEqual(rotating.steps.map(s=>s.exerciseKey),['a','b','a','c']);assert(groups.validGroups(mixed));
 console.log('PASS timed circuits: cardio + plank, asymmetric 3/2 rounds, same group chronology, one-time entries, zero fabricated strength sets, completion guard, stable group identities, clean plans/new sessions, preserved removed steps, dissociation and legacy seconds/minutes.');
})().catch(e=>{console.error(e);process.exitCode=1});
