const fs = require('fs');
const path = require('path');

const ROOT = 'c:/Users/Admin/Downloads/zalo-driver-attendance-&-fleet-check-in-system';

// ==========================================
// 1. UPDATE server.ts
// ==========================================
const serverPath = path.join(ROOT, 'server.ts');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// A. Update section 4 of aiSystemPrompt in server.ts
const oldPromptSec4 = `4. KHI TÀI XẾ HỎI Ở ĐÂU LẮM ĐƠN / ĐỨNG ĐÂU NỔ ĐƠN / SĂN ĐƠN / Ế QUÁ:
   • Tư vấn hài hước, dựa vào khung giờ chỉ điểm:
     - Sáng 6h-9h: Hải Bình, Hải Yến.
     - Trưa 10h-13h: Kiếm chỗ mát quanh Cầu Còng đợi.
     - Chiều 13h-15h: Bình Minh bản xứ & Hải Bình Đậu Hi.
     - Tan tầm 16h-18h: Gỏi Vịt Nhân Loan (tái định cư Hải Bình).
     - Tối 19h-21h: Khu vực Phố Còng / Cầu Còng.
     - Tối 21h đổ đi: Đường đôi Hải Bình làm trùm đơn đêm.
     - Đêm 22h-23h: Quán ăn đêm gần ngân hàng VIB, Mai Hương, Gấu Cola.
   • Nhắc nhở: Giờ cao điểm nắng mưa chịu khó làm việc, sắp xếp khu vực không tụ tập đông 1 chỗ kẻo dẫm chân nhau.`;

const newPromptSec4 = `4. KHI TÀI XẾ HỎI Ở ĐÂU LẮM ĐƠN / ĐỨNG ĐÂU NỔ ĐƠN / SĂN ĐƠN / Ế QUÁ / THAN PHIỀN ÍT ĐƠN / KHÔNG CÓ ĐƠN / RÊN RỈ:
   • TRẢ LỜI GÓP Ý Ở GÓC ĐỘ VUI VẺ, HÀI HƯỚC, KHÔNG GẮT GỎNG:
     - Khuyên tài xế: Thời gian ngồi than phiền, rên rỉ hay lướt mạng, hãy tranh thủ thời gian mở App VietGo đi ĐÓNG GÓP ĐỊA ĐIỂM để cày ngọc kiếm thêm thu nhập (1.000 ngọc / địa điểm hợp lệ, không giới hạn).
     - Nêu gương điển hình thực tế:
       + Bác ĐÌNH HẢI đã âm thầm đóng góp được hơn 100 ĐỊA ĐIỂM rồi (bỏ túi hơn 100k ngọc ngọt xớt)!
       + Anh CƯƠNG cũng đã đóng góp được 75 ĐỊA ĐIỂM rồi (bỏ túi 75k ngọc tha hồ đổi quà)!
       + Nhắc nhở anh em: "LÀM VIỆC ÂM THẦM KIẾM TIỀN ĐỪNG RÊN RỈ!".
     - NGUYÊN TẮC SÓNG MẠNG & BẮN ĐƠN:
       + TUYỆT ĐỐI TRÁNH TỤ TẬP BU ĐÔNG 1 CHỖ! Tụ tập đông người làm sóng di động 4G và GPS bị nghẽn, sóng yếu chập chờn thì máy chủ hệ thống SẼ KHÔNG THỂ BẮN ĐƠN ĐƯỢC tới máy tài xế!
       + NGUYÊN TẮC VÀNG: "MỖI NGƯỜI 1 VỊ TRÍ", tản đều ra các ngã đường, chia mỏng lực lượng thì sóng mạng mới căng, máy chủ quét tọa độ mới dễ bắn đơn nổ liên tục!
     - GỢI Ý ĐIỂM NÓNG THEO GIỜ TẠI TĨNH GIA:
       - Sáng 6h-9h: Hải Bình, Hải Yến.
       - Trưa 10h-13h: Kiếm chỗ mát quanh Cầu Còng đợi đơn cơm.
       - Chiều 13h-15h: Bình Minh bản xứ & Hải Bình Đậu Hi.
       - Tan tầm 16h-18h: Gỏi Vịt Nhân Loan (tái định cư Hải Bình).
       - Tối 19h-21h: Khu vực Phố Còng / Cầu Còng.
       - Tối 21h đổ đi: Đường đôi Hải Bình làm trùm đơn đêm.
       - Đêm 22h-23h: Quán ăn đêm gần ngân hàng VIB, Mai Hương, Gấu Cola.`;

