const {chromium,webkit,prepare}=require('./browser-fixtures.cjs'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const engine=process.env.ELAN_BROWSER==='webkit'?'webkit':'chromium',browser=await(engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{}:{executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});await prepare(context);
  await context.route('**/cloud-config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const cloudConfig={url:'',publishableKey:''}"}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));let acceptFinish=true;
  page.on('dialog',d=>acceptFinish?d.accept():d.dismiss());
  const ready=()=>page.waitForFunction(()=>document.querySelector('#save')?.textContent==='Enregistré sur cet appareil');
  const click=async action=>{const e=page.locator(`[data-action="${action}"]`).first();await e.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});await e.click();await ready();};
  const read=()=>page.evaluate(async()=>{const db=await new Promise(resolve=>{const q=indexedDB.open('elan-musculation');q.onsuccess=()=>resolve(q.result);});const state=await new Promise(resolve=>{const q=db.transaction('state').objectStore('state').get('main');q.onsuccess=()=>resolve(q.result);});db.close();return state;});
  const reference=()=>page.locator('.session-weight-card').getAttribute('data-weight-reference');
  await page.goto(process.env.ELAN_TEST_URL||'http://127.0.0.1:4173');await page.locator('.session-card').first().waitFor();
  await page.evaluate(async()=>{const db=await new Promise(resolve=>{const q=indexedDB.open('elan-musculation');q.onsuccess=()=>resolve(q.result);});const state=await new Promise(resolve=>{const q=db.transaction('state').objectStore('state').get('main');q.onsuccess=()=>resolve(q.result);});state.templates[0].exercises=state.templates[0].exercises.slice(0,1).map(e=>({...e,plannedSets:1,rest:0,convention:'Total',loadIdentity:{version:1,unit:'kg',convention:'Total',lateralMode:'total',source:'confirmed'}}));state.templates[0].groups=[];await new Promise(resolve=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(state,'main');tx.oncomplete=resolve;});db.close();});
  await page.reload();await page.locator('.session-card').first().waitFor();await click('start:0');
  assert.equal(await page.locator('.session-weight-card').count(),0);
  await page.locator('#weight').fill('125,5');await page.locator('#reps').fill('10');await page.locator('#next-rest').selectOption('0');await click('validate');
  acceptFinish=false;await click('finish');assert.equal(await page.locator('.session-weight-card').count(),0);assert((await read()).active);
  acceptFinish=true;await click('finish');await page.locator('.session-weight-card').waitFor();
  const baseline=await read(),saved=baseline.sessions.at(-1),expected=await page.evaluate(async s=>(await import('./saved-session.js')).savedSessionModel(s,[s]).amount,saved);
  assert.equal(expected,1255);assert.match(await page.locator('.session-weight-total').innerText(),/1\s255\s*kg\s*soulevés/);
  assert.equal(await page.locator('.saved-stats + .session-weight-card').count(),1);
  const first=await reference();
  // A genuine application re-render after leaving/returning to the recap.
  await click('exercise-open:detail:0');await click('exercise-back');assert.equal(await reference(),first);
  await page.locator('.saved-comparison>summary').click();await page.locator('.session-comparison>summary').click();
  await page.locator('#compare-session').dispatchEvent('change');assert.equal(await reference(),first);
  await page.locator('.saved-comparison>summary').click();
  const requests=[];page.on('request',request=>requests.push(request.url()));await context.setOffline(true);
  let last=first;for(let i=0;i<8;i++){await click('session-weight-next');const current=await reference();assert.notEqual(current,last);last=current;assert.match(await page.locator('.session-weight-total').innerText(),/1\s255\s*kg/);}
  assert.deepEqual(requests,[],'Instant rerolls perform no network calls');assert.deepEqual(await read(),baseline,'Rerolls never write workout data');
  assert(await page.locator('.session-weight-next').evaluate(e=>e===document.activeElement));
  assert.equal(await page.locator('.session-weight-card svg,.session-weight-card img').count(),0);
  assert.match(await page.locator('.session-weight-comparison').innerText(),/^Environ /);assert.equal(await page.locator('.session-weight-note').innerText(),'Équivalence approximative');
  fs.mkdirSync('docs/session-weight/captures',{recursive:true});
  for(const width of[320,375,390,430]){
   await page.setViewportSize({width,height:width===320?568:844});await page.locator('.session-weight-card').scrollIntoViewIfNeeded();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow at '+width);
   const bounds=await page.locator('.session-weight-card').evaluate(card=>{const c=card.getBoundingClientRect(),button=card.querySelector('button').getBoundingClientRect(),total=card.querySelector('strong').getBoundingClientRect(),nav=document.querySelector('nav').getBoundingClientRect();return{left:c.left,right:c.right,height:c.height,buttonHeight:button.height,buttonBottom:button.bottom,navTop:nav.top,total:total.width,card:c.width};});
   assert(bounds.left>=0&&bounds.right<=width);assert(bounds.buttonHeight>=44);assert(bounds.buttonBottom<=bounds.navTop);assert(bounds.height<300);
   if(width>=375)await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:`docs/session-weight/captures/${engine}-${width}.png`});
  }
  await context.setOffline(false);await page.emulateMedia({reducedMotion:'reduce'});await click('session-weight-next');
  assert.equal(await page.locator('.session-weight-comparison').evaluate(e=>e.getAnimations().length),0);
  await click('saved-home');await click('nav:history');await click('detail:'+saved.id);assert.equal(await page.locator('.session-weight-card').count(),0,'History presentation is unchanged');
  // Actual free workout with a custom exercise, completed entirely offline.
  await click('saved-home');await click('start-free');await click('live-add-ex');await page.locator('#picker-custom-name').fill('Machine personnelle');await click('picker-custom-add');
  await page.locator('#weight').fill('20');await page.locator('#reps').fill('12');await page.locator('#next-rest').selectOption('0');await click('validate');
  assert.equal(await page.locator('.session-weight-card').count(),0);await context.setOffline(true);await click('finish');await page.locator('.session-weight-card').waitFor();
  assert.match(await page.locator('.session-weight-total').innerText(),/240\s*kg/);assert((await read()).sessions.at(-1).freeMode);
  await click('session-weight-next');await context.setOffline(false);
  // Zero-weight and empty workouts save normally, without a misleading card.
  await click('saved-home');await click('start-free');await click('live-add-ex');await page.locator('#picker-custom-name').fill('Sans charge');await click('picker-custom-add');
  await page.locator('#weight').fill('0');await page.locator('#reps').fill('10');await page.locator('#next-rest').selectOption('0');await click('validate');await click('finish');
  await page.locator('.saved-session').waitFor();assert.equal(await page.locator('.session-weight-card').count(),0);
  await click('saved-home');await click('start-free');await click('finish');await page.locator('.saved-session').waitFor();assert.equal(await page.locator('.session-weight-card').count(),0);
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS session weight UI ('+engine+'): real template/free/custom completion, cancel, decimal total identical to recap, render stability, offline rerolls with no requests or data writes, focus/live region/reduced motion, history unchanged, zero/empty workouts, 320/375/390/430px captures.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
