// Real PostgreSQL roles and functions in a fresh throwaway database. No production connection.
const {Client}=require('pg'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const config={host:'127.0.0.1',port:55432,user:'postgres',password:'local-test-only'},admin=new Client({...config,database:'postgres'});await admin.connect();
 const name='elan_competition_'+Date.now();await admin.query('create database '+name);const db=new Client({...config,database:name});await db.connect();
 try{
 await db.query(`create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;do $$begin if not exists(select 1 from pg_roles where rolname='anon')then create role anon;end if;if not exists(select 1 from pg_roles where rolname='authenticated')then create role authenticated;end if;end$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 for(const file of ['202611040001_accounts.sql','202611040003_machine_variants.sql','202611050004_competition.sql','202611050005_community.sql','202611050006_goal_tonnage_proof.sql','202611050007_personal_record_search.sql','202611060008_goal_titles.sql','202611060009_social_notifications.sql','202611060010_friends_activity.sql'])await db.query(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 const A='00000000-0000-0000-0000-000000000001',B='00000000-0000-0000-0000-000000000002',C='00000000-0000-0000-0000-000000000003';
 await db.query('insert into auth.users values($1,$2),($3,$4),($5,$6)',[A,{username:'Maxime'},B,{username:'Alex'},C,{username:'Camille'}]);
 async function as(uid,sql,args=[]){await db.query('begin');try{await db.query('set local role '+(uid?'authenticated':'anon'));await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid||'']);const r=await db.query(sql,args);await db.query('commit');return r.rows}catch(e){await db.query('rollback');throw e}}
 const rpc=async(uid,fn,args=[],cast='')=>(await as(uid,'select public.'+fn+'('+args.map((_,i)=>'$'+(i+1)+(cast.split(',')[i]||'')).join(',')+') result',args))[0].result;
 const variant='lateral-dumbbell-each',makeSet=(id,w,r,identity=true)=>({id,w,r,type:'work',notes:'NEVER PUBLIC',drops:[],...(identity?{loadIdentity:{version:1,unit:'kg',convention:'Par haltère',lateralMode:'simultaneous-pair',source:'entry'}}:{})});
 const session=(id,sets,date=new Date().toISOString())=>({id,name:'PRIVATE NAME',date,endedAt:date,exercises:[{id:'Élévations latérales aux haltères',instanceId:'raise',name:'Élévations latérales',convention:'Par haltère',sets}]}),payload=sessions=>({version:1,templates:[],sessions,active:null,privateNotes:'PRIVATE',bodyMeasurements:[{weight:88}]}),versions={[A]:0,[B]:0,[C]:0};
 async function sync(uid,p){const r=await rpc(uid,'sync_snapshot',[p,versions[uid],null,null]);versions[uid]=r.version;return r}
 const pa=payload([session('a',[makeSet('a1',16,10)])]),pb=payload([session('b',[makeSet('b1',16,11)])]),pc=payload([session('c',[makeSet('c1',16,11)])]);
 await sync(A,pa);await sync(B,pb);await sync(C,pc);
 assert.equal((await rpc(null,'competition_capabilities')).completedOnly,true);
 let result=await rpc(B,'competition_rankings',[variant,'repetitions',16,null,0,25]);assert.deepEqual(result.entries.map(x=>x.rank),[1,1,3]);assert.equal(result.myRank,1);assert.equal(result.records.repetitions.ties,2);assert.equal(result.records.tonnage.value,352);
 result=await rpc(null,'competition_rankings',[variant,'charge',null,10,0,25]);assert.equal(result.entries.length,1);assert.equal(result.entries[0].username,'Maxime');assert.equal(result.records.charge.ties,3);
 assert.equal((await rpc(null,'competition_rankings',[variant,'charge',null,null,1,1])).entries.length,1);
 const privateRead=await as(B,'select * from public.private_documents where owner_id=$1',[A]);assert.equal(privateRead.length,0);
 for(const uid of [null,B]){await assert.rejects(as(uid,'select * from public.competition_performances'));await assert.rejects(as(uid,'select * from public.training_challenges'));await assert.rejects(as(uid,'select * from public.performances'));await assert.rejects(rpc(uid,'rebuild_competition',[A,pa]));}
 await assert.rejects(as(B,'update public.private_documents set payload=$1 where owner_id=$2',[{},A]));await assert.rejects(rpc(null,'challenge_list'));
 assert.equal(JSON.stringify(await rpc(null,'sport_profile',['Maxime'])).includes('PRIVATE'),false);
 // Active sets never become public, even if their load is higher than all completed sets.
 pa.active=session('active',[makeSet('active',999,99)]);await sync(A,pa);assert.equal((await rpc(null,'competition_rankings',[variant])).records.charge.value,16);assert.ok((await rpc(null,'sport_profile',['Maxime'])).recent.every(x=>x.completed));
 const incomplete=session('not-closed',[makeSet('never',777,99)]);delete incomplete.endedAt;pa.sessions.push(incomplete);await sync(A,pa);assert.equal((await rpc(null,'competition_rankings',[variant])).records.charge.value,16,'unfinished snapshots cannot be made public by placing them in sessions');pa.sessions.pop();
 const oneSide=session('wrong-side',[makeSet('one-side',666,10)]);oneSide.exercises[0].sets[0].loadIdentity.lateralMode='one-side';pa.sessions.push(oneSide);await sync(A,pa);assert.equal((await rpc(null,'competition_rankings',[variant])).records.charge.value,16,'unilateral work is not mixed with a bilateral canonical variant');pa.sessions.pop();await sync(A,pa);
 // Historical unknown conventions remain private; known legacy loads can rank but no invented normalized tonnage.
 const legacy=payload([session('legacy',[makeSet('legacy',18,8,false)])]);await sync(C,legacy);assert.equal((await rpc(null,'competition_rankings',[variant])).records.charge.value,16);assert.equal((await rpc(null,'sport_profile',['Camille'])).records.length,0);
 legacy.sessions[0].exercises[0].convention='Inconnue';await sync(C,legacy);assert.equal((await rpc(null,'sport_profile',['Camille'])).recent.length,0);
 await sync(C,pc);
 // Noncomparable machines never enter competition, despite personal variant bindings.
 const machine=(await rpc(A,'register_machine',['Low row','Marque','Modèle','Affichage machine']));assert.equal((await rpc(null,'competition_rankings',[machine.id])).notComparable,true);
 const candidate=(await rpc(A,'competition_candidates'))[0];assert.ok(candidate.id);const invite=await rpc(A,'challenge_create',[candidate.id,B,7]);assert.match(invite.token,/^[0-9a-f]{64}$/);assert.equal((await rpc(A,'challenge_create',[candidate.id,B,7])).alreadyExists,true);
 assert.equal((await rpc(B,'social_notifications')).records,1);
 await db.query("update training_challenges set created_at=now()-interval '6 days',invite_expires_at=now()+interval '1 day'where id=$1",[invite.id]);
 await db.query("insert into training_challenges(initiator_id,target_id,reference_id,reference_revision,variant_id,convention,weight,reference_reps,days,response,token_hash)select initiator_id,target_id,reference_id,reference_revision,variant_id,convention,weight,reference_reps,days,'revoked','notification-history-'||n from training_challenges cross join generate_series(1,110)n where id=$1",[invite.id]);
 assert.equal((await rpc(B,'challenge_list'))[0].id,invite.id);assert.equal((await rpc(B,'social_notifications')).records,1);
 await db.query("delete from training_challenges where token_hash like 'notification-history-%'");
 assert.equal((await rpc(A,'social_notifications')).records,0);assert.equal((await rpc(C,'social_notifications')).records,0);
 await assert.rejects(rpc(C,'challenge_redeem',[invite.token]));await assert.rejects(rpc(C,'challenge_respond',[invite.id,true]));await assert.rejects(rpc(B,'challenge_revoke',[invite.id]));
 const accepted=await rpc(B,'challenge_redeem',[invite.token]);assert.equal(accepted.status,'active');assert.equal((await rpc(B,'social_notifications')).records,0);assert.equal((await rpc(B,'challenge_respond',[invite.id,true])).deadline,accepted.deadline);await assert.rejects(rpc(B,'challenge_redeem',[invite.token]));
 assert.equal((await rpc(B,'challenge_list'))[0].bestReps,null,'existing pre-acceptance scores cannot count');
 // Only ordinary completed synced sets after acceptance, with exact load and compatible variant, count.
 pb.sessions.push(session('attempt',[makeSet('attempt',16,12)]));await sync(B,pb);let challenge=(await rpc(B,'challenge_list'))[0];assert.equal(challenge.result,'win');assert.equal(challenge.bestReps,12);assert.equal(challenge.provisional,true);
 const firstReceipt=(await db.query('select first_received_at,changed_at from competition_performances where owner_id=$1 and set_key=md5($2)',[B,'attempt'])).rows[0];await sync(B,pb);const retryReceipt=(await db.query('select first_received_at,changed_at from competition_performances where owner_id=$1 and set_key=md5($2)',[B,'attempt'])).rows[0];assert.deepEqual(retryReceipt,firstReceipt,'idempotent sync cannot change provenance');
 pb.sessions.at(-1).exercises[0].sets[0].r=10;await sync(B,pb);assert.equal((await rpc(B,'challenge_list'))[0].result,'tie');
 pb.sessions.at(-1).exercises[0].sets[0].r=9;await sync(B,pb);assert.equal((await rpc(B,'challenge_list'))[0].result,'not_reached');
 pb.sessions.at(-1).exercises[0].sets[0].w=18;await sync(B,pb);assert.equal((await rpc(B,'challenge_list'))[0].bestReps,null,'18kg is outside a 16kg event');
 pb.sessions.at(-1).exercises[0].sets[0].w=16;pb.sessions.at(-1).exercises[0].sets[0].r=11;await sync(B,pb);
 await db.query("update training_challenges set deadline=clock_timestamp()-interval '1 millisecond' where id=$1",[invite.id]);challenge=(await rpc(B,'challenge_list'))[0];assert.equal(challenge.status,'completed');assert.equal(challenge.result,'win');assert.equal(challenge.provisional,false);
 pb.sessions.at(-1).exercises[0].sets[0].r=12;await sync(B,pb);assert.equal((await rpc(B,'challenge_list'))[0].bestReps,null,'post-deadline score revisions do not improve a result');
 const rematch=await rpc(B,'challenge_rematch',[invite.id]);assert.ok(rematch.id);await rpc(B,'challenge_revoke',[rematch.id]);await assert.rejects(rpc(A,'challenge_redeem',[rematch.token]));
 // An unaccepted invitation expires after seven days; expiry is checked server-side, without a cron job.
 const expired=await rpc(A,'challenge_create',[candidate.id,C,14]);await db.query("update training_challenges set invite_expires_at=clock_timestamp()-interval '1 second' where id=$1",[expired.id]);assert.equal((await rpc(C,'challenge_list'))[0].status,'expired');assert.equal((await rpc(C,'social_notifications')).records,0);await assert.rejects(rpc(C,'challenge_redeem',[expired.token]));
 // Late offline synchronization cannot backdate server receipt into the accepted period.
 const late=await rpc(A,'challenge_create',[candidate.id,C,7]);await rpc(C,'challenge_respond',[late.id,true]);await db.query("update training_challenges set accepted_at=clock_timestamp()-interval '14 days',deadline=clock_timestamp()-interval '7 days' where id=$1",[late.id]);pc.sessions.push(session('late',[makeSet('late',16,99)],new Date(Date.now()-10*86400000).toISOString()));await sync(C,pc);assert.equal((await rpc(C,'challenge_list')).find(c=>c.id===late.id).bestReps,null);
 // Deletion invalidates provenance and references; records and challenge results are derived again.
 pb.sessions=pb.sessions.filter(s=>s.id!=='attempt');await sync(B,pb);assert.equal((await rpc(B,'challenge_list')).find(c=>c.id===invite.id).bestReps,null);
 const stillPending=await rpc(A,'challenge_create',[candidate.id,B,7]);assert.equal((await rpc(B,'social_notifications')).records,1);
 pa.sessions=[];pa.active=null;await sync(A,pa);assert.equal((await rpc(B,'challenge_list')).find(c=>c.id===invite.id).status,'invalid');assert.equal((await rpc(null,'competition_rankings',[variant,'repetitions',16])).entries.some(x=>x.ownerId===A),false);
 assert.equal((await rpc(B,'social_notifications')).records,0);
 // Repeat migration: data, claims, first receipt and private documents remain intact.
 const before=(await db.query('select payload,version from private_documents where owner_id=$1',[B])).rows[0];await db.query(fs.readFileSync('supabase/migrations/202611050004_competition.sql','utf8'));assert.deepEqual((await db.query('select payload,version from private_documents where owner_id=$1',[B])).rows[0],before);
 console.log('PASS SQL competition: actual A/B/C/anonymous roles, private RLS and RPC denial, completed-only minimal projection, 1/1/3 ranks, exact-load reps, coverage-aware tonnage, active exclusion, server token/owner/expiry checks, idempotent acceptance/sync, corrections/deletions, late-sync exclusion, rematch and repeatable migration.');
 }finally{await db.end();await admin.query('drop database '+name+' with (force)');await admin.end()}
})().catch(e=>{console.error(e);process.exitCode=1});
