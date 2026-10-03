const fs = require('fs');
const path = require('path');

const serverFile = path.resolve(__dirname, '../server.ts');
const botFile = path.resolve(__dirname, '../zalobot/bot.js');

let serverContent = fs.readFileSync(serverFile, 'utf8');
let botContent = fs.readFileSync(botFile, 'utf8');

console.log('1. Updating server.ts...');

// Target 1: Knowledge section for CHƯƠNG TRÌNH KIẾM TIỀN & CÀY NGỌC in server.ts
const oldKnowledgeNgoc = `  • KHI TÀI XẾ HỎI VỀ KIẾM TIỀN / CÁCH KIẾM THÊM THU NHẬP / CÀY NGỌC: DeepSeek trả lời linh hoạt, hóm hỉnh, động viên tinh thần anh em và nhắc nhở đầy đủ các lưu ý cụ thể chuẩn xác như trên!`;

const newKnowledgeNgoc = `  • TÂM SỰ & BÍ KÍP CHÂN TÌNH CHO TÀI XẾ (PHÂN TÍCH TÌNH CẢM, THỰC TẾ):
    - Đồng cảm sâu sắc với nỗi vất vả của anh em chạy xe máy ngoài đường nắng mưa.
    - Đưa ví dụ cụ thể thực tế: Khi chạy cuốc xa (ví dụ chạy từ Còng vào Tân Trường hay các xã xa giao hàng xong), ĐỪNG BAO GIỜ ĐỂ XE KHÔNG CHẠY VỀ vừa xót tiền xăng vừa uổng công!
    - Hãy dành chút thời gian dọc đường về mở App VietGo vào mục "Đóng góp địa điểm", ghé chụp ảnh quán ăn, tiệm tạp hóa, công ty, xưởng, xí nghiệp...
    - Lượm nhẹ 30-50 địa điểm dọc đường về là bỏ túi ngay 30.000 - 50.000 ngọc (tương đương 30k - 50k) đủ tiền đổ đầy bình xăng rồi, biến chuyến đi xa thành chuyến thắng lợi rực rỡ, không lo xe chạy rỗng lỗ tiền xăng!
  • KHI TÀI XẾ HỎI VỀ KIẾM TIỀN / CÁCH KIẾM THÊM THU NHẬP / CÀY NGỌC: DeepSeek trả lời linh hoạt, hóm hỉnh, động viên tinh thần anh em và nhắc nhở đầy đủ các lưu ý cụ thể chuẩn xác như trên!`;

if (serverContent.includes(oldKnowledgeNgoc)) {
  serverContent = serverContent.replace(oldKnowledgeNgoc, newKnowledgeNgoc);
  console.log('  ✅ Updated Knowledge section in server.ts');
} else {
  console.log('  ⚠️ Target 1 not found in server.ts');
}

// Target 2: aiSystemPrompt section 4 for complaint / cày ngọc in server.ts
const oldAiPromptComplaint = `     - Khuyên tài xế: Thời gian ngồi than phiền, rên rỉ hay lướt mạng, hãy tranh thủ thời gian mở App VietGo đi ĐÓNG GÓP ĐỊA ĐIỂM để cày ngọc kiếm thêm thu nhập (1.000 ngọc / địa điểm hợp lệ, không giới hạn).
     - Nêu gương điển hình thực tế:
       + Bác ĐÌNH HẢI đã âm thầm đóng góp được hơn 100 ĐỊA ĐIỂM rồi (bỏ túi hơn 100k ngọc ngọt xớt)!
       + Anh CƯƠNG cũng đã đóng góp được 75 ĐỊA ĐIỂM rồi (bỏ túi 75k ngọc tha hồ đổi quà)!
       + Nhắc nhở anh em: "LÀM VIỆC ÂM THẦM KIẾM TIỀN ĐỪNG RÊN RỈ!".`;

