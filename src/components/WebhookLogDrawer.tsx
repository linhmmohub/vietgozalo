import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  X, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare, 
  Trash2, 
  Clock, 
  Radio 
} from 'lucide-react';
import { api } from '../services/api';
import type { WebhookLog } from '../types';

interface WebhookLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebhookLogDrawer: React.FC<WebhookLogDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getWebhookLogs();
      setLogs(data);
    } catch (e) {
      console.error('Failed to load webhook logs', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Webhook Logs Realtime</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Lịch sử tin nhắn nhận được từ server nick Zalo</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Làm mới log"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Radio className="w-8 h-8 mx-auto mb-2 text-slate-600 animate-pulse" />
              <p>Chưa có gói tin Webhook nào được ghi nhận</p>
              <p className="text-[11px] mt-1 text-slate-600">
                Hãy thử gửi tin nhắn trong phần Mô Phỏng Zalo Bot để xem log trực tiếp!
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">{log.timestamp}</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold ${
                      log.status === 'success'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {log.parsedCommand}
                  </span>
                </div>

                <div className="text-slate-200">
                  <span className="text-blue-400 font-bold">{log.senderName}</span>
                  {log.groupName && (
                    <span className="text-slate-500 text-[10px] ml-1">({log.groupName})</span>
                  )}
                </div>

                <div className="bg-slate-900 p-2 rounded text-slate-300 text-[11px] border border-slate-800/60 break-words">
                  "{log.message}"
                </div>

                {log.matchedPlate && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <span>Biển số khớp:</span>
                    <span className="text-emerald-300 font-bold">{log.matchedPlate}</span>
                  </div>
                )}

                {log.replySent && (
                  <div className="text-[10px] text-slate-400 italic bg-blue-950/20 p-1.5 rounded border border-blue-900/30">
                    Phản hồi: {log.replySent.slice(0, 100)}...
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
