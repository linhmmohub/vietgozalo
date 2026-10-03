const fs = require('fs');
const path = require('path');

const ROOT = 'c:/Users/Admin/Downloads/zalo-driver-attendance-&-fleet-check-in-system';
const serverPath = path.join(ROOT, 'server.ts');
let lines = fs.readFileSync(serverPath, 'utf8').split('\n');

// 1. Fix driver lookup in queryDeepSeekAI
// Find line where driver lookup loop starts
const driverLoopStart = lines.findIndex(l => l.includes('// 1. Search for a specific driver\'s phone number or details'));
const driverLoopEnd = lines.findIndex((l, i) => i > driverLoopStart && l.includes('// 1.5. Check for STRICT ANTI-FRAUD'));

console.log('driverLoopStart:', driverLoopStart, 'driverLoopEnd:', driverLoopEnd);

if (driverLoopStart !== -1 && driverLoopEnd !== -1) {
  const replacementDriverLoop = [
    '  // 1. Search for a specific driver\'s phone number or details (CHỈ KHI HỎI ĐÍCH DANH SĐT / LÁI XE / BIỂN SỐ)',
    '  const isDriverInquiry = (',
    '    normQ.includes(\'sdt\') || ',
    '    normQ.includes(\'so dien thoai\') || ',
    '    normQ.includes(\'dien thoai\') || ',
    '    normQ.includes(\'thong tin tai xe\') || ',
    '    normQ.includes(\'bac tai\') || ',
    '    normQ.includes(\'tai xe\') || ',
    '    normQ.includes(\'bien so\') || ',
    '    normQ.includes(\'xe so\') || ',
    '    normQ.startsWith(\'tim \') ||',
    '    normQ.startsWith(\'tra cuu \')',
    '  );',
    '',
    '  const wordsQ = normQ.split(/\\s+/);',
    '',
    '  for (const drv of drivers) {',
    '    const normName = normalizeText(drv.name);',
    '    const nameWords = normName.split(\' \');',
    '    const lastName = nameWords[nameWords.length - 1]; // e.g. "tuan", "trong", "nam"',
    '    const plateClean = cleanPlate(drv.licensePlate).toLowerCase();',
    '    const phoneTail = getPhoneTail(drv.phone);',
    '',
    '    const matchesFullName = normQ.includes(normName);',
    '    const matchesLastName = wordsQ.includes(lastName);',
    '    const matchesPlate = plateClean.length >= 4 && (wordsQ.includes(plateClean) || normQ.includes(plateClean));',
    '    const matchesTail = phoneTail.length === 4 && wordsQ.includes(phoneTail);',
    '',
    '    if (',
    '      (isDriverInquiry && (matchesFullName || matchesLastName || matchesPlate || matchesTail)) ||',
    '      (matchesFullName && (normQ.includes(\'anh \') || normQ.includes(\'bac \') || normQ.includes(\'chu \')))',
    '    ) {',
    '      const today = getTodayString();',
    '      const rec = attendanceRecords.find(r => r.driverId === drv.id && r.date === today);',
    '      let statusText = \'chưa điểm danh ca hôm nay\';',
    '      if (rec) {',
    '        if (rec.status === \'on_time\') statusText = `đã có mặt (đúng giờ lúc ${rec.checkInTime})`;',
    '        else if (rec.status === \'late\') statusText = `đã có mặt (đi trễ ${rec.lateMinutes}p)`;',
    '        else if (rec.status === \'leave\') statusText = `hôm nay nghỉ phép (${rec.leaveReason || \'việc bận\'})`;',
    '        else if (rec.status === \'completed\') statusText = `đã hoàn thành ca lúc ${rec.checkOutTime}`;',
    '      }',
    '',
    '      return `🤖 [THÔNG TIN TÀI XẾ THEO YÊU CẦU]\\n` +',
    '        `👤 Bác tài: ${drv.name}\\n` +',
    '        `📞 Số điện thoại: ${drv.phone} (Mã điểm danh: ${phoneTail})\\n` +',
    '        `🚗 Biển số: ${drv.licensePlate} (${drv.vehicleType})\\n` +',
    '        `📍 Tuyến phụ trách: ${drv.route}\\n` +',
    '        `⏰ Trạng thái hôm nay: ${statusText}\\n` +',
    '        (drv.notes ? `📝 Ghi chú: ${drv.notes}\\n` : \'\') +',
    '        `Cần hỗ trợ thêm gì bác cứ nhắn em nhé! 🚚`;',
    '    }',
    '  }'
  ];

  lines.splice(driverLoopStart, driverLoopEnd - driverLoopStart, ...replacementDriverLoop);
  console.log('✅ Successfully replaced driver inquiry loop with strict word-boundary check!');
}

// 2. Add isSimpleCallingBot in processZaloMessage before cleanPrompt
const cleanPromptIdx = lines.findIndex(l => l.includes('if (isAITriggered) {'));
console.log('cleanPromptIdx:', cleanPromptIdx);

if (cleanPromptIdx !== -1) {
  const callingBotCheck = [
    '  // Tình huống chỉ gọi Bot đơn thuần (Bot ơi, bót ơi, rồi bót, alo bot, ê bot...)',
    '  const isSimpleCallingBot = (',
    '    normMsg === \'bot\' ||',
    '    normMsg === \'bot oi\' ||',
    '    normMsg === \'bot a\' ||',
    '    normMsg === \'roi bot\' ||',
    '    normMsg === \'roi bot oi\' ||',
    '    normMsg === \'alo bot\' ||',
    '    normMsg === \'e bot\' ||',
    '    normMsg === \'bot dau\' ||',
    '    normMsg === \'bot dau roi\' ||',
    '    normMsg === \'bot co do khong\' ||',
    '    normMsg === \'bot co day khong\' ||',
    '    normMsg === \'goi bot\' ||',
    '    normMsg === \'chao bot\' ||',
    '    normMsg === \'oi bot\' ||',
    '    normMsg === \'hoi bot\' ||',
    '    normMsg === \'bac bot\' ||',
    '    normMsg === \'anh bot\' ||',
    '    normMsg === \'bac bot oi\' ||',
    '    normMsg === \'anh bot oi\'',
    '  );',
    '',
    '  if (isSimpleCallingBot) {',
    '    const aiAnswer = await queryDeepSeekAI(\'bot ơi\', senderName);',
    '    return {',
    '      action: \'ai_query\',',
    '      reply: aiAnswer,',
    '      success: true',
    '    };',
    '  }',
    ''
  ];

  lines.splice(cleanPromptIdx, 0, ...callingBotCheck);
  console.log('✅ Successfully inserted isSimpleCallingBot handler in processZaloMessage!');
}

fs.writeFileSync(serverPath, lines.join('\n'), 'utf8');
console.log('🎉 Saved updated server.ts!');