if (serverContent.includes(oldPromptSec4)) {
  serverContent = serverContent.replace(oldPromptSec4, newPromptSec4);
  console.log('✅ Updated aiSystemPrompt section 4 in server.ts');
} else {
  console.warn('⚠️ oldPromptSec4 not found in server.ts, checking alternate pattern...');
}

// B. Add rule-based isOrderComplaint handler in queryDeepSeekAI in server.ts
const targetBeforeToan = `  // 2.6. Cảnh báo khách Toàn Định Hải
  const isToanDinhHai = (`;

const orderComplaintCode = `  // 2.5.5. Góp ý vui vẻ cho tài xế hay than phiền ít đơn, không có đơn, than ế, rên rỉ
  const isOrderComplaintQuery = (
    normQ.includes('it don') ||
    normQ.includes('ít đơn') ||
    normQ.includes('khong co don') ||
    normQ.includes('không có đơn') ||
    normQ.includes('ko co don') ||
    normQ.includes('k co don') ||
    normQ.includes('chua co don') ||
    normQ.includes('chưa có đơn') ||
    normQ.includes('e qua') ||
    normQ.includes('ế quá') ||
    normQ.includes('e don') ||
    normQ.includes('ế đơn') ||
    normQ.includes('e am') ||
    normQ.includes('ế ẩm') ||
    normQ.includes('e moc mom') ||
    normQ.includes('than e') ||
    normQ.includes('than ế') ||
    normQ.includes('doi kem') ||
    normQ.includes('đói kém') ||
    normQ.includes('doi meo') ||
    normQ.includes('đói meo') ||
    normQ.includes('sao it don') ||
    normQ.includes('sao ít đơn') ||
    normQ.includes('sao khong co don') ||
    normQ.includes('sao không có đơn') ||
    normQ.includes('sao k co don') ||
    normQ.includes('sao ko co don') ||
    normQ.includes('chang co don') ||
    normQ.includes('chẳng có đơn') ||
    normQ.includes('cha co don') ||
    normQ.includes('chả có đơn') ||
    normQ.includes('chua no don') ||
    normQ.includes('chưa nổ đơn') ||
    normQ.includes('khong no don') ||
    normQ.includes('không nổ đơn') ||
    normQ.includes('chua thay no') ||
    normQ.includes('chưa thấy nổ') ||
    normQ.includes('khong no') ||
    normQ.includes('không nổ') ||
    normQ.includes('ko no') ||
    normQ.includes('ngoi choi') ||
    normQ.includes('ngồi chơi') ||
    normQ.includes('ngoi hong') ||
    normQ.includes('ngồi hóng') ||
    normQ.includes('ngoi bu') ||
    normQ.includes('ngồi bu') ||
    normQ.includes('khong co cuoc') ||
    normQ.includes('không có cuốc') ||
    normQ.includes('it cuoc') ||
    normQ.includes('ít cuốc') ||
    normQ.includes('chan qua khong co') ||
    normQ.includes('chán quá không có') ||
    (normQ.includes('chan qua') && normQ.includes('don')) ||
    normQ.includes('ren it don') ||
    normQ.includes('rên ít đơn') ||
    normQ.includes('ren ri') ||
    normQ.includes('rên rỉ') ||
    normQ.includes('than phien') ||
    normQ.includes('than phiền') ||
    normQ.includes('doi don') ||
    normQ.includes('đói đơn') ||
    normQ.includes('khong ban don') ||
    normQ.includes('không bắn đơn') ||
    normQ.includes('ko ban don') ||
    normQ.includes('sao khong ban') ||
    normQ.includes('chac doi') ||
    normQ.includes('chắc đói') ||
    normQ.includes('vang don') ||
    normQ.includes('vắng đơn') ||
    (normQ.includes('don') && (normQ.includes('it') || normQ.includes('cham') || normQ.includes('e') || normQ.includes('khong co') || normQ.includes('ko co') || normQ.includes('vang')))
  );

  if (isOrderComplaintQuery) {
    return \`🛵 [GÓP Ý VUI VẺ TỪ BOT: THAY VÌ RÊN ÍT ĐƠN - HÃY ĐI CÀY NGỌC KIẾM TIỀN!] 💎✨\\n\\n\` +
      \`Ối dồi ôi bác tài ơi! Lại ca bài ca "ế đơn" với "chẳng có đơn nào" rồi! 😂\\n\` +
      \`Ngồi một chỗ than phiền rên rỉ thì đơn cũng có tự rụng vào tay đâu, nghe bot góp ý chân tình mà cực kỳ vui vẻ này nha:\\n\\n\` +
      \`1️⃣ THỜI GIAN NGỒI THAN PHIỀN ➔ HÃY ĐI ĐÓNG GÓP ĐỊA ĐIỂM KIẾM NGỌC:\\n\` +
      \`• Lúc vắng đơn, thay vì ngồi lướt điện thoại than thở, các bác mở ngay App VietGo vào mục "Đóng góp địa điểm" mà kiếm thêm thu nhập!\\n\` +
      \`• Mỗi địa điểm hợp lệ (chụp rõ biển hiệu, số nhà, tên quán...) được duyệt là nhận ngay 1.000 NGỌC (1k ngọc), KHÔNG GIỚI HẠN số lượng!\\n\` +
      \`• Nhìn gương bác ĐÌNH HẢI kia kìa: Âm thầm cày cuốc đã góp được hơn 100 ĐỊA ĐIỂM rồi (bỏ túi hơn 100.000 ngọc ngọt xớt)!\\n\` +
      \`• Anh CƯƠNG cũng đã đóng góp được 75 ĐỊA ĐIỂM rồi đấy (rủng rỉnh 75.000 ngọc tha hồ đổi quà)!\\n\` +
      \`👉 Người ta LÀM VIỆC ÂM THẦM, tiền vào túi rủng rỉnh chứ ĐỪNG CÓ NGỒI RÊN nha các bác! 👏💎\\n\\n\` +
      \`2️⃣ ⛔ BÍ MẬT KỸ THUẬT: TRÁNH TỤ TẬP BU ĐÔNG - SÓNG YẾU KHÔNG BẮN ĐƠN ĐƯỢC!\\n\` +
      \`• Anh em hay có thói quen hễ vắng đơn là kéo nhau lại một quán nước ngồi bu đông tán gẫu.\\n\` +
      \`• Khi tụ tập bu đông 1 chỗ: SÓNG 4G VÀ GPS BỊ NGHẼN, SÓNG YẾU CHẬP CHỜN thì hệ thống máy chủ KHÔNG THỂ BẮN ĐƠN tới máy các bác được!\\n\` +
      \`• 🎯 NGUYÊN TẮC VÀNG: MỖI NGƯỜI 1 VỊ TRÍ! Tản đều ra các ngã đường, chia mỏng lực lượng thì sóng mạng mới căng đét, máy chủ quét định vị mới bắn đơn chuẩn xác, ai cũng nổ đơn đều tay!\\n\\n\` +
      \`3️⃣ GỢI Ý ĐIỂM NÓNG THEO GIỜ TẠI TĨNH GIA:\\n\` +
      \`• Sáng 6h-9h: Hải Bình, Hải Yến (ăn sáng, cafe).\\n\` +
      \`• Trưa 10h-13h: Kiếm chỗ mát quanh Cầu Còng đón đơn cơm văn phòng.\\n\` +
      \`• Đầu chiều 13h-15h: Bình Minh bản xứ & Hải Bình Đậu Hi (trà sữa, ăn vặt).\\n\` +
      \`• Tan tầm 16h-18h: Gỏi Vịt Nhân Loan (tái định cư Hải Bình).\\n\` +
      \`• Tối 19h-21h: Khu vực Phố Còng / Cầu Còng.\\n\` +
      \`• Tối 21h đổ đi: Đường đôi Hải Bình làm trùm đơn đêm.\\n\\n\` +
      \`Đứng dậy xách xe lên, mỗi người một vị trí hoặc đi lụm vài địa điểm kiếm ngọc ngay thôi các bác ơi! Chúc anh em nổ đơn ầm ầm, tiền về đầy túi! 🛵💨🔥\`;
  }\n\n` + targetBeforeToan;

