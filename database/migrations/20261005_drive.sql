begin;

create table public.drive_folders (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.drive_folders(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);
create unique index drive_folders_name on public.drive_folders (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- upload_id is set while a multipart upload is open; a file is ready when it is null.
create table public.drive_files (
  id uuid primary key,
  folder_id uuid references public.drive_folders(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 240),
  object_key text not null unique,
  content_type text not null check (length(content_type) between 1 and 120),
  size bigint not null check (size between 1 and 10737418240),
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  share_token text unique,
  upload_id text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index drive_files_folder on public.drive_files (folder_id, created_at desc);

-- the website Worker checks access and uses the service role; no browser role reads these tables.
alter table public.drive_folders enable row level security;
alter table public.drive_files enable row level security;
revoke all on public.drive_folders, public.drive_files from anon, authenticated, public;
grant all on public.drive_folders, public.drive_files to service_role;

create function public.drive_usage() returns bigint language sql stable set search_path = '' as $$
  select coalesce(sum(size), 0)::bigint from public.drive_files
$$;
revoke all on function public.drive_usage() from public, anon, authenticated;
grant execute on function public.drive_usage() to service_role;

insert into public.drive_folders (name) values ('Digital products'), ('Tutorials'), ('Social posts'), ('Brand');

commit;
