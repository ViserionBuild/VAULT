-- Refresh token queries.

-- Store refresh token
-- insert into refresh_tokens (token_hash, user_id, revoked_at, expires_at)
-- values ($1, $2, null, $3);

-- Find valid refresh token
-- select * from refresh_tokens
-- where token_hash = $1
--   and revoked_at is null
--   and expires_at > now()
-- limit 1;

-- Revoke refresh token
-- update refresh_tokens
-- set revoked_at = now()
-- where token_hash = $1 and revoked_at is null;
