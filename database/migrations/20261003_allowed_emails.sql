begin;

create table if not exists public.website_allowed_emails (
  email text primary key check (email = lower(trim(email))),
  role text not null default 'admin' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

alter table public.website_allowed_emails enable row level security;

revoke all on public.website_allowed_emails from anon, public;

create policy editor_allowed_emails on public.website_allowed_emails
  for select to authenticated
  using (public.cms_is_editor());

insert into public.website_allowed_emails (email, role)
values
  ('babalolaopedaniel@gmail.com', 'admin'),
  ('cspinyoga@gmail.com', 'admin')
on conflict (email) do nothing;

commit;
