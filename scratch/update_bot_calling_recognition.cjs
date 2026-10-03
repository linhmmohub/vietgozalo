const fs = require('fs');
const path = require('path');

const ROOT = 'c:/Users/Admin/Downloads/zalo-driver-attendance-&-fleet-check-in-system';

// ==========================================
// 1. UPDATE server.ts
// ==========================================
const serverPath = path.join(ROOT, 'server.ts');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// A. Add section to aiSystemPrompt in server.ts
const botCallingInstruction = `
- NGUYÊN TẮC NHẬN DIỆN VÀ PHẢN HỒI KHI TÀI XẾ GỌI BOT:
  • Tài xế có thể gọi Bot bằng nhiều cách: "Bot ơi", "Bót ơi", "bót", "alo bot", "ê bot", hoặc đặt chữ bot ở cuối câu ("giờ phải làm sao bot", "làm thế nào bot", "sao thế bot", "rồi bót"...).
  • Trong MỌI TÌNH HUỐNG tài xế kêu gọi Bot, AI đều phải nhận diện ngay là đang gọi mình, trả lời thân thiện, nhiệt tình, đúng trọng tâm vấn đề tài xế đang hỏi.
  • Nếu tài xế chỉ gọi vu vơ "bot ơi", "bót ơi", "alo bot", "rồi bót": Chào hỏi vui vẻ, thông báo em luôn túc trực 24/7 và hỏi bác tài cần hỗ trợ sự cố, săn đơn, cày ngọc hay tra cứu gì.
  • Nếu tài xế hỏi "giờ phải làm sao bot" mà chưa rõ tình huống: Hướng dẫn ngay các tình huống thường gặp (khách không nghe máy, quán hết món, quán làm lâu, bệnh viện, ít đơn, app tắt) kèm hotline Anh Cương (0967.659.655) và Anh Sức (0969.397.370).`;

if (!serverContent.includes('NGUYÊN TẮC NHẬN DIỆN VÀ PHẢN HỒI KHI TÀI XẾ GỌI BOT')) {
  serverContent = serverContent.replace(
    'Quy tắc: Viết hoa từ ngữ để nhấn mạnh, dùng emoji sinh động',
    botCallingInstruction.trim() + '\nQuy tắc: Viết hoa từ ngữ để nhấn mạnh, dùng emoji sinh động'
  );
  console.log('✅ Added bot calling instruction to aiSystemPrompt in server.ts');
}

// B. Add isCallingBotOnly & isAskingHowToDo in queryDeepSeekAI
const targetBeforeGeneric = `  if (normQ.includes('chuc') || normQ.includes('chao') || normQ.includes('tam su') || normQ.includes('chem gio') || normQ.includes('alo') || normQ.includes('khoe khong')) {
    return \`🤖 [AI ĐỒNG HÀNH VIETGO]: Chào bác tài \${senderName}! Em luôn túc trực trong nhóm để hỗ trợ và chém gió cùng các bác đây ạ! 😄\\n\` +
      \`Chúc toàn thể anh em đội xe hôm nay:\\n\` +
      \`✨ Đường thông thoáng, không lo kẹt xe!\\n\` +
      \`✨ Giao hàng chuẩn giờ, khách khen nức nở!\\n\` +
      \`✨ Tay lái vững vàng, vạn dặm bình an! 🚚💨\\n\` +
      \`Bác cần tra cứu SĐT, kho bãi hay muốn đố vui cứ nhắn "ai [câu hỏi]" nhé!\`;
  }`;

