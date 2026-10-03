const fs = require('fs');
const path = require('path');

const serverFile = path.resolve(__dirname, '../server.ts');
let serverContent = fs.readFileSync(serverFile, 'utf8');

console.log('1. Fixing weather vs leave conflict in server.ts...');

// 1. Expand isQuestion in server.ts
const oldIsQuestion = `  // Check if message is a Question intended for AI (e.g. asking for driver phone, route, warehouse, general question)
  const isQuestion = 
    message.includes('?') || 
    normMsg.includes('cho hoi') || 
    normMsg.includes('sdt') || `;

const newIsQuestion = `  // Check if message is a Question intended for AI (e.g. asking for driver phone, route, warehouse, weather, general question)
  const isQuestion = 
    message.includes('?') || 
    normMsg.includes('cho hoi') || 
    normMsg.includes('thoi tiet') || 
    normMsg.includes('troi mua') || 
    normMsg.includes('co mua') || 
    normMsg.includes('mua khong') || 
    normMsg.includes('troi nang') || 
    normMsg.includes('nang khong') || 
    normMsg.includes('nhiet do') || 
    normMsg.includes('du bao') || 
    normMsg.includes('sdt') || `;

if (serverContent.includes(oldIsQuestion)) {
  serverContent = serverContent.replace(oldIsQuestion, newIsQuestion);
  console.log('  ✅ Expanded isQuestion with weather keywords in server.ts');
} else {
  console.log('  ⚠️ oldIsQuestion not found in server.ts');
}

// 2. Fix isLeaveExplicit so 'nghi son' is excluded
const oldLeaveBlock = `  // Check explicit Leave keywords: nghi3389, hom nay a nghi, nay a nghi, nghi lam, xin nghi
  const isLeaveExplicit = 
    rawClean.startsWith('nghi') || 
    rawClean.startsWith('phep') || 
    normMsg.startsWith('nghi') || 
    normMsg.startsWith('xin nghi') || 
    normMsg.startsWith('bao nghi') || 
    normMsg.startsWith('phep') ||
    normMsg.includes('nghi lam') ||
    normMsg.includes('xin nghi lam') ||
    normMsg.includes('hom nay a nghi') ||
    normMsg.includes('nay a nghi') ||
    normMsg.includes('a nghi hom nay') ||
    normMsg.includes('a nghi nha') ||
    normMsg.includes('a nghi nhe') ||
    normMsg.includes('hom nay anh nghi') ||
    normMsg.includes('nay anh nghi') ||
    normMsg.includes('anh nghi hom nay') ||
    normMsg.includes('nay e nghi') ||
    normMsg.includes('nay em nghi') ||
    normMsg.includes('e xin nghi') ||
    normMsg.includes('em xin nghi') ||
    normMsg.includes('hom nay em nghi') ||
    normMsg.includes('hom nay e nghi') ||
    (normMsg.includes('nghi') && (normMsg.includes('hom nay') || normMsg.includes('nay') || normMsg.includes('ban viec') || normMsg.includes('xe hu') || normMsg.includes('om') || normMsg.includes('kham')));`;

