// Completed-session views from isolated local data; no cloud calls or user writes.
const {chromium}=require('./browser-fixtures.cjs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',timezoneId:'Europe/Paris'});
  await context.route('**/cloud-config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const cloudConfig={url:'',publishableKey:''};"}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-11-06T12:00:00Z')});
  const click=async a=>{const el=page.locator(`[data-action="${a}"]`).first();await el.evaluate(e=>{for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});await el.click();};
  await page.goto(process.env.ELAN_TEST_URL||'http://127.0.0.1:4173');await page.locator('.session-card').first().waitFor();
  await page.evaluate(async()=>{
   const {defaultProfile,anatomicalMuscles}=await import('./muscles.js');
   const db=await new Promise(resolve=>{const q=indexedDB.open('elan-musculation');q.onsuccess=()=>resolve(q.result);});
   const state=await new Promise(resolve=>{const q=db.transaction('state').objectStore('state').get('main');q.onsuccess=()=>resolve(q.result);}),base=state.templates[0].exercises[0];let index=0;
   const lift=(id,n,p)=>({...structuredClone(base),id,instanceId:'instance-'+index++,name:id,muscles:p||defaultProfile(id),plannedSets:n,sets:Array.from({length:n},(_,i)=>({id:id+'-'+index+'-'+i,w:20,r:10,type:'work',drops:[],rir:null,notes:''}))});
   const session=(id,name,exercises)=>({id,templateId:id,name,type:'custom',date:'2026-11-03T12:00:00Z',endedAt:'2026-11-03T13:00:00Z',groups:[],exercises});
   state.sessions=[
    session('radar-pull','Pull',[lift('Low row',3),lift('Tirage vertical',3),lift('Facepull',2),lift('Curl marteau',3)]),
    session('radar-push','Push',[lift('Développé couché',3),lift('Shoulder press',2),lift('Élévations latérales aux haltères',3),lift('Triceps haltère',3)]),
    session('radar-legs','Jambes',[lift('Pendulum squat',4),lift('Hip thrust',3),lift('Machine à mollets',3),lift('Leg curl',3,{primary:['hamstrings'],secondary:[]}),lift('Abduction',2,{primary:['glutes','abductors'],secondary:[]})]),
    session('radar-full','Full Body',[lift('Développé couché',2),lift('Low row',2),lift('Shoulder press',2),lift('Pendulum squat',3),lift('Leg curl',2,{primary:['hamstrings'],secondary:[]}),lift('Machine à mollets',2),lift('Abdominaux',2,{primary:['abs'],secondary:[]})]),
    session('radar-custom','Séance personnalisée',[lift('Sur mesure',3,{primary:['chest','traps','upper_back'],secondary:['front_delts','side_delts','rear_delts']}),lift('Curl inversé',2),lift('Poignets',2,{primary:['forearms'],secondary:[]})]),
    session('radar-one','Un seul groupe',[lift('Curl biceps',3)]),
    session('radar-two','Deux groupes',[lift('Presse personnalisée',3,{primary:['chest'],secondary:['triceps']})]),
    session('radar-all','Tous les groupes',anatomicalMuscles.map(([id])=>lift('Muscle '+id,1,{primary:[id],secondary:[]})))
   ];
   await new Promise(resolve=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(state,'main');tx.oncomplete=resolve;});db.close();
  });
  await page.reload();await page.locator('.session-card').first().waitFor();
  const read=()=>page.evaluate(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('elan-musculation');q.onsuccess=()=>r(q.result);});const value=await new Promise(r=>{const q=db.transaction('state').objectStore('state').get('main');q.onsuccess=()=>r(q.result);});db.close();return value;});
  const before=await read();
  for(const id of ['pull','push','legs','full','custom','one','two','all']){
   await click('nav:history');await click('detail:radar-'+id);const panel=page.locator('.muscle-radar-panel');await panel.waitFor();assert.equal(await panel.locator('.radar-detail').evaluate(e=>e.open),false);
   for(const width of [320,390,430]){
    await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(['one','two'].includes(id)){assert.equal(await panel.locator('.muscle-radar').count(),0);assert.equal(await panel.locator('.radar-bar-row').count(),id==='one'?1:2);assert.equal(await panel.locator('.radar-secondary-bar').count(),0);}
    else{
     const svg=panel.locator('svg.muscle-radar');assert.equal(await svg.locator('.radar-direct').count(),1);assert.equal(await svg.locator('circle,.radar-previous,.radar-secondary-dot').count(),0);
     const geometry=await svg.evaluate(e=>({width:e.viewBox.baseVal.width,height:e.viewBox.baseVal.height,top:e.viewBox.baseVal.y,boxes:[...e.querySelectorAll('.radar-axis-label')].map(el=>{const b=el.getBBox();return{x:b.x,y:b.y,w:b.width,h:b.height};})}));
     for(const b of geometry.boxes)assert(b.x>=0&&b.y>=geometry.top&&b.x+b.w<=geometry.width&&b.y+b.h<=geometry.top+geometry.height,`${id}/${width} clipped label ${JSON.stringify(b)}`);
     for(let i=0;i<geometry.boxes.length;i++)for(let j=i+1;j<geometry.boxes.length;j++){const a=geometry.boxes[i],b=geometry.boxes[j];assert(!(Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)+1&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y)+1),`${id}/${width}: labels overlap`);}
     assert.equal(await svg.locator('.radar-axis-value').count(),geometry.boxes.length);
     const legend=panel.locator('.saved-muscle-volumes-list>div');if(await legend.count()){const axes=await svg.getAttribute('data-axes');assert.equal(await legend.count(),axes.split(',').length);if(id==='all')assert.equal(await legend.count(),14);assert(await legend.evaluateAll(rows=>rows.every(row=>{const box=row.getBoundingClientRect();return [...row.children].every(child=>{const r=child.getBoundingClientRect();return r.x>=box.x-1&&r.right<=box.right+1})})),`${id}/${width}: external labels and values remain inside their row`);}else if(id==='all')assert.equal(geometry.boxes.length,14);
    }
    if(width===390)await panel.screenshot({path:`/tmp/elan-session-radar-${id}-390.png`});
   }
   if(id==='custom'){await panel.locator('.radar-detail>summary').click();assert.match(await panel.locator('.radar-detail').innerText(),/Trapèzes/);assert.match(await panel.locator('.radar-detail').innerText(),/Brachial/);assert.match(await panel.locator('.radar-detail').innerText(),/Directes.*Secondaires/s);}
  }
  assert.deepEqual(await read(),before,'viewing the new charts does not rewrite existing user data');assert.deepEqual(errors,[]);
  console.log('PASS session radar UI: actual saved-session views for Pull/Push/legs/full body/custom, 1/2-group bars and all 14 groups; single weighted surface, readable contained nonoverlapping labels at 320/390/430 px, raw muscle details, unchanged stored documents.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
