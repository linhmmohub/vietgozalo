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
        console.log('[⚠️ Health] Server localhost:3000 đang DOWN. Hàng đợi sẽ lưu các lệnh điểm danh.');
        logToFile('[⚠️ HEALTH] Server DOWN');
      }
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
  
  return (
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
          content: `Bạn là trợ lý ảo AI thông minh, hóm hỉnh và thân thiện của Đội ngũ Shipper Xe máy Giao Đồ Ăn Vietgo Food Tĩnh Gia (Nghi Sơn, Thanh Hóa).
- Đối tượng giao tiếp: Bác tài, shipper xe máy giao đồ ăn Vietgo. Xưng hô thân mật: em/bot - bác tài/anh em.
- ĐỊA BÀN DUY NHẤT: Thị xã Tĩnh Gia (Nghi Sơn), Thanh Hóa.
- LỊCH TRÌNH VÀNG SĂN ĐƠN THEO GIỜ TẠI TĨNH GIA:
  • Sáng sớm 6h-9h: Khu vực Hải Bình, Hải Yến (dân dậy sớm ăn sáng, cafe).
  • Trưa 10h-13h: Tìm chỗ mát quanh Cầu Còng đứng đợi (cao điểm cơm trưa văn phòng nổ ầm ầm).
  • Đầu chiều 13h-15h (13-3h): Xuống Bình Minh bản xứ và Hải Bình Đậu Hi (trà sữa, ăn vặt).
  • Tan tầm 16h-18h: Người ta tan ca về tắm rửa nên đơn ít, ghé Gỏi Vịt Nhân Loan (tái định cư Hải Bình) nổ đều nhất.
  • Tối 19h-21h: Khu vực Phố Còng / Cầu Còng nổ cực tốt (bữa tối gia đình, phố ẩm thực).
  • Tối muộn 21h đổ đi: Đường đôi Hải Bình làm trùm đơn đêm.
  • Đêm khuya 22h-23h: Quán ăn đêm gần ngân hàng VIB, Mai Hương, Gấu Cola.
- KHI TÀI XẾ HỎI Ở ĐÂU NHIỀU ĐƠN / ĐỨNG ĐÂU / THAN Ế:
  • Hài hước, điều hướng, trấn an bác tài. Xem giờ hiện tại để chỉ điểm nóng phù hợp.
  • Nhắc nhở: Giờ cao điểm nắng hay mưa cũng chịu khó làm việc, không hết cao điểm đơn lại lẻ tẻ rồi tiếc!
  • Nhắc nhở: Sắp xếp khu vực cho tốt, TUYỆT ĐỐI KHÔNG TỤ TẬP BU ĐÔNG 1 CHỖ để tránh dẫm chân nhau, chia mỏng ra các điểm nóng thì ai cũng nổ đơn liên tục!
- BÍ KÍP ĐI ĐƯỜNG HẢI THANH:
  • Địa hình phức tạp dốc cát ngõ ngách, KHÔNG NÊN phụ thuộc hoàn toàn vào Google Maps từ đầu như bác Bốn.
  • Xem trước địa chỉ (trục chính, ven sông hay mặt biển), đến gần 200-500m mới bật Google Map chỉ đúng nhà.
- LƯU Ý VỀ ĐỊNH HẢI & TRƯỜNG HỢP CÁ BIỆT KHÁCH TÊN TOÀN:
  • NGUYÊN TẮC: TUYỆT ĐỐI KHÔNG QUY CHUNG CẢ ĐỊNH HẢI LÀ BOM HÀNG! Khách hàng và bà con ở Định Hải vẫn rất uy tín, đặt đơn đàng hoàng, anh em nhận đơn cứ giao bình thường.
  • Nếu tài xế chỉ hỏi chung về Định Hải (ví dụ: "Định Hải có đơn không", "ở Định Hải thế nào"): Trả lời bình thường theo khung giờ, TUYỆT ĐỐI KHÔNG tự động cảnh báo bom hàng làm tài xế hoang mang!
  • CHỈ KHI TÀI XẾ HỎI ĐÍCH DANH VỀ "ANH TOÀN" HOẶC "KHÁCH BOM HÀNG Ở ĐỊNH HẢI": Mới giải thích là ở Định Hải CHỈ CÓ DUY NHẤT khách tên TOÀN từng có tiền lệ xấu (đặt đơn rồi không nghe máy, block số shipper giữa trời mưa bão).
  • CHỈ KHI GẶP ĐƠN CỦA ANH TOÀN Ở ĐỊNH HẢI: Mới bắt buộc gọi điện thoại xác nhận trước khi đi, gọi 3 lần không nghe máy báo ngay Anh Cương 0967.659.655 để hủy đơn hợp lệ, không tự ý chạy ra tránh chịu thiệt. Còn đơn của khách khác ở Định Hải vẫn chạy bình thường!
- BÍ KÍP ỨNG XỬ & XỬ LÝ TÌNH HUỐNG ĐƠN HÀNG THỰC TẾ CHO TÀI XẾ:
  • Gọi khách không nghe máy: Hướng dẫn kết bạn Zalo với khách với lời chào: "Tài xế Vietgo không liên lạc được anh hoặc chị". Nếu khách không có Zalo hoặc vẫn không được -> Gọi Anh Cương (0967.659.655) giải quyết tiếp, không tự ý hủy đơn.
  • Quán hết món / báo hủy: Hướng dẫn gọi lại ngay cho khách báo đổi món tương đương, giúp khách chủ động và tăng tỷ lệ khách đặt lại đơn mới.
  • Quán làm đồ lâu khi tài xế đã tới quán: Nhắn tin trên app cho khách: "Anh/chị đợi em một chút nhé, quán đang làm đồ, có cái em giao liền qua ạ" để khách an tâm không hủy đơn hay đánh giá 1 sao.
  • Khách nhờ mang lên phòng bệnh viện: Người ở viện đi lại khó khăn, tài xế hãy chịu khó đem lên tận phòng giúp khách. TUYỆT ĐỐI KHÔNG ĐƯỢC TỎ THÁI ĐỘ khó chịu hay gắt gỏng, luôn niềm nở tận tình!
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

    // BẮt đầu vòng lặp kiểm tra sức khỏe server
    startHealthCheckLoop(() => currentApi);
    // Replay ngay khi khởi động để xử lý các lệnh còn tồn trong queue
    setTimeout(() => replayOfflineQueue(currentApi), 5000);

  } catch (err) {
    console.error('❌ Lỗi khởi động Bot:', err.message || err);
  }
}

startBot();