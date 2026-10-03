const fs = require('fs');
const path = require('path');

const ROOT = 'c:/Users/Admin/Downloads/zalo-driver-attendance-&-fleet-check-in-system';

// ==========================================
// 1. UPDATE server.ts
// ==========================================
const serverPath = path.join(ROOT, 'server.ts');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// A. Insert getCurrentHotspotGuidance function after getVietnamMinute
const hotspotFunctionCode = `
interface HotspotGuidance {
  timeStr: string;
  timeSlotName: string;
  currentHotspot: string;
  reason: string;
  nextTip: string;
}

function getCurrentHotspotGuidance(date: Date = new Date()): HotspotGuidance {
  const hour = getVietnamHour(date);
  const minute = getVietnamMinute(date);
  const timeStr = \`\${String(hour).padStart(2, '0')}:\${String(minute).padStart(2, '0')}\`;

  if (hour >= 6 && hour < 10) {
    return {
      timeStr,
      timeSlotName: 'Sáng sớm & Điểm tâm (06:00 - 10:00)',
      currentHotspot: 'Khu vực Hải Bình và Hải Yến',
      reason: 'Bà con dậy sớm ăn sáng, các quán bún bò, phở, bánh cuốn, cafe sáng nổ đơn liên tục!',
      nextTip: 'Tầm gần trưa (từ 10h) bác nhớ tản dần về khu vực Cầu Còng đón đầu đơn cơm văn phòng nhé!'
    };
  } else if (hour >= 10 && (hour < 13 || (hour === 13 && minute < 30))) {
    return {
      timeStr,
      timeSlotName: 'Trưa cao điểm cơm trưa (10:00 - 13:30)',
      currentHotspot: 'Tìm chỗ râm mát quanh khu vực Cầu Còng',
      reason: 'Cao điểm cơm trưa văn phòng, công ty và các quán ăn quanh phố Còng đang nổ đơn ầm ầm!',
      nextTip: 'Tới đầu chiều (sau 13h30) hãy ghé Bình Minh bản xứ hoặc Hải Bình Đậu Hi săn đơn trà sữa, đồ uống.'
    };
  } else if ((hour === 13 && minute >= 30) || (hour >= 14 && hour < 16)) {
    return {
      timeStr,
      timeSlotName: 'Đầu chiều ăn vặt & Trà sữa (13:30 - 16:00)',
      currentHotspot: 'Khu vực Bình Minh bản xứ & Hải Bình Đậu Hi',
      reason: 'Khung giờ vàng của các đơn trà sữa, chè, đồ uống giải nhiệt và ăn vặt của giới trẻ, chị em!',
      nextTip: 'Tầm 16h-18h người ta tan ca về tắm rửa ít đơn hơn, ghé Gỏi Vịt Nhân Loan (Hải Bình) nổ đều nhất.'
    };
  } else if (hour >= 16 && hour < 19) {
    return {
      timeStr,
      timeSlotName: 'Tan tầm & Chiều muộn (16:00 - 19:00)',
      currentHotspot: 'Gỏi Vịt Nhân Loan (tái định cư Hải Bình) & các quán đồ nhắm/ăn sớm',
      reason: 'Giờ tan ca bà con về nghỉ ngơi, các quán đồ nhậu, vịt nổ đơn sớm rất đều tay!',
      nextTip: 'Sau 19h nhớ tản ra khu vực Phố Còng / Cầu Còng đón bão đơn ăn tối gia đình nhé!'
    };
  } else if (hour >= 19 && (hour < 21 || (hour === 21 && minute < 30))) {
    return {
      timeStr,
      timeSlotName: 'Tối cao điểm bữa ăn gia đình (19:00 - 21:30)',
      currentHotspot: 'Khu vực Phố Còng / Cầu Còng',
      reason: 'Khung giờ vàng ăn tối gia đình, phố ẩm thực ăn uống sầm uất nhất Nghi Sơn nổ đơn liên tục!',
      nextTip: 'Sau 21h30 đêm dạt dần về trục Đường đôi Hải Bình làm trùm đơn đêm.'
    };
  } else {
    return {
      timeStr,
      timeSlotName: 'Đêm muộn & Khuya (21:30 - 06:00 sáng)',
      currentHotspot: 'Đường đôi Hải Bình & các quán ăn đêm gần ngân hàng VIB, Mai Hương, Gấu Cola',
      reason: 'Trùm đơn đêm của Tĩnh Gia, phục vụ các cú đêm ăn khuya, nướng lẩu, cháo đêm!',
      nextTip: 'Sáng sớm mai từ 6h lại tản ra đón đơn bún phở tại Hải Bình, Hải Yến nhé bác tài!'
    };
  }
}
`;

