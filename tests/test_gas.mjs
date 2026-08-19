import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';

const VALID_SECRET = 'test-secret-signing-key-32bytes!';
let currentSecret = VALID_SECRET;

let cacheStore = {};
let cacheGetThrow = false;
let cachePutThrow = false;
let cacheGetThrowCount = 0;
let cachePutThrowCount = 0;
let cachePutCallCount = 0;

let lockAcquired = true;
let lockTryThrow = false;
let lockReleaseThrow = false;
let tryLockCallCount = 0;
let releaseLockCallCount = 0;

let mailAttemptCount = 0;
let mailSuccessCount = 0;
let mailArgs = null;
let quota = 100;
let mailThrow = false;

function setupDefaultMocks() {
  currentSecret = VALID_SECRET;
  cacheStore = {};
  cacheGetThrow = false;
  cachePutThrow = false;
  cacheGetThrowCount = 0;
  cachePutThrowCount = 0;
  cachePutCallCount = 0;

  lockAcquired = true;
  lockTryThrow = false;
  lockReleaseThrow = false;
  tryLockCallCount = 0;
  releaseLockCallCount = 0;

  mailAttemptCount = 0;
  mailSuccessCount = 0;
  mailArgs = null;
  quota = 100;
  mailThrow = false;

  globalThis.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (key) => key === 'APPS_SCRIPT_SIGNING_SECRET' ? currentSecret : null
    })
  };

  globalThis.ContentService = {
    MimeType: { JSON: 'JSON' },
    createTextOutput: (text) => ({
      text: text,
      setMimeType: function(type) { this.mimeType = type; return this; }
    })
  };

  globalThis.Utilities = {
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    MacAlgorithm: { HMAC_SHA_256: 'HMAC_SHA_256' },
    Charset: { UTF_8: 'UTF_8' },
    computeDigest: (algo, value, charset) => {
      const hash = crypto.createHash('sha256').update(value, 'utf8').digest();
      return Array.from(hash).map(b => b > 127 ? b - 256 : b);
    },
    computeHmacSignature: (algo, value, key, charset) => {
      const hmac = crypto.createHmac('sha256', key).update(value, 'utf8').digest();
      return Array.from(hmac).map(b => b > 127 ? b - 256 : b);
    }
  };

  globalThis.CacheService = {
    getScriptCache: () => ({
      get: (key) => {
        if (cacheGetThrow) {
          cacheGetThrowCount++;
          throw new Error('CacheService get error');
        }
        return cacheStore[key] || null;
      },
      put: (key, val, time) => {
        cachePutCallCount++;
        if (cachePutThrow) {
          cachePutThrowCount++;
          throw new Error('CacheService put error');
        }
        cacheStore[key] = val;
      }
    })
  };

  globalThis.LockService = {
    getScriptLock: () => ({
      tryLock: (time) => {
        tryLockCallCount++;
        if (lockTryThrow) throw new Error('LockService tryLock exception');
        return lockAcquired;
      },
      releaseLock: () => {
        releaseLockCallCount++;
        if (lockReleaseThrow) throw new Error('LockService releaseLock exception');
      }
    })
  };

  globalThis.MailApp = {
    getRemainingDailyQuota: () => quota,
    sendEmail: (args) => {
      mailAttemptCount++;
      if (mailThrow) throw new Error('MailApp sending failure');
      mailSuccessCount++;
      mailArgs = args;
    }
  };
}

// Load Code.gs into runtime
setupDefaultMocks();
const codeGs = fs.readFileSync('./google-apps-script/Code.gs', 'utf8');
const fn = new Function(codeGs + '\nglobalThis.doPost = doPost;');
fn();

