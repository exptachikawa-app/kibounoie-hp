import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert';
import worker from '../src/index.js';

let gasMockAction = 'ok';
let gasCallCount = 0;
let capturedGasPayload = null;

const VALID_SECRET = 'test-secret-signing-key-32bytes!';
const VALID_GAS_URL = 'https://script.google.com/macros/s/AKfycbxyz/exec';
const VALID_TURNSTILE_SECRET = 'test-turnstile-secret';

const defaultEnv = {
  TURNSTILE_SECRET_KEY: VALID_TURNSTILE_SECRET,
  APPS_SCRIPT_SIGNING_SECRET: VALID_SECRET,
  APPS_SCRIPT_WEBHOOK_URL: VALID_GAS_URL,
  ALLOWED_ORIGINS: 'http://127.0.0.1:8787, http://localhost:8787',
  ASSETS: {
    fetch: async (req) => new Response('Mocked ASSETS', { status: 200 })
  }
};

const defaultData = {
  name: '山田 太郎🍎',
  email: 'test@example.com',
  tel: '090-1234-5678',
  category: '見学について',
  message: '見学を希望します。\nよろしくお願いします。',
  consent: true,
  'cf-turnstile-response': 'valid-token',
  submissionId: '123e4567-e89b-42d3-a456-426614174000',
  receivedAt: '2010-01-01T00:00:00.000Z'
};

const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (url.includes('siteverify')) {
    const body = new URLSearchParams(options.body);
    const token = body.get('response');
    if (token === 'valid-token') return new Response(JSON.stringify({ success: true, action: 'contact', hostname: '127.0.0.1' }));
    if (token === 'valid-token-pages') return new Response(JSON.stringify({ success: true, action: 'contact', hostname: 'kibounoie-hp.pages.dev' }));
    if (token === 'valid-token-custom') return new Response(JSON.stringify({ success: true, action: 'contact', hostname: 'custom-domain.jp' }));
    if (token === 'action-mismatch') return new Response(JSON.stringify({ success: true, action: 'login', hostname: '127.0.0.1' }));
    if (token === 'action-missing') return new Response(JSON.stringify({ success: true, hostname: '127.0.0.1' }));
    if (token === 'hostname-mismatch') return new Response(JSON.stringify({ success: true, action: 'contact', hostname: 'evil.com' }));
    if (token === 'hostname-missing') return new Response(JSON.stringify({ success: true, action: 'contact' }));
    if (token === 'http-500') return new Response('Internal Error', { status: 500 });
    if (token === 'invalid-json') return new Response('invalid json', { status: 200 });
    if (token === 'network-err') throw new Error('Turnstile Network Failure');
    if (token === 'timeout') {
      const err = new Error('Turnstile Timeout');
      err.name = 'AbortError';
      throw err;
    }
    return new Response(JSON.stringify({ success: false }));
  }

  if (url.includes('script.google.com')) {
    gasCallCount++;
    try {
      capturedGasPayload = JSON.parse(options.body);
    } catch(e) {}
    
    if (gasMockAction === 'http-500') return new Response('Internal Error', { status: 500 });
    if (gasMockAction === 'invalid-json') return new Response('not json', { status: 200 });
    if (gasMockAction === 'ok-false') return new Response(JSON.stringify({ ok: false, code: 'SOME_ERROR' }));
    if (gasMockAction === 'req-mismatch') return new Response(JSON.stringify({ ok: true, requestId: 'different-id' }));
    if (gasMockAction === 'idempotency-conflict') return new Response(JSON.stringify({ ok: false, code: 'IDEMPOTENCY_CONFLICT' }));
    if (gasMockAction === 'timeout') {
      const err = new Error('GAS Timeout');
      err.name = 'AbortError';
      throw err;
    }
    if (gasMockAction === 'network-err') throw new Error('GAS Network Error');
    
    return new Response(JSON.stringify({ ok: true, requestId: capturedGasPayload?.requestId }));
  }
  return new Response('Not Found', { status: 404 });
};

beforeEach(() => {
  gasMockAction = 'ok';
  gasCallCount = 0;
  capturedGasPayload = null;
});

after(() => {
  globalThis.fetch = originalFetch;
});

function createRequest(method, path, body = null, headers = {}) {
  const url = "http://localhost:8787" + path;
  const opts = { method, headers: new Headers(headers) };
  if (body !== null) {
    opts.body = body;
    if (!opts.headers.has('Content-Type')) opts.headers.set('Content-Type', 'application/json');
  }
  if (!opts.headers.has('Origin') && !headers.hasOwnProperty('Origin')) {
    opts.headers.set('Origin', 'http://127.0.0.1:8787');
  }
  return new Request(url, opts);
}

test('Routing: ASSETS fallback for static files', async () => {
  let req = createRequest('GET', '/index.html');
  let res = await worker.fetch(req, defaultEnv, {});
  assert.strictEqual(res.status, 200);
});

test('Routing: ASSETS binding missing causes 404', async () => {
  let req = createRequest('GET', '/index.html');
  let res = await worker.fetch(req, { ...defaultEnv, ASSETS: null }, {});
  assert.strictEqual(res.status, 404);
});

test('Routing: Unknown /api/* causes 404', async () => {
  let req = createRequest('POST', '/api/unknown');
  let res = await worker.fetch(req, defaultEnv, {});
  assert.strictEqual(res.status, 404);
});

