async function testWeather() {
  console.log('--- 1. Testing GET /api/weather/nghison ---');
  try {
    const res = await fetch('http://localhost:3000/api/weather/nghison');
    const data = await res.json();
    console.log('API Response:', JSON.stringify(data.weather, null, 2));
  } catch (e) {
    console.error('API Error:', e.message);
  }

  const queries = [
    'thời tiết nghi sơn hôm nay thế nào bot',
    'bot ơi trời có mưa không',
    'nhiệt độ bây giờ bao nhiêu bot',
    'trời mưa thì phải làm sao bot',
    'chiều nay nghi sơn có mưa không bot ơi'
  ];

  for (const q of queries) {
    console.log(`\n======================================================`);
    console.log(`QUERY: "${q}"`);
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
          senderName: 'Hà Trọng Huy',
          groupId: 'group-tinhgia',
          groupName: 'ĐỘI TÀI XẾ VIETGO TĨNH GIA',
          isGroup: true,
          message: q,
          timestamp: Date.now()
        })
      });
      const data = await res.json();
      console.log('REPLY:\n' + data.reply);
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

testWeather();
