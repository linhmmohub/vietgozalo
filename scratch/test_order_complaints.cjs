const http = require('http');

function sendWebhook(message, senderName = 'Tài xế') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      senderId: 'test_user_complaint',
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
    'sao ít đơn thế',
    'chán quá chả có đơn nào',
    'ế quá bot ơi',
    'ngồi chơi đói kém quá',
    'sao app không bắn đơn nào thế',
    'ai dạo này ít đơn thế nhỉ'
  ];

  for (const tc of testCases) {
    console.log(`\n=================================================`);
    console.log(`TEST INPUT: "${tc}"`);
    console.log(`=================================================`);
    const res = await sendWebhook(tc, 'Nguyễn Văn Tuấn');
    console.log(`Action:`, res.action);
    console.log(`Reply:\n${res.reply}`);
    
    // Checks:
    const hasDinhHai = res.reply.includes('Đình Hải') || res.reply.includes('ĐÌNH HẢI');
    const hasCuong = res.reply.includes('Cương') || res.reply.includes('CƯƠNG');
    const has100Diem = res.reply.includes('100');
    const has75Diem = res.reply.includes('75');
    const hasKhongRen = res.reply.includes('rên') || res.reply.includes('RÊN');
    const hasSongYeu = res.reply.includes('sóng') || res.reply.includes('SÓNG');
    const hasMoiNguoi1ViTri = res.reply.includes('1 vị trí') || res.reply.includes('1 VỊ TRÍ');

    console.log(`\nVerification:`);
    console.log(`- Nhắc Đình Hải 100 điểm:`, hasDinhHai && has100Diem);
    console.log(`- Nhắc Cương 75 điểm:`, hasCuong && has75Diem);
    console.log(`- Khuyên âm thầm đừng rên:`, hasKhongRen);
    console.log(`- Giải thích sóng yếu không bắn đơn được:`, hasSongYeu);
    console.log(`- Khuyên mỗi người 1 vị trí:`, hasMoiNguoi1ViTri);
  }

  // Also check normal checkin still intact
  console.log(`\n=================================================`);
  console.log(`TEST REGULAR CHECKIN: "online 3389 8h-16h"`);
  console.log(`=================================================`);
  const resCheckin = await sendWebhook('online 3389 8h-16h', 'Nguyễn Văn Tuấn');
  console.log(`Checkin Action:`, resCheckin.action);
  console.log(`Contains checkin header:`, resCheckin.reply.includes('ĐIỂM DANH THÀNH CÔNG'));
  console.log(`Contains SĐT:`, /09\d{8}|sđt/i.test(resCheckin.reply));
}

runTests();