test('Routing: GET /api/contact causes 405', async () => {
  let req = createRequest('GET', '/api/contact');
  let res = await worker.fetch(req, defaultEnv, {});
  assert.strictEqual(res.status, 405);
});

test('Routing: OPTIONS CORS preflight validation', async () => {
  // Disallowed Origin -> 403
  let reqDisallowed = createRequest('OPTIONS', '/api/contact', null, {
    Origin: 'https://evil.com',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type'
  });
  let resDisallowed = await worker.fetch(reqDisallowed, defaultEnv, {});
  assert.strictEqual(resDisallowed.status, 403);

  // Missing Origin -> 403
  let reqNoOrigin = createRequest('OPTIONS', '/api/contact', null, {
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type'
  });
  let resNoOrigin = await worker.fetch(reqNoOrigin, defaultEnv, {});
  assert.strictEqual(resNoOrigin.status, 403);

  // Missing Access-Control-Request-Method -> 400
  let reqNoMethod = createRequest('OPTIONS', '/api/contact', null, {
    Origin: 'http://127.0.0.1:8787',
    'Access-Control-Request-Headers': 'Content-Type'
  });
  let resNoMethod = await worker.fetch(reqNoMethod, defaultEnv, {});
  assert.strictEqual(resNoMethod.status, 400);

  // Invalid Method (GET) -> 400
  let reqGetMethod = createRequest('OPTIONS', '/api/contact', null, {
    Origin: 'http://127.0.0.1:8787',
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'Content-Type'
  });
  let resGetMethod = await worker.fetch(reqGetMethod, defaultEnv, {});
  assert.strictEqual(resGetMethod.status, 400);

  // Missing Access-Control-Request-Headers -> 400
  let reqNoHeaders = createRequest('OPTIONS', '/api/contact', null, {
    Origin: 'http://127.0.0.1:8787',
    'Access-Control-Request-Method': 'POST'
  });
  let resNoHeaders = await worker.fetch(reqNoHeaders, defaultEnv, {});
  assert.strictEqual(resNoHeaders.status, 400);

  // Empty Access-Control-Request-Headers -> 400
  let reqEmptyHeaders = createRequest('OPTIONS', '/api/contact', null, {
    Origin: 'http://127.0.0.1:8787',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': '   '
  });
  let resEmptyHeaders = await worker.fetch(reqEmptyHeaders, defaultEnv, {});
  assert.strictEqual(resEmptyHeaders.status, 400);

  // Invalid Headers (Authorization) -> 400
  let reqAuthHeader = createRequest('OPTIONS', '/api/contact', null, {
    Origin: 'http://127.0.0.1:8787',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Authorization'
  });
  let resAuthHeader = await worker.fetch(reqAuthHeader, defaultEnv, {});
  assert.strictEqual(resAuthHeader.status, 400);

  // Extra Header (Content-Type, Authorization) -> 400
  let reqExtraHeader = createRequest('OPTIONS', '/api/contact', null, {
    Origin: 'http://127.0.0.1:8787',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type, Authorization'
  });
  let resExtraHeader = await worker.fetch(reqExtraHeader, defaultEnv, {});
  assert.strictEqual(resExtraHeader.status, 400);

  // Duplicate Header (Content-Type, Content-Type) -> 400
  let reqDupHeader = createRequest('OPTIONS', '/api/contact', null, {
    Origin: 'http://127.0.0.1:8787',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type, Content-Type'
  });
  let resDupHeader = await worker.fetch(reqDupHeader, defaultEnv, {});
  assert.strictEqual(resDupHeader.status, 400);

  // Trailing Comma (Content-Type,) -> 400
  let reqTrailComma = createRequest('OPTIONS', '/api/contact', null, {
    Origin: 'http://127.0.0.1:8787',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type,'
  });
  let resTrailComma = await worker.fetch(reqTrailComma, defaultEnv, {});
  assert.strictEqual(resTrailComma.status, 400);

  // Leading Comma (,Content-Type) -> 400
  let reqLeadComma = createRequest('OPTIONS', '/api/contact', null, {
    Origin: 'http://127.0.0.1:8787',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': ',Content-Type'
  });
  let resLeadComma = await worker.fetch(reqLeadComma, defaultEnv, {});
  assert.strictEqual(resLeadComma.status, 400);

  // Valid preflight (with standard Content-Type) -> 204
  let reqValid1 = createRequest('OPTIONS', '/api/contact', null, {
    Origin: 'http://127.0.0.1:8787',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type'
  });
  let resValid1 = await worker.fetch(reqValid1, defaultEnv, {});
  assert.strictEqual(resValid1.status, 204);
  assert.strictEqual(resValid1.headers.get('Access-Control-Allow-Origin'), 'http://127.0.0.1:8787');
  assert.strictEqual(resValid1.headers.get('Vary'), 'Origin');
  assert.strictEqual(resValid1.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');

  // Valid preflight (with lower case content-type) -> 204
  let reqValid2 = createRequest('OPTIONS', '/api/contact', null, {
    Origin: 'http://127.0.0.1:8787',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type'
  });
  let resValid2 = await worker.fetch(reqValid2, defaultEnv, {});
  assert.strictEqual(resValid2.status, 204);

  // Valid preflight (with UPPER CASE CONTENT-TYPE) -> 204
  let reqValid3 = createRequest('OPTIONS', '/api/contact', null, {
    Origin: 'http://127.0.0.1:8787',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'CONTENT-TYPE'
  });
  let resValid3 = await worker.fetch(reqValid3, defaultEnv, {});
  assert.strictEqual(resValid3.status, 204);
});

test('Routing: POST /api/contact and /api/contact/ with query string', async () => {
  let req1 = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
  let res1 = await worker.fetch(req1, defaultEnv, {});
  assert.strictEqual(res1.status, 200);

  let req2 = createRequest('POST', '/api/contact/', JSON.stringify(defaultData));
  let res2 = await worker.fetch(req2, defaultEnv, {});
  assert.strictEqual(res2.status, 200);

  let req3 = createRequest('POST', '/api/contact?foo=bar', JSON.stringify(defaultData));
  let res3 = await worker.fetch(req3, defaultEnv, {});
  assert.strictEqual(res3.status, 200);
});

test('Config: Secret whitespace and length validation (Internal space, tab, LF, CR, full-width space, 31, 32, 64)', async () => {
  const badSecrets = [
    undefined,
    null,
    '',
    '   ',
    '1234567890123456 123456789012345', // internal space (32 chars)
    '1234567890123456\t123456789012345', // tab
    '1234567890123456\n123456789012345', // LF
    '1234567890123456\r123456789012345', // CR
    '1234567890123456\r\n12345678901234', // CRLF
    '1234567890123456\u3000123456789012345', // full-width space
    '1234567890123456789012345678901' // 31 chars
  ];

  for (const sec of badSecrets) {
    let req = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
    let res = await worker.fetch(req, { ...defaultEnv, APPS_SCRIPT_SIGNING_SECRET: sec }, {});
    assert.strictEqual(res.status, 500, `Failed to reject secret: ${sec}`);
  }

  // 32 chars exact (no whitespace) -> 200
  let req32 = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
  let res32 = await worker.fetch(req32, { ...defaultEnv, APPS_SCRIPT_SIGNING_SECRET: '12345678901234567890123456789012' }, {});
  assert.strictEqual(res32.status, 200);

  // 64 chars (no whitespace) -> 200
  let req64 = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
  let res64 = await worker.fetch(req64, { ...defaultEnv, APPS_SCRIPT_SIGNING_SECRET: '1234567890123456789012345678901212345678901234567890123456789012' }, {});
  assert.strictEqual(res64.status, 200);
});

test('Config: TURNSTILE_SECRET_KEY whitespace and empty validation', async () => {
  const badTurnstileSecrets = [
    undefined,
    null,
    '',
    '   ',
    ' test-turnstile-secret',
    'test-turnstile-secret ',
    'test turnstile-secret',
    'test\tturnstile-secret',
    'test\nturnstile-secret',
    'test\rturnstile-secret',
    'test\r\nturnstile-secret',
    '\u3000test-turnstile-secret'
  ];

  for (const sec of badTurnstileSecrets) {
    let req = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
    let res = await worker.fetch(req, { ...defaultEnv, TURNSTILE_SECRET_KEY: sec }, {});
    assert.strictEqual(res.status, 500, `Failed to reject Turnstile Secret: ${sec}`);
  }

  // Valid Turnstile Secret
  let reqValid = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
  let resValid = await worker.fetch(reqValid, { ...defaultEnv, TURNSTILE_SECRET_KEY: 'valid-turnstile-secret-key-123' }, {});
  assert.strictEqual(resValid.status, 200);
});

test('Config: ALLOWED_ORIGINS strict parsing and validation', async () => {
  const badOriginsConfig = [
    123,
    'http://evil.com', // Non-localhost HTTP
    'https://pages.dev/path', // has pathname
    'https://pages.dev?query=1', // has query
    'https://pages.dev#hash', // has hash
    'https://user:pass@pages.dev', // has auth
    'https://pages.dev\0nullbyte', // null byte
    'https://pages.dev\nnewline' // newline
  ];

  for (const cfg of badOriginsConfig) {
    let req = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
    let res = await worker.fetch(req, { ...defaultEnv, ALLOWED_ORIGINS: cfg }, {});
    assert.strictEqual(res.status, 500, `Failed to reject ALLOWED_ORIGINS: ${cfg}`);
  }

  // Valid ALLOWED_ORIGINS with localhost HTTP and HTTPS domains
  let reqValid = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, 'cf-turnstile-response': 'valid-token-custom' }), { Origin: 'https://custom-domain.jp' });
  let resValid = await worker.fetch(reqValid, { ...defaultEnv, ALLOWED_ORIGINS: 'https://custom-domain.jp, http://localhost:3000' }, {});
  assert.strictEqual(resValid.status, 200);
});

