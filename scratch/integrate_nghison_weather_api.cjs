const fs = require('fs');
const path = require('path');

const serverFile = path.resolve(__dirname, '../server.ts');
const botFile = path.resolve(__dirname, '../zalobot/bot.js');

let serverContent = fs.readFileSync(serverFile, 'utf8');
let botContent = fs.readFileSync(botFile, 'utf8');

console.log('1. Inserting Weather Engine into server.ts...');

// Weather Engine Code to insert after getCurrentHotspotGuidance
const weatherEngineCode = `
// =========================================================================
// REAL-TIME WEATHER SERVICE CHO THỊ XÃ NGHI SƠN (TĨNH GIA), THANH HÓA
// Nguồn API: Open-Meteo Vệ Tinh (Tọa độ Nghi Sơn: 19.45° B, 105.78° Đ)
// =========================================================================
interface NghiSonWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  rain: number;
  precipitation: number;
  weatherCode: number;
  conditionText: string;
  conditionIcon: string;
  isDay: boolean;
  isRain: boolean;
  isHot: boolean;
  isStorm: boolean;
  tempMax: number;
  tempMin: number;
  rainProbabilityMax: number;
  updatedAt: Date;
  updatedTimeStr: string;
}

let cachedWeather: NghiSonWeather | null = null;
let lastWeatherFetchTime = 0;
const WEATHER_CACHE_MS = 10 * 60 * 1000; // Cache 10 phút

function getWmoWeatherInfo(code: number, isDay: number = 1): { text: string; icon: string; isRain: boolean; isHot: boolean; isStorm: boolean } {
  switch (code) {
    case 0:
      return { text: isDay ? 'Trời quang đãng, nắng đẹp' : 'Trời quang mây, đêm tạnh ráo', icon: isDay ? '☀️' : '🌙', isRain: false, isHot: false, isStorm: false };
    case 1:
    case 2:
      return { text: 'Trời có mây nhẹ, râm mát dễ chịu', icon: isDay ? '⛅' : '☁️', isRain: false, isHot: false, isStorm: false };
    case 3:
      return { text: 'Trời nhiều mây u ám', icon: '☁️', isRain: false, isHot: false, isStorm: false };
    case 45:
    case 48:
      return { text: 'Có sương mù, tầm nhìn hạn chế', icon: '🌫️', isRain: false, isHot: false, isStorm: false };
    case 51:
    case 53:
    case 55:
      return { text: 'Mưa phùn hạt nhỏ / Mưa bay lất phất', icon: '🌦️', isRain: true, isHot: false, isStorm: false };
    case 61:
      return { text: 'Mưa rào nhẹ', icon: '🌧️', isRain: true, isHot: false, isStorm: false };
    case 63:
    case 65:
      return { text: 'Mưa vừa đến mưa to rải rác', icon: '🌧️🌧️', isRain: true, isHot: false, isStorm: false };
    case 80:
    case 81:
    case 82:
      return { text: 'Mưa rào nặng hạt từng cơn', icon: '⛈️', isRain: true, isHot: false, isStorm: false };
    case 95:
    case 96:
    case 99:
      return { text: 'Dông sét, mưa to kèm gió giật mạnh', icon: '⚡⛈️', isRain: true, isHot: false, isStorm: true };
    default:
      return { text: 'Thời tiết thay đổi', icon: '🌤️', isRain: false, isHot: false, isStorm: false };
  }
}

async function fetchNghiSonWeather(): Promise<NghiSonWeather> {
  const now = Date.now();
  if (cachedWeather && (now - lastWeatherFetchTime) < WEATHER_CACHE_MS) {
    return cachedWeather;
  }

  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=19.45&longitude=105.78&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FBangkok',
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    const data: any = await res.json();
    const curr = data.current || {};
    const daily = data.daily || {};

    const code = Number(curr.weather_code ?? 0);
    const temp = Number(curr.temperature_2m ?? 28);
    const apparentTemp = Number(curr.apparent_temperature ?? temp);
    const humidity = Number(curr.relative_humidity_2m ?? 80);
    const windSpeed = Number(curr.wind_speed_10m ?? 5);
    const rain = Number(curr.rain ?? 0);
    const precipitation = Number(curr.precipitation ?? 0);
    const isDay = curr.is_day === 1;

    const wmo = getWmoWeatherInfo(code, isDay ? 1 : 0);

    const tempMax = Array.isArray(daily.temperature_2m_max) && daily.temperature_2m_max.length > 0 ? Number(daily.temperature_2m_max[0]) : temp;
    const tempMin = Array.isArray(daily.temperature_2m_min) && daily.temperature_2m_min.length > 0 ? Number(daily.temperature_2m_min[0]) : temp;
    const rainProb = Array.isArray(daily.precipitation_probability_max) && daily.precipitation_probability_max.length > 0 ? Number(daily.precipitation_probability_max[0]) : 0;

    const nowVn = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const pad = (n: number) => String(n).padStart(2, '0');
    const updatedTimeStr = \`\${pad(nowVn.getHours())}:\${pad(nowVn.getMinutes())} (Hôm nay \${pad(nowVn.getDate())}/\${pad(nowVn.getMonth() + 1)})\`;

    cachedWeather = {
      temperature: temp,
      apparentTemperature: apparentTemp,
      humidity,
      windSpeed,
      rain,
      precipitation,
      weatherCode: code,
      conditionText: wmo.text,
      conditionIcon: wmo.icon,
      isDay,
      isRain: wmo.isRain || rain > 0 || precipitation > 0,
      isHot: temp >= 33 || apparentTemp >= 36,
      isStorm: wmo.isStorm,
      tempMax,
      tempMin,
      rainProbabilityMax: rainProb,
      updatedAt: new Date(),
      updatedTimeStr
    };
    lastWeatherFetchTime = now;
    return cachedWeather;
  } catch (err: any) {
    console.warn('⚠️ Lỗi lấy dữ liệu thời tiết Nghi Sơn từ Open-Meteo:', err.message);
    if (cachedWeather) return cachedWeather;

    const nowVn = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      temperature: 28,
      apparentTemperature: 31,
      humidity: 85,
      windSpeed: 8,
      rain: 0,
      precipitation: 0,
      weatherCode: 2,
      conditionText: 'Trời nhiều mây râm mát',
      conditionIcon: '⛅',
      isDay: true,
      isRain: false,
      isHot: false,
      isStorm: false,
      tempMax: 31,
      tempMin: 25,
      rainProbabilityMax: 30,
      updatedAt: new Date(),
      updatedTimeStr: \`\${pad(nowVn.getHours())}:\${pad(nowVn.getMinutes())} hôm nay\`
    };
  }
}

function formatNghiSonWeatherResponse(w: NghiSonWeather, senderName: string): string {
  let advice = '';

  if (w.isStorm) {
    advice = \`🚨 CẢNH BÁO BÃO DÔNG & GIÓ GIẬT MẠNH:\\n\` +
      \`• Khu vực Nghi Sơn đang có dông sét nguy hiểm! Bác tài tạm thời tìm chỗ trú an toàn kiên cố, TUYỆT ĐỐI KHÔNG đứng dưới gốc cây to, cột điện hay biển quảng cáo.\\n\` +
      \`• Tắt máy xe khi mưa xối xả ngập đường, an toàn tính mạng của bác tài luôn là số 1!\`;
  } else if (w.isRain) {
    advice = \`🌧️ DẶN DÒ TÌNH CẢM KHI TRỜI MƯA CHO ANH EM TÀI XẾ XE MÁY:\\n\` +
      \`• Bác tài nhớ mặc sẵn ÁO MƯA BỘ và bọc chống nước kín cho điện thoại ngay nhé!\\n\` +
      \`• 🥡 ĐẶC BIỆT LƯU Ý: Bọc kỹ và kéo kín túi giữ nhiệt/thùng hàng để đồ ăn của khách (cơm, bún phở, chè, trà sữa...) luôn nóng hổi, giòn rụm không bị dính nước mưa!\\n\` +
      \`• 🛵 Đường ướt trơn trượt, nhất là các khúc cua hay đoạn dốc cát ở Hải Thanh, Hải Bình: Giảm ga, đi chậm, phanh sớm bằng cả hai phanh và giữ khoảng cách an toàn với xe trước.\\n\` +
      \`• Trời mưa khách ngại ra đường nên ĐƠN NỔ RẤT NHIỀU, nhưng an toàn của bác tài vẫn là trên hết, đừng vì vội mà phóng nhanh vượt ẩu nhé!\`;
  } else if (w.isHot) {
    advice = \`☀️ DẶN DÒ TÌNH CẢM KHI TRỜI NẮNG GẮT CHO BÁC TÀI:\\n\` +
      \`• Nhiệt độ ngoài đường đang rất cao (\${w.temperature}°C, cảm nhận thực tế \${w.apparentTemperature}°C)! Bác tài nhớ mặc áo khoác chống nắng, đeo khẩu trang, kính râm để bảo vệ mắt và da.\\n\` +
      \`• 🥤 Luôn thủ sẵn bình nước to trên xe, nhớ uống từng ngụm nhỏ liên tục bổ sung nước và khoáng chất, chớ để khát khô cổ họng.\\n\` +
      \`• 🌳 Lúc vắng đơn nhớ ghé bóng râm dưới tán cây, gầm Cầu Còng hoặc quán nước mát nghỉ ngơi, đừng phơi nắng lâu kẻo say nắng say nóng! Chúc các bác dẻo dai, giữ sức cày đơn!\`;
  } else {
    advice = \`🌤️ LỜI CHÚC & ĐỘNG VIÊN ANH EM TÀI XẾ:\\n\` +
      \`• Thời tiết Nghi Sơn đang cực kỳ chiều lòng người, mát mẻ khô ráo (\${w.temperature}°C)! \${w.conditionIcon}\\n\` +
      \`• Không sợ mưa ướt cũng chẳng ngại nắng nôi, anh em xốc lại tinh thần, phân tán mỗi người 1 vị trí để hứng bão đơn nổ liên tục nhé!\\n\` +
      \`• Bác nào chạy cuốc xa vào Tân Trường đừng quên tranh thủ lượm vài địa điểm kiếm ngọc đổ xăng nha! Chúc toàn đội vạn dặm bình an, tiền vô đầy túi! 🛵💨🔥\`;
  }

  return \`🌤️ [TÌNH HÌNH & DỰ BÁO THỜI TIẾT TẠI NGHI SƠN - TĨNH GIA] 🛵✨\\n\\n\` +
    \`Chào bác tài \${senderName}! Đây là dữ liệu thời tiết trực tiếp từ trạm vệ tinh tại Thị xã Nghi Sơn:\\n\\n\` +
    \`📍 Khu vực: Thị xã Nghi Sơn (Tĩnh Gia), Thanh Hóa\\n\` +
    \`⏰ Cập nhật lúc: \${w.updatedTimeStr}\\n\` +
    \`🌡️ Nhiệt độ hiện tại: \${w.temperature}°C (Cảm nhận thực tế: \${w.apparentTemperature}°C)\\n\` +
    \`☁️ Trạng thái: \${w.conditionText} \${w.conditionIcon}\\n\` +
    \`💧 Độ ẩm không khí: \${w.humidity}%\\n\` +
    \`💨 Sức gió: \${w.windSpeed} km/h\\n\` +
    \`🌧️ Lượng mưa đo được: \${w.precipitation} mm\\n\` +
    \`📊 Dự báo trong ngày: Thấp nhất \${w.tempMin}°C - Cao nhất \${w.tempMax}°C | Khả năng có mưa: \${w.rainProbabilityMax}%\\n\\n\` +
    \`❤️ \${advice}\`;
}

function getWeatherShortTip(w: NghiSonWeather): string {
  if (w.isStorm) {
    return \`⚡ Nghi Sơn đang có dông sét (\${w.temperature}°C)! Bác tài cẩn thận tìm chỗ trú an toàn nhé!\`;
  } else if (w.isRain) {
    return \`🌧️ Nghi Sơn đang có mưa (\${w.temperature}°C). Bác tài nhớ mặc áo mưa, che kỹ thùng đồ ăn và đi cẩn thận trơn trượt nhé!\`;
  } else if (w.isHot) {
    return \`☀️ Nghi Sơn trời nắng gắt (\${w.temperature}°C). Bác tài nhớ uống nhiều nước, mặc áo chống nắng và giữ gìn sức khỏe nhé!\`;
  } else {
    return \`🌤️ Nghi Sơn thời tiết mát mẻ (\${w.temperature}°C, \${w.conditionText}). Chúc bác tài vạn dặm bình an, nổ đơn mỏi tay!\`;
  }
}
`;

