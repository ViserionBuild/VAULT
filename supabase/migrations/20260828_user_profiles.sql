-- User profile details.
--
-- Kept separate from `users` rather than adding columns there: `users` is on
-- the authentication hot path (every login and token verification reads it),
-- and profile data is optional, larger, and read only on the profile page.

create table if not exists user_profiles (
  user_id       uuid primary key references users(id) on delete cascade,

  -- Display
  avatar_url    text,
  display_name  text,
  bio           text,

  -- Contact
  phone         text,

  -- Address, kept as discrete fields so it can be sorted and filtered later
  address_line1 text,
  address_line2 text,
  city          text,
  state         text,
  postal_code   text,
  country       text,

  -- Preferences
  timezone      text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One profile per user is enforced by the primary key above.
-- Deleting a user removes their profile via the cascade.

-- Keep updated_at accurate without relying on the application to set it.
create or replace function set_user_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_profiles_updated_at on user_profiles;
create trigger user_profiles_updated_at
  before update on user_profiles
  for each row execute function set_user_profiles_updated_at();

-- Backfill a row for every existing user so the profile page always has one.
insert into user_profiles (user_id)
select id from users
on conflict (user_id) do nothing;
