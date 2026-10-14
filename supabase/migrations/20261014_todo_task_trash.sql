-- Deleted TODO tasks go to the Trash instead of being erased, like lists,
-- resources and notes. Until this runs, the API deletes tasks outright.
alter table public.todo_tasks
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz;

create index if not exists todo_tasks_list_live_idx
  on public.todo_tasks (list_id, order_index)
  where is_deleted = false;

-- Tie tasks to their list. Tasks whose list no longer exists can't be
-- reached from the app, so they're removed first; afterwards, deleting a
-- list for good takes its tasks with it.
delete from public.todo_tasks t
where not exists (select 1 from public.todo_lists l where l.id = t.list_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'todo_tasks_list_id_fkey' and conrelid = 'public.todo_tasks'::regclass
  ) then
    alter table public.todo_tasks
      add constraint todo_tasks_list_id_fkey
      foreign key (list_id) references public.todo_lists (id) on delete cascade;
  end if;
end $$;