if (!serverContent.includes('function getCurrentHotspotGuidance')) {
  serverContent = serverContent.replace(
    'const todayStr = getTodayString();',
    hotspotFunctionCode.trim() + '\n\nconst todayStr = getTodayString();'
  );
  console.log('✅ Added getCurrentHotspotGuidance helper to server.ts');
}

// B. Update aiSystemPrompt section 4 in server.ts
const oldPromptSec4 = `4. KHI TÀI XẾ HỎI Ở ĐÂU LẮM ĐƠN / ĐỨNG ĐÂU NỔ ĐƠN / SĂN ĐƠN / Ế QUÁ / THAN PHIỀN ÍT ĐƠN / KHÔNG CÓ ĐƠN / RÊN RỈ:
   • TRẢ LỜI GÓP Ý Ở GÓC ĐỘ VUI VẺ, HÀI HƯỚC, KHÔNG GẮT GỎNG:
     - Khuyên tài xế: Thời gian ngồi than phiền, rên rỉ hay lướt mạng, hãy tranh thủ thời gian mở App VietGo đi ĐÓNG GÓP ĐỊA ĐIỂM để cày ngọc kiếm thêm thu nhập (1.000 ngọc / địa điểm hợp lệ, không giới hạn).
     - Nêu gương điển hình thực tế:
       + Bác ĐÌNH HẢI đã âm thầm đóng góp được hơn 100 ĐỊA ĐIỂM rồi (bỏ túi hơn 100k ngọc ngọt xớt)!
       + Anh CƯƠNG cũng đã đóng góp được 75 ĐỊA ĐIỂM rồi (bỏ túi 75k ngọc tha hồ đổi quà)!
       + Nhắc nhở anh em: "LÀM VIỆC ÂM THẦM KIẾM TIỀN ĐỪNG RÊN RỈ!".
     - NGUYÊN TẮC SÓNG MẠNG & BẮN ĐƠN:
       + TUYỆT ĐỐI TRÁNH TỤ TẬP BU ĐÔNG 1 CHỖ! Tụ tập đông người làm sóng di động 4G và GPS bị nghẽn, sóng yếu chập chờn thì máy chủ hệ thống SẼ KHÔNG THỂ BẮN ĐƠN ĐƯỢC tới máy tài xế!
       + NGUYÊN TẮC VÀNG: "MỖI NGƯỜI 1 VỊ TRÍ", tản đều ra các ngã đường, điểm nóng thì sóng mới căng, máy chủ quét tọa độ mới dễ bắn đơn nổ liên tục!
     - GỢI Ý ĐIỂM NÓNG THEO GIỜ TẠI TĨNH GIA:
       - Sáng 6h-9h: Hải Bình, Hải Yến.
       - Trưa 10h-13h: Kiếm chỗ mát quanh Cầu Còng đợi đơn cơm.
       - Chiều 13h-15h: Bình Minh bản xứ & Hải Bình Đậu Hi.
       - Tan tầm 16h-18h: Gỏi Vịt Nhân Loan (tái định cư Hải Bình).
       - Tối 19h-21h: Khu vực Phố Còng / Cầu Còng.
       - Tối 21h đổ đi: Đường đôi Hải Bình làm trùm đơn đêm.
       - Đêm 22h-23h: Quán ăn đêm gần ngân hàng VIB, Mai Hương, Gấu Cola.`;

