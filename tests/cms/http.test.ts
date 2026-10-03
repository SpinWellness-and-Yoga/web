import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSameOrigin, CmsError, handle, json, readJson } from '../../lib/cms/http';
import { inspectImage } from '../../lib/cms/media';
import { contentSchemas, imageUrl, postSchema } from '../../lib/cms/validation';
const origin = 'https://website.example.invalid';
test('Same-origin writes reject missing, untrusted, and unset origins', () => {
  const previous = process.env.CMS_SITE_URL;
  try {
    process.env.CMS_SITE_URL = origin;
    assert.throws(() => assertSameOrigin(new Request(origin)), CmsError);
    assert.throws(() => assertSameOrigin(new Request(origin, { headers: { origin:'https://other.example.invalid' } })), CmsError);
    assert.doesNotThrow(() => assertSameOrigin(new Request(origin, { headers: { origin } })));
    delete process.env.CMS_SITE_URL;
    assert.throws(() => assertSameOrigin(new Request(origin, { headers: { origin } })), CmsError);
  } finally { if (previous) process.env.CMS_SITE_URL=previous; else delete process.env.CMS_SITE_URL; }
});
test('JSON parser bounds streamed bodies and rejects invalid input', async () => {
  const request = (body: string) => new Request(origin, { method:'POST',headers:{'content-type':'application/json'},body });
  assert.deepEqual(await readJson(request('{"value":1}')), { value:1 });
  await assert.rejects(readJson(request('{')), /invalid/);
  await assert.rejects(readJson(request('x'.repeat(150001))), /too large/);
  await assert.rejects(readJson(new Request(origin,{method:'POST',body:'{}'})), /JSON/);
});
test('API errors never disclose internal failure details', async () => {
  const response = await handle(async () => { throw new Error('private database detail'); });
  assert.equal(response.status,503);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.ok(!(await response.text()).includes('private database detail'));
  assert.equal(json({saved:true}).status,200);
});
test('Media checks reject SVG, mismatched MIME, invalid dimensions, and oversized files', () => {
  assert.throws(() => inspectImage(new TextEncoder().encode('<svg></svg>'),'image/svg+xml'), CmsError);
  const png1x1 = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));
  const jpg1x1 = new Uint8Array(Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAALCAABAAEBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/9oACAEBAAA/AL8A/9k=', 'base64'));
  const webp1x1 = new Uint8Array(Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAD8D+JaQAA3AA/ua1AAA=', 'base64'));
  assert.equal(inspectImage(png1x1, 'image/png'), 'png');
  assert.equal(inspectImage(jpg1x1, 'image/jpeg'), 'jpg');
  assert.equal(inspectImage(webp1x1, 'image/webp'), 'webp');
  assert.throws(() => inspectImage(png1x1, 'image/jpeg'), CmsError);
  assert.throws(() => inspectImage(new Uint8Array(5242881), 'image/png'), CmsError);
  for (const [bytes, mime] of [[png1x1, 'image/png'], [jpg1x1, 'image/jpeg'], [webp1x1, 'image/webp']] as const) {
    assert.throws(() => inspectImage(bytes.slice(0, bytes.length - 4), mime), CmsError);
  }
  const headerOnly = png1x1.slice(0, 24);
  assert.throws(() => inspectImage(headerOnly, 'image/png'), CmsError);
  const corrupted = png1x1.slice(); corrupted[45] ^= 1;
  assert.throws(() => inspectImage(corrupted, 'image/png'), CmsError);
  const missingJpegScan = new Uint8Array([...jpg1x1.slice(0, 180), 255, 217]);
  assert.throws(() => inspectImage(missingJpegScan, 'image/jpeg'), CmsError);
  const missingWebpData = webp1x1.slice(0, 30);
  new DataView(missingWebpData.buffer).setUint32(4, missingWebpData.length - 8, true);
  assert.throws(() => inspectImage(missingWebpData, 'image/webp'), CmsError);
  // reject a truncated header without dimensions.
  assert.throws(() => inspectImage(new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]), 'image/png'), CmsError);
});
test('Image URLs and content require safe schemes and descriptive alt text', () => {
  assert.equal(imageUrl.safeParse('javascript:alert(1)').success,false);
  assert.equal(imageUrl.safeParse('//remote.example.invalid/image').success,false);
  assert.equal(contentSchemas.homepage.safeParse({heading:'Hello',introduction:'Welcome',hero_image:'/image.png',hero_alt:''}).success,false);
  assert.equal(postSchema.safeParse({slug:'UPPERCASE'}).success,false);
});
