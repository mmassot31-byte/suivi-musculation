const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try {
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await context.route('**/cloud-config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const cloudConfig={url:'',publishableKey:''}"}));
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await page.locator('.empty-home').waitFor();
  const result=await page.evaluate(async()=>{
   const {createFriendFeed}=await import('./friend-feed.js');
   const host=document.createElement('main');document.body.replaceChildren(host);
   let reads=0;
   const accounts={user:{id:'test'},service:{communityPublicRpc:async()=>({items:[{id:'session:test',kind:'session',username:'Alice',at:new Date().toISOString(),summary:{title:'Séance '+ ++reads,sets:3}}],hasMore:false})}};
   const feed=createFriendFeed(accounts,{render:()=>{host.innerHTML=feed.html()}});
   feed.configure({friendFeed:true,publicActivity:true});
   await feed.load();
   const counts=[];
   for(let i=0;i<6;i++) {
    await feed.load(false,true);
    counts.push({headings:host.querySelectorAll('.feed-section-heading').length,filters:host.querySelectorAll('[data-feed-kind]').length,lists:host.querySelectorAll('[data-friend-feed-list]').length,cards:host.querySelectorAll('.friend-activity').length});
   }
   const filter=host.querySelector('[data-feed-kind]');filter.value='records';feed.changed(filter);
   await feed.load(false,true);
   return {counts,reads,filter:host.querySelector('[data-feed-kind]').value,cards:host.querySelectorAll('.friend-activity').length,text:host.textContent};
  });
  for(const count of result.counts)assert.deepEqual(count,{headings:1,filters:1,lists:1,cards:1});
  assert.equal(result.reads,8);assert.equal(result.filter,'records');assert.equal(result.cards,0);
  assert.match(result.text,/Aucune activité correspondante/);
  console.log('PASS repeated background feed refresh: one heading/filter/list, current activities, selected filter retained.');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
