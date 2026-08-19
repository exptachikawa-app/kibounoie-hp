function doPost(e) {
  var SECRET = PropertiesService.getScriptProperties().getProperty("APPS_SCRIPT_SIGNING_SECRET");

  if (typeof SECRET !== 'string' || SECRET.length < 32 || /\s/.test(SECRET)) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'SERVER_CONFIG_ERROR' })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    if (!e || !e.postData || typeof e.postData.contents !== 'string') {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_REQUEST' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_REQUEST' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_REQUEST' })).setMimeType(ContentService.MimeType.JSON);
    }

    // Strict top-level schema validation
    var topAllowedKeys = ['version', 'timestamp', 'requestId', 'payload', 'signature'];
    var topKeys = Object.keys(data);
    if (topKeys.length !== topAllowedKeys.length) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_REQUEST' })).setMimeType(ContentService.MimeType.JSON);
    }
    for (var i = 0; i < topKeys.length; i++) {
      if (topAllowedKeys.indexOf(topKeys[i]) === -1) {
        return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_REQUEST' })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    if (Object.prototype.hasOwnProperty.call(data, '__proto__') ||
        Object.prototype.hasOwnProperty.call(data, 'constructor') ||
        Object.prototype.hasOwnProperty.call(data, 'prototype')) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_REQUEST' })).setMimeType(ContentService.MimeType.JSON);
    }

    var version = data.version;
    var timestamp = data.timestamp;
    var requestId = data.requestId;
    var payload = data.payload;
    var signature = data.signature;

    if (version !== "1") {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_VERSION' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (typeof timestamp !== 'string' || !/^\d{10}$/.test(timestamp)) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_TIMESTAMP' })).setMimeType(ContentService.MimeType.JSON);
    }

    var tsNum = Number(timestamp);
    if (!Number.isSafeInteger(tsNum) || tsNum <= 0) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_TIMESTAMP' })).setMimeType(ContentService.MimeType.JSON);
    }
    var nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - tsNum) > 300) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'EXPIRED_TIMESTAMP' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_REQUEST_ID' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' })).setMimeType(ContentService.MimeType.JSON);
    }

    // Verify allowed keys strictly in payload
    var allowedKeys = ['name', 'email', 'tel', 'category', 'message', 'consent', 'receivedAt'];
    var payloadKeys = Object.keys(payload);
    if (payloadKeys.length !== allowedKeys.length) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' })).setMimeType(ContentService.MimeType.JSON);
    }
    for (var k = 0; k < payloadKeys.length; k++) {
      if (allowedKeys.indexOf(payloadKeys[k]) === -1) {
        return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, '__proto__') ||
        Object.prototype.hasOwnProperty.call(payload, 'constructor') ||
        Object.prototype.hasOwnProperty.call(payload, 'prototype')) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' })).setMimeType(ContentService.MimeType.JSON);
    }

    var name = payload.name;
    var email = payload.email;
    var tel = payload.tel;
    var category = payload.category;
    var message = payload.message;
    var consent = payload.consent;
    var receivedAt = payload.receivedAt;

    if (typeof name !== 'string' || name.length === 0 || name.length > 100 || name.trim().length === 0 || /[\x00-\x1F\x7F]/.test(name)) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' })).setMimeType(ContentService.MimeType.JSON);
    }
    if (typeof email !== 'string' || email.length === 0 || email.trim().length === 0 || email.length > 254 || /[\x00-\x1F\x7F]/.test(email) || !/^[^ \s@]+@[^ \s@]+\.[^ \s@]+$/.test(email)) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' })).setMimeType(ContentService.MimeType.JSON);
    }
    if (typeof tel !== 'string' || tel.length > 30 || /[\x00-\x1F\x7F]/.test(tel)) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var allowedCategories = ['見学について', '利用に関するご相談', '採用について', 'その他'];
    if (typeof category !== 'string' || allowedCategories.indexOf(category) === -1) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' })).setMimeType(ContentService.MimeType.JSON);
    }
    if (typeof message !== 'string' || message.length === 0 || message.length > 2000) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' })).setMimeType(ContentService.MimeType.JSON);
    }
    if (consent !== true) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (typeof receivedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(receivedAt)) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' })).setMimeType(ContentService.MimeType.JSON);
    }
    var receivedAtMs = Date.parse(receivedAt);
    if (!isFinite(receivedAtMs)) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' })).setMimeType(ContentService.MimeType.JSON);
    }
    var roundTripDate = new Date(receivedAtMs);
    if (isNaN(roundTripDate.getTime()) || roundTripDate.toISOString() !== receivedAt) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' })).setMimeType(ContentService.MimeType.JSON);
    }
    if (Math.abs(Date.now() - receivedAtMs) > 300000) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' })).setMimeType(ContentService.MimeType.JSON);
    }
    var MAX_TIMESTAMP_RECEIVED_AT_DIFF_MS = 300000;
    if (Math.abs(receivedAtMs - (tsNum * 1000)) > MAX_TIMESTAMP_RECEIVED_AT_DIFF_MS) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_PAYLOAD' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (typeof signature !== 'string' || !/^[0-9a-f]{64}$/.test(signature)) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_SIGNATURE' })).setMimeType(ContentService.MimeType.JSON);
    }

    var canonicalPayloadJson = JSON.stringify(payload);
    var payloadHashRaw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, canonicalPayloadJson, Utilities.Charset.UTF_8);
    var payloadHashHex = payloadHashRaw.map(function(b) {
      return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0');
    }).join('');

    var signatureTarget = "1\n" + timestamp + "\n" + requestId + "\n" + payloadHashHex;
    
    var expectedSigRaw = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, signatureTarget, SECRET, Utilities.Charset.UTF_8);
    var expectedSigHex = expectedSigRaw.map(function(b) {
      return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0');
    }).join('');

    // Constant-time string comparison for signature
    if (signature.length !== expectedSigHex.length) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_SIGNATURE' })).setMimeType(ContentService.MimeType.JSON);
    }
    var sigDiff = 0;
    for (var i = 0; i < signature.length; i++) {
      sigDiff |= signature.charCodeAt(i) ^ expectedSigHex.charCodeAt(i);
    }
    if (sigDiff !== 0) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INVALID_SIGNATURE' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Calculate idempotency hash natively from user input
    var userPayload = {
      name: payload.name,
      email: payload.email,
      tel: payload.tel,
      category: payload.category,
      message: payload.message,
      consent: payload.consent
    };
    var canonicalUserPayloadJson = JSON.stringify(userPayload);
    var idempotencyHashRaw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, canonicalUserPayloadJson, Utilities.Charset.UTF_8);
    var idempotencyHash = idempotencyHashRaw.map(function(b) {
      return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0');
    }).join('');

    var cache = CacheService.getScriptCache();
    var cachedHash = null;
    try {
      cachedHash = cache.get(requestId);
    } catch (cGetErr) {
      // Best effort cache read
    }

    if (cachedHash) {
      if (cachedHash === idempotencyHash) {
        return ContentService.createTextOutput(JSON.stringify({ ok: true, requestId: requestId, note: 'DUPLICATE_ACK' })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'IDEMPOTENCY_CONFLICT' })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    var lock = LockService.getScriptLock();
    var lockAcquired = false;
    try {
      lockAcquired = lock.tryLock(10000);
    } catch (lErr) {
      lockAcquired = false;
    }

    if (!lockAcquired) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'SYSTEM_BUSY' })).setMimeType(ContentService.MimeType.JSON);
    }

    try {
      var doubleCheckHash = null;
      try {
        doubleCheckHash = cache.get(requestId);
      } catch (cGetErr2) {
        // Best effort
      }

      if (doubleCheckHash) {
        if (doubleCheckHash === idempotencyHash) {
          return ContentService.createTextOutput(JSON.stringify({ ok: true, requestId: requestId, note: 'DUPLICATE_ACK' })).setMimeType(ContentService.MimeType.JSON);
        } else {
          return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'IDEMPOTENCY_CONFLICT' })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      var recipient = "info.kibounoie-akiruno@swsc-ship.org";
      var subject = "【Web問い合わせ】" + payload.name + "様より";
      var body = "以下の内容で問い合わせを受け付けました。\n\n" +
                 "お名前: " + payload.name + "\n" +
                 "メールアドレス: " + payload.email + "\n" +
                 "電話番号: " + payload.tel + "\n" +
                 "カテゴリ: " + payload.category + "\n" +
                 "受信日時: " + payload.receivedAt + "\n\n" +
                 "メッセージ:\n" + payload.message + "\n\n" +
                 "--- \n" +
                 "Request ID: " + requestId + "\n";
      
      var remaining = MailApp.getRemainingDailyQuota();
      if (remaining > 0) {
        MailApp.sendEmail({
          to: recipient,
          subject: subject,
          body: body,
          replyTo: payload.email
        });
      } else {
        return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'QUOTA_EXCEEDED' })).setMimeType(ContentService.MimeType.JSON);
      }

      try {
        cache.put(requestId, idempotencyHash, 21600);
      } catch (cPutErr) {
        // Best effort cache write
      }

      return ContentService.createTextOutput(JSON.stringify({ ok: true, requestId: requestId })).setMimeType(ContentService.MimeType.JSON);

    } finally {
      if (lockAcquired) {
        try {
          lock.releaseLock();
        } catch (rErr) {
          // Ignore
        }
      }
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, code: 'INTERNAL_ERROR' })).setMimeType(ContentService.MimeType.JSON);
  }
}