const newPromptSec4 = `4. KHI TÀI XẾ HỎI Ở ĐÂU LẮM ĐƠN / ĐỨNG ĐÂU NỔ ĐƠN / SĂN ĐƠN / Ế QUÁ / THAN PHIỀN ÍT ĐƠN / KHÔNG CÓ ĐƠN / RÊN RỈ:
   • TRẢ LỜI GÓP Ý Ở GÓC ĐỘ VUI VẺ, HÀI HƯỚC, KHÔNG GẮT GỎNG:
     - Khuyên tài xế: Thời gian ngồi than phiền, rên rỉ hay lướt mạng, hãy tranh thủ thời gian mở App VietGo đi ĐÓNG GÓP ĐỊA ĐIỂM để cày ngọc kiếm thêm thu nhập (1.000 ngọc / địa điểm hợp lệ, không giới hạn).
     - Nêu gương điển hình thực tế:
       + Bác ĐÌNH HẢI đã âm thầm đóng góp được hơn 100 ĐỊA ĐIỂM rồi (bỏ túi hơn 100k ngọc ngọt xớt)!
       + Anh CƯƠNG cũng đã đóng góp được 75 ĐỊA ĐIỂM rồi (bỏ túi 75k ngọc tha hồ đổi quà)!
       + Nhắc nhở anh em: "LÀM VIỆC ÂM THẦM KIẾM TIỀN ĐỪNG RÊN RỈ!".
     - NGUYÊN TẮC SÓNG MẠNG & BẮN ĐƠN:
       + TUYỆT ĐỐI TRÁNH TỤ TẬP BU ĐÔNG 1 CHỖ! Tụ tập đông người làm sóng di động 4G và GPS bị nghẽn, sóng yếu chập chờn thì máy chủ hệ thống SẼ KHÔNG THỂ BẮN ĐƠN ĐƯỢC tới máy tài xế!
       + NGUYÊN TẮC VÀNG: "MỖI NGƯỜI 1 VỊ TRÍ", tản đều ra các ngã đường, điểm nóng thì sóng mới căng, máy chủ quét tọa độ mới dễ bắn đơn nổ liên tục!
     - QUY TẮC GỢI Ý ĐIỂM NÓNG THEO GIỜ THỰC TẾ (CỰC KỲ QUAN TRỌNG):
       • TUYỆT ĐỐI KHÔNG GỬI TẤT CẢ CÁC KHUNG GIỜ CÙNG MỘT LÚC!
       • Phải căn cứ vào thời điểm trực tiếp tài xế hỏi đang thuộc khung giờ nào để chỉ điểm đúng 1 điểm nóng phù hợp lúc đó:
         - Sáng sớm (06:00 - 10:00): Hải Bình, Hải Yến (ăn sáng, cafe).
         - Trưa cao điểm (10:00 - 13:30): Tìm chỗ mát quanh Cầu Còng đón đơn cơm văn phòng.
         - Đầu chiều (13:30 - 16:00): Bình Minh bản xứ & Hải Bình Đậu Hi (trà sữa, ăn vặt).
         - Tan tầm (16:00 - 19:00): Gỏi Vịt Nhân Loan (tái định cư Hải Bình).
         - Tối cao điểm (19:00 - 21:30): Khu vực Phố Còng / Cầu Còng.
         - Đêm muộn & Khuya (21:30 - 06:00): Đường đôi Hải Bình làm trùm đơn đêm & quán ăn đêm gần VIB, Mai Hương, Gấu Cola.
     - NHẮC NHỞ QUAN TRỌNG VỀ TỶ LỆ NHẬN ĐƠN & THẢ TRÔI ĐƠN:
       • Khi hệ thống phát đơn: TUYỆT ĐỐI KHÔNG TỪ CHỐI NHIỀU hoặc THẢ TRÔI HẾT HẠN!
       • Từ chối hoặc để trôi đơn sẽ làm tụt tỷ lệ nhận đơn (Acceptance Rate), thuật toán hệ thống sẽ đánh giá thấp và hạn chế bắn đơn tiếp theo cho tài xế! Cố gắng nhận và giao đơn để giữ tài khoản uy tín cao.
     - QUY ĐỊNH NGHỈ CHẠY / KHÔNG HOẠT ĐỘNG:
       • Nếu không hoạt động, không chạy được nữa (bận việc, hỏng xe, nghỉ ca): BẮT BUỘC TẮT APP VÀ CHECKOUT OFF (nhắn off[mã]) NGAY LẬP TỨC để hệ thống nhận diện và điều phối đơn cho tài xế khác đang sẵn sàng!`;

