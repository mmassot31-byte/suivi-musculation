require('../scripts/local-safety.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {localClient,migrate}=require('../scripts/local-v2-db.cjs'),{refresh}=require('../scripts/local-v2-worker.cjs');
const A='99000000-0000-0000-0000-000000000001',B='99000000-0000-0000-0000-000000000002';
async function fingerprint(db){const tables=['private_documents','profiles','badge_occurrences','performances','competition_performances'];const data={};for(const t of tables)data[t]=(await db.query(`select coalesce(jsonb_agg(to_jsonb(t)order by to_jsonb(t)::text),'[]') data from public.${t} t`)).rows[0].data;data.functions=(await db.query("select p.proname,pg_get_functiondef(p.oid)definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.prokind='f'and p.proname not like 'v2_%' order by p.oid")).rows;return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');}
test('local V2 migrations repeatable, backfill/concurrency/idempotence, RLS and sanitized public projections',async()=>{
 const db=await localClient();try{const before=await fingerprint(db);await migrate(db);await migrate(db);const one=await refresh(db,A),beforeEvents=(await db.query('select count(*)::int n from v2_events where owner_id=$1',[A])).rows[0].n;
 const clients=await Promise.all([localClient(),localClient(),localClient()]);try{const results=await Promise.all(clients.map(c=>refresh(c,A)));assert(results.every(r=>r.xp===one.xp));}finally{await Promise.all(clients.map(c=>c.end()));}
 assert.equal((await db.query('select count(*)::int n from v2_events where owner_id=$1',[A])).rows[0].n,beforeEvents);
 assert.equal((await db.query('select count(*)::int n from v2_catalog')).rows[0].n,150);
 await refresh(db,B);
 await db.query('begin');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[A]);await db.query('set local role authenticated');
 assert((await db.query('select v2_own()data')).rows[0].data.xp>0);assert.equal((await db.query('select *from v2_accounts')).rows.length,1);
 await db.query('savepoint denied');await assert.rejects(db.query("update v2_accounts set result='{}'where owner_id=$1",[A]),/permission denied/);await db.query('rollback to savepoint denied');
 await db.query('savepoint denied2');await assert.rejects(db.query("insert into v2_events(owner_id,event_key,kind,xp,detail)values($1,'fake','activity',99999,'{}')",[A]),/permission denied/);await db.query('rollback to savepoint denied2');
 const favorites=one.awards.slice(0,3).map(a=>a.id);await db.query('select v2_set_preferences($1,true,$2)',[favorites,'Europe/Paris']);
 await db.query('savepoint invalid');await assert.rejects(db.query('select v2_set_preferences($1,true,$2)',[['v2.fake'],'Europe/Paris']),/INVALID_FAVORITES/);await db.query('rollback to savepoint invalid');
 await db.query('reset role');const username=(await db.query('select username from profiles where id=$1',[A])).rows[0].username;
 await db.query("select set_config('request.jwt.claim.sub','',true)");await db.query('set local role anon');
 const publicData=(await db.query('select v2_profile($1)data',[username])).rows[0].data;assert.equal(publicData.version,2);assert.deepEqual(publicData.favorites,favorites);assert(!('projection'in publicData));assert(!JSON.stringify(publicData).includes('privateNotes'));
 const season=(await db.query("select v2_season('2026-10',false,0)data")).rows[0].data;assert.equal(season.version,2);assert(season.entries.every(r=>r.score>=0));
 const listedMonths=(await db.query('select v2_seasons()data')).rows[0].data;assert(Array.isArray(listedMonths));
 await db.query('reset role');await db.query('rollback');assert.equal(await fingerprint(db),before,'V1 data, metrics and functions unchanged');
 console.log('PASS V2 local: 150 catalogue rows, repeat migration, 3 concurrent workers, unique events, owner RLS, client XP write denial, favorites and public privacy; V1 SHA-256 identical.');
 }finally{await db.end();}
});