if (serverContent.includes(targetBeforeToan)) {
  serverContent = serverContent.replace(targetBeforeToan, orderComplaintCode);
  console.log('✅ Added isOrderComplaintQuery handler in queryDeepSeekAI in server.ts');
} else {
  console.warn('⚠️ targetBeforeToan not found in server.ts!');
}

// C. Update processZaloMessage to automatically respond to order complaints without needing 'ai' or 'bot' prefix
const targetProcessAI = `  // 6. QUESTION / DEEPSEEK AI ASSISTANT QUERY (Requires explicit prefix to prevent group spam)
  const isAITriggered = `;

const newProcessAI = `  // 5.5. Tự động nhận diện rên rỉ than ế, ít đơn, không có đơn để góp ý vui vẻ
  const isOrderComplaintMsg = (
    normMsg.includes('it don') ||
    normMsg.includes('khong co don') ||
    normMsg.includes('ko co don') ||
    normMsg.includes('k co don') ||
    normMsg.includes('chua co don') ||
    normMsg.includes('e qua') ||
    normMsg.includes('e don') ||
    normMsg.includes('e am') ||
    normMsg.includes('e moc mom') ||
    normMsg.includes('than e') ||
    normMsg.includes('doi kem') ||
    normMsg.includes('doi meo') ||
    normMsg.includes('sao it don') ||
    normMsg.includes('sao khong co don') ||
    normMsg.includes('chang co don') ||
    normMsg.includes('cha co don') ||
    normMsg.includes('chua no don') ||
    normMsg.includes('khong no don') ||
    normMsg.includes('ko no don') ||
    normMsg.includes('chua thay no') ||
    normMsg.includes('khong no') ||
    normMsg.includes('ngoi choi') ||
    normMsg.includes('ngoi hong') ||
    normMsg.includes('ngoi bu') ||
    normMsg.includes('khong co cuoc') ||
    normMsg.includes('it cuoc') ||
    normMsg.includes('ren it don') ||
    normMsg.includes('ren ri') ||
    normMsg.includes('than phien') ||
    normMsg.includes('doi don') ||
    normMsg.includes('khong ban don') ||
    normMsg.includes('ko ban don') ||
    normMsg.includes('sao khong ban') ||
    normMsg.includes('chac doi') ||
    normMsg.includes('vang don') ||
    (normMsg.includes('don') && (normMsg.includes('it') || normMsg.includes('cham') || normMsg.includes('e') || normMsg.includes('khong co') || normMsg.includes('ko co') || normMsg.includes('vang')))
  );

  // 6. QUESTION / DEEPSEEK AI ASSISTANT QUERY (Requires explicit prefix to prevent group spam)
  const isAITriggered = isOrderComplaintMsg || `;