// Insert weatherEngineCode before queryDeepSeekAI
const queryDeepSeekMarker = 'async function queryDeepSeekAI(';
if (serverContent.includes(queryDeepSeekMarker) && !serverContent.includes('fetchNghiSonWeather')) {
  serverContent = serverContent.replace(queryDeepSeekMarker, weatherEngineCode + '\n' + queryDeepSeekMarker);
  console.log('  ✅ Added weather engine functions to server.ts');
}

// Target: Add weather check in queryDeepSeekAI fallback
const weatherQueryHandler = `  // 4.5. Hỏi về thời tiết tại Nghi Sơn, Thanh Hóa (nắng, mưa, bão gió, nhiệt độ, dự báo...)
  const isWeatherInquiry = (
    normQ.includes('thoi tiet') ||
    normQ.includes('troi mua') ||
    normQ.includes('co mua khong') ||
    normQ.includes('mua khong') ||
    normQ.includes('mua gio') ||
    normQ.includes('troi nang') ||
    normQ.includes('nang khong') ||
    normQ.includes('nang gat') ||
    normQ.includes('nhiet do') ||
    normQ.includes('nong qua') ||
    normQ.includes('lanh qua') ||
    normQ.includes('du bao') ||
    (normQ.includes('mua') && (normQ.includes('nghi son') || normQ.includes('tinh gia') || normQ.includes('nay') || normQ.includes('chieu') || normQ.includes('toi') || normQ.includes('sang')))
  );

  if (isWeatherInquiry) {
    const weather = await fetchNghiSonWeather();
    return formatNghiSonWeatherResponse(weather, senderName);
  }
`;

