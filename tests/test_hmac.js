const crypto = require('crypto');

// HMAC test vectors
function testHMAC() {
  const secret = 'test-secret-signing-key-32bytes!';
  const payload = {
    name: '山田 太郎🍎',
    email: 'test@example.com',
    tel: '090-1234-5678',
    category: '見学について',
    message: '見学を希望します。\nよろしくお願いします。',
    consent: true,
    receivedAt: '2023-07-22T04:26:40.000Z'
  };

  const canonicalPayloadJson = JSON.stringify(payload);
  const payloadHash = crypto.createHash('sha256').update(canonicalPayloadJson, 'utf8').digest('hex');
  
  const version = "1";
  const timestamp = "1690000000";
  const requestId = "123e4567-e89b-42d3-a456-426614174000";
  
  const signatureTarget = version + '\n' + timestamp + '\n' + requestId + '\n' + payloadHash;
  
  const signature = crypto.createHmac('sha256', secret).update(signatureTarget, 'utf8').digest('hex');
  
  console.log('--- HMAC Test ---');
  console.log('Payload Hash:', payloadHash);
  console.log('Signature:', signature);
  console.log('If Apps Script and Worker produce this signature, HMAC is reproducible.\n');
}

testHMAC();