function createGasEvent(payloadModifications = {}, mainModifications = {}, signingSecret = VALID_SECRET) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const requestId = "123e4567-e89b-42d3-a456-426614174000";
  
  const payload = {
    name: "山田 太郎",
    email: "test@example.com",
    tel: "090-1234-5678",
    category: "見学について",
    message: "テストメッセージ",
    consent: true,
    receivedAt: new Date().toISOString(),
    ...payloadModifications
  };
  
  const canonicalPayloadJson = JSON.stringify(payload);
  const payloadHashHex = crypto.createHash('sha256').update(canonicalPayloadJson, 'utf8').digest('hex');
  const signatureTarget = "1\n" + timestamp + "\n" + requestId + "\n" + payloadHashHex;
  const signatureHex = crypto.createHmac('sha256', signingSecret).update(signatureTarget, 'utf8').digest('hex');

  const mainObj = {
    version: "1",
    timestamp,
    requestId,
    payload,
    signature: signatureHex,
    ...mainModifications
  };

  return {
    postData: {
      contents: JSON.stringify(mainObj)
    }
  };
}

test('GAS: Initial valid submission succeeds and sends email', () => {
  setupDefaultMocks();
  const ev = createGasEvent();
  const res = doPost(ev);
  const data = JSON.parse(res.text);
  assert.strictEqual(data.ok, true);
  assert.strictEqual(mailAttemptCount, 1);
  assert.strictEqual(mailSuccessCount, 1);
  assert.strictEqual(tryLockCallCount, 1);
  assert.strictEqual(releaseLockCallCount, 1);
  assert.strictEqual(cachePutCallCount, 1);
});

test('GAS: Duplicate submission with same payload (different receivedAt) returns DUPLICATE_ACK without sending mail', () => {
  setupDefaultMocks();
  const ev1 = createGasEvent();
  doPost(ev1);
  assert.strictEqual(mailSuccessCount, 1);

  // Send again with different receivedAt
  const ev2 = createGasEvent({ receivedAt: new Date(Date.now() + 1000).toISOString() });
  const res2 = doPost(ev2);
  const data2 = JSON.parse(res2.text);
  assert.strictEqual(data2.ok, true);
  assert.strictEqual(data2.note, 'DUPLICATE_ACK');
  assert.strictEqual(mailSuccessCount, 1); // No new mail
  assert.strictEqual(mailAttemptCount, 1);
});

test('GAS: Duplicate requestId with different user input returns IDEMPOTENCY_CONFLICT without sending mail', () => {
  setupDefaultMocks();
  const ev1 = createGasEvent();
  doPost(ev1);
  assert.strictEqual(mailSuccessCount, 1);

  // Send again with different message
  const ev2 = createGasEvent({ message: "違うメッセージ" });
  const res2 = doPost(ev2);
  const data2 = JSON.parse(res2.text);
  assert.strictEqual(data2.ok, false);
  assert.strictEqual(data2.code, 'IDEMPOTENCY_CONFLICT');
  assert.strictEqual(mailSuccessCount, 1); // No new mail
  assert.strictEqual(mailAttemptCount, 1);
});

test('GAS: Secret whitespace and length validation (Internal space, tab, LF, CR, full-width space, 31, 32, 64)', () => {
  const badSecrets = [
    null,
    undefined,
    '',
    '   ',
    '1234567890123456 123456789012345', // internal space
    '1234567890123456\t123456789012345', // tab
    '1234567890123456\n123456789012345', // LF
    '1234567890123456\r123456789012345', // CR
    '1234567890123456\u3000123456789012345', // full-width space
    '1234567890123456789012345678901' // 31 chars
  ];

  for (const sec of badSecrets) {
    setupDefaultMocks();
    currentSecret = sec;
    const ev = createGasEvent();
    const res = doPost(ev);
    const data = JSON.parse(res.text);
    assert.strictEqual(data.ok, false);
    assert.strictEqual(data.code, 'SERVER_CONFIG_ERROR', `Failed on secret: ${sec}`);
    assert.strictEqual(mailAttemptCount, 0);
  }

  // 32 chars exact -> 200
  setupDefaultMocks();
  currentSecret = '12345678901234567890123456789012';
  const ev32 = createGasEvent({}, {}, currentSecret);
  const res32 = doPost(ev32);
  assert.strictEqual(JSON.parse(res32.text).ok, true);
  assert.strictEqual(mailSuccessCount, 1);

  // 64 chars -> 200
  setupDefaultMocks();
  currentSecret = '1234567890123456789012345678901212345678901234567890123456789012';
  const ev64 = createGasEvent({}, {}, currentSecret);
  const res64 = doPost(ev64);
  assert.strictEqual(JSON.parse(res64.text).ok, true);
  assert.strictEqual(mailSuccessCount, 1);
});