const newBotCallingHandlers = `  // 5.6. Tài xế gọi Bot (Bot ơi, bót ơi, rồi bót, alo bot, ê bot, bot đâu rồi...)
  const isCallingBotOnly = (
    normQ === 'bot' ||
    normQ === 'bot oi' ||
    normQ === 'bot a' ||
    normQ === 'roi bot' ||
    normQ === 'roi bot oi' ||
    normQ === 'alo bot' ||
    normQ === 'e bot' ||
    normQ === 'bot dau' ||
    normQ === 'bot dau roi' ||
    normQ === 'bot co do khong' ||
    normQ === 'bot co day khong' ||
    normQ === 'goi bot' ||
    normQ === 'chao bot' ||
    normQ === 'oi bot' ||
    normQ === 'hoi bot' ||
    normQ === 'bac bot' ||
    normQ === 'anh bot' ||
    normQ === 'bac bot oi' ||
    normQ === 'anh bot oi' ||
    normQ === 'bot vietgo' ||
    normQ === 'vietgo bot'
  );

  if (isCallingBotOnly) {
    return \`🤖 [DẠ EM NGHE ĐÂY BÁC TÀI!] 🛵✨\\n\\n\` +
      \`Em là Trợ lý Bot VietGo Food Tĩnh Gia, luôn túc trực 24/7 đồng hành cùng anh em đội xe!\\n\\n\` +
      \`Bác cần em hỗ trợ gì cứ nhắn em nhé:\\n\` +
      \`• Gặp sự cố đơn hàng? (Quán hết món, khách không nghe máy, quán làm lâu, giao viện...)\\n\` +
      \`• Hỏi khung giờ & điểm nóng nổ đơn tại Tĩnh Gia?\\n\` +
      \`• Cách cày ngọc kiếm tiền từ Đóng góp địa điểm (1.000 ngọc / địa điểm)?\\n\` +
      \`• Tra cứu SĐT tài xế, hotline Anh Cương (0967.659.655) & Anh Sức (0969.397.370)?\\n\` +
      \`• Hoặc cứ tâm sự, chém gió, kể chuyện cười lúc vắng đơn nhé bác! 😄\`;
  }

  // 5.7. Tài xế hỏi chung "giờ phải làm sao bot" / "phải làm sao hả bot" / "giờ làm thế nào"
  const isAskingHowToDo = (
    normQ.includes('gio phai lam sao') ||
    normQ.includes('phai lam sao') ||
    normQ.includes('lam sao gio') ||
    normQ.includes('lam the nao') ||
    normQ.includes('gio lam sao') ||
    normQ.includes('sao bay gio') ||
    normQ.includes('cuu em voi') ||
    normQ.includes('cuu voi') ||
    normQ.includes('giup em voi')
  );

  if (isAskingHowToDo) {
    return \`🤖 [BOT VIETGO ĐÂY Ạ - BÁC TÀI ĐANG GẶP TÌNH HUỐNG NÀO THẾ Ạ?] 🛵\\n\\n\` +
      \`Bác đang gặp sự cố nào dưới đây, nhắn cho em biết để em chỉ bí kíp xử lý ngay nhé:\\n\\n\` +
      \`1️⃣ GỌI KHÁCH KHÔNG NGHE MÁY? ➔ Kết bạn Zalo nhắn: "Tài xế Vietgo không liên lạc được anh/chị". Nếu không được gọi ngay Anh Cương 0967.659.655!\\n\` +
      \`2️⃣ QUÁN HẾT MÓN / HỦY ĐƠN? ➔ Gọi ngay cho khách thương lượng đổi món tương đương, tăng tỷ lệ khách đặt lại đơn.\\n\` +
      \`3️⃣ QUÁN ĐÔNG / LÀM ĐỒ LÂU? ➔ Nhắn tin trên app cho khách: "Em tới quán rồi, quán đang chuẩn bị đồ em giao qua liền ạ" để khách yên tâm không hủy.\\n\` +
      \`4️⃣ KHÁCH BỆNH VIỆN NHỜ LÊN PHÒNG? ➔ Chịu khó gửi xe đem lên tận nơi cho khách, niềm nở tận tình ghi điểm 5 sao!\\n\` +
      \`5️⃣ VẮNG ĐƠN / ÍT ĐƠN? ➔ Tản ra mỗi người 1 vị trí, tránh tụ tập bu đông sóng yếu, hoặc mở app cày ngọc đóng góp địa điểm (1.000 ngọc/điểm)!\\n\` +
      \`6️⃣ APP BỊ TỰ TẮT / MẤT QUYỀN? ➔ Vào Cài đặt điện thoại tắt mục "Quản lý ứng dụng nếu không dùng".\\n\` +
      \`7️⃣ SỰ CỐ KHẨN CẤP KHÁC? ➔ Gọi ngay Anh Cương: 0967.659.655 hoặc Anh Sức: 0969.397.370 để điều phối hỗ trợ trực tiếp!\`;
  }

` + targetBeforeGeneric;

