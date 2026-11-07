-- Versioned load conventions and canonical links. Historical numeric entries stay untouched.
begin;
create function public.exercise_library_set_factor(p_set jsonb)returns numeric language sql immutable set search_path=public,pg_temp as $$select case when coalesce(p_set->>'loadProtocol','')<>'elan-2'then 1 when coalesce(p_set->>'loadMode','')not in('bilateral','unilateral')or coalesce(p_set->>'measurement','')not in('external_load','added_load','assistance','bodyweight','duration')then null when p_set->>'measurement'in('assistance','bodyweight','duration')then 0 when p_set->>'loadMode'='unilateral'then 2 else 1 end$$;
create function public.exercise_library_projection_payload(p_payload jsonb)returns jsonb language plpgsql immutable set search_path=public,pg_temp as $$
declare s jsonb;e jsonb;entry jsonb;source jsonb;groups jsonb;ordering text[];k text;field text;exercises jsonb;sessions jsonb:='[]';idx integer;begin
 for s in select value from jsonb_array_elements(case when jsonb_typeof(p_payload->'sessions')='array'then p_payload->'sessions'else '[]'::jsonb end)loop
  exercises:='[]';idx:=0;
  for e in select value from jsonb_array_elements(case when jsonb_typeof(s->'exercises')='array'then s->'exercises'else '[]'::jsonb end)loop
   idx:=idx+1;groups:='{}';ordering:=array[]::text[];
   foreach field in array array['sets','activityEntries']loop
    for entry in select value from jsonb_array_elements(case when jsonb_typeof(e->field)='array'then e->field else '[]'::jsonb end)loop
     source:=(e||case when jsonb_typeof(entry->'exerciseReference')='object'then entry->'exerciseReference'else '{}'::jsonb end)-'sets'-'activityEntries';k:=md5(source::text);
     if not groups?k then groups:=groups||jsonb_build_object(k,source||jsonb_build_object('sets','[]'::jsonb,'activityEntries','[]'::jsonb,'_libraryExerciseIndex',idx));ordering:=array_append(ordering,k);end if;
     groups:=jsonb_set(groups,array[k,field],(groups->k->field)||jsonb_build_array(entry));
    end loop;
   end loop;
   if cardinality(ordering)=0 then exercises:=exercises||jsonb_build_array(e||jsonb_build_object('_libraryExerciseIndex',idx));else foreach k in array ordering loop exercises:=exercises||jsonb_build_array(groups->k);end loop;end if;
  end loop;
  sessions:=sessions||jsonb_build_array(s||jsonb_build_object('exercises',exercises));
 end loop;
 return jsonb_set(p_payload,'{sessions}',sessions);
end$$;
create function public.exercise_library_reference(p_owner uuid,p_exercise jsonb)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$declare d jsonb;key text;begin
 if p_exercise->>'libraryScope'='personal'then
  select definition into d from personal_exercises where owner_id=p_owner and id=p_exercise->>'libraryId';return coalesce(d,jsonb_build_object('id',p_exercise->>'libraryId','libraryScope','personal'));
 end if;
 if p_exercise->>'libraryScope'='common'and p_exercise->>'libraryId'is not null then
  select definition into d from common_exercises where id=p_exercise->>'libraryId';
  if d is null then select c.definition into d from exercise_creation_requests r join common_exercises c on c.id=r.common_id where r.owner_id=p_owner and r.request_id=p_exercise->>'libraryId';end if;
  if d is not null then return d;end if;
 end if;
 key:=exercise_library_legacy_key(p_exercise);
 select x.definition into d from exercise_legacy_references r join personal_exercises x on x.owner_id=p_owner and x.id=r.library_id where r.owner_id=p_owner and r.legacy_id=p_exercise->>'id'and r.definition_key=key and r.scope='personal';if d is not null then return d;end if;
 key:=exercise_library_shared_match(p_exercise);select definition into d from common_exercises where id=key;return coalesce(d,jsonb_build_object('id',p_exercise->>'id','libraryScope','personal'));
