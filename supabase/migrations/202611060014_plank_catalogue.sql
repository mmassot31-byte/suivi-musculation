-- Add the timed plank to the public exercise directory without altering history.
begin;
insert into public.public_exercise_directory(id,label,equipment,tracking)values('library:3e1ad47f3b27fab888d0fee25d23f3d7','Gainage','bodyweight','mobility')on conflict do nothing;
insert into public.public_exercise_aliases(alias,kind,exercise_key)values('elan-catalogue:plank','id','library:3e1ad47f3b27fab888d0fee25d23f3d7')on conflict do nothing;
insert into public.public_exercise_aliases(alias,kind,exercise_key)values(public.public_exercise_name('Gainage'),'name','library:3e1ad47f3b27fab888d0fee25d23f3d7')on conflict do nothing;
insert into public.public_exercise_aliases(alias,kind,exercise_key)values(public.public_exercise_name('Plank'),'name','library:3e1ad47f3b27fab888d0fee25d23f3d7')on conflict do nothing;
insert into public.public_exercise_aliases(alias,kind,exercise_key)values(public.public_exercise_name('Planche abdominale'),'name','library:3e1ad47f3b27fab888d0fee25d23f3d7')on conflict do nothing;
insert into public.public_exercise_aliases(alias,kind,exercise_key)values(public.public_exercise_name('Gainage abdominal'),'name','library:3e1ad47f3b27fab888d0fee25d23f3d7')on conflict do nothing;
insert into public.public_exercise_aliases(alias,kind,exercise_key)values('plank','alternative','library:3e1ad47f3b27fab888d0fee25d23f3d7')on conflict do nothing;
notify pgrst,'reload schema';
commit;