const newAiPromptComplaint = `     - Khuyên tài xế: Thời gian ngồi than phiền, rên rỉ hay lướt mạng, hãy tranh thủ thời gian mở App VietGo đi ĐÓNG GÓP ĐỊA ĐIỂM để cày ngọc kiếm thêm thu nhập (1.000 ngọc / địa điểm hợp lệ, không giới hạn).
     - Phân tích tình cảm, thực tế: Chạy xe ai cũng xót tiền xăng, lúc vắng đơn hoặc chạy đơn xa (ví dụ chạy từ Còng vào Tân Trường), đừng để xe không chạy về! Dành chút thời gian dọc đường chụp 30-50 địa điểm (quán ăn, tạp hóa, công ty, xưởng...) là kiếm thêm 30k - 50k (30.000 - 50.000 ngọc) đổ đầy bình xăng rồi, biến cuốc đi xa thành cuốc bội thu.
     - Nêu gương điển hình thực tế:
       + Bác ĐÌNH HẢI đã âm thầm đóng góp được hơn 100 ĐỊA ĐIỂM rồi (bỏ túi hơn 100k ngọc ngọt xớt)!
       + Anh CƯƠNG cũng đã đóng góp được 75 ĐỊA ĐIỂM rồi (bỏ túi 75k ngọc tha hồ đổi quà)!
       + Nhắc nhở anh em: "LÀM VIỆC ÂM THẦM KIẾM TIỀN ĐỪNG RÊN RỈ!".`;

if (serverContent.includes(oldAiPromptComplaint)) {
  serverContent = serverContent.replace(oldAiPromptComplaint, newAiPromptComplaint);
  console.log('  ✅ Updated aiSystemPrompt complaint section in server.ts');
} else {
  console.log('  ⚠️ Target 2 not found in server.ts');
}