end$$;
create function public.exercise_library_identity(p_owner uuid,p_exercise jsonb,p_identity jsonb,p_set jsonb)returns text language plpgsql stable security definer set search_path=public,pg_temp as $$declare d jsonb;mode text;metric text;begin
 if coalesce(p_identity->>'convention','')=''or p_identity->>'convention'~*'préciser|inconnu|ambigu|valeur indiquée'then return null;end if;
 d:=exercise_library_reference(p_owner,p_exercise);
 metric:=case when p_set->>'loadProtocol'='elan-2'then p_set->>'measurement'else 'external_load'end;
 mode:=case when p_set->>'loadProtocol'='elan-2'then p_set->>'loadMode'
 when p_identity->>'lateralMode'='total'and p_identity->>'convention'!~*'haltère|par côté'then 'bilateral'
 when p_identity->>'lateralMode'in('simultaneous-pair','both-sides')and p_identity->>'convention'~*'haltère|par côté'then 'unilateral'end;
 if mode is not null and(d->>'libraryScope'='common'or p_set->>'loadProtocol'='elan-2')then return md5(jsonb_build_array(d->>'id',p_identity->>'unit',mode,metric)::text);end if;
 -- Ambiguous/one-side legacy data retains its original comparison boundary.
 return md5(jsonb_build_array(p_exercise->>'id',p_identity->>'unit',p_identity->>'convention',p_identity->>'lateralMode')::text);
end$$;
-- GENERATED-PROJECTIONS-BEGIN
-- GENERATED-PROJECTIONS-END

-- Canonical public directory: fixed shared variants, never personal definitions or caches.
insert into public_exercise_directory(id,label,equipment,tracking)select id,definition->>'name',definition->>'equipment',coalesce(definition->>'tracking','strength')from common_exercises on conflict(id)do nothing;
create or replace function public.public_exercises(p_offset integer default 0)returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(to_jsonb(x)order by label,id),'[]'::jsonb)from(select c.id,c.definition->>'name'label,c.definition->>'equipment'equipment,coalesce(c.definition->>'tracking','strength')tracking,c.definition->>'measurement'measurement,c.definition->>'loadMode'load_mode,c.definition->'aliases'aliases from common_exercises c order by label,c.id limit 250 offset greatest(0,coalesce(p_offset,0)))x
$$;
create or replace function public.public_exercise_resolve(p_exercise jsonb,p_payload jsonb)returns text language plpgsql security definer set search_path=public,pg_temp as $$declare d jsonb;u uuid;begin
 -- Only public_activity_project calls this private helper, after enforcing owner/private scope.
 u:=nullif(p_payload->>'_libraryOwner','')::uuid;d:=exercise_library_reference(u,p_exercise);
 if d->>'libraryScope'<>'common'then return null;end if;
 insert into public_exercise_directory(id,label,equipment,tracking)values(d->>'id',d->>'name',d->>'equipment',coalesce(d->>'tracking','strength'))on conflict(id)do nothing;return d->>'id';
end$$;
-- Public group creation preserves hardware boundaries. Raw record weights are never multiplied.
-- GENERATED-PUBLIC-BEGIN
-- GENERATED-PUBLIC-END

-- Rebuild derived links/projections only. Keep private snapshots and proof numerics intact.
do $$declare d record;begin for d in select owner_id,payload from private_documents loop
 perform social_project(d.owner_id,d.payload);perform rebuild_competition(d.owner_id,d.payload);perform public_activity_project(d.owner_id);
end loop;end$$;
revoke all on function public.exercise_library_set_factor(jsonb),public.exercise_library_projection_payload(jsonb),public.exercise_library_reference(uuid,jsonb),public.exercise_library_identity(uuid,jsonb,jsonb,jsonb)from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
