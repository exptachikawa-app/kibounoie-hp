import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const GITHUB_PAGES_HOST = 'utility-s.github.io';
const PROD_HOST = 'https://kibounoie-akiruno.org';

test('Deployment Surfaces: Documentation reflects Cloudflare Workers and not GitHub Pages', () => {
  assert.ok(fs.existsSync('README.md'), 'README.md must exist');
  assert.ok(fs.existsSync('SETUP.md'), 'SETUP.md must exist');

  const readme = fs.readFileSync('README.md', 'utf8');
  const setup = fs.readFileSync('SETUP.md', 'utf8');

  // Verify production domain
  assert.ok(readme.includes(PROD_HOST), 'README.md must contain official production URL');
  assert.ok(setup.includes(PROD_HOST), 'SETUP.md must contain official production URL');

  // Verify Cloudflare Workers Static Assets references
  assert.ok(readme.includes('Cloudflare Workers Static Assets'), 'README.md must reference Cloudflare Workers Static Assets');
  assert.ok(setup.includes('Cloudflare Workers Static Assets'), 'SETUP.md must reference Cloudflare Workers Static Assets');

  // Verify Cloudflare Workers Builds references
  assert.ok(readme.includes('Cloudflare Workers Builds'), 'README.md must describe automated Cloudflare Workers Builds');
  assert.ok(setup.includes('Cloudflare Workers Builds'), 'SETUP.md must describe automated Cloudflare Workers Builds');

  // Verify no stale claims that GitHub Pages is hosting production
  assert.strictEqual(
    /GitHub Pagesで(?:静的に)?ホスティング/i.test(readme),
    false,
    'README.md must not state that GitHub Pages is hosting the site'
  );
  assert.strictEqual(
    readme.includes(GITHUB_PAGES_HOST),
    false,
    'README.md must not contain GitHub Pages domain'
  );
});

test('Deployment Surfaces: Repository configuration and workflows prevent GitHub Pages publishing', () => {
  // Ensure no CNAME file in repo root or public/
  assert.strictEqual(fs.existsSync('CNAME'), false, 'Root CNAME file must not exist');
  assert.strictEqual(fs.existsSync('public/CNAME'), false, 'public/CNAME file must not exist');

  // Check .github/workflows for any Pages deployment workflows
  if (fs.existsSync('.github/workflows')) {
    const workflows = fs.readdirSync('.github/workflows');
    for (const wf of workflows) {
      const content = fs.readFileSync(path.join('.github/workflows', wf), 'utf8');
      assert.strictEqual(
        content.includes('actions/deploy-pages') || content.includes('peaceiris/actions-gh-pages'),
        false,
        `${wf} must not contain GitHub Pages deploy actions`
      );
    }
  }
});

test('Deployment Surfaces: Public HTML and SEO assets strictly use production domain', () => {
  const publicFiles = fs.readdirSync('public');

  for (const file of publicFiles) {
    if (file.endsWith('.html')) {
      const content = fs.readFileSync(path.join('public', file), 'utf8');
      assert.strictEqual(
        content.includes(GITHUB_PAGES_HOST),
        false,
        `public/${file} must not contain ${GITHUB_PAGES_HOST}`
      );
      assert.strictEqual(
        content.includes('workers.dev'),
        false,
        `public/${file} must not contain workers.dev`
      );
    }
  }

  // sitemap.xml
  const sitemap = fs.readFileSync('public/sitemap.xml', 'utf8');
  assert.strictEqual(sitemap.includes(GITHUB_PAGES_HOST), false, 'sitemap.xml must not contain GitHub Pages');
  assert.strictEqual(sitemap.includes('workers.dev'), false, 'sitemap.xml must not contain workers.dev');

  // robots.txt
  const robots = fs.readFileSync('public/robots.txt', 'utf8');
  assert.strictEqual(robots.includes(GITHUB_PAGES_HOST), false, 'robots.txt must not contain GitHub Pages');
  assert.strictEqual(robots.includes('workers.dev'), false, 'robots.txt must not contain workers.dev');
});
