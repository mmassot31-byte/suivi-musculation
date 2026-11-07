// Exercise delayed responses and account changes without browser or production access.
const assert=require('node:assert/strict');
(async()=>{
 global.document={visibilityState:'visible',querySelectorAll:()=>[],querySelector:()=>null,getElementById:()=>null};
 Object.defineProperty(global,'navigator',{value:{onLine:true},configurable:true});
 const {createNotifications}=await import('../notifications.js');
 const pending=[],accounts={user:{id:'A'},service:{communityRpc:(name,args,uid)=>{assert.equal(name,'social_notifications');assert.deepEqual(args,{});return new Promise((resolve,reject)=>pending.push({uid,resolve,reject}));}}};
 const n=createNotifications(accounts),old=n.refresh(true);assert.equal(pending[0].uid,'A');const duplicate=n.refresh(true);assert.equal(pending.length,1);accounts.user={id:'B'};const fresh=n.refresh(true);assert.equal(pending[1].uid,'B');pending[1].resolve({friends:2,goals:1,records:0});await fresh;assert.match(n.badge('total'),/>3</);
 pending[0].resolve({friends:98,goals:98,records:98});await old;await duplicate;assert.match(n.badge('total'),/>3</,'late A response cannot replace B counts');
 let r=n.refresh(true);pending.at(-1).reject(Error('Unavailable'));await r;assert.match(n.badge('total'),/>3</,'transient error keeps confirmed counts');
 r=n.refresh(true);pending.at(-1).resolve({friends:-1,goals:0,records:0});await r;assert.match(n.badge('total'),/>3</,'invalid data does not manufacture a zero count');
 navigator.onLine=false;const before=pending.length;await n.refresh(true);assert.equal(pending.length,before);assert.match(n.badge('total'),/>3</);navigator.onLine=true;
 r=n.refresh(true);pending.at(-1).resolve({friends:120,goals:0,records:0});await r;assert.match(n.badge('total'),/>99\+</);assert.match(n.html(),/120 invitations en attente/);
 accounts.user=null;assert.equal(n.html(),'');assert.match(n.badge('total'),/hidden></);await n.refresh(true);assert.equal(pending.length,before+1);
 accounts.user={id:'A'};assert.match(n.badge('total'),/hidden></,'switching back never reveals a previous account cache');
 r=n.refresh(true);pending.at(-1).resolve({friends:0,goals:0,records:0});await r;assert.match(n.badge('total'),/hidden></);
 // A delayed poll from before acceptance must not become the final displayed result.
 const polling=n.refresh(true),stale=pending.at(-1),responding=n.refreshAfterAction();stale.resolve({friends:1,goals:0,records:0});await polling;await Promise.resolve();assert.notEqual(pending.at(-1),stale);pending.at(-1).resolve({friends:0,goals:0,records:0});await responding;assert.match(n.badge('total'),/hidden></);
 // A read acknowledgment from a previous account must never open its activity in the new account.
 let releaseRead,opened=0;const nextAccounts={user:{id:'A'},service:{communityRpc(name){if(name==='social_encouragement_read')return new Promise(r=>releaseRead=r);return Promise.resolve({friends:0,goals:0,records:0,cheers:nextAccounts.user.id==='A'?1:0,encouragements:nextAccounts.user.id==='A'?[{id:'note',activity_id:'activity',username:'Marion',created_at:new Date().toISOString()}]:[]});}}};const next=createNotifications(nextAccounts,{openActivity(){opened++}});await next.refresh(true);assert.match(next.badge('total'),/>1</);const reading=next.action('notifications-activity:note');nextAccounts.user={id:'B'};await next.refresh(true);releaseRead(true);await reading;assert.equal(opened,0);assert.match(next.badge('total'),/hidden></);
 console.log('PASS notification state: stale account response ignored, deduplicated requests, logout/relogin isolation, offline/error/invalid-response preservation, real zero and 99+ visual/full accessible count.');
})().catch(e=>{console.error(e);process.exitCode=1;});
