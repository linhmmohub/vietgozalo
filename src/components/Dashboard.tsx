import React from 'react';
import { 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  UserX, 
  FileText, 
  TrendingUp, 
  Clock, 
  Truck, 
  ArrowRight,
  ShieldAlert,
  Bot
} from 'lucide-react';
import type { AttendanceStats, AttendanceRecord, Shift, Driver } from '../types';

interface DashboardProps {
  stats: AttendanceStats;
  recentRecords: AttendanceRecord[];
  activeShift?: Shift;
  drivers: Driver[];
  onOpenSimulator: () => void;
  onFilterStatus: (status: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  recentRecords,
  activeShift,
  drivers,
  onOpenSimulator,
  onFilterStatus
}) => {
  // Find drivers who haven't checked in yet
  const checkedInDriverIds = new Set(recentRecords.map(r => r.driverId));
  const missingDrivers = drivers.filter(d => d.active && !checkedInDriverIds.has(d.id));

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if any drivers are missing in current shift */}
      {missingDrivers.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-200">
                Còn {missingDrivers.length} tài xế chưa điểm danh trong ngày hôm nay!
              </h4>
              <p className="text-xs text-amber-300/80">
                Hệ thống bot Zalo đang tự động quét tin nhắn nhóm. Bạn cũng có thể gửi lời nhắc qua Zalo hoặc điểm danh thủ công.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-lg transition-colors"
          >
            <Bot className="w-4 h-4" />
            <span>Thử gửi tin nhắn Zalo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Drivers */}
        <div 
          onClick={() => onFilterStatus('all')}
          className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded-xl p-4 cursor-pointer transition-all hover:border-slate-700 hover:shadow-lg"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Tổng Đội Xe</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.totalDrivers}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Truck className="w-3 h-3 text-blue-400" />
            <span>Tất cả phương tiện</span>
          </div>
        </div>

        {/* Checked-in on time */}
        <div 
          onClick={() => onFilterStatus('on_time')}
          className="bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 cursor-pointer transition-all hover:border-emerald-500/50 hover:shadow-lg"
        >
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Đúng Giờ</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300">{stats.onTimeCount}</div>
          <div className="text-[11px] text-emerald-400/80 mt-1">
            Tỷ lệ đúng giờ: {stats.punctualityRate}%
          </div>
        </div>

        {/* Late */}
        <div 
          onClick={() => onFilterStatus('late')}
          className="bg-amber-950/20 hover:bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 cursor-pointer transition-all hover:border-amber-500/50 hover:shadow-lg"
        >
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Đi Trễ</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300">{stats.lateCount}</div>
          <div className="text-[11px] text-amber-400/80 mt-1">
            Vượt quá thời gian ân hạn
          </div>
        </div>

        {/* Completed / Checked-out */}
        <div 
          onClick={() => onFilterStatus('completed')}
          className="bg-indigo-950/20 hover:bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 cursor-pointer transition-all hover:border-indigo-500/50 hover:shadow-lg"
        >
          <div className="flex items-center justify-between text-indigo-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Đã Về Bãi</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-300">{stats.completedCount}</div>
          <div className="text-[11px] text-indigo-400/80 mt-1">
            Đã chốt ca & km ODO
          </div>
        </div>

        {/* Leave */}
        <div 
          onClick={() => onFilterStatus('leave')}
          className="bg-purple-950/20 hover:bg-purple-950/30 border border-purple-500/30 rounded-xl p-4 cursor-pointer transition-all hover:border-purple-500/50 hover:shadow-lg"
        >
          <div className="flex items-center justify-between text-purple-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Nghỉ Phép</span>
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300">{stats.leaveCount}</div>
          <div className="text-[11px] text-purple-400/80 mt-1">
            Có báo trước qua Zalo
          </div>
        </div>

        {/* Absent */}
        <div 
          onClick={() => onFilterStatus('absent')}
          className="bg-rose-950/20 hover:bg-rose-950/30 border border-rose-500/30 rounded-xl p-4 cursor-pointer transition-all hover:border-rose-500/50 hover:shadow-lg"
        >
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Chưa Điểm Danh</span>
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-300">{stats.absentCount}</div>
          <div className="text-[11px] text-rose-400/80 mt-1">
            Cần nhắc nhở / gọi điện
          </div>
        </div>
      </div>

      {/* Progress Bars & Quick Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attendance Rate Widget */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Tiến Độ Điểm Danh Toàn Đội
              </h3>
              <span className="text-lg font-black text-blue-400">{stats.attendanceRate}%</span>
            </div>
            
            {/* Multi-segment Progress Bar */}
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
              <div 
                className="bg-emerald-500 transition-all duration-500" 
                style={{ width: `${(stats.onTimeCount / (stats.totalDrivers || 1)) * 100}%` }}
                title={`Đúng giờ: ${stats.onTimeCount}`}
              />
              <div 
                className="bg-amber-500 transition-all duration-500" 
                style={{ width: `${(stats.lateCount / (stats.totalDrivers || 1)) * 100}%` }}
                title={`Đi trễ: ${stats.lateCount}`}
              />
              <div 
                className="bg-purple-500 transition-all duration-500" 
                style={{ width: `${(stats.leaveCount / (stats.totalDrivers || 1)) * 100}%` }}
                title={`Nghỉ phép: ${stats.leaveCount}`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Đúng giờ: <strong>{stats.onTimeCount}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Trễ giờ: <strong>{stats.lateCount}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Chưa có mặt: <strong>{stats.absentCount}</strong></span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Ca trực chính: <strong>{activeShift?.name || 'Ca Sáng (06:00 - 14:00)'}</strong></span>
            <span>Khung điểm danh: <strong className="text-emerald-400">06:00 - 09:00 (Chốt 09:00)</strong></span>
          </div>
        </div>

        {/* Zalo Bot Auto-Listener Card */}
        <div className="bg-gradient-to-br from-blue-950/60 to-slate-900/90 border border-blue-800/40 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 flex items-center justify-center text-blue-400">
                  <Bot className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Zalo Bot Auto Receiver</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE 24/7
              </span>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed mt-2">
              Tài xế chỉ cần nhắn 4 số cuối SĐT (ví dụ: <code className="bg-emerald-900/60 text-emerald-200 px-1 py-0.5 rounded font-mono font-bold">online3389</code>) hoặc hỏi bất kỳ thông tin nào (SĐT đồng đội, địa chỉ kho...), <strong>DeepSeek AI</strong> sẽ tự động nhận diện & trả lời ngay!
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-blue-900/40 flex items-center justify-between">
            <span className="text-xs text-blue-300 font-mono">Webhook: /api/zalo/webhook</span>
            <button
              onClick={onOpenSimulator}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
            >
              Mở mô phỏng chat
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Missing Driver Quick List */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <UserX className="w-4 h-4 text-rose-400" />
                Tài Xế Chưa Điểm Danh ({missingDrivers.length})
              </h3>
            </div>

            <div className="space-y-2 mt-2 max-h-[120px] overflow-y-auto pr-1">
              {missingDrivers.length === 0 ? (
                <div className="text-xs text-emerald-400 flex items-center gap-2 py-4 justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tuyệt vời! Toàn bộ tài xế đã điểm danh đủ.</span>
                </div>
              ) : (
                missingDrivers.slice(0, 4).map((drv) => (
                  <div key={drv.id} className="flex items-center justify-between text-xs bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{drv.name}</span>
                      <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700 text-[10px]">
                        {drv.licensePlate}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px]">{drv.phone}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {missingDrivers.length > 4 && (
            <div className="text-[11px] text-slate-400 text-center mt-2 pt-2 border-t border-slate-800">
              Và còn {missingDrivers.length - 4} tài xế khác chưa điểm danh...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
