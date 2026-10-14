-- Indexes for the hot query paths.
--
-- NOTE ON IMPACT: at current table sizes (18 folders, 86 files) these change
-- nothing measurable — Postgres sequential-scans small tables regardless. The
-- present slowness is network round-trip latency (~200ms per query to the
-- remote instance), not query execution. These exist so listing and search stay
-- fast as the data grows into the thousands of rows.

-- Listing: every GET /items filters on exactly these columns.
create index if not exists folders_listing_idx
  on folders (user_id, workspace_id, parent_id)
  where is_deleted = false;

create index if not exists files_listing_idx
  on files (user_id, workspace_id, parent_id)
  where is_deleted = false;

-- Search: ILIKE '%term%' cannot use a btree index. pg_trgm makes the
-- substring match indexable.
create extension if not exists pg_trgm;

create index if not exists folders_title_trgm_idx on folders using gin (title gin_trgm_ops);
create index if not exists files_title_trgm_idx   on files   using gin (title gin_trgm_ops);
create index if not exists files_url_trgm_idx     on files   using gin (url gin_trgm_ops);

-- Tag enrichment joins from item to tag.
create index if not exists item_tags_item_idx on item_tags (item_id);
create index if not exists item_tags_tag_idx  on item_tags (tag_id);

-- Favorites and trash views filter on these flags.
create index if not exists files_favorite_idx
  on files (user_id, workspace_id)
  where is_favorite = true and is_deleted = false;

create index if not exists folders_favorite_idx
  on folders (user_id, workspace_id)
  where is_favorite = true and is_deleted = false;

-- Sorting by the columns the UI headers expose.
create index if not exists files_updated_idx   on files (user_id, workspace_id, updated_at desc);
create index if not exists folders_updated_idx on folders (user_id, workspace_id, updated_at desc);
