const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const W=await import('../session-weight.js'),{savedSessionModel}=await import('../saved-session.js');
 const catalogue=JSON.parse(fs.readFileSync(new URL('../session-weight-catalogue.json','file://'+__filename),'utf8'));
 for(const r of catalogue.references){assert(Number.isInteger(r.score_interet)&&r.score_interet>=1&&r.score_interet<=5);assert.equal(typeof r.insolite,'boolean');assert(Number.isInteger(r.quantite_max)&&r.quantite_max>0);assert(['un','une'].includes(r.article_indefini));assert.equal(typeof r.fractionnable,'boolean');}
 const ref=id=>W.weightReferences.find(r=>r.id===id),elephant=ref('ref-001');
 for(const score_interet of[0,6,2.5,null,NaN])assert(!W.validWeightReference({...elephant,score_interet}));
 assert.equal(W.formatWeightComparison(1300,ref('ref-041')).text,'Environ une citadine');
 assert.equal(W.formatWeightComparison(5000,elephant).text,'Environ un éléphant de savane mâle');
 assert.equal(W.formatWeightComparison(5000,ref('ref-003')).text,'Environ 3 hippopotames','The 10% boundary tolerates binary floating-point error');
 assert.equal(W.formatWeightComparison(4500,elephant),null,'Half or undersized elephants are excluded');
 assert.equal(W.formatWeightComparison(0.03,ref('ref-135')),null,'Fractions of countable objects are excluded');
 assert.equal(W.formatWeightComparison(0.1,ref('ref-161')).text,'Environ 0,1 litre d’eau');
 assert.equal(W.formatWeightComparison(1000,ref('ref-101')).text,'Environ 5\u202f000 smartphones');
 assert.equal(W.formatWeightComparison(1000.2,ref('ref-101')),null,'Reference-specific upper bounds are enforced');
 assert(W.eligibleWeightReferences(50000).some(r=>50000/r.masse_kg>1000),'Large familiar quantities are allowed');
 const seeded=n=>()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/2**32);
 // Isolate the interest weighting from subject, category and quantity differences.
 const controlled=Array.from({length:5},(_,i)=>({...elephant,id:'score-'+(i+1),score_interet:i+1})),counts=[0,0,0,0,0],rng=seeded(1234);
 for(let i=0;i<10000;i++)counts[W.selectWeightReference(25000,{references:controlled,random:rng}).score_interet-1]++;
 for(let i=0;i<5;i++)assert(Math.abs(counts[i]/10000-(i+1)/15)<0.02,'Interest scores influence random probabilities, not a maximum-only choice');
 assert(counts[4]>counts[0]*4);
 const tinyPool=controlled.slice(0,3),smallHistory=[{sessionId:'old',referenceId:'score-3',referenceIds:tinyPool.map(r=>r.id),recentReferenceIds:['score-1','score-2','score-3'],category:elephant.categorie}];
 assert.equal(W.selectWeightReference(25000,{references:tinyPool,history:smallHistory,random:seeded(3)}).id,'score-1','Small pools release the oldest reference first');
 assert.equal(W.selectWeightReference(25000,{references:[elephant],previousId:elephant.id}).id,elephant.id);
 assert.equal(W.selectWeightReference(25000,{references:[]}),null);
 const identity={version:1,unit:'kg',convention:'Total',lateralMode:'total',source:'confirmed'};
 function model(kg){const session={id:'simulation',name:'Simulation',date:'2026-11-15T12:00:00Z',endedAt:'2026-11-15T13:00:00Z',exercises:[{id:'lift',instanceId:'lift',name:'Exercice',convention:'Total',loadIdentity:identity,muscles:{primary:['chest'],secondary:[]},refs:[],plannedSets:1,sets:[{id:'set',w:kg,r:1,type:'work',loadIdentity:identity}]}]};return savedSessionModel(session,[session]);}
 const report={drawsPerMode:2000,controlledScores:counts,tonnages:[]};
 for(const kg of[500,1300,5000,15000,25000,50000]){
  const eligible=W.eligibleWeightReferences(kg),poolMean=eligible.reduce((n,r)=>n+r.score_interet,0)/eligible.length,m=model(kg),row={kg,eligible:eligible.length,offbeatEligible:eligible.filter(r=>r.insolite).length,modes:[]};
  assert.equal(W.sessionWeightKg(m),kg);
  for(const mode of['successive','sessions']){
   const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},controller=W.createSessionWeightComparisons({getStorage:()=>storage,random:seeded(kg+(mode==='successive'?17:31))}),seen=[],categories=new Set(),references=new Map(),scores={},durations=[];
   let offbeat=0,repeatCategory=0,lastCategory=null,sumScore=0,last;
   for(let i=0;i<2000;i++){
    const start=performance.now(),result=mode==='sessions'?controller.get({...m,session:{...m.session,id:'session-'+i}}):i?controller.next(m):controller.get(m);durations.push(performance.now()-start);
    assert(result);const r=result.reference;assert.notEqual(r.id,last?.id);assert(!seen.slice(-5).includes(r.id),'The five latest displays are excluded even within a session');
    assert.equal(result.kg,kg);assert.equal(result.quantity,kg/r.masse_kg);assert(result.quantity<=r.quantite_max&&result.quantity>=0.1);assert(result.quantity>=1||r.fractionnable||Math.abs(1-result.quantity)/result.quantity<=0.1+Number.EPSILON);
    assert.equal(result.name,result.rounded<2?r.nom_singulier:r.nom_pluriel);assert(result.approximate);assert(!/NaN|Infinity|undefined/.test(result.text));assert(/^Environ /.test(result.text));
    assert(Math.abs(result.rounded-result.quantity)/result.quantity<=0.10000001||Math.abs(result.rounded-result.quantity)<=0.05000001);
    offbeat+=r.insolite;repeatCategory+=r.categorie===lastCategory;sumScore+=r.score_interet;scores[r.score_interet]=(scores[r.score_interet]||0)+1;categories.add(r.categorie);references.set(r.id,(references.get(r.id)||0)+1);seen.push(r.id);last=r;lastCategory=r.categorie;
    if(i===3){const stable=controller.get(mode==='sessions'?{...m,session:{...m.session,id:'session-'+i}}:m);assert.deepEqual(stable,result,'Renders do not reroll');}
   }
   const rareRate=offbeat/2000,meanScore=sumScore/2000,top=[...references].sort((a,b)=>b[1]-a[1]);
   assert(rareRate>0.12&&rareRate<0.18,'Occasional offbeat comparisons remain around 15%');assert(meanScore>poolMean+0.05,'Interesting references are favoured over a uniform pool');
   assert(categories.size>=Math.min(8,new Set(eligible.map(r=>r.categorie)).size));assert(references.size>=Math.min(50,eligible.length));assert(top[0][1]/2000<0.09);assert(top.slice(0,5).reduce((n,x)=>n+x[1],0)/2000<0.28);assert(repeatCategory/2000<0.18);
   const stored=JSON.parse(memory.get('elan-session-weight-v1:local'));assert(stored.length<=5);assert(stored.every(h=>h.recentReferenceIds.length<=20));
   const restored=W.createSessionWeightComparisons({getStorage:()=>storage,random:seeded(99)}),latest=mode==='sessions'?{...m,session:{...m.session,id:'session-1999'}}:m;
   assert.equal(restored.get(latest).reference.id,last.id);assert(!seen.slice(-5).includes(restored.next(latest).reference.id),'Recent order survives reload');
   durations.sort((a,b)=>a-b);
   row.modes.push({mode,draws:2000,offbeatPercent:Number((rareRate*100).toFixed(2)),meanScore:Number(meanScore.toFixed(3)),uniformMeanScore:Number(poolMean.toFixed(3)),categories:categories.size,distinctReferences:references.size,topReferencePercent:top[0][1]/20,topFivePercent:top.slice(0,5).reduce((n,x)=>n+x[1],0)/20,repeatedCategoryPercent:repeatCategory/20,immediateRepeats:0,lastFiveRepeats:0,scores,p95SelectionMs:Number(durations[1900].toFixed(3))});
  }
  report.tonnages.push(row);console.log(JSON.stringify(row));
 }
 // Previous storage versions used only a unique per-session referenceIds list.
 const oldIds=W.eligibleWeightReferences(1300).slice(0,8).map(r=>r.id),old=[{sessionId:'legacy',kg:1300,referenceId:oldIds.at(-1),referenceIds:oldIds,category:ref(oldIds.at(-1)).categorie}],memory=new Map([['elan-session-weight-v1:local',JSON.stringify(old)]]),legacy=W.createSessionWeightComparisons({getStorage:()=>({getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)}),random:seeded(7)});
 const legacyModel={...model(1300),session:{...model(1300).session,id:'legacy'}};assert.equal(legacy.get(legacyModel).reference.id,oldIds.at(-1));assert(!oldIds.slice(-5).includes(legacy.next(legacyModel).reference.id));
 fs.writeFileSync(process.env.ELAN_SELECTION_REPORT||'/tmp/elan-selection-distribution.json',JSON.stringify(report,null,2)+'\n');
 console.log('PASS selection: 24,000 persisted draws across six tonnages, 10,000 controlled score draws, 15% offbeat lane, diversified categories, no last-five repeats, bounded natural quantities, exact existing totals, reload/legacy history and small-pool fallback.');
})().catch(e=>{console.error(e);process.exitCode=1});
