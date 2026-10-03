const http = require('http');

function sendWebhook(message, senderName = 'Tài xế') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      senderId: 'test_user_calling',
      senderName: senderName,
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
  const testCases = [
    'Bot ơi',
    'bót ơi',
    'giờ phải làm sao bot',
    'rồi bót',
    'khách không nghe máy giờ phải làm sao bot',
    'quán hết món giờ phải làm sao hả bót',
    'bót ơi sao app bị tắt thế',
    'alo bot',
    'sao ít đơn thế bót ơi'
  ];

  for (const tc of testCases) {
    console.log(`\n=================================================`);
    console.log(`TEST INPUT: "${tc}"`);
    console.log(`=================================================`);
    const res = await sendWebhook(tc, 'Nguyễn Văn Tuấn');
    console.log(`Action:`, res.action);
    console.log(`Reply:\n${res.reply}`);
    console.log(`Has Reply:`, !!(res.reply && res.reply.trim().length > 0));
  }
}

runTests();
