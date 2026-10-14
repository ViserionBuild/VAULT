-- Device metadata for the concurrent-session limit.
--
-- Sessions are counted per refresh token. To let a user decide which session to
-- end, each row needs enough context to be recognizable ("Chrome on Windows,
-- last active 2 minutes ago"). These columns are display-only; none of them are
-- trusted for authorization.

alter table refresh_tokens add column if not exists id uuid default gen_random_uuid();
alter table refresh_tokens add column if not exists user_agent text;
alter table refresh_tokens add column if not exists ip_address text;
alter table refresh_tokens add column if not exists last_used_at timestamptz;

-- Backfill so pre-existing sessions still render in the picker.
update refresh_tokens set last_used_at = created_at where last_used_at is null;
update refresh_tokens set id = gen_random_uuid() where id is null;

-- The picker addresses sessions by id, so it must be unique and present.
create unique index if not exists refresh_tokens_id_idx on refresh_tokens (id);

-- Counting active sessions per user is now a hot path on every login.
create index if not exists refresh_tokens_active_idx
  on refresh_tokens (user_id)
  where revoked_at is null;
