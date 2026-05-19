-- Core tables for Vault backend.

drop table if exists item_tags cascade;
drop table if exists todo_tasks cascade;
drop table if exists todo_lists cascade;
drop table if exists items cascade;
drop table if exists notes cascade;
drop table if exists notes_folders cascade;
drop table if exists files cascade;
drop table if exists folders cascade;
drop table if exists tags cascade;
drop table if exists refresh_tokens cascade;
drop table if exists workspaces cascade;
drop table if exists users cascade;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists refresh_tokens (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  revoked_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  parent_id uuid references folders(id) on delete set null,
  title text not null,
  description text not null default '',
  icon text,
  is_favorite boolean not null default false,
  is_deleted boolean not null default false,
  position integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint folders_parent_is_not_self check (parent_id is null or parent_id <> id)
);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  parent_id uuid references folders(id) on delete set null,
  title text not null,
  url text not null,
  description text not null default '',
  icon text,
  thumbnail text,
  is_favorite boolean not null default false,
  is_deleted boolean not null default false,
  position integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint files_parent_is_not_self check (parent_id is null or parent_id <> id)
);

create table if not exists notes_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  parent_id uuid references notes_folders(id) on delete set null,
  title text not null,
  description text not null default '',
  icon text,
  is_favorite boolean not null default false,
  is_deleted boolean not null default false,
  position integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint notes_folders_parent_is_not_self check (parent_id is null or parent_id <> id)
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  parent_id uuid references notes_folders(id) on delete set null,
  title text not null,
  content text not null default '',
  is_favorite boolean not null default false,
  is_deleted boolean not null default false,
  position integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint notes_parent_is_not_self check (parent_id is null or parent_id <> id)
);

create table if not exists todo_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null default '',
  priority integer not null default 0,
  target_date timestamptz,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists todo_tasks (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references todo_lists(id) on delete cascade,
  title text not null,
  description text not null default '',
  completed boolean not null default false,
  priority integer not null default 0,
  due_date timestamptz,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  color text not null default '#7c3aed',
  icon text,
  created_at timestamptz not null default now()
);

create table if not exists item_tags (
  item_id uuid not null,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, tag_id)
);
