-- Item tag queries.

-- Add tag to item
-- insert into item_tags (item_id, tag_id)
-- values ($1, $2)
-- on conflict (item_id, tag_id) do nothing;

-- Remove tag from item
-- delete from item_tags where item_id = $1 and tag_id = $2;

-- Tags for item
-- select t.*
-- from item_tags it
-- join tags t on t.id = it.tag_id
-- where it.item_id = $1;

-- Items for tag
-- select i.*
-- from item_tags it
-- join items i on i.id = it.item_id
-- where it.tag_id = $1 and i.is_deleted = false;
