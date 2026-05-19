-- Supporting indexes and constraints.

create index if not exists idx_workspaces_user_id on workspaces(user_id);

create index if not exists idx_folders_user_workspace_parent
  on folders(user_id, workspace_id, parent_id)
  where is_deleted = false;

create index if not exists idx_files_user_workspace_parent
  on files(user_id, workspace_id, parent_id)
  where is_deleted = false;

create index if not exists idx_folders_user_favorite
  on folders(user_id, is_favorite)
  where is_deleted = false;

create index if not exists idx_files_user_favorite
  on files(user_id, is_favorite)
  where is_deleted = false;

create index if not exists idx_folders_user_deleted
  on folders(user_id, is_deleted);

create index if not exists idx_files_user_deleted
  on files(user_id, is_deleted);

create index if not exists idx_notes_user_workspace_parent
  on notes(user_id, workspace_id, parent_id)
  where is_deleted = false;

create index if not exists idx_notes_user_favorite
  on notes(user_id, is_favorite)
  where is_deleted = false;

create index if not exists idx_notes_user_deleted
  on notes(user_id, is_deleted);

create index if not exists idx_todo_lists_user_updated
  on todo_lists(user_id, updated_at desc)
  where is_deleted = false;

create index if not exists idx_todo_lists_user_deleted
  on todo_lists(user_id, is_deleted);

create index if not exists idx_todo_tasks_list_order
  on todo_tasks(list_id, order_index);

create index if not exists idx_todo_tasks_list_completed
  on todo_tasks(list_id, completed);

create index if not exists idx_tags_user_id on tags(user_id);

create unique index if not exists idx_tags_user_lower_name
  on tags(user_id, lower(name));

create index if not exists idx_item_tags_tag_id on item_tags(tag_id);
