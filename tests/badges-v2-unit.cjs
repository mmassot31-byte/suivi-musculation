const {test}=require('node:test'), assert=require('node:assert/strict');
const api=import('../badges-v2/index.js');
const work=(extra={})=>({type:'work',status:'validated',w:20,r:8,...extra});
const profile=(primary,secondary=[])=>({primary,secondary});
const exercise=(muscles,sets)=>({id:'custom',muscles,sets});
const session=(id,exercises)=>({id,date:'2026-11-01T10:00:00Z',exercises});
const doc=(...exercises)=>({sessions:[session('history',exercises)]});

test('150 stable slots, exact category sizes, no placeholder condition/award or XP allocation',async()=>{
  const {catalog,categories,thresholds,rarities}=await api;
  assert.equal(catalog.length,150); assert.equal(new Set(catalog.map(b=>b.id)).size,150);
  assert.deepEqual(categories.map(c=>c.slots),[48,48,12,18,12,12]);
  for(const c of categories) assert.equal(catalog.filter(b=>b.category===c.id).length,c.slots);
  assert.deepEqual(thresholds,[25,100,250,500,1000,2500]);
  for(const b of catalog){assert(b.id.startsWith('v2.'));assert.equal(b.version,2);assert.equal(b.reward.xp,null);assert.equal(b.reward.grantEnabled,false);assert(Object.isFrozen(b));
    if(b.status==='reserved'){assert.equal(b.condition,null);assert.equal(b.rarity,null);}else assert(rarities.includes(b.rarity));}
  assert.equal(catalog.filter(b=>b.status==='reserved').length,102);
});
test('all eight muscles, below/at/above each of six thresholds and next tier',async()=>{
  const {evaluateMuscleVolume:evaluate,muscleGroups,thresholds}=await api;
  for(const {id} of muscleGroups)for(const threshold of thresholds)for(const n of [threshold-1,threshold,threshold+1]){
    const p=profile([id==='shoulders'?'side_delts':id]);
    const result=evaluate(doc(exercise(p,Array.from({length:n},()=>work()))));
    assert.equal(result.counts[id],n);
    assert.equal(result.earned.includes(`v2.muscle_volume.${id}.${threshold}`),n>=threshold);
    assert.equal(result.earned.length,thresholds.filter(t=>t<=n).length);
    const next=thresholds.find(t=>t>n)??null;
    assert.equal(result.progress[id].nextThreshold,next);
    assert.equal(result.progress[id].remaining,next===null?0:next-n);
    assert.equal(result.progress[id].ratio,next===null?1:n/next);
  }
});
test('direct only, validation, legacy sets, warmups, drops, planned refs, active/drafts excluded',async()=>{
  const {evaluateMuscleVolume:evaluate}=await api;
  const input=doc({...exercise(profile(['chest'],['triceps','front_delts']),[
    work({drops:[{w:5,r:5},{w:3,r:6}]}),work({type:'warmup'}),work({validated:false}),
    work({status:'pending'}),work({status:'completed'}),{w:0,r:10},work({type:'unknown'}),
    work({w:NaN}),work({r:0}),work({r:2.5}),work({status:'deleted'}),
  ]),refs:[{w:20,r:8}],plannedSets:100,activityEntries:[{value:100} ]});
  input.active=session('active',[exercise(profile(['chest']),Array.from({length:99},()=>work()))]);
  input.importedDrafts=[input.active];
  const r=evaluate(input);assert.equal(r.counts.chest,3);assert.equal(r.counts.triceps,0);assert.equal(r.counts.shoulders,0);assert.deepEqual(r.earned,[]);
});
test('same day sessions count separately, correction/deletion recompute, input never mutated',async()=>{
  const {evaluateMuscleVolume:evaluate}=await api;
  const input={sessions:[session('a',[exercise(profile(['chest']),Array.from({length:13},()=>work()))]),session('b',[exercise(profile(['chest']),Array.from({length:12},()=>work()))])]};
  const before=structuredClone(input),r=evaluate(input);assert.deepEqual(input,before);assert.equal(r.counts.chest,25);assert.equal(r.earned.length,1);
  assert.deepEqual(evaluate(input),r);input.sessions[1].exercises[0].sets.pop();assert.equal(evaluate(input).earned.length,0);
  input.sessions[0].exercises[0].muscles=profile(['triceps']);assert.equal(evaluate(input).counts.chest,11);
  assert.throws(()=>evaluate({sessions:[before.sessions[0],before.sessions[0]]}),/DUPLICATE_SESSION/);
});
test('per-series snapshot wins; shoulders union; brachialis/abductors follow Élan weekly conventions',async()=>{
  const {evaluateMuscleVolume:evaluate}=await api;
  const r=evaluate(doc(exercise(profile(['chest']),[work({exerciseReference:{id:'custom',muscles:profile(['front_delts','side_delts','rear_delts'],['triceps'])}})]),
    exercise(profile(['brachialis']),[work()]),exercise(profile(['abductors']),[work()])));
  assert.equal(r.counts.shoulders,1);assert.equal(r.counts.chest,0);assert.equal(r.counts.triceps,0);assert.equal(r.counts.biceps,1);assert.equal(r.counts.glutes,1);
});
test('known legacy profiles only, explicit empty and malformed profiles never replaced by guesses',async()=>{
  const {evaluateMuscleVolume:evaluate}=await api;
  const r=evaluate(doc({id:'Développé couché',sets:[work()]},{id:'bench-unknown',sets:[work()]},
    {id:'Développé couché',muscles:profile([]),sets:[work()]},exercise({primary:['chest'],secondary:['chest']},[work()]),
    exercise(profile(['quads']),[work({exerciseReference:{id:'unknown'}})])));
  assert.equal(r.counts.chest,1);assert.equal(r.counts.quads,0);assert.equal(r.diagnostics.unclassifiedSets,3);assert.equal(r.diagnostics.invalidProfileSets,1);
});
test('empty history, terminal tier, rejected invalid history and abandoned sessions',async()=>{
  const {evaluateMuscleVolume:evaluate}=await api;
  const r=evaluate({sessions:[]});assert.deepEqual(r.earned,[]);assert.equal(r.progress.chest.nextThreshold,25);assert.equal(r.progress.chest.ratio,0);
  const input=doc(exercise(profile(['chest']),Array.from({length:2500},()=>work())));input.sessions[0].status='abandoned';assert.equal(evaluate(input).counts.chest,0);
  assert.throws(()=>evaluate({}),/INVALID_HISTORY/);
});
test('personal legacy classifications apply only when an exercise/snapshot has no stored profile',async()=>{
  const {evaluateMuscleVolume:evaluate}=await api;
  const input=doc({id:'personal',sets:[work(),work({exerciseReference:{id:'personal',muscles:profile(['quads'])}})]});
  input.exerciseMuscles=[{exerciseId:'personal',...profile(['calves'])}];
  const r=evaluate(input);assert.equal(r.counts.calves,1);assert.equal(r.counts.quads,1);
  input.sessions[0].exercises[0].muscles=profile(['triceps']);
  assert.equal(evaluate(input).counts.calves,0);assert.equal(evaluate(input).counts.triceps,1);
});
