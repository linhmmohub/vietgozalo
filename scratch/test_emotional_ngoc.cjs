async function testQuery(msg) {
  console.log(`\n======================================================`);
  console.log(`TEST QUERY: "${msg}"`);
  console.log(`======================================================`);
  try {
    const res = await fetch('http://localhost:3000/api/zalo/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': 'vietgo_secret_token_2026'
      },
      body: JSON.stringify({
        senderId: 'drv-test',
        senderName: 'Bác Tài Test',
        groupId: 'group-test',
        groupName: 'NHÓM TÀI XẾ TEST',
        isGroup: true,
        message: msg,
        timestamp: Date.now()
      })
    });

    const data = await res.json();
    console.log('REPLY:\n' + data.reply);
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

async function run() {
  await testQuery('sao ít đơn thế bót ơi');
  await testQuery('giờ này đứng đâu nổ đơn bot');
  await testQuery('cày ngọc kiếm tiền thế nào bot');
  await testQuery('đi từ còng vô tân trường đừng để xe không về làm gì bot');
}

run();