if (serverContent.includes(targetBeforeGeneric)) {
  serverContent = serverContent.replace(targetBeforeGeneric, newBotCallingHandlers);
  console.log('✅ Added isCallingBotOnly & isAskingHowToDo in queryDeepSeekAI in server.ts');
} else {
  console.warn('⚠️ targetBeforeGeneric not found in server.ts!');
}

// C. Update processZaloMessage to recognize any mention of bot or calling bot
const targetAITriggerBlock = `  // 6. QUESTION / DEEPSEEK AI ASSISTANT QUERY (Requires explicit prefix to prevent group spam)
  const isAITriggered = isOrderComplaintMsg || 
    rawClean.startsWith('ai') || 
    rawClean.startsWith('bot') || 
    rawClean.startsWith('hoi') ||
    rawClean.startsWith('hoidap') ||
    rawClean.startsWith('vietgo') ||
    normMsg.startsWith('ai ') ||
    normMsg.startsWith('ai:') ||
    normMsg.startsWith('ai,') ||
    normMsg.startsWith('ai oi') ||
    normMsg.startsWith('ai ơi') ||
    normMsg.startsWith('@ai') ||
    normMsg.startsWith('/ai') ||
    normMsg.startsWith('!ai') ||
    normMsg.startsWith('bot ') ||
    normMsg.startsWith('bot:') ||
    normMsg.startsWith('bot,') ||
    normMsg.startsWith('bot oi') ||
    normMsg.startsWith('bot ơi') ||
    normMsg.startsWith('@bot') ||
    normMsg.startsWith('/bot') ||
    normMsg.startsWith('!bot') ||
    normMsg.startsWith('hoi ') ||
    normMsg.startsWith('hỏi ') ||
    normMsg.startsWith('vietgo ') ||
    normMsg.startsWith('hoi ai') ||
    normMsg.startsWith('hỏi ai') ||
    normMsg.startsWith('hoi bot') ||
    normMsg.startsWith('hỏi bot');

  if (isAITriggered) {
    // Clean prefix to get actual question/chit-chat prompt
    let cleanPrompt = message
      .replace(/^(?:@ai|\\/ai|!ai|ai|@bot|\\/bot|!bot|bot|hỏi|hoi|vietgo)\\s*[:\\-,\\.]?\\s*/i, '')
      .replace(/^(?:ơi|oi)\\s*[:\\-,\\.]?\\s*/i, '')
      .trim();
    if (!cleanPrompt) cleanPrompt = message.trim();`;