test('Config: GAS Webhook URL validation', async () => {
  let reqEmpty = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
  let resEmpty = await worker.fetch(reqEmpty, { ...defaultEnv, APPS_SCRIPT_WEBHOOK_URL: '' }, {});
  assert.strictEqual(resEmpty.status, 500);

  const badGasUrls = [
    'http://script.google.com/macros/s/AKfycbxyz/exec',
    'https://evil.com/macros/s/AKfycbxyz/exec',
    'https://user@script.google.com/macros/s/AKfycbxyz/exec',
    'https://user:pass@script.google.com/macros/s/AKfycbxyz/exec',
    'https://script.google.com:443/macros/s/AKfycbxyz/exec',
    'https://script.google.com:8443/macros/s/AKfycbxyz/exec',
    'https://script.google.com/macros/s/AKfycbxyz/exec?param=1',
    'https://script.google.com/macros/s/AKfycbxyz/exec#hash',
    'https://script.google.com/macros/s/AKfycbxyz/exec/',
    'https://script.google.com/macros/s/AKfycbxyz/exec/extra',
    'https://script.google.com/macros/s/AKfycbxyz/dev',
    'https://script.google.com/macros/s//exec',
    'not-a-valid-url'
  ];

  for (const url of badGasUrls) {
    let req = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
    let res = await worker.fetch(req, { ...defaultEnv, APPS_SCRIPT_WEBHOOK_URL: url }, {});
    assert.strictEqual(res.status, 500, `Failed to reject GAS URL: ${url}`);
  }
});

