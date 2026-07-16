-- App presentation onboarding state, distinct from travel preference onboarding.
alter table public.profiles
add column if not exists app_onboarding_status text not null default 'not_started',
add column if not exists app_onboarding_started_at timestamptz,
add column if not exists app_onboarding_completed_at timestamptz,
add column if not exists app_onboarding_skipped_at timestamptz,
add column if not exists app_onboarding_last_step integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_app_onboarding_status_check') then
    alter table public.profiles
      add constraint profiles_app_onboarding_status_check
      check (app_onboarding_status in ('not_started', 'in_progress', 'completed', 'skipped'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_app_onboarding_last_step_check') then
    alter table public.profiles
      add constraint profiles_app_onboarding_last_step_check
      check (app_onboarding_last_step between 0 and 5);
  end if;
end $$;

update public.profiles
set app_onboarding_status = 'completed',
    app_onboarding_completed_at = coalesce(app_onboarding_completed_at, now()),
    app_onboarding_last_step = 5
where app_onboarding_status = 'not_started'
  and created_at < now();

create index if not exists profiles_app_onboarding_status_idx
  on public.profiles (app_onboarding_status, app_onboarding_last_step);
