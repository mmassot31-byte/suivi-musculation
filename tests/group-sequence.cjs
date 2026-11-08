const assert=require('node:assert/strict');
(async()=>{
 const G=await import('../groups.js');
 const exercise=(key,n)=>({id:key,instanceId:key,name:key,sets:[],refs:[],plannedSets:n,rest:0});
 const config=(counts)=>({name:'Circuit',mode:'fixed',members:Object.keys(counts),counts,offsets:[],restBetween:3,restAfter:60});
 let c=config({A:5,B:3}),t={exercises:c.members.map(k=>exercise(k,c.counts[k]))};let g=G.configureGroup(t,c,false);
 assert.equal(g.steps.map(s=>s.exerciseKey).join(''),'ABABABAA');
 c=G.groupConfig(t,g);c.order=['B','A','A','B','A','B','A','A'];const ids=g.steps.map(s=>s.id);g=G.configureGroup(t,c,false);assert.equal(g.steps.map(s=>s.exerciseKey).join(''),'BAABABAA');assert.deepEqual(new Set(g.steps.map(s=>s.id)),new Set(ids));assert(G.validGroups(t));
 const saved=structuredClone(t);let fresh={exercises:structuredClone(t.exercises)};G.newSessionGroups(fresh,t.groups);assert.equal(fresh.groups[0].steps.map(s=>s.exerciseKey).join(''),'BAABABAA');assert(G.validGroups(fresh));assert.deepEqual(t,saved);
 c=G.groupConfig(t,g);c.counts.B=4;assert.equal(G.reconcileGroupOrder(c).join(''),'BAABABBAA');g=G.configureGroup(t,c,false);assert.equal(g.steps.filter(s=>s.exerciseKey==='B').length,4);
 c=G.groupConfig(t,g);c.counts.A=3;g=G.configureGroup(t,c,false);assert.equal(g.steps.map(s=>s.exerciseKey).join(''),'BAABABB');assert(G.validGroups(t));
 const done=g.steps[0];t.exercises[1].sets.push({id:'recorded',type:'work',w:10,r:8,groupId:g.id,groupStepId:done.id});const recorded=structuredClone(t.exercises[1].sets);c=G.groupConfig(t,g);c.counts.B=0;g=G.configureGroup(t,c,false);assert.equal(g.retainedSteps[0].id,done.id);assert.deepEqual(t.exercises[1].sets,recorded);assert(G.validGroups(t));
 // Eight independent members and unequal counts, reset and member removal.
 c=config({A:3,B:2,C:1,D:4,E:1,F:2,G:1,H:1});t={exercises:c.members.map(k=>exercise(k,c.counts[k]))};g=G.configureGroup(t,c,false);assert(G.validGroups(t));c=G.groupConfig(t,g);c.order=[...g.steps.map(s=>s.exerciseKey)].reverse();g=G.configureGroup(t,c,false);assert(G.validGroups(t));c=G.groupConfig(t,g);c.members=c.members.filter(k=>k!=='C');g=G.configureGroup(t,c,false);assert(!g.steps.some(s=>s.exerciseKey==='C'));delete c.order;g=G.configureGroup(t,c,false);assert.deepEqual(g.steps.map(s=>s.exerciseKey),G.automaticGroupOrder(c));assert(G.validGroups(t));
 // Execution uses the precise displayed sequence, and round rests remain deterministic.
 fresh={exercises:[exercise('A',2),exercise('B',2)]};c={...config({A:2,B:2}),order:['B','A','A','B']};g=G.configureGroup(fresh,c,false);const actual=[];for(let step=G.pendingStep(fresh,g);step;step=G.pendingStep(fresh,g)){actual.push(step.exerciseKey);G.exerciseByKey(fresh,step.exerciseKey).sets.push({id:crypto.randomUUID(),type:'work',w:1,r:1,groupStepId:step.id,groupId:g.id});G.advanceGroup(fresh,g,step);}assert.equal(actual.join(''),'BAAB');assert(G.validGroups(fresh));const {estimateDuration}=await import('../programming.js');assert.deepEqual(estimateDuration(fresh,{}).tasks.filter(task=>task.kind==='work').map(task=>task.exerciseKey),actual);
 const bad=structuredClone(fresh);bad.groups[0].order[0]='missing';assert.equal(G.validGroups(bad),false);
 // Quantity and identity invariants across a large selection of independent groups.
 for(let n=2;n<=8;n++)for(let round=0;round<12;round++){const counts=Object.fromEntries(Array.from({length:n},(_,i)=>[String(i),1+(i+round)%5])),plan={exercises:Object.keys(counts).map(k=>exercise(k,counts[k]))};let conf=config(counts),group=G.configureGroup(plan,conf,false);conf=G.groupConfig(plan,group);conf.order=[...group.steps.map(s=>s.exerciseKey)].reverse();for(const k of conf.members)conf.counts[k]=(Number(k)*2+round)%7;group=G.configureGroup(plan,conf,false);for(const k of conf.members)assert.equal(group.steps.filter(s=>s.exerciseKey===k).length,conf.counts[k]);assert(G.validGroups(plan));}
 console.log('PASS group sequences:5/3 alternating, personalised counts adjustment/reset,2–8 members, exact execution/rest grouping, immutable recorded steps, stable IDs, restart and validation.');
})().catch(e=>{console.error(e);process.exitCode=1});