// Target 3: FAQ 2.8 Kiếm tiền / cày ngọc in server.ts
const oldFaq28 = `  // 2.8. Kiếm tiền / Kiếm ngọc / Thêm địa điểm trên App Tài xế VietGo
  if (
    normQ.includes('kiem tien') ||
    normQ.includes('kiem them') ||
    normQ.includes('kiem ngoc') ||
    normQ.includes('them dia diem') ||
    normQ.includes('dong gop dia diem') ||
    normQ.includes('chup anh dia diem') ||
    normQ.includes('lay ngoc') ||
    normQ.includes('cay ngoc') ||
    (normQ.includes('dia diem') && (normQ.includes('1k') || normQ.includes('1000') || normQ.includes('thuong') || normQ.includes('duyet') || normQ.includes('them'))) ||
    (normQ.includes('ranh') && (normQ.includes('lam gi') || normQ.includes('kiem tien')))
  ) {
    return \`💰 [CƠ HỘI KIẾM TIỀN & CÀY NGỌC KHÔNG GIỚI HẠN TRÊN APP VIETGO] 📍✨\\n\\n\` +
      \`Chào bác tài! Ngoài chạy đơn, VietGo đang có chương trình ĐÓNG GÓP ĐỊA ĐIỂM nhận thưởng cực ngon, anh em tranh thủ lúc vắng đơn cày ngọc nhé! 🛵💨\\n\\n\` +
      \`🎁 MỨC THƯỞNG HẤP DẪN:\\n\` +
      \`• Thưởng: 1.000 ngọc / mỗi địa điểm hợp lệ được duyệt.\\n\` +
      \`• KHÔNG GIỚI HẠN số lượng địa điểm! Lụm 20 - 50 địa điểm là có ngay 20.000 - 50.000 ngọc tha hồ đổi thưởng đổ xăng trà đá nhẹ nhàng! 💎💵\\n\\n\` +
      \`📱 CÁCH THỰC HIỆN TRÊN APP TÀI XẾ:\\n\` +
      \`1️⃣ Mở App Tài Xế VietGo ➔ Chọn mục "Đóng góp địa điểm".\\n\` +
      \`2️⃣ Đang đứng trực tiếp tại quán/shop bấm "Lấy vị trí hiện tại" để hệ thống tự điền tọa độ chuẩn (hạn chế sửa tay kẻo lệch vị trí).\\n\` +
      \`3️⃣ Chụp ảnh và gửi duyệt.\\n\\n\` +
      \`⚠️ CÁC LƯU Ý SỐNG CÒN ĐỂ ĐƯỢC DUYỆT 100% (ĐỌC KỸ ĐỠ MẤT CÔNG):\\n\` +
      \`📸 1. QUY ĐỊNH CHỤP ẢNH:\\n\` +
      \`• Chụp ít nhất 1 ảnh (tối đa 2 ảnh) rõ nét mặt tiền, BIỂN HIỆU, SỐ NHÀ, TÊN CÔNG TY, CỬA HÀNG, QUÁN ĂN.\\n\\n\` +
      \`🏢 2. CHỈ GỬI ĐỊA ĐIỂM RIÊNG BIỆT & CỤ THỂ:\\n\` +
      \`• ĐƯỢC DUYỆT: Tòa nhà, chung cư (VD: Chung cư A1), công ty, nhà máy, shop thời trang, tiệm tạp hóa, quán ăn, quán cafe, trà sữa (VD: Trà sữa Mây, Hải sản 36...), số nhà cụ thể (VD: 125 Nguyễn Văn Cừ)...\\n\` +
      \`• ❌ TUYỆT ĐỐI KHÔNG GỬI ĐỊA ĐIỂM CHUNG CHUNG: như Tổ dân phố, tên đường (đường đôi, đường tránh...), khu dân cư, thôn xóm, ngã ba ngã tư... Những địa điểm chung chung này SẼ BỊ TỪ CHỐI DUYỆT VÀ KHÔNG ĐƯỢC TÍNH THƯỞNG!\\n\\n\` +
      \`💡 3. MẸO TIẾT KIỆM THỜI GIAN:\\n\` +
      \`• Trước khi thêm, mở app VietGo lên tìm kiếm xem quán/địa điểm đó đã có chưa. Chưa có thì mới thêm để tránh trùng lặp mất công nhé bác tài!\\n\\n\` +
      \`Chúc anh em tài xế vừa nổ đơn rực rỡ, vừa cày ngọc rủng rỉnh tiền tiêu! 🏆🛵💎\`;
  }`;