if (serverContent.includes(oldPromptSec4)) {
  serverContent = serverContent.replace(oldPromptSec4, newPromptSec4);
  console.log('✅ Updated aiSystemPrompt section 4 in server.ts');
}

// C. Update isOrderComplaintQuery and add isHotspotInquiry in queryDeepSeekAI
let lines = serverContent.split('\n');

const orderComplaintStart = lines.findIndex(l => l.includes('if (isOrderComplaintQuery) {'));
const orderComplaintEnd = lines.findIndex((l, i) => i > orderComplaintStart && l.includes('// 2.6. Cảnh báo khách Toàn Định Hải'));

console.log('orderComplaintStart:', orderComplaintStart, 'orderComplaintEnd:', orderComplaintEnd);

if (orderComplaintStart !== -1 && orderComplaintEnd !== -1) {
  const newComplaintAndHotspotCode = [
    '  if (isOrderComplaintQuery) {',
    '    const hotspot = getCurrentHotspotGuidance(new Date());',
    '',
    '    return `🛵 [GÓP Ý VUI VẺ TỪ BOT: THAY VÌ RÊN ÍT ĐƠN - HÃY ĐI CÀY NGỌC KIẾM TIỀN!] 💎✨\\n\\n` +',
    '      `Ối dồi ôi bác tài ơi! Lại ca bài ca "ế đơn" với "chẳng có đơn nào" rồi! 😂\\n` +',
    '      `Ngồi một chỗ than phiền rên rỉ thì đơn cũng có tự rụng vào tay đâu, nghe bot góp ý chân tình mà cực kỳ vui vẻ này nha:\\n\\n` +',
    '      `1️⃣ THỜI GIAN NGỒI THAN PHIỀN ➔ HÃY ĐI ĐÓNG GÓP ĐỊA ĐIỂM KIẾM NGỌC:\\n` +',
    '      `• Lúc vắng đơn, thay vì ngồi lướt điện thoại than thở, các bác mở ngay App VietGo vào mục "Đóng góp địa điểm" mà kiếm thêm thu nhập!\\n` +',
    '      `• Mỗi địa điểm hợp lệ (chụp rõ biển hiệu, số nhà, tên quán...) được duyệt là nhận ngay 1.000 NGỌC (1k ngọc), KHÔNG GIỚI HẠN số lượng!\\n` +',
    '      `• Nhìn gương bác ĐÌNH HẢI kia kìa: Âm thầm cày cuốc đã góp được hơn 100 ĐỊA ĐIỂM rồi (bỏ túi hơn 100.000 ngọc ngọt xớt)!\\n` +',
    '      `• Anh CƯƠNG cũng đã đóng góp được 75 ĐỊA ĐIỂM rồi đấy (rủng rỉnh 75.000 ngọc tha hồ đổi quà)!\\n` +',
    '      `👉 Người ta LÀM VIỆC ÂM THẦM, tiền vào túi rủng rỉnh chứ ĐỪNG CÓ NGỒI RÊN nha các bác! 👏💎\\n\\n` +',
    '      `2️⃣ ⛔ BÍ MẬT KỸ THUẬT: TRÁNH TỤ TẬP BU ĐÔNG - SÓNG YẾU KHÔNG BẮN ĐƠN ĐƯỢC!\\n` +',
    '      `• Anh em hay có thói quen hễ vắng đơn là kéo nhau lại một quán nước ngồi bu đông tán gẫu.\\n` +',
    '      `• Khi tụ tập bu đông 1 chỗ: SÓNG 4G VÀ GPS BỊ NGHẼN, SÓNG YẾU CHẬP CHỜN thì hệ thống máy chủ KHÔNG THỂ BẮN ĐƠN tới máy các bác được!\\n` +',
    '      `• 🎯 NGUYÊN TẮC VÀNG: MỖI NGƯỜI 1 VỊ TRÍ! Tản đều ra các ngã đường, chia mỏng lực lượng thì sóng mạng mới căng đét, máy chủ quét định vị mới bắn đơn chuẩn xác, ai cũng nổ đơn đều tay!\\n\\n` +',
    '      `3️⃣ 📍 ĐIỂM NÓNG GỢI Ý HIỆN TẠI (LÚC ${hotspot.timeStr}):\\n` +',
    '      `• Khung giờ: ${hotspot.timeSlotName}\\n` +',
    '      `👉 Bác tài hãy tản ngay về: ${hotspot.currentHotspot}!\\n` +',
    '      `• Tình hình đơn: ${hotspot.reason}\\n` +',
    '      `💡 Mẹo đón đầu: ${hotspot.nextTip}\\n\\n` +',
    '      `4️⃣ ⚠️ LƯU Ý SỐNG CÒN: TỶ LỆ NHẬN ĐƠN & KHÔNG THẢ TRÔI HẾT HẠN!\\n` +',
    '      `• Khi hệ thống phát đơn: TUYỆT ĐỐI KHÔNG TỪ CHỐI NHIỀU hoặc THẢ TRÔI ĐƠN HẾT HẠN!\\n` +',
    '      `• Thả trôi hoặc từ chối đơn sẽ làm TỤT TỶ LỆ NHẬN ĐƠN (Acceptance Rate) thê thảm. Thuật toán hệ thống sẽ ĐÁNH GIÁ THẤP VÀ HẠN CHẾ BẮN ĐƠN TIẾP THEO cho máy của bác tài! Hãy cố gắng nhận và giao đơn để giữ tài khoản uy tín cao, đơn nổ liên tục!\\n\\n` +',
    '      `5️⃣ 🛑 KHÔNG HOẠT ĐỘNG / KHÔNG CHẠY ĐƯỢC ➔ TẮT APP & CHECKOUT OFF NGAY LẬP TỨC!\\n` +',
    '      `• Nếu bận việc riêng, xe cộ sự cố, mệt mỏi hoặc không chạy tiếp được nữa: BẮT BUỘC PHẢI TẮT APP và nhắn lệnh "off[mã]" (hoặc checkout) NGAY LẬP TỨC!\\n` +',
    '      `• TUYỆT ĐỐI KHÔNG treo app bật online rồi bỏ đi làm việc khác để đơn trôi làm lỡ dở đơn của khách và quán.\\n` +',
    '      `• Việc tắt app & checkout giúp hệ thống nhận diện chính xác để ĐIỀU PHỐI ĐƠN HÀNG CHO CÁC TÀI XẾ KHÁC ĐANG SẴN SÀNG CHẠY!\\n\\n` +',
    '      `Đứng dậy xách xe lên, mỗi người một vị trí hoặc đi lụm vài địa điểm kiếm ngọc ngay thôi các bác ơi! Chúc anh em nổ đơn ầm ầm, tiền về đầy túi! 🛵💨🔥`;',
    '  }',
    '',
    '  // 2.5.6. Gợi ý điểm nóng săn đơn theo giờ thực tế (Khi tài xế hỏi đứng đâu / ở đâu nhiều đơn)',
    '  const isHotspotInquiry = (',
    '    normQ.includes(\'dung dau\') ||',
    '    normQ.includes(\'đứng đâu\') ||',
    '    normQ.includes(\'o dau nhieu don\') ||',
    '    normQ.includes(\'ở đâu nhiều đơn\') ||',
    '    normQ.includes(\'o dau lam don\') ||',
    '    normQ.includes(\'ở đâu lắm đơn\') ||',
    '    normQ.includes(\'san don\') ||',
    '    normQ.includes(\'săn đơn\') ||',
    '    normQ.includes(\'diem nong\') ||',
    '    normQ.includes(\'điểm nóng\') ||',
    '    normQ.includes(\'khu nao nhieu don\') ||',
    '    normQ.includes(\'khu nào nhiều đơn\') ||',
    '    normQ.includes(\'dung o dau\') ||',
    '    normQ.includes(\'đứng ở đâu\') ||',
    '    normQ.includes(\'gio nay dung dau\') ||',
    '    normQ.includes(\'giờ này đứng đâu\') ||',
    '    normQ.includes(\'bay gio dung dau\') ||',
    '    normQ.includes(\'bây giờ đứng đâu\') ||',
    '    normQ.includes(\'cho nao nhieu don\') ||',
    '    normQ.includes(\'chỗ nào nhiều đơn\')',
    '  );',
    '',
    '  if (isHotspotInquiry) {',
    '    const hotspot = getCurrentHotspotGuidance(new Date());',
    '',
    '    return `🛵 [GỢI Ý ĐIỂM NÓNG NỔ ĐƠN THEO GIỜ THỰC TẾ TẠI TĨNH GIA] 📍✨\\n\\n` +',
    '      `Chào bác tài! Lúc này là ${hotspot.timeStr} (${hotspot.timeSlotName}), nghe bot chỉ điểm nóng chuẩn đét để đón đơn nhé:\\n\\n` +',
    '      `1️⃣ 📍 ĐIỂM NÓNG NÊN ĐỨNG NGAY LÚC NÀY:\\n` +',
    '      `👉 Bác hãy tản ngay về: ${hotspot.currentHotspot}!\\n` +',
    '      `• Tình hình đơn: ${hotspot.reason}\\n` +',
    '      `💡 Mẹo đón đầu: ${hotspot.nextTip}\\n\\n` +',
    '      `2️⃣ ⛔ NGUYÊN TẮC VÀNG: MỖI NGƯỜI 1 VỊ TRÍ - TRÁNH BU ĐÔNG SÓNG YẾU!\\n` +',
    '      `• Tản đều ra các ngã đường, tuyệt đối KHÔNG tụ tập bu đông 1 quán nước kẻo nghẽn sóng 4G/GPS máy chủ không bắn đơn được!\\n\\n` +',
    '      `3️⃣ ⚠️ LƯU Ý SỐNG CÒN: TỶ LỆ NHẬN ĐƠN & KHÔNG THẢ TRÔI HẾT HẠN!\\n` +',
    '      `• Đơn bắn tới nhớ nhận và giao nhiệt tình, TUYỆT ĐỐI KHÔNG từ chối nhiều hay thả trôi hết hạn kẻo tụt tỷ lệ nhận đơn (Acceptance Rate) và bị thuật toán hạn chế phát đơn tiếp theo!\\n\\n` +',
    '      `4️⃣ 🛑 KHÔNG HOẠT ĐỘNG / NGHỈ CHẠY ➔ TẮT APP & CHECKOUT OFF NGAY LẬP TỨC!\\n` +',
    '      `• Nếu không chạy được nữa, bác tài hãy tắt app và gõ "off[mã]" ngay để hệ thống kịp điều phối đơn cho anh em khác!\\n\\n` +',
    '      `5️⃣ 💎 LÚC VẮNG ĐƠN: Đừng quên tranh thủ mở App VietGo vào mục "Đóng góp địa điểm" cày ngọc (1.000 ngọc/điểm) kiếm thêm thu nhập nhé!\\n\\n` +',
    '      `Chúc bác tài chọn đúng điểm nóng, nổ đơn liên tục mỏi tay! 🛵💨🔥`;',
    '  }'
  ];

  lines.splice(orderComplaintStart, orderComplaintEnd - orderComplaintStart, ...newComplaintAndHotspotCode);
  serverContent = lines.join('\n');
  console.log('✅ Updated isOrderComplaintQuery and added isHotspotInquiry in server.ts');
}

