"""Versioned, assertion-checked adaptations of existing audited projection functions."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];M=ROOT/'supabase/migrations'
def function(file,name):
 s=(M/file).read_text();i=s.index('function public.'+name+'(');a=s.rfind('create ',0,i);b=s.index('end$$;',i)+len('end$$;') if 'end$$;' in s[i:] else -1
 # SQL-language bodies also end in $$; use the first opening/closing dollar delimiter.
 start=s.index('$$',i);end=s.index('$$;',start+2)+3
 return s[a:end].replace('create function','create or replace function',1)
def replace(text,old,new):
 assert old in text,old[:120];return text.replace(old,new)
social=function('202611060013_recorded_tonnage_badges.sql','social_project')
social=replace(social,'begin\n update social_facts',"begin\n perform exercise_library_audit_snapshot(p_owner,p_payload);\n p_payload:=exercise_library_projection_payload(p_payload);\n update social_facts")
social=replace(social,' ton:=w*r;'," if st->>'loadProtocol'='elan-2'then factor:=exercise_library_set_factor(st);if factor is null then continue;end if;ident:=ident||jsonb_build_object('measurement',st->>'measurement','loadMode',st->>'loadMode');end if;\n ton:=w*r;")
identity="case when ident->>'convention' !~* 'préciser|inconnu|ambigu|valeur indiquée' and coalesce(ident->>'convention','')<>'' then md5(jsonb_build_array(e->>'id',ident->>'unit',ident->>'convention',ident->>'lateralMode')::text) else null end"
social=replace(social,identity,'exercise_library_identity(p_owner,e,ident,st)')
social=replace(social,' perform social_recorded_project(p_owner,p_payload);',""" perform social_recorded_project(p_owner,p_payload);
 -- A baseline remains tied to its exact original series/revision, even after a safe reference join.
 update goal_challenges g set baseline=jsonb_set(g.baseline,'{identityKey}',to_jsonb(f.identity_key))from social_facts f where g.owner_id=p_owner and g.mode='personal'and f.owner_id=p_owner and f.active and f.identity_key is not null and g.baseline->>'sessionId'=f.session_id and g.baseline->>'setId'=f.set_id and g.baseline->>'revision'=f.revision and g.baseline->>'identityKey'is distinct from f.identity_key;
