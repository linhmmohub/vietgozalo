const http = require('http');

function sendWebhook(message) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      senderId: 'test_user_calling',
      senderName: 'Văn Tuấn',
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
      res.on('end', () => resolve(JSON.parse(data)));
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  const res = await sendWebhook('giờ phải làm sao bot');
  console.log('REPLY FOR "giờ phải làm sao bot":');
  console.log(res.reply);

  const res2 = await sendWebhook('ai sdt anh Tuấn');
  console.log('\nREPLY FOR "ai sdt anh Tuấn":');
  console.log(res2.reply);
}

main();
