-- Enforce one account per email address.
--
-- The application already normalizes emails to lowercase and already handles
-- Postgres error 23505 (unique_violation) on signup by returning 409
-- EMAIL_IN_USE. That handler was dead code because the database had no unique
-- constraint, so duplicate accounts could be created and login would resolve to
-- whichever row Postgres happened to return first.
--
-- Run this ONCE against the database. Step 1 must report zero rows before the
-- index in step 3 can be created.

-- ---------------------------------------------------------------------------
-- Step 1: find existing duplicates. Resolve each group by hand before
-- continuing (keep one row, migrate or delete the others).
-- ---------------------------------------------------------------------------
select lower(trim(email)) as normalized_email,
       count(*)           as account_count,
       array_agg(id order by created_at) as user_ids,
       array_agg(created_at order by created_at) as created
from users
group by lower(trim(email))
having count(*) > 1;

-- ---------------------------------------------------------------------------
-- Step 2: normalize existing values so the index matches what the app writes.
-- ---------------------------------------------------------------------------
update users
set email = lower(trim(email))
where email <> lower(trim(email));

-- ---------------------------------------------------------------------------
-- Step 3: enforce uniqueness case-insensitively.
--
-- Indexing on lower(trim(email)) rather than the raw column means
-- "Abc@gmail.com" and "abc@gmail.com" collide, which is what users expect.
-- ---------------------------------------------------------------------------
create unique index if not exists users_email_unique_idx
  on users (lower(trim(email)));
