-- Vita — schema (slice 1: the daily loop)
--
-- Single user, but every row is keyed by user_email so admitting a second
-- person stays a config change rather than a migration.
--
-- ACCESS MODEL
-- All database access goes through Next.js API routes using the service_role
-- key, which bypasses RLS by design. RLS is nonetheless ENABLED on every table
-- with NO policies, so that if the publishable/anon key is ever exposed or a
-- table accidentally reached from a browser, the default answer is "nothing".
-- Defence in depth — not the primary control, which is the session check in
-- each API route.

create table if not exists profile (
  user_email          text primary key,
  age_years           integer      not null check (age_years between 13 and 120),
  height_cm           numeric(5,1) not null check (height_cm between 100 and 250),
  sex                 text         not null check (sex in ('male', 'female')),
  activity            text         not null check (activity in ('sedentary', 'light', 'moderate', 'active')),
  -- The PRD's rate cap, enforced in the database as well as in lib/targets.ts.
  gain_rate_pct       numeric(3,2) not null check (gain_rate_pct between 0.25 and 0.50),
  kcal_target         integer      not null check (kcal_target > 0),
  protein_target_g    integer      not null check (protein_target_g > 0),
  sleep_target_hours  numeric(3,1) not null default 8.0 check (sleep_target_hours > 0),
  goal_weight_kg      numeric(4,1) check (goal_weight_kg between 20 and 400),
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now()
);

create table if not exists day_log (
  user_email          text         not null,
  -- A LOCAL calendar date, written by the app from lib/bars.ts toDateKey().
  -- Never derive this server-side from now() — the server is UTC and his
  -- late-evening entries would file under tomorrow.
  day                 date         not null,
  weight_kg           numeric(4,1) check (weight_kg between 20 and 400),
  sleep_hours         numeric(3,1) check (sleep_hours between 0 and 24),
  trained             boolean      not null default false,
  -- Targets are SNAPSHOTTED per day rather than read live from profile.
  -- Slice 4 recalibrates targets weekly; without a snapshot every past day's
  -- bars would silently re-scale to the newest target and the history would
  -- lie about whether a day was actually green.
  kcal_target         integer      not null check (kcal_target > 0),
  protein_target_g    integer      not null check (protein_target_g > 0),
  sleep_target_hours  numeric(3,1) not null default 8.0,
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now(),
  primary key (user_email, day)
);

create table if not exists food_entry (
  id          uuid         primary key default gen_random_uuid(),
  user_email  text         not null,
  day         date         not null,
  -- Upper bounds here are FAT-FINGER PROTECTION, not a daily limit. Going past
  -- the daily target is the entire point of this app (see docs/design-slice-1.md
  -- decision 4) and nothing anywhere caps the day's total.
  kcal        integer      not null check (kcal > 0 and kcal <= 10000),
  protein_g   numeric(5,1) not null default 0 check (protein_g >= 0 and protein_g <= 1000),
  -- Free text, his own words. Deliberately not a foreign key to a food
  -- database: there is no food database, and slice 2 seeds saved meals from
  -- exactly this column.
  label       text         check (label is null or length(label) <= 200),
  logged_at   timestamptz  not null default now()
);

create index if not exists food_entry_user_day_idx on food_entry (user_email, day);

-- No photo table, no storage bucket. Photos are never persisted (CEO decision,
-- 2026-10-21): the image goes to the vision API in memory and is discarded,
-- leaving only the numbers and the label above.

alter table profile    enable row level security;
alter table day_log    enable row level security;
alter table food_entry enable row level security;
