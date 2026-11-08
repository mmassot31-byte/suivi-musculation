const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await c.route('**/cloud-config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const cloudConfig={url:'',publishableKey:''}"}));
 const p=await c.newPage();await p.goto('http://127.0.0.1:4173');await p.locator('.empty-home').waitFor();
 const result=await p.evaluate(async()=>{
  const {commonExercises}=await import('./exercise-catalogue.js'),{canonicalExerciseId}=await import('./exercise-reference.js'),{withSetIdentity}=await import('./identity.js'),{anatomicalProfile,weeklyProfile}=await import('./muscles.js'),{performedExerciseIndex,performedExercisesHtml}=await import('./performed-exercises.js');
  const h=commonExercises.filter(x=>/marteau/i.test(x.name)),d=h.find(x=>x.equipment==='dumbbell'),c=h.find(x=>x.equipment==='cable');
  const current={...structuredClone(d),libraryId:d.id,chargeProtocol:'elan-2',loadIdentity:{version:1,unit:'kg',convention:'Charge par côté',lateralMode:'one-side',source:'entry'}};
  const legacy={...current,id:'Curl marteau',libraryId:undefined,name:'Curl marteau'};
  const unknown={...current,id:'custom-unknown',libraryId:undefined,name:'Exercice sans classification',aliases:[],familyLabel:'Personnel',muscles:{primary:[],secondary:[]}};
  const make=(e,id,w,r)=>({...e,sets:[withSetIdentity(e,{id,type:'work',w,r})]});
  const sessions=[{id:'old',date:'2026-11-01T12:00:00Z',exercises:[make(legacy,'one',14,8)]},{id:'new',date:'2026-11-07T12:00:00Z',exercises:[make(current,'two',16,10),make({...current,...c,libraryId:c.id},'three',20,10),make(unknown,'four',10,8)]}];
  const index=performedExerciseIndex(sessions),host=document.createElement('div');document.body.replaceChildren(document.getElementById('elan-pictogram-library'),host);host.className='shell progress-shell';host.innerHTML=performedExercisesHtml(index,{today:'2026-11-08'});
  window.hammerIndex=index;window.hammerHtml=performedExercisesHtml;
  return {catalogue:h.length,dumbbells:h.filter(x=>x.equipment==='dumbbell').length,cables:h.filter(x=>x.equipment==='cable').length,same:canonicalExerciseId(legacy)===canonicalExerciseId(current),profile:anatomicalProfile(current),weekly:weeklyProfile(anatomicalProfile(current)),rows:index.length,sessions:index.find(x=>x.exercise.equipment==='dumbbell'&&x.exercise.muscles.primary.includes('brachialis')).sessions.length};
 });
 assert.equal(result.catalogue,2);assert.equal(result.dumbbells,1);assert.equal(result.cables,1);assert.equal(result.same,true);assert.equal(result.rows,3);assert.equal(result.sessions,2);
 assert.deepEqual(result.profile,{primary:['brachialis'],secondary:['biceps','forearms']});assert.deepEqual(result.weekly,{primary:['biceps'],secondary:['forearms']});
 for(const width of [320,390,430]){
  await p.setViewportSize({width,height:844});
  const cards=await p.locator('.journal-card-header').evaluateAll(es=>es.map(e=>{const title=e.querySelector('.journal-card-title').getBoundingClientRect(),chart=e.querySelector('.journal-spark').getBoundingClientRect();return {width:title.width,aligned:chart.left>=title.right,icon:!!e.querySelector('.exercise-icon')};}));
  assert(cards.every(x=>x.width>90&&x.aligned));assert.equal(cards.filter(x=>x.icon).length,2);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.screenshot({path:`/tmp/elan-hammer-curl-${width}.png`});
 }
 for(const query of ['brachial','fléchisseurs du coude','marteau']){
  const count=await p.evaluate(query=>{document.querySelector('.shell').innerHTML=window.hammerHtml(window.hammerIndex,{query,today:'2026-11-08'});return document.querySelectorAll('.journal-card').length},query);assert.equal(count,2);
 }
 console.log('PASS hammer curl: one dumbbell reference, cable stays separate, legacy/current history merged, brachial and elbow-flexor search, weighted muscle union, correct icon and stable columns with/without icon at 320/390/430.');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