const newLeaveBlock = `  // Loại bỏ cụm từ địa danh "nghi son" (Nghi Sơn) khỏi kiểm tra báo nghỉ kẻo nhầm lẫn
  const leaveCheckNorm = normMsg.replace(/\\bnghi\\s*son\\b/g, '');
  const leaveCheckRaw = rawClean.replace(/^nghison/i, '');

  // Check explicit Leave keywords: nghi3389, hom nay a nghi, nay a nghi, nghi lam, xin nghi
  const isLeaveExplicit = 
    leaveCheckRaw.startsWith('nghi') || 
    leaveCheckRaw.startsWith('phep') || 
    leaveCheckNorm.startsWith('nghi') || 
    leaveCheckNorm.startsWith('xin nghi') || 
    leaveCheckNorm.startsWith('bao nghi') || 
    leaveCheckNorm.startsWith('phep') ||
    leaveCheckNorm.includes('nghi lam') ||
    leaveCheckNorm.includes('xin nghi lam') ||
    leaveCheckNorm.includes('hom nay a nghi') ||
    leaveCheckNorm.includes('nay a nghi') ||
    leaveCheckNorm.includes('a nghi hom nay') ||
    leaveCheckNorm.includes('a nghi nha') ||
    leaveCheckNorm.includes('a nghi nhe') ||
    leaveCheckNorm.includes('hom nay anh nghi') ||
    leaveCheckNorm.includes('nay anh nghi') ||
    leaveCheckNorm.includes('anh nghi hom nay') ||
    leaveCheckNorm.includes('nay e nghi') ||
    leaveCheckNorm.includes('nay em nghi') ||
    leaveCheckNorm.includes('e xin nghi') ||
    leaveCheckNorm.includes('em xin nghi') ||
    leaveCheckNorm.includes('hom nay em nghi') ||
    leaveCheckNorm.includes('hom nay e nghi') ||
    (leaveCheckNorm.includes('nghi') && (leaveCheckNorm.includes('hom nay') || leaveCheckNorm.includes('nay') || leaveCheckNorm.includes('ban viec') || leaveCheckNorm.includes('xe hu') || leaveCheckNorm.includes('om') || leaveCheckNorm.includes('kham')));`;

if (serverContent.includes(oldLeaveBlock)) {
  serverContent = serverContent.replace(oldLeaveBlock, newLeaveBlock);
  console.log('  ✅ Fixed isLeaveExplicit to exclude Nghi Sơn in server.ts');
} else {
  console.log('  ⚠️ oldLeaveBlock not found in server.ts');
}

// 3. Add isWeatherMsg to isAITriggered so asking weather anywhere triggers AI immediately
const oldAITriggerBlock = `  // 6. QUESTION / DEEPSEEK AI ASSISTANT QUERY (Kích hoạt khi hỏi bot, gọi bot, than ế hoặc có tiền tố)
  const isAITriggered = isOrderComplaintMsg || mentionsBot ||
    rawClean.startsWith('ai') || `;

const newAITriggerBlock = `  // 5.8. Tự động nhận diện câu hỏi về thời tiết Nghi Sơn (nắng, mưa, bão, nhiệt độ...)
  const isWeatherMsg = (
    normMsg.includes('thoi tiet') ||
    normMsg.includes('troi mua') ||
    normMsg.includes('co mua khong') ||
    normMsg.includes('mua khong') ||
    normMsg.includes('mua gio') ||
    normMsg.includes('troi nang') ||
    normMsg.includes('nang khong') ||
    normMsg.includes('nang gat') ||
    normMsg.includes('nhiet do') ||
    normMsg.includes('du bao') ||
    (normMsg.includes('mua') && (normMsg.includes('nghi son') || normMsg.includes('tinh gia') || normMsg.includes('nay') || normMsg.includes('chieu') || normMsg.includes('toi') || normMsg.includes('sang')))
  );

  // 6. QUESTION / DEEPSEEK AI ASSISTANT QUERY (Kích hoạt khi hỏi bot, gọi bot, than ế, hỏi thời tiết hoặc có tiền tố)
  const isAITriggered = isOrderComplaintMsg || mentionsBot || isWeatherMsg ||
    rawClean.startsWith('ai') || `;

if (serverContent.includes(oldAITriggerBlock)) {
  serverContent = serverContent.replace(oldAITriggerBlock, newAITriggerBlock);
  console.log('  ✅ Added isWeatherMsg to isAITriggered in server.ts');
} else {
  console.log('  ⚠️ oldAITriggerBlock not found in server.ts');
}

fs.writeFileSync(serverFile, serverContent, 'utf8');
console.log('🎉 Successfully saved server.ts with weather fix!');
