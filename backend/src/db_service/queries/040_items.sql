-- Folder and file queries.

-- Count siblings (position)
-- select count(*)
-- from folders
-- where user_id = $1
--   and workspace_id = $2
--   and parent_id is not distinct from $3
--   and is_deleted = false
-- union all
-- select count(*)
-- from files
-- where user_id = $1
--   and workspace_id = $2
--   and parent_id is not distinct from $3
--   and is_deleted = false;

-- Create folder
-- insert into folders (
--   user_id, workspace_id, parent_id, title, description, icon,
--   is_favorite, is_deleted, position, metadata
-- ) values ($1,$2,$3,$4,$5,$6,false,false,$7,$8)
-- returning *;

--   and workspace_id = $2
--   and parent_id is not distinct from $3
--     metadata = coalesce($4, metadata),
--     position = coalesce($5, position),
--     updated_at = now()
-- where id = $6 and user_id = $7
-- returning *;

-- Update file
-- update files
-- set title = coalesce($1, title),
--     description = coalesce($2, description),
--     url = coalesce($3, url),
--     icon = coalesce($4, icon),
--     thumbnail = coalesce($5, thumbnail),
--     metadata = coalesce($6, metadata),
--     position = coalesce($7, position),
--     updated_at = now()
-- where id = $8 and user_id = $9
-- returning *;

-- Soft delete folder/file
-- update folders
-- set is_deleted = true, deleted_at = now(), updated_at = now()
-- where id = $1 and user_id = $2
-- returning *;

-- update files
-- set is_deleted = true, deleted_at = now(), updated_at = now()
-- where id = $1 and user_id = $2
-- returning *;
-- set is_deleted = true, deleted_at = now(), updated_at = now()
-- Restore folder/file
-- update folders
-- set is_deleted = false, deleted_at = null, parent_id = $3, updated_at = now()
-- where id = $1 and user_id = $2
-- returning *;

-- update files
-- set is_deleted = false, deleted_at = null, parent_id = $3, updated_at = now()
-- where id = $1 and user_id = $2
-- returning *;

-- Purge folder/file
-- delete from folders where id = $1 and user_id = $2;
-- delete from files where id = $1 and user_id = $2;
-- set is_deleted = false, deleted_at = null, parent_id = $3, updated_at = now()
-- Toggle favorite
-- update folders
-- set is_favorite = not is_favorite, updated_at = now()
-- where id = $1 and user_id = $2
-- returning *;

-- update files
-- set is_favorite = not is_favorite, updated_at = now()
-- where id = $1 and user_id = $2
-- returning *;

-- Move folder/file
-- update folders
-- set parent_id = $3, updated_at = now()
-- where id = $1 and user_id = $2
-- returning *;

-- update files
-- set parent_id = $3, updated_at = now()
-- where id = $1 and user_id = $2
-- returning *;

-- Favorites
-- select * from folders
-- where user_id = $1 and is_favorite = true and is_deleted = false
-- union all
-- select * from files
-- where user_id = $1 and is_favorite = true and is_deleted = false
-- order by updated_at desc;
-- set is_favorite = not is_favorite, updated_at = now()
-- Trash
-- select * from folders
-- where user_id = $1 and is_deleted = true
-- union all
-- select * from files
-- where user_id = $1 and is_deleted = true
-- order by deleted_at desc;

-- Move item
-- update items
-- set parent_id = $3, updated_at = now()
-- where id = $1 and user_id = $2
-- returning *;

-- Favorites
-- select * from items
-- where user_id = $1 and is_favorite = true and is_deleted = false
-- order by updated_at desc;

-- Trash
-- select * from items
-- where user_id = $1 and is_deleted = true
-- order by deleted_at desc;
