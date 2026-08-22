import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const HTML_FILES = [
  'index.html',
  'about.html',
  'service.html',
  'facility.html',
  'guide.html',
  'activities.html',
  'faq.html',
  'access.html',
  'contact.html',
  'privacy.html'
];

test('SEO: Exact 10 HTML pages exist in public/', () => {
  const files = fs.readdirSync('public').filter(f => f.endsWith('.html'));
  assert.strictEqual(files.length, 10, 'public/ must contain exactly 10 HTML files');
  assert.deepStrictEqual(files.sort(), HTML_FILES.slice().sort());
});

test('SEO: OGP & Twitter Card metadata across all 10 HTML pages', () => {
  const ogpImagesFound = new Set();

  for (const filename of HTML_FILES) {
    const filePath = path.join('public', filename);
    const html = fs.readFileSync(filePath, 'utf8');

    // Canonical check
    const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
    assert.ok(canonicalMatch, `${filename} must have a canonical tag`);
    const canonicalUrl = canonicalMatch[1];
    assert.ok(canonicalUrl.startsWith('https://kibounoie-akiruno.org'), `${filename} canonical must be HTTPS non-www`);

    // OGP properties
    const ogLocale = html.match(/<meta\s+property="og:locale"\s+content="([^"]+)"/);
    assert.ok(ogLocale, `${filename} must have og:locale`);
    assert.strictEqual(ogLocale[1], 'ja_JP');

    const ogType = html.match(/<meta\s+property="og:type"\s+content="([^"]+)"/);
    assert.ok(ogType, `${filename} must have og:type`);
    assert.strictEqual(ogType[1], 'website');

    const ogSiteName = html.match(/<meta\s+property="og:site_name"\s+content="([^"]+)"/);
    assert.ok(ogSiteName, `${filename} must have og:site_name`);
    assert.strictEqual(ogSiteName[1], '生活介護 希望の家');

    const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
    assert.ok(ogTitle, `${filename} must have og:title`);
    assert.ok(ogTitle[1].length > 0);

    const ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/);
    assert.ok(ogDesc, `${filename} must have og:description`);
    assert.ok(ogDesc[1].length > 0);

    const ogUrl = html.match(/<meta\s+property="og:url"\s+content="([^"]+)"/);
    assert.ok(ogUrl, `${filename} must have og:url`);
    assert.strictEqual(ogUrl[1], canonicalUrl, `${filename} og:url must match canonical URL`);

    const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
    assert.ok(ogImage, `${filename} must have og:image`);
    assert.ok(ogImage[1].startsWith('https://kibounoie-akiruno.org/images/'), `${filename} og:image must be absolute HTTPS`);
    
    // Verify local referenced file exists
    const relImagePath = ogImage[1].replace('https://kibounoie-akiruno.org/', 'public/');
    assert.ok(fs.existsSync(relImagePath), `Referenced OGP image ${relImagePath} must exist`);
    ogpImagesFound.add(relImagePath);

    const ogWidth = html.match(/<meta\s+property="og:image:width"\s+content="([^"]+)"/);
    assert.ok(ogWidth, `${filename} must have og:image:width`);
    assert.strictEqual(ogWidth[1], '1200');

    const ogHeight = html.match(/<meta\s+property="og:image:height"\s+content="([^"]+)"/);
    assert.ok(ogHeight, `${filename} must have og:image:height`);
    assert.strictEqual(ogHeight[1], '630');

    const ogAlt = html.match(/<meta\s+property="og:image:alt"\s+content="([^"]+)"/);
    assert.ok(ogAlt, `${filename} must have og:image:alt`);

    // Twitter card properties
    const twCard = html.match(/<meta\s+name="twitter:card"\s+content="([^"]+)"/);
    assert.ok(twCard, `${filename} must have twitter:card`);
    assert.strictEqual(twCard[1], 'summary_large_image');

    const twTitle = html.match(/<meta\s+name="twitter:title"\s+content="([^"]+)"/);
    assert.ok(twTitle, `${filename} must have twitter:title`);
    assert.strictEqual(twTitle[1], ogTitle[1]);

    const twDesc = html.match(/<meta\s+name="twitter:description"\s+content="([^"]+)"/);
    assert.ok(twDesc, `${filename} must have twitter:description`);
    assert.strictEqual(twDesc[1], ogDesc[1]);

    const twImage = html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/);
    assert.ok(twImage, `${filename} must have twitter:image`);
    assert.strictEqual(twImage[1], ogImage[1]);

    const twAlt = html.match(/<meta\s+name="twitter:image:alt"\s+content="([^"]+)"/);
    assert.ok(twAlt, `${filename} must have twitter:image:alt`);
    assert.strictEqual(twAlt[1], ogAlt[1]);
  }

  assert.ok(ogpImagesFound.size > 0, 'Must have found verified OGP images');
});

test('SEO: JSON-LD structured data is valid, byte-for-byte identical, and matches CSP hash', () => {
  let firstJsonLdRaw = null;

  for (const filename of HTML_FILES) {
    const filePath = path.join('public', filename);
    const html = fs.readFileSync(filePath, 'utf8');

    const match = html.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(match, `${filename} must contain JSON-LD script tag`);
    const jsonLdRaw = match[1];

    if (firstJsonLdRaw === null) {
      firstJsonLdRaw = jsonLdRaw;
    } else {
      assert.strictEqual(jsonLdRaw, firstJsonLdRaw, `${filename} JSON-LD content must be byte-for-byte identical to index.html`);
    }

    // Verify JSON validity
    const data = JSON.parse(jsonLdRaw);
    assert.strictEqual(data['@context'], 'https://schema.org');
    assert.ok(Array.isArray(data['@graph']), '@graph must be an array');

    const org = data['@graph'].find(item => item['@type'] === 'Organization');
    assert.ok(org, 'Organization must be present in @graph');
    assert.strictEqual(org['name'], '社会福祉法人SHIP');
    assert.strictEqual(org['url'], 'https://www.swsc-ship.com/');
    assert.deepStrictEqual(org['sameAs'], ['https://x.com/swscship']);

    const business = data['@graph'].find(item => item['@type'] === 'LocalBusiness');
    assert.ok(business, 'LocalBusiness must be present in @graph');
    assert.strictEqual(business['name'], '生活介護 希望の家');
    assert.strictEqual(business['telephone'], '042-595-2324');
    assert.strictEqual(business['url'], 'https://kibounoie-akiruno.org/');
    assert.strictEqual(business['address']['postalCode'], '190-0164');
    assert.strictEqual(business['address']['addressRegion'], '東京都');
    assert.strictEqual(business['address']['addressLocality'], 'あきる野市');
    assert.strictEqual(business['address']['streetAddress'], '五日市374-5');
    assert.strictEqual(business['address']['addressCountry'], 'JP');

    assert.ok(Array.isArray(business['openingHoursSpecification']));
    const hours = business['openingHoursSpecification'][0];
    assert.strictEqual(hours['opens'], '10:00');
    assert.strictEqual(hours['closes'], '16:00');
  }

  // Calculate SHA-256 hash of JSON-LD content
  const hash = crypto.createHash('sha256').update(firstJsonLdRaw, 'utf8').digest('base64');
  const expectedHashToken = `'sha256-${hash}'`;

  // Verify hash is configured in public/_headers
  const headersContent = fs.readFileSync('public/_headers', 'utf8');
  assert.ok(headersContent.includes(expectedHashToken), `public/_headers must contain CSP hash ${expectedHashToken}`);
});
