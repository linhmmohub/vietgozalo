const http = require('http');

function sendWebhook(message) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      senderId: 'test_user_hotspot',
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
  console.log('=== TEST 1: THAN PHIỀN ÍT ĐƠN: "sao ít đơn thế bót ơi" ===');
  const res1 = await sendWebhook('sao ít đơn thế bót ơi');
  console.log(res1.reply);
  console.log('\n--- VERIFICATION 1 ---');
  console.log('Chỉ gửi 1 điểm nóng thay vì gửi tất cả 6 khung giờ:');
  const slotCount = (res1.reply.match(/Sáng 6h|Trưa 10h|Đầu chiều 13h|Tan tầm 16h|Tối 19h|Tối 21h/g) || []).length;
  console.log('- Số lượng khung giờ liệt kê (phải bằng 0):', slotCount);
  console.log('- Có nhắc TỶ LỆ NHẬN ĐƠN & THẢ TRÔI:', res1.reply.includes('TỶ LỆ NHẬN ĐƠN') || res1.reply.includes('Acceptance Rate'));
  console.log('- Có nhắc TẮT APP & CHECKOUT OFF:', res1.reply.includes('TẮT APP') && res1.reply.includes('CHECKOUT OFF'));

  console.log('\n=== TEST 2: HỎI ĐIỂM NÓNG: "đứng đâu nổ đơn bot" ===');
  const res2 = await sendWebhook('đứng đâu nổ đơn bot');
  console.log(res2.reply);
  console.log('\n--- VERIFICATION 2 ---');
  console.log('- Có điểm nóng gợi ý hiện tại:', res2.reply.includes('ĐIỂM NÓNG NÊN ĐỨNG NGAY LÚC NÀY'));
  console.log('- Có nhắc TỶ LỆ NHẬN ĐƠN & THẢ TRÔI:', res2.reply.includes('TỶ LỆ NHẬN ĐƠN'));
  console.log('- Có nhắc TẮT APP & CHECKOUT OFF:', res2.reply.includes('TẮT APP') && res2.reply.includes('CHECKOUT OFF'));
}

main();