test('GAS: Top-level schema table testing (unknown fields, __proto__, constructor, prototype, missing keys, array, null, primitives)', () => {
  const topCases = [
    { name: 'Unknown field', raw: '{"version":"1","timestamp":"1690000000","requestId":"123e4567-e89b-42d3-a456-426614174000","payload":{},"signature":"abc","extra":"unexpected"}' },
    { name: '__proto__ property', raw: '{"__proto__":"evil","version":"1","timestamp":"1690000000","requestId":"123e4567-e89b-42d3-a456-426614174000","payload":{},"signature":"abc"}' },
    { name: 'constructor property', raw: '{"constructor":"evil","version":"1","timestamp":"1690000000","requestId":"123e4567-e89b-42d3-a456-426614174000","payload":{},"signature":"abc"}' },
    { name: 'prototype property', raw: '{"prototype":"evil","version":"1","timestamp":"1690000000","requestId":"123e4567-e89b-42d3-a456-426614174000","payload":{},"signature":"abc"}' },
    { name: 'Missing version', raw: '{"timestamp":"1690000000","requestId":"123e4567-e89b-42d3-a456-426614174000","payload":{},"signature":"abc"}' },
    { name: 'Missing timestamp', raw: '{"version":"1","requestId":"123e4567-e89b-42d3-a456-426614174000","payload":{},"signature":"abc"}' },
    { name: 'Missing requestId', raw: '{"version":"1","timestamp":"1690000000","payload":{},"signature":"abc"}' },
    { name: 'Missing payload', raw: '{"version":"1","timestamp":"1690000000","requestId":"123e4567-e89b-42d3-a456-426614174000","signature":"abc"}' },
    { name: 'Missing signature', raw: '{"version":"1","timestamp":"1690000000","requestId":"123e4567-e89b-42d3-a456-426614174000","payload":{}}' },
    { name: 'Array top-level', raw: '[]' },
    { name: 'Null top-level', raw: 'null' },
    { name: 'String primitive', raw: '"string-only"' },
    { name: 'Number primitive', raw: '12345' },
    { name: 'Boolean primitive', raw: 'true' }
  ];

  for (const tc of topCases) {
    setupDefaultMocks();
    assert.doesNotThrow(() => JSON.parse(tc.raw), `Raw JSON must be valid in test: ${tc.name}`);
    const res = doPost({ postData: { contents: tc.raw } });
    const data = JSON.parse(res.text);
    assert.strictEqual(data.ok, false, `Failed on: ${tc.name}`);
    assert.strictEqual(data.code, 'INVALID_REQUEST', `Failed code on: ${tc.name}`);
    assert.strictEqual(mailAttemptCount, 0, `Mail attempted on: ${tc.name}`);
  }
});

