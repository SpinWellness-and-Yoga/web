import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as posts, POST as createPost } from '../../app/api/admin/posts/route';
import { GET as events } from '../../app/api/admin/events/route';
import { GET as overview } from '../../app/api/admin/overview/route';
import { GET as media, POST as uploadMedia } from '../../app/api/admin/media/route';
import { GET as session } from '../../app/api/admin/session/route';
import { GET as content, PUT as saveContent } from '../../app/api/admin/content/[key]/route';
import { PATCH as editPost } from '../../app/api/admin/posts/[id]/route';
import { SESSION_COOKIE } from '../../lib/cms/auth';
const origin = 'https://website.example.invalid';
const provider = 'https://database.example.invalid';
const userId = '00000000-0000-4000-8000-000000000001';
const draft = { slug:'hello',title:'Hello',excerpt:'Summary',body:'Paragraph',category:'Wellness',author:'Editor',cover_url:'',cover_alt:'',status:'draft',featured:false };
test('Admin routes reject unauthenticated reads and cross-origin writes', async () => {
  for (const handler of [posts,events,overview,media,session]) {
    const response = await handler(new Request(`${origin}/api/admin`));
    assert.equal(response.status,401);
  }
  assert.equal((await content(new Request(origin),{params:Promise.resolve({key:'homepage'})})).status,401);
  const previous=process.env.CMS_SITE_URL;
  process.env.CMS_SITE_URL=origin;
  try {
    const response=await createPost(new Request(origin,{method:'POST',headers:{origin:'https://other.example.invalid'}}));
    assert.equal(response.status,403);
  } finally { if(previous)process.env.CMS_SITE_URL=previous;else delete process.env.CMS_SITE_URL; }
});
test('Admin routes check provider identity and database membership before saving', async () => {
  const savedEnv={...process.env};
  const originalFetch=globalThis.fetch;
  let active=true;
  let conflict=false;
  let writes=0;
  const identity=crypto.randomUUID();
  const calls:string[]=[];
  process.env.CMS_SITE_URL=origin;
  process.env.NEXT_PUBLIC_SUPABASE_URL=provider;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=crypto.randomUUID();
  process.env.SUPABASE_SERVICE_ROLE_KEY=crypto.randomUUID();
  globalThis.fetch=async(input,init)=>{
    const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
    calls.push(url.pathname);
    if(url.origin!==provider)throw new Error('Unexpected external request');
    let body:unknown={};let status=200;
    if(url.pathname==='/auth/v1/user')body={id:userId,email:'editor@example.invalid',aud:'authenticated',role:'authenticated',created_at:new Date().toISOString()};
    else if(url.pathname==='/rest/v1/website_editors')body=active?[{user_id:userId}]:[];
    else if(url.pathname==='/rest/v1/rpc/cms_rate_limit')body=true;
    else if(url.pathname==='/rest/v1/rpc/cms_save'){
      writes++;
      if(conflict){body={code:'40001',message:'Version conflict'};status=400;}
      else { const payload=JSON.parse(String(init?.body));body={...payload.payload,id:payload.record_id,version:payload.expected_version+1}; }
    }else if(url.pathname==='/rest/v1/blog_posts')body=[{...draft,id:userId,version:1}];
    return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
  };
  const request=(method:string,body?:unknown)=>new Request(`${origin}/api/admin/posts`,{method,headers:{origin,'content-type':'application/json',cookie:`${SESSION_COOKIE}=${identity}`},...(body?{body:JSON.stringify(body)}:{})});
  try{
    const created=await createPost(request('POST',draft));
    assert.equal(created.status,201,JSON.stringify({calls,response:await created.clone().json()}));
    assert.equal((await created.json()).data.version,1);
    assert.ok(calls.includes('/auth/v1/user'));
    assert.ok(calls.includes('/rest/v1/website_editors'));
    assert.ok(calls.includes('/rest/v1/rpc/cms_rate_limit'));
    conflict=true;
    assert.equal((await editPost(request('PATCH',{...draft,version:1}),{params:Promise.resolve({id:userId})})).status,409);
    active=false;
    assert.equal((await createPost(request('POST',draft))).status,403);
    assert.equal(writes,2);
    active=true;
    assert.equal((await saveContent(request('PUT',{version:0,value:{heading:'Hello'}}),{params:Promise.resolve({key:'homepage'})})).status,400);
    assert.equal(writes,2);
  }finally{
    globalThis.fetch=originalFetch;
    for(const key of ['CMS_SITE_URL','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY']){
      if(savedEnv[key])process.env[key]=savedEnv[key];else delete process.env[key];
    }
  }
});
test('Media upload validates files and rolls back storage on database failure', async () => {
  const savedEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  const cfSymbol = Symbol.for('__cloudflare-context__');
  const originalCf = (globalThis as any)[cfSymbol];

  const puts: { key: string; bytes: ArrayBuffer; contentType: string }[] = [];
  const deletes: string[] = [];
  const mockBucket = {
    async put(key: string, bytes: ArrayBuffer, options: { httpMetadata: { contentType: string } }) {
      puts.push({ key, bytes, contentType: options.httpMetadata.contentType });
    },
    async get() { return null; },
    async delete(key: string) { deletes.push(key); },
  };
  (globalThis as any)[cfSymbol] = { env: { CMS_MEDIA: mockBucket } };

  let failRpc: 'none' | 'rejected' | 'committed' | 'unknown' = 'none';
  let savedMedia: Record<string, unknown> | null = null;
  process.env.CMS_SITE_URL = origin;
  process.env.NEXT_PUBLIC_SUPABASE_URL = provider;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = crypto.randomUUID();
  process.env.SUPABASE_SERVICE_ROLE_KEY = crypto.randomUUID();

  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.origin !== provider) throw new Error('Unexpected external request');
    if (url.pathname === '/auth/v1/user') {
      return new Response(JSON.stringify({ id: userId, email: 'editor@example.invalid', aud: 'authenticated', role: 'authenticated' }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/rest/v1/website_editors') {
      return new Response(JSON.stringify([{ user_id: userId }]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/rest/v1/rpc/cms_rate_limit') {
      return new Response(JSON.stringify(true), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/rest/v1/rpc/cms_add_media') {
      if (failRpc === 'rejected') {
        return new Response(JSON.stringify({ code: '42501', message: 'Database failure' }), { status: 400, headers: { 'content-type': 'application/json' } });
      }
      const payload = JSON.parse(String(init?.body));
      if (failRpc === 'committed' || failRpc === 'unknown') {
        savedMedia = failRpc === 'committed' ? { id: payload.media_id, object_key: payload.object_key, url: `/api/media/${payload.object_key}` } : null;
        throw new Error('Response lost');
      }
      return new Response(JSON.stringify({ id: payload.media_id, object_key: payload.object_key, url: `/api/media/${payload.object_key}` }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/rest/v1/website_media') return new Response(JSON.stringify(savedMedia ? [savedMedia] : []), { headers: { 'content-type': 'application/json' } });
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
  const makeRequest = () => {
    const formData = new FormData();
    formData.append('file', new File([png1x1], 'test.png', { type: 'image/png' }));
    formData.append('alt', 'Test image description');
    return new Request(`${origin}/api/admin/media`, {
      method: 'POST',
      headers: {
        origin,
        cookie: `${SESSION_COOKIE}=${crypto.randomUUID()}`,
      },
      body: formData,
    });
  };

  try {
    const res1 = await uploadMedia(makeRequest());
    assert.equal(res1.status, 201);
    assert.equal(puts.length, 1);
    assert.equal(deletes.length, 0);

    failRpc = 'rejected';
    const res2 = await uploadMedia(makeRequest());
    assert.equal(res2.status, 403);
    assert.equal(puts.length, 2);
    assert.equal(deletes.length, 1);
    assert.equal(deletes[0], puts[1].key);
    failRpc = 'committed';
    const recovered = await uploadMedia(makeRequest());
    assert.equal(recovered.status, 201);
    assert.equal(deletes.length, 1);
    assert.equal((await recovered.json()).data.object_key, puts[2].key);
    failRpc = 'unknown';
    const uncertain = await uploadMedia(makeRequest());
    assert.equal(uncertain.status, 503);
    assert.equal(deletes.length, 1);
    assert.equal(puts.length, 4);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalCf !== undefined) (globalThis as any)[cfSymbol] = originalCf; else delete (globalThis as any)[cfSymbol];
    for (const key of ['CMS_SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
      if (savedEnv[key]) process.env[key] = savedEnv[key]; else delete process.env[key];
    }
  }
});

