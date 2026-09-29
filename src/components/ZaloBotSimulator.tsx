import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  RefreshCw, 
  Users, 
  FileCode, 
  Zap,
  BrainCircuit,
  Phone,
  HelpCircle,
  Sparkles,
  Info,
  Clock,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api, playChime } from '../services/api';
import type { Driver } from '../types';

interface MessageItem {
  id: string;
  sender: 'user' | 'bot';
  senderName: string;
  senderAvatar?: string;
  text: string;
  time: string;
  isSuccess?: boolean;
  actionType?: string;
}

interface ZaloBotSimulatorProps {
  drivers: Driver[];
  onAttendanceUpdated: () => void;
}

export const ZaloBotSimulator: React.FC<ZaloBotSimulatorProps> = ({
  drivers,
  onAttendanceUpdated,
}) => {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'msg-welcome',
      sender: 'bot',
      senderName: '🤖 VietGo Food & DeepSeek AI Bot',
      text: '🤖 BOT ĐIỂM DANH & TRỢ LÝ AI SHIPPER XE MÁY GIAO ĐỒ ĂN ĐÃ SẴN SÀNG! 🛵🍱\n👉 Tra cứu phím tắt & ca trực: Nhắn "trogiupvietgo" hoặc "trợ giúp"\n👉 Điểm danh siêu gọn: online3389 (hoặc: online3389 8h-14h)\n👉 Kiểm tra quân số: checkonline (hoặc: dsonline)\n👉 Ra ca / chốt ca: off3389 (hoặc: kt3389)\n👉 Báo nghỉ: nghi3389 xe bị thủng lốp (hoặc: "hôm nay a nghỉ nhé")\n👉 Hỏi đáp & Chém gió AI: Thêm chữ "ai " đầu câu (VD: "ai khu Đống Đa hôm nay đông đơn không?", "ai sdt điều phối?")',
      time: '05:30'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(drivers[0] || null);
  const [isLoading, setIsLoading] = useState(false);
  const [rawWebhookResponse, setRawWebhookResponse] = useState<any>(null);
  const [showJsonInspector, setShowJsonInspector] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const getPhoneTail = (phone?: string) => {
    const digits = (phone || '').replace(/\D/g, '');
    return digits.length >= 4 ? digits.slice(-4) : digits || '3389';
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const senderName = selectedDriver ? `${selectedDriver.name} (${selectedDriver.licensePlate})` : 'Tài xế Zalo';
    const currentTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      senderName: senderName,
      text: text,
      time: currentTimeStr
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);
    playChime('message');

    try {
      const result = await api.simulateZaloMessage({
        message: text,
        senderName: selectedDriver ? selectedDriver.name : 'Tài xế Zalo',
        senderId: selectedDriver ? `sim_${selectedDriver.id}` : 'sim_user_001',
        groupId: 'zalo_group_fleet_main',
        groupName: 'ĐỘI XE VẬN TẢI - ĐIỂM DANH & HỖ TRỢ'
      });

      setRawWebhookResponse(result);

      const botMsg: MessageItem = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        senderName: result.action === 'ai_query' ? '🤖 DeepSeek AI Assistant' : '🤖 Zalo Fleet Bot',
        text: result.reply,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        isSuccess: result.success,
        actionType: result.action
      };

      setMessages(prev => [...prev, botMsg]);

      if (result.success && result.action === 'checkin') {
        playChime('success');
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      } else if (result.success) {
        playChime('success');
      } else {
        playChime('alert');
      }

      onAttendanceUpdated();
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          senderName: '🤖 Hệ Thống',
          text: `❌ Lỗi xử lý: ${err.message || 'Không thể kết nối máy chủ'}`,
          time: currentTimeStr,
          isSuccess: false
        }
      ]);
      playChime('alert');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCommand = (template: string) => {
    let finalCmd = template;
    const tail = getPhoneTail(selectedDriver?.phone);
    finalCmd = finalCmd.replace('{tail}', tail);
    if (selectedDriver) {
      finalCmd = finalCmd.replace('{plate}', selectedDriver.licensePlate);
      finalCmd = finalCmd.replace('{name}', selectedDriver.name);
    } else {
      finalCmd = finalCmd.replace('{plate}', '36B-3389');
      finalCmd = finalCmd.replace('{name}', 'Tuấn');
    }
    setInputMessage(finalCmd);
    handleSendMessage(finalCmd);
  };

  const handleBroadcastMorningReminder = async () => {
    try {
      setIsLoading(true);
      const res = await api.triggerMorningReminder();
      const botMsg: MessageItem = {
        id: `reminder-${Date.now()}`,
        sender: 'bot',
        senderName: '⏰ Zalo Scheduler Bot (06:00 Sáng)',
        text: res.message,
        time: '06:00',
        isSuccess: true,
        actionType: 'reminder'
      };
      setMessages(prev => [...prev, botMsg]);
      playChime('message');
    } catch (e: any) {
      alert(`Lỗi phát thông báo: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBroadcastOverdueWarning = async () => {
    try {
      setIsLoading(true);
      const res = await api.triggerOverdueWarning();
      const botMsg: MessageItem = {
        id: `overdue-${Date.now()}`,
        sender: 'bot',
        senderName: '📊 Bot Quản Lý Chế Tài (Tổng Hợp 09:00 Sáng)',
        text: res.message,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        isSuccess: true,
        actionType: 'warning'
      };
      setMessages(prev => [...prev, botMsg]);
      playChime('alert');
      onAttendanceUpdated();
    } catch (e: any) {
      alert(`Lỗi quét cảnh báo: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTail = getPhoneTail(selectedDriver?.phone);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column (4 Cols): Driver selector & Quick Action Buttons */}
      <div className="lg:col-span-4 space-y-4">
        {/* Driver Picker for Simulation */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Chọn Tài Xế Nhắn Tin
            </h3>
            <span className="text-[10px] text-slate-400">Giả lập</span>
          </div>

          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
            {drivers.map(drv => {
              const tail = getPhoneTail(drv.phone);
              const isSelected = selectedDriver?.id === drv.id;
              return (
                <button
                  key={drv.id}
                  onClick={() => setSelectedDriver(drv)}
                  className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between border transition-all ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500/50 text-white font-semibold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="truncate">
                    <div>{drv.name}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span>{drv.phone}</span>
                      <span className="text-emerald-400 font-mono font-bold">(Mã: {tail})</span>
                    </div>
                  </div>
                  <span className="bg-white text-slate-950 font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ml-2 flex-shrink-0">
                    {drv.licensePlate}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedDriver && (
            <div className="bg-blue-950/40 border border-blue-900/60 p-2.5 rounded-lg text-xs text-blue-300 flex items-center justify-between">
              <div>
                <span>Đang chọn: <strong>{selectedDriver.name}</strong></span>
                <div className="text-[11px] text-emerald-400 font-mono font-bold">
                  Cú pháp nhanh: online{selectedTail}
                </div>
              </div>
              <span className="text-xs font-mono bg-blue-900/60 px-2 py-1 rounded text-white font-bold">
                {selectedDriver.licensePlate}
              </span>
            </div>
          )}
        </div>

        {/* Quick Attendance Commands (Simplified online3389 & trogiupvietgo) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Cú Pháp & Phím Tắt VietGo
            </h3>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">1-Click</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {/* New: trogiupvietgo button */}
            <button
              onClick={() => handleQuickCommand('trogiupvietgo')}
              className="text-left p-2.5 rounded-lg bg-gradient-to-r from-amber-950/60 to-slate-950 hover:from-amber-900/60 hover:to-slate-900 border border-amber-500/50 text-xs transition-colors group"
            >
              <div className="font-semibold text-amber-300 flex items-center justify-between">
                <span>🔰 Trợ Giúp: "trogiupvietgo" (hoặc "trợ giúp")</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">Phím Tắt</span>
              </div>
              <div className="font-mono text-[11px] text-amber-200 mt-0.5 font-bold">
                trogiupvietgo
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Xem toàn bộ phím tắt báo ca, vào/ra ca, giờ giấc ca sáng/chiều/đêm & quy định chế tài!
              </div>
            </button>

            {/* Checkonline button */}
            <button
              onClick={() => handleQuickCommand('checkonline')}
              className="text-left p-2.5 rounded-lg bg-gradient-to-r from-cyan-950/70 to-slate-950 hover:from-cyan-900/60 hover:to-slate-900 border border-cyan-500/50 text-xs transition-colors group"
            >
              <div className="font-semibold text-cyan-300 flex items-center justify-between">
                <span>📊 Kiểm Tra Quân Số: "checkonline" (hoặc "dsonline")</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-mono font-bold">Mới</span>
              </div>
              <div className="font-mono text-[11px] text-cyan-200 mt-0.5 font-bold">
                checkonline
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Báo cáo tức thì: Ai đang Online (kèm khung giờ), ai đã Offline, ai Báo nghỉ, ai Chưa điểm danh!
              </div>
            </button>

            <button
              onClick={() => handleQuickCommand('online{tail}')}
              className="text-left p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-emerald-900/60 text-xs transition-colors group"
            >
              <div className="font-semibold text-emerald-400 flex items-center justify-between">
                <span>1. Gõ "online{selectedTail}" (AI hỏi khung giờ)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">2 Bước</span>
              </div>
              <div className="font-mono text-[11px] text-slate-200 mt-0.5">
                online{selectedTail}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Nếu không kèm giờ ➔ AI hỏi lại khung giờ (1..5 hoặc tự nhập) để tự phân ca
              </div>
            </button>

            <button
              onClick={() => handleQuickCommand('online{tail} làm full')}
              className="text-left p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-teal-800/60 text-xs transition-colors group"
            >
              <div className="font-semibold text-teal-300 flex items-center justify-between">
                <span>2. Tài xế Full-time: "online{selectedTail} làm full"</span>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 px-1.5 py-0.2 rounded font-mono">Full Day</span>
              </div>
              <div className="font-mono text-[11px] text-teal-200 mt-0.5">
                online{selectedTail} làm full (hoặc: 6-23h, cả ngày)
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Tự động nhận diện Toàn Ca (06:00 - 23:00) cho tài xế fulltime, không cần hỏi lại
              </div>
            </button>

            <button
              onClick={() => handleQuickCommand('online{tail} 8h-14h')}
              className="text-left p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs transition-colors group"
            >
              <div className="font-semibold text-sky-400 flex items-center justify-between">
                <span>3. Điểm danh + Khung giờ cụ thể (8h-14h)</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded font-mono">1 Bước</span>
              </div>
              <div className="font-mono text-[11px] text-slate-300 mt-0.5">
                online{selectedTail} 8h-14h
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                AI bóc tách tài xế {selectedTail}, nhận diện ca (08:00 - 14:00) phân bổ vào ca Vietgo
              </div>
            </button>

            {/* Early Checkin for Tomorrow (from 21:00) */}
            <button
              onClick={() => handleQuickCommand('online{tail} mai chạy ca 8h-17h')}
              className="text-left p-2.5 rounded-lg bg-gradient-to-r from-blue-950/70 to-indigo-950/70 hover:from-blue-900/60 hover:to-indigo-900 border border-indigo-500/50 text-xs transition-colors group"
            >
              <div className="font-semibold text-indigo-300 flex items-center justify-between">
                <span>🌙 3. Điểm Danh Sớm Ngày Mai (Từ 21h đêm)</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-mono font-bold">Từ 21:00</span>
              </div>
              <div className="font-mono text-[11px] text-indigo-200 mt-0.5 font-bold">
                online{selectedTail} mai chạy ca 8h-17h
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Tính từ 21h đêm hôm trước trở đi: Tự động ghi nhận điểm danh sớm cho ngày mai, sáng mai không cần điểm lại!
              </div>
            </button>

            <button
              onClick={() => handleQuickCommand('hôm nay a nghỉ nhé')}
              className="text-left p-2.5 rounded-lg bg-slate-950 hover:bg-purple-950/50 border border-purple-800/60 text-xs transition-colors group"
            >
              <div className="font-semibold text-pink-300 flex items-center justify-between">
                <span>3. Chat tự nhiên: "hôm nay a nghỉ"</span>
                <span className="text-[10px] bg-pink-500/20 text-pink-300 px-1.5 py-0.2 rounded font-mono">Deep AI</span>
              </div>
              <div className="font-mono text-[11px] text-pink-200 mt-0.5">
                hôm nay a nghỉ nhé
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                AI tự đối chiếu người gửi ({selectedDriver?.name || 'Tuấn'}), nhận diện xưng "a" (anh) và ghi nhận nghỉ làm hôm nay!
              </div>
            </button>

            <button
              onClick={() => handleQuickCommand('nghi lam {tail} Xe bi hu mang vao gara')}
              className="text-left p-2.5 rounded-lg bg-slate-950 hover:bg-purple-950/40 border border-purple-900/60 text-xs transition-colors group"
            >
              <div className="font-semibold text-purple-300 flex items-center justify-between">
                <span>4. Báo nghỉ + Lý do: "nghi lam {selectedTail}"</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-mono">AI RAG</span>
              </div>
              <div className="font-mono text-[11px] text-purple-200 mt-0.5">
                nghi lam {selectedTail} Xe bi hu mang vao gara
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                AI bóc tách nhận biết tài xế và lý do nghỉ, cập nhật bảng công
              </div>
            </button>

            <button
              onClick={() => handleQuickCommand('off{tail}')}
              className="text-left p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs transition-colors group"
            >
              <div className="font-semibold text-indigo-400">
                5. Ra ca / Về bãi: off{selectedTail} (hoặc kt{selectedTail})
              </div>
              <div className="font-mono text-[11px] text-slate-300 mt-0.5">
                off{selectedTail}
              </div>
            </button>

          </div>
        </div>


        {/* DeepSeek AI Questions & Chit-chat RAG Test */}
        <div className="bg-gradient-to-br from-indigo-950/50 to-slate-900 border border-indigo-500/30 rounded-xl p-4 shadow-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-indigo-400" />
              AI Chém Gió & Tra Cứu (Cú Pháp: "ai ...")
            </h3>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
              Chống Spam
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Cú pháp: <code className="text-indigo-300 font-bold">ai [nội dung]</code> hoặc <code className="text-indigo-300 font-bold">bot [nội dung]</code>. Nhắn chuyện thường không có tiền tố sẽ không bị bot spam!
          </p>

          <div className="grid grid-cols-1 gap-1.5 text-xs">
            {/* Săn đơn theo giờ & tư vấn địa bàn */}
            <button
              onClick={() => handleQuickCommand('ai giờ này ở đâu lắm đơn em ơi?')}
              className="text-left p-2.5 rounded-lg bg-gradient-to-r from-amber-950/70 to-orange-950/60 hover:from-amber-900/60 hover:to-orange-900/60 border border-amber-500/50 text-amber-200 transition-colors"
            >
              <div className="font-semibold text-amber-300 flex items-center justify-between">
                <span>🔥 ai giờ này ở đâu lắm đơn em ơi?</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">Khung Giờ Vàng</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                AI tự check giờ thực tế, chỉ điểm nóng (Hải Bình, Cầu Còng, Bình Minh, VIB, Mai Hương...), khuyên không tụ tập đông
              </div>
            </button>

            <button
              onClick={() => handleQuickCommand('ai đứng đâu nổ đơn ngon nhất?')}
              className="text-left p-2 rounded-lg bg-slate-950/80 hover:bg-amber-950/40 border border-amber-900/50 text-amber-200 transition-colors"
            >
              <div className="font-medium text-amber-300">📍 ai ở đâu lắm đơn / đứng đâu nổ đơn?</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Lịch trình săn đơn Hải Bình, Cầu Còng, Bình Minh, Nhân Loan, VIB...</div>
            </button>

            <button
              onClick={() => handleQuickCommand('ai sao app tài xế đang bật mà lại bị tắt?')}
              className="text-left p-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/50 text-emerald-200 transition-colors"
            >
              <div className="font-semibold text-emerald-300 flex items-center justify-between">
                <span>📱 ai sao app tài xế đang bật mà bị tắt?</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">KÈM ẢNH</span>
              </div>
              <div className="text-[10px] text-emerald-300/80 mt-0.5">Hướng dẫn tắt toggle khoanh tròn trong Quyền ứng dụng Android</div>
            </button>

            <button
              onClick={() => handleQuickCommand('ai kinh nghiệm đi đường Hải Thanh thế nào?')}
              className="text-left p-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/50 text-cyan-200 transition-colors"
            >
              <div className="font-semibold text-cyan-300 flex items-center justify-between">
                <span>🗺️ ai kinh nghiệm đi đường Hải Thanh?</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-mono font-bold">BÍ KÍP MAP</span>
              </div>
              <div className="text-[10px] text-cyan-300/80 mt-0.5">Tránh lạc như bác Bốn, xác định 3 trục đường chính</div>
            </button>

            <button
              onClick={() => handleQuickCommand('ai cảnh báo khách Toàn Định Hải?')}
              className="text-left p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/50 text-rose-200 transition-colors"
            >
              <div className="font-semibold text-rose-300 flex items-center justify-between">
                <span>⚠️ ai cảnh báo khách Toàn Định Hải?</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded font-mono font-bold">CẢNH BÁO</span>
              </div>
              <div className="text-[10px] text-rose-300/80 mt-0.5">Chỉ riêng khách tên Toàn (Định Hải), không quy chung cả vùng</div>
            </button>

            <button
              onClick={() => handleQuickCommand('ai khách nhờ đem lên phòng bệnh viện thì sao?')}
              className="text-left p-2 rounded-lg bg-teal-950/60 hover:bg-teal-900/80 border border-teal-500/50 text-teal-200 transition-colors"
            >
              <div className="font-semibold text-teal-300 flex items-center justify-between">
                <span>🏥 ai khách nhờ đem lên phòng bệnh viện?</span>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 px-1.5 py-0.2 rounded font-mono font-bold">ỨNG XỬ</span>
              </div>
              <div className="text-[10px] text-teal-300/80 mt-0.5">Chịu khó đem lên, tuyệt đối không tỏ thái độ khó chịu</div>
            </button>

            <button
              onClick={() => handleQuickCommand('ai gọi khách không nghe máy thì làm sao?')}
              className="text-left p-2 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 border border-blue-500/50 text-blue-200 transition-colors"
            >
              <div className="font-semibold text-blue-300 flex items-center justify-between">
                <span>📞 ai gọi khách không nghe máy?</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-mono font-bold">ZALO & HỖ TRỢ</span>
              </div>
              <div className="text-[10px] text-blue-300/80 mt-0.5">Kết bạn Zalo tiêu đề chuẩn, không được gọi anh Cương</div>
            </button>

            <button
              onClick={() => handleQuickCommand('ai quán hết món báo hủy thì xử lý thế nào?')}
              className="text-left p-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/50 text-amber-200 transition-colors"
            >
              <div className="font-semibold text-amber-300 flex items-center justify-between">
                <span>🍲 ai quán hết món thì làm sao?</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">ĐỔI MÓN</span>
              </div>
              <div className="text-[10px] text-amber-300/80 mt-0.5">Chủ động gọi khách đổi món tương đương, tăng tỷ lệ đặt lại</div>
            </button>

            <button
              onClick={() => handleQuickCommand('ai tới quán mà quán làm đồ lâu quá?')}
              className="text-left p-2 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/50 text-indigo-200 transition-colors"
            >
              <div className="font-semibold text-indigo-300 flex items-center justify-between">
                <span>⏳ ai quán làm đồ lâu khi đã tới?</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-mono font-bold">TRẤN AN</span>
              </div>
              <div className="text-[10px] text-indigo-300/80 mt-0.5">Nhắn tin trên app báo khách đợi chút, có đồ giao liền</div>
            </button>

            <button
              onClick={() => handleQuickCommand('ai chém gió tí đi em ơi!')}
              className="text-left p-2 rounded-lg bg-gradient-to-r from-purple-950/60 to-slate-950 hover:from-purple-900/60 hover:to-slate-900 border border-purple-500/40 text-purple-200 transition-colors"
            >
              <div className="font-semibold text-purple-300">💬 ai chém gió tí đi em ơi!</div>
              <div className="text-[10px] text-slate-400 mt-0.5">AI trò chuyện, chúc anh em vững tay lái & bình an</div>
            </button>

            <button
              onClick={() => handleQuickCommand('ai kể 1 câu chuyện cười về nghề tài xế đi')}
              className="text-left p-2 rounded-lg bg-slate-950/80 hover:bg-indigo-950/80 border border-indigo-900/50 text-indigo-200 transition-colors"
            >
              <div className="font-medium">😂 ai kể 1 câu chuyện cười về nghề tài xế đi</div>
            </button>

            <button
              onClick={() => handleQuickCommand('ai sdt của bác tài {name} chạy xe {plate}?')}
              className="text-left p-2 rounded-lg bg-slate-950/80 hover:bg-indigo-950/80 border border-indigo-900/50 text-indigo-200 transition-colors"
            >
              <div className="font-medium">📞 ai sdt của bác tài {selectedDriver?.name || 'Tuấn'} 36B?</div>
            </button>

            <button
              onClick={() => handleQuickCommand('ai hôm nay tài xế xe {plate} có đi làm không em?')}
              className="text-left p-2 rounded-lg bg-slate-950/80 hover:bg-indigo-950/80 border border-indigo-900/50 text-indigo-200 transition-colors"
            >
              <div className="font-medium">⏰ ai xe {selectedDriver?.licensePlate || '36B'} hôm nay có chạy không?</div>
            </button>

            {/* Anti-fraud & Strict Regulation Questions */}
            <button
              onClick={() => handleQuickCommand('ai Hủy đơn trên app rồi thương lượng nhận chạy ngoài thu tiền riêng được không?')}
              className="text-left p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/50 text-rose-200 transition-colors"
            >
              <div className="font-semibold text-rose-300 flex items-center justify-between">
                <span>🚫 ai Hủy đơn app chạy ngoài thu tiền mặt riêng được không?</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded font-mono font-bold">CẤM CHẠY NGOÀI</span>
              </div>
              <div className="text-[10px] text-rose-300/80 mt-0.5">Thử nghiệm phản hồi dứt khoát của AI về quy định cấm chạy đơn ngoài nền tảng</div>
            </button>

            <button
              onClick={() => handleQuickCommand('ai Cho em thu thêm 20k tiền gửi xe hoặc xin tiền tip của khách được không?')}
              className="text-left p-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/50 text-amber-200 transition-colors"
            >
              <div className="font-semibold text-amber-300 flex items-center justify-between">
                <span>🚫 ai Thu thêm 20k tiền gửi xe hoặc đòi xin tiền tip được không?</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">CẤM VÒI TIỀN</span>
              </div>
              <div className="text-[10px] text-amber-300/80 mt-0.5">Thử nghiệm phản hồi dứt khoát của AI về quy định cấm đòi phụ phí & vòi tiền tip</div>
            </button>

            <button
              onClick={() => handleQuickCommand('ai Đơn gần vài trăm mét ít tiền quá em bỏ không chạy hoặc ngại di chuyển xa từ chối đơn được không?')}
              className="text-left p-2 rounded-lg bg-orange-950/60 hover:bg-orange-900/80 border border-orange-500/50 text-orange-200 transition-colors"
            >
              <div className="font-semibold text-orange-300 flex items-center justify-between">
                <span>🚫 ai Chê đơn gần ít tiền hoặc ngại di chuyển xa từ chối đơn được không?</span>
                <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.2 rounded font-mono font-bold">CẤM CHÊ ĐƠN</span>
              </div>
              <div className="text-[10px] text-orange-300/80 mt-0.5">Thử nghiệm phản hồi của AI về quy định cấm chọn lọc đơn gần/xa</div>
            </button>

            <button
              onClick={() => handleQuickCommand('bot liên hệ ai khi cần hỗ trợ về tài xế?')}
              className="text-left p-2 rounded-lg bg-slate-950/80 hover:bg-indigo-950/80 border border-indigo-900/50 text-indigo-200 transition-colors"
            >
              <div className="font-medium">📞 bot liên hệ ai khi cần hỗ trợ?</div>
              <div className="text-[10px] text-indigo-300/80 mt-0.5">SĐT A Cương (0967659655), A Sức & A Linh</div>
            </button>

            <button
              onClick={() => handleQuickCommand('ai địa chỉ các kho bãi và cây xăng đổ dầu?')}
              className="text-left p-2 rounded-lg bg-slate-950/80 hover:bg-indigo-950/80 border border-indigo-900/50 text-indigo-200 transition-colors"
            >
              <div className="font-medium">🏢 ai địa chỉ kho bãi & định mức xăng dầu?</div>
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Simulated Zalo Chat Window (8 Cols) */}
      <div className="lg:col-span-8 flex flex-col h-[670px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Automation Quick Broadcast Bar */}
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            Tự động hóa Bot Zalo:
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBroadcastMorningReminder}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Mô phỏng phát tin nhắn 06:00 sáng mở cổng điểm danh trong 3h trước 9h và khuyến khích điểm danh sớm"
            >
              <span>⏰ Phát Lời Nhắc 06:00 Sáng</span>
            </button>

            <button
              onClick={handleBroadcastOverdueWarning}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Đúng 09:00 sáng, hệ thống tự động tổng hợp danh sách đã điểm danh (kèm khung giờ làm việc), người báo nghỉ và tạm khóa nhận đơn ai chưa điểm danh"
            >
              <span>⚠️ Quét 09:00 Sáng & Tổng Hợp</span>
            </button>
          </div>
        </div>

        {/* Zalo Group Chat Header */}
        <div className="bg-gradient-to-r from-[#0068FF] to-[#0047b3] px-4 py-3 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center font-black text-sm">
                🚗
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-blue-600"></span>
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                <span>ĐỘI XE VẬN TẢI & TRỢ LÝ DEEPSEEK AI</span>
                <span className="bg-emerald-400/30 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded border border-emerald-300/40">
                  onlineXXXX
                </span>
              </h3>
              <p className="text-[11px] text-blue-100/80 flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{drivers.length + 1} thành viên • 🧠 AI Knowledge Enabled</span>
              </p>
            </div>
          </div>


          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowJsonInspector(!showJsonInspector)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 font-mono ${
                showJsonInspector 
                  ? 'bg-white text-blue-900 border-white font-bold' 
                  : 'bg-blue-700/60 hover:bg-blue-700 border-blue-400/40 text-blue-100'
              }`}
              title="Xem dữ liệu Webhook JSON"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{showJsonInspector ? 'Ẩn JSON' : 'Xem JSON'}</span>
            </button>

            <button
              onClick={() => {
                setMessages([
                  {
                    id: 'msg-welcome',
                    sender: 'bot',
                    senderName: '🤖 Zalo Fleet & DeepSeek AI Bot',
                    text: '🤖 BOT ĐIỂM DANH & TRỢ LÝ AI ĐÃ SẴN SÀNG TRONG NHÓM!\n👉 Tra cứu phím tắt & giờ làm việc: Nhắn "trogiupvietgo" hoặc "trợ giúp"\n👉 Điểm danh siêu gọn: online3389 (hoặc: checkin3389, online3389 8h-14h)\n👉 Bác tài Full-time chỉ cần điểm danh 1 lần duy nhất trong ngày/ca.\n👉 Ra ca: off3389 (hoặc: checkout3389)\n👉 Báo nghỉ phép: nghi3389 [lý do]\n👉 Gọi AI chém gió / hỏi đáp: ai [nội dung] (VD: ai sdt bác tài Cương?, ai địa bàn hoạt động?)',
                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                  }
                ]);
              }}
              className="p-1.5 hover:bg-blue-700/60 rounded-lg text-blue-100 transition-colors"
              title="Làm mới lịch sử chat"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* JSON Inspector Panel */}
        {showJsonInspector && (
          <div className="bg-slate-950 border-b border-slate-800 p-3 text-xs font-mono max-h-44 overflow-y-auto">
            <div className="text-slate-400 mb-1 flex items-center justify-between">
              <span>📡 Raw Webhook Response Data:</span>
              <span className="text-emerald-400">Endpoint: POST /api/zalo/webhook</span>
            </div>
            <pre className="text-emerald-300 text-[11px] overflow-x-auto bg-slate-900/90 p-2 rounded border border-slate-800">
              {rawWebhookResponse ? JSON.stringify(rawWebhookResponse, null, 2) : '// Chưa có lượt gọi webhook nào. Hãy thử gửi tin nhắn bên dưới!'}
            </pre>
          </div>
        )}

        {/* Chat Messages Body */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/60 scroll-smooth"
        >
          {messages.map((msg) => {
            const isBot = msg.sender === 'bot';
            const isAiQuery = msg.actionType === 'ai_query';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[88%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {isBot ? (
                    <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs shadow-md ring-1 ${
                      isAiQuery ? 'bg-indigo-600 ring-indigo-400' : 'bg-blue-600 ring-blue-400'
                    }`}>
                      {isAiQuery ? '🧠' : '🤖'}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold ring-1 ring-slate-600">
                      {msg.senderName.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div className="space-y-1">
                  <div className={`text-[11px] font-semibold flex items-center gap-1.5 ${isBot ? 'text-left text-slate-400' : 'text-right text-slate-400 justify-end'}`}>
                    <span>{msg.senderName}</span>
                    {isAiQuery && (
                      <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 rounded font-normal border border-indigo-500/30">
                        DeepSeek AI
                      </span>
                    )}
                  </div>

                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-md ${
                      isBot
                        ? isAiQuery
                          ? 'bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-800/50 text-slate-100 rounded-tl-sm shadow-indigo-950/20'
                          : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-sm'
                        : 'bg-[#0068FF] text-white rounded-tr-sm'
                    }`}
                  >
                    {msg.text}
                    {isBot && (msg.text.includes('QUẢN LÝ ỨNG DỤNG NẾU KHÔNG DÙNG') || msg.text.includes('khoanh tròn') || msg.text.includes('Quyền ứng dụng')) && (
                      <div className="mt-3 pt-2 border-t border-slate-800/80">
                        <div className="text-[11px] text-amber-300 font-semibold mb-1 flex items-center gap-1">
                          <span>📸 ẢNH HƯỚNG DẪN: Tắt mục khoanh tròn & mũi tên chỉ</span>
                        </div>
                        <img
                          src="/images_training/photo_2026-09-29_15-28-30.jpg"
                          alt="Hướng dẫn quyền ứng dụng"
                          className="rounded-xl border border-indigo-500/50 shadow-lg max-h-72 w-auto object-contain cursor-pointer hover:opacity-90 transition-all hover:scale-[1.02]"
                          onClick={() => window.open('/images_training/photo_2026-09-29_15-28-30.jpg', '_blank')}
                          title="Bấm để phóng to ảnh hướng dẫn"
                        />
                        <div className="text-[10px] text-slate-400 mt-1 italic">
                          (Bấm vào ảnh để xem kích thước đầy đủ)
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`text-[10px] text-slate-500 ${isBot ? 'text-left' : 'text-right'}`}>
                    {msg.time}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium py-1">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></div>
              <span>Trợ lý DeepSeek AI đang phân tích dữ liệu đội xe...</span>
            </div>
          )}
        </div>

        {/* Input Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder={`Nhập tin nhắn (VD: online${selectedTail} hoặc hỏi "SĐT của bác tài Tuấn?")...`}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-[#0068FF] hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Gửi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
