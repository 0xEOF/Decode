-- Hand-written follow-up to 0000_worried_fixer.sql (drizzle-kit doesn't know
-- about Supabase's `auth` schema, so this can't be generated from schema.ts).
--
-- Run this in the Supabase SQL Editor AFTER 0000_worried_fixer.sql has been
-- applied — see README.md "Database & Auth setup" for the full sequence.
--
-- Three things:
--   1. profiles.id really is a foreign key into auth.users(id).
--   2. handle_new_user(): a trigger that creates the matching profiles row
--      the moment someone signs up, so the app never has to do it itself
--      (and never risks a signed-up user with no profile row).
--   3. Row-Level Security on every table, as defense-in-depth alongside the
--      app-layer `WHERE user_id = ...` filter every query already applies
--      (ROADMAP.md §18: "enforces isolation at the database layer, not just
--      in application code").

-- 1. profiles.id -> auth.users(id)
alter table "public"."profiles"
  add constraint "profiles_id_auth_users_fk"
  foreign key ("id") references auth.users(id) on delete cascade;

-- 2. Auto-create a profile row on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, student_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'student_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Row-Level Security — every table is scoped to auth.uid().
alter table "public"."profiles" enable row level security;
alter table "public"."courses" enable row level security;
alter table "public"."fixed_events" enable row level security;
alter table "public"."tasks" enable row level security;
alter table "public"."user_preferences" enable row level security;

create policy "profiles_select_own" on "public"."profiles"
  for select using (auth.uid() = id);
create policy "profiles_update_own" on "public"."profiles"
  for update using (auth.uid() = id);
-- No insert/delete policy for profiles: rows are created only by the
-- security-definer trigger above, and deleted only via cascade from
-- auth.users (account deletion), never directly by the app.

create policy "courses_all_own" on "public"."courses"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "fixed_events_all_own" on "public"."fixed_events"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tasks_all_own" on "public"."tasks"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_preferences_all_own" on "public"."user_preferences"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