test('GAS: Payload schema table testing (prototype pollution, extra field, missing fields, type variants)', () => {
  const basePayload = {
    name: "山田 太郎",
    email: "test@example.com",
    tel: "090-1234-5678",
    category: "見学について",
    message: "テストメッセージ",
    consent: true,
    receivedAt: new Date().toISOString()
  };

  const payloadCases = [
    { name: '__proto__ in payload', makeRaw: () => '{"__proto__":"evil",' + JSON.stringify(basePayload).slice(1) },
    { name: 'constructor in payload', makeRaw: () => '{"constructor":"evil",' + JSON.stringify(basePayload).slice(1) },
    { name: 'prototype in payload', makeRaw: () => '{"prototype":"evil",' + JSON.stringify(basePayload).slice(1) },
    { name: 'Unknown extraField', makeRaw: () => JSON.stringify({ ...basePayload, extraField: 'bad' }) },
    { name: 'Missing name', makeRaw: () => { let p = { ...basePayload }; delete p.name; return JSON.stringify(p); } },
    { name: 'Missing email', makeRaw: () => { let p = { ...basePayload }; delete p.email; return JSON.stringify(p); } },
    { name: 'Missing tel', makeRaw: () => { let p = { ...basePayload }; delete p.tel; return JSON.stringify(p); } },
    { name: 'Missing category', makeRaw: () => { let p = { ...basePayload }; delete p.category; return JSON.stringify(p); } },
    { name: 'Missing message', makeRaw: () => { let p = { ...basePayload }; delete p.message; return JSON.stringify(p); } },
    { name: 'Missing consent', makeRaw: () => { let p = { ...basePayload }; delete p.consent; return JSON.stringify(p); } },
    { name: 'Missing receivedAt', makeRaw: () => { let p = { ...basePayload }; delete p.receivedAt; return JSON.stringify(p); } },
    { name: 'Array payload', makeRaw: () => '[]' },
    { name: 'Null payload', makeRaw: () => 'null' },
    { name: 'String payload', makeRaw: () => '"string-payload"' },
    { name: 'Number payload', makeRaw: () => '123' },
    { name: 'Boolean payload', makeRaw: () => 'true' }
  ];

  for (const pc of payloadCases) {
    setupDefaultMocks();
    const payloadRaw = pc.makeRaw();
    const topObjRaw = '{"version":"1","timestamp":"' + Math.floor(Date.now()/1000) + '","requestId":"123e4567-e89b-42d3-a456-426614174000","payload":' + payloadRaw + ',"signature":"1234567890123456789012345678901212345678901234567890123456789012"}';
    const res = doPost({ postData: { contents: topObjRaw } });
    const data = JSON.parse(res.text);
    assert.strictEqual(data.ok, false, `Failed on: ${pc.name}`);
    assert.strictEqual(data.code, 'INVALID_PAYLOAD', `Failed code on: ${pc.name}`);
    assert.strictEqual(mailAttemptCount, 0, `Mail attempted on: ${pc.name}`);
  }
});

test('GAS: Invalid version rejects', () => {
  setupDefaultMocks();
  const ev = createGasEvent({}, { version: "2" });
  const res = doPost(ev);
  const data = JSON.parse(res.text);
  assert.strictEqual(data.ok, false);
  assert.strictEqual(data.code, 'INVALID_VERSION');
  assert.strictEqual(mailAttemptCount, 0);
});

test('GAS: Invalid timestamp cases reject', () => {
  const badTimestamps = [
    '1690000000abc',
    'NaN',
    'Infinity',
    '-1690000000',
    '1690000000.5',
    '',
    1690000000,
    null
  ];

  for (const ts of badTimestamps) {
    setupDefaultMocks();
    const ev = createGasEvent({}, { timestamp: ts });
    const res = doPost(ev);
    const data = JSON.parse(res.text);
    assert.strictEqual(data.ok, false);
    assert.strictEqual(data.code, 'INVALID_TIMESTAMP');
    assert.strictEqual(mailAttemptCount, 0);
  }
});