if (serverContent.includes(targetProcessAI)) {
  serverContent = serverContent.replace(targetProcessAI, newProcessAI);
  console.log('✅ Updated processZaloMessage to handle order complaints automatically in server.ts');
} else {
  console.warn('⚠️ targetProcessAI not found in server.ts!');
}

fs.writeFileSync(serverPath, serverContent, 'utf8');
console.log('🎉 Successfully saved server.ts');

// ==========================================
// 2. UPDATE zalobot/bot.js
// ==========================================
const botPath = path.join(ROOT, 'zalobot/bot.js');
let botContent = fs.readFileSync(botPath, 'utf8');

// A. Update isAIQuestion in bot.js
const oldIsAIQuestion = `function isAIQuestion(text) {
  if (!text || typeof text !== 'string') return false;
  const raw = text.trim();
  const lower = raw.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[đĐ]/g, 'd');
  
  return (
    lower.startsWith('bot') ||`;

const newIsAIQuestion = `function isAIQuestion(text) {
  if (!text || typeof text !== 'string') return false;
  const raw = text.trim();
  const lower = raw.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[đĐ]/g, 'd');
  
  const isComplaint = (
    lower.includes('it don') ||
    lower.includes('khong co don') ||
    lower.includes('ko co don') ||
    lower.includes('k co don') ||
    lower.includes('e qua') ||
    lower.includes('e don') ||
    lower.includes('than e') ||
    lower.includes('ren') ||
    lower.includes('than phien') ||
    lower.includes('doi don') ||
    lower.includes('khong ban don') ||
    (lower.includes('don') && (lower.includes('it') || lower.includes('e')))
  );

  return (
    isComplaint ||
    lower.startsWith('bot') ||`;

