alter table if exists public.profiles
  alter column display_name set default 'Membre tripeer';

update public.profiles
set display_name = 'Membre tripeer'
where display_name = 'Membre Tribu Nature';