test('GAS: Expired timestamp rejects even with valid signature', () => {
  setupDefaultMocks();
  const oldTimestamp = Math.floor(Date.now() / 1000 - 400).toString();
  const requestId = "123e4567-e89b-42d3-a456-426614174000";
  const payload = {
    name: "山田 太郎",
    email: "test@example.com",
    tel: "090-1234-5678",
    category: "見学について",
    message: "テストメッセージ",
    consent: true,
    receivedAt: new Date().toISOString()
  };
  const canonicalPayloadJson = JSON.stringify(payload);
  const payloadHashHex = crypto.createHash('sha256').update(canonicalPayloadJson, 'utf8').digest('hex');
  const signatureTarget = "1\n" + oldTimestamp + "\n" + requestId + "\n" + payloadHashHex;
  const signatureHex = crypto.createHmac('sha256', VALID_SECRET).update(signatureTarget, 'utf8').digest('hex');

  const ev = {
    postData: {
      contents: JSON.stringify({
        version: "1",
        timestamp: oldTimestamp,
        requestId,
        payload,
        signature: signatureHex
      })
    }
  };

  const res = doPost(ev);
  const data = JSON.parse(res.text);
  assert.strictEqual(data.ok, false);
  assert.strictEqual(data.code, 'EXPIRED_TIMESTAMP');
  assert.strictEqual(mailAttemptCount, 0);
});

test('GAS: RequestId validation (UUID v1 rejected, UUID v4 accepted, invalid rejected)', () => {
  // UUID v1
  setupDefaultMocks();
  let ev1 = createGasEvent({}, { requestId: '123e4567-e89b-12d3-a456-426614174000' });
  let res1 = doPost(ev1);
  assert.strictEqual(JSON.parse(res1.text).code, 'INVALID_REQUEST_ID');
  assert.strictEqual(mailAttemptCount, 0);

  // Invalid string
  setupDefaultMocks();
  let ev2 = createGasEvent({}, { requestId: 'not-a-uuid' });
  let res2 = doPost(ev2);
  assert.strictEqual(JSON.parse(res2.text).code, 'INVALID_REQUEST_ID');
  assert.strictEqual(mailAttemptCount, 0);

  // UUID v4
  setupDefaultMocks();
  let ev3 = createGasEvent({}, { requestId: '123e4567-e89b-42d3-a456-426614174000' });
  let res3 = doPost(ev3);
  assert.strictEqual(JSON.parse(res3.text).ok, true);
  assert.strictEqual(mailSuccessCount, 1);
});

test('GAS: Payload defensive field value validation (control characters, length, formats)', () => {
  const badCases = [
    { mod: { name: '' }, code: 'INVALID_PAYLOAD' },
    { mod: { name: 'a'.repeat(101) }, code: 'INVALID_PAYLOAD' },
    { mod: { name: '   ' }, code: 'INVALID_PAYLOAD' },
    { mod: { name: '　' }, code: 'INVALID_PAYLOAD' },
    { mod: { name: '山田\n太郎' }, code: 'INVALID_PAYLOAD' },
    { mod: { name: '山田\r太郎' }, code: 'INVALID_PAYLOAD' },
    { mod: { name: '山田\t太郎' }, code: 'INVALID_PAYLOAD' },
    { mod: { name: '山田\x00太郎' }, code: 'INVALID_PAYLOAD' },
    { mod: { name: '山田\x7F太郎' }, code: 'INVALID_PAYLOAD' },
    { mod: { email: '' }, code: 'INVALID_PAYLOAD' },
    { mod: { email: '   ' }, code: 'INVALID_PAYLOAD' },
    { mod: { email: 'bad\nemail@test.com' }, code: 'INVALID_PAYLOAD' },
    { mod: { email: 'bad\remail@test.com' }, code: 'INVALID_PAYLOAD' },
    { mod: { email: 'bad\temail@test.com' }, code: 'INVALID_PAYLOAD' },
    { mod: { email: 'notanemail' }, code: 'INVALID_PAYLOAD' },
    { mod: { tel: '0'.repeat(31) }, code: 'INVALID_PAYLOAD' },
    { mod: { tel: '090-1234\x005678' }, code: 'INVALID_PAYLOAD' },
    { mod: { category: '存在しないカテゴリ' }, code: 'INVALID_PAYLOAD' },
    { mod: { message: '' }, code: 'INVALID_PAYLOAD' },
    { mod: { message: 'a'.repeat(2001) }, code: 'INVALID_PAYLOAD' },
    { mod: { consent: false }, code: 'INVALID_PAYLOAD' }
  ];

  for (const { mod, code } of badCases) {
    setupDefaultMocks();
    const ev = createGasEvent(mod);
    const res = doPost(ev);
    const data = JSON.parse(res.text);
    assert.strictEqual(data.ok, false);
    assert.strictEqual(data.code, code);
    assert.strictEqual(mailAttemptCount, 0);
  }

  // Valid name edge cases
  const validNameCases = [
    '山田 太郎',
    '山田 太郎🍎',
    'a'.repeat(100)
  ];

  for (const vName of validNameCases) {
    setupDefaultMocks();
    const ev = createGasEvent({ name: vName });
    const res = doPost(ev);
    const data = JSON.parse(res.text);
    assert.strictEqual(data.ok, true, `Valid name failed: ${vName}`);
    assert.strictEqual(mailSuccessCount, 1);
  }
});

