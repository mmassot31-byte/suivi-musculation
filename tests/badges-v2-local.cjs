// Local socket/container checked before connecting; transaction enforces read-only SQL.
require('../scripts/local-safety.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{Client}=require('pg');
test('V2 projection of local synthetic history, PostgreSQL JSONB and unchanged V1 state',async()=>{
  const inspect=JSON.parse(execFileSync('docker',['--host=unix:///var/run/docker.sock','inspect','--format',
    '{{json .Config.Labels}}','elan-accounts-test'],{encoding:'utf8'}));
  assert.equal(inspect['elan.local-test'],'true');
  const ports=JSON.parse(execFileSync('docker',['--host=unix:///var/run/docker.sock','inspect','--format',
    '{{json .NetworkSettings.Ports}}','elan-accounts-test'],{encoding:'utf8'}));
  assert(ports['5432/tcp'].some(p=>p.HostIp==='127.0.0.1'&&p.HostPort==='55432'));
  const db=new Client({host:'127.0.0.1',port:55432,user:'postgres',password:'local-test-only',database:'elan_social'});
  await db.connect();
  try{
    await db.query('begin isolation level repeatable read read only');
    assert.equal((await db.query('show transaction_read_only')).rows[0].transaction_read_only,'on');
    const {evaluateMuscleVolume:evaluate}=await import('../badges-v2/index.js');
    const ids=['99000000-0000-0000-0000-000000000001','99000000-0000-0000-0000-000000000002','99000000-0000-0000-0000-000000000003'];
    const sql='select owner_id, payload, version from public.private_documents where owner_id=any($1::uuid[]) order by owner_id';
    const rows=(await db.query(sql,[ids])).rows;assert.equal(rows.length,3,'Run local:seed first');
    const before=JSON.stringify(rows);
    for(const row of rows){const result=evaluate(row.payload);assert.equal(result.engineVersion,2);assert(result.earned.every(id=>id.startsWith('v2.muscle_volume.')));}
    assert.equal(rows.reduce((n,r)=>n+r.payload.sessions.length,0),6);
    // Existing seed uses unclassified "bench"; do not invent its muscle from its name.
    assert.equal(evaluate(rows[0].payload).counts.chest,0);
    assert.equal(evaluate(rows[0].payload).diagnostics.unclassifiedSets,6);
    // Read-only synthetic JSONB projection: retain both sessions on the same date.
    // No insert, sync RPC, production trigger, V1 function or stored row is changed.
    const {rows:[{payload}]}=await db.query(`select jsonb_build_object('sessions',jsonb_agg(
      jsonb_build_object('id',s::text,'date','2026-11-01T10:00:00Z','exercises',jsonb_build_array(
        jsonb_build_object('id','synthetic','muscles',jsonb_build_object('primary',jsonb_build_array('chest'),'secondary',jsonb_build_array('triceps')),
          'sets',(select jsonb_agg(jsonb_build_object('type','work','status','validated','w',20,'r',8)) from generate_series(1,case when s=1 then 13 else 12 end)))
      )))) payload from generate_series(1,2) s`);
    const result=evaluate(payload);assert.equal(result.counts.chest,25);assert.equal(result.counts.triceps,0);
    assert.deepEqual(result.earned,['v2.muscle_volume.chest.25']);assert.equal(result.progress.chest.remaining,75);
    assert.equal(JSON.stringify((await db.query(sql,[ids])).rows),before);
    console.log('Local V1 synthetic documents read only: 3 profiles/6 sessions; JSONB projection: 25 direct sets, 1 V2 eligibility, no awarded XP or persisted badge.');
  }finally{await db.query('rollback');await db.end();}
});