test('HTTP Input: Content-Type validation', async () => {
  let reqNoCt = createRequest('POST', '/api/contact', JSON.stringify(defaultData), { 'Content-Type': '' });
  let resNoCt = await worker.fetch(reqNoCt, defaultEnv, {});
  assert.strictEqual(resNoCt.status, 415);

  let reqFoo = createRequest('POST', '/api/contact', JSON.stringify(defaultData), { 'Content-Type': 'application/jsonfoo' });
  let resFoo = await worker.fetch(reqFoo, defaultEnv, {});
  assert.strictEqual(resFoo.status, 415);

  let reqText = createRequest('POST', '/api/contact', JSON.stringify(defaultData), { 'Content-Type': 'text/application/json' });
  let resText = await worker.fetch(reqText, defaultEnv, {});
  assert.strictEqual(resText.status, 415);

  let reqJson = createRequest('POST', '/api/contact', JSON.stringify(defaultData), { 'Content-Type': 'application/json' });
  let resJson = await worker.fetch(reqJson, defaultEnv, {});
  assert.strictEqual(resJson.status, 200);

  let reqCharset = createRequest('POST', '/api/contact', JSON.stringify(defaultData), { 'Content-Type': 'application/json; charset=utf-8' });
  let resCharset = await worker.fetch(reqCharset, defaultEnv, {});
  assert.strictEqual(resCharset.status, 200);
});

test('HTTP Input: Content-Length format validation (alphabetic, negative, decimal, plus, leading zero, non-safe integer, huge digits)', async () => {
  const encoder = new TextEncoder();
  const bodyBytes = encoder.encode(JSON.stringify(defaultData));

  // abc -> INVALID_CONTENT_LENGTH (400)
  let reqAbc = createRequest('POST', '/api/contact', bodyBytes, { 'content-length': 'abc' });
  let resAbc = await worker.fetch(reqAbc, defaultEnv, {});
  assert.strictEqual(resAbc.status, 400);
  assert.strictEqual((await resAbc.json()).code, 'INVALID_CONTENT_LENGTH');

  // -1 -> INVALID_CONTENT_LENGTH (400)
  let reqNeg = createRequest('POST', '/api/contact', bodyBytes, { 'content-length': '-1' });
  let resNeg = await worker.fetch(reqNeg, defaultEnv, {});
  assert.strictEqual(resNeg.status, 400);
  assert.strictEqual((await resNeg.json()).code, 'INVALID_CONTENT_LENGTH');

  // 1.5 -> INVALID_CONTENT_LENGTH (400)
  let reqDec = createRequest('POST', '/api/contact', bodyBytes, { 'content-length': '1.5' });
  let resDec = await worker.fetch(reqDec, defaultEnv, {});
  assert.strictEqual(resDec.status, 400);
  assert.strictEqual((await resDec.json()).code, 'INVALID_CONTENT_LENGTH');

  // +1 -> INVALID_CONTENT_LENGTH (400)
  let reqPlus = createRequest('POST', '/api/contact', bodyBytes, { 'content-length': '+1' });
  let resPlus = await worker.fetch(reqPlus, defaultEnv, {});
  assert.strictEqual(resPlus.status, 400);
  assert.strictEqual((await resPlus.json()).code, 'INVALID_CONTENT_LENGTH');

  // 01 (leading zero) -> INVALID_CONTENT_LENGTH (400)
  let reqLeadZero = createRequest('POST', '/api/contact', bodyBytes, { 'content-length': '01' });
  let resLeadZero = await worker.fetch(reqLeadZero, defaultEnv, {});
  assert.strictEqual(resLeadZero.status, 400);
  assert.strictEqual((await resLeadZero.json()).code, 'INVALID_CONTENT_LENGTH');

  // Infinity string -> INVALID_CONTENT_LENGTH (400)
  let reqInf = createRequest('POST', '/api/contact', bodyBytes, { 'content-length': 'Infinity' });
  let resInf = await worker.fetch(reqInf, defaultEnv, {});
  assert.strictEqual(resInf.status, 400);
  assert.strictEqual((await resInf.json()).code, 'INVALID_CONTENT_LENGTH');

  // MAX_SAFE_INTEGER (9007199254740991) -> PAYLOAD_TOO_LARGE (413)
  let reqMaxSafe = createRequest('POST', '/api/contact', bodyBytes, { 'content-length': '9007199254740991' });
  let resMaxSafe = await worker.fetch(reqMaxSafe, defaultEnv, {});
  assert.strictEqual(resMaxSafe.status, 413);

  // MAX_SAFE_INTEGER + 1 (9007199254740992) -> PAYLOAD_TOO_LARGE (413)
  let reqOverSafe = createRequest('POST', '/api/contact', bodyBytes, { 'content-length': '9007199254740992' });
  let resOverSafe = await worker.fetch(reqOverSafe, defaultEnv, {});
  assert.strictEqual(resOverSafe.status, 413);

  // 100+ digit huge number -> PAYLOAD_TOO_LARGE (413)
  let reqHuge = createRequest('POST', '/api/contact', bodyBytes, { 'content-length': '9'.repeat(100) });
  let resHuge = await worker.fetch(reqHuge, defaultEnv, {});
  assert.strictEqual(resHuge.status, 413);
});

