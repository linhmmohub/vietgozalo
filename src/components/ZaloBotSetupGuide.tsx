import React, { useState } from 'react';
import { 
  Server, 
  Copy, 
  Check, 
  Download, 
  Key, 
  Globe, 
  Terminal, 
  Cpu, 
  Settings, 
  Save, 
  Code2, 
  BrainCircuit,
  Sparkles,
  Send,
  HelpCircle,
  BookOpen,
  Zap,
  Phone
} from 'lucide-react';
import type { BotConfig } from '../types';

interface ZaloBotSetupGuideProps {
  botConfig: BotConfig;
  onUpdateConfig: (config: Partial<BotConfig>) => void;
}

function cleanZaloMarkdown(text: string): string {
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

export const ZaloBotSetupGuide: React.FC<ZaloBotSetupGuideProps> = ({
  botConfig,
  onUpdateConfig,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'deepseek' | 'syntax' | 'code' | 'vps' | 'config'>('deepseek');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [formData, setFormData] = useState<BotConfig>(botConfig);
  const [isSaved, setIsSaved] = useState(false);

  // Test AI in setup tab
  const [testQuestion, setTestQuestion] = useState('Bác tài Cương số điện thoại bao nhiêu?');
  const [testAnswer, setTestAnswer] = useState<string | null>(null);
  const [isTestingAI, setIsTestingAI] = useState(false);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const webhookUrl = `${currentOrigin}/api/zalo/webhook`;

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleTestAIQuery = async () => {
    if (!testQuestion.trim() || isTestingAI) return;
    setIsTestingAI(true);
    setTestAnswer(null);

    try {
      const res = await fetch('/api/deepseek/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: testQuestion,
          senderName: 'Quản lý Điều phối'
        })
      });
      const data = await res.json();
      setTestAnswer(data.reply);
    } catch (e: any) {
      setTestAnswer(`❌ Lỗi: ${e.message}`);
    } finally {
      setIsTestingAI(false);
    }
  };

  const botWorkerCode = `/**
 * =========================================================================
 * ZALO FLEET ATTENDANCE & DEEPSEEK AI BOT - GATEWAY SERVER (24/7)
 * =========================================================================
 * Điểm danh siêu gọn: online3389 | Ra ca: off3389 | Nghỉ: nghi3389
 * Tự động trả lời câu hỏi tài xế bằng DeepSeek AI & RAG Data
 * =========================================================================
 */

const { Zalo } = require('zalo-api');
const axios = require('axios');
const fs = require('fs');

const CONFIG = {
  WEBHOOK_URL: '${webhookUrl}',
  WEBHOOK_SECRET: '${botConfig.webhookSecret}',
  SESSION_FILE: './zalo_session.json',
  AUTO_REPLY: ${botConfig.autoReplyEnabled}
};

console.log('---------------------------------------------------------');
console.log('🚀 ZALO FLEET ATTENDANCE & DEEPSEEK BOT - KHỞI ĐỘNG...');
console.log('📡 Webhook URL:', CONFIG.WEBHOOK_URL);
console.log('---------------------------------------------------------');

${cleanZaloMarkdown.toString()}

async function startBot() {
  try {
    let sessionData = null;
    if (fs.existsSync(CONFIG.SESSION_FILE)) {
      sessionData = JSON.parse(fs.readFileSync(CONFIG.SESSION_FILE, 'utf8'));
      console.log('🔑 Đã tìm thấy file đăng nhập cũ, đang khôi phục phiên...');
    }

    const zalo = new Zalo({
      cookie: sessionData?.cookie,
      imei: sessionData?.imei,
      userAgent: sessionData?.userAgent
    }, {
      selfListen: false,
      checkUpdate: false
    });

    const api = await zalo.login();
    
    const newSession = {
      cookie: api.getCookie(),
      imei: api.getImei(),
      userAgent: api.getUserAgent()
    };
    fs.writeFileSync(CONFIG.SESSION_FILE, JSON.stringify(newSession, null, 2));
    console.log('✅ ĐĂNG NHẬP ZALO THÀNH CÔNG!');
    console.log('🎧 Đang lắng nghe tin nhắn từ nhóm tài xế...');

    api.listener.on('message', async (message) => {
      try {
        const text = message.data.content || message.data.msg || '';
        const senderId = message.data.uidFrom || message.data.senderId;
        const senderName = message.data.dName || message.data.displayName || 'Tài xế';
        const groupId = message.data.idTo || message.data.groupId;
        const groupName = message.data.groupName || 'Nhóm Zalo';
        const isGroup = !!message.data.isGroup;

        if (!text || typeof text !== 'string' || text.trim() === '') return;

        console.log(\`[📩 \${new Date().toLocaleTimeString()}] \${senderName}: "\${text}" (\${groupName})\`);

        const res = await axios.post(CONFIG.WEBHOOK_URL, {
          senderId,
          senderName,
          groupId,
          groupName,
          isGroup,
          message: text,
          timestamp: Date.now()
        }, {
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-secret': CONFIG.WEBHOOK_SECRET
          },
          timeout: 15000
        });

        if (res.data && res.data.reply && CONFIG.AUTO_REPLY) {
          const replyText = cleanZaloMarkdown(res.data.reply);
          console.log(\`[🤖 Bot Auto-Reply -> \${senderName}]:\\n\${replyText}\`);
          
          if (isGroup && groupId) {
            await api.sendMessage({ msg: replyText, quote: message }, groupId, 1);
          } else if (senderId) {
            await api.sendMessage({ msg: replyText }, senderId, 0);
          }
        }
      } catch (err) {
        console.error('❌ Lỗi webhook:', err.message);
      }
    });

    api.listener.start();

  } catch (err) {
    console.error('❌ Lỗi khởi động Bot:', err.message);
    console.log('⏳ Thử lại sau 15 giây...');
    setTimeout(startBot, 15000);
  }
}

startBot();
`;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-blue-950/70 border border-indigo-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                <BrainCircuit className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Cấu Hình Zalo Bot & Đào Tạo Trí Tuệ Nhân Tạo DeepSeek AI
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Hệ thống hỗ trợ <strong>cú pháp điểm danh siêu gọn</strong> (ví dụ: <code className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">online3389</code> là 4 số cuối SĐT) và <strong>tích hợp API DeepSeek AI</strong> để tự động trả lời, tra cứu số điện thoại tài xế, tuyến đường, quy chế công ty ngay trong nhóm Zalo.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5 font-mono">
            <div className="text-slate-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Webhook Endpoint:</span>
            </div>
            <div className="text-emerald-300 bg-slate-900 px-2 py-1 rounded border border-slate-800 break-all select-all">
              {webhookUrl}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('deepseek')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
            activeSubTab === 'deepseek'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <BrainCircuit className="w-4 h-4 text-indigo-300" />
          <span>1. Cấu Hình DeepSeek AI & Dữ Liệu Train</span>
        </button>

        <button
          onClick={() => setActiveSubTab('syntax')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
            activeSubTab === 'syntax'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Zap className="w-4 h-4 text-emerald-300" />
          <span>2. Cú Pháp Điểm Danh Rút Gọn</span>
        </button>

        <button
          onClick={() => setActiveSubTab('code')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
            activeSubTab === 'code'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>3. Mã Nguồn Bot (bot.js)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('vps')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
            activeSubTab === 'vps'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>4. Cài Đặt VPS Linux 24/7 (PM2)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('config')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
            activeSubTab === 'config'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>5. Mẫu Câu Phản Hồi Bot</span>
        </button>
      </div>

      {/* SUB-TAB 1: DEEPSEEK AI INTEGRATION & KNOWLEDGE TRAINING */}
      {activeSubTab === 'deepseek' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: AI Config Form (7 Cols) */}
          <form onSubmit={handleSaveConfig} className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-400" />
                  Cấu Hình API DeepSeek & Đào Tạo Dữ Liệu
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tự động tra cứu SĐT tài xế, tuyến đường, quy định công ty và giải đáp thắc mắc
                </p>
              </div>

              <button
                type="submit"
                className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Cài Đặt</span>
              </button>
            </div>

            {isSaved && (
              <div className="bg-emerald-950/60 border border-emerald-500/50 p-3 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Đã lưu thành công cấu hình DeepSeek AI và Dữ liệu đào tạo!</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* DeepSeek Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-200">Kích Hoạt Trợ Lý DeepSeek AI</div>
                  <div className="text-[11px] text-slate-400">
                    Khi bật, bot sẽ trả lời mọi câu hỏi trong nhóm Zalo dựa trên dữ liệu đội xe & quy chế đã train
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.deepseekEnabled}
                  onChange={(e) => setFormData({ ...formData, deepseekEnabled: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded border-slate-700 cursor-pointer"
                />
              </div>

              {/* API Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    <span>DeepSeek API Key</span>
                  </label>
                  <a
                    href="https://platform.deepseek.com/api_keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>Lấy key tại platform.deepseek.com</span>
                    <Sparkles className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  value={formData.deepseekApiKey}
                  onChange={(e) => setFormData({ ...formData, deepseekApiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Nếu để trống API Key, hệ thống vẫn tích hợp sẵn <strong>Smart Assistant</strong> tra cứu tức thì toàn bộ SĐT tài xế, kho bãi và chính sách!
                </p>
              </div>

              {/* Model & Endpoint */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mô Hình AI (Model)</label>
                  <select
                    value={formData.deepseekModel}
                    onChange={(e) => setFormData({ ...formData, deepseekModel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  >
                    <option value="deepseek-chat">deepseek-chat (Nhanh & Tiết kiệm)</option>
                    <option value="deepseek-reasoner">deepseek-reasoner (Suy luận sâu)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">API Endpoint</label>
                  <input
                    type="text"
                    value={formData.deepseekBaseUrl}
                    onChange={(e) => setFormData({ ...formData, deepseekBaseUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Knowledge Base Textarea */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <span>Dữ Liệu Đào Tạo / Quy Chế & Danh Bạ Doanh Nghiệp (Knowledge Context)</span>
                </label>
                <textarea
                  rows={8}
                  value={formData.companyKnowledge}
                  onChange={(e) => setFormData({ ...formData, companyKnowledge: e.target.value })}
                  placeholder="Nhập thông tin hỗ trợ tài xế (A Cương 0967.659.655, A Sức 0969.397.370, A Linh), quy định điểm danh, sự cố ứng dụng..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  * Hệ thống tự động ghép dữ liệu này cùng với <strong>danh sách toàn bộ tài xế (Tên, SĐT, mã đuôi, biển số, ca trực, trạng thái hôm nay)</strong> khi gửi đến DeepSeek AI.
                </span>
              </div>
            </div>
          </form>

          {/* Right: Interactive AI Test Box (5 Cols) */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Kiểm Tra Trực Tiếp Câu Hỏi AI</h3>
              </div>
              <p className="text-xs text-slate-400">
                Thử đặt câu hỏi giống như tài xế trong nhóm Zalo để xem câu trả lời của hệ thống:
              </p>

              <div className="space-y-2">
                <input
                  type="text"
                  value={testQuestion}
                  onChange={(e) => setTestQuestion(e.target.value)}
                  placeholder="Nhập câu hỏi test..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />

                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTestQuestion('Bác tài Cương số điện thoại bao nhiêu?')}
                    className="bg-slate-950 hover:bg-slate-800 px-2 py-1 rounded border border-slate-800 text-slate-300"
                  >
                    🔍 SĐT bác tài Cương?
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestQuestion('Hôm nay tài xế xe 36B có đi làm không?')}
                    className="bg-slate-950 hover:bg-slate-800 px-2 py-1 rounded border border-slate-800 text-slate-300"
                  >
                    ⏰ Xe 36B hôm nay có chạy?
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestQuestion('Cần hỗ trợ về tài xế hoặc công việc thì liên hệ ai?')}
                    className="bg-slate-950 hover:bg-slate-800 px-2 py-1 rounded border border-slate-800 text-slate-300"
                  >
                    📞 SĐT hỗ trợ tài xế (A Cương)?
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestQuestion('Hủy đơn trên app rồi thương lượng nhận chạy ngoài thu tiền mặt riêng được không?')}
                    className="bg-rose-950/80 hover:bg-rose-900 px-2 py-1 rounded border border-rose-500/50 text-rose-200 font-medium"
                  >
                    🚫 Hủy đơn app chạy ngoài?
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestQuestion('Cho em thu thêm 20k tiền gửi xe hoặc xin tiền tip của khách được không?')}
                    className="bg-amber-950/80 hover:bg-amber-900 px-2 py-1 rounded border border-amber-500/50 text-amber-200 font-medium"
                  >
                    🚫 Thu thêm 20k hoặc vòi tip?
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestQuestion('Đơn gần vài trăm mét ít tiền quá em bỏ không chạy hoặc ngại di chuyển xa từ chối đơn được không?')}
                    className="bg-orange-950/80 hover:bg-orange-900 px-2 py-1 rounded border border-orange-500/50 text-orange-200 font-medium"
                  >
                    🚫 Chê đơn gần / Ngại chạy xa?
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestAIQuery}
                disabled={isTestingAI || !testQuestion.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold py-2.5 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTestingAI ? 'DeepSeek Đang Xử Lý...' : 'Gửi Câu Hỏi Đến AI'}</span>
              </button>
            </div>

            {/* AI Result Box */}
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>Kết quả phản hồi từ AI:</span>
              </span>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap font-sans min-h-[140px] max-h-[220px] overflow-y-auto leading-relaxed">
                {testAnswer ? (
                  testAnswer
                ) : (
                  <span className="text-slate-500 italic">
                    Nhấn "Gửi Câu Hỏi Đến AI" để xem cách DeepSeek trả lời và tra cứu thông tin tài xế.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SIMPLIFIED SYNTAX GUIDE */}
      {activeSubTab === 'syntax' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Quy Chuẩn Cú Pháp Điểm Danh Rút Gọn Siêu Nhanh</h3>
              <p className="text-xs text-slate-400">
                Tài xế không cần gõ dài dòng, chỉ cần gõ <strong>online + 4 số đuôi số điện thoại</strong> của mình
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* 0. Help / trogiupvietgo */}
            <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/40 space-y-2 md:col-span-2 lg:col-span-3 bg-gradient-to-r from-amber-950/20 to-slate-950">
              <div className="font-bold text-amber-400 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs text-amber-300 font-bold">★</span>
                  <span>Phím Tắt Tra Cứu Toàn Bộ Cú Pháp & Giờ Làm Việc</span>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">Phím Tắt Đội Xe</span>
              </div>
              <p className="text-slate-300">
                Tài xế chỉ cần nhắn <code className="bg-slate-900 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">trogiupvietgo</code> hoặc <code className="bg-slate-900 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">trợ giúp</code>, Bot sẽ trả về toàn bộ phím tắt báo ca (vào ca, ra ca, nghỉ phép) và khung giờ làm việc của các ca!
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900 p-2.5 rounded-lg font-mono text-[11px] text-slate-200 border border-slate-800">
                <div className="text-amber-300 font-bold">👉 trogiupvietgo</div>
                <div className="text-amber-300 font-bold">👉 trợ giúp / tro giup</div>
                <div className="text-amber-300 font-bold">👉 phim tat / huong dan</div>
              </div>
            </div>

            {/* 1. Check-in */}
            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2">
              <div className="font-bold text-emerald-400 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">1</span>
                  <span>Điểm Danh Đầu Ca / Báo Vào Ca</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">Mở từ 21h tối</span>
              </div>
              <p className="text-slate-300">
                Cú pháp: <code className="bg-slate-900 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">online[4 số đuôi SĐT] [Khung giờ tùy chọn]</code>
              </p>
              <div className="bg-slate-900 p-2.5 rounded-lg font-mono text-slate-200 border border-slate-800 space-y-1">
                <div className="text-emerald-300">Ví dụ 1: online3389</div>
                <div className="text-emerald-300">Ví dụ 2: online3389 8h-14h</div>
                <div className="text-indigo-300">🌙 Điểm danh ngày mai: Nhắn từ 21:00 đêm hôm trước (sáng mai không cần điểm lại)</div>
              </div>
            </div>

            {/* 2. Checkout */}
            <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-2">
              <div className="font-bold text-indigo-400 flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs">2</span>
                <span>Kết Thúc Ca / Về Bãi</span>
              </div>
              <p className="text-slate-300">
                Cú pháp: <code className="bg-slate-900 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold">off[4 số đuôi SĐT]</code> hoặc <code className="bg-slate-900 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold">kt[4 số đuôi]</code>
              </p>
              <div className="bg-slate-900 p-2.5 rounded-lg font-mono text-slate-200 border border-slate-800 space-y-1">
                <div className="text-indigo-300">Ví dụ 1: off3389</div>
                <div className="text-slate-300">Ví dụ 2: kt3389</div>
                <div className="text-slate-400">Ví dụ 3: off6655</div>
              </div>
            </div>

            {/* 3. Leave */}
            <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/30 space-y-2">
              <div className="font-bold text-purple-400 flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs">3</span>
                <span>Báo Nghỉ Phép / Báo Vắng</span>
              </div>
              <p className="text-slate-300">
                Cú pháp: <code className="bg-slate-900 text-purple-300 px-2 py-0.5 rounded font-mono font-bold">nghi[4 số đuôi] [Lý do]</code> hoặc chat tự nhiên
              </p>
              <div className="bg-slate-900 p-2.5 rounded-lg font-mono text-slate-200 border border-slate-800 space-y-1">
                <div className="text-purple-300">Ví dụ 1: nghi3389 Xe thay lốp</div>
                <div className="text-pink-300">Ví dụ 2: "hôm nay a nghỉ nhé"</div>
                <div className="text-slate-400">Ví dụ 3: "nay Tuấn nghỉ việc gia đình"</div>
              </div>
            </div>

            {/* 4. Checkonline & Reporting */}
            <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 space-y-2">
              <div className="font-bold text-cyan-400 flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs">4</span>
                <span>Tra Cứu: "checkonline" (Tình Hình Toàn Đội)</span>
              </div>
              <p className="text-slate-300 text-xs">
                Cú pháp: <code className="bg-slate-900 text-cyan-300 px-2 py-0.5 rounded font-mono font-bold">checkonline</code> hoặc <code className="bg-slate-900 text-cyan-300 px-1.5 py-0.5 rounded font-mono font-bold">dsonline</code>, <code className="bg-slate-900 text-cyan-300 px-1.5 py-0.5 rounded font-mono font-bold">ds</code>
              </p>
              <div className="bg-slate-900 p-2.5 rounded-lg font-mono text-slate-200 border border-slate-800 space-y-1 text-[11px]">
                <div className="text-emerald-300">🟢 Ai đang Online + Giờ vào ca & Khung giờ</div>
                <div className="text-indigo-300">🏁 Ai đã Offline (Ra ca / Về bãi) + km chạy</div>
                <div className="text-purple-300">🟡 Ai báo nghỉ phép + Lý do</div>
                <div className="text-rose-400">🔴 Ai chưa điểm danh + Trạng thái</div>
              </div>
            </div>

            {/* 5. Shift hours & 09:00 AM comprehensive summary */}
            <div className="bg-slate-950 p-4 rounded-xl border border-sky-500/30 space-y-2">
              <div className="font-bold text-sky-400 flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center text-xs">5</span>
                <span>Khung Điểm Danh 06h-09h & Tổng Hợp Lúc 09:00</span>
              </div>
              <p className="text-slate-300 text-xs">
                Mở điểm danh 3h trước 9h sáng (06:00 - 09:00). <strong>Khuyến khích điểm danh sớm!</strong> Đúng 09:00 sáng tự động tổng hợp:
              </p>
              <div className="bg-slate-900 p-2.5 rounded-lg font-mono text-slate-200 border border-slate-800 space-y-1 text-[11px]">
                <div className="text-emerald-300 font-semibold">🟢 1. Người đã điểm danh + Khung giờ làm việc</div>
                <div className="text-purple-300 font-semibold">🟡 2. Danh sách báo nghỉ phép (kèm lý do)</div>
                <div className="text-rose-400 font-bold">🔴 3. Người chưa điểm danh (Quá 09h tạm khóa nhận đơn)</div>
                <div className="text-amber-300 font-bold">⚡ 4. Nhắn "online[4 số đuôi]" để tự động gỡ khóa</div>
              </div>
            </div>

            {/* 6. AI Query & Chit-chat */}
            <div className="bg-slate-950 p-4 rounded-xl border border-blue-500/30 space-y-2 md:col-span-2 lg:col-span-2">
              <div className="font-bold text-blue-400 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">6</span>
                  <span>Gọi AI Chém Gió & Hỏi Đáp (Có Cú Pháp Chống Spam)</span>
                </div>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono">Chống Spam Nhóm</span>
              </div>
              <p className="text-slate-300">
                Thêm tiền tố <code className="bg-slate-900 text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold">ai [nội dung]</code> hoặc <code className="bg-slate-900 text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold">bot [nội dung]</code>. Bot chỉ trả lời khi có tiền tố này, tránh làm phiền khi anh em tán gẫu trong nhóm:
              </p>
              <div className="bg-slate-900 p-2.5 rounded-lg font-mono text-slate-200 border border-slate-800 space-y-1">
                <div className="text-purple-300">💬 Chém gió: "ai chém gió tí đi", "ai kể chuyện cười tài xế"</div>
                <div className="text-blue-300">🔍 Tra cứu SĐT: "ai sdt bác tài Cương?"</div>
                <div className="text-slate-300">📞 Hỗ trợ tài xế: "bot liên hệ ai?", "bot sdt anh Cương?"</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: BOT CODE */}
      {activeSubTab === 'code' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-400" />
                Mã Nguồn Client Zalo Bot Gateway (Node.js)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Chạy file này trên máy chủ / VPS để tự động nhận tin nhắn Zalo và gọi Webhook hệ thống
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(botWorkerCode, 'bot_code')}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-md"
              >
                {copiedKey === 'bot_code' ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Đã Sao Chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Sao Chép Toàn Bộ Mã</span>
                  </>
                )}
              </button>

              <a
                href="/api/bot-script"
                download="zalo-bot-worker.js"
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-700 transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Tải File .js</span>
              </a>
            </div>
          </div>

          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono overflow-x-auto max-h-[480px] leading-relaxed">
            {botWorkerCode}
          </pre>
        </div>
      )}

      {/* SUB-TAB 4: VPS DEPLOYMENT */}
      {activeSubTab === 'vps' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" />
              Hướng Dẫn Treo Nick Zalo 24/7 Bằng PM2 Trên VPS Ubuntu
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Đảm bảo server Zalo Bot của bạn luôn online liên tục, tự động khởi động lại nếu sập mạng.
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-cyan-400">1. Cài đặt Node.js & PM2:</div>
              <div className="bg-slate-900 p-3 rounded-lg font-mono text-xs text-slate-200 border border-slate-800">
                curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -<br />
                sudo apt-get install -y nodejs<br />
                sudo npm install -g pm2
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-cyan-400">2. Cài thư viện Zalo:</div>
              <div className="bg-slate-900 p-3 rounded-lg font-mono text-xs text-slate-200 border border-slate-800">
                mkdir ~/zalo-driver-bot && cd ~/zalo-driver-bot<br />
                npm init -y<br />
                npm install zalo-api axios
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-cyan-400">3. Quét QR đăng nhập lần đầu:</div>
              <div className="bg-slate-900 p-3 rounded-lg font-mono text-xs text-slate-200 border border-slate-800">
                node bot.js
              </div>
              <p className="text-slate-400 text-xs">
                Mở ứng dụng Zalo trên điện thoại quét mã QR hiển thị trên màn hình. Phiên đăng nhập sẽ tự động lưu lại vĩnh viễn.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-cyan-400">4. Chạy ngầm vĩnh viễn với PM2:</div>
              <div className="bg-slate-900 p-3 rounded-lg font-mono text-xs text-slate-200 border border-slate-800">
                pm2 start bot.js --name "zalo-fleet-bot"<br />
                pm2 save && pm2 startup
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: BOT TEMPLATES & GENERAL CONFIG */}
      {activeSubTab === 'config' && (
        <form onSubmit={handleSaveConfig} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                Cấu Hình Mẫu Câu Phản Hồi Tự Động
              </h3>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Mẫu Điểm Danh Đúng Giờ</label>
              <textarea
                rows={4}
                value={formData.successCheckInTemplate}
                onChange={(e) => setFormData({ ...formData, successCheckInTemplate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Mẫu Điểm Danh Đi Trễ</label>
              <textarea
                rows={4}
                value={formData.lateCheckInTemplate}
                onChange={(e) => setFormData({ ...formData, lateCheckInTemplate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Mẫu Kết Thúc Ca</label>
              <textarea
                rows={3}
                value={formData.checkOutTemplate}
                onChange={(e) => setFormData({ ...formData, checkOutTemplate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
