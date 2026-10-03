/**
 * =========================================================================
 * ZALO FLEET ATTENDANCE & DEEPSEEK AI BOT GATEWAY (24/7 STANDALONE)
 * =========================================================================
 * - Tự động lưu phiên đăng nhập (Cookie, IMEI, UserAgent).
 * - ĐÃ QUÉT QR 1 LẦN THÌ LẦN SAU KHÔNG PHẢI QUÉT LẠI (Chỉ quét khi Cookie hết hạn).
 * - Kết nối Webhook localhost:3000 để ghi nhận điểm danh, ca trực, báo nghỉ.
 * - Tự động gọi trực tiếp DeepSeek AI nếu Webhook server cục bộ chưa bật.
 * =========================================================================
 */

const { Zalo, LoginQRCallbackEventType, ThreadType } = require('zca-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

// Tải biến môi trường từ file .env (thử cả thư mục gốc và thư mục zalobot)
const rootEnvPath = path.resolve(__dirname, '../.env');
const localEnvPath = path.resolve(__dirname, '.env');
if (fs.existsSync(rootEnvPath)) {
  try { require('dotenv').config({ path: rootEnvPath }); } catch (e) {}
} else if (fs.existsSync(localEnvPath)) {
  try { require('dotenv').config({ path: localEnvPath }); } catch (e) {}
}

const CONFIG = {
  WEBHOOK_URL: process.env.WEBHOOK_URL || 'http://localhost:3000/api/zalo/webhook',
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'zalobot_secret_key_2026',
  SESSION_FILE: path.resolve(__dirname, 'zalo_session.json'),
  ROOT_SESSION_FILE: path.resolve(__dirname, '../zalo_session.json'),
  QR_PATH: path.resolve(__dirname, 'qr.png'),
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
  AUTO_REPLY: true,
  HEALTH_CHECK_INTERVAL_MS: 30000  // 30 giây kiểm tra server 1 lần
};

const LOG_FILE = path.resolve(__dirname, 'bot.log');
const OFFLINE_QUEUE_FILE = path.resolve(__dirname, 'offline_queue.json');
// Tránh crash tiến trình khi gặp lỗi mạng không bắt được
process.on('uncaughtException', (err) => {
  console.error('[⚠️ Uncaught Exception in bot.js]:', err.message || err);
  logToFile(`[CRASH PREVENTED] Uncaught Exception: ${err.message}`);
});
process.on('unhandledRejection', (reason) => {
  console.warn('[⚠️ Unhandled Rejection in bot.js]:', reason);
});


function logToFile(msg) {
  try {
    fs.appendFileSync(LOG_FILE, `[${new Date().toLocaleString()}] ${msg}\n`, 'utf8');
  } catch (e) {}
}

function getImageMetaData(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    let offset = 2;
    while (offset < buf.length - 8) {
      if (buf[offset] !== 0xff) { offset++; continue; }
      const marker = buf[offset + 1];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        return {
          width: buf.readUInt16BE(offset + 7),
          height: buf.readUInt16BE(offset + 5),
          size: buf.length
        };
      }
      offset += 2 + buf.readUInt16BE(offset + 2);
    }
    return { width: 591, height: 1280, size: buf.length };
  } catch (e) {
    return { width: 591, height: 1280, size: 86031 };
  }
}