const newFaq28 = `  // 2.8. Kiếm tiền / Kiếm ngọc / Thêm địa điểm trên App Tài xế VietGo
  if (
    normQ.includes('kiem tien') ||
    normQ.includes('kiem them') ||
    normQ.includes('kiem ngoc') ||
    normQ.includes('them dia diem') ||
    normQ.includes('dong gop dia diem') ||
    normQ.includes('chup anh dia diem') ||
    normQ.includes('lay ngoc') ||
    normQ.includes('cay ngoc') ||
    normQ.includes('xe khong ve') ||
    normQ.includes('xe chay rong') ||
    (normQ.includes('tan truong') && (normQ.includes('ve') || normQ.includes('cong') || normQ.includes('ngoc') || normQ.includes('xang'))) ||
    (normQ.includes('dia diem') && (normQ.includes('1k') || normQ.includes('1000') || normQ.includes('thuong') || normQ.includes('duyet') || normQ.includes('them') || normQ.includes('ngoc') || normQ.includes('xang'))) ||
    (normQ.includes('vang don') && (normQ.includes('ngoc') || normQ.includes('lam gi') || normQ.includes('kiem tien') || normQ.includes('dia diem'))) ||
    (normQ.includes('ranh') && (normQ.includes('lam gi') || normQ.includes('kiem tien')))
  ) {
    return \`💰 [CƠ HỘI KIẾM TIỀN & CÀY NGỌC KHÔNG GIỚI HẠN TRÊN APP VIETGO] 📍✨\\n\\n\` +
      \`Chào bác tài! Ngoài chạy đơn, VietGo đang có chương trình ĐÓNG GÓP ĐỊA ĐIỂM nhận thưởng cực ngon, anh em tranh thủ lúc vắng đơn cày ngọc nhé! 🛵💨\\n\\n\` +
      \`🎁 MỨC THƯỞNG HẤP DẪN:\\n\` +
      \`• Thưởng: 1.000 ngọc / mỗi địa điểm hợp lệ được duyệt.\\n\` +
      \`• KHÔNG GIỚI HẠN số lượng địa điểm! Lụm 20 - 50 địa điểm là có ngay 20.000 - 50.000 ngọc tha hồ đổi thưởng đổ xăng trà đá nhẹ nhàng! 💎💵\\n\\n\` +
      \`❤️ TÂM SỰ CHÂN TÌNH & KINH NGHIỆM CHẠY XE THỰC TẾ:\\n\` +
      \`• Chạy xe đường dài ai cũng xót tiền xăng. Ví dụ bác tài nhận cuốc giao từ Còng vào Tân Trường hay các xã xa, giao xong TUYỆT ĐỐI ĐỪNG ĐỂ XE KHÔNG CHẠY VỀ vừa tốn tiền xăng vừa uổng công!\\n\` +
      \`• Hãy dành chút thời gian quý báu dọc đường về, mở ngay App VietGo ghé chụp ảnh vài quán ăn, tiệm tạp hóa, công ty, nhà máy, xí nghiệp, xưởng...\\n\` +
      \`• Lượm nhẹ 30 - 50 địa điểm dọc đường về là bỏ túi ngay 30k - 50k (30.000 - 50.000 ngọc) đủ tiền đổ đầy bình xăng rồi! Vừa không lo xe chạy rỗng lỗ tiền xăng, vừa biến chuyến đi xa thành chuyến thắng lợi rực rỡ! ⛽🛵💵\\n\\n\` +
      \`📱 CÁCH THỰC HIỆN TRÊN APP TÀI XẾ:\\n\` +
      \`1️⃣ Mở App Tài Xế VietGo ➔ Chọn mục "Đóng góp địa điểm".\\n\` +
      \`2️⃣ Đang đứng trực tiếp tại quán/shop bấm "Lấy vị trí hiện tại" để hệ thống tự điền tọa độ chuẩn (hạn chế sửa tay kẻo lệch vị trí).\\n\` +
      \`3️⃣ Chụp ảnh và gửi duyệt.\\n\\n\` +
      \`⚠️ CÁC LƯU Ý SỐNG CÒN ĐỂ ĐƯỢC DUYỆT 100% (ĐỌC KỸ ĐỠ MẤT CÔNG):\\n\` +
      \`📸 1. QUY ĐỊNH CHỤP ẢNH:\\n\` +
      \`• Chụp ít nhất 1 ảnh (tối đa 2 ảnh) rõ nét mặt tiền, BIỂN HIỆU, SỐ NHÀ, TÊN CÔNG TY, CỬA HÀNG, QUÁN ĂN.\\n\\n\` +
      \`🏢 2. CHỈ GỬI ĐỊA ĐIỂM RIÊNG BIỆT & CỤ THỂ:\\n\` +
      \`• ĐƯỢC DUYỆT: Tòa nhà, chung cư (VD: Chung cư A1), công ty, nhà máy, shop thời trang, tiệm tạp hóa, quán ăn, quán cafe, trà sữa (VD: Trà sữa Mây, Hải sản 36...), số nhà cụ thể (VD: 125 Nguyễn Văn Cừ)...\\n\` +
      \`• ❌ TUYỆT ĐỐI KHÔNG GỬI ĐỊA ĐIỂM CHUNG CHUNG: như Tổ dân phố, tên đường (đường đôi, đường tránh...), khu dân cư, thôn xóm, ngã ba ngã tư... Những địa điểm chung chung này SẼ BỊ TỪ CHỐI DUYỆT VÀ KHÔNG ĐƯỢC TÍNH THƯỞNG!\\n\\n\` +
      \`💡 3. MẸO TIẾT KIỆM THỜI GIAN:\\n\` +
      \`• Trước khi thêm, mở app VietGo lên tìm kiếm xem quán/địa điểm đó đã có chưa. Chưa có thì mới thêm để tránh trùng lặp mất công nhé bác tài!\\n\\n\` +
      \`Chúc anh em tài xế vừa nổ đơn rực rỡ, vừa cày ngọc rủng rỉnh tiền tiêu! 🏆🛵💎\`;
  }`;

