const assert=require('node:assert/strict');
(async()=>{
 const m=await import('../muscles.js'),v=await import('../volume.js'),{commonExercises}=await import('../exercise-catalogue.js'),{muscleIconMap}=await import('../pictograms.js');
 assert.equal(m.muscleClassificationVersion,2);
 assert.deepEqual(m.defaultProfile('Y-raise'),{primary:['mid_lower_traps'],secondary:[]});
 for(const id of m.legacyMuscleIds)assert(!m.muscles.some(([key])=>key===id));
 assert.equal(muscleIconMap.upper_traps,muscleIconMap.mid_lower_traps);
 const ex=(name,primary,secondary=[],n=4)=>({id:name,name,muscles:{primary,secondary},sets:Array.from({length:n},()=>({type:'work',w:10,r:10}))});
 const data=[{id:'old',templateId:'model-old',date:'2026-10-10',exercises:[ex('Shrug barre',['traps']),ex('Rowing poulie',['lats'],['upper_back','traps']),ex('Tirage vertical',['lats'],['upper_back']),ex('Personnel inconnu',['upper_back']),ex('Développé couché',['chest'],['triceps'])]}];
 const before=JSON.stringify(data),a=m.weeklyMuscleVolume(data),b=m.weeklyMuscleVolume(data);
 assert.equal(a.totals.upper_traps.primary,4);assert.equal(a.totals.upper_traps.secondary,0);assert.equal(a.totals.mid_lower_traps.secondary,4);assert.equal(v.volumeEstimate(a.totals.mid_lower_traps),2);assert.equal(a.totals.chest.primary,4);assert.equal(a.unclassified,4);assert.deepEqual(a,b);assert.equal(JSON.stringify(data),before);
 for(const e of data[0].exercises){const p=m.resolveMuscleProfile(e,e.muscles);assert.deepEqual(m.resolveMuscleProfile(e,p),p);assert(m.validProfile(e.muscles));}
 assert.deepEqual(m.resolveMuscleProfile({id:'Shrug barre',name:'Presse personnelle',customName:true},{primary:['traps'],secondary:[]}),{primary:[],secondary:[]});
 assert.equal(m.unresolvedMuscleReferences(data[0].exercises[3]).length,1);
 const goals=[{muscle:'traps',min:10,max:12,effectiveDate:'2026-10-01'}];assert(v.validTargets(goals));assert.deepEqual(m.pendingMuscleTargets(goals),goals);
 for(const e of commonExercises){assert(m.validProfile(e.muscles),e.name);assert(![...e.muscles.primary,...e.muscles.secondary].some(id=>m.legacyMuscleIds.includes(id)),e.name);}
 const {mergeImported}=await import('../account-store.js');
 const local={version:1,templates:[],sessions:data,active:null,volumeTargets:goals},remote={version:1,templates:[],sessions:[],active:null};
 const merged=mergeImported(remote,local);assert.deepEqual(merged.sessions,data);assert.deepEqual(merged.volumeTargets,goals);assert.equal(JSON.stringify(data),before);
 console.log('PASS classification v2: immutable snapshots, replay, legacy validation, ambiguous archive, targets, icons, catalogue, weighted volumes without duplication.');
})().catch(e=>{console.error(e);process.exitCode=1});
