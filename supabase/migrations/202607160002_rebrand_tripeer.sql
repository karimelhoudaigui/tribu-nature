alter table if exists public.profiles
  alter column display_name set default 'Membre Tripeer';

update public.profiles
set display_name = 'Membre Tripeer'
where display_name = 'Membre Tribu Nature';