test('GAS: receivedAt datetime validation & roundtrip checks', () => {
  const badReceivedAt = [
    '2026-13-01T00:00:00.000Z', // invalid month
    '2026-02-30T00:00:00.000Z', // invalid day
    '2025-02-29T00:00:00.000Z', // invalid leap day
    '2026-01-01T24:00:00.000Z', // invalid hour
    '2026-01-01T00:00:00Z',     // missing millis
    'invalid-date',
    '',
    null,
    '2020-01-01T00:00:00.000Z'  // way in the past (> 300s)
  ];

  for (const rAt of badReceivedAt) {
    setupDefaultMocks();
    const ev = createGasEvent({ receivedAt: rAt });
    const res = doPost(ev);
    const data = JSON.parse(res.text);
    assert.strictEqual(data.ok, false);
    assert.strictEqual(data.code, 'INVALID_PAYLOAD', `Failed on receivedAt: ${rAt}`);
    assert.strictEqual(mailAttemptCount, 0);
  }
});

test('GAS: Signature validation (bad format, 1-char changed signature, 1-char changed payload)', () => {
  // bad signature format (length != 64)
  setupDefaultMocks();
  let ev1 = createGasEvent({}, { signature: '1234' });
  let res1 = doPost(ev1);
  assert.strictEqual(JSON.parse(res1.text).code, 'INVALID_SIGNATURE');
  assert.strictEqual(mailAttemptCount, 0);

  // 1-char changed signature
  setupDefaultMocks();
  let ev2 = createGasEvent();
  let contentsObj = JSON.parse(ev2.postData.contents);
  contentsObj.signature = contentsObj.signature.slice(0, -1) + (contentsObj.signature.slice(-1) === 'a' ? 'b' : 'a');
  ev2.postData.contents = JSON.stringify(contentsObj);
  let res2 = doPost(ev2);
  assert.strictEqual(JSON.parse(res2.text).code, 'INVALID_SIGNATURE');
  assert.strictEqual(mailAttemptCount, 0);

  // 1-char changed payload without re-signing
  setupDefaultMocks();
  let ev3 = createGasEvent();
  let contentsObj3 = JSON.parse(ev3.postData.contents);
  contentsObj3.payload.name = '山田 太郎！';
  ev3.postData.contents = JSON.stringify(contentsObj3);
  let res3 = doPost(ev3);
  assert.strictEqual(JSON.parse(res3.text).code, 'INVALID_SIGNATURE');
  assert.strictEqual(mailAttemptCount, 0);
});

