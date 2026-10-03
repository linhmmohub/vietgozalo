const fs = require('fs');

const content = fs.readFileSync('server.ts', 'utf8');
const driversMatch = content.match(/drivers:\s*Driver\[\]\s*=\s*\[([\s\S]*?)\];/);
const drivers = eval('[' + driversMatch[1] + ']');

function findDriver(normQ) {
  const wordsQ = normQ.split(/\s+/);
  
  // 1. First priority: Exact Full Name Match
  for (const drv of drivers) {
    const normName = drv.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-z0-9]/g, ' ').trim();
    if (normQ.includes(normName)) return drv;
  }

  // 2. Second priority: License plate or Phone tail match
  for (const drv of drivers) {
    const plateClean = drv.licensePlate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const phoneTail = drv.phone.slice(-4);
    if ((plateClean.length >= 4 && normQ.includes(plateClean)) || (phoneTail.length === 4 && wordsQ.includes(phoneTail))) {
      return drv;
    }
  }

  // 3. Third priority: Specific title + Name (e.g. 'anh tuan', 'bac bon', 'chu tinh')
  const honorifics = ['anh', 'bac', 'chu', 'em', 'ong', 'ba'];
  for (const drv of drivers) {
    const normName = drv.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-z0-9]/g, ' ').trim();
    const nameWords = normName.split(' ');
    const lastName = nameWords[nameWords.length - 1];

    for (const h of honorifics) {
      if (normQ.includes(h + ' ' + lastName)) {
        return drv;
      }
    }
  }

  // 4. Fourth priority: Single Last Name match (excluding honorific confusion)
  for (const drv of drivers) {
    const normName = drv.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-z0-9]/g, ' ').trim();
    const nameWords = normName.split(' ');
    const lastName = nameWords[nameWords.length - 1];

    // If lastName is 'anh' or 'bac', do not match if it was used as an honorific prefix
    if ((lastName === 'anh' || lastName === 'bac') && !normQ.includes('mai dac anh') && !normQ.includes('trung anh') && !normQ.includes('anh anh')) {
      continue;
    }

    if (wordsQ.includes(lastName)) {
      return drv;
    }
  }

  return null;
}

console.log('Target for "ai sdt anh Tuấn":', findDriver('ai sdt anh tuan')?.name);
console.log('Target for "ai sdt Mai Đắc Anh":', findDriver('ai sdt mai dac anh')?.name);
console.log('Target for "ai sdt bác Bốn":', findDriver('ai sdt bac bon')?.name);
console.log('Target for "ai sdt Trung 2876":', findDriver('ai sdt trung 2876')?.name);
