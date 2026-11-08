// Real app + Supabase SDK event path, two authenticated HTTP fixtures. No production writes.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const A='00000000-0000-0000-0000-000000000041',B='00000000-0000-0000-0000-000000000042',names={[A]:'Alice',[B]:'Alex'},goals=[],calls=[],errors=[];let fail=false;
 async function account(uid){
  const user={id:uid,email:names[uid]+'@example.invalid',user_metadata:{username:names[uid]}},expiry=Math.floor(Date.now()/1000)+3600,token=[{alg:'HS256',typ:'JWT'},{sub:uid,role:'authenticated',exp:expiry},'fixture'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await context.addInitScript(({token,expiry,user})=>localStorage.setItem('elan-auth-v1',JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:expiry,expires_in:3600,token_type:'bearer',user})),{token,expiry,user});
  await context.route('**/cloud-config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const cloudConfig={url:'https://challenge-test.invalid',publishableKey:'sb_publishable_fixture'}"}));
  await context.route('https://challenge-test.invalid/**',async r=>{
   const req=r.request(),path=new URL(req.url()).pathname,args=req.method()==='POST'?req.postDataJSON():{};let body=[],status=200;
   if(path.endsWith('/user'))body=user;
   else if(path.endsWith('/profiles'))body={id:uid,username:names[uid]};
   else if(path.endsWith('/private_documents'))body={payload:{version:1,templates:[],sessions:[],active:null},version:1};
   else if(path.endsWith('/competition_capabilities'))body={version:1,challenges:true,completedOnly:true};
   else if(path.endsWith('/community_capabilities'))body={version:1,friends:true,badges:true,goalChallenges:true};
   else if(path.endsWith('/friend_list'))body=[{id:uid===A?B:A,username:names[uid===A?B:A],relation:'accepted'}];
   else if(path.endsWith('/goal_list'))body=goals;
   else if(path.endsWith('/social_notifications'))body={friends:0,goals:goals.filter(g=>g.target_id===uid&&g.status==='pending').length,records:0};
   else if(path.endsWith('/goal_create')){
    assert.equal(req.headers().authorization,'Bearer '+token);calls.push({uid,args});
    if(fail){status=503;body={code:'TEST_UNAVAILABLE',message:'Erreur technique simulée'};}
    else{const g={id:'goal-'+calls.length,owner_id:uid,target_id:args.p_target,title:args.p_title||null,metric:args.p_metric,quantity:args.p_quantity,days:args.p_days,mode:args.p_mode,status:'pending',owner_value:0,target_value:0,initiator:names[uid],target:names[args.p_target]};goals.unshift(g);body=g.id;}
   }else if(path.endsWith('/goal_action')){const g=goals.find(g=>g.id===args.p_id);assert(g);assert.equal(uid,g.target_id);assert.equal(args.p_action,'accept');g.status='active';body=null;}
   else if(path.endsWith('/sync_snapshot'))body={version:2};
   await r.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  return {page,context};
 }
 const click=async(p,a)=>{const el=p.locator(`[data-action="${a}"]`).first();if(a.startsWith('community-goal:')){const summary=el.locator('xpath=ancestor::details[1]/summary');if(!await el.evaluate(e=>e.closest('details').open))await summary.click();}await el.evaluate(e=>{for(let n=e.parentElement;n;n=n.parentElement)if(n.tagName==='DETAILS')n.open=true});await el.click()};
 const open=async p=>{await p.goto(process.env.ELAN_TEST_URL||'http://127.0.0.1:4173');await click(p,'nav:ranking');await click(p,'rank-tab:challenges');await p.locator('[data-action="community-create"]').waitFor();};
 const create=async(p,target)=>{await click(p,'community-create');await click(p,'community-with');await p.selectOption('#community-target',target);};
 try{
  const {page:a,context}=await account(A);await open(a);
  await click(a,'community-create');
  const chooser=a.getByRole('dialog',{name:'Nouveau défi',exact:true});
  assert.equal(await chooser.evaluate(e=>e.matches(':modal')),true);
  assert.equal(await chooser.locator('.challenge-choice-row').count(),3);
  for(const width of [320,390,430]){
   await a.setViewportSize({width,height:844});
   const rect=await chooser.boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width);
   assert(rect.height<340);assert(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await a.setViewportSize({width:390,height:844});
  await a.screenshot({path:'/tmp/elan-challenge-modal-390.png'});
  await a.keyboard.press('Escape');assert.equal(await chooser.count(),0);
  assert.equal(await a.locator('[data-action="community-create"]').evaluate(e=>e===document.activeElement),true);
  await click(a,'community-create');await a.mouse.click(5,5);assert.equal(await chooser.count(),0);
  await click(a,'community-create');await chooser.getByRole('button',{name:'Fermer',exact:true}).click();assert.equal(await chooser.count(),0);
  // Series are accessed through New challenge; no redundant disclosure in the list.
  assert.equal(await a.getByText('Défis de séries · invitations et suivi',{exact:true}).count(),0);
  assert.equal(await a.locator('.legacy-challenges').count(),0);
  for(let attempt=0;attempt<2;attempt++){
   await click(a,'community-create');await click(a,'community-series');
   assert.equal(await a.locator('.community-sheet').count(),0);
   assert.equal(await a.locator('.legacy-challenges').isVisible(),true);
   assert.equal(await a.locator('.challenge-compose').evaluate(e=>e.open),true);
   assert.equal(await a.getByRole('heading',{name:'Ta prochaine référence.',exact:true}).isVisible(),true);
   await click(a,'rank-series-close');
   assert.equal(await a.locator('.legacy-challenges').count(),0);
  }
  await create(a,B);
  const title=a.locator('#community-goal-title');assert.equal(await title.getAttribute('maxlength'),'60');assert.equal(await title.inputValue(),'');
  await title.fill('Notre mois en forme 💪');assert.equal(await title.evaluate(e=>e===document.activeElement),true);assert.equal(await a.locator('.goal-preview strong').innerText(),'Notre mois en forme 💪');
  await click(a,'community-set:quantity:4');await click(a,'community-set:days:30');await click(a,'community-set:mode:together');assert.match(await a.locator('.goal-preview').innerText(),/4 séances ensemble en 30 jours/);assert.match(await a.locator('.goal-preview').innerText(),/chacun apporte sa part/);await click(a,'community-set:mode:each');assert.equal(await title.inputValue(),'Notre mois en forme 💪');assert.equal(await a.locator('[data-action="community-set:days:30"]').getAttribute('aria-pressed'),'true');assert.equal(await a.locator('.goal-rules').evaluate(e=>e.open),false);
  await title.fill('<img src=x onerror=alert(1)>');assert.equal(await a.locator('.goal-preview img').count(),0);assert.match(await a.locator('.goal-preview strong').innerText(),/<img/);
  await title.fill('UnNomTrèsLong'.repeat(4));for(const width of [320,390,430]){await a.setViewportSize({width,height:844});assert(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await a.setViewportSize({width:390,height:844});await title.fill('Notre mois en forme 💪');await a.locator('.community-sheet').screenshot({path:'/tmp/elan-challenge-named-390.png'});
  // Send while the field still owns focus: a change event must not consume the click.
  await title.fill('  Notre mois en forme 💪  ');await click(a,'community-send');await a.locator('.goal-card h3').first().waitFor();assert.equal(calls.length,1);assert.deepEqual(calls[0].args,{p_target:B,p_metric:'sessions',p_quantity:4,p_days:30,p_mode:'each',p_baseline:null,p_title:'Notre mois en forme 💪'});assert.equal(await a.locator('.goal-card h3').first().innerText(),'Notre mois en forme 💪');assert.equal(await a.locator('.goal-card .goal-objective').first().innerText(),'4 séances chacun en 30 jours');
  const {page:b}=await account(B);await open(b);assert.equal(await b.locator('.goal-card h3').first().innerText(),'Notre mois en forme 💪');await click(b,'community-goal:accept:'+goals[0].id);await b.locator('.goal-card progress').first().waitFor();await open(a);assert.equal(await a.locator('.goal-card h3').first().innerText(),'Notre mois en forme 💪');
  await create(a,B);assert.equal(await title.inputValue(),'');await title.fill('On remet ça');fail=true;await click(a,'community-send');await a.getByText('Erreur technique simulée',{exact:true}).waitFor();assert.equal(await title.inputValue(),'On remet ça');fail=false;await click(a,'community-send');await a.getByRole('heading',{name:'On remet ça',exact:true}).waitFor();
  await create(a,B);await click(a,'community-set:metric:work_sets');await click(a,'community-set:days:14');await click(a,'community-set:mode:together');await context.setOffline(true);await click(a,'community-set:quantity:75');assert.equal(await a.locator('[data-action="community-send"]').isEnabled(),false);await context.setOffline(false);await click(a,'community-set:quantity:50');await click(a,'community-send');await a.getByRole('heading',{name:'50 séries ensemble en 14 jours',exact:true}).waitFor();assert.equal(calls.at(-1).args.p_title,null);
  goals.find(g=>g.title==='Notre mois en forme 💪').status='completed';await open(b);await b.locator('summary').filter({hasText:/^Défis terminés/}).click();await click(b,'community-remake:'+goals.find(g=>g.title==='Notre mois en forme 💪').id);assert.equal(await b.locator('#community-goal-title').inputValue(),'Notre mois en forme 💪');assert.equal(await b.locator('#community-target').inputValue(),A);
  assert.deepEqual(errors,[]);console.log('PASS challenge creation: actual app/SDK, two authenticated fixtures, optional name/live escaped preview/focused-input single click, 4 sessions/30 days, each/together, acceptance/reload/remake from recipient, unnamed goals, server error/retry, 320/390/430 px. No real invitations.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
