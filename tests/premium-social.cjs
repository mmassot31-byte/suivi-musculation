// Presentation fixtures only. Never connects to a real account or Supabase project.
const {chromium}=require('./browser-fixtures.cjs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/cloud-config.js',r=>r.fulfill({contentType:'application/javascript',body:"export const cloudConfig={url:'http://127.0.0.1:55436',publishableKey:'sb_publishable_visual_fixture'};"}));
 await context.route('http://127.0.0.1:55436/**',r=>{const path=new URL(r.request().url()).pathname;let body=[];
 if(path.endsWith('/competition_capabilities'))body={version:1,challenges:true,completedOnly:true};
 if(path.includes('exercise_variants'))body=[{id:'bench',label:'Développé couché · barre',convention:'Total',equipment:'barbell',description:'Charge totale sur une barre.'}];
 if(path.endsWith('/competition_rankings'))body={records:{charge:{value:120,reps:3,username:'Maxime',ties:2},tonnage:{value:2040,username:'Alex',ties:1}},entries:[{rank:1,username:'Maxime',value:120,reps:3},{rank:1,username:'Camille',value:120,reps:3}],total:2};
 if(path.endsWith('/sport_profile'))body={username:'Maxime',records:[{exercise_label:'Développé couché · barre',convention:'Total',variant_id:'bench',weight:120,reps:3,tonnage:1800}],recent:[{exercise_label:'Développé couché · barre',weight:120,reps:3,performed_at:'2026-11-01',completed:true}]};
 return r.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
 });
 await page.goto('http://127.0.0.1:4173');await page.locator('.session-card').first().waitFor();await page.locator('[data-action="nav:ranking"]').click();await page.locator('[data-action="rank-tab:rankings"]').click();await page.locator('.record-card').filter({hasText:'2 040'}).waitFor();
 for(const width of [320,375,390,430]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator('.record-card').count(),2);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/elan-premium-ranking-populated.png',fullPage:true});
 await page.locator('.record-card [data-action="public-open:Maxime"]').click();await page.locator('.profile-sport-results>summary').click();await page.locator('.profile-record').waitFor();await page.screenshot({path:'/tmp/elan-premium-profile-populated.png',fullPage:true});
 await page.locator('[data-action="account-open"]').click();await page.locator('[data-action="account-register"]').click();await page.locator('#account-form').waitFor();assert.match(await page.locator('.publication-disclosure').innerText(),/importées automatiquement/);
 for(const width of [320,375,390,430]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/elan-premium-signup.png',fullPage:true});assert.deepEqual(errors,[]);console.log('PASS: populated rankings, ties, public profile and signup visual fixtures at four widths; no production API contacted. This is not a live authentication/security test.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
