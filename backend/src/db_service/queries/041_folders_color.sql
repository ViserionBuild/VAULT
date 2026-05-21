-- Add color column to folders and backfill from metadata.

alter table folders
  add column if not exists color text;

update folders
set color = (metadata->>'color')
where color is null
  and metadata ? 'color';