const newAITriggerBlock = `  // 5.6. Tự động nhận diện mọi tình huống kêu gọi Bot (Bot ơi, bót ơi, giờ phải làm sao bot, rồi bót, alo bot...)
  const wordsInNorm = normMsg.split(/\\s+/);
  const mentionsBot = (
    wordsInNorm.includes('bot') || 
    rawClean.includes('bot') || 
    rawClean.includes('bót') ||
    /\\b(?:bot|bót)\\b/i.test(message)
  );

  // 6. QUESTION / DEEPSEEK AI ASSISTANT QUERY (Kích hoạt khi hỏi bot, gọi bot, than ế hoặc có tiền tố)
  const isAITriggered = isOrderComplaintMsg || mentionsBot ||
    rawClean.startsWith('ai') || 
    rawClean.startsWith('bot') || 
    rawClean.startsWith('bót') || 
    rawClean.startsWith('hoi') ||
    rawClean.startsWith('hoidap') ||
    rawClean.startsWith('vietgo') ||
    normMsg.startsWith('ai ') ||
    normMsg.startsWith('ai:') ||
    normMsg.startsWith('ai,') ||
    normMsg.startsWith('ai oi') ||
    normMsg.startsWith('ai ơi') ||
    normMsg.startsWith('@ai') ||
    normMsg.startsWith('/ai') ||
    normMsg.startsWith('!ai') ||
    normMsg.startsWith('bot ') ||
    normMsg.startsWith('bot:') ||
    normMsg.startsWith('bot,') ||
    normMsg.startsWith('bot oi') ||
    normMsg.startsWith('bot ơi') ||
    normMsg.startsWith('@bot') ||
    normMsg.startsWith('/bot') ||
    normMsg.startsWith('!bot') ||
    normMsg.startsWith('hoi ') ||
    normMsg.startsWith('hỏi ') ||
    normMsg.startsWith('vietgo ') ||
    normMsg.startsWith('hoi ai') ||
    normMsg.startsWith('hỏi ai') ||
    normMsg.startsWith('hoi bot') ||
    normMsg.startsWith('hỏi bot');

  if (isAITriggered) {
    // Làm sạch từ gọi bot ở đầu câu hoặc cuối câu để lấy nội dung câu hỏi
    let cleanPrompt = message
      .replace(/^(?:@ai|\\/ai|!ai|ai|@bot|\\/bot|!bot|bot|bót|hỏi|hoi|vietgo)\\b\\s*[:\\-,\\.]?\\s*/gi, '')
      .replace(/^(?:alo|này|bác|anh|ơi|oi|à|a|ê|e)\\b\\s*[:\\-,\\.]?\\s*/gi, '')
      .replace(/\\s*(?:nhỉ|nhi|hả|ha|nhé|nhe|nha|với|voi|ạ|a|được không|duoc khong|thế|the|vậy|vay)?\\s*(?:hả|ha)?\\s*(?:bot|bót|ai)\\b\\s*(?:ơi|oi|à|a)?[\\s\\.\\?!]*$/gi, '')
      .trim();
    if (!cleanPrompt || cleanPrompt.length < 2) cleanPrompt = message.trim();`;

if (serverContent.includes(targetAITriggerBlock)) {
  serverContent = serverContent.replace(targetAITriggerBlock, newAITriggerBlock);
  console.log('✅ Updated isAITriggered and cleanPrompt in server.ts');
} else {
  console.warn('⚠️ targetAITriggerBlock not found in server.ts!');
}

fs.writeFileSync(serverPath, serverContent, 'utf8');
console.log('🎉 Successfully saved server.ts');

// ==========================================
// 2. UPDATE zalobot/bot.js
// ==========================================
const botPath = path.join(ROOT, 'zalobot/bot.js');
let botContent = fs.readFileSync(botPath, 'utf8');

// A. Add instruction to askDeepSeekDirectly prompt in bot.js
if (!botContent.includes('NGUYÊN TẮC NHẬN DIỆN VÀ PHẢN HỒI KHI TÀI XẾ GỌI BOT')) {
  botContent = botContent.replace(
    '- NGUYÊN TẮC BẢO MẬT SĐT TÀI XẾ:',
    botCallingInstruction.trim() + '\n- NGUYÊN TẮC BẢO MẬT SĐT TÀI XẾ:'
  );
  console.log('✅ Added bot calling instruction to askDeepSeekDirectly in bot.js');
}

// B. Update isAIQuestion in bot.js to recognize any mentions of bot / bót
const oldIsAIQuestion = `function isAIQuestion(text) {
  if (!text || typeof text !== 'string') return false;
  const raw = text.trim();
  const lower = raw.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[đĐ]/g, 'd');
  
  const isComplaint = (`;

const newIsAIQuestion = `function isAIQuestion(text) {
  if (!text || typeof text !== 'string') return false;
  const raw = text.trim();
  const lower = raw.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[đĐ]/g, 'd');
  const words = lower.split(/\\s+/);

  const mentionsBot = (
    words.includes('bot') || 
    lower.includes('bot') || 
    lower.includes('bót') ||
    /\\b(?:bot|bót)\\b/i.test(raw)
  );

  const isComplaint = (`;

if (botContent.includes(oldIsAIQuestion)) {
  botContent = botContent.replace(oldIsAIQuestion, newIsAIQuestion);
  botContent = botContent.replace('return (\n    isComplaint ||', 'return (\n    mentionsBot ||\n    isComplaint ||');
  console.log('✅ Updated isAIQuestion in bot.js');
} else {
  console.warn('⚠️ oldIsAIQuestion not found in bot.js!');
}

fs.writeFileSync(botPath, botContent, 'utf8');
console.log('🎉 Successfully saved zalobot/bot.js');
