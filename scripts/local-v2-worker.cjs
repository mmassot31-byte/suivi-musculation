require('./local-safety.cjs');
const {localClient,migrate}=require('./local-v2-db.cjs');
const {refresh}=require('../server/v2-projector.cjs');

async function run(){const db=await localClient();try{await migrate(db);do{const list=(await db.query('select d.owner_id from private_documents d left join v2_accounts a using(owner_id)left join v2_requests q using(owner_id)where a.source_version is distinct from d.version or q.owner_id is not null or a.updated_at<now()-interval \'1 minute\'')).rows;for(const {owner_id}of list){const r=await refresh(db,owner_id);console.log('V2 local projection:',owner_id,r.xp,'XP',r.awards.length,'badges');}if(!process.argv.includes('--watch'))break;await new Promise(r=>setTimeout(r,2000));}while(true);}finally{await db.end();}}
module.exports={refresh};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1});