if (botContent.includes(oldIsAIQuestion)) {
  botContent = botContent.replace(oldIsAIQuestion, newIsAIQuestion);
  console.log('✅ Updated isAIQuestion in bot.js');
} else {
  console.warn('⚠️ oldIsAIQuestion not found in bot.js!');
}

// B. Update fallback prompt in bot.js
const oldBotSec = `- KHI TÀI XẾ HỎI Ở ĐÂU NHIỀU ĐƠN / ĐỨNG ĐÂU / THAN Ế:
  • Hài hước, điều hướng, trấn an bác tài. Xem giờ hiện tại để chỉ điểm nóng phù hợp.
  • Nhắc nhở: Giờ cao điểm nắng hay mưa cũng chịu khó làm việc, không hết cao điểm đơn lại lẻ tẻ rồi tiếc!
  • Nhắc nhở: Sắp xếp khu vực cho tốt, TUYỆT ĐỐI KHÔNG TỤ TẬP BU ĐÔNG 1 CHỖ để tránh dẫm chân nhau, chia mỏng ra các điểm nóng thì ai cũng nổ đơn liên tục!`;

const newBotSec = `- KHI TÀI XẾ HỎI Ở ĐÂU NHIỀU ĐƠN / ĐỨNG ĐÂU / THAN Ế / RÊN ÍT ĐƠN / KHÔNG CÓ ĐƠN:
  • TRẢ LỜI GÓP Ý Ở GÓC ĐỘ VUI VẺ, HÀI HƯỚC, KHÔNG GẮT GỎNG:
  • Khuyên anh em: Thời gian ngồi than phiền, rên rỉ hay lướt mạng, hãy tranh thủ mở app VietGo đi ĐÓNG GÓP ĐỊA ĐIỂM kiếm ngọc (1.000 ngọc / địa điểm hợp lệ, không giới hạn).
  • Nêu gương thực tế: Bác Đình Hải đã âm thầm góp được hơn 100 địa điểm (bỏ túi hơn 100k ngọc ngọt xớt), Anh Cương đã góp được 75 địa điểm (bỏ túi 75k ngọc tha hồ đổi quà).
  • Nhắc nhở: "LÀM VIỆC ÂM THẦM KIẾM TIỀN ĐỪNG RÊN RỈ!".
  • NGUYÊN TẮC SÓNG & BẮN ĐƠN: TUYỆT ĐỐI TRÁNH TỤ TẬP BU ĐÔNG 1 CHỖ! Tụ tập đông người làm sóng 4G và GPS bị nghẽn, sóng yếu thì máy chủ KHÔNG THỂ BẮN ĐƠN ĐƯỢC!
  • NGUYÊN TẮC VÀNG: "MỖI NGƯỜI 1 VỊ TRÍ", tản đều ra các ngã đường, điểm nóng thì sóng mới căng, máy chủ mới dễ bắn đơn nổ liên tục!
  • Điểm nóng theo giờ Tĩnh Gia: Sáng (Hải Bình, Hải Yến), Trưa (Cầu Còng), Chiều (Bình Minh, Đậu Hi), Tan tầm (Gỏi Vịt Nhân Loan), Tối (Phố Còng), Đêm (Đường đôi Hải Bình).`;

if (botContent.includes(oldBotSec)) {
  botContent = botContent.replace(oldBotSec, newBotSec);
  console.log('✅ Updated prompt in askDeepSeekDirectly in bot.js');
} else {
  console.warn('⚠️ oldBotSec not found in bot.js!');
}

fs.writeFileSync(botPath, botContent, 'utf8');
console.log('🎉 Successfully saved zalobot/bot.js');
