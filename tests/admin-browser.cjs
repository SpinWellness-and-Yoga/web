const { chromium } = require('../../frontend/node_modules/@playwright/test');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true});
 const page = await browser.newPage({viewport:{width:1440,height:1000}});
 const stamp='2026-10-01T10:00:00Z';
 const post={id:'post-one',title:'A quiet morning',slug:'quiet-morning',excerpt:'A calm start.',body:'Pause and breathe.',category:'Wellbeing',author:'Sway team',cover_url:'',cover_alt:'',status:'draft',featured:false,version:3,published_at:null,created_at:stamp,updated_at:stamp};
 const event={id:'morning-yoga',name:'Morning yoga',description:'A gentle practice.',image_url:null,start_date:'2026-11-01T10:00:00Z',end_date:'2026-11-01T11:00:00Z',location:'Lagos',venue:'Studio',capacity:20,price:0,is_active:false,locations:null,version:2,created_at:stamp,updated_at:stamp,registration_count:3};
 const asset={id:'image-one',url:'/brand/sway-wordmark.png',alt:'Sway wordmark',name:'brand.png',created_at:stamp};
 let writes=[];let failSave=false;let denySession=false;
 await page.route('**/api/admin/**',async route=>{
  const request=route.request();const url=new URL(request.url());const path=url.pathname;let data;
  if(path.endsWith('/session')) { if(denySession)return route.fulfill({status:403,json:{error:'Access denied.'}});data={email:'editor@example.test'}; }
  else if(request.method()!=='GET'){
   const body=request.postDataJSON();writes.push({path,body,method:request.method()});
   if(failSave)return route.fulfill({status:403,json:{error:'Access denied.'}});
   if(path.includes('/posts'))data={...post,...body,version:4};
   else if(path.includes('/events'))data={...event,...body,version:3};
   else if(path.includes('/content/'))data={key:path.split('/').pop(),...body,version:2,updated_at:stamp};
  }
  else if(path.endsWith('/overview'))data={published_posts:0,draft_posts:1,active_events:1,registrations:3,recent_posts:[post]};
  else if(path.endsWith('/posts'))data=[post];
  else if(path.includes('/posts/'))data=post;
  else if(path.endsWith('/events'))data=[event];
  else if(path.includes('/events/'))data=event;
  else if(path.endsWith('/media'))data=[asset];
  else if(path.includes('/content/'))data={key:path.split('/').pop(),value:null,version:0,updated_at:null};
  else throw new Error(`Unexpected path ${path}`);
  return route.fulfill({json:{data}});
 });
 page.on('dialog',dialog=>dialog.accept());
 for(const path of ['/admin','/admin/posts','/admin/posts/new','/admin/posts/post-one','/admin/events','/admin/events/new','/admin/events/morning-yoga','/admin/content','/admin/media']){
  await page.goto('http://localhost:3011'+path);await page.locator('.studio-main').waitFor();await page.waitForTimeout(150);
  assert.equal(await page.getByText('View website',{exact:true}).count(),0);
  await page.screenshot({path:`/private/tmp/sway-admin-${path.split('/').filter(Boolean).join('-')}.png`,fullPage:true});
 }
 await page.goto('http://localhost:3011/admin/posts/post-one');
 await page.getByLabel('Post title',{exact:true}).fill('A calmer morning');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Changes saved.'}).waitFor();
 assert.equal(writes.at(-1).body.version,3);assert.equal(writes.at(-1).body.title,'A calmer morning');assert.equal('id' in writes.at(-1).body,false);assert.equal('updated_at' in writes.at(-1).body,false);
 failSave=true;await page.getByLabel('Post title',{exact:true}).fill('Unsaved title');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('alert').filter({hasText:'Access denied.'}).waitFor();assert.equal(await page.getByRole('status').filter({hasText:'Changes saved.'}).count(),0);failSave=false;
 await page.goto('http://localhost:3011/admin/posts/new');
 await page.getByLabel('Post title',{exact:true}).fill('New story');await page.getByLabel('Short introduction').fill('New introduction');await page.getByLabel('Story',{exact:true}).fill('New body');await page.getByLabel('Category',{exact:true}).fill('Movement');await page.getByLabel('Author',{exact:true}).fill('Sway');await page.getByLabel('Page address',{exact:true}).fill('new-story');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.waitForURL('**/admin/posts/post-one');assert.equal(writes.at(-1).method,'POST');assert.equal('version' in writes.at(-1).body,false);
 await page.goto('http://localhost:3011/admin/content');await page.getByRole('button',{name:'Choose image',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);await page.getByRole('button',{name:'Choose image',exact:true}).click();await page.getByRole('button',{name:'Use image',exact:true}).click();await page.getByRole('button',{name:'Save website content'}).click();await page.getByRole('status').filter({hasText:'Website content saved.'}).waitFor();assert.equal(writes.at(-1).body.value.hero_image,asset.url);assert.equal(writes.at(-1).body.value.hero_alt,asset.alt);assert.equal(writes.at(-1).body.version,0);
 await page.goto('http://localhost:3011/admin/events/morning-yoga');await page.getByLabel('Start date and time').fill('2026-11-02T10:30');await page.getByLabel('End date and time').fill('2026-11-02T11:30');await page.getByRole('button',{name:'Save event',exact:true}).click();await page.getByRole('status').filter({hasText:'Event saved.'}).waitFor();assert.equal(writes.at(-1).body.version,2);assert.equal('registration_count' in writes.at(-1).body,false);assert.equal(writes.at(-1).body.start_date,new Date('2026-11-02T10:30').toISOString());
 await page.getByLabel('Capacity',{exact:true}).fill('0');await page.getByRole('button',{name:'Save event',exact:true}).click();await page.getByRole('status').filter({hasText:'Event saved.'}).waitFor();assert.equal(writes.at(-1).body.capacity,0);
 const beforeInvalid=writes.length;await page.getByLabel('Capacity',{exact:true}).fill('2');await page.getByRole('button',{name:'Save event',exact:true}).click();await page.getByRole('alert').filter({hasText:'Capacity must cover existing registrations.'}).waitFor();assert.equal(writes.length,beforeInvalid);
 const navColors=await page.locator('.studio-nav a').first().evaluate(link=>({color:getComputedStyle(link).color,background:getComputedStyle(document.querySelector('.studio-sidebar')).backgroundColor}));
 function luminance(color){return color.match(/\d+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0)}
 const contrast=(luminance(navColors.color)+0.05)/(luminance(navColors.background)+0.05);assert.ok(contrast>=4.5,`Sidebar contrast ${contrast}`);console.log(`Sidebar contrast: ${contrast.toFixed(2)}:1`);
 await page.setViewportSize({width:360,height:800});
 for(const path of ['/admin','/admin/posts','/admin/posts/new','/admin/events','/admin/events/morning-yoga','/admin/content','/admin/media']){
  await page.goto('http://localhost:3011'+path);await page.locator('.studio-main').waitFor();await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`Overflow ${path}`);await page.screenshot({path:`/private/tmp/sway-admin-mobile-${path.split('/').filter(Boolean).join('-')}.png`,fullPage:true});
 }
 denySession=true;await page.goto('http://localhost:3011/admin');await page.getByRole('alert').filter({hasText:'Access denied.'}).waitFor();assert.equal(await page.locator('.studio-main').count(),0);
 await browser.close();console.log('PASS: desktop and 360px admin pages, post create/edit/version/error, content media, modal Escape, event dates, unlimited capacity, sidebar contrast, access gate, overflow.');
})().catch(error=>{console.error(error);process.exit(1)});