test('HTTP Input: Content-Length & Streaming Body Size matching and edge cases', async () => {
  const encoder = new TextEncoder();
  const bodyBytes = encoder.encode(JSON.stringify(defaultData));
  const realByteLength = bodyBytes.byteLength;

  // Content-Length: 0 + empty body -> 400 INVALID_PAYLOAD (empty body rejected)
  let reqZeroEmpty = createRequest('POST', '/api/contact', new Uint8Array([]), { 'content-length': '0' });
  let resZeroEmpty = await worker.fetch(reqZeroEmpty, defaultEnv, {});
  assert.strictEqual(resZeroEmpty.status, 400);
  assert.strictEqual((await resZeroEmpty.json()).code, 'INVALID_PAYLOAD');

  // Content-Length: 0 + non-empty body -> 400 CONTENT_LENGTH_MISMATCH
  let reqZeroNonEmpty = createRequest('POST', '/api/contact', bodyBytes, { 'content-length': '0' });
  let resZeroNonEmpty = await worker.fetch(reqZeroNonEmpty, defaultEnv, {});
  assert.strictEqual(resZeroNonEmpty.status, 400);
  assert.strictEqual((await resZeroNonEmpty.json()).code, 'CONTENT_LENGTH_MISMATCH');

  // Declared 1, actual 500 bytes -> 400 CONTENT_LENGTH_MISMATCH
  let reqUnder = createRequest('POST', '/api/contact', bodyBytes, { 'content-length': '1' });
  let resUnder = await worker.fetch(reqUnder, defaultEnv, {});
  assert.strictEqual(resUnder.status, 400);
  assert.strictEqual((await resUnder.json()).code, 'CONTENT_LENGTH_MISMATCH');

  // Declared 500, actual 1 byte -> 400 CONTENT_LENGTH_MISMATCH
  let reqOver = createRequest('POST', '/api/contact', new Uint8Array([0x7B]), { 'content-length': '500' });
  let resOver = await worker.fetch(reqOver, defaultEnv, {});
  assert.strictEqual(resOver.status, 400);
  assert.strictEqual((await resOver.json()).code, 'CONTENT_LENGTH_MISMATCH');

  // Exact declared byteLength match -> 200
  let reqExact = createRequest('POST', '/api/contact', bodyBytes, { 'content-length': realByteLength.toString() });
  let resExact = await worker.fetch(reqExact, defaultEnv, {});
  assert.strictEqual(resExact.status, 200);

  // Multi-byte UTF-8 Japanese: character count vs byte length mismatch
  const mbData = JSON.stringify({ ...defaultData, name: '日本語テスト名前🍎' });
  const mbBytes = encoder.encode(mbData);
  assert.notStrictEqual(mbData.length, mbBytes.byteLength); // char count != byte count
  
  // Sent with string character length instead of byte count -> 400 CONTENT_LENGTH_MISMATCH
  let reqCharMismatch = createRequest('POST', '/api/contact', mbBytes, { 'content-length': mbData.length.toString() });
  let resCharMismatch = await worker.fetch(reqCharMismatch, defaultEnv, {});
  assert.strictEqual(resCharMismatch.status, 400);
  assert.strictEqual((await resCharMismatch.json()).code, 'CONTENT_LENGTH_MISMATCH');

  // Sent with actual byteLength -> 200
  let reqByteOk = createRequest('POST', '/api/contact', mbBytes, { 'content-length': mbBytes.byteLength.toString() });
  let resByteOk = await worker.fetch(reqByteOk, defaultEnv, {});
  assert.strictEqual(resByteOk.status, 200);

  // Explicit Emoji Byte Length Assert
  const emojiData = JSON.stringify({ ...defaultData, name: '🍎🌟🎉🚀' });
  const emojiBytes = encoder.encode(emojiData);
  assert.strictEqual(emojiBytes.byteLength > emojiData.length, true, 'Emoji byte length must exceed string character length');
  let reqEmoji = createRequest('POST', '/api/contact', emojiBytes, { 'content-length': emojiBytes.byteLength.toString() });
  let resEmoji = await worker.fetch(reqEmoji, defaultEnv, {});
  assert.strictEqual(resEmoji.status, 200);

  // Missing Content-Length header -> 200 (allowed)
  let reqNoCl = createRequest('POST', '/api/contact', mbBytes);
  let resNoCl = await worker.fetch(reqNoCl, defaultEnv, {});
  assert.strictEqual(resNoCl.status, 200);

  // Exceeds 10240 in header
  let reqTooLargeCl = createRequest('POST', '/api/contact', bodyBytes, { 'content-length': '10241' });
  let resTooLargeCl = await worker.fetch(reqTooLargeCl, defaultEnv, {});
  assert.strictEqual(resTooLargeCl.status, 413);

  // Exceeds 10240 in stream body without Content-Length header -> 413 PAYLOAD_TOO_LARGE
  const bigBytes = new Uint8Array(10250);
  let reqBigBody = createRequest('POST', '/api/contact', bigBytes);
  let resBigBody = await worker.fetch(reqBigBody, defaultEnv, {});
  assert.strictEqual(resBigBody.status, 413);

  // Exactly 10,240 bytes valid JSON padded -> 200
  const baseJson = JSON.stringify(defaultData);
  const padPrefix = ',"pad":"';
  const padSuffix = '"}';
  const prefixBytes = encoder.encode(baseJson.slice(0, -1) + padPrefix).byteLength;
  const suffixBytes = encoder.encode(padSuffix).byteLength;
  const repeatCount = 10240 - prefixBytes - suffixBytes;
  const exact10240Json = baseJson.slice(0, -1) + padPrefix + 'a'.repeat(repeatCount) + padSuffix;
  const exact10240Bytes = encoder.encode(exact10240Json);
  assert.strictEqual(exact10240Bytes.byteLength, 10240);

  let reqExact10240 = createRequest('POST', '/api/contact', exact10240Bytes, { 'content-length': '10240' });
  let resExact10240 = await worker.fetch(reqExact10240, defaultEnv, {});
  assert.strictEqual(resExact10240.status, 200);

  // Exactly 10,241 bytes -> 413 PAYLOAD_TOO_LARGE
  const exact10241Bytes = new Uint8Array(10241);
  let reqExact10241 = createRequest('POST', '/api/contact', exact10241Bytes);
  let resExact10241 = await worker.fetch(reqExact10241, defaultEnv, {});
  assert.strictEqual(resExact10241.status, 413);

  // ReadableStream error pathway
  const errorStream = new ReadableStream({
    start(controller) {
      controller.error(new Error('Simulated Stream Read Failure'));
    }
  });
  const reqStreamErr = new Request('http://localhost:8787/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:8787' },
    body: errorStream,
    duplex: 'half'
  });
  let resStreamErr = await worker.fetch(reqStreamErr, defaultEnv, {});
  assert.strictEqual(resStreamErr.status, 400);
});

