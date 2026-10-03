import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const editorId = '00000000-0000-4000-8000-000000000001';
const outsiderId = '00000000-0000-4000-8000-000000000002';
const postId = '00000000-0000-4000-8000-000000000003';
const draft = { slug: 'test-post', title: 'Test', excerpt: 'Summary', body: 'Paragraph', category: 'Wellness', author: 'Editor', cover_url: '', cover_alt: '', status: 'draft', featured: false };
async function database(locationType: 'text' | 'jsonb' = 'text') {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create table public.events(id text primary key,name text not null,description text not null,image_url text,start_date timestamp not null,end_date timestamp not null,location text not null,venue text,capacity integer not null default 0,price numeric not null default 0,is_active boolean not null default true,locations ${locationType},created_at timestamp not null default now(),updated_at timestamp not null default now());
    create table public.event_registrations(id uuid primary key default gen_random_uuid(),event_id text references public.events(id),email text,name text,gender text,profession text,phone_number text,location_preference text,needs_directions boolean,notes text,ticket_number text unique,status text default 'confirmed',unique(event_id,email));
    alter table public.events enable row level security;
    alter table public.event_registrations enable row level security;
    create policy unsafe_registration_read on public.event_registrations for select using(true);
    grant select on public.event_registrations to anon;
  `);
  await db.exec(await readFile(new URL('../../database/migrations/20261001_website_cms.sql', import.meta.url), 'utf8'));
  await db.query('insert into auth.users(id) values ($1),($2)', [editorId, outsiderId]);
  await db.query('insert into public.website_editors(user_id) values ($1)', [editorId]);
  return db;
}
async function identity(db: PGlite, role: string, id = '') {
  await db.exec(`reset role; set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function save(db: PGlite, version: number, value = draft) {
  return db.query<{ result: { version: number; status: string } }>('select public.cms_save($1,$2,$3,$4::jsonb) as result', ['posts', postId, version, JSON.stringify(value)]);
}
test('Migration enforces editor access, versions, publishing, and audit records', async () => {
  const db = await database();
  try {
    await identity(db, 'authenticated', outsiderId);
    await assert.rejects(save(db, 0), /Editor access required/);
    await identity(db, 'authenticated', editorId);
    assert.equal((await save(db, 0)).rows[0].result.version, 1);
    await assert.rejects(save(db, 0), /Version conflict/);
    await assert.rejects(db.exec("update public.blog_posts set title='Bypass'"), /permission denied/);
    await identity(db, 'anon');
    assert.equal((await db.query('select * from public.blog_posts')).rows.length, 0);
    await assert.rejects(db.exec('select * from public.event_registrations'), /permission denied/);
    await identity(db, 'authenticated', editorId);
    await save(db, 1, { ...draft, status: 'published' });
    await identity(db, 'anon');
    assert.equal((await db.query('select * from public.blog_posts')).rows.length, 1);
    await identity(db, 'authenticated', editorId);
    await save(db, 2, { ...draft, status: 'archived' });
    assert.equal((await db.query('select * from public.website_audit')).rows.length, 3);
    await identity(db, 'anon');
    assert.equal((await db.query('select * from public.blog_posts')).rows.length, 0);
    await identity(db, 'postgres');
    await db.exec('update public.website_editors set active=false');
    await identity(db, 'authenticated', editorId);
    await assert.rejects(save(db, 3), /Editor access required/);
  } finally { await db.close(); }
});
test('Content create conflicts do not overwrite saved values', async () => {
  const db = await database();
  try {
    await identity(db, 'authenticated', editorId);
    const args = ['content','homepage',0,JSON.stringify({ value: { heading: 'Hello', introduction: 'Welcome' } })];
    await db.query('select public.cms_save($1,$2,$3,$4)', args);
    await assert.rejects(db.query('select public.cms_save($1,$2,$3,$4)', args), /Version conflict/);
    const result = await db.query<{ version: number }>('select version from public.website_content');
    assert.equal(result.rows[0].version, 1);
  } finally { await db.close(); }
});
test('Rate limits use persistent counters and reject public execution', async () => {
  const db = await database();
  try {
    await identity(db, 'service_role');
    const args = ['a'.repeat(64),2,60];
    const run = () => db.query<{ allowed: boolean }>('select public.cms_rate_limit($1,$2,$3) as allowed', args);
    assert.equal((await run()).rows[0].allowed, true);
    assert.equal((await run()).rows[0].allowed, true);
    assert.equal((await run()).rows[0].allowed, false);
    await identity(db, 'anon');
    await assert.rejects(run(), /permission denied/);
  } finally { await db.close(); }
});
test('Event edits cannot reduce capacity below confirmed registrations', async () => {
  const db = await database();
  try {
    await db.exec("insert into public.events(id,name,description,start_date,end_date,location,capacity) values('session','Session','Yoga','2027-01-01','2027-01-02','London',10); insert into public.event_registrations(event_id,email) values('session','sample@example.invalid'),('session','second@example.invalid')");
    await identity(db, 'authenticated', editorId);
    const event = { name:'Session',description:'Yoga',start_date:'2027-01-01T10:00:00Z',end_date:'2027-01-01T11:00:00Z',location:'London',capacity:1,price:0,is_active:true };
    await assert.rejects(db.query('select public.cms_save($1,$2,$3,$4)', ['events','session',1,JSON.stringify(event)]), /Invalid event limits/);
    const result = await db.query('select public.cms_save($1,$2,$3,$4)', ['events','session',1,JSON.stringify({...event,capacity:10,is_active:false})]);
    assert.equal(result.rows.length,1);
    assert.equal((await db.query('select * from public.event_registrations')).rows.length,2);
  } finally { await db.close(); }
});
test('Event registration validates location against stored event, enforces capacity atomically, and treats zero as unlimited', async () => {
  const db = await database();
  try {
    await db.exec(`
      insert into public.events(id,name,description,start_date,end_date,location,capacity,locations)
      values('event-cap','Yoga','Practice','2027-01-01','2027-01-02','Liverpool',1,'["Manchester","London"]');
      insert into public.events(id,name,description,start_date,end_date,location,capacity,locations)
      values('event-unlimited','Free Flow','Practice','2027-01-01','2027-01-02','Bristol',0,'["Bath","Oxford"]' );
    `);
    await identity(db, 'service_role');
    const register = (eventId: string, email: string, locationPref: string) =>
      db.query('select public.cms_register_event($1::jsonb) as reg', [
        JSON.stringify({
          event_id: eventId,
          email,
          name: 'Attendee',
          gender: 'Female',
          profession: 'Designer',
          phone_number: '1234567890',
          location_preference: locationPref,
          ticket_number: crypto.randomUUID(),
        }),
      ]);

    // Rejects invalid location preference
    await assert.rejects(register('event-cap', 'user1@example.test', 'Paris'), /invalid location preference/);

    // Accepts alternate location from JSON array
    const r1 = await register('event-cap', 'user1@example.test', 'Manchester');
    assert.equal(r1.rows.length, 1);

    // Rejects when capacity is reached (capacity = 1)
    await assert.rejects(register('event-cap', 'user2@example.test', 'Liverpool'), /event is at capacity/);

    // zero capacity accepts multiple registrations with a location array
    const u1 = await register('event-unlimited', 'user1@example.test', 'Bath');
    const u2 = await register('event-unlimited', 'user2@example.test', 'Oxford');
    const u3 = await register('event-unlimited', 'user3@example.test', 'Bristol');
    assert.equal(u1.rows.length, 1);
    assert.equal(u2.rows.length, 1);
    assert.equal(u3.rows.length, 1);
  } finally { await db.close(); }
});


for (const locationType of ['text', 'jsonb'] as const) {
  test(`location checks match the API with ${locationType} storage`, async () => {
    const { eventAllowsLocation } = await import('../../lib/validation');
    const db = await database(locationType);
    const values = ['Studio, London', '["Bath","Oxford"]', '"London"', '[42,"Paris"]', '{"name":"Leeds"}', null];
    try {
      for (const [index, value] of values.entries()) {
        await identity(db, 'postgres');
        const stored = locationType === 'jsonb' && value === 'Studio, London' ? JSON.stringify(value) : value;
        await db.query(`insert into public.events(id,name,description,start_date,end_date,location,capacity,locations)
          values($1,'Yoga','Practice','2027-01-01','2027-01-02','Main venue',0,$2)`, [String(index), stored]);
        await identity(db, 'service_role');
        for (const selection of ['Studio, London', 'Studio', 'Bath', 'Oxford', 'London', '42', 'Paris', 'Leeds', 'Main venue']) {
          const input = { event_id: String(index), email: `${crypto.randomUUID()}@example.test`, location_preference: selection, ticket_number: crypto.randomUUID() };
          const attempt = db.query('select public.cms_register_event($1::jsonb)', [JSON.stringify(input)]);
          if (eventAllowsLocation({ location: 'Main venue', locations: value }, selection)) await attempt;
          else await assert.rejects(attempt, /invalid location preference/);
        }
      }
    } finally { await db.close(); }
  });
}

test('event edits preserve plain JSONB location strings', async () => {
  const db = await database('jsonb');
  try {
    await db.exec(`insert into public.events(id,name,description,start_date,end_date,location,locations)
      values('scalar','Yoga','Practice','2027-01-01','2027-01-02','Main venue','"Studio, London"')`);
    await identity(db, 'authenticated', editorId);
    const payload = { name: 'Updated yoga', description: 'Practice', start_date: '2027-01-01T10:00:00Z', end_date: '2027-01-01T11:00:00Z', location: 'Main venue', locations: 'Studio, London', capacity: 0, price: 0, is_active: true };
    await db.query('select public.cms_save($1,$2,$3,$4)', ['events','scalar',1,JSON.stringify(payload)]);
    const result = await db.query<{ locations: string }>("select locations from public.events where id='scalar'");
    assert.equal(result.rows[0].locations, 'Studio, London');
  } finally { await db.close(); }
});
