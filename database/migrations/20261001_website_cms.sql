begin;
create table public.website_editors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.website_editors enable row level security;
create policy editor_own_membership on public.website_editors for select to authenticated using (user_id = auth.uid());
create function public.cms_is_editor() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.website_editors where user_id = auth.uid() and active);
$$;
revoke all on function public.cms_is_editor() from public;
grant execute on function public.cms_is_editor() to authenticated;
create table public.website_posts (
  id uuid primary key default gen_random_uuid(), slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 160),
  title text not null check(length(title) between 1 and 180), excerpt text not null check(length(excerpt) between 1 and 400),
  body text not null check(length(body) between 1 and 100000), category text not null check(length(category) between 1 and 80),
  author text not null check(length(author) between 1 and 120), cover_url text not null default '', cover_alt text not null default '',
  status text not null default 'draft' check(status in ('draft','published','archived')), featured boolean not null default false,
  version integer not null default 1, published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (cover_url = '' or length(cover_alt) > 0)
);
create index website_posts_public on public.website_posts(status,published_at desc);
create table public.website_content (
  key text primary key check(key in ('homepage','services','team','faq','contact')),
  value jsonb not null check(jsonb_typeof(value) = 'object' and octet_length(value::text) <= 150000),
  version integer not null default 1, updated_at timestamptz not null default now()
);
create table public.website_media (
  id uuid primary key, object_key text not null unique, url text not null,
  name text not null, alt text not null check(length(alt) between 1 and 240),
  content_type text not null check(content_type in ('image/png','image/jpeg','image/webp')),
  size integer not null check(size between 1 and 5242880), is_public boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.website_audit (
  id bigint generated always as identity primary key, actor uuid references auth.users(id) on delete set null,
  collection text not null, record_id text not null, action text not null,
  version integer, created_at timestamptz not null default now()
);
create table public.website_rate_limits (
  key text primary key, attempts integer not null, window_start timestamptz not null
);
alter table public.events add column if not exists version integer not null default 1;
alter table public.website_posts enable row level security;
alter table public.website_content enable row level security;
alter table public.website_media enable row level security;
alter table public.website_audit enable row level security;
alter table public.website_rate_limits enable row level security;
create policy public_posts on public.website_posts for select to anon,authenticated using(status='published' and published_at <= now());
create policy editor_posts on public.website_posts for select to authenticated using(public.cms_is_editor());
create policy public_content on public.website_content for select to anon,authenticated using(true);
create policy public_media on public.website_media for select to anon,authenticated using(is_public);
create policy editor_events on public.events for select to authenticated using(public.cms_is_editor());
create policy editor_audit on public.website_audit for select to authenticated using(public.cms_is_editor());
-- remove all existing registration policies to prevent inherited public disclosure.
do $$ declare item record; begin
  for item in select policyname from pg_policies where schemaname='public' and tablename='event_registrations' loop
    execute format('drop policy %I on public.event_registrations', item.policyname);
  end loop;
end $$;
create policy editor_registrations on public.event_registrations for select to authenticated using(public.cms_is_editor());
revoke all on public.website_editors,public.website_posts,public.website_content,public.website_media,public.website_audit,public.website_rate_limits from anon,authenticated;
revoke insert,update,delete on public.events from anon,authenticated;
revoke all on public.event_registrations from anon,authenticated;
grant select on public.website_posts,public.website_content,public.website_media to anon,authenticated;
grant select on public.website_editors,public.website_audit,public.events,public.event_registrations to authenticated;
grant all on public.website_editors,public.website_posts,public.website_content,public.website_media,public.website_audit,public.website_rate_limits to service_role;
grant usage,select on all sequences in schema public to service_role;

-- keep plain addresses intact; multiple locations use a json array.
create function public.cms_location_value(value text)
returns jsonb language plpgsql immutable set search_path = '' as $$
begin
  return value::jsonb;
exception when invalid_text_representation then
  return to_jsonb(value);
end $$;
revoke all on function public.cms_location_value(text) from public;

create function public.cms_save(collection_name text, record_id text, expected_version integer, payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb; old_version integer; old_published timestamptz; registrations integer; event_row public.events;
begin
  if not public.cms_is_editor() then raise exception 'Editor access required' using errcode='42501'; end if;
  if expected_version < 0 or expected_version is null then raise exception 'Invalid version' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(collection_name || ':' || record_id,0));
  if collection_name = 'posts' then
    select version,published_at into old_version,old_published from public.website_posts where id=record_id::uuid for update;
    if coalesce(old_version,0) <> expected_version then raise exception 'Version conflict' using errcode='40001'; end if;
    insert into public.website_posts(id,slug,title,excerpt,body,category,author,cover_url,cover_alt,status,featured,version,published_at)
    values(record_id::uuid,payload->>'slug',payload->>'title',payload->>'excerpt',payload->>'body',payload->>'category',payload->>'author',payload->>'cover_url',payload->>'cover_alt',payload->>'status',(payload->>'featured')::boolean,expected_version+1,
      case when payload->>'status'='published' then coalesce(old_published,now()) else old_published end)
    on conflict(id) do update set slug=excluded.slug,title=excluded.title,excerpt=excluded.excerpt,body=excluded.body,category=excluded.category,author=excluded.author,cover_url=excluded.cover_url,cover_alt=excluded.cover_alt,status=excluded.status,featured=excluded.featured,version=excluded.version,published_at=excluded.published_at,updated_at=now()
    returning to_jsonb(website_posts) into result;
  elsif collection_name = 'events' then
    select version into old_version from public.events where id=record_id for update;
    if coalesce(old_version,0) <> expected_version then raise exception 'Version conflict' using errcode='40001'; end if;
    select count(*) into registrations from public.event_registrations where event_id=record_id and status='confirmed';
    if ((payload->>'capacity')::integer > 0 and (payload->>'capacity')::integer < registrations) or (payload->>'capacity')::integer < 0 or (payload->>'price')::numeric < 0 or (payload->>'end_date')::timestamptz <= (payload->>'start_date')::timestamptz then
      raise exception 'Invalid event limits' using errcode='23514';
    end if;
    if pg_typeof(event_row.locations)::text = 'jsonb' and payload->>'locations' is not null then
      payload := jsonb_set(payload,'{locations}',public.cms_location_value(payload->>'locations'));
    end if;
    event_row := jsonb_populate_record(null::public.events,payload);
    insert into public.events(id,name,description,image_url,start_date,end_date,location,venue,capacity,price,is_active,locations,version)
    values(record_id,payload->>'name',payload->>'description',payload->>'image_url',(payload->>'start_date')::timestamptz,(payload->>'end_date')::timestamptz,payload->>'location',payload->>'venue',(payload->>'capacity')::integer,(payload->>'price')::numeric,(payload->>'is_active')::boolean,event_row.locations,expected_version+1)
    on conflict(id) do update set name=excluded.name,description=excluded.description,image_url=excluded.image_url,start_date=excluded.start_date,end_date=excluded.end_date,location=excluded.location,venue=excluded.venue,capacity=excluded.capacity,price=excluded.price,is_active=excluded.is_active,locations=excluded.locations,version=excluded.version,updated_at=now()
    returning to_jsonb(events) into result;
    result := result || jsonb_build_object('registration_count',registrations);
  elsif collection_name = 'content' then
    select version into old_version from public.website_content where key=record_id for update;
    if coalesce(old_version,0) <> expected_version then raise exception 'Version conflict' using errcode='40001'; end if;
    insert into public.website_content(key,value,version) values(record_id,payload->'value',expected_version+1)
    on conflict(key) do update set value=excluded.value,version=excluded.version,updated_at=now()
    returning to_jsonb(website_content) into result;
  else raise exception 'Invalid collection' using errcode='22023';
  end if;
  insert into public.website_audit(actor,collection,record_id,action,version)
  values(auth.uid(),collection_name,record_id,case when expected_version=0 then 'create' else 'update' end,expected_version+1);
  return result;
end $$;
revoke all on function public.cms_save(text,text,integer,jsonb) from public;
grant execute on function public.cms_save(text,text,integer,jsonb) to authenticated;

create function public.cms_rate_limit(bucket_key text,max_requests integer,window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare requests integer;
begin
  if length(bucket_key)<>64 or max_requests<1 or window_seconds<1 then raise exception 'Invalid limit'; end if;
  insert into public.website_rate_limits(key,attempts,window_start) values(bucket_key,1,clock_timestamp())
  on conflict(key) do update set
    attempts=case when website_rate_limits.window_start <= clock_timestamp()-make_interval(secs=>window_seconds) then 1 else website_rate_limits.attempts+1 end,
    window_start=case when website_rate_limits.window_start <= clock_timestamp()-make_interval(secs=>window_seconds) then clock_timestamp() else website_rate_limits.window_start end
  returning attempts into requests;
  delete from public.website_rate_limits where window_start < now()-interval '1 day';
  return requests <= max_requests;
end $$;
revoke all on function public.cms_rate_limit(text,integer,integer) from public;
grant execute on function public.cms_rate_limit(text,integer,integer) to service_role;
create function public.cms_public_categories() returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(category order by category),'[]'::jsonb) from (select distinct category from public.website_posts where status='published' and published_at<=now()) categories;
$$;
grant execute on function public.cms_public_categories() to anon,authenticated;
create function public.cms_overview() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.cms_is_editor() then raise exception 'Editor access required' using errcode='42501'; end if;
  return jsonb_build_object(
    'published_posts',(select count(*) from public.website_posts where status='published'),
    'draft_posts',(select count(*) from public.website_posts where status='draft'),
    'active_events',(select count(*) from public.events where is_active),
    'registrations',(select count(*) from public.event_registrations where status='confirmed'),
    'recent_posts',(select coalesce(jsonb_agg(to_jsonb(recent)),'[]'::jsonb) from (select * from public.website_posts order by updated_at desc limit 5) recent));
end $$;
revoke all on function public.cms_overview() from public;
grant execute on function public.cms_overview() to authenticated;
create function public.cms_add_media(media_id uuid,object_key text,media_name text,media_alt text,mime_type text,byte_size integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not public.cms_is_editor() then raise exception 'Editor access required' using errcode='42501'; end if;
  if object_key !~ ('^' || media_id::text || '\.(png|jpg|webp)$') then raise exception 'Invalid key' using errcode='22023'; end if;
  insert into public.website_media(id,object_key,url,name,alt,content_type,size)
  values(media_id,object_key,'/api/media/'||object_key,media_name,media_alt,mime_type,byte_size)
  returning to_jsonb(website_media) into result;
  insert into public.website_audit(actor,collection,record_id,action) values(auth.uid(),'media',media_id::text,'create');
  return result;
end $$;
revoke all on function public.cms_add_media(uuid,text,text,text,text,integer) from public;
grant execute on function public.cms_add_media(uuid,text,text,text,text,integer) to authenticated;
create function public.cms_register_event(registration jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  selected public.events;
  used_capacity integer;
  result jsonb;
  loc_pref text;
  loc_allowed boolean := false;
  loc_item text;
  j jsonb;
begin
  select * into selected from public.events where id=registration->>'event_id' for update;
  if not found or not selected.is_active then raise exception 'event not found' using errcode='23514'; end if;
  select count(*) into used_capacity from public.event_registrations where event_id=selected.id and status='confirmed';
  if selected.capacity>0 and used_capacity>=selected.capacity then raise exception 'event is at capacity' using errcode='P0001'; end if;

  loc_pref := lower(trim(registration->>'location_preference'));
  if loc_pref is null or length(loc_pref) = 0 then
    raise exception 'invalid location preference' using errcode='23514';
  end if;
  if lower(trim(selected.location)) = loc_pref then
    loc_allowed := true;
  elsif selected.locations is not null then
    j := public.cms_location_value(selected.locations::text);
    if jsonb_typeof(j) = 'array' then
      for loc_item in
        select value #>> '{}' from jsonb_array_elements(j)
        where jsonb_typeof(value) = 'string'
      loop
        if lower(trim(loc_item)) = loc_pref then loc_allowed := true; exit; end if;
      end loop;
    elsif jsonb_typeof(j) = 'string' then
      loc_allowed := lower(trim(j #>> '{}')) = loc_pref;
    end if;
  end if;
  if not loc_allowed then
    raise exception 'invalid location preference' using errcode='23514';
  end if;

  insert into public.event_registrations(event_id,name,gender,profession,phone_number,email,location_preference,needs_directions,notes,ticket_number,status)
  values(selected.id,registration->>'name',registration->>'gender',registration->>'profession',registration->>'phone_number',registration->>'email',registration->>'location_preference',coalesce((registration->>'needs_directions')::boolean,false),registration->>'notes',registration->>'ticket_number','confirmed')
  returning to_jsonb(event_registrations) into result;
  return result;
end $$;
revoke all on function public.cms_register_event(jsonb) from public;
grant execute on function public.cms_register_event(jsonb) to service_role;
commit;
