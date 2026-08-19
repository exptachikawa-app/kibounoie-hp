import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

// Helper class for mock form
class MockElement {
  constructor(id, tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
    this.dataset = {};
    this.style = {};
    this.disabled = false;
    this.textContent = '';
    this.action = '/api/contact';
    this.listeners = {};
    this.checked = false;
    this.value = '';
    this.name = { value: '山田 太郎' };
    this.email = { value: 'test@example.com' };
    this.tel = { value: '090-1234-5678' };
    this.category = { value: '見学について' };
    this.message = { value: '見学希望' };
    this.consent = { checked: true };
  }

  addEventListener(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  async dispatchEvent(eventObj) {
    if (this.listeners[eventObj.type]) {
      for (const h of this.listeners[eventObj.type]) {
        await h(eventObj);
      }
    }
  }

  reset() {
    this.dataset = {};
    this.value = '';
    this.dispatchEvent({ type: 'reset' });
  }

  focus() {}
}

class MockFormData {
  constructor(form) {
    this.data = {
      name: '山田 太郎',
      email: 'test@example.com',
      tel: '090-1234-5678',
      category: '見学について',
      message: '見学希望',
      consent: 'on',
      'cf-turnstile-response': globalThis._turnstileToken || 'token-123'
    };
  }
  get(key) {
    return this.data[key];
  }
}

function setupFrontendEnvironment() {
  const form = new MockElement('contact-form', 'form');
  const submitBtn = new MockElement('submitBtn', 'button');
  const errorMsg = new MockElement('form-error-message', 'div');
  const successMsg = new MockElement('form-success-message', 'div');

  const elements = {
    'contact-form': form,
    'submitBtn': submitBtn,
    'form-error-message': errorMsg,
    'form-success-message': successMsg
  };

  const docListeners = {};
  globalThis.document = {
    getElementById: (id) => elements[id] || null,
    querySelectorAll: (selector) => [],
    addEventListener: (event, handler) => {
      if (!docListeners[event]) docListeners[event] = [];
      docListeners[event].push(handler);
    },
    body: {
      style: {}
    }
  };

  globalThis.FormData = MockFormData;

  let turnstileResetCount = 0;
  globalThis._turnstileToken = 'token-1';
  globalThis.turnstile = {
    reset: () => {
      turnstileResetCount++;
      globalThis._turnstileToken = 'token-' + (turnstileResetCount + 1);
    },
    getResetCount: () => turnstileResetCount
  };

  let capturedFetchBody = null;
  let fetchOutcome = { ok: true, json: async () => ({ ok: true }) };
  let fetchThrow = false;
  let fetchCount = 0;

  globalThis.fetch = async (url, options) => {
    fetchCount++;
    capturedFetchBody = JSON.parse(options.body);
    if (fetchThrow) throw new Error('Network error');
    return {
      ok: fetchOutcome.ok,
      json: fetchOutcome.json
    };
  };

  // Load and execute main.js
  const mainJs = fs.readFileSync('public/js/main.js', 'utf8');
  const fn = new Function(mainJs);
  fn();

  // Trigger DOMContentLoaded
  if (docListeners['DOMContentLoaded']) {
    for (const h of docListeners['DOMContentLoaded']) {
      h();
    }
  }

  return {
    form,
    submitBtn,
    errorMsg,
    successMsg,
    setFetchOutcome: (outcome) => { fetchOutcome = outcome; },
    setFetchThrow: (val) => { fetchThrow = val; },
    getCapturedBody: () => capturedFetchBody,
    getFetchCount: () => fetchCount,
    getTurnstileResetCount: () => turnstileResetCount
  };
}

test('Frontend: Initial submit generates UUID v4 and sends submissionId', async () => {
  const env = setupFrontendEnvironment();
  
  let prevented = false;
  await env.form.dispatchEvent({
    type: 'submit',
    preventDefault: () => { prevented = true; }
  });

  assert.strictEqual(prevented, true);
  assert.strictEqual(env.getFetchCount(), 1);
  const body = env.getCapturedBody();
  assert.ok(body.submissionId);
  assert.match(body.submissionId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('Frontend: Communication/Server failure keeps submissionId and resets Turnstile', async () => {
  const env = setupFrontendEnvironment();
  
  // 1. Fail with network error
  env.setFetchThrow(true);
  await env.form.dispatchEvent({ type: 'submit', preventDefault: () => {} });
  
  const firstId = env.form.dataset.submissionId;
  assert.ok(firstId);
  assert.strictEqual(env.errorMsg.style.display, 'block');
  assert.strictEqual(env.submitBtn.disabled, false);
  assert.strictEqual(env.getTurnstileResetCount(), 1);

  // 2. Retry submission
  env.setFetchThrow(false);
  env.setFetchOutcome({ ok: false, json: async () => ({ ok: false, code: 'VALIDATION_FAILED' }) });
  await env.form.dispatchEvent({ type: 'submit', preventDefault: () => {} });

  const secondId = env.getCapturedBody().submissionId;
  assert.strictEqual(secondId, firstId); // Same submissionId reused!
  assert.strictEqual(env.getTurnstileResetCount(), 2);
  assert.strictEqual(env.getCapturedBody()['cf-turnstile-response'], 'token-2'); // New turnstile token used!
});

test('Frontend: Success deletes submissionId, resets form & Turnstile', async () => {
  const env = setupFrontendEnvironment();
  
  env.setFetchOutcome({ ok: true, json: async () => ({ ok: true }) });
  await env.form.dispatchEvent({ type: 'submit', preventDefault: () => {} });

  assert.strictEqual(env.form.dataset.submissionId, undefined);
  assert.strictEqual(env.successMsg.style.display, 'block');
  assert.strictEqual(env.form.style.display, 'none');
  assert.ok(env.getTurnstileResetCount() >= 1);
});

test('Frontend: Explicit user reset deletes submissionId', async () => {
  const env = setupFrontendEnvironment();
  
  // Set submissionId artificially
  env.form.dataset.submissionId = '123e4567-e89b-42d3-a456-426614174000';
  
  // Reset form
  env.form.reset();
  
  assert.strictEqual(env.form.dataset.submissionId, undefined);
});

test('Frontend: Subsequent submit after reset generates NEW UUID v4', async () => {
  const env = setupFrontendEnvironment();
  
  // First submit (success)
  env.setFetchOutcome({ ok: true, json: async () => ({ ok: true }) });
  await env.form.dispatchEvent({ type: 'submit', preventDefault: () => {} });
  const firstId = env.getCapturedBody().submissionId;

  // New submit
  await env.form.dispatchEvent({ type: 'submit', preventDefault: () => {} });
  const secondId = env.getCapturedBody().submissionId;

  assert.notStrictEqual(firstId, secondId);
  assert.match(secondId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('Frontend: Missing Crypto API displays error, restores button state, prevents fetch', async () => {
  const originalCrypto = globalThis.crypto;
  delete globalThis.crypto;

  try {
    const env = setupFrontendEnvironment();
    await env.form.dispatchEvent({ type: 'submit', preventDefault: () => {} });

    assert.strictEqual(env.getFetchCount(), 0); // fetch NOT called
    assert.strictEqual(env.submitBtn.disabled, false); // button restored
    assert.strictEqual(env.submitBtn.textContent, '送信する');
    assert.strictEqual(env.errorMsg.style.display, 'block');
    assert.ok(env.errorMsg.textContent.includes('暗号論的擬似乱数生成器'));
    assert.strictEqual(env.form.dataset.submissionId, undefined);
  } finally {
    globalThis.crypto = originalCrypto;
  }
});

test('Frontend: contact.html UTF-8 encoding, Japanese integrity, and mojibake prevention', () => {
  const contactHtmlPath = 'public/contact.html';
  assert.ok(fs.existsSync(contactHtmlPath), 'public/contact.html must exist');

  const content = fs.readFileSync(contactHtmlPath, 'utf8');

  // 1. U+FFFD check
  assert.strictEqual(content.includes('\uFFFD'), false, 'public/contact.html must not contain U+FFFD');

  // 2. Required Japanese strings
  const requiredStrings = [
    'お問い合わせ',
    '本文へスキップ',
    '希望の家について',
    'サービス内容',
    '施設のご案内',
    'ご利用案内',
    '活動の様子',
    'よくある質問',
    'アクセス',
    '見学・お問い合わせ',
    'お電話でのお問い合わせ',
    'お問い合わせフォーム',
    'お名前',
    'メールアドレス',
    '電話番号',
    'お問い合わせ種別',
    'お問い合わせ内容',
    '必須',
    '個人情報保護方針',
    '送信する'
  ];

  for (const str of requiredStrings) {
    assert.ok(content.includes(str), `public/contact.html must include '${str}'`);
  }

  // 3. Title & description
  assert.ok(content.includes('<title>お問い合わせ | 生活介護 希望の家 | 社会福祉法人SHIP</title>'));
  assert.ok(content.includes('<meta name="description" content="生活介護 希望の家への見学予約やお問い合わせはこちらから。">'));
  assert.ok(content.includes('<meta charset="UTF-8">'));
  assert.ok(content.includes('<html lang="ja">'));

  // 4. Typical mojibake patterns
  const mojibakePatterns = [
    /縺[^\s<>]{2,}/,
    /繧[^\s<>]{2,}/,
    /繝[^\s<>]{2,}/,
    /・[a-zA-Z0-9]{2,}/
  ];
  for (const pat of mojibakePatterns) {
    assert.strictEqual(pat.test(content), false, `public/contact.html must not match mojibake pattern ${pat}`);
  }

  // 5. Check all public/*.html files for U+FFFD
  const htmlFiles = fs.readdirSync('public').filter(f => f.endsWith('.html'));
  for (const file of htmlFiles) {
    const p = `public/${file}`;
    const fileContent = fs.readFileSync(p, 'utf8');
    assert.strictEqual(fileContent.includes('\uFFFD'), false, `${p} must not contain U+FFFD`);
  }
});

test('Frontend: contact.html DOM structure, form elements, and main.js contract', () => {
  const content = fs.readFileSync('public/contact.html', 'utf8');

  // Turnstile script
  assert.ok(content.includes('<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>'));

  // Form attributes
  assert.ok(content.includes('id="contact-form"'));
  assert.ok(content.includes('action="/api/contact"'));
  assert.ok(content.includes('method="POST"'));

  // Form controls & attributes
  assert.ok(content.includes('id="name"'));
  assert.ok(content.includes('name="name"'));
  assert.ok(content.includes('maxlength="100"'));
  assert.ok(content.includes('autocomplete="name"'));

  assert.ok(content.includes('id="email"'));
  assert.ok(content.includes('name="email"'));
  assert.ok(content.includes('maxlength="254"'));
  assert.ok(content.includes('autocomplete="email"'));

  assert.ok(content.includes('id="tel"'));
  assert.ok(content.includes('name="tel"'));
  assert.ok(content.includes('maxlength="30"'));
  assert.ok(content.includes('autocomplete="tel"'));

  assert.ok(content.includes('id="category"'));
  assert.ok(content.includes('name="category"'));
  assert.ok(content.includes('value="見学について"'));
  assert.ok(content.includes('value="利用に関するご相談"'));
  assert.ok(content.includes('value="採用について"'));
  assert.ok(content.includes('value="その他"'));

  assert.ok(content.includes('id="message"'));
  assert.ok(content.includes('name="message"'));
  assert.ok(content.includes('maxlength="3000"'));

  // Consent & Privacy policy link
  assert.ok(content.includes('id="consent"'));
  assert.ok(content.includes('name="consent"'));
  assert.ok(content.includes('<a href="privacy.html" target="_blank" rel="noopener noreferrer">個人情報保護方針</a>'));

  // Turnstile widget
  assert.ok(content.includes('class="cf-turnstile"'));

  // Buttons & Messages
  assert.ok(content.includes('id="submitBtn"'));
  assert.ok(content.includes('id="form-error-message"'));
  assert.ok(content.includes('id="form-success-message"'));

  // Labels matching controls
  assert.ok(content.includes('for="name"'));
  assert.ok(content.includes('for="email"'));
  assert.ok(content.includes('for="tel"'));
  assert.ok(content.includes('for="category"'));
  assert.ok(content.includes('for="message"'));
  assert.ok(content.includes('for="consent"'));
});
