import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const TARGET_IMAGES = [
  'logo-kibounoie.png',
  'photo-art-activity.jpg',
  'photo-creative-support-water.jpg',
  'photo-creative-support.jpg',
  'photo-daily-support.jpg',
  'photo-drum-activity.jpg',
  'photo-facility-entrance.jpg',
  'photo-facility-exterior.jpg',
  'photo-group-exercise.jpg',
  'photo-interaction-support.jpg',
  'photo-recreation.jpg'
];

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

test('Images: All 11 candidate assets have valid AVIF and WebP files with size reductions', () => {
  let origTotal = 0;
  let avifTotal = 0;
  let webpTotal = 0;

  for (const imgName of TARGET_IMAGES) {
    const parsed = path.parse(imgName);
    const origPath = path.join('public', 'images', imgName);
    const avifPath = path.join('public', 'images', `${parsed.name}.avif`);
    const webpPath = path.join('public', 'images', `${parsed.name}.webp`);

    assert.ok(fs.existsSync(origPath), `Original image ${origPath} must exist`);
    assert.ok(fs.existsSync(avifPath), `AVIF image ${avifPath} must exist`);
    assert.ok(fs.existsSync(webpPath), `WebP image ${webpPath} must exist`);

    const origStat = fs.statSync(origPath);
    const avifStat = fs.statSync(avifPath);
    const webpStat = fs.statSync(webpPath);

    assert.ok(origStat.size > 0, `${origPath} must not be 0 bytes`);
    assert.ok(avifStat.size > 0, `${avifPath} must not be 0 bytes`);
    assert.ok(webpStat.size > 0, `${webpPath} must not be 0 bytes`);

    // Verify AVIF magic header (ftyp)
    const avifBuf = Buffer.alloc(12);
    const avifFd = fs.openSync(avifPath, 'r');
    fs.readSync(avifFd, avifBuf, 0, 12, 0);
    fs.closeSync(avifFd);
    const avifHeader = avifBuf.toString('ascii', 4, 8);
    assert.strictEqual(avifHeader, 'ftyp', `${avifPath} must have ftyp box header`);

    // Verify WebP magic header (RIFF....WEBP)
    const webpBuf = Buffer.alloc(12);
    const webpFd = fs.openSync(webpPath, 'r');
    fs.readSync(webpFd, webpBuf, 0, 12, 0);
    fs.closeSync(webpFd);
    const riff = webpBuf.toString('ascii', 0, 4);
    const webp = webpBuf.toString('ascii', 8, 12);
    assert.strictEqual(riff, 'RIFF', `${webpPath} must start with RIFF`);
    assert.strictEqual(webp, 'WEBP', `${webpPath} must have WEBP magic`);

    assert.ok(avifStat.size < origStat.size, `${avifPath} must be smaller than ${origPath}`);
    assert.ok(webpStat.size < origStat.size, `${webpPath} must be smaller than ${origPath}`);

    origTotal += origStat.size;
    avifTotal += avifStat.size;
    webpTotal += webpStat.size;
  }

  const avifReductionPct = (1 - avifTotal / origTotal) * 100;
  const webpReductionPct = (1 - webpTotal / origTotal) * 100;

  assert.ok(avifReductionPct >= 35.0, `AVIF reduction must be >= 35%, got ${avifReductionPct.toFixed(2)}%`);
  assert.ok(webpReductionPct >= 20.0, `WebP reduction must be >= 20%, got ${webpReductionPct.toFixed(2)}%`);
});

test('Images: HTML picture element structure and source ordering', () => {
  for (const filename of HTML_FILES) {
    const filePath = path.join('public', filename);
    const html = fs.readFileSync(filePath, 'utf8');

    // Find all <picture>...</picture> blocks
    const pictureBlocks = html.match(/<picture>[\s\S]*?<\/picture>/g) || [];
    assert.ok(pictureBlocks.length > 0, `${filename} must contain picture elements`);

    for (const block of pictureBlocks) {
      // Must contain AVIF source first
      const avifMatch = block.match(/<source\s+srcset="([^"]+\.avif)"\s+type="image\/avif">/);
      const webpMatch = block.match(/<source\s+srcset="([^"]+\.webp)"\s+type="image\/webp">/);
      const imgMatch = block.match(/<img\s+[^>]*?src="([^"]+)"[^>]*?>/);

      assert.ok(avifMatch, `Picture block missing AVIF source: ${block}`);
      assert.ok(webpMatch, `Picture block missing WebP source: ${block}`);
      assert.ok(imgMatch, `Picture block missing img fallback: ${block}`);

      const avifPos = block.indexOf(avifMatch[0]);
      const webpPos = block.indexOf(webpMatch[0]);
      const imgPos = block.indexOf(imgMatch[0]);

      assert.ok(avifPos < webpPos, `AVIF source must appear before WebP source: ${block}`);
      assert.ok(webpPos < imgPos, `WebP source must appear before img fallback: ${block}`);

      // Verify referenced files exist
      const avifFile = path.join('public', avifMatch[1]);
      const webpFile = path.join('public', webpMatch[1]);
      const imgFile = path.join('public', imgMatch[1]);

      assert.ok(fs.existsSync(avifFile), `Referenced AVIF ${avifFile} must exist`);
      assert.ok(fs.existsSync(webpFile), `Referenced WebP ${webpFile} must exist`);
      assert.ok(fs.existsSync(imgFile), `Referenced img fallback ${imgFile} must exist`);

      // Fallback img must have alt attribute
      assert.ok(imgMatch[0].includes('alt="'), `img fallback must retain alt attribute: ${imgMatch[0]}`);
    }
  }
});

test('Images: Priority loading, lazy loading, and social fallback preservation', () => {
  const indexHtml = fs.readFileSync('public/index.html', 'utf8');

  // LCP Hero Image on index.html
  assert.ok(
    indexHtml.includes('fetchpriority="high"'),
    'index.html hero LCP image must have fetchpriority="high"'
  );
  assert.ok(
    indexHtml.includes('loading="eager"'),
    'index.html hero LCP image must have loading="eager"'
  );

  // Social metadata & JSON-LD must keep JPEG/PNG fallbacks
  for (const filename of HTML_FILES) {
    const filePath = path.join('public', filename);
    const html = fs.readFileSync(filePath, 'utf8');

    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
    assert.ok(ogImageMatch);
    assert.ok(
      ogImageMatch[1].endsWith('.jpg') || ogImageMatch[1].endsWith('.png'),
      `${filename} OGP image must use jpg/png fallback`
    );

    const twImageMatch = html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/);
    assert.ok(twImageMatch);
    assert.ok(
      twImageMatch[1].endsWith('.jpg') || twImageMatch[1].endsWith('.png'),
      `${filename} Twitter image must use jpg/png fallback`
    );

    const jsonLdMatch = html.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(jsonLdMatch);
    const jsonLd = JSON.parse(jsonLdMatch[1]);
    const business = jsonLd['@graph'].find(i => i['@type'] === 'LocalBusiness');
    assert.ok(business.image.endsWith('.jpg') || business.image.endsWith('.png'));
    assert.ok(business.logo.endsWith('.png'));
  }
});