if (serverContent.includes(oldFaq28)) {
  serverContent = serverContent.replace(oldFaq28, newFaq28);
  console.log('  ✅ Updated FAQ 2.8 in server.ts');
} else {
  console.log('  ⚠️ Target 3 not found in server.ts');
}

// Target 4: isOrderComplaintQuery section 1 in server.ts
const oldComplaintSec1 = `      \`1️⃣ THỜI GIAN NGỒI THAN PHIỀN ➔ HÃY ĐI ĐÓNG GÓP ĐỊA ĐIỂM KIẾM NGỌC:\\n\` +
      \`• Lúc vắng đơn, thay vì ngồi lướt điện thoại than thở, các bác mở ngay App VietGo vào mục "Đóng góp địa điểm" mà kiếm thêm thu nhập!\\n\` +
      \`• Mỗi địa điểm hợp lệ (chụp rõ biển hiệu, số nhà, tên quán...) được duyệt là nhận ngay 1.000 NGỌC (1k ngọc), KHÔNG GIỚI HẠN số lượng!\\n\` +
      \`• Nhìn gương bác ĐÌNH HẢI kia kìa: Âm thầm cày cuốc đã góp được hơn 100 ĐỊA ĐIỂM rồi (bỏ túi hơn 100.000 ngọc ngọt xớt)!\\n\` +
      \`• Anh CƯƠNG cũng đã đóng góp được 75 ĐỊA ĐIỂM rồi đấy (rủng rỉnh 75.000 ngọc tha hồ đổi quà)!\\n\` +
      \`👉 Người ta LÀM VIỆC ÂM THẦM, tiền vào túi rủng rỉnh chứ ĐỪNG CÓ NGỒI RÊN nha các bác! 👏💎\\n\\n\` +`;

const newComplaintSec1 = `      \`1️⃣ THỜI GIAN NGỒI THAN PHIỀN ➔ HÃY ĐI CÀY NGỌC BỎ TÚI 30K-50K ĐỔ XĂNG (1.000 NGỌC/ĐIỂM):\\n\` +
      \`• Bot tâm sự chân tình với các bác: Đi chạy xe ai chẳng muốn nổ đơn liên tục, nhưng lúc vắng đơn hoặc lỡ nhận cuốc xa (ví dụ chạy từ Còng vào Tân Trường giao hàng xong), ĐỪNG BAO GIỜ ĐỂ XE KHÔNG CHẠY VỀ vừa xót tiền xăng vừa uổng công!\\n\` +
      \`• Hãy dành chút thời gian quý báu dọc đường về, mở ngay App VietGo vào mục "Đóng góp địa điểm", ghé chụp ảnh các quán ăn, tiệm tạp hóa, công ty, nhà xưởng...\\n\` +
      \`• Mỗi địa điểm hợp lệ được duyệt là nhận ngay 1.000 NGỌC (1k ngọc), KHÔNG GIỚI HẠN số lượng! Lượm nhẹ 30 - 50 địa điểm dọc đường về là bỏ túi ngay 30k - 50k (30.000 - 50.000 ngọc) đủ tiền đổ đầy bình xăng vi vu cả ngày, biến chuyến đi xa thành chuyến thắng lợi rực rỡ!\\n\` +
      \`• Nhìn gương thực tế anh em đi trước:\\n\` +
      \`  + Bác ĐÌNH HẢI âm thầm cày cuốc đã góp hơn 100 ĐỊA ĐIỂM (bỏ túi hơn 100.000 ngọc ngọt xớt)!\\n\` +
      \`  + Anh CƯƠNG cũng đã đóng góp được 75 ĐỊA ĐIỂM rồi (rủng rỉnh 75.000 ngọc tha hồ đổi quà)!\\n\` +
      \`👉 Người ta LÀM VIỆC ÂM THẦM, tiền vào túi rủng rỉnh chứ ĐỪNG CÓ NGỒI RÊN nha các bác! 👏💎\\n\\n\` +`;

