// Real application/SDK, isolated authenticated HTTP fixtures. Never sends real invitations.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const {initialTemplates}=await import('../data.js'),A='00000000-0000-0000-0000-000000000051',B='00000000-0000-0000-0000-000000000052',C='00000000-0000-0000-0000-000000000053',D='00000000-0000-0000-0000-000000000054';
 const names={[A]:'Alex',[B]:'Testeur',[C]:'Camille',[D]:'Dorian'},requests=new Set([C,D]);let goal=true,record=true,extra=0,failure=false,reads=0,mutations=0;
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const errors=[];
 async function account(uid){
  const user={id:uid,email:names[uid]+'@example.invalid',user_metadata:{username:names[uid]}},expiry=Math.floor(Date.now()/1000)+3600,token=[{alg:'HS256',typ:'JWT'},{sub:uid,role:'authenticated',exp:expiry},'fixture'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');let version=1;
  const context=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await context.addInitScript(({user,expiry,token})=>{if(!sessionStorage.getItem('fixture-auth-seeded')){localStorage.setItem('elan-auth-v1',JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:expiry,expires_in:3600,token_type:'bearer',user}));sessionStorage.setItem('fixture-auth-seeded','1');}},{user,expiry,token});
  await context.route('**/cloud-config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const cloudConfig={url:'https://notifications.invalid',publishableKey:'sb_publishable_fixture'}"}));
  await context.route('https://notifications.invalid/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname,args=req.method()==='POST'?req.postDataJSON():{};let body=[],status=200;
   if(path.endsWith('/user'))body=user;
   else if(path.endsWith('/logout'))body={};
   else if(path.endsWith('/profiles'))body={id:uid,username:names[uid]};
   else if(path.endsWith('/sport_profile'))body={username:names[uid],records:[],recent:[]};
   else if(path.endsWith('/social_profile'))body={username:names[uid],badges:[],featured:[],totals:{},week:{}};
   else if(path.endsWith('/private_documents'))body={payload:{version:1,templates:uid===B?[structuredClone(initialTemplates[0])]:[],sessions:[],active:null},version};
   else if(path.endsWith('/sync_snapshot'))body={version:++version};
   else if(path.endsWith('/competition_capabilities'))body={version:1,challenges:true,completedOnly:true};
   else if(path.endsWith('/community_capabilities'))body={version:1,friends:true,badges:true,goalChallenges:true};
   else if(path.endsWith('/social_notifications')){reads++;assert.equal(req.headers().authorization,'Bearer '+token);if(failure){status=503;body={code:'TEST_UNAVAILABLE',message:'Panne simulée'};}else body=uid===B?{friends:requests.size+extra,goals:goal?1:0,records:record?1:0}:{friends:0,goals:0,records:0};}
   else if(path.endsWith('/friend_list'))body=uid===B?[{id:A,username:names[A],relation:'accepted'},...[...requests].map(id=>({id,username:names[id],relation:'incoming'}))]:[];
   else if(path.endsWith('/friend_action')){assert(['accept','decline'].includes(args.p_action));assert(requests.has(args.p_target));requests.delete(args.p_target);mutations++;body='accepted';}
   else if(path.endsWith('/goal_list'))body=uid===B&&goal?[{id:'shared',owner_id:A,target_id:B,initiator:'Alex',target:'Testeur',metric:'sessions',quantity:4,days:30,mode:'each',title:'Notre mois en forme',status:'pending'}]:[];
   else if(path.endsWith('/goal_action')){assert.equal(args.p_id,'shared');assert.equal(args.p_action,'decline');goal=false;mutations++;body=null;}
   else if(path.endsWith('/challenge_list'))body=uid===B&&record?[{id:'record',initiatorId:A,targetId:B,initiator:'Alex',target:'Testeur',label:'Curl',weight:16,referenceReps:10,convention:'Par haltère',days:7,status:'pending',canRespond:true,inviteExpiresAt:'2026-12-01T12:00:00Z'}]:[];
   else if(path.endsWith('/challenge_respond')){assert.equal(args.p_id,'record');record=false;mutations++;body={status:'declined'};}
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto(process.env.ELAN_TEST_URL||'http://127.0.0.1:4173');return {page,context};
 }
 const click=async(p,action)=>{const el=p.locator(`[data-action="${action}"]`).first();if(action.startsWith('community-goal:')){const summary=el.locator('xpath=ancestor::details[1]/summary');if(!await el.evaluate(e=>e.closest('details').open))await summary.click();}await el.evaluate(e=>{for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});await el.click();};
 const badge=p=>p.locator('[data-notification-count="total"]');
 const count=async(p,n)=>{await p.waitForFunction(n=>{const el=document.querySelector('[data-notification-count="total"]');return el&&Number(el.textContent)===n&&el.hidden===(n===0);},n);};
 try{
  const {page:a}=await account(A),{page:p,context}=await account(B);await count(a,0);await count(p,4);assert.equal(mutations,0);
  await click(p,'notifications-toggle');assert.equal(await p.locator('[data-action="notifications-toggle"]').getAttribute('aria-expanded'),'true');assert.match(await p.locator('[data-action="notifications-friends"]').innerText(),/2 demandes d’amis/);assert.match(await p.locator('[data-action="notifications-goals"]').innerText(),/1 défi entre amis/);assert.match(await p.locator('[data-action="notifications-records"]').innerText(),/1 défi de record/);await p.keyboard.press('Escape');assert.equal(await p.locator('#notifications-panel').isVisible(),false);assert.equal(await p.locator('[data-action="notifications-toggle"]').evaluate(e=>e===document.activeElement),true);await count(p,4);
  // Notification updates must leave workout controls, focus and layout completely alone.
  await click(p,'start:0');await p.locator('#weight').fill('53');await p.locator('#reps').fill('9');await p.evaluate(()=>window.heldInput=document.querySelector('#reps'));const y=await p.locator('.work-heading').evaluate(e=>e.getBoundingClientRect().y+scrollY);extra=1;const before=reads;await p.clock.fastForward(30010);await count(p,5);assert(reads>before);assert.equal(await p.locator('#reps').evaluate(e=>e===heldInput&&e===document.activeElement),true);assert.equal(await p.locator('#reps').inputValue(),'9');assert.equal(await p.locator('#weight').inputValue(),'53');assert.equal(await p.locator('.work-heading').evaluate(e=>e.getBoundingClientRect().y+scrollY),y);
  await click(p,'notifications-toggle');for(const width of [320,390,430]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const box=await p.locator('#notifications-panel').boundingBox();assert(box.x>=0&&box.x+box.width<=width);}
  await p.setViewportSize({width:390,height:844});await p.locator('#notifications-panel').screenshot({path:'/tmp/elan-notifications-390.png'});await p.locator('.brand').click();assert.equal(await p.locator('#notifications-panel').isVisible(),false);
  // Hidden documents stop polling; returning to the app fetches current counts immediately.
  await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});const hiddenReads=reads;await p.clock.fastForward(60010);assert.equal(reads,hiddenReads);extra=2;await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await count(p,6);
  await context.setOffline(true);await click(p,'notifications-toggle');assert.match(await p.locator('[data-notification-status]').innerText(),/Hors connexion/);await count(p,6);extra=0;await context.setOffline(false);await count(p,4);
  failure=true;await click(p,'notifications-close');await click(p,'notifications-toggle');await p.getByText('Actualisation indisponible. Réessaie.',{exact:true}).waitFor();await count(p,4);assert.equal(await p.getByText('Aucune invitation en attente.',{exact:true}).count(),0);failure=false;await click(p,'notifications-retry');await p.getByText('Invitations en attente de ta réponse.',{exact:true}).waitFor();
  await click(p,'account-open');await p.locator('.own-profile').waitFor();assert.equal(await p.locator('[data-action="account-friends"] [data-notification-count="friends"]').innerText(),'2');assert.match(await p.locator('[data-action="account-friends"]').getAttribute('aria-label'),/2 demandes/);await click(p,'notifications-toggle');await click(p,'notifications-friends');await p.locator('.profile-friends').waitFor();await p.waitForFunction(()=>document.querySelector('[data-action="nav:body"]')?.getAttribute('aria-current')==='page');await p.getByText('DEMANDES REÇUES · 2',{exact:true}).waitFor();await click(p,'community-friend:accept:'+C);await count(p,3);await click(p,'community-friend:decline:'+D);await count(p,2);await click(p,'account-open');await p.locator('.own-profile').waitFor();assert.equal(await p.locator('[data-action="account-friends"] [data-notification-count="friends"]').isVisible(),false);assert.match(await p.locator('[data-action="notifications-toggle"]').getAttribute('aria-label'),/2 invitations/);
  await click(p,'notifications-toggle');await click(p,'notifications-goals');await p.getByRole('heading',{name:'Notre mois en forme',exact:true}).waitFor();await click(p,'community-goal:decline:shared');await count(p,1);
  await click(p,'notifications-toggle');await click(p,'notifications-records');await p.waitForFunction(()=>document.querySelector('.legacy-challenges')?.open===true);await p.locator('.challenge-card').waitFor();await click(p,'challenge-decline:record');await count(p,0);assert.equal(mutations,4);await count(a,0);
  await click(p,'notifications-toggle');await p.getByText('Aucune invitation en attente.',{exact:true}).waitFor();await click(p,'account-open');assert.equal(await p.locator('#notifications-panel').isVisible(),false);
  await p.locator('.community-profile').waitFor();await click(p,'account-logout');await p.waitForFunction(()=>!document.querySelector('[data-action="notifications-toggle"]'));assert.equal(await p.locator('[data-notification-count="total"]').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS notifications UI: authenticated per-account counts, friend accept/refuse and both challenge types, automatic 30-second refresh, hidden/foreground/reconnect/error/retry, unchanged workout DOM/focus/values/layout, Escape/outside click, empty state/logout, 320/390/430 px; HTTP fixtures only.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