test('GAS: LockService failure pathways and exceptions with comprehensive counter assertions', () => {
  // 1. tryLock() returns false -> SYSTEM_BUSY
  setupDefaultMocks();
  lockAcquired = false;
  const ev1 = createGasEvent();
  const res1 = doPost(ev1);
  assert.strictEqual(JSON.parse(res1.text).code, 'SYSTEM_BUSY');
  assert.strictEqual(mailAttemptCount, 0);
  assert.strictEqual(mailSuccessCount, 0);
  assert.strictEqual(tryLockCallCount, 1);
  assert.strictEqual(releaseLockCallCount, 0); // Not called if lock not acquired!
  assert.strictEqual(cachePutCallCount, 0);

  // 2. tryLock() throws -> SYSTEM_BUSY
  setupDefaultMocks();
  lockTryThrow = true;
  const ev2 = createGasEvent();
  const res2 = doPost(ev2);
  assert.strictEqual(JSON.parse(res2.text).code, 'SYSTEM_BUSY');
  assert.strictEqual(mailAttemptCount, 0);
  assert.strictEqual(mailSuccessCount, 0);
  assert.strictEqual(tryLockCallCount, 1);
  assert.strictEqual(releaseLockCallCount, 0);
  assert.strictEqual(cachePutCallCount, 0);

  // 3. Lock acquired, but MailApp.sendEmail throws -> INTERNAL_ERROR, lock is released!
  setupDefaultMocks();
  mailThrow = true;
  const ev3 = createGasEvent();
  const res3 = doPost(ev3);
  assert.strictEqual(JSON.parse(res3.text).code, 'INTERNAL_ERROR');
  assert.strictEqual(mailAttemptCount, 1);
  assert.strictEqual(mailSuccessCount, 0); // Not successful!
  assert.strictEqual(tryLockCallCount, 1);
  assert.strictEqual(releaseLockCallCount, 1); // Lock successfully released in finally!
  assert.strictEqual(cachePutCallCount, 0); // Cache NOT written if mail failed!

  // 4. Lock acquired, releaseLock throws -> does not crash caller
  setupDefaultMocks();
  lockReleaseThrow = true;
  const ev4 = createGasEvent();
  const res4 = doPost(ev4);
  assert.strictEqual(JSON.parse(res4.text).ok, true);
  assert.strictEqual(mailAttemptCount, 1);
  assert.strictEqual(mailSuccessCount, 1);
  assert.strictEqual(cachePutCallCount, 1);
  assert.strictEqual(releaseLockCallCount, 1);

  // 5. Quota exceeded inside lock -> QUOTA_EXCEEDED, lock is released!
  setupDefaultMocks();
  quota = 0;
  const ev5 = createGasEvent();
  const res5 = doPost(ev5);
  assert.strictEqual(JSON.parse(res5.text).code, 'QUOTA_EXCEEDED');
  assert.strictEqual(mailAttemptCount, 0);
  assert.strictEqual(mailSuccessCount, 0);
  assert.strictEqual(tryLockCallCount, 1);
  assert.strictEqual(releaseLockCallCount, 1);
  assert.strictEqual(cachePutCallCount, 0);
});

test('GAS: Concurrency Double-Check in Lock - Same payload returns DUPLICATE_ACK without duplicate mail', () => {
  setupDefaultMocks();
  
  let getCallCount = 0;
  const ev = createGasEvent();
  const payload = JSON.parse(ev.postData.contents).payload;
  const userPayload = {
    name: payload.name,
    email: payload.email,
    tel: payload.tel,
    category: payload.category,
    message: payload.message,
    consent: payload.consent
  };
  const sameIdemHash = crypto.createHash('sha256').update(JSON.stringify(userPayload), 'utf8').digest('hex');

  globalThis.CacheService = {
    getScriptCache: () => ({
      get: (key) => {
        getCallCount++;
        if (getCallCount === 1) return null; // 1st check before lock passes
        return sameIdemHash; // 2nd check inside lock hits same hash!
      },
      put: (key, val, time) => { cachePutCallCount++; }
    })
  };

  const res = doPost(ev);
  const data = JSON.parse(res.text);
  assert.strictEqual(data.ok, true);
  assert.strictEqual(data.note, 'DUPLICATE_ACK');
  assert.strictEqual(mailAttemptCount, 0); // Mail NOT attempted!
  assert.strictEqual(mailSuccessCount, 0);
  assert.strictEqual(cachePutCallCount, 0); // Cache NOT overwritten!
  assert.strictEqual(tryLockCallCount, 1);
  assert.strictEqual(releaseLockCallCount, 1); // Lock released!
});

