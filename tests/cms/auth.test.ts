import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as signIn } from '../../app/api/auth/sign-in/route';
import { POST as verify } from '../../app/api/auth/verify/route';
const origin='https://website.example.invalid';
const provider='https://database.example.invalid';
test('Email authentication is invite-only and keeps session data out of JSON', async()=>{
  const prior={...process.env};const originalFetch=globalThis.fetch;
  process.env.CMS_SITE_URL=origin;
  process.env.NEXT_PUBLIC_SUPABASE_URL=provider;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=crypto.randomUUID();
  process.env.SUPABASE_SERVICE_ROLE_KEY=crypto.randomUUID();
  const access=crypto.randomUUID();const refresh=crypto.randomUUID();
  const user={id:crypto.randomUUID(),email:'editor@example.invalid',aud:'authenticated',created_at:new Date().toISOString()};
  let member=true;let providerMail=false;let mailStatus=201;const issued='482913';let sentMail:{to:{email:string}[];subject:string;textContent:string}|null=null;
  globalThis.fetch=async(input,init)=>{
    const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
    if(url.origin==='https://api.brevo.com'){sentMail=JSON.parse(String(init?.body));return new Response('{}',{status:mailStatus});}
    assert.equal(url.origin,provider);
    let body:unknown=true;
    if(url.pathname==='/rest/v1/website_allowed_emails')body=member?[{email:user.email}]:[];
    if(url.pathname==='/auth/v1/otp')providerMail=true;
    if(url.pathname==='/auth/v1/admin/generate_link')body={email_otp:issued,hashed_token:'h',action_link:'https://other.example.invalid/x',verification_type:'magiclink',redirect_to:'',...user};
    if(url.pathname==='/auth/v1/verify')body={access_token:access,refresh_token:refresh,expires_in:3600,token_type:'bearer',user};
    if(url.pathname==='/auth/v1/user')body=user;
    if(url.pathname==='/rest/v1/website_editors')body=member?[{user_id:user.id}]:[];
    return new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
  };
  const request=(body:unknown)=>new Request(origin,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
  try{
    assert.equal((await signIn(request({email:user.email}))).status,200);
    // the email carries a code and no link, and the shared provider template stays unused.
    assert.equal(providerMail,false);
    assert.equal(sentMail!.to[0].email,user.email);
    assert.ok(sentMail!.textContent.includes(issued));
    assert.ok(!/https?:/.test(sentMail!.textContent+sentMail!.subject));
    mailStatus=500;
    assert.equal((await signIn(request({email:user.email}))).status,503);
    mailStatus=201;sentMail=null;member=false;
    assert.equal((await signIn(request({email:user.email}))).status,200);
    assert.equal(sentMail,null);
    member=true;
    const code=issued;
    const response=await verify(request({email:user.email,token:code}));
    assert.equal(response.status,200);
    const cookie=response.headers.get('set-cookie')||'';
    assert.ok(cookie.includes('HttpOnly'));
    assert.ok(cookie.includes('SameSite=strict'));
    const body=await response.text();
    assert.ok(!body.includes(access));assert.ok(!body.includes(refresh));
    const tokenResponse=await verify(request({accessToken:access}));
    assert.equal(tokenResponse.status,200);
    member=false;
    assert.equal((await verify(request({email:user.email,token:code}))).status,403);
    assert.equal((await verify(request({accessToken:access}))).status,403);
  }finally{
    globalThis.fetch=originalFetch;
    for(const key of ['CMS_SITE_URL','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY']){
      if(prior[key])process.env[key]=prior[key];else delete process.env[key];
    }
  }
});
