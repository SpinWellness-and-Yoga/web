begin;

-- the application owns the category list; the database checks the shape only.
alter table public.website_media
  add column category text not null default 'general' check (category ~ '^[a-z0-9-]{1,40}$');
create index website_media_category on public.website_media (category, created_at desc);

drop function public.cms_add_media(uuid,text,text,text,text,integer);
create function public.cms_add_media(media_id uuid,object_key text,media_name text,media_alt text,mime_type text,byte_size integer,media_category text default 'general')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not public.cms_is_editor() then raise exception 'Editor access required' using errcode='42501'; end if;
  if object_key !~ ('^' || media_id::text || '\.(png|jpg|webp)$') then raise exception 'Invalid key' using errcode='22023'; end if;
  insert into public.website_media(id,object_key,url,name,alt,content_type,size,category)
  values(media_id,object_key,'/api/media/'||object_key,media_name,media_alt,mime_type,byte_size,media_category)
  returning to_jsonb(website_media) into result;
  insert into public.website_audit(actor,collection,record_id,action) values(auth.uid(),'media',media_id::text,'create');
  return result;
end $$;
revoke all on function public.cms_add_media(uuid,text,text,text,text,integer,text) from public;
grant execute on function public.cms_add_media(uuid,text,text,text,text,integer,text) to authenticated;

create function public.cms_set_media_category(media_id uuid,media_category text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not public.cms_is_editor() then raise exception 'Editor access required' using errcode='42501'; end if;
  update public.website_media set category=media_category where id=media_id returning to_jsonb(website_media) into result;
  if result is null then raise exception 'Media not found' using errcode='22023'; end if;
  insert into public.website_audit(actor,collection,record_id,action) values(auth.uid(),'media',media_id::text,'update');
  return result;
end $$;
revoke all on function public.cms_set_media_category(uuid,text) from public;
grant execute on function public.cms_set_media_category(uuid,text) to authenticated;

commit;