test('HTTP Input: Fatal UTF-8 Decoding, Emojis, Invalid Bytes, Empty Body, UTF-8 BOM', async () => {
  // Normal Japanese & Emoji
  let reqEmoji = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, name: '山田 太郎🍎🌟' }));
  let resEmoji = await worker.fetch(reqEmoji, defaultEnv, {});
  assert.strictEqual(resEmoji.status, 200);

  // Invalid UTF-8 byte sequence
  const invalidUtf8Bytes = new Uint8Array([0x7B, 0x22, 0x6E, 0x61, 0x6D, 0x65, 0x22, 0x3A, 0x22, 0xFF, 0xFE, 0x22, 0x7D]);
  let reqInvalidBytes = createRequest('POST', '/api/contact', invalidUtf8Bytes);
  let resInvalidBytes = await worker.fetch(reqInvalidBytes, defaultEnv, {});
  assert.strictEqual(resInvalidBytes.status, 400);

  // Empty Body
  let reqEmpty = createRequest('POST', '/api/contact', new Uint8Array([]));
  let resEmpty = await worker.fetch(reqEmpty, defaultEnv, {});
  assert.strictEqual(resEmpty.status, 400);

  // UTF-8 BOM + valid JSON
  const bomJson = '\uFEFF' + JSON.stringify(defaultData);
  let reqBom = createRequest('POST', '/api/contact', bomJson);
  let resBom = await worker.fetch(reqBom, defaultEnv, {});
  assert.strictEqual(resBom.status, 200);
});

test('HTTP Input: JSON parsing edge cases', async () => {
  let reqBadJson = createRequest('POST', '/api/contact', '{ invalid json');
  let resBadJson = await worker.fetch(reqBadJson, defaultEnv, {});
  assert.strictEqual(resBadJson.status, 400);

  let reqArr = createRequest('POST', '/api/contact', '[]');
  let resArr = await worker.fetch(reqArr, defaultEnv, {});
  assert.strictEqual(resArr.status, 400);

  let reqNull = createRequest('POST', '/api/contact', 'null');
  let resNull = await worker.fetch(reqNull, defaultEnv, {});
  assert.strictEqual(resNull.status, 400);

  let reqPrimitive = createRequest('POST', '/api/contact', '"string-only"');
  let resPrimitive = await worker.fetch(reqPrimitive, defaultEnv, {});
  assert.strictEqual(resPrimitive.status, 400);
});