""")
recorded=function('202611060013_recorded_tonnage_badges.sql','social_recorded_project')
recorded=replace(recorded,'total:=total+piece_total*case', 'if exercise_library_set_factor(st)is null then continue;end if;piece_total:=piece_total*exercise_library_set_factor(st);\n    total:=total+piece_total*case')
# Assistance improves when the amount decreases; normal loads retain their original ordering.
comparable=function('202611060013_recorded_tonnage_badges.sql','social_comparable_metrics')
comparable=replace(comparable,'max(weight) w','max(case when identity->>\'measurement\'=\'assistance\'then -weight else weight end) w')
records=function('202611060010_friends_activity.sql','friend_record_sessions')
records=replace(records,'max(weight)w',"max(case when identity->>'measurement'='assistance'then -weight else weight end)w")
# A public session card only includes definitions explicitly shared in the library.
public=function('202611060011_public_activity_all_exercises.sql','public_activity_project')
public=replace(public,'declare doc jsonb;', 'declare source_doc jsonb;definition jsonb;filtered jsonb;session_item jsonb;exercise_item jsonb;doc jsonb;')
public=replace(public,'select payload into doc from private_documents where owner_id=p_owner;',"""select payload into source_doc from private_documents where owner_id=p_owner;
 doc:=exercise_library_projection_payload(source_doc);filtered:='[]';
 for session_item in select value from jsonb_array_elements(coalesce(doc->'sessions','[]'::jsonb))loop
  details:='[]';for exercise_item in select value from jsonb_array_elements(coalesce(session_item->'exercises','[]'::jsonb))loop
   definition:=exercise_library_reference(p_owner,exercise_item);
   if definition->>'libraryScope'='common'then details:=details||jsonb_build_array(exercise_item);end if;
  end loop;filtered:=filtered||jsonb_build_array(session_item||jsonb_build_object('exercises',details));
 end loop;doc:=doc||jsonb_build_object('sessions',filtered,'_libraryOwner',p_owner);""")
public=replace(public,"and coalesce(e->>'tracking','strength')='strength'loop", "and coalesce(e->>'tracking','strength')='strength'and exists(select 1 from jsonb_array_elements(coalesce(e->'sets','[]'::jsonb))st where st->>'id'=social_facts.set_id)loop")
public=replace(public,'where p.session_id=sid;',"where p.session_id=sid and exists(select 1 from public_exercise_results visible where visible.owner_id=p_owner and visible.active and visible.session_id=sid and visible.set_id=sf.set_id);")
# Protect record detail from a private exercise in the same public session.
detail=function('202611070016_activity_notifications_profile.sql','friend_activity_records')
detail=replace(detail,"and identity_key is not null and order_reliable group by", "and identity_key is not null and order_reliable and exists(select 1 from public_exercise_results visible where visible.owner_id=p_owner and visible.active and visible.session_id=p_session and visible.set_id=social_facts.set_id)group by")
# Assistance PRs retain positive raw values, with an explicit reversed improvement.
detail=replace(detail,"max(weight)weight", "case when min(identity->>'measurement')='assistance'then min(weight)else max(weight)end weight,min(identity->>'measurement')measurement")
detail=replace(detail,'select max(o.weight)from social_facts o',"select case when c.measurement='assistance'then min(o.weight)else max(o.weight)end from social_facts o")
detail=replace(detail,"'kind','weight'", "'kind',case when measurement='assistance'then 'assistance'else 'weight'end")
detail=replace(detail,"'gain',weight-previous)item from weights where weight>previous", "'gain',case when measurement='assistance'then previous-weight else weight-previous end)item from weights where case when measurement='assistance'then weight<previous else weight>previous end")
# Fixed shared variants reuse the old competition proof engine, without rewriting old proofs.
competition=function('202611050004_competition.sql','rebuild_competition')
competition=replace(competition,'marker uuid:=','definition jsonb;alias record;marker uuid:=')
competition=replace(competition,'begin\n for s', 'begin\n p_payload:=exercise_library_projection_payload(p_payload);\n for s')
competition=replace(competition,"'exercise-'||ei", "'exercise-'||coalesce(e->>'_libraryExerciseIndex',ei::text)")
competition=replace(competition,"identity:=st->'loadIdentity';conv:=", """definition:=exercise_library_reference(p_owner,e);if definition->>'libraryScope'<>'common'then continue;end if;
    identity:=st->'loadIdentity';
    if st->>'loadProtocol'='elan-2'then
     if st->>'measurement'<>'external_load'then continue;end if;
     select a.exercise_id,a.convention,ev.equipment into alias from variant_aliases a join exercise_variants ev on ev.id=a.variant_id where a.exercise_id in(select jsonb_array_elements_text(coalesce(definition->'legacyIds','[]'::jsonb)))and((st->>'loadMode'='unilateral'and a.convention='Par haltère')or(st->>'loadMode'='bilateral'and a.convention in('Total','Charge totale')))order by a.exercise_id limit 1;
     if found then e:=e||jsonb_build_object('id',alias.exercise_id);identity:=identity||jsonb_build_object('convention',alias.convention,'lateralMode',case when alias.equipment='dumbbell'then 'simultaneous-pair'else 'total'end);end if;
    end if;
    conv:=""")
competition=replace(competition,"     if jsonb_typeof(part->'w')='number'","     if st->>'loadProtocol'='elan-2'and(part->>'validated'='false'or part->>'type'='warmup'or coalesce(part->>'status','validated')not in('validated','completed'))then continue;end if;\n     if jsonb_typeof(part->'w')='number'")
# Public rankings keep per-side entered weights and reverse only the assistance ordering.
ranking=function('202611060011_public_activity_all_exercises.sql','public_exercise_rankings')
ranking=replace(ranking,'declare chosen text',"declare assisted boolean:=false;chosen text")
ranking=replace(ranking,"if g.tracking<>'strength'", "select definition->>'measurement'='assistance'into assisted from common_exercises where id=p_exercise;assisted:=coalesce(assisted,false);if assisted and p_kind='tonnage'then p_kind:='charge';end if;\n if g.tracking<>'strength'")
ranking=replace(ranking,"when p_kind='charge'then weight", "when p_kind='charge'then case when assisted then -weight else weight end")
ranking=replace(ranking,"'value',value,'reps'", "'value',case when assisted and p_kind='charge'then -value else value end,'reps'")
ranking=replace(ranking,"declare assisted boolean:=false;", "declare body_only boolean:=false;assisted boolean:=false;")
ranking=replace(ranking,"assisted:=coalesce(assisted,false);", "assisted:=coalesce(assisted,false);select definition->>'measurement'='bodyweight'into body_only from common_exercises where id=p_exercise;if coalesce(body_only,false)then if p_kind in('charge','tonnage')then p_kind:='repetitions';end if;if p_kind='repetitions'and p_weight is null then p_weight:=0;end if;end if;")
group=function('202611060011_public_activity_all_exercises.sql','public_exercise_group')
# Equivalent explicit old pair conventions share the new simple comparison boundary.
group=replace(group," select ev.* into v", " if p_identity->>'measurement'is not null then conv:=case when p_identity->>'measurement'='assistance'then 'Assistance'when p_identity->>'measurement'='added_load'then 'Charge additionnelle'when p_identity->>'loadMode'='unilateral'then 'Par côté'else 'Total'end;end if;\n select ev.* into v")
group=replace(group,"equipment in('machine','cable')","equipment in('machine','cable','smith','band')")
group=replace(group," known:=coalesce(known,false);", " if mode='simultaneous-pair'and conv='Par haltère'then mode:='both-sides';conv:='Par côté';end if;\n known:=coalesce(known,false);")
goal=function('202611060008_goal_titles.sql','goal_create')
goal=replace(goal,"if baseline is null then raise exception 'REFERENCE_CHANGED';end if;", "if baseline is null then raise exception 'REFERENCE_CHANGED';end if;\n if baseline->'identity'->>'measurement'in('bodyweight','assistance')and p_metric<>'repetitions_at_weight'then raise exception 'INCOMPATIBLE_GOAL_METRIC';end if;")
# The original date, source set and content revision remain authoritative for all challenges.
parts=[recorded,social,comparable,records,public,detail,competition,group,ranking,goal]
source=(ROOT/'supabase/library-projections.template.sql').read_text();source=source.replace('-- GENERATED-PROJECTIONS-BEGIN\n-- GENERATED-PROJECTIONS-END','-- GENERATED-PROJECTIONS-BEGIN\n'+'\n'.join(parts)+'\n-- GENERATED-PROJECTIONS-END')
(M/'202611070018_library_projections.sql').write_text(source)
print('Generated',len(parts),'reviewed projection adaptations; source snapshots are not updated.')