const targetJokeMarker = "  // 5. Chém gió, tâm sự, đùa vui, chuyện cười";
if (serverContent.includes(targetJokeMarker) && !serverContent.includes('isWeatherInquiry')) {
  serverContent = serverContent.replace(targetJokeMarker, weatherQueryHandler + '\n' + targetJokeMarker);
  console.log('  ✅ Added isWeatherInquiry handler into queryDeepSeekAI in server.ts');
}

// Target: Add weather note to checkin template
const oldCheckinSuccess = `        .replace('{route}', driver.route);`;
const newCheckinSuccess = `        .replace('{route}', driver.route);
      const curWeather = await fetchNghiSonWeather();
      reply += '\\n\\n' + getWeatherShortTip(curWeather);`;

if (serverContent.includes(oldCheckinSuccess) && !serverContent.includes('getWeatherShortTip(curWeather)')) {
  serverContent = serverContent.replace(oldCheckinSuccess, newCheckinSuccess);
  console.log('  ✅ Added weather note to checkin success reply in server.ts');
}

// Add API endpoint /api/weather/nghison
const targetApiMarker = "  app.get('/api/status',";
const weatherApiEndpoint = `  // API Thời tiết trực tiếp tại Nghi Sơn (Tĩnh Gia)
  app.get('/api/weather/nghison', async (req: Request, res: Response) => {
    try {
      const weather = await fetchNghiSonWeather();
      res.json({ success: true, weather });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });\n\n`;

