-- Tag queries.

-- Create tag
-- insert into tags (user_id, name, color, icon)
-- values ($1, $2, $3, $4)
-- returning *;

-- List tags
-- select * from tags where user_id = $1 order by created_at asc;

-- Update tag
-- update tags
-- set name = coalesce($1, name),
--     color = coalesce($2, color),
--     icon = coalesce($3, icon)
-- where id = $4 and user_id = $5
-- returning *;

-- Delete tag
-- delete from tags where id = $1 and user_id = $2;
