const assert=require('node:assert/strict');
(async()=>{
 const {dayKey,dayOffset,validDay,tonnage,attendance,validMeasurements,mergeMeasurements}=await import('../tracking.js');
 const set=(w,r,type='work',drops=[])=>({w,r,type,drops});
 const session=(date,sets)=>({date:date+'T12:00:00',exercises:[{sets}]});
 const s=session('2026-11-02',[set(100,10),set(30,20,'warmup',[{w:20,r:10}]),set(50,8,'work',[{w:40,r:5}])]);s.exercises.push({sets:[set(10,10)]});assert.equal(tonnage(s),1700);s.exercises[0].sets[0].w=110;assert.equal(tonnage(s),1800);s.exercises[0].sets.splice(0,1);assert.equal(tonnage(s),700);
 assert.ok(validDay('2024-02-29'));assert.ok(!validDay('2026-02-29'));assert.ok(!validDay('2026-13-01'));assert.equal(dayOffset('2026-01-01',-1),'2025-12-31');assert.equal(dayOffset('2026-03-30',-1),'2026-03-29');assert.equal(dayOffset('2026-10-26',-1),'2026-10-25');
 const sessions=['2025-12-31','2026-10-05','2026-10-06','2026-11-02','2026-11-02'].map(d=>session(d,[set(1,1)]));sessions.push(session('2026-11-02',[]),session('2026-11-03',[set(1,1)]));assert.deepEqual(attendance(sessions,'2026-11-02'),{total:5,year:4,month:2,weekly:.75});assert.equal(attendance([],dayKey()).total,0);
 const m={id:'a',date:'2026-11-02',values:{weight:80.5,arm_left:32}};assert.ok(validMeasurements([m]));for(const values of [{weight:0},{weight:-1},{weight:'80'},{bad:1},{}])assert.ok(!validMeasurements([{...m,values}]));assert.ok(!validMeasurements([m,{...m,id:'b'}]));assert.ok(!validMeasurements([{...m,date:'2026-02-30'}]));
 assert.deepEqual(mergeMeasurements([m],[{...m,values:{weight:999}},{...m,id:'b'},{...m,id:'c',date:'2026-11-01'}]),{records:[m,{...m,id:'c',date:'2026-11-01'}],ignored:2});
 console.log('PASS: tonnage, dégressives, échauffements, limites de dates/année/28 jours, validation et fusion des mensurations.');
})().catch(e=>{console.error(e);process.exitCode=1});
