import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

test('Security Headers: public/_headers exists and parses correctly', () => {
  assert.ok(fs.existsSync('public/_headers'), 'public/_headers must exist');
  const content = fs.readFileSync('public/_headers', 'utf8');

  // Verify /* rule block
  assert.ok(content.includes('/*'), 'Must contain /* rule');

  const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && l !== '/*');
  
  // Verify line lengths < 2000 characters (Cloudflare limit)
  for (const line of lines) {
    assert.ok(line.length < 2000, `Header line exceeds 2000 characters: ${line.slice(0, 50)}...`);
  }

  const headers = {};
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    assert.ok(colonIdx > 0, `Invalid header line format: ${line}`);
    const name = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();
    assert.strictEqual(headers[name], undefined, `Duplicate header defined: ${name}`);
    headers[name] = value;
  }

  // Verify mandatory security headers
  assert.strictEqual(headers['x-content-type-options'], 'nosniff');
  assert.strictEqual(headers['x-frame-options'], 'DENY');
  assert.strictEqual(headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.strictEqual(headers['x-permitted-cross-domain-policies'], 'none');
  assert.ok(headers['permissions-policy'], 'Permissions-Policy must be defined');
  assert.ok(headers['content-security-policy'], 'Content-Security-Policy must be defined');

  // Ensure HSTS is not duplicated (handled by Cloudflare TLS configuration)
  assert.strictEqual(headers['strict-transport-security'], undefined, 'Strict-Transport-Security must not be duplicated in _headers');
});

test('Security Headers: Permissions-Policy disables unused sensitive features', () => {
  const content = fs.readFileSync('public/_headers', 'utf8');
  const match = content.match(/Permissions-Policy:\s*([^\r\n]+)/i);
  assert.ok(match, 'Permissions-Policy header must exist');
  const policy = match[1];

  assert.ok(policy.includes('camera=()'), 'camera must be disabled');
  assert.ok(policy.includes('microphone=()'), 'microphone must be disabled');
  assert.ok(policy.includes('geolocation=()'), 'geolocation must be disabled');
  assert.ok(policy.includes('payment=()'), 'payment must be disabled');
  assert.ok(policy.includes('usb=()'), 'usb must be disabled');
});

test('Security Headers: Content-Security-Policy directives and source whitelist integrity', () => {
  const content = fs.readFileSync('public/_headers', 'utf8');
  const match = content.match(/Content-Security-Policy:\s*([^\r\n]+)/i);
  assert.ok(match, 'Content-Security-Policy header must exist');
  const csp = match[1];

  // Parse directives
  const directives = {};
  const parts = csp.split(';').map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    const tokens = part.split(/\s+/);
    const directiveName = tokens[0];
    const directiveValues = tokens.slice(1);
    directives[directiveName] = directiveValues;
  }

  // Required strict baseline directives
  assert.deepStrictEqual(directives['default-src'], ["'self'"]);
  assert.deepStrictEqual(directives['base-uri'], ["'self'"]);
  assert.deepStrictEqual(directives['object-src'], ["'none'"]);
  assert.deepStrictEqual(directives['frame-ancestors'], ["'none'"]);
  assert.deepStrictEqual(directives['form-action'], ["'self'"]);
  assert.ok('upgrade-insecure-requests' in directives, 'Must have upgrade-insecure-requests');

  // Script security
  assert.ok(directives['script-src'], 'script-src must be defined');
  assert.ok(directives['script-src'].includes("'self'"));
  assert.ok(directives['script-src'].includes('https://challenges.cloudflare.com'), 'script-src must allow Turnstile');
  assert.ok(directives['script-src'].includes('https://static.cloudflareinsights.com'), 'script-src must allow Cloudflare Analytics');
  assert.strictEqual(directives['script-src'].includes("'unsafe-inline'"), false, "script-src must NOT include 'unsafe-inline'");
  assert.strictEqual(directives['script-src'].includes("'unsafe-eval'"), false, "script-src must NOT include 'unsafe-eval'");

  // Style security
  assert.ok(directives['style-src']);
  assert.ok(directives['style-src'].includes("'self'"));
  assert.ok(directives['style-src'].includes("'unsafe-inline'"));
  assert.ok(directives['style-src'].includes('https://fonts.googleapis.com'));

  // Font security
  assert.ok(directives['font-src']);
  assert.ok(directives['font-src'].includes("'self'"));
  assert.ok(directives['font-src'].includes('https://fonts.gstatic.com'));
  assert.ok(directives['font-src'].includes('data:'));

  // Frame security (Google Maps & Turnstile)
  assert.ok(directives['frame-src']);
  assert.ok(directives['frame-src'].includes('https://challenges.cloudflare.com'));
  assert.ok(directives['frame-src'].includes('https://maps.google.com') || directives['frame-src'].includes('https://www.google.com'));

  // Connect security
  assert.ok(directives['connect-src']);
  assert.ok(directives['connect-src'].includes("'self'"));
  assert.ok(directives['connect-src'].includes('https://challenges.cloudflare.com'));
  assert.ok(directives['connect-src'].includes('https://cloudflareinsights.com'));

  // Workers.dev should not be whitelisted
  assert.strictEqual(csp.includes('workers.dev'), false, 'workers.dev must not be whitelisted in CSP');
});
