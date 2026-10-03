import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Truck, 
  Clock, 
  Radio, 
  Users, 
  CalendarCheck, 
  FileSpreadsheet, 
  Server, 
  Terminal, 
  PlusCircle, 
  ShieldCheck,
  RefreshCw,
  MapPin
} from 'lucide-react';
import type { Shift, AttendanceStats } from '../types';

interface NavbarProps {
  activeTab: 'attendance' | 'simulator' | 'drivers' | 'shifts' | 'reports' | 'setup';
  setActiveTab: (tab: 'attendance' | 'simulator' | 'drivers' | 'shifts' | 'reports' | 'setup') => void;
  activeShift?: Shift;
  stats?: AttendanceStats;
  onOpenQuickCheckIn: () => void;
  onOpenLogs: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeShift,
  stats,
  onOpenQuickCheckIn,
  onOpenLogs,
  onRefresh,
  isLoading
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weatherInfo, setWeatherInfo] = useState<{ temp: number; icon: string; text: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('/api/weather/nghison')
      .then(r => r.json())
      .then(d => {
        if (d && d.weather) {
          setWeatherInfo({
            temp: d.weather.temperature,
            icon: d.weather.conditionIcon,
            text: d.weather.conditionText
          });
        }
      })
      .catch(() => {});
  }, []);

  const formattedDate = currentTime.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
      {/* Top Banner / Status Bar */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 px-4 py-2 border-b border-blue-900/40 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>Zalo Webhook Listener: <strong>ONLINE (Port 3000)</strong></span>
          </div>

          {weatherInfo && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300">
              <span className="text-xs">{weatherInfo.icon}</span>
              <span>Nghi Sơn: <strong>{weatherInfo.temp}°C</strong> ({weatherInfo.text})</span>
            </div>
          )}

          {activeShift && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300">
              <Clock className="w-3 h-3 text-blue-400" />
              <span>Ca hiện tại: <strong>{activeShift.name}</strong></span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-slate-300">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-slate-400 capitalize">{formattedDate}</span>
            <span className="text-blue-400 font-bold bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
              {formattedTime}
            </span>
          </div>

          <button 
            onClick={onRefresh}
            disabled={isLoading}
            title="Làm mới dữ liệu"
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Nav Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Branding */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('attendance')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-600/30 ring-2 ring-blue-500/20">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">
                Zalo Fleet Attendance
              </h1>
              <span className="bg-blue-600/20 border border-blue-500/40 text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Zalo Bot v2.5
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Hệ thống Điểm danh & Chấm công Đội xe Tự động
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenQuickCheckIn}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-md shadow-emerald-900/30 hover:shadow-emerald-900/50 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Điểm Danh Thủ Công</span>
          </button>

          <button
            onClick={onOpenLogs}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Xem Webhook Logs</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto no-scrollbar gap-1 border-t border-slate-800/80">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'attendance'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Bảng Điểm Danh Hôm Nay</span>
          {stats && (
            <span className="ml-1 bg-blue-900/60 text-blue-300 text-[11px] px-2 py-0.5 rounded-full font-bold">
              {stats.totalCheckedIn}/{stats.totalDrivers}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'simulator'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Bot className="w-4 h-4 text-indigo-400" />
          <span>Mô Phỏng Chat & DeepSeek AI</span>
          <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
            onlineXXXX & AI
          </span>
        </button>

        <button
          onClick={() => setActiveTab('drivers')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'drivers'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Đội Xe & Tài Xế</span>
        </button>

        <button
          onClick={() => setActiveTab('shifts')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'shifts'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Quản Lý Ca Trực</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'reports'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Báo Cáo & Thống Kê</span>
        </button>

        <button
          onClick={() => setActiveTab('setup')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'setup'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-emerald-300 hover:border-slate-700'
          }`}
        >
          <Server className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-emerald-300">Treo Server Nick Zalo</span>
          <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
            Node.js Code
          </span>
        </button>
      </div>
    </header>
  );
};
