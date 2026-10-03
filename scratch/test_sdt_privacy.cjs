const http = require('http');

function sendWebhook(message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      senderId: 'test_user_01',
      senderName: 'Test Driver',
      message: message,
      timestamp: new Date().toISOString()
    });

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/zalo/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('--- 1. Testing checkin: "online 8805 7h-17h" ---');
  const res1 = await sendWebhook('online 8805 7h-17h');
  console.log(res1.reply);
  console.log('Contains SĐT/phone in checkin:', /sđt|09\d{8}/i.test(res1.reply));

  console.log('\n--- 2. Testing checkonline ---');
  const res2 = await sendWebhook('checkonline');
  console.log(res2.reply);
  console.log('Contains SĐT/phone in checkonline:', /sđt/i.test(res2.reply));

  console.log('\n--- 3. Testing DeepSeek asking for phone: "ai sdt anh Tuấn" ---');
  const res3 = await sendWebhook('ai sdt anh Tuấn');
  console.log(res3.reply);
  console.log('Contains SĐT when asking DeepSeek:', /09\d{8}|sđt|số điện thoại/i.test(res3.reply));
}

runTests();
