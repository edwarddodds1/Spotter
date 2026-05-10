-- Optional breed profile extras (admin-editable). Null = app may use static fallbacks.
alter table public.breeds add column if not exists fun_fact text;
alter table public.breeds add column if not exists stat_intelligence smallint;
alter table public.breeds add column if not exists stat_energy smallint;
alter table public.breeds add column if not exists stat_trainability smallint;
alter table public.breeds add column if not exists stat_shedding smallint;
alter table public.breeds add column if not exists stat_kid_friendly smallint;