test('Fields: Control characters in name and email rejected on raw inputs before trim', async () => {
  // name with newline, CR, tab, NUL, DEL
  const badNames = [
    '山田\n太郎',
    '山田\r\n太郎',
    '山田\t太郎',
    '山田\x00太郎',
    '山田\x7F太郎',
    '\n山田 太郎', // leading newline must not be trimmed away
    '山田 太郎\r'
  ];

  for (const n of badNames) {
    let req = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, name: n }));
    let res = await worker.fetch(req, defaultEnv, {});
    assert.strictEqual(res.status, 400, `Failed to reject control character in name: ${n}`);
  }

  // email with newline, CR, tab, NUL
  const badEmails = [
    'test\ninjection@example.com',
    'test\rinjection@example.com',
    'test\tinjection@example.com',
    '\ntest@example.com', // leading newline
    'test@example.com\r'  // trailing CR
  ];

  for (const e of badEmails) {
    let req = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, email: e }));
    let res = await worker.fetch(req, defaultEnv, {});
    assert.strictEqual(res.status, 400, `Failed to reject control character in email: ${e}`);
  }
});

test('Fields: Field validation edge cases (length limits, category, consent, UUID)', async () => {
  // name missing or > 100
  let req1 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, name: '' }));
  let res1 = await worker.fetch(req1, defaultEnv, {});
  assert.strictEqual(res1.status, 400);

  let req2 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, name: 'a'.repeat(101) }));
  let res2 = await worker.fetch(req2, defaultEnv, {});
  assert.strictEqual(res2.status, 400);

  // email missing, > 254, format
  let req3 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, email: '' }));
  let res3 = await worker.fetch(req3, defaultEnv, {});
  assert.strictEqual(res3.status, 400);

  let req4 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, email: 'a'.repeat(250) + '@example.com' }));
  let res4 = await worker.fetch(req4, defaultEnv, {});
  assert.strictEqual(res4.status, 400);

  let req6 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, email: 'not-an-email' }));
  let res6 = await worker.fetch(req6, defaultEnv, {});
  assert.strictEqual(res6.status, 400);

  // tel > 30, control characters
  let req7 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, tel: '0'.repeat(31) }));
  let res7 = await worker.fetch(req7, defaultEnv, {});
  assert.strictEqual(res7.status, 400);

  let req8 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, tel: '090-1234\x005678' }));
  let res8 = await worker.fetch(req8, defaultEnv, {});
  assert.strictEqual(res8.status, 400);

  // category invalid
  let req9 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, category: '不正なカテゴリ' }));
  let res9 = await worker.fetch(req9, defaultEnv, {});
  assert.strictEqual(res9.status, 400);

  // message missing or > 2000
  let req10 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, message: '' }));
  let res10 = await worker.fetch(req10, defaultEnv, {});
  assert.strictEqual(res10.status, 400);

  let req11 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, message: 'a'.repeat(2001) }));
  let res11 = await worker.fetch(req11, defaultEnv, {});
  assert.strictEqual(res11.status, 400);

  // consent missing or false
  let req12 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, consent: false }));
  let res12 = await worker.fetch(req12, defaultEnv, {});
  assert.strictEqual(res12.status, 400);

  // turnstileToken missing
  let req13 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, 'cf-turnstile-response': '' }));
  let res13 = await worker.fetch(req13, defaultEnv, {});
  assert.strictEqual(res13.status, 400);

  // submissionId missing, UUID v1, invalid UUID
  let req14 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, submissionId: '' }));
  let res14 = await worker.fetch(req14, defaultEnv, {});
  assert.strictEqual(res14.status, 400);

  let req15 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, submissionId: '123e4567-e89b-12d3-a456-426614174000' })); // v1
  let res15 = await worker.fetch(req15, defaultEnv, {});
  assert.strictEqual(res15.status, 400);

  let req16 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, submissionId: 'not-a-valid-uuid' }));
  let res16 = await worker.fetch(req16, defaultEnv, {});
  assert.strictEqual(res16.status, 400);
});

test('Turnstile: Verification scenarios', async () => {
  // success: false
  let req1 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, 'cf-turnstile-response': 'invalid-token' }));
  let res1 = await worker.fetch(req1, defaultEnv, {});
  assert.strictEqual(res1.status, 400);

  // action mismatch
  let req2 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, 'cf-turnstile-response': 'action-mismatch' }));
  let res2 = await worker.fetch(req2, defaultEnv, {});
  assert.strictEqual(res2.status, 400);

  // action missing
  let req3 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, 'cf-turnstile-response': 'action-missing' }));
  let res3 = await worker.fetch(req3, defaultEnv, {});
  assert.strictEqual(res3.status, 400);

  // hostname mismatch
  let req4 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, 'cf-turnstile-response': 'hostname-mismatch' }));
  let res4 = await worker.fetch(req4, defaultEnv, {});
  assert.strictEqual(res4.status, 400);

  // hostname missing
  let req5 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, 'cf-turnstile-response': 'hostname-missing' }));
  let res5 = await worker.fetch(req5, defaultEnv, {});
  assert.strictEqual(res5.status, 400);

  // HTTP non-200
  let req6 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, 'cf-turnstile-response': 'http-500' }));
  let res6 = await worker.fetch(req6, defaultEnv, {});
  assert.strictEqual(res6.status, 500);

  // invalid JSON
  let req7 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, 'cf-turnstile-response': 'invalid-json' }));
  let res7 = await worker.fetch(req7, defaultEnv, {});
  assert.strictEqual(res7.status, 500);

  // network error
  let req8 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, 'cf-turnstile-response': 'network-err' }));
  let res8 = await worker.fetch(req8, defaultEnv, {});
  assert.strictEqual(res8.status, 500);

  // timeout
  let req9 = createRequest('POST', '/api/contact', JSON.stringify({ ...defaultData, 'cf-turnstile-response': 'timeout' }));
  let res9 = await worker.fetch(req9, defaultEnv, {});
  assert.strictEqual(res9.status, 500);
});

