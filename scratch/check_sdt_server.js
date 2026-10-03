const fs = require('fs');

const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');

console.log('=== REMAINING SĐT IN server.ts ===');
lines.forEach((l, idx) => {
  if (l.includes('SĐT') || l.includes('sdt') || l.includes('phoneTail') || l.includes('d.phone') || l.includes('{phone}')) {
    console.log((idx + 1) + ': ' + l.trim());
  }
});
