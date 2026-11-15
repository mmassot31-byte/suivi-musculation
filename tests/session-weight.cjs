const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const W=await import('../session-weight.js'),{savedSessionModel,savedSessionHtml}=await import('../saved-session.js'),{normalizedTonnage}=await import('../identity.js');
 const catalogue=JSON.parse(fs.readFileSync(new URL('../session-weight-catalogue.json','file://'+__filename),'utf8'));
 assert.equal(catalogue.references.length,200);assert.equal(W.weightReferences.length,189);
 assert.equal(new Set(catalogue.references.map(r=>r.id)).size,200);
 assert.equal(new Set(catalogue.references.map(r=>r.nom.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase())).size,200);
 assert.equal(new Set(W.weightReferences.map(r=>r.categorie)).size,10);
 for(const r of catalogue.references){assert(Number.isFinite(r.masse_kg)&&r.masse_kg>0);assert(r.nom_singulier&&r.nom_pluriel);assert.equal(r.precision,'indicative');assert.equal(r.source_statut,'a_verifier');if(!r.actif)assert(r.motif_exclusion);}
 const ref=id=>W.weightReferences.find(r=>r.id===id),elephant=ref('ref-001');
 for(const masse_kg of[0,-1,null,undefined,NaN,Infinity,'500'])assert(!W.validWeightReference({...elephant,masse_kg}));
 assert(!W.validWeightReference({...elephant,actif:false}));
 for(const kg of[0,-1,null,undefined,NaN,Infinity,'1000']){assert.equal(W.eligibleWeightReferences(kg).length,0);assert.equal(W.selectWeightReference(kg),null);assert.equal(W.formatWeightComparison(kg,elephant),null);}
 assert.equal(W.formatWeightComparison(25000,elephant).text,'Environ 5 éléphants de savane mâles');
 assert.equal(W.formatWeightComparison(5000,elephant).text,'Environ 1 éléphant de savane mâle');
 assert.equal(W.formatWeightComparison(7500,elephant).text,'Environ 1,5 éléphant de savane mâle');
 assert.equal(W.formatWeightComparison(25000,ref('ref-041')).text,'Environ 21 citadines');
 assert.equal(W.formatWeightComparison(25000,ref('ref-054')).text,'Environ 2,1 bus urbains');
 assert.equal(W.formatWeightComparison(2500,ref('ref-014')).text,'Environ 5 chevaux');
 assert.equal(W.formatWeightComparison(1000,ref('ref-185')).text,'Environ 13 coffres-forts domestiques');
 assert.equal(W.formatWeightComparison(100,ref('ref-126')).text,'Environ 83 melons');
 assert.equal(W.formatWeightComparison(1000,{...elephant,masse_kg:0}),null);
 for(const kg of[0.01,0.06,1,20,300,1000,25000,1000000,16000000]){
  const eligible=W.eligibleWeightReferences(kg);assert(eligible.length,'eligible '+kg);
  for(const r of eligible){const q=kg/r.masse_kg;assert(q>=0.1&&q<=200);assert(W.formatWeightComparison(kg,r)?.rounded>0);}
 }
 assert.equal(W.selectWeightReference(1e20),null);assert.equal(W.selectWeightReference(1e-12),null);
 assert.equal(W.selectWeightReference(1,{references:[]}),null);
 assert.equal(W.selectWeightReference(5000,{references:[elephant],previousId:elephant.id}),null);
 assert.equal(W.selectWeightReference(2500,{references:[elephant],random:()=>0}).id,elephant.id);
 const eligible=W.eligibleWeightReferences(25000),history=eligible.slice(0,5).map((r,i)=>({sessionId:'recent'+i,referenceId:r.id,referenceIds:[r.id],category:r.categorie}));
 let seed=42;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32),seen=new Set(),categories=new Set();
 for(let i=0;i<500;i++){const r=W.selectWeightReference(25000,{history,previousId:eligible[5].id,random});assert(!history.some(h=>h.referenceIds.includes(r.id)));assert.notEqual(r.id,eligible[5].id);assert.notEqual(r.categorie,history.at(-1).category);seen.add(r.id);categories.add(r.categorie);}
 assert(seen.size>10);assert(categories.size>=4);
 const fullHistory=[{referenceIds:eligible.map(r=>r.id),category:eligible[0].categorie}];
 assert(W.selectWeightReference(25000,{history:fullHistory,previousId:eligible[0].id,random}));
 // Category sampling is independent of the number of entries per category.
 const small=[{...elephant,id:'a',categorie:'a'},...Array.from({length:20},(_,i)=>({...elephant,id:'b'+i,categorie:'b'}))];
 let a=0;for(let i=0;i<1000;i++)a+=W.selectWeightReference(25000,{references:small,random}).categorie==='a';assert(a>420&&a<580);

 const identity={version:1,unit:'kg',convention:'Total',lateralMode:'total',source:'confirmed'},e={id:'custom',instanceId:'custom',name:'Mon exercice',convention:'Total',loadIdentity:identity,plannedSets:1,refs:[],muscles:{primary:['chest'],secondary:[]},sets:[{id:'work',w:25,r:10,type:'work',loadIdentity:identity},{id:'warm',w:200,r:100,type:'warmup'},{id:'invalid',w:500,r:100,validated:false}]};
 const session={id:'s',name:'Libre',freeMode:true,date:'2026-11-15T12:00:00Z',endedAt:'2026-11-15T12:45:00Z',exercises:[e]},model=savedSessionModel(session,[session]),before=structuredClone(session);
 assert.equal(W.sessionWeightKg(model),250);assert.equal(W.sessionWeightKg(model),model.amount);assert.equal(model.amount,normalizedTonnage(session.exercises).knownTonnage);
 const makeModel=changes=>{const s={...structuredClone(session),...changes};return savedSessionModel(s,[s]);};
 assert.equal(W.sessionWeightKg(makeModel({freeMode:false,templateId:'upper'})),250);
 assert.equal(W.sessionWeightKg(makeModel({endedAt:null})),null);
 assert.equal(W.sessionWeightKg(makeModel({endedAt:'invalid'})),null);
 assert.equal(W.sessionWeightKg(makeModel({exercises:[]})),null);
 assert.equal(W.sessionWeightKg(makeModel({exercises:[{...e,sets:[{w:0,r:10,type:'work',loadIdentity:identity}]}]})),null);
 assert.equal(W.sessionWeightKg(makeModel({exercises:[{...e,loadIdentity:null,convention:'À préciser',sets:[{w:30,r:10,type:'work'}]}]})),null);
 assert.equal(W.sessionWeightKg({...model,partial:true}),null);
 assert.equal(W.sessionWeightKg({...model,amountUnit:'lb'}),null);
 assert.equal(W.sessionWeightKg(makeModel({exercises:[{...e,tracking:'cardio',sets:[],activityEntries:[{counter:'duration',value:20}]}]})),null);
 const protocol={...e,sets:[{w:20,r:10,type:'work',loadIdentity:identity,loadProtocol:'elan-2',loadMode:'unilateral',measurement:'external_load',drops:[{w:10,r:5}]}]};
 assert.equal(W.sessionWeightKg(makeModel({exercises:[protocol]})),500);
 const pounds={...e,loadIdentity:{...identity,unit:'lb'},sets:[{w:100,r:10,type:'work',loadIdentity:{...identity,unit:'lb'}}]};
 assert.equal(W.sessionWeightKg(makeModel({exercises:[pounds]})),normalizedTonnage([pounds]).knownTonnage);
 const partial={...pounds,sets:[{...pounds.sets[0],loadIdentity:{...identity,unit:'lb',lateralMode:'unknown'}}]};
 assert.equal(W.sessionWeightKg(makeModel({exercises:[e,partial]})),null);

 const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};let scope='local',calls=0;
 const controller=W.createSessionWeightComparisons({getScope:()=>scope,getStorage:()=>storage,random:()=>{calls++;return random();}}),first=controller.get(model),callCount=calls;
 for(let i=0;i<50;i++)assert.deepEqual(controller.get(model),first);assert.equal(calls,callCount,'No random draws during re-renders');
 const next=controller.next(model);assert.notEqual(next.reference.id,first.reference.id);assert.equal(next.kg,250);
 assert.deepEqual(controller.get(model),next);assert.equal(JSON.parse(memory.get('elan-session-weight-v1:local')).length,1);
 const reloaded=W.createSessionWeightComparisons({getStorage:()=>storage,random:()=>{throw Error('Must restore selection');}});assert.deepEqual(reloaded.get(model),next);
 const used=[];for(let i=0;i<10;i++){const m={...model,session:{...session,id:'s'+i}},r=controller.get(m);assert(!used.slice(-5).includes(r.reference.id));used.push(r.reference.id);}
 assert.equal(JSON.parse(memory.get('elan-session-weight-v1:local')).length,5);
 scope='account:other';controller.get(model);assert(memory.has('elan-session-weight-v1:account:other'));
 assert.equal(JSON.parse(memory.get('elan-session-weight-v1:local')).length,5);
 const unavailable=W.createSessionWeightComparisons({getStorage:()=>{throw Error('Denied');},random}),unavailableFirst=unavailable.get(model);assert.deepEqual(unavailable.get(model),unavailableFirst);assert.notEqual(unavailable.next(model).reference.id,unavailableFirst.reference.id);
 const corrupt=W.createSessionWeightComparisons({getStorage:()=>({getItem:()=>'{bad',setItem(){}}),random});assert(corrupt.get(model));
 const single=W.createSessionWeightComparisons({getStorage:()=>null,references:[elephant],random}),singleModel={...model,amount:5000};assert.equal(single.get(singleModel).canChange,false);assert.equal(single.next(singleModel).reference.id,elephant.id);
 assert.equal(controller.get({...model,amount:0}),null);
 assert.equal(W.sessionWeightCardHtml(null),'');const card=W.sessionWeightCardHtml(next);
 assert.match(card,/250 <span>kg/);assert.match(card,/Équivalence approximative/);assert.match(card,/aria-live="polite"/);assert.doesNotMatch(card,/<svg|<img/);
 const tiny=W.createSessionWeightComparisons({getStorage:()=>null,random}).get({...model,amount:0.006});assert(tiny);assert.match(W.sessionWeightCardHtml(tiny),/0,006/);
 const html=savedSessionHtml(model,[session],{sessionWeight:card});assert(html.indexOf('saved-stats')<html.indexOf('session-weight-card'));assert(html.indexOf('session-weight-card')<html.indexOf('saved-plan'));
 assert.doesNotMatch(savedSessionHtml(model,[session]),/session-weight-card/,'History rendering stays unchanged');assert.deepEqual(session,before);
 console.log('PASS session weight: catalogue audit, bounds/fallback, division/rounding, French grammar, category sampling, five-session history, no immediate repeat, stable renders/reload, account isolation/storage failure, existing normalized totals (free/custom/template/lb/drop/unilateral), invalid/partial/empty totals, immutable sessions and recap placement.');
})().catch(e=>{console.error(e);process.exitCode=1});
