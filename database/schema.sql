-- optimized schema with proper indexing for performance

-- events table
create table if not exists events (
  id text primary key,
  name text not null,
  description text not null,
  image_url text,
  start_date timestamp not null,
  end_date timestamp not null,
  location text not null,
  venue text,
  capacity integer not null default 0,
  price numeric(10, 2) not null default 0,
  is_active boolean not null default true,
  locations text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- indexes for events
create index if not exists idx_events_is_active on events(is_active);
create index if not exists idx_events_start_date on events(start_date);
create index if not exists idx_events_location on events(location);
create index if not exists idx_events_active_date on events(is_active, start_date) where is_active = true;

-- event_registrations table
create table if not exists event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references events(id) on delete cascade,
  name text not null,
  gender text not null,
  profession text not null,
  phone_number text not null,
  email text not null,
  location_preference text not null,
  needs_directions boolean not null default false,
  notes text,
  ticket_number text not null unique,
  status text not null default 'confirmed',
  created_at timestamp not null default now()
);

-- indexes for event_registrations (critical for performance)
create index if not exists idx_registrations_event_id on event_registrations(event_id);
create index if not exists idx_registrations_email on event_registrations(email);
create index if not exists idx_registrations_ticket_number on event_registrations(ticket_number);
create unique index if not exists idx_registrations_event_email on event_registrations(event_id, email);
create index if not exists idx_registrations_created_at on event_registrations(created_at desc);
create index if not exists idx_registrations_status on event_registrations(status);

-- composite index for common query pattern
create index if not exists idx_registrations_event_status on event_registrations(event_id, status);

-- row level security policies (if using supabase)
alter table events enable row level security;
alter table event_registrations enable row level security;

-- policy: anyone can read active events
create policy if not exists "events_select_policy" 
  on events for select 
  using (is_active = true);

-- policy: anyone can read registrations (for count queries)
create policy if not exists "registrations_select_policy" 
  on event_registrations for select 
  using (true);

-- policy: anyone can insert registrations
create policy if not exists "registrations_insert_policy" 
  on event_registrations for insert 
  with check (true);

-- function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- trigger to auto-update updated_at
create trigger update_events_updated_at
  before update on events
  for each row
  execute function update_updated_at_column();