// =========================================================================
// HỆ THỐNG HÀNG ĐỢI OFFLINE - Lưu lệnh điểm danh khi server chưa bật
// =========================================================================
function loadOfflineQueue() {
  try {
    if (fs.existsSync(OFFLINE_QUEUE_FILE)) {
      const raw = fs.readFileSync(OFFLINE_QUEUE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {}
  return [];
}

function saveOfflineQueue(queue) {
  try {
    fs.writeFileSync(OFFLINE_QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8');
  } catch (e) {}
}

function addToOfflineQueue(payload, targetThread, threadType, isGroup) {
  const queue = loadOfflineQueue();
  // Tránh duplicate: không thêm nếu cùng sender + cùng message trong 5 phút
  const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
  const isDuplicate = queue.some(q =>
    q.payload.senderId === payload.senderId &&
    q.payload.message === payload.message &&
    q.enqueuedAt > fiveMinsAgo
  );
  if (isDuplicate) return;
  queue.push({
    payload,
    targetThread,
    threadType,
    isGroup,
    enqueuedAt: Date.now()
  });
  saveOfflineQueue(queue);
  console.log(`[📥 Queue] Đã lưu vào hàng đợi offline: "${payload.message}" từ ${payload.senderName}`);
  logToFile(`[📥 QUEUE] Lưu hàng đợi: "${payload.message}" từ ${payload.senderName}`);
}


// =========================================================================
// TỰ ĐỘNG GIÁM SÁT & BẬT MÁY CHỦ PORT 3000 (Tự phục hồi vĩnh viễn)
// =========================================================================
let serverChildProcess = null;
let isStartingServer = false;

async function ensureServerRunning() {
  const alive = await isServerAlive();
  if (alive) return true;
  if (isStartingServer) return false;
  
  isStartingServer = true;
  console.log('[🚀 Tự Động Bật Server] Phát hiện máy chủ port 3000 chưa bật. Bot đang tự động bật server.ts...');
  logToFile('[🚀 TỰ ĐỘNG BẬT SERVER] Đang khởi động server.ts...');

  const rootDir = path.resolve(__dirname, '..');
  const tsxCli = path.resolve(rootDir, 'node_modules/tsx/dist/cli.mjs');
  const serverScript = path.resolve(rootDir, 'server.ts');

  try {
    serverChildProcess = child_process.spawn(process.execPath, [tsxCli, serverScript], {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    serverChildProcess.stdout.on('data', (d) => {
      const text = d.toString();
      if (text.includes('SERVER READY') || text.includes('PORT 3000')) {
        console.log('[✅ Server Auto-Start] Máy chủ trung tâm cổng 3000 đã sẵn sàng!');
        logToFile('[✅ SERVER AUTO-START] Máy chủ 3000 đã chạy thành công');
        isStartingServer = false;
      }
    });

    serverChildProcess.on('exit', (code) => {
      console.warn(`[⚠️ Server Exit] server.ts đã dừng (exit code ${code}).`);
      serverChildProcess = null;
      isStartingServer = false;
    });

    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 1000));
      if (await isServerAlive()) {
        isStartingServer = false;
        return true;
      }
    }
  } catch (err) {
    console.error('❌ Không thể tự động khởi động server.ts:', err.message);
    isStartingServer = false;
  }
  return false;
}

// Kiểm tra server có sẵn sàng không
async function isServerAlive() {
  try {
    const http = require('http');
    return await new Promise((resolve) => {
      const req = http.get('http://localhost:3000/api/health', { timeout: 3000 }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  } catch (e) {
    return false;
  }
}

// Phát lại toàn bộ hàng đợi offline sau khi server khởi động lại
async function replayOfflineQueue(api) {
  const queue = loadOfflineQueue();
  if (!queue.length) return;

  console.log(`[🔄 Replay] Phát lại ${queue.length} lệnh điểm danh từ hàng đợi offline...`);
  logToFile(`[🔄 REPLAY] Bắt đầu phát lại ${queue.length} lệnh offline`);

  const headersConfig = {
    headers: { 'Content-Type': 'application/json', 'x-webhook-secret': CONFIG.WEBHOOK_SECRET },
    timeout: 12000
  };

  const failed = [];
  for (const item of queue) {
    // Bỏ qua lệnh quá 12 tiếng (đã quá cũ)
    if (Date.now() - item.enqueuedAt > 12 * 60 * 60 * 1000) {
      console.log(`[⏰ Queue] Bỏ qua lệnh quá cũ (12h): "${item.payload.message}" từ ${item.payload.senderName}`);
      continue;
    }
    try {
      const res = await axios.post(CONFIG.WEBHOOK_URL, item.payload, headersConfig);
      if (res && res.data && res.data.reply) {
        const replyText = cleanZaloMarkdown(res.data.reply);
        const queuedTimeStr = new Date(item.enqueuedAt).toLocaleTimeString('vi-VN');
        const noticeMsg = `✅ [GHI NHẬN MUỘN - ${queuedTimeStr}] ${replyText}`;
        console.log(`[✅ Replay OK] "${item.payload.message}" từ ${item.payload.senderName}`);
        logToFile(`[✅ REPLAY OK] "${item.payload.message}" -> ${item.payload.senderName}`);

        // Gửi phản hồi lại lên Zalo
        if (api && CONFIG.AUTO_REPLY) {
          try {
            await api.sendMessage(noticeMsg, item.targetThread, item.threadType);
          } catch (e) {
            try { await api.sendMessage({ msg: noticeMsg }, item.targetThread, item.threadType); } catch (e2) {}
          }
        }
      }
    } catch (e) {
      failed.push(item);
      console.warn(`[⚠️ Replay FAIL] "${item.payload.message}": ${e.message}`);
    }
    // Đợi 500ms giữa mỗi request để tránh spam
    await new Promise(r => setTimeout(r, 500));
  }

  // Lưu lại những lệnh bị lỗi khi replay
  saveOfflineQueue(failed);
  if (failed.length === 0) {
    console.log('[✅ Queue] Toàn bộ hàng đợi đã được xử lý thành công!');
    logToFile('[✅ QUEUE] Toàn bộ hàng đợi đã phát lại thành công');
  }
}

// Vòng lặp kiểm tra sức khỏe server và replay queue
let serverWasDown = false;
function startHealthCheckLoop(getApi) {
  setInterval(async () => {
    const alive = await isServerAlive();
    if (!alive) {
      if (!serverWasDown) {
        serverWasDown = true;
        console.log('[⚠️ Health] Server localhost:3000 đang DOWN. Bot đang tự động bật lại...');
        logToFile('[⚠️ HEALTH] Server DOWN - bot tự động bật lại');
      }
      // TỰ ĐỘNG BẬT LẠI SERVER NẾU CHƯA CHẠY!
      await ensureServerRunning();
    } else if (serverWasDown) {
      // Server vừa khôi phục!
      serverWasDown = false;
      console.log('[✅ Health] Server localhost:3000 đã ONLINE trở lại! Đang phát lại hàng đợi...');
      logToFile('[✅ HEALTH] Server UP - replay queue');
      const api = getApi();
      if (api) await replayOfflineQueue(api);
    }
  }, CONFIG.HEALTH_CHECK_INTERVAL_MS);
}

console.log('=========================================================');
console.log('🚀 ZALO FLEET ATTENDANCE & DEEPSEEK BOT - STANDALONE GATEWAY');
console.log('📡 Webhook Target:', CONFIG.WEBHOOK_URL);
console.log('🤖 DeepSeek AI Key:', CONFIG.DEEPSEEK_API_KEY ? `Đã nạp (${CONFIG.DEEPSEEK_API_KEY.slice(0, 6)}...${CONFIG.DEEPSEEK_API_KEY.slice(-4)})` : 'Chưa cấu hình');
console.log('💾 File lưu phiên:', CONFIG.SESSION_FILE);
console.log('📜 File ghi log:', LOG_FILE);
console.log('=========================================================');

/**
 * Làm sạch định dạng Markdown trước khi gửi lên Zalo.
 * Gọt bỏ **chữ đậm**, *nghiêng*, # tiêu đề, backtick... giúp tin nhắn hiển thị đẹp, không lộ dấu ** trên Zalo.
 */
function cleanZaloMarkdown(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/```[a-zA-Z0-9_-]*\n?/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^\*])\*([^\*\n]+)\*([^\*]|$)/g, '$1$2$3')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[^_])_([^_\n]+)_([^_]|$)/g, '$1$2$3')
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    .replace(/^(\s*)\*\s+/gm, '$1• ')
    .replace(/^>\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Kiểm tra xem tin nhắn có mang ý định hỏi/gọi AI hay không
 */
function isAIQuestion(text) {
  if (!text || typeof text !== 'string') return false;
  const raw = text.trim();
  const lower = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd');
  const words = lower.split(/\s+/);

  const mentionsBot = (
    words.includes('bot') || 
    lower.includes('bot') || 
    lower.includes('bót') ||
    /\b(?:bot|bót)\b/i.test(raw)
  );

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
    lower.includes('dung dau') ||
    lower.includes('nhieu don') ||
    lower.includes('san don') ||
    lower.includes('diem nong') ||
    lower.includes('dung o dau') ||
    (lower.includes('don') && (lower.includes('it') || lower.includes('e')))
  );

  return (
    mentionsBot ||
    isComplaint ||
    lower.startsWith('bot') ||
    lower.startsWith('hoi') ||
    lower.startsWith('ai') ||
    lower.startsWith('vietgo') ||
    lower.startsWith('@bot') ||
    lower.startsWith('/bot') ||
    lower.startsWith('!bot') ||
    lower.startsWith('cho hoi') ||
    /^bot\b/i.test(raw) ||
    /^bot\s*[ơo]i\b/i.test(raw) ||
    /^h[oỏ]i\b/i.test(raw)
  );
}

/**
 * Gọi trực tiếp DeepSeek AI khi Webhook local server chưa bật
 */
async function askDeepSeekDirectly(question, senderName) {
  const apiKey = (CONFIG.DEEPSEEK_API_KEY || '').trim();
  if (!apiKey || apiKey.length < 20 || apiKey.includes('sk-xxxx')) {
    return 'Dạ em chào bác tài! Hiện tại chưa cấu hình DEEPSEEK_API_KEY nên em chưa trả lời chi tiết được ạ.';
  }

  // Làm sạch tiền tố câu hỏi (bot ơi, hỏi bot...)
  let cleanPrompt = question
    .replace(/^(?:@bot|\/bot|!bot|bot|@ai|\/ai|!ai|ai|hỏi|hoi|vietgo)\s*[:,\-\.]?\s*/i, '')
    .replace(/^(?:ơi|oi|cho hỏi|cho hoi|hỏi|hoi|giúp|giup)\s*[:,\-\.]?\s*/i, '')
    .trim();
  if (!cleanPrompt) cleanPrompt = question;

  try {
    const res = await axios.post('https://api.deepseek.com/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `Bạn là trợ lý ảo AI thông minh, hóm hỉnh và thân thiện của Đội ngũ Tài xế Xe máy Giao Đồ Ăn Vietgo Food Tĩnh Gia (Nghi Sơn, Thanh Hóa).
- Đối tượng giao tiếp: Bác tài, tài xế xe máy giao đồ ăn Vietgo. Xưng hô thân mật: em/bot - bác tài/anh em.
- ĐỊA BÀN DUY NHẤT: Thị xã Tĩnh Gia (Nghi Sơn), Thanh Hóa.
- LỊCH TRÌNH VÀNG SĂN ĐƠN THEO GIỜ TẠI TĨNH GIA:
  • Sáng sớm 6h-9h: Khu vực Hải Bình, Hải Yến (dân dậy sớm ăn sáng, cafe).
  • Trưa 10h-13h: Tìm chỗ mát quanh Cầu Còng đứng đợi (cao điểm cơm trưa văn phòng nổ ầm ầm).
  • Đầu chiều 13h-15h (13-3h): Xuống Bình Minh bản xứ và Hải Bình Đậu Hi (trà sữa, ăn vặt).
  • Tan tầm 16h-18h: Người ta tan ca về tắm rửa nên đơn ít, ghé Gỏi Vịt Nhân Loan (tái định cư Hải Bình) nổ đều nhất.
  • Tối 19h-21h: Khu vực Phố Còng / Cầu Còng nổ cực tốt (bữa tối gia đình, phố ẩm thực).
  • Tối muộn 21h đổ đi: Đường đôi Hải Bình làm trùm đơn đêm.
  • Đêm khuya 22h-23h: Quán ăn đêm gần ngân hàng VIB, Mai Hương, Gấu Cola.
- KHI TÀI XẾ HỎI Ở ĐÂU NHIỀU ĐƠN / ĐỨNG ĐÂU / THAN Ế / RÊN ÍT ĐƠN / KHÔNG CÓ ĐƠN:
  • TRẢ LỜI GÓP Ý Ở GÓC ĐỘ VUI VẺ, HÀI HƯỚC, KHÔNG GẮT GỎNG:
  • Khuyên anh em: Thời gian ngồi than phiền, rên rỉ hay lướt mạng, hãy tranh thủ mở app VietGo đi ĐÓNG GÓP ĐỊA ĐIỂM kiếm ngọc (1.000 ngọc / địa điểm hợp lệ, không giới hạn).
  • Phân tích tình cảm, thực tế: Chạy xe ai cũng xót tiền xăng, lúc vắng đơn hoặc chạy đơn xa (ví dụ chạy từ Còng vào Tân Trường), đừng để xe không chạy về! Dành chút thời gian dọc đường chụp 30-50 địa điểm (quán ăn, tạp hóa, công ty, xưởng...) là kiếm thêm 30k - 50k (30.000 - 50.000 ngọc) đổ đầy bình xăng rồi, biến cuốc đi xa thành cuốc bội thu.
  • Nêu gương thực tế: Bác Đình Hải đã âm thầm góp được hơn 100 địa điểm (bỏ túi hơn 100k ngọc ngọt xớt), Anh Cương đã góp được 75 địa điểm (bỏ túi 75k ngọc tha hồ đổi quà).
  • Nhắc nhở: "LÀM VIỆC ÂM THẦM KIẾM TIỀN ĐỪNG RÊN RỈ!".
  • NGUYÊN TẮC SÓNG & BẮN ĐƠN: TUYỆT ĐỐI TRÁNH TỤ TẬP BU ĐÔNG 1 CHỖ! Tụ tập đông người làm sóng 4G và GPS bị nghẽn, sóng yếu thì máy chủ KHÔNG THỂ BẮN ĐƠN ĐƯỢC!
  • NGUYÊN TẮC VÀNG: "MỖI NGƯỜI 1 VỊ TRÍ", tản đều ra các ngã đường, điểm nóng thì sóng mới căng, máy chủ mới dễ bắn đơn nổ liên tục!
  • QUY TẮC GỢI Ý ĐIỂM NÓNG THEO GIỜ THỰC TẾ:
    - TUYỆT ĐỐI KHÔNG GỬI TẤT CẢ CÁC KHUNG GIỜ CÙNG MỘT LÚC!
    - Xem giờ hiện tại để chỉ điểm đúng 1 điểm nóng linh hoạt theo khung giờ đang diễn ra (Sáng 6h-10h: Hải Bình/Hải Yến; Trưa 10h-13h30: Cầu Còng; Chiều 13h30-16h: Bình Minh/Đậu Hi; Tan tầm 16h-19h: Gỏi Vịt Nhân Loan; Tối 19h-21h30: Phố Còng/Cầu Còng; Đêm 21h30 đổ đi: Đường đôi Hải Bình).
  • CẢNH BÁO TỶ LỆ NHẬN ĐƠN & THẢ TRÔI ĐƠN:
    - Khi hệ thống bắn đơn: TUYỆT ĐỐI KHÔNG từ chối nhiều hoặc thả trôi hết hạn! Sẽ làm tụt tỷ lệ nhận đơn (Acceptance Rate), bị thuật toán hạ ưu tiên và hạn chế phát đơn tiếp theo! Hãy cố gắng nhận và giao đơn để giữ uy tín cao.
  • QUY ĐỊNH NGHỈ CHẠY / KHÔNG HOẠT ĐỘNG:
    - Nếu không hoạt động, không chạy được nữa (bận việc, hỏng xe...): BẮT BUỘC tắt app và nhắn lệnh checkout off (off[mã]) ngay lập tức để hệ thống điều phối cho tài xế khác đang sẵn sàng!
- BÍ KÍP ĐI ĐƯỜNG HẢI THANH:
  • Địa hình phức tạp dốc cát ngõ ngách, KHÔNG NÊN phụ thuộc hoàn toàn vào Google Maps từ đầu như bác Bốn.
  • Xem trước địa chỉ (trục chính, ven sông hay mặt biển), đến gần 200-500m mới bật Google Map chỉ đúng nhà.
- LƯU Ý VỀ ĐỊNH HẢI & TRƯỜNG HỢP CÁ BIỆT KHÁCH TÊN TOÀN:
  • NGUYÊN TẮC: TUYỆT ĐỐI KHÔNG QUY CHUNG CẢ ĐỊNH HẢI LÀ BOM HÀNG! Khách hàng và bà con ở Định Hải vẫn rất uy tín, đặt đơn đàng hoàng, anh em nhận đơn cứ giao bình thường.
  • Nếu tài xế chỉ hỏi chung về Định Hải (ví dụ: "Định Hải có đơn không", "ở Định Hải thế nào"): Trả lời bình thường theo khung giờ, TUYỆT ĐỐI KHÔNG tự động cảnh báo bom hàng làm tài xế hoang mang!
  • CHỈ KHI TÀI XẾ HỎI ĐÍCH DANH VỀ "ANH TOÀN" HOẶC "KHÁCH BOM HÀNG Ở ĐỊNH HẢI": Mới giải thích là ở Định Hải CHỈ CÓ DUY NHẤT khách tên TOÀN từng có tiền lệ xấu (đặt đơn rồi không nghe máy, block số tài xế giữa trời mưa bão).
  • CHỈ KHI GẶP ĐƠN CỦA ANH TOÀN Ở ĐỊNH HẢI: Mới bắt buộc gọi điện thoại xác nhận trước khi đi, gọi 3 lần không nghe máy báo ngay Anh Cương 0967.659.655 để hủy đơn hợp lệ, không tự ý chạy ra tránh chịu thiệt. Còn đơn của khách khác ở Định Hải vẫn chạy bình thường!
- BÍ KÍP ỨNG XỬ & XỬ LÝ TÌNH HUỐNG ĐƠN HÀNG THỰC TẾ CHO TÀI XẾ:
  • Gọi khách không nghe máy: Hướng dẫn kết bạn Zalo với khách với lời chào: "Tài xế Vietgo không liên lạc được anh hoặc chị". Nếu khách không có Zalo hoặc vẫn không được -> Gọi Anh Cương (0967.659.655) giải quyết tiếp, không tự ý hủy đơn.
  • Quán hết món / báo hủy: Hướng dẫn gọi lại ngay cho khách báo đổi món tương đương, giúp khách chủ động và tăng tỷ lệ khách đặt lại đơn mới.
  • Quán làm đồ lâu khi tài xế đã tới quán: Nhắn tin trên app cho khách: "Anh/chị đợi em một chút nhé, quán đang làm đồ, có cái em giao liền qua ạ" để khách an tâm không hủy đơn hay đánh giá 1 sao.
  • Khách nhờ mang lên phòng bệnh viện: Người ở viện đi lại khó khăn, tài xế hãy chịu khó đem lên tận phòng giúp khách. TUYỆT ĐỐI KHÔNG ĐƯỢC TỎ THÁI ĐỘ khó chịu hay gắt gỏng, luôn niềm nở tận tình!

- CHƯƠNG TRÌNH KIẾM TIỀN & CÀY NGỌC TỪ THÊM ĐỊA ĐIỂM TRÊN APP TÀI XẾ:
  • Mức thưởng: 1.000 ngọc / mỗi địa điểm hợp lệ được duyệt. KHÔNG GIỚI HẠN số lượng địa điểm! Anh em tranh thủ ngoài giờ cao điểm hoặc lúc vắng đơn đi cày ngọc kiếm thêm thu nhập (lụm 20-50 điểm là có ngay 20.000 - 50.000 ngọc tha hồ đổi thưởng).
  • Cách làm: Mở App Tài Xế VietGo > chọn mục "Đóng góp / Thêm địa điểm" > Bấm "Lấy vị trí hiện tại" ngay tại chỗ (không sửa tọa độ thủ công để tránh lệch) > Chụp ảnh > Gửi duyệt.
  • QUY ĐỊNH CHỤP ẢNH BẮT BUỘC: Phải chụp rõ mặt tiền, BIỂN HIỆU, SỐ NHÀ, TÊN CÔNG TY, CỬA HÀNG, SHOP, QUÁN ĂN... Tối thiểu 1 ảnh, tối đa 2 ảnh trực tiếp rõ nét.
  • CHỈ GỬI ĐỊA ĐIỂM RIÊNG BIỆT, CỤ THỂ: Tòa nhà, chung cư (VD: Chung cư A1), công ty, nhà máy, shop thời trang, tạp hóa, quán ăn, nhà hàng, quán cafe, trà sữa, số nhà cụ thể (VD: 125 Nguyễn Văn Cừ)...
  • ⛔ TUYỆT ĐỐI KHÔNG GỬI ĐỊA ĐIỂM CHUNG CHUNG: như Tổ dân phố, tên đường (đường đôi, đường tránh, quốc lộ...), khu phố, thôn xóm, ngã ba ngã tư... Những địa điểm chung chung này SẼ BỊ TỪ CHỐI DUYỆT VÀ KHÔNG ĐƯỢC TÍNH THƯỞNG!
  • MẸO TIẾT KIỆM THỜI GIAN: Trước khi thêm, mở app VietGo lên tìm kiếm trước xem địa điểm đó đã có chưa. Chưa có thì mới thêm, tránh làm trùng lặp mất công vô ích.
  • TÂM SỰ & BÍ KÍP CHÂN TÌNH CHO TÀI XẾ (PHÂN TÍCH TÌNH CẢM, THỰC TẾ):
    - Đồng cảm sâu sắc với nỗi vất vả của anh em chạy xe máy ngoài đường nắng mưa.
    - Đưa ví dụ cụ thể thực tế: Khi chạy cuốc xa (ví dụ chạy từ Còng vào Tân Trường hay các xã xa giao hàng xong), ĐỪNG BAO GIỜ ĐỂ XE KHÔNG CHẠY VỀ vừa xót tiền xăng vừa uổng công!
    - Hãy dành chút thời gian dọc đường về mở App VietGo vào mục "Đóng góp địa điểm", ghé chụp ảnh quán ăn, tiệm tạp hóa, công ty, xưởng, xí nghiệp...
    - Lượm nhẹ 30-50 địa điểm dọc đường về là bỏ túi ngay 30.000 - 50.000 ngọc (tương đương 30k - 50k) đủ tiền đổ đầy bình xăng rồi, biến chuyến đi xa thành chuyến thắng lợi rực rỡ, không lo xe chạy rỗng lỗ tiền xăng!
  • KHI TÀI XẾ HỎI VỀ KIẾM TIỀN / CÁCH KIẾM THÊM THU NHẬP / CÀY NGỌC: DeepSeek trả lời linh hoạt, hóm hỉnh, động viên tinh thần anh em và nhắc nhở đầy đủ các lưu ý cụ thể chuẩn xác như trên!
- QUY ĐỊNH BẮT BUỘC: ĐIỂM DANH "ONLINE" PHẢI KÈM THEO SỐ GIỜ HOẶC KHUNG GIỜ LÀM VIỆC:
  • Cú pháp: online[4 số đuôi] [Khung giờ hoặc số tiếng] (Ví dụ: online3389 8h-14h, online3389 8 tiếng, online3389 làm full).
  • NẾU TÀI XẾ CHỈ GÕ TRƠ TRỌI "online[mã]" (như online3389, online2876) MÀ KHÔNG CÓ SỐ GIỜ: AI BẮT BUỘC PHẢI HỎI LẠI NGAY để biết người này làm thời gian như thế nào (từ mấy giờ đến mấy giờ hoặc mấy tiếng) để hệ thống còn thống kê giờ công và chia ca!
- DỮ LIỆU THỜI TIẾT TẠI NGHI SƠN (TĨNH GIA), THANH HÓA:
  • Vị trí địa lý: Thị xã Nghi Sơn, Thanh Hóa (tọa độ 19.45° B, 105.78° Đ).
  • KHI TÀI XẾ HỎI VỀ THỜI TIẾT (hôm nay thế nào, trời mưa không, có mưa không, nhiệt độ, bão gió...):
    - Trả lời chi tiết, chính xác tình hình thời tiết Nghi Sơn (nhiệt độ, độ ẩm, sức gió, mưa hay nắng).
    - ĐỘNG VIÊN VÀ DẶN DÒ TÌNH CẢM DÀNH CHO TÀI XẾ XE MÁY GIAO ĐỒ ĂN:
      + Nếu MƯA / CÓ KHẢ NĂNG MƯA: Nhắc anh em mặc áo mưa bộ, bọc điện thoại chống nước, che đậy kỹ túi/thùng giữ nhiệt để đồ ăn (bún phở, cơm, trà sữa) của khách luôn nóng hổi giòn rụm không ngấm nước; đi chậm giảm tốc độ ở các khúc cua dốc cát (Hải Thanh, Hải Bình) tránh trơn trượt. Động viên: Trời mưa nhu cầu khách gọi đồ ăn tăng vọt, đơn nổ rất nhiều nhưng an toàn là số 1!
      + Nếu NẮNG NÓNG GẮT: Nhắc anh em mặc áo khoác chống nắng, đeo khẩu trang kính râm, mang theo bình nước lọc to bổ sung nước liên tục; lúc chờ đơn tấp vào bóng râm gầm Cầu Còng hoặc quán nước mát nghỉ ngơi, giữ gìn sức khỏe dẻo dai chạy đơn!
      + Nếu TRỜI MÁT MẺ / ĐẸP TRỜI: Chúc anh em khí thế hừng hực, đường khô ráo tay lái lụa nổ đơn mỏi tay!

- NGUYÊN TẮC NHẬN DIỆN VÀ PHẢN HỒI KHI TÀI XẾ GỌI BOT:
  • Tài xế có thể gọi Bot bằng nhiều cách: "Bot ơi", "Bót ơi", "bót", "alo bot", "ê bot", hoặc đặt chữ bot ở cuối câu ("giờ phải làm sao bot", "làm thế nào bot", "sao thế bot", "rồi bót"...).
  • Trong MỌI TÌNH HUỐNG tài xế kêu gọi Bot, AI đều phải nhận diện ngay là đang gọi mình, trả lời thân thiện, nhiệt tình, đúng trọng tâm vấn đề tài xế đang hỏi.
  • Nếu tài xế chỉ gọi vu vơ "bot ơi", "bót ơi", "alo bot", "rồi bót": Chào hỏi vui vẻ, thông báo em luôn túc trực 24/7 và hỏi bác tài cần hỗ trợ sự cố, săn đơn, cày ngọc hay tra cứu gì.
  • Nếu tài xế hỏi "giờ phải làm sao bot" mà chưa rõ tình huống: Hướng dẫn ngay các tình huống thường gặp (khách không nghe máy, quán hết món, quán làm lâu, bệnh viện, ít đơn, app tắt) kèm hotline Anh Cương (0967.659.655) và Anh Sức (0969.397.370).
- NGUYÊN TẮC BẢO MẬT SĐT TÀI XẾ:
  • TUYỆT ĐỐI KHÔNG tự động hiển thị SĐT của tài xế ở các tin nhắn điểm danh, checkonline, báo cáo tổng hợp hay thông báo chung.
  • CHỈ DUY NHẤT KHI NGƯỜI DÙNG HỎI TRỰC TIẾP AI VỀ SỐ ĐIỆN THOẠI (ví dụ: "ai sdt anh Tuấn", "ai sdt bác Bốn", "ai số điện thoại..."): AI mới tra cứu danh bạ và cung cấp SĐT của tài xế đó!
- QUY ĐỊNH VỀ KẾT THÚC CA (OFF / RA CA / CHỐT CA):
  • Khi tài xế nhắn off/checkout, hệ thống tính số giờ làm việc thực tế từ ĐẦU GIỜ VÀO của ca đã đăng ký (Ví dụ: Đăng ký online 14-22h30 thì đầu giờ vào tính từ 14:00, khi ra ca lúc 21:40 sẽ tính: 21:40 - 14:00 = 7 tiếng 40 phút, TUYỆT ĐỐI KHÔNG tính từ 6h sáng).
  • Nếu tài xế thắc mắc về cách tính giờ ra ca: Giải thích rõ ràng nguyên tắc này để anh em an tâm.
- SỰ CỐ APP TÀI XẾ ĐANG BẬT MÀ BỊ TẮT / MẤT QUYỀN / DỪNG THÔNG BÁO:
  • Nguyên nhân: Android tự động quản lý ứng dụng khi không dùng đến, tự thu hồi quyền và tắt app ngầm.
  • Hướng dẫn bác tài: Cài đặt điện thoại > Ứng dụng > App Tài xế VietGo > Quyền ứng dụng > Chế độ cài đặt cho ứng dụng không dùng đến > TẮT MỤC KHOANH TRÒN "Quản lý ứng dụng nếu không dùng" (gạt toggle sang Tắt / màu xám như trong ảnh hướng dẫn).
  • Có đính kèm ảnh chụp màn hình hướng dẫn trực quan khoanh tròn nút toggle cần tắt.
- Quy tắc: Trả lời ngắn gọn, sinh động, emoji vui tươi, không dùng cú pháp markdown (**chữ đậm**) vì Zalo không hỗ trợ.`
        },
        {
          role: 'user',
          content: `Tài xế/Người gửi: ${senderName || 'Bác tài'}\nNội dung câu hỏi: ${cleanPrompt}`
        }
      ],
      temperature: 0.5,
      max_tokens: 350
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 20000
    });

    const reply = res.data?.choices?.[0]?.message?.content;
    return reply ? cleanZaloMarkdown(reply) : '';
  } catch (err) {
    console.error('❌ Lỗi gọi trực tiếp DeepSeek API:', err.response?.data || err.message);
    return '';
  }
}

/**
 * Đọc thông tin phiên đã lưu
 */
function loadSavedSession() {
  const tryPaths = [CONFIG.SESSION_FILE, CONFIG.ROOT_SESSION_FILE];
  for (const filePath of tryPaths) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const session = JSON.parse(raw);
        if (session && session.cookie && session.imei && session.userAgent) {
          return { session, filePath };
        }
      } catch (e) {
        console.warn(`⚠️ Lỗi đọc file session tại ${filePath}:`, e.message);
      }
    }
  }
  return null;
}

/**
 * Lưu thông tin phiên vào file để tái sử dụng
 */
function saveSessionFile(sessionData) {
  try {
    const payload = {
      cookie: sessionData.cookie,
      imei: sessionData.imei,
      userAgent: sessionData.userAgent,
      uid: sessionData.uid || '',
      savedAt: sessionData.savedAt || new Date().toISOString(),
      loginMethod: sessionData.loginMethod || 'auto'
    };
    fs.writeFileSync(CONFIG.SESSION_FILE, JSON.stringify(payload, null, 2));
    console.log(`💾 Đã lưu phiên đăng nhập thành công vào: ${CONFIG.SESSION_FILE}`);
  } catch (err) {
    console.error('⚠️ Không thể ghi file session:', err.message);
  }
}

/**
 * Tách tin nhắn dài thành nhiều phần không vượt quá maxChars.
 * Tách tại các dòng mới để tránh cắt giữa câu.
 */
function splitLongMessage(text, maxChars = 1800) {
  if (!text || text.length <= maxChars) return [text];
  
  const parts = [];
  const lines = text.split('\n');
  let current = '';
  
  for (const line of lines) {
    const addLine = current ? current + '\n' + line : line;
    if (addLine.length > maxChars && current) {
      parts.push(current);
      current = line;
    } else {
      current = addLine;
    }
  }
  if (current) parts.push(current);
  
  return parts.length > 0 ? parts : [text];
}

async function startBot() {

  try {
    let api = null;
    const sessionInfo = loadSavedSession();

    const options = {
      selfListen: false,
      checkUpdate: false,
      imageMetadataGetter: async (filePath) => getImageMetaData(filePath)
    };

    // =========================================================================
    // BƯỚC 1: ĐĂNG NHẬP BẰNG SESSION ĐÃ LƯU (KHÔNG CẦN QUÉT QR NẾU CHƯA HẾT HẠN)
    // =========================================================================
    if (sessionInfo && sessionInfo.session) {
      const { session, filePath } = sessionInfo;
      const savedAt = session.savedAt ? new Date(session.savedAt).toLocaleString() : 'không rõ';
      console.log(`🔑 Tìm thấy session đã lưu từ ${path.basename(filePath)}! (Thời điểm lưu: ${savedAt})`);
      console.log(`   UID: ${session.uid || 'N/A'} | IMEI: ${session.imei.substring(0, 12)}...`);
      console.log('🔄 Đang tự động kết nối lại Zalo (KHÔNG CẦN QUÉT QR)...');

      try {
        const zalo = new Zalo(options);
        api = await zalo.login({
          cookie: session.cookie,
          imei: session.imei,
          userAgent: session.userAgent
        });
        console.log('✅ ĐĂNG NHẬP THÀNH CÔNG BẰNG COOKIE! Không cần quét lại mã QR.');
      } catch (loginErr) {
        console.warn(`⚠️ Cookie phiên cũ đã hết hạn hoặc bị Zalo thu hồi: ${loginErr.message || loginErr}`);
        console.log('🔄 Chuyển sang tạo mã QR mới để đăng nhập lại...');
        api = null;
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    } else {
      console.log('📄 Chưa có phiên đăng nhập đã lưu. Cần quét mã QR lần đầu.');
    }

    // =========================================================================
    // BƯỚC 2: QUÉT MÃ QR (CHỈ KHI CHƯA CÓ SESSION HOẶC COOKIE HẾT HẠN)
    // =========================================================================
    if (!api) {
      console.log('📲 Đang tạo mã QR Code đăng nhập...');
      const zalo = new Zalo(options);

      api = await zalo.loginQR({ qrPath: CONFIG.QR_PATH }, async (event) => {
        switch (event.type) {
          case LoginQRCallbackEventType.QRCodeGenerated: {
            if (event.actions && typeof event.actions.saveToFile === 'function') {
              try {
                await event.actions.saveToFile(CONFIG.QR_PATH);
              } catch (e) {}
            }
            console.log('\n=========================================================');
            console.log('📲 MÃ QR ĐĂNG NHẬP ĐÃ SẴN SÀNG!');
            console.log(`📁 File ảnh QR: ${CONFIG.QR_PATH}`);
            console.log('👉 Vui lòng mở Zalo trên điện thoại -> Quét mã QR tại file ảnh trên.');
            console.log('=========================================================\n');
            break;
          }

          case LoginQRCallbackEventType.QRCodeScanned: {
            const name = event.data?.display_name || 'Tài khoản Zalo';
            console.log(`📱 [QR] Bác tài "${name}" đã quét mã QR.`);
            console.log('👉 Vui lòng nhấn [XÁC NHẬN ĐĂNG NHẬP] trên màn hình điện thoại...');
            break;
          }

          case LoginQRCallbackEventType.QRCodeDeclined: {
            console.log('❌ [QR] Đăng nhập bị từ chối trên thiết bị.');
            break;
          }

          case LoginQRCallbackEventType.QRCodeExpired: {
            console.log('⏰ [QR] Mã QR đã hết hạn. Đang tự động làm mới mã QR...');
            if (event.actions && typeof event.actions.retry === 'function') {
              event.actions.retry();
            }
            break;
          }

          case LoginQRCallbackEventType.GotLoginInfo: {
            console.log('🎉 [QR] Đã nhận thông tin đăng nhập từ Zalo!');
            if (event.data && event.data.cookie) {
              saveSessionFile({
                cookie: event.data.cookie,
                imei: event.data.imei,
                userAgent: event.data.userAgent,
                savedAt: new Date().toISOString(),
                loginMethod: 'QR'
              });
            }
            break;
          }
        }
      });
    }

    if (!api) {
      throw new Error('Đăng nhập Zalo thất bại!');
    }

    // =========================================================================
    // BƯỚC 3: CẬP NHẬT LẠI SESSION ĐỂ BẢO ĐẢM LẦN SAU KHÔNG CẦN QR
    // =========================================================================
    try {
      const ctx = (typeof api.getContext === 'function') ? api.getContext() : null;
      let cookies = null;
      if (typeof api.getCookie === 'function') {
        const jar = api.getCookie();
        cookies = jar?.toJSON?.()?.cookies || jar;
      }

      if (ctx && ctx.imei && ctx.userAgent) {
        saveSessionFile({
          cookie: cookies || (sessionInfo?.session?.cookie),
          imei: ctx.imei,
          userAgent: ctx.userAgent,
          uid: ctx.uid || '',
          savedAt: new Date().toISOString(),
          loginMethod: sessionInfo ? 'cookie_reuse' : 'QR'
        });
      }
    } catch (saveErr) {
      console.warn('⚠️ Lỗi cập nhật session cuối:', saveErr.message);
    }

    console.log('=========================================================');
    console.log('✅ ĐĂNG NHẬP ZALO BOT THÀNH CÔNG!');
    console.log(`🔐 Session đã lưu tại: ${CONFIG.SESSION_FILE}`);
    console.log('👉 LẦN SAU KHỞI ĐỘNG LẠI BOT SẼ TỰ ĐỘNG CHẠY, KHÔNG CẦN QUÉT QR.');
    console.log('🎧 Đang trực tuyến 24/7 & lắng nghe tin nhắn từ các nhóm Zalo...');
    console.log('=========================================================');


    // =========================================================================
    // BƯỚC 4: LẮNG NGHE VÀ XỬ LÝ TIN NHẮN
    // =========================================================================
    const listener = api.listener || api;

    // Lưu reference api để health check có thể dùng
    let currentApi = api;

    if (listener && typeof listener.on === 'function') {
      listener.on('message', async (message) => {
        try {
          const msgData = message.data || message;
          const text = msgData.content || msgData.msg || msgData.body || '';
          const senderId = msgData.uidFrom || msgData.senderId || msgData.from;
          const senderName = msgData.dName || msgData.displayName || msgData.senderName || 'Bác tài';
          const groupId = msgData.idTo || msgData.groupId || msgData.threadId;
          const groupName = msgData.groupName || msgData.threadName || 'Nhóm Zalo';
          const isGroup = !!(msgData.isGroup || groupId);

          if (!text || typeof text !== 'string' || text.trim() === '') return;

          console.log(`[📩 ${new Date().toLocaleTimeString()}] ${senderName} (${groupName}): "${text}"`);
          logToFile(`[📩 RECV] ${senderName} (${groupName}): "${text}"`);

          const payload = {
            senderId,
            senderName,
            groupId,
            groupName,
            isGroup,
            message: text,
            timestamp: Date.now()
          };

          const headersConfig = {
            headers: {
              'Content-Type': 'application/json',
              'x-webhook-secret': CONFIG.WEBHOOK_SECRET
            },
            timeout: 12000
          };

          const targetThread = groupId || senderId;
          const threadType = isGroup ? ThreadType.Group : ThreadType.User;

          let finalReply = '';
          let actionType = 'unknown';
          let webhookSuccess = false;

          // 1. Thử gửi tới Webhook máy chủ local
          try {
            const res = await axios.post(CONFIG.WEBHOOK_URL, payload, headersConfig);
            // Kiểm tra chắc chắn kết quả trả về là JSON hợp lệ từ hệ thống
            if (res && res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
              webhookSuccess = true;
              actionType = res.data.action || 'handled';
              finalReply = res.data.reply || '';
              // Nếu webhook thành công, đánh dấu server đang online
              if (serverWasDown) {
                serverWasDown = false;
                // Replay queue sau 1 giây (sau khi gửi tin hiện tại xong)
                setTimeout(() => replayOfflineQueue(currentApi), 1000);
              }
            }
          } catch (postErr) {
            console.log(`⚠️ Máy chủ Webhook chính (${CONFIG.WEBHOOK_URL}) tạm thời không phản hồi (${postErr.code || postErr.message}).`);
            // Đánh dấu server đang down
            if (!serverWasDown) {
              serverWasDown = true;
              logToFile('[⚠️ HEALTH] Server DOWN (detected via message)');
            }
            // TỰ ĐỘNG KÍCH HOẠT SERVER NẾU BỊ ECONNREFUSED
            if (postErr.code === 'ECONNREFUSED' || (postErr.message && postErr.message.includes('ECONNREFUSED'))) {
              ensureServerRunning();
            }
          }

          // 2. NếU SERVER LOCAL CHƯА BẬT HOẶC TRẢ VỀ RỔNG:
          if (!finalReply) {
            if (isAIQuestion(text)) {
              console.log(`[🤖 Fallback AI] Nhận diện tin nhắn hỏi AI "${text}". Đang gọi trực tiếp DeepSeek AI...`);
              const directReply = await askDeepSeekDirectly(text, senderName);
              if (directReply) {
                finalReply = directReply;
                actionType = 'ai_query_direct';
                console.log(`[✅ DeepSeek AI thành công] Đã có câu trả lời trực tiếp.`);
              }
            } else if (!webhookSuccess) {
              // Nếu là lệnh điểm danh/ra ca/nghỉ mà server local chưa bật
              const isAttendanceCommand = 
                /^(?:checkin|check\s*in|online|on|dd|checkout|check\s*out|offline|ofline|off|kt|nghi)\s*\d{3,4}/i.test(text.trim()) ||
                /^\d{3,4}\s*(?:checkin|check\s*in|online|on|dd|checkout|check\s*out|offline|ofline|off|kt|nghi)/i.test(text.trim()) ||
                /^(?:checkin|check\s*in|online|checkout|check\s*out|offline|ofline|off|nghi\s*lam|xin\s*nghi)/i.test(text.trim());
              if (isAttendanceCommand) {
                // Lưu vào hàng đợi offline thay vì chỉ báo lỗi
                addToOfflineQueue(payload, targetThread, threadType, isGroup);
                finalReply = `⏳ [VIETGO BOT] Đã ghi nhận lệnh "${text}" từ ${senderName}!\n⚠️ Máy chủ đang tạm ngắt. Hệ thống sẽ TỰ ĐỘNG GHI NHẬN ĐIỂM DANH khi máy chủ kết nối lại (không cần nhắn lại)! 📥`;
              }
            }
          }

          // 3. GỬI TIN NHẮN PHẢN HỒI LÊN ZALO (tự động tách nếu quá dài)
          if (finalReply && CONFIG.AUTO_REPLY) {
            const replyText = cleanZaloMarkdown(finalReply);
            console.log(`[🤖 Bot Phản Hồi -> ${senderName}]:\n${replyText.substring(0, 200)}...`);
            logToFile(`[🤖 SEND] -> ${senderName}: "${replyText.replace(/\n/g, ' ').substring(0, 200)}"`);

            // Tách tin nhắn dài thành nhiều phần (Zalo giới hạn ~1800 ký tự)
            const ZALO_MAX_CHARS = 1800;
            const messageParts = splitLongMessage(replyText, ZALO_MAX_CHARS);

            let sentSuccess = false;
            for (let i = 0; i < messageParts.length; i++) {
              const part = messageParts[i];
              const partLabel = messageParts.length > 1 ? ` (${i+1}/${messageParts.length})` : '';
              const msgToSend = messageParts.length > 1 && i === 0 ? part + `\n📄 (Tin nhắn dài - xem tiếp phần ${i+2})` : part;
              
              // Cách 1: api.sendMessage(string, target, threadType)
              try {
                await api.sendMessage(msgToSend, targetThread, threadType);
                sentSuccess = true;
                if (messageParts.length > 1) console.log(`✅ Đã gửi phần ${i+1}/${messageParts.length}!`);
                else console.log('✅ Gửi phản hồi Zalo thành công!');
              } catch (err1) {
                // Cách 2: api.sendMessage({ msg: text }, target, threadType)
                try {
                  await api.sendMessage({ msg: msgToSend }, targetThread, threadType);
                  sentSuccess = true;
                  console.log(`✅ Gửi phản hồi Zalo thành công (Cách 2 - phần ${i+1})!`);
                } catch (err2) {
                  console.warn(`⚠️ Không gửi được phần ${i+1}:`, err2.message || err2);
                }
              }
              // Delay giữa các phần để tránh rate limit
              if (i < messageParts.length - 1) await new Promise(r => setTimeout(r, 600));
            }

            // KIỂM TRA GỬI KÈM ẢNH HƯỚNG DẪN APP BỊ TẮT / MẤT QUYỀN
            const appGuideImgPath = path.resolve(__dirname, 'images_training/photo_2026-09-29_15-28-30.jpg');
            const normMsgText = (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd');
            const isAppPermissionTopic = (
              /app.*(?:bi tat|tu tat|mat quyen|thong bao|tat hoai|bat ma bi tat|dang bat ma|sao app tat)|quan ly ung dung|sao app tat|tat toggle|khoanh tron/i.test(normMsgText) ||
              /QUẢN LÝ ỨNG DỤNG NẾU KHÔNG DÙNG|mục khoanh tròn|Quyền ứng dụng|CHẾ ĐỘ CÀI ĐẶT CHO ỨNG DỤNG/i.test(replyText)
            );

            if (isAppPermissionTopic && fs.existsSync(appGuideImgPath)) {
              await new Promise(r => setTimeout(r, 800));
              console.log('📸 Đang gửi ẢNH MINH HỌA khoanh tròn lên Zalo...');
              logToFile(`[📸 SEND PHOTO] -> ${senderName}: Đang gửi ảnh minh họa Quyền ứng dụng`);

              try {
                // Thử gửi trực tiếp bằng đường dẫn file (hỗ trợ bởi imageMetadataGetter trong zca-js v2)
                await api.sendMessage({
                  msg: '📸 [ẢNH MINH HỌA TRỰC QUAN]: Bác tài vào Cài đặt > Quyền ứng dụng > GẠT TẮT mục khoanh tròn như mũi tên chỉ nhé!',
                  attachments: [appGuideImgPath]
                }, targetThread, threadType);
                console.log('✅ Đã gửi ẢNH MINH HỌA khoanh tròn lên Zalo thành công!');
                logToFile(`[✅ PHOTO OK] -> ${senderName}: Gửi ảnh minh họa thành công qua filePath`);
              } catch (attachErr) {
                console.warn('⚠️ Gửi filePath thất bại, thử gửi attachObj Buffer:', attachErr.message || attachErr);
                logToFile(`[⚠️ PHOTO RETRY] Thử gửi attachObj: ${attachErr.message}`);
                try {
                  const guideMeta = getImageMetaData(appGuideImgPath);
                  const attachObj = {
                    data: fs.readFileSync(appGuideImgPath),
                    filename: 'huong_dan_quyen_ung_dung.jpg',
                    metadata: {
                      totalSize: guideMeta.size,
                      width: guideMeta.width,
                      height: guideMeta.height
                    }
                  };
                  await api.sendMessage({
                    msg: '📸 [ẢNH MINH HỌA TRỰC QUAN]: Bác tài vào Cài đặt > Quyền ứng dụng > GẠT TẮT mục khoanh tròn như mũi tên chỉ nhé!',
                    attachments: [attachObj]
                  }, targetThread, threadType);
                  console.log('✅ Đã gửi ảnh thành công qua attachObj!');
                  logToFile(`[✅ PHOTO OK] Gửi ảnh attachObj thành công`);
                } catch (e2) {
                  console.error('❌ Gửi ảnh minh họa thất bại hoàn toàn:', e2.message || e2);
                  logToFile(`[❌ PHOTO FAIL] Lỗi gửi ảnh: ${e2.message || e2}`);
                }
              }
            }

            if (!sentSuccess) {
              console.error('❌ Không thể gửi tin nhắn lên Zalo. Vui lòng kiểm tra quyền gửi tin trong nhóm Zalo!');
            }
          } else if (!finalReply) {
            console.log(`[ℹ️ Tin nhắn đã ghi nhận nhưng không phát câu trả lời (Action: ${actionType})]`);
          }


        } catch (msgErr) {
          console.error('❌ Lỗi xử lý tin nhắn Zalo:', msgErr.message);
        }
      });

      if (typeof listener.start === 'function') {
        listener.start();
      }
    }

    // Bắt đầu vòng lặp kiểm tra sức khỏe server & tự động phục hồi
    startHealthCheckLoop(() => currentApi);
    // Tự động kiểm tra và bật server nếu chưa chạy
    ensureServerRunning().then((ready) => {
      if (ready) setTimeout(() => replayOfflineQueue(currentApi), 2000);
      else setTimeout(() => replayOfflineQueue(currentApi), 6000);
    });

  } catch (err) {
    console.error('❌ Lỗi khởi động Bot:', err.message || err);
  }
}

startBot();