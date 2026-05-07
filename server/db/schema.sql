create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null,
  type text not null check (type in ('url', 'note', 'checklist', 'embed')),
  url text,
  content text,
  icon text,
  color text,
  metadata jsonb default '{}'::jsonb,
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create index if not exists idx_folders_user_id on public.folders(user_id);
create index if not exists idx_blocks_user_id on public.blocks(user_id);
