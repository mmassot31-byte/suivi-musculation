// Trusted server job only. Never import into a browser or expose arbitrary projections as an RPC.
async function refresh(db,owner){await db.query('begin');try{
 await db.query('select pg_advisory_xact_lock(hashtextextended($1,202611092))',[owner]);
 const {rows:[source]}=await db.query('select payload,version from private_documents where owner_id=$1 for share',[owner]);if(!source){await db.query('rollback');return;}
 const {rows:[previous]}=await db.query('select result from v2_accounts where owner_id=$1',[owner]);
 const {rows:[preferences]}=await db.query('select *from v2_preferences where owner_id=$1',[owner]);
 const now=new Date().toISOString();const {evaluateV2,reconcileV2}=await import('../badges-v2/engine.js');
 const document=structuredClone(source.payload);const historySignature=JSON.stringify([source.payload.sessions,source.payload.exerciseMuscles,preferences?.timezone||'Europe/Paris']);
 for(const s of document.sessions||[])if(s.v2Evidence?.version===2){await db.query('insert into v2_receipts(owner_id,session_id,evidence)values($1,$2,$3)on conflict do nothing',[owner,s.id,s.v2Evidence]);}
 const receipts=(await db.query('select session_id,evidence from v2_receipts where owner_id=$1',[owner])).rows;
 for(const s of document.sessions||[]){const stored=receipts.find(r=>r.session_id===s.id);if(stored)s.v2Evidence=stored.evidence;else delete s.v2Evidence;}
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[owner]);
 const coops=(await db.query("select id,deadline from goal_challenges where mode='together'and $1 in(owner_id,target_id)and goal_won(id,$1)",[owner])).rows;
 // Same definitive predicates as V1, without the UI RPC's 100-row pagination cap.
 const series=(await db.query(`select c.id from training_challenges c where c.response='accepted'and c.deadline<=now()and $1 in(c.initiator_id,c.target_id)and(
  (c.target_reps is not null and series_challenge_best(c.id,$1)>=c.target_reps)or
  (c.target_reps is null and c.target_id=$1 and exists(select 1 from competition_performances ref where ref.id=c.reference_id and ref.active and ref.content_revision=c.reference_revision)and
   (select max(p.reps)from competition_performances p where p.owner_id=c.target_id and p.active and p.segment=0 and p.variant_id=c.variant_id and p.convention=c.convention and p.weight=c.weight and p.performed_at>=c.accepted_at and p.performed_at<=c.deadline and p.first_received_at>=c.accepted_at and p.first_received_at<=c.deadline and p.changed_at<=c.deadline)>c.reference_reps))`,[owner])).rows;
 const storedWins=(await db.query('select challenge_key,awarded_at from v2_challenge_receipts where owner_id=$1',[owner])).rows;const at=id=>storedWins.find(r=>r.challenge_key===id)?.awarded_at.toISOString()||previous?.result?.events?.find(e=>e.key==='challenge:'+id)?.at||now;
 const challengeWins=[...coops.map(g=>({id:'goal:'+g.id,kind:'cooperative',awardedAt:at('goal:'+g.id)})),...series.map(c=>({id:'series:'+c.id,kind:'competitive',awardedAt:at('series:'+c.id)}))];
 for(const win of challengeWins)await db.query('insert into v2_challenge_receipts(owner_id,challenge_key,kind,awarded_at)values($1,$2,$3,$4)on conflict do nothing',[owner,win.id,win.kind,win.awardedAt]);
 const projection=evaluateV2(document,{asOf:now,timeZone:preferences?.timezone||'Europe/Paris',challengeWins,earnedBadgeIds:(previous?.result?.awards||[]).map(a=>a.id),syncedSessionIds:(document.sessions||[]).map(s=>s.id)});
 const result=reconcileV2(projection,previous?.result||{});
 result.favorites=preferences?.favorites||(source.payload.badgesV2?.favorites||[]).filter(id=>result.awards.some(a=>a.id===id)).slice(0,3);result.historySignature=historySignature;for(const month of Object.keys(result.seasons))await db.query('insert into v2_season_history(owner_id,month,timezone)values($1,$2,$3)on conflict do nothing',[owner,month,projection.timeZone]);
 for(const award of result.awards)await db.query('insert into v2_awards(owner_id,badge_id,earned_at,session_id,xp)values($1,$2,$3,$4,$5)on conflict do nothing',[owner,award.id,award.earnedAt,award.sessionId,award.xp]);
 // Reconcile event values rather than append credits. Uniqueness + owner lock handles retries.
 const keys=result.events.map(e=>e.key);await db.query('delete from v2_events where owner_id=$1 and not(event_key=any($2::text[]))',[owner,keys]);
 for(const event of result.events)await db.query('insert into v2_events(owner_id,event_key,kind,session_id,at,month,xp,detail)values($1,$2,$3,$4,$5,$6,$7,$8)on conflict(owner_id,event_key)do update set xp=excluded.xp,detail=excluded.detail,month=excluded.month,at=excluded.at',[owner,event.key,event.kind,event.sessionId||null,event.at,event.month,event.xp,event]);
 await db.query('insert into v2_accounts(owner_id,source_version,result)values($1,$2,$3)on conflict(owner_id)do update set source_version=excluded.source_version,result=excluded.result,updated_at=now()',[owner,source.version,result]);
 await db.query('insert into v2_preferences(owner_id,favorites,timezone)values($1,$2,$3)on conflict do nothing',[owner,result.favorites,projection.timeZone]);
 await db.query('delete from v2_requests where owner_id=$1',[owner]);await db.query('commit');return result;
}catch(e){await db.query('rollback');throw e;}}
module.exports={refresh};
