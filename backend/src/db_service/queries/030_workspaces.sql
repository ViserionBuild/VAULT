-- Workspace queries.

-- Create workspace
-- insert into workspaces (user_id, name, icon, color, is_default)
-- values ($1, $2, $3, $4, $5)
-- returning *;

-- List workspaces
-- select * from workspaces where user_id = $1 order by created_at asc;

-- Find default workspace
-- select * from workspaces where user_id = $1 and is_default = true limit 1;

-- Find workspace by id
-- select * from workspaces where id = $1 and user_id = $2 limit 1;
