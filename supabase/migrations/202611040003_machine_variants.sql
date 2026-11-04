begin;
alter table public.exercise_variants add column brand text;
alter table public.exercise_variants add column model text;
create function public.register_machine(p_exercise text,p_brand text,p_model text,p_convention text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare label_text text:=regexp_replace(trim(p_exercise),'\s+',' ','g');brand_text text:=regexp_replace(trim(p_brand),'\s+',' ','g');model_text text:=regexp_replace(trim(p_model),'\s+',' ','g');key text;result public.exercise_variants%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if length(label_text) not between 3 and 100 or length(brand_text) not between 2 and 80 or length(model_text) not between 1 and 100 or p_convention not in ('Affichage machine','Total','Par côté') then raise exception 'INVALID_MACHINE';end if;
 key:='machine-'||md5(lower(label_text)||chr(31)||lower(brand_text)||chr(31)||lower(model_text)||chr(31)||p_convention);
 insert into public.exercise_variants(id,label,equipment,convention,description,brand,model) values(key,label_text||' · '||brand_text||' '||model_text,'machine',p_convention,'Référence déclarée : même marque, modèle et convention. La résistance réelle et les réglages peuvent varier. Aucune conversion de charge.',brand_text,model_text) on conflict do nothing;
 select * into result from public.exercise_variants where id=key;return to_jsonb(result);
end $$;
revoke all on function public.register_machine(text,text,text,text) from public;
grant execute on function public.register_machine(text,text,text,text) to authenticated;
notify pgrst, 'reload schema';
commit;