test('GAS: Concurrency Double-Check in Lock - Different payload returns IDEMPOTENCY_CONFLICT without mail', () => {
  setupDefaultMocks();
  
  let getCallCount = 0;
  const ev = createGasEvent();
  const differentIdemHash = '1111111111111111111111111111111111111111111111111111111111111111';

  globalThis.CacheService = {
    getScriptCache: () => ({
      get: (key) => {
        getCallCount++;
        if (getCallCount === 1) return null; // 1st check before lock passes
        return differentIdemHash; // 2nd check inside lock hits conflicting hash!
      },
      put: (key, val, time) => { cachePutCallCount++; }
    })
  };

  const res = doPost(ev);
  const data = JSON.parse(res.text);
  assert.strictEqual(data.ok, false);
  assert.strictEqual(data.code, 'IDEMPOTENCY_CONFLICT');
  assert.strictEqual(mailAttemptCount, 0); // Mail NOT attempted!
  assert.strictEqual(mailSuccessCount, 0);
  assert.strictEqual(cachePutCallCount, 0); // Cache NOT overwritten!
  assert.strictEqual(tryLockCallCount, 1);
  assert.strictEqual(releaseLockCallCount, 1); // Lock released!
});

test('GAS: CacheService exception handling with verified throw assertion counts', () => {
  // CacheService get throws -> handles gracefully and still proceeds
  setupDefaultMocks();
  cacheGetThrow = true;
  const ev1 = createGasEvent();
  const res1 = doPost(ev1);
  assert.strictEqual(JSON.parse(res1.text).ok, true);
  assert.strictEqual(mailAttemptCount, 1);
  assert.strictEqual(mailSuccessCount, 1);
  assert.strictEqual(cacheGetThrowCount, 2); // 1st check before lock + 2nd check inside lock both threw and were caught!

  // CacheService put throws -> email sent, best-effort completes
  setupDefaultMocks();
  cachePutThrow = true;
  const ev2 = createGasEvent();
  const res2 = doPost(ev2);
  assert.strictEqual(JSON.parse(res2.text).ok, true);
  assert.strictEqual(mailAttemptCount, 1);
  assert.strictEqual(mailSuccessCount, 1);
  assert.strictEqual(cachePutThrowCount, 1); // cache.put threw once and was caught in best-effort try/catch!
});

test('GAS: Fixed Vector Signature calculation matches Worker exactly', () => {
  setupDefaultMocks();
  
  const payloadObj = {
    name: "山田 太郎🍎",
    email: "test@example.com",
    tel: "090-1234-5678",
    category: "見学について",
    message: "見学を希望します。\nよろしくお願いします。",
    consent: true,
    receivedAt: "2023-07-22T04:26:40.000Z"
  };

  const canonicalPayloadJson = JSON.stringify(payloadObj);
  const payloadHashRaw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, canonicalPayloadJson, Utilities.Charset.UTF_8);
  const payloadHashHex = payloadHashRaw.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');

  const timestamp = "1690000000";
  const requestId = "123e4567-e89b-42d3-a456-426614174000";
  const signatureTarget = "1\n" + timestamp + "\n" + requestId + "\n" + payloadHashHex;
  
  const expectedSigRaw = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, signatureTarget, VALID_SECRET, Utilities.Charset.UTF_8);
  const expectedSigHex = expectedSigRaw.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');

  const workerExpectedHex = "e09baf7891b70b0e98cfb45b8ef51b40359ae36148b91cf9a82a3f1f4babb2a5";
  assert.strictEqual(expectedSigHex, workerExpectedHex);
});
