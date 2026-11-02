const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const click=async a=>{await page.locator(`button[data-action="${a}"]`).click();await page.waitForFunction(()=>document.querySelector('#save')?.textContent==='Enregistré sur cet appareil');if(a==='finish'){await page.locator('.finish-summary').waitFor();await page.locator('nav [data-action="nav:history"]').click()}};
 const read=()=>page.evaluate(async()=>{const d=await new Promise(r=>{const q=indexedDB.open('elan-musculation');q.onsuccess=()=>r(q.result)});try{return await new Promise(r=>{const q=d.transaction('state').objectStore('state').get('main');q.onsuccess=()=>r(q.result)})}finally{d.close()}});
 await page.goto('http://127.0.0.1:4173');await click('start:0');
 await page.locator('#weight').fill('60');await click('validate');
 await page.locator('summary').getByText('Charges récentes et réglages de saisie').click();await page.locator('#auto').check();await click('open-superset');await page.locator('#superset-b').selectOption('0');await click('create-superset');assert.match(await page.locator('#superset-error').innerText(),/différents/);
 await page.locator('#superset-b').selectOption('1');await click('create-superset');assert.equal(await page.locator('.superset-group').count(),1);
 assert.equal((await read()).active.exercises[0].sets.length,1);
 // Series alternate while weights, warmups and corrections keep their own identity.
 await page.locator('#weight').fill('62,5');await click('validate');assert.equal(await page.locator('.exercise-active h2').innerText(),'Machine à mollets');
 await page.locator('#weight').fill('70');await click('validate');assert.equal(await page.locator('.exercise-active h2').innerText(),'Pendulum squat');await page.waitForFunction(()=>document.querySelector('#timer').textContent.startsWith('Repos '));
 await click('edit:current:0');await page.locator('#weight').fill('61');await click('validate');assert.equal(await page.locator('.exercise-active h2').innerText(),'Pendulum squat');
 await page.locator('#advanced').evaluate(e=>e.open=true);await page.locator('#type').selectOption('warmup');await click('validate');assert.equal(await page.locator('.exercise-active h2').innerText(),'Pendulum squat');
 await page.reload();await click('resume');assert.equal(await page.locator('.superset-group').count(),1);
 // Dissociation never removes data.
 await click('unpair:0');let state=await read();assert.equal(state.active.exercises[0].sets.length,3);assert.equal(state.active.exercises[1].sets.length,1);assert.ok(!state.active.exercises[0].superset);
 // Add one exercise next to an existing one.
 await click('open-superset');await page.locator('#superset-b').selectOption('new');await page.locator('#new-b').fill('Curl câble');await click('create-superset');assert.equal((await read()).active.exercises.length,6);
 await click('unpair:0');
 // Add two new exercises, and keep two independent groups.
 await click('open-superset');await page.locator('#superset-a').selectOption('new');await page.locator('#new-a').fill('Curl incliné');await page.locator('#superset-b').selectOption('new');await page.locator('#new-b').fill('Extension triceps');await click('create-superset');
 await click('open-superset');await page.locator('#superset-a').selectOption('0');await page.locator('#superset-b').selectOption('1');await click('create-superset');assert.equal(await page.locator('.superset-group').count(),2);
 await page.setViewportSize({width:320,height:740});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // Round trip metadata in JSON, and reject malformed groups before changing state.
 await click('settings');const downloaded=page.waitForEvent('download');await click('export');const path=await (await downloaded).path();await page.locator('#file').setInputFiles(path);await page.getByText('Import terminé · doublons ignorés').waitFor();
 state=await read();const bad=structuredClone(state);bad.active.exercises[0].superset='orphan';await page.locator('#file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await page.getByText('Fichier incompatible ou données invalides. Aucun changement effectué.').waitFor();assert.deepEqual(await read(),state);
 await click('nav:home');await click('resume');await page.evaluate(()=>navigator.serviceWorker.ready);await page.context().setOffline(true);await page.reload();await click('resume');assert.equal(await page.locator('.superset-group').count(),2);await page.context().setOffline(false);
 await page.screenshot({path:'/tmp/elan-supersets.png',fullPage:true});
 await click('finish');await click('detail:'+(await read()).sessions[0].id);assert.equal(await page.locator('.superset-history').count(),4);await click('duplicate-session');state=await read();assert.equal(await page.locator('.superset-group').count(),2);assert.ok(state.active.exercises.every(e=>!e.sets.length&&(!e.superset||e.supersetStart===0)));assert.deepEqual(errors,[]);
 console.log('PASS: supersets existants et nouveaux, alternance, corrections, échauffements, dissociation sans perte, persistance, export/import validé, historique, mobile 320px et hors connexion.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
