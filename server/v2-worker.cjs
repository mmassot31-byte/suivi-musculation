// Deployment entry point, disabled by default. Never run against hosted services during development.
const {Client}=require('pg'),{refresh}=require('./v2-projector.cjs');
async function run(){
 if(process.env.ELAN_V2_WORKER_ENABLED!=='true')throw Error('V2 worker disabled. Explicit server configuration is required.');
 if(!process.env.ELAN_V2_DATABASE_URL)throw Error('Missing server-only database binding');
 const db=new Client({connectionString:process.env.ELAN_V2_DATABASE_URL,application_name:'elan-v2-projector'}),failures=new Map();
 await db.connect();try{do{
  const {rows}=await db.query("select d.owner_id,d.version,q.requested_at from public.private_documents d left join public.v2_accounts a using(owner_id)left join public.v2_requests q using(owner_id)where a.source_version is distinct from d.version or q.owner_id is not null or a.updated_at<now()-interval '1 minute'");
  for(const row of rows){const key=String(row.version)+':'+(row.requested_at?.toISOString()||'');if(failures.get(row.owner_id)===key)continue;
   try{await refresh(db,row.owner_id);failures.delete(row.owner_id);}catch{failures.set(row.owner_id,key);console.error('V2 projection deferred: history requires correction or a new refresh request.');if(process.argv.includes('--once'))process.exitCode=1;}}
  if(process.argv.includes('--once'))break;await new Promise(r=>setTimeout(r,2000));
 }while(true);}finally{await db.end();}
}
if(require.main===module)run().catch(()=>{console.error('V2 worker unavailable: check server configuration and private operational logs.');process.exitCode=1;});
module.exports={run};
