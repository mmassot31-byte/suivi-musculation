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
 const no=await evaluate([{...s,endedAt:'invalid'},{...s,id:'f',date:'2028-01-01',endedAt:'2028-01-02'}]);assert.equal(no.activities.length,0);
});
test('weekly goals use saved period snapshots, four closed weeks, later edits cannot fabricate success',async()=>{
 const {evaluateV2,snapshotWeek}=await api;const weeks=['2026-10-05','2026-10-12','2026-10-19','2026-10-26'];
 const targets=['chest','lats','quads'].map(muscle=>({muscle,min:1,max:5,method:'direct',effectiveDate:'2026-10-01'}));
 const goal={id:'goal-proof',version:4,type:'regularity',recurring:true,period:'week',start:'2026-10-05',target:1,timezone:'Europe/Paris',createdAt:'2026-10-01T00:00:00Z',phases:[]};
 const state={sessions:[],volumeTargets:targets,sportGoals:[goal]};
 for(const [i,week]of weeks.entries()){const s=session('w'+i,week+'T10:00:00Z',['chest','lats','quads'].map(m=>ex(m,[set(m)],{muscles:{primary:[m],secondary:[]}})));s.v2Evidence={version:2,weekSnapshot:snapshotWeek(state,week,'Europe/Paris')};state.sessions.push(s);}
 state.volumeTargets=targets.map(t=>({...t,min:999}));state.sportGoals=[{...goal,target:999}];
 const p=evaluateV2(state,{asOf:'2026-11-02T10:00:00Z'});assert.equal(p.values.weekly_targets,4);assert.equal(p.values.perfect_weeks,4);
 const no=evaluateV2({...state,sessions:state.sessions.map(({v2Evidence,...s})=>s)},{asOf:'2026-11-02T10:00:00Z'});assert.equal(no.values.weekly_targets,0);assert.equal(no.values.perfect_weeks,0);
});
test('retroactive collection finite pass and threshold dates, permanent prior grants included',async()=>{
 const {evaluateV2}=await api;const p={primary:['chest','lats','front_delts','biceps','triceps','quads','glutes','calves'],secondary:[]};
 const ids=['Développé couché','Shoulder press','Tirage vertical','Low row','Pendulum squat','Hip thrust','Curl biceps','Triceps haltère'];
 const big=session('big',undefined,ids.map((id,i)=>ex(id,Array.from({length:i?1:2500},(_,k)=>set(String(k),500,10000)),{muscles:p})));
 const result=evaluateV2({sessions:[big]},{asOf:'2027-01-01T00:00:00Z'});assert(eligible(result).includes(await badge('collection',25)));assert(eligible(result).includes(await badge('collection',100)));
 const ten=Array.from({length:10},(_,i)=>session(String(i),`2026-10-${String(i+1).padStart(2,'0')}T10:00:00Z`));const dated=evaluateV2({sessions:ten},{asOf:'2027-01-01T00:00:00Z'});assert.equal(dated.badges.find(b=>b.id==='v2.consistency.slot_02').earnedAt,ten[9].endedAt);
});
test('Phoenix comparable record gap, Centurion across occurrences and duplicate series excluded',async()=>{
 const old=session('old','2026-01-01T10:00:00Z',[ex(undefined,[set('a',40,8)])]);const later=session('later','2026-08-01T10:00:00Z',[ex(undefined,[set('b',45,8)])]);const r=await evaluate([old,later]);assert(r.values.phoenix>=180);
 const repeated=session('r',undefined,[ex('Développé couché',[set('a',10,60)],{instanceId:'first'}),ex('Développé couché',[set('b',10,60)],{instanceId:'second'})]);assert.equal((await evaluate([repeated])).values.session_reps,120);
 const duplicate=session('duplicate',undefined,[ex(undefined,[set('a'),set('a')])]);assert.equal((await evaluate([duplicate])).activities[0].sets,1);
});
test('validated cardio counts toward regularity but never fabricates strength series or activity XP',async()=>{
 const cardio=session('cardio',undefined,[{id:'cardio',instanceId:'bike',tracking:'cardio',sets:[],activityEntries:[{id:'c',counter:'duration',value:20}]}]);
 const r=await evaluate([cardio]);assert.equal(r.values.sessions,1);assert.equal(r.activities[0].sets,0);assert.equal(r.activities[0].xp,0);assert.equal(r.values.unique_exercises,1);assert(!r.badges.some(b=>b.category==='performance'&&b.eligible));
});
test('reward UI zero/one/multiple badges, rank transition, escaping and explicit new Performance names',async()=>{
 const {rewardHtml,collectionHtml}=await import('../badges-v2/ui.js'),{permanentRank,catalog}=await api;
 const base={activity:{session:20,sets:3,tonnage:0},beforeXP:490,afterXP:540,beforeRank:permanentRank(490),afterRank:permanentRank(540),total:50,badges:[]};
 const empty=rewardHtml(base,{celebrate:true});assert(empty.includes('Nouveau rang · Argent'));assert(!empty.includes('v2-reward-badges'));assert(empty.includes('490 → 540'));
 const one=rewardHtml({...base,badges:[{id:catalog[0].id,xp:10}]},{celebrate:true});assert.equal((one.match(/<svg /g)||[]).length,1);
 const historical=rewardHtml({...base,badges:catalog.slice(0,3).map(b=>({id:b.id,xp:b.reward.xp}))},{celebrate:false});assert.equal((historical.match(/<svg /g)||[]).length,3);assert(!historical.includes('Nouveau rang'));assert(historical.includes('Badges acquis'));
 const secret=collectionHtml({awards:[]},{detail:'v2.secrets.slot_01'});assert(secret.includes('???'));assert(!secret.includes('Batman'));assert(!secret.includes('04:59'));
});
test('V2 state import preserves acquired grants and explicit favorites without recreating activity XP',async()=>{
 const {mergeV2State}=await import('../badges-v2/merge.js');const remote={favorites:[],ledger:{awards:[{id:'a',xp:10}],events:[]}},local={favorites:['b'],ledger:{awards:[{id:'b',xp:25}]},seenRewards:['s']};
 const before=structuredClone([remote,local]),out=mergeV2State(remote,local);assert.deepEqual(out.favorites,[]);assert.deepEqual(new Set(out.ledger.awards.map(a=>a.id)),new Set(['a','b']));assert.deepEqual(out.ledger.events,[]);assert.deepEqual([remote,local],before);
});
test('metric tonnage converts proven pounds without guessing sides; explicit bodyweight/assistance never fabricates tonnage',async()=>{
 const lb={...identity,unit:'lb',convention:'À préciser',lateralMode:'unknown'};const pounds=await evaluate([session('lb',undefined,[ex(undefined,[{id:'a',type:'work',w:100,r:10,loadIdentity:lb}],{loadIdentity:lb})])]);assert(Math.abs(pounds.activities[0].tonnageKg-453.59237)<.0001);assert.equal(pounds.diagnostics.nonComparableSets,1);
 const body=await evaluate([session('body',undefined,[ex(undefined,[set('a',80,10,{measurement:'bodyweight'})])])]);assert.equal(body.activities[0].tonnageKg,0);assert(!body.badges.some(b=>b.id.startsWith('v2.performance')&&b.eligible));
});
test('legacy saved history without completion time keeps Volume retrocalculation, never invents finish-time Secrets',async()=>{
 const old=session('legacy','2026-12-31',[ex(undefined,Array.from({length:25},(_,i)=>set(String(i),10,10)))]);delete old.endedAt;const r=await evaluate([old],{timeZone:'America/Los_Angeles'});assert(eligible(r).includes('v2.muscle_volume.chest.25'));assert.equal(r.values.night,0);assert.equal(r.values.dec31,0);assert.equal(r.activities[0].month,'2026-12');assert.equal(r.activities[0].timeSource,'historical_session_date');assert.equal(r.badges.find(b=>b.id==='v2.muscle_volume.chest.25').earnedAt,null);
});
