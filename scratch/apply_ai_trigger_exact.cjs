const fs = require('fs');
const path = require('path');

const ROOT = 'c:/Users/Admin/Downloads/zalo-driver-attendance-&-fleet-check-in-system';
const serverPath = path.join(ROOT, 'server.ts');
let serverContent = fs.readFileSync(serverPath, 'utf8');

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

const newAITriggerBlock = `  // 5.6. Tự động nhận diện mọi tình huống kêu gọi Bot (Bot ơi, bót ơi, giờ phải làm sao bot, rồi bót, alo bot, ê bot...)
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
  console.log('✅ Successfully replaced AI trigger block in server.ts');
  fs.writeFileSync(serverPath, serverContent, 'utf8');
} else {
  console.warn('❌ Target block not found!');
}
