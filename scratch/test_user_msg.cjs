async function run() {
  const msg = 'LÚC VẮNG ĐƠN: Đừng quên tranh thủ mở App VietGo vào mục "Đóng góp địa điểm" cày ngọc (1.000 ngọc/điểm) kiếm thêm thu nhập nhé!';
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
}

run();
