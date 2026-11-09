const {test}=require('node:test'),assert=require('node:assert/strict');
const api=import('../badges-v2/index.js');
const identity={version:1,unit:'kg',convention:'Total',lateralMode:'total',source:'confirmed'};
const set=(id,w=40,r=10,extra={})=>({id,type:'work',status:'validated',w,r,loadIdentity:identity,loadProtocol:'elan-2',measurement:'external_load',loadMode:'bilateral',...extra});
const ex=(id='Développé couché',sets=[set('a')],extra={})=>({id,name:id,instanceId:id,convention:'Total',muscles:{primary:['chest'],secondary:['triceps']},sets,loadIdentity:identity,...extra});
const session=(id,date='2026-10-01T10:00:00Z',exercises=[ex()],duration=30)=>({id,date,endedAt:new Date(Date.parse(date)+duration*60000).toISOString(),exercises,templateId:'upper'});
const evaluate=async(sessions,options={})=>(await api).evaluateV2({sessions}, {asOf:'2027-02-01T00:00:00Z',...options});
const eligible=r=>r.badges.filter(b=>b.eligible).map(b=>b.id);
const catalog=()=>api.then(m=>m.catalog);
const badge=async(kind,t)=>(await catalog()).find(b=>b.condition.kind===kind&&(t===undefined||b.condition.threshold===t)).id;

