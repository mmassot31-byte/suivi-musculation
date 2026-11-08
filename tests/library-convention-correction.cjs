const assert=require('node:assert/strict');
(async()=>{
 const {conventionCorrectionPreview,correctExerciseConvention,restoreLoadConventions}=await import('../load-normalization.js');
 const definition={id:'personal:curl',name:'Curl personnel',libraryScope:'personal',equipment:'dumbbell',measurement:'external_load',muscles:{primary:['brachialis'],secondary:['biceps','forearms']},loadMode:'unilateral'};
 const ref={...definition,libraryId:definition.id},set=(id,extra={})=>({id,w:16,r:10,type:'work',notes:'conservée',...extra}),exercise={...ref,instanceId:'curl',sets:[set('target'),set('snapshot',{exerciseReference:{...ref,name:'Ancien nom'}}),set('pounds',{loadIdentity:{version:1,unit:'lb',convention:'Total',lateralMode:'total',source:'entry'}}),set('machine',{exerciseReference:{...ref,equipment:'machine'}}),set('other',{exerciseReference:{...ref,id:'personal:other',libraryId:'personal:other'}})]};
 const state={sessions:[{id:'past',date:'2026-11-01',exercises:[exercise]}],active:{id:'active',exercises:[{...ref,sets:[set('active')]}]},templates:[],exerciseLibrary:{common:[],personal:[definition],pending:[],aliases:[]}};
 const original=structuredClone(state),p=conventionCorrectionPreview(state,definition.id);assert.equal(p.items.length,2);assert.equal(p.sessions,1);assert.equal(p.excluded,2);
 const result=correctExerciseConvention(state,definition.id,'unilateral');assert.equal(result.changed,2);assert.deepEqual(state,original);assert.deepEqual(result.state.active,original.active);
 const before=state.sessions[0].exercises[0].sets,after=result.state.sessions[0].exercises[0].sets;
 for(let i=0;i<2;i++){assert.equal(after[i].loadMode,'unilateral');assert.equal(after[i].loadProtocol,'elan-2');for(const key of ['w','r','notes','exerciseReference'])assert.deepEqual(after[i][key],before[i][key]);}
 for(let i=2;i<before.length;i++)assert.deepEqual(after[i],before[i]);
 const journal=result.state.loadConventionMigrations[0],restored=restoreLoadConventions(result.state,journal.id);assert.deepEqual(restored.sessions,original.sessions);
 const newer=correctExerciseConvention(result.state,definition.id,'bilateral');assert.throws(()=>restoreLoadConventions(newer.state,journal.id),/plus récente/);
 assert.throws(()=>correctExerciseConvention(state,definition.id,'invalid'),/invalide/);
 assert.deepEqual(state,original);
 console.log('PASS direct convention correction: exact reference/snapshot, equipment and metric boundaries, saved sessions only, immutable values/notes, exclusion of pounds, journal/undo and conflict protection.');
})().catch(e=>{console.error(e);process.exitCode=1});
