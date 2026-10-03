const fs = require('fs');
const path = require('path');

const ROOT = 'c:/Users/Admin/Downloads/zalo-driver-attendance-&-fleet-check-in-system';
const serverPath = path.join(ROOT, 'server.ts');
let lines = fs.readFileSync(serverPath, 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('// 1. Search for a specific driver\'s phone number or details'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('// 1.5. Check for STRICT ANTI-FRAUD'));

console.log('startIdx:', startIdx, 'endIdx:', endIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = [
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
    '  if (isDriverInquiry) {',
    '    const wordsQ = normQ.split(/\\s+/);',
    '    let matchedDriver: Driver | null = null;',
    '',
    '    // Priority 1: Full name match',
    '    for (const drv of drivers) {',
    '      const normName = normalizeText(drv.name);',
    '      if (normQ.includes(normName)) { matchedDriver = drv; break; }',
    '    }',
    '',
    '    // Priority 2: License plate or phone tail match',
    '    if (!matchedDriver) {',
    '      for (const drv of drivers) {',
    '        const plateClean = cleanPlate(drv.licensePlate).toLowerCase();',
    '        const phoneTail = getPhoneTail(drv.phone);',
    '        if ((plateClean.length >= 4 && normQ.includes(plateClean)) || (phoneTail.length === 4 && wordsQ.includes(phoneTail))) {',
    '          matchedDriver = drv; break;',
    '        }',
    '      }',
    '    }',
    '',
    '    // Priority 3: Title + Name (e.g. "anh tuan", "bac bon", "chu tinh")',
    '    if (!matchedDriver) {',
    '      const honorifics = [\'anh\', \'bac\', \'chu\', \'em\', \'ong\', \'ba\'];',
    '      for (const drv of drivers) {',
    '        const normName = normalizeText(drv.name);',
    '        const nameWords = normName.split(\' \');',
    '        const lastName = nameWords[nameWords.length - 1];',
    '        for (const h of honorifics) {',
    '          if (normQ.includes(h + \' \' + lastName)) {',
    '            matchedDriver = drv; break;',
    '          }',
    '        }',
    '        if (matchedDriver) break;',
    '      }',
    '    }',
    '',
    '    // Priority 4: Last name match (excluding ambiguous honorific prefixes)',
    '    if (!matchedDriver) {',
    '      for (const drv of drivers) {',
    '        const normName = normalizeText(drv.name);',
    '        const nameWords = normName.split(\' \');',
    '        const lastName = nameWords[nameWords.length - 1];',
    '        if ((lastName === \'anh\' || lastName === \'bac\') && !normQ.includes(\'mai dac anh\') && !normQ.includes(\'trung anh\') && !normQ.includes(\'anh anh\')) {',
    '          continue;',
    '        }',
    '        if (wordsQ.includes(lastName)) {',
    '          matchedDriver = drv; break;',
    '        }',
    '      }',
    '    }',
    '',
    '    if (matchedDriver) {',
    '      const drv = matchedDriver;',
    '      const phoneTail = getPhoneTail(drv.phone);',
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

  lines.splice(startIdx, endIdx - startIdx, ...replacement);
  fs.writeFileSync(serverPath, lines.join('\n'), 'utf8');
  console.log('✅ Successfully updated driver inquiry block in server.ts');
}