if (serverContent.includes(oldComplaintSec1)) {
  serverContent = serverContent.replace(oldComplaintSec1, newComplaintSec1);
  console.log('  ✅ Updated isOrderComplaintQuery Section 1 in server.ts');
} else {
  console.log('  ⚠️ Target 4 not found in server.ts');
}

// Target 5: isHotspotInquiry section 5 in server.ts
const oldHotspotSec5 = `      \`5️⃣ 💎 LÚC VẮNG ĐƠN: Đừng quên tranh thủ mở App VietGo vào mục "Đóng góp địa điểm" cày ngọc (1.000 ngọc/điểm) kiếm thêm thu nhập nhé!\\n\\n\` +`;

const newHotspotSec5 = `      \`5️⃣ 💎 TÂM SỰ THỰC TẾ: ĐỪNG ĐỂ XE CHẠY RỖNG - CÀY NGỌC BỎ TÚI 30K-50K ĐỔ XĂNG! 🛵⛽\\n\` +
      \`• Bot chia sẻ chân tình: Lúc vắng đơn, hoặc khi nhận đơn xa (ví dụ chạy từ Còng vào Tân Trường giao xong), ĐỪNG BAO GIỜ ĐỂ XE KHÔNG CHẠY VỀ vừa tốn tiền xăng vừa uổng công!\\n\` +
      \`• Hãy dành chút thời gian dọc đường về, mở App VietGo vào mục "Đóng góp địa điểm", ghé chụp ảnh vài quán ăn, tiệm tạp hóa, xưởng, công ty, nhà máy...\\n\` +
      \`• Mỗi điểm hợp lệ duyệt là có ngay 1.000 ngọc (1k/điểm). Lượm nhẹ 30 - 50 địa điểm dọc đường về là bác tài bỏ túi 30.000 - 50.000 ngọc (30k - 50k) đổ đầy bình xăng rồi! Vừa ấm túi, vừa không lo xe chạy rỗng lỗ tiền xăng!\\n\\n\` +`;

if (serverContent.includes(oldHotspotSec5)) {
  serverContent = serverContent.replace(oldHotspotSec5, newHotspotSec5);
  console.log('  ✅ Updated isHotspotInquiry Section 5 in server.ts');
} else {
  console.log('  ⚠️ Target 5 not found in server.ts');
}

fs.writeFileSync(serverFile, serverContent, 'utf8');
console.log('🎉 Saved server.ts successfully!');

// ============================================================================
// 2. Updating zalobot/bot.js
// ============================================================================
console.log('\n2. Updating zalobot/bot.js...');

// Bot Target 1: Complaint section
const oldBotComplaint = `  • Khuyên anh em: Thời gian ngồi than phiền, rên rỉ hay lướt mạng, hãy tranh thủ mở app VietGo đi ĐÓNG GÓP ĐỊA ĐIỂM kiếm ngọc (1.000 ngọc / địa điểm hợp lệ, không giới hạn).
  • Nêu gương thực tế: Bác Đình Hải đã âm thầm góp được hơn 100 địa điểm (bỏ túi hơn 100k ngọc ngọt xớt), Anh Cương đã góp được 75 địa điểm (bỏ túi 75k ngọc tha hồ đổi quà).
  • Nhắc nhở: "LÀM VIỆC ÂM THẦM KIẾM TIỀN ĐỪNG RÊN RỈ!".`;