fs.writeFileSync(serverPath, serverContent, 'utf8');
console.log('🎉 Successfully saved server.ts!');

// ==========================================
// 2. UPDATE zalobot/bot.js
// ==========================================
const botPath = path.join(ROOT, 'zalobot/bot.js');
let botContent = fs.readFileSync(botPath, 'utf8');

// A. Update isAIQuestion in bot.js to include hotspot queries
const targetIsAIQuestionStart = 'function isAIQuestion(text) {';
if (botContent.includes(targetIsAIQuestionStart)) {
  botContent = botContent.replace(
    'lower.includes(\'khong ban don\') ||',
    'lower.includes(\'khong ban don\') ||\n    lower.includes(\'dung dau\') ||\n    lower.includes(\'nhieu don\') ||\n    lower.includes(\'san don\') ||\n    lower.includes(\'diem nong\') ||\n    lower.includes(\'dung o dau\') ||'
  );
  console.log('✅ Added hotspot keywords to isAIQuestion in bot.js');
}

// B. Update askDeepSeekDirectly prompt in bot.js
const oldBotSec = `  • Điểm nóng theo giờ Tĩnh Gia: Sáng (Hải Bình, Hải Yến), Trưa (Cầu Còng), Chiều (Bình Minh, Đậu Hi), Tan tầm (Gỏi Vịt Nhân Loan), Tối (Phố Còng), Đêm (Đường đôi Hải Bình).`;