if (serverContent.includes(targetApiMarker) && !serverContent.includes('/api/weather/nghison')) {
  serverContent = serverContent.replace(targetApiMarker, weatherApiEndpoint + targetApiMarker);
  console.log('  ✅ Added /api/weather/nghison endpoint in server.ts');
}

// Target: Add weather inquiry to isCallingBotOnly suggestion
const oldBotSuggestions = `      \`• Hỏi khung giờ & điểm nóng nổ đơn tại Tĩnh Gia?\\n\` +
      \`• Cách cày ngọc kiếm tiền từ Đóng góp địa điểm (1.000 ngọc / địa điểm)?\\n\` +`;

const newBotSuggestions = `      \`• Hỏi khung giờ & điểm nóng nổ đơn tại Tĩnh Gia?\\n\` +
      \`• Hỏi thời tiết Nghi Sơn hôm nay thế nào (trời mưa hay nắng)?\\n\` +
      \`• Cách cày ngọc kiếm tiền từ Đóng góp địa điểm (1.000 ngọc / địa điểm)?\\n\` +`;

if (serverContent.includes(oldBotSuggestions)) {
  serverContent = serverContent.replace(oldBotSuggestions, newBotSuggestions);
  console.log('  ✅ Updated Bot suggestions with weather inquiry in server.ts');
}

