export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      if (url.pathname !== '/api/contact' && url.pathname !== '/api/contact/') {
        return new Response(JSON.stringify({ ok: false, code: 'NOT_FOUND' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
    } else {
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return new Response('Not Found', { status: 404 });
    }

    // Build and validate allowed origins
    const allowedOriginsSet = new Set([
      'https://kibounoie-hp.utility-co-jp-tokyo.workers.dev',
      'https://kibounoie-hp.pages.dev'
    ]);

    if (env.ALLOWED_ORIGINS !== undefined && env.ALLOWED_ORIGINS !== null) {
      if (typeof env.ALLOWED_ORIGINS !== 'string' || /[\x00-\x1F\x7F]/.test(env.ALLOWED_ORIGINS)) {
        return new Response(JSON.stringify({ ok: false, code: 'SERVER_CONFIG_ERROR' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
      const rawEntries = env.ALLOWED_ORIGINS.split(',');
      for (const entry of rawEntries) {
        const trimmed = entry.trim();
        if (!trimmed || /\s/.test(trimmed)) {
          return new Response(JSON.stringify({ ok: false, code: 'SERVER_CONFIG_ERROR' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
        try {
          const parsed = new URL(trimmed);
          if (parsed.username || parsed.password || parsed.search || parsed.hash) {
            return new Response(JSON.stringify({ ok: false, code: 'SERVER_CONFIG_ERROR' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
          }
          if (parsed.protocol !== 'https:') {
            if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
              // Allowed development origin
            } else {
              return new Response(JSON.stringify({ ok: false, code: 'SERVER_CONFIG_ERROR' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
            }
          }
          if (parsed.origin !== trimmed) {
            return new Response(JSON.stringify({ ok: false, code: 'SERVER_CONFIG_ERROR' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
          }
          allowedOriginsSet.add(trimmed);
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, code: 'SERVER_CONFIG_ERROR' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
      }
    }

    const allowedOrigins = Array.from(allowedOriginsSet);

    // Origin Check first (for CORS)
    const origin = request.headers.get('Origin');
    if (!origin || !allowedOrigins.includes(origin)) {
      return new Response(JSON.stringify({ ok: false, code: 'FORBIDDEN_ORIGIN' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      const reqMethod = request.headers.get('Access-Control-Request-Method');
      if (!reqMethod || reqMethod.toUpperCase() !== 'POST') {
        return new Response(JSON.stringify({ ok: false, code: 'INVALID_PREFLIGHT' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      const reqHeaders = request.headers.get('Access-Control-Request-Headers');
      if (!reqHeaders || reqHeaders.trim().length === 0) {
        return new Response(JSON.stringify({ ok: false, code: 'INVALID_PREFLIGHT' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      const rawParts = reqHeaders.split(',');
      const headerList = [];
      for (const part of rawParts) {
        const trimmed = part.trim();
        if (trimmed.length === 0) {
          return new Response(JSON.stringify({ ok: false, code: 'INVALID_PREFLIGHT' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }
        headerList.push(trimmed.toLowerCase());
      }
      if (headerList.length !== 1 || headerList[0] !== 'content-type') {
        return new Response(JSON.stringify({ ok: false, code: 'INVALID_PREFLIGHT' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, code: 'METHOD_NOT_ALLOWED' }), { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Require Secrets with strict length and zero-whitespace check
    const signingSecret = env.APPS_SCRIPT_SIGNING_SECRET;
    const turnstileSecret = env.TURNSTILE_SECRET_KEY;
    const webhookUrlStr = env.APPS_SCRIPT_WEBHOOK_URL;

    if (
      typeof signingSecret !== 'string' ||
      typeof turnstileSecret !== 'string' ||
      typeof webhookUrlStr !== 'string' ||
      /\s/.test(signingSecret) ||
      /\s/.test(turnstileSecret) ||
      /\s/.test(webhookUrlStr) ||
      signingSecret.length < 32 ||
      turnstileSecret.length === 0 ||
      webhookUrlStr.length === 0
    ) {
      return new Response(JSON.stringify({ ok: false, code: 'SERVER_CONFIG_ERROR' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Validate GAS Webhook URL
    try {
      if (/[\x00-\x1F\x7F]/.test(webhookUrlStr) || /\s/.test(webhookUrlStr)) {
        throw new Error('Control character or whitespace forbidden');
      }
      if (!webhookUrlStr.startsWith('https://')) {
        throw new Error('Scheme must be https://');
      }
      const authorityStart = 8; // 'https://'.length
      const pathStart = webhookUrlStr.indexOf('/', authorityStart);
      if (pathStart === -1) {
        throw new Error('Path separator missing');
      }
      const rawAuthority = webhookUrlStr.slice(authorityStart, pathStart);
      if (rawAuthority !== 'script.google.com') {
        throw new Error('Authority must be exactly script.google.com');
      }

      const webhookUrl = new URL(webhookUrlStr);
      if (webhookUrl.protocol !== 'https:' || webhookUrl.hostname !== 'script.google.com' || 
          webhookUrl.username || webhookUrl.password || webhookUrl.port || webhookUrl.search || webhookUrl.hash) {
        throw new Error('Invalid URL Components');
      }
      const parts = webhookUrl.pathname.split('/');
      // Expected: ['', 'macros', 's', '{deploymentId}', 'exec'] -> length 5
      if (parts.length !== 5 || parts[0] !== '' || parts[1] !== 'macros' || parts[2] !== 's' || !parts[3] || parts[4] !== 'exec') {
        throw new Error('Invalid Pathname');
      }
      if (webhookUrlStr.endsWith('/')) {
        throw new Error('Trailing slash forbidden');
      }
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, code: 'SERVER_CONFIG_ERROR' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Size limit check via Content-Length early rejection (Strict decimal format: no leading zero, safe integer)
    const contentLengthStr = request.headers.get('content-length');
    let declaredContentLength = null;
    if (contentLengthStr !== null) {
      if (!/^(?:0|[1-9]\d*)$/.test(contentLengthStr)) {
        return new Response(JSON.stringify({ ok: false, code: 'INVALID_CONTENT_LENGTH' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      if (contentLengthStr.length > 15) {
        return new Response(JSON.stringify({ ok: false, code: 'PAYLOAD_TOO_LARGE' }), { status: 413, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      const parsedNum = Number(contentLengthStr);
      if (!Number.isSafeInteger(parsedNum) || parsedNum < 0) {
        return new Response(JSON.stringify({ ok: false, code: 'INVALID_CONTENT_LENGTH' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      declaredContentLength = parsedNum;
      if (declaredContentLength > 10240) {
        return new Response(JSON.stringify({ ok: false, code: 'PAYLOAD_TOO_LARGE' }), { status: 413, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
    }

    // Stream reading with early abort at 10,240 bytes (prevents unbounded memory buffering)
    const MAX_PAYLOAD_BYTES = 10240;
    if (!request.body) {
      return new Response(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const reader = request.body.getReader();
    const chunks = [];
    let totalBytes = 0;
    let tooLarge = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_PAYLOAD_BYTES) {
          tooLarge = true;
          await reader.cancel().catch(() => {});
          break;
        }
        chunks.push(value);
      }
    } catch (readErr) {
      return new Response(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    if (tooLarge) {
      return new Response(JSON.stringify({ ok: false, code: 'PAYLOAD_TOO_LARGE' }), { status: 413, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    if (totalBytes === 0) {
      return new Response(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Strict declared Content-Length matching with actual streamed totalBytes
    if (declaredContentLength !== null && declaredContentLength !== totalBytes) {
      return new Response(JSON.stringify({ ok: false, code: 'CONTENT_LENGTH_MISMATCH' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const buffer = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const contentType = (request.headers.get('Content-Type') || '').toLowerCase();
    if (contentType !== 'application/json' && contentType !== 'application/json; charset=utf-8') {
      return new Response(JSON.stringify({ ok: false, code: 'UNSUPPORTED_MEDIA_TYPE' }), { status: 415, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    let textBody = '';
    try {
      const textDecoder = new TextDecoder('utf-8', { fatal: true });
      textBody = textDecoder.decode(buffer);
      if (textBody.charCodeAt(0) === 0xFEFF) {
        textBody = textBody.slice(1);
      }
    } catch (decodeErr) {
      return new Response(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    let data = {};
    try {
      data = JSON.parse(textBody);
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    if (typeof data !== 'object' || Array.isArray(data) || data === null) {
      return new Response(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Validation on RAW inputs before trimming
    const rawName = typeof data.name === 'string' ? data.name : '';
    const rawEmail = typeof data.email === 'string' ? data.email : '';
    const rawTel = typeof data.tel === 'string' ? data.tel : '';

    if (rawName.length === 0 || rawName.trim().length === 0 || /[\x00-\x1F\x7F]/.test(rawName)) {
      return new Response(JSON.stringify({ ok: false, code: 'VALIDATION_FAILED' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
    if (rawEmail.length === 0 || rawEmail.trim().length === 0 || rawEmail.length > 254 || /[\x00-\x1F\x7F]/.test(rawEmail) || rawEmail.includes('\r') || rawEmail.includes('\n')) {
      return new Response(JSON.stringify({ ok: false, code: 'INVALID_EMAIL' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
    if (rawTel.length > 30 || /[\x00-\x1F\x7F]/.test(rawTel)) {
      return new Response(JSON.stringify({ ok: false, code: 'INVALID_TEL' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const name = rawName.trim();
    const email = rawEmail.trim();
    const tel = rawTel.trim();
    const category = typeof data.category === 'string' ? data.category.trim() : '';
    const message = typeof data.message === 'string' ? data.message.trim() : '';
    const consent = data.consent === true || data.consent === 'true' || data.consent === 'on';
    const turnstileToken = typeof data['cf-turnstile-response'] === 'string' ? data['cf-turnstile-response'].trim() : '';
    const submissionId = typeof data.submissionId === 'string' ? data.submissionId.trim() : '';

    if (!name || name.length > 100 || !email || email.length > 254 || !message || message.length > 2000 || tel.length > 30) {
      return new Response(JSON.stringify({ ok: false, code: 'VALIDATION_FAILED' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const emailRegex = /^[^ \s@]+@[^ \s@]+\.[^ \s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ ok: false, code: 'INVALID_EMAIL' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const allowedCategories = ['見学について', '利用に関するご相談', '採用について', 'その他'];
    if (!allowedCategories.includes(category)) {
      return new Response(JSON.stringify({ ok: false, code: 'INVALID_CATEGORY' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    if (!consent) {
      return new Response(JSON.stringify({ ok: false, code: 'CONSENT_REQUIRED' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    if (!turnstileToken) {
      return new Response(JSON.stringify({ ok: false, code: 'TURNSTILE_REQUIRED' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
    
    // Strict UUID v4 check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!submissionId || !uuidRegex.test(submissionId)) {
      return new Response(JSON.stringify({ ok: false, code: 'INVALID_SUBMISSION_ID' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
    const requestId = submissionId;

    // Verify Turnstile
    const turnstileData = new FormData();
    turnstileData.append('secret', turnstileSecret);
    turnstileData.append('response', turnstileToken);
    const remoteIp = request.headers.get('CF-Connecting-IP');
    if (remoteIp) {
      turnstileData.append('remoteip', remoteIp);
    }

    const tController = new AbortController();
    const tTimeout = setTimeout(() => tController.abort(), 5000);
    try {
      const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: turnstileData,
        signal: tController.signal
      });
      if (!turnstileRes.ok) {
        return new Response(JSON.stringify({ ok: false, code: 'TURNSTILE_ERROR' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      
      let turnstileOutcome = null;
      try {
        turnstileOutcome = await turnstileRes.json();
      } catch (jErr) {
        return new Response(JSON.stringify({ ok: false, code: 'TURNSTILE_ERROR' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }

      if (turnstileOutcome.success !== true) {
        return new Response(JSON.stringify({ ok: false, code: 'TURNSTILE_FAILED' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      if (turnstileOutcome.action !== 'contact') {
        return new Response(JSON.stringify({ ok: false, code: 'TURNSTILE_FAILED' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      
      const expectedHostname = new URL(origin).hostname;
      if (turnstileOutcome.hostname !== expectedHostname) {
        return new Response(JSON.stringify({ ok: false, code: 'TURNSTILE_FAILED' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, code: 'TURNSTILE_ERROR' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    } finally {
      clearTimeout(tTimeout);
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    // Payload strictly includes ONLY whitelisted fields (no client unknown fields forwarded)
    const payload = {
      name,
      email,
      tel,
      category,
      message,
      consent: true,
      receivedAt: new Date().toISOString()
    };
    const canonicalPayloadJson = JSON.stringify(payload);
    
    const encoder = new TextEncoder();
    const payloadHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalPayloadJson));
    const payloadHashHex = Array.from(new Uint8Array(payloadHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Signature over the FULL payload hash (protects data integrity)
    const signatureTarget = "1\n" + timestamp + "\n" + requestId + "\n" + payloadHashHex;

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(signingSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureTarget));
    const signatureHex = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const gasPayload = {
      version: "1",
      timestamp,
      requestId,
      payload,
      signature: signatureHex
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const gasRes = await fetch(webhookUrlStr, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gasPayload),
        signal: controller.signal
      });
      
      let gasOutcome = null;
      try {
        gasOutcome = await gasRes.json();
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, code: 'GAS_ERROR' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      
      if (!gasRes.ok || !gasOutcome || gasOutcome.ok !== true || gasOutcome.requestId !== requestId) {
        if (gasOutcome && gasOutcome.code === 'IDEMPOTENCY_CONFLICT') {
           return new Response(JSON.stringify({ ok: false, code: 'IDEMPOTENCY_CONFLICT' }), { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }
        return new Response(JSON.stringify({ ok: false, code: 'GAS_ERROR' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }

      return new Response(JSON.stringify({ ok: true, requestId }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    } catch (e) {
      if (e.name === 'AbortError') {
        return new Response(JSON.stringify({ ok: false, code: 'GAS_TIMEOUT' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      return new Response(JSON.stringify({ ok: false, code: 'GAS_NETWORK_ERROR' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    } finally {
      clearTimeout(timeoutId);
    }
  }
};