const newBotSec = `  • QUY TẮC GỢI Ý ĐIỂM NÓNG THEO GIỜ THỰC TẾ:
    - TUYỆT ĐỐI KHÔNG GỬI TẤT CẢ CÁC KHUNG GIỜ CÙNG MỘT LÚC!
    - Xem giờ hiện tại để chỉ điểm đúng 1 điểm nóng linh hoạt theo khung giờ đang diễn ra (Sáng 6h-10h: Hải Bình/Hải Yến; Trưa 10h-13h30: Cầu Còng; Chiều 13h30-16h: Bình Minh/Đậu Hi; Tan tầm 16h-19h: Gỏi Vịt Nhân Loan; Tối 19h-21h30: Phố Còng/Cầu Còng; Đêm 21h30 đổ đi: Đường đôi Hải Bình).
  • CẢNH BÁO TỶ LỆ NHẬN ĐƠN & THẢ TRÔI ĐƠN:
    - Khi hệ thống bắn đơn: TUYỆT ĐỐI KHÔNG từ chối nhiều hoặc thả trôi hết hạn! Sẽ làm tụt tỷ lệ nhận đơn (Acceptance Rate), bị thuật toán hạ ưu tiên và hạn chế phát đơn tiếp theo! Hãy cố gắng nhận và giao đơn để giữ uy tín cao.
  • QUY ĐỊNH NGHỈ CHẠY / KHÔNG HOẠT ĐỘNG:
    - Nếu không hoạt động, không chạy được nữa (bận việc, hỏng xe...): BẮT BUỘC tắt app và nhắn lệnh checkout off (off[mã]) ngay lập tức để hệ thống điều phối cho tài xế khác đang sẵn sàng!`;

if (botContent.includes(oldBotSec)) {
  botContent = botContent.replace(oldBotSec, newBotSec);
  console.log('✅ Updated dynamic hotspot & order policy prompt in bot.js');
} else {
  console.warn('⚠️ oldBotSec not found in bot.js!');
}

fs.writeFileSync(botPath, botContent, 'utf8');
console.log('🎉 Successfully saved zalobot/bot.js!');
