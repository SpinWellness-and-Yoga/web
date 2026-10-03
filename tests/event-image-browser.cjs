const { chromium } = require('../../frontend/node_modules/@playwright/test');
const { build } = require('esbuild');
const assert = require('node:assert/strict');
(async()=>{
 await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import EventImage from './app/events/_components/EventImage'; createRoot(document.getElementById('root')).render(<><EventImage url="http://localhost:3011/brand/sway-wordmark.png" name="Morning yoga" hero/><div style={{maxWidth:500}}><EventImage url="http://localhost:3011/brand/sway-wordmark.png" name="Morning yoga card"/></div><EventImage name="No image"/></>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,jsx:'automatic',platform:'browser',outfile:'/private/tmp/sway-event-image-qa.js',loader:{'.module.css':'local-css'},define:{'process.env.NODE_ENV':'"production"'},banner:{js:'var process={env:{}};'}});
 const browser=await chromium.launch({headless:true});const page=await browser.newPage();
 for(const width of [1440,360]){
  await page.setViewportSize({width,height:900});await page.setContent('<style>body{margin:20px;background:#f8f6ef}*{box-sizing:border-box}</style><div id="root"></div>');await page.addStyleTag({path:'/private/tmp/sway-event-image-qa.css'});await page.addScriptTag({path:'/private/tmp/sway-event-image-qa.js'});
  await page.getByRole('img',{name:'Morning yoga',exact:true}).waitFor();await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));
  assert.equal(await page.getByRole('img').count(),2);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  for(const name of ['Morning yoga','Morning yoga card'])assert.equal(await page.getByRole('img',{name,exact:true}).evaluate(image=>getComputedStyle(image).objectFit),'cover');
  await page.screenshot({path:`/private/tmp/sway-event-images-${width}.png`,fullPage:true});
 }
 await browser.close();console.log('PASS: responsive public event images load, crop, retain alt text, omit missing image, and fit 1440px/360px.');
})().catch(error=>{console.error(error);process.exit(1)});