test('catalogue exact sizes, unique names, stable reserved IDs and XP rules',async()=>{
 const {catalog,categories}=await api;assert.equal(catalog.length,150);assert.equal(new Set(catalog.map(b=>b.id)).size,150);assert.equal(new Set(catalog.map(b=>b.label)).size,150);
 for(const c of categories)assert.equal(catalog.filter(b=>b.category===c.id).length,c.slots);
 assert.equal(catalog[0].label,'Première couche');assert.equal(catalog[47].label,'Au-dessus des nuages');assert.equal(catalog.filter(b=>b.nameOrigin==='new_proposal').length,48);
 for(const b of catalog){assert(b.description);assert(b.condition);assert(Number.isInteger(b.reward.xp));if(b.condition.kind==='return_days')assert.equal(b.reward.xp,0);}
});
test('48 Performance exact boundaries, 2 vs 3 reps, entered unilateral load never doubled',async()=>{
 const {performanceFamilies}=await import('../badges-v2/catalog.js');
 const ids=['Développé couché','Shoulder press','Tirage vertical','Low row','Pendulum squat','Hip thrust','Curl biceps','Triceps haltère'];
 for(let f=0;f<8;f++)for(let tier=0;tier<6;tier++){const threshold=performanceFamilies[f].thresholds[tier],id=`v2.performance.slot_${String(f*6+tier+1).padStart(2,'0')}`;
  for(const [w,reps,expected]of [[threshold-1,3,false],[threshold,2,false],[threshold,3,true]]){const r=await evaluate([session('s',undefined,[ex(ids[f],[set('s',w,reps,{loadMode:'unilateral'})])])]);assert.equal(eligible(r).includes(id),expected,`${id}/${w}/${reps}`);}}
 const r=await evaluate([session('s',undefined,[ex('fake',[set('x',999)])])]);assert(!r.badges.some(b=>b.id.startsWith('v2.performance')&&b.eligible));
});
test('activity XP, tonnage drops/unilateral, same day sessions, no weekly cap, first observation not PR',async()=>{
 const a=session('a',undefined,[ex(undefined,[set('1',100,10,{loadMode:'unilateral'}),set('2',0,10),set('3',100,10,{drops:[set('d',50,10)]})])]);
 const r=await evaluate([a,{...a,id:'b'}]);assert.equal(r.activities[0].tonnageKg,3500);assert.deepEqual(r.activities[0].activity,{session:20,sets:3,tonnage:3});
 assert.equal(r.events.filter(e=>e.kind==='activity').reduce((n,e)=>n+e.xp,0),52);assert.equal(r.values.sessions,2);assert.equal(r.values.session_records,0);
 const small=await evaluate([session('x',undefined,[ex(undefined,[set('1',0,1),set('2',0,1)])])]);assert.equal(small.activities[0].xp,2);
 const capped=await evaluate([session('x',undefined,[ex(undefined,[set('1',1000,1000)])])]);assert.equal(capped.activities[0].activity.tonnage,10);
});
test('calendar ISO year, timezones, DST, full absence days and no first-session return',async()=>{
 const {isoWeek,localParts}=await import('../badges-v2/time.js');assert.equal(isoWeek('2027-01-01'),'2026-12-28');assert.equal(localParts('2026-10-31T23:30:00Z','Europe/Paris').month,'2026-11');
 const first=await evaluate([session('a','2026-01-01T04:10:00Z')]);assert.equal(first.values.dawn,1);assert.equal(first.values.return_days,0);
 const r=await evaluate([session('a','2026-10-01T10:00:00Z'),session('b','2026-10-09T10:00:00Z')]);assert.equal(r.values.return_days,7);assert(eligible(r).includes(await badge('return_days',7)));
 const close=await evaluate([session('a','2026-10-01T10:00:00Z'),session('b','2026-10-08T10:00:00Z')]);assert.equal(close.values.return_days,6);
 const w=await evaluate([session('a','2026-12-28T10:00:00Z'),session('b','2027-01-04T10:00:00Z')]);assert.equal(w.values.week_streak,2);
});
test('permanent rank nine exact thresholds and maximum',async()=>{
 const {ranks,permanentRank}=await api;assert.equal(ranks.length,9);for(const r of ranks){assert.equal(permanentRank(r.xp).name,r.name);if(r.xp)assert.notEqual(permanentRank(r.xp-1).name,r.name);}assert.equal(permanentRank(99999).next,null);
});
test('permanent grants unique across retry, correction, deletion; seasons exclude badge XP',async()=>{
 const {reconcileV2}=await api;const p=await evaluate([session('s')]);const first=reconcileV2(p),retry=reconcileV2(p,first);assert.deepEqual(first,retry);assert.equal(first.seasons['2026-10'],1);
 assert.equal(first.xp,first.events.reduce((n,e)=>n+e.xp,0));const deleted=reconcileV2(await evaluate([]),first);assert.equal(deleted.awards.length,first.awards.length);assert.equal(deleted.xp,first.xp-1);assert.deepEqual(deleted.seasons,{});
});
test('Secrets retrospective and prospective proof, missing evidence never grants',async()=>{
 const s=session('s','2026-12-31T23:00:00Z',[ex(undefined,Array.from({length:10},(_,i)=>set(String(i),10,10)))]);
 const r=await evaluate([s]);assert.equal(r.values.night,1);assert.equal(r.values.jan1,1);assert.equal(r.values.session_reps,100);assert.equal(r.values.extra_set,0);assert.equal(r.values.offline_sync,0);
 s.v2Evidence={version:2,initialPlan:[{instanceId:s.exercises[0].instanceId,sets:9}],endedOffline:true};const proof=await evaluate([s],{syncedSessionIds:['s']});assert.equal(proof.values.extra_set,1);assert.equal(proof.values.offline_sync,1);
});
test('Exploits duration, distinct muscles/exercises, recurring weeks and robust records',async()=>{
 const six=Array.from({length:6},(_,i)=>set(String(i)));
 const quick=await evaluate([session('q',undefined,[ex(undefined,six)],20)]);assert.equal(quick.values.express,1);assert.equal(quick.values.marathon,0);
 const long=await evaluate([session('l',undefined,[ex(undefined,Array.from({length:10},(_,i)=>set(String(i))))],120)]);assert.equal(long.values.marathon,1);
 const sessions=Array.from({length:6},(_,i)=>session(String(i),`2026-10-${String(i+1).padStart(2,'0')}T10:00:00Z`,[ex(undefined,[set('a',40+i,10)])]));const r=await evaluate(sessions);assert.equal(r.values.progress_streak,5);assert.equal(r.values.session_records>0,true);
 const weeks=Array.from({length:12},(_,i)=>session(String(i),new Date(Date.parse('2026-10-05T10:00:00Z')+Math.floor(i/3)*7*86400000+(i%3)*86400000).toISOString()));assert.equal((await evaluate(weeks)).values.grand_slam,4);
});
test('only verified wins, duplicate challenge IDs, attribution month, no badge season points',async()=>{
 const {reconcileV2}=await api;const wins=Array.from({length:10},(_,i)=>({id:String(i),kind:'cooperative',awardedAt:'2026-11-01T10:00:00Z'}));const p=await evaluate([],{challengeWins:[...wins,wins[0]]}),r=reconcileV2(p);assert.equal(p.values.cooperative_wins,10);assert.equal(r.seasons['2026-11'],250);assert.equal(r.events.filter(e=>e.kind==='challenge').length,10);
});
test('unknown history conventions raw value conserved, no hidden machine conversion; invalid/future/active excluded',async()=>{
 const s=session('s',undefined,[ex('unknown',[{id:'a',type:'work',w:10,r:10}],{loadIdentity:undefined,convention:'À préciser'})]);const r=await evaluate([s]);assert.equal(r.activities[0].tonnageKg,100);assert.equal(r.diagnostics.nonComparableSets,1);
 const no=await evaluate([{...s,endedAt:null},{...s,id:'f',date:'2028-01-01',endedAt:'2028-01-02'}]);assert.equal(no.activities.length,0);
});