const newBotComplaint = `  • Khuyên anh em: Thời gian ngồi than phiền, rên rỉ hay lướt mạng, hãy tranh thủ mở app VietGo đi ĐÓNG GÓP ĐỊA ĐIỂM kiếm ngọc (1.000 ngọc / địa điểm hợp lệ, không giới hạn).
  • Phân tích tình cảm, thực tế: Chạy xe ai cũng xót tiền xăng, lúc vắng đơn hoặc chạy đơn xa (ví dụ chạy từ Còng vào Tân Trường), đừng để xe không chạy về! Dành chút thời gian dọc đường chụp 30-50 địa điểm (quán ăn, tạp hóa, công ty, xưởng...) là kiếm thêm 30k - 50k (30.000 - 50.000 ngọc) đổ đầy bình xăng rồi, biến cuốc đi xa thành cuốc bội thu.
  • Nêu gương thực tế: Bác Đình Hải đã âm thầm góp được hơn 100 địa điểm (bỏ túi hơn 100k ngọc ngọt xớt), Anh Cương đã góp được 75 địa điểm (bỏ túi 75k ngọc tha hồ đổi quà).
  • Nhắc nhở: "LÀM VIỆC ÂM THẦM KIẾM TIỀN ĐỪNG RÊN RỈ!".`;

if (botContent.includes(oldBotComplaint)) {
  botContent = botContent.replace(oldBotComplaint, newBotComplaint);
  console.log('  ✅ Updated complaint prompt in bot.js');
} else {
  console.log('  ⚠️ Bot Target 1 not found in bot.js');
}

// Bot Target 2: Knowledge section
const oldBotNgoc = `  • KHI TÀI XẾ HỎI VỀ KIẾM TIỀN / CÁCH KIẾM THÊM THU NHẬP / CÀY NGỌC: DeepSeek trả lời linh hoạt, hóm hỉnh, động viên tinh thần anh em và nhắc nhở đầy đủ các lưu ý cụ thể chuẩn xác như trên!`;

const newBotNgoc = `  • TÂM SỰ & BÍ KÍP CHÂN TÌNH CHO TÀI XẾ (PHÂN TÍCH TÌNH CẢM, THỰC TẾ):
    - Đồng cảm sâu sắc với nỗi vất vả của anh em chạy xe máy ngoài đường nắng mưa.
    - Đưa ví dụ cụ thể thực tế: Khi chạy cuốc xa (ví dụ chạy từ Còng vào Tân Trường hay các xã xa giao hàng xong), ĐỪNG BAO GIỜ ĐỂ XE KHÔNG CHẠY VỀ vừa xót tiền xăng vừa uổng công!
    - Hãy dành chút thời gian dọc đường về mở App VietGo vào mục "Đóng góp địa điểm", ghé chụp ảnh quán ăn, tiệm tạp hóa, công ty, xưởng, xí nghiệp...
    - Lượm nhẹ 30-50 địa điểm dọc đường về là bỏ túi ngay 30.000 - 50.000 ngọc (tương đương 30k - 50k) đủ tiền đổ đầy bình xăng rồi, biến chuyến đi xa thành chuyến thắng lợi rực rỡ, không lo xe chạy rỗng lỗ tiền xăng!
  • KHI TÀI XẾ HỎI VỀ KIẾM TIỀN / CÁCH KIẾM THÊM THU NHẬP / CÀY NGỌC: DeepSeek trả lời linh hoạt, hóm hỉnh, động viên tinh thần anh em và nhắc nhở đầy đủ các lưu ý cụ thể chuẩn xác như trên!`;

if (botContent.includes(oldBotNgoc)) {
  botContent = botContent.replace(oldBotNgoc, newBotNgoc);
  console.log('  ✅ Updated knowledge prompt in bot.js');
} else {
  console.log('  ⚠️ Bot Target 2 not found in bot.js');
}

fs.writeFileSync(botFile, botContent, 'utf8');
console.log('🎉 Saved zalobot/bot.js successfully!');