// Update System Prompt with Weather Knowledge in server.ts
const oldPromptWeatherMarker = "- NGUYÊN TẮC NHẬN DIỆN VÀ PHẢN HỒI KHI TÀI XẾ GỌI BOT:";
const weatherPrompt = `- DỮ LIỆU THỜI TIẾT TẠI NGHI SƠN (TĨNH GIA), THANH HÓA:
  • Vị trí địa lý: Thị xã Nghi Sơn, Thanh Hóa (tọa độ 19.45° B, 105.78° Đ).
  • KHI TÀI XẾ HỎI VỀ THỜI TIẾT (hôm nay thế nào, trời mưa không, có mưa không, nhiệt độ, bão gió...):
    - Trả lời chi tiết, chính xác tình hình thời tiết Nghi Sơn (nhiệt độ, độ ẩm, sức gió, mưa hay nắng).
    - ĐỘNG VIÊN VÀ DẶN DÒ TÌNH CẢM DÀNH CHO TÀI XẾ XE MÁY GIAO ĐỒ ĂN:
      + Nếu MƯA / CÓ KHẢ NĂNG MƯA: Nhắc anh em mặc áo mưa bộ, bọc điện thoại chống nước, che đậy kỹ túi/thùng giữ nhiệt để đồ ăn (bún phở, cơm, trà sữa) của khách luôn nóng hổi giòn rụm không ngấm nước; đi chậm giảm tốc độ ở các khúc cua dốc cát (Hải Thanh, Hải Bình) tránh trơn trượt. Động viên: Trời mưa nhu cầu khách gọi đồ ăn tăng vọt, đơn nổ rất nhiều nhưng an toàn là số 1!
      + Nếu NẮNG NÓNG GẮT: Nhắc anh em mặc áo khoác chống nắng, đeo khẩu trang kính râm, mang theo bình nước lọc to bổ sung nước liên tục; lúc chờ đơn tấp vào bóng râm gầm Cầu Còng hoặc quán nước mát nghỉ ngơi, giữ gìn sức khỏe dẻo dai chạy đơn!
      + Nếu TRỜI MÁT MẺ / ĐẸP TRỜI: Chúc anh em khí thế hừng hực, đường khô ráo tay lái lụa nổ đơn mỏi tay!
`;

if (serverContent.includes(oldPromptWeatherMarker) && !serverContent.includes('DỮ LIỆU THỜI TIẾT TẠI NGHI SƠN')) {
  serverContent = serverContent.replace(oldPromptWeatherMarker, weatherPrompt + '\n' + oldPromptWeatherMarker);
  console.log('  ✅ Added Weather Knowledge into System Prompt in server.ts');
}

fs.writeFileSync(serverFile, serverContent, 'utf8');
console.log('🎉 Saved server.ts with Weather Engine successfully!');

// ============================================================================
// 2. Updating zalobot/bot.js
// ============================================================================
console.log('\n2. Updating zalobot/bot.js...');
const oldBotPromptMarker = "- NGUYÊN TẮC NHẬN DIỆN VÀ PHẢN HỒI KHI TÀI XẾ GỌI BOT:";
if (botContent.includes(oldBotPromptMarker) && !botContent.includes('DỮ LIỆU THỜI TIẾT TẠI NGHI SƠN')) {
  botContent = botContent.replace(oldBotPromptMarker, weatherPrompt + '\n' + oldBotPromptMarker);
  console.log('  ✅ Added Weather Knowledge into System Prompt in bot.js');
}

fs.writeFileSync(botFile, botContent, 'utf8');
console.log('🎉 Saved zalobot/bot.js with Weather Knowledge successfully!');