test('GAS Integration: Scenarios & error handling & unknown field filtering', async () => {
  // HTTP non-200
  gasMockAction = 'http-500';
  let req1 = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
  let res1 = await worker.fetch(req1, defaultEnv, {});
  assert.strictEqual(res1.status, 500);

  // Invalid JSON
  gasMockAction = 'invalid-json';
  let req2 = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
  let res2 = await worker.fetch(req2, defaultEnv, {});
  assert.strictEqual(res2.status, 500);

  // ok: false
  gasMockAction = 'ok-false';
  let req3 = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
  let res3 = await worker.fetch(req3, defaultEnv, {});
  assert.strictEqual(res3.status, 500);

  // requestId mismatch
  gasMockAction = 'req-mismatch';
  let req4 = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
  let res4 = await worker.fetch(req4, defaultEnv, {});
  assert.strictEqual(res4.status, 500);

  // IDEMPOTENCY_CONFLICT
  gasMockAction = 'idempotency-conflict';
  let req5 = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
  let res5 = await worker.fetch(req5, defaultEnv, {});
  assert.strictEqual(res5.status, 409);

  // timeout
  gasMockAction = 'timeout';
  let req6 = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
  let res6 = await worker.fetch(req6, defaultEnv, {});
  assert.strictEqual(res6.status, 500);

  // network error
  gasMockAction = 'network-err';
  let req7 = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
  let res7 = await worker.fetch(req7, defaultEnv, {});
  assert.strictEqual(res7.status, 500);

  // Client unknown field & __proto__ property is stripped and not forwarded to GAS
  gasMockAction = 'ok';
  const customInput = { ...defaultData, unexpectedClientField: 'hack' };
  Object.defineProperty(customInput, '__proto__', {
    value: 'evil',
    enumerable: true,
    configurable: true
  });
  const serializedInput = JSON.stringify(customInput);
  
  // Verify __proto__ was in the serialized input
  assert.strictEqual(Object.prototype.hasOwnProperty.call(JSON.parse(serializedInput), '__proto__'), true);

  let reqUnknown = createRequest('POST', '/api/contact', serializedInput);
  let resUnknown = await worker.fetch(reqUnknown, defaultEnv, {});
  assert.strictEqual(resUnknown.status, 200);
  
  // Strict assertion: Gas payload has ONLY the 7 allowed keys
  const expectedKeys = ['category', 'consent', 'email', 'message', 'name', 'receivedAt', 'tel'];
  assert.deepStrictEqual(Object.keys(capturedGasPayload.payload).sort(), expectedKeys.sort());
  assert.strictEqual(Object.prototype.hasOwnProperty.call(capturedGasPayload.payload, '__proto__'), false);
  assert.strictEqual(capturedGasPayload.payload.unexpectedClientField, undefined);

  // success response does NOT leak signature / hash / payload
  let req8 = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
  let res8 = await worker.fetch(req8, defaultEnv, {});
  assert.strictEqual(res8.status, 200);
  const resBody = await res8.json();
  assert.deepStrictEqual(Object.keys(resBody).sort(), ['ok', 'requestId'].sort());
  assert.strictEqual(resBody.ok, true);
  assert.strictEqual(resBody.requestId, defaultData.submissionId);
  assert.strictEqual(resBody.signature, undefined);
  assert.strictEqual(resBody.payload, undefined);
  assert.strictEqual(resBody.payloadHash, undefined);
});

test('Worker generated receivedAt vs Client provided', async () => {
  const OriginalDate = globalThis.Date;
  
  class MockDate extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) {
        super(1690000000000); 
      } else {
        super(...args);
      }
    }
    static now() {
      return 1690000000000;
    }
  }
  
  globalThis.Date = MockDate;
  try {
    let req = createRequest('POST', '/api/contact', JSON.stringify(defaultData));
    let res = await worker.fetch(req, defaultEnv, {});
    assert.strictEqual(res.status, 200);
    // capturedGasPayload.payload.receivedAt must be the mocked Date, NOT defaultData.receivedAt
    assert.strictEqual(capturedGasPayload.payload.receivedAt, '2023-07-22T04:26:40.000Z');
  } finally {
    globalThis.Date = OriginalDate;
  }
});

test('Fixed Vector Signature Matching Strict', async () => {
  const OriginalDate = globalThis.Date;
  
  class MockDate extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) {
        super(1690000000000); 
      } else {
        super(...args);
      }
    }
    static now() {
      return 1690000000000;
    }
  }
  
  globalThis.Date = MockDate;
  
  try {
    const data = { ...defaultData, submissionId: '123e4567-e89b-42d3-a456-426614174000' };
    let req = createRequest('POST', '/api/contact', JSON.stringify(data));
    let res = await worker.fetch(req, defaultEnv, {});
    assert.strictEqual(res.status, 200);
    
    // Expected signature computed with test-secret-signing-key-32bytes!
    assert.strictEqual(capturedGasPayload.signature, 'e09baf7891b70b0e98cfb45b8ef51b40359ae36148b91cf9a82a3f1f4babb2a5');
  } finally {
    globalThis.Date = OriginalDate;
  }
});
