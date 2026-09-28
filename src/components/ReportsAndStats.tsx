import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Calendar, 
  Download, 
  Printer, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Truck, 
  Award,
  Search,
  Filter
} from 'lucide-react';
import type { AttendanceRecord, Driver, Shift, AttendanceStats } from '../types';

interface ReportsAndStatsProps {
  records: AttendanceRecord[];
  drivers: Driver[];
  shifts: Shift[];
  stats: AttendanceStats;
  selectedDate: string;
}

export const ReportsAndStats: React.FC<ReportsAndStatsProps> = ({
  records,
  drivers,
  shifts,
  stats,
  selectedDate,
}) => {
  const [reportType, setReportType] = useState<'summary' | 'drivers' | 'shifts'>('summary');
  const [filterSearch, setFilterSearch] = useState('');

  // Calculate stats per driver
  const driverPerformance = drivers.map(drv => {
    const drvRecords = records.filter(r => r.driverId === drv.id);
    const onTimeCount = drvRecords.filter(r => r.status === 'on_time').length;
    const lateCount = drvRecords.filter(r => r.status === 'late').length;
    const leaveCount = drvRecords.filter(r => r.status === 'leave').length;
    const completedCount = drvRecords.filter(r => r.status === 'completed' || r.checkOutTime).length;
    
    // Total km traveled
    let totalKm = 0;
    drvRecords.forEach(r => {
      if (r.startOdometer && r.endOdometer && r.endOdometer >= r.startOdometer) {
        totalKm += (r.endOdometer - r.startOdometer);
      }
    });

    const isPresentToday = drvRecords.length > 0;
    const todayRecord = drvRecords[0];

    return {
      driver: drv,
      totalCheckIns: drvRecords.length,
      onTimeCount,
      lateCount,
      leaveCount,
      completedCount,
      totalKm,
      isPresentToday,
      todayStatus: todayRecord ? todayRecord.status : 'absent',
      checkInTime: todayRecord?.checkInTime || '-',
      checkOutTime: todayRecord?.checkOutTime || '-'
    };
  });

  const filteredPerformance = driverPerformance.filter(dp => 
    dp.driver.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
    dp.driver.licensePlate.toLowerCase().includes(filterSearch.toLowerCase()) ||
    dp.driver.route.toLowerCase().includes(filterSearch.toLowerCase())
  );

  const handleExportFullCSV = () => {
    const headers = ['STT', 'Họ Tên Tài Xế', 'Biển Số Xe', 'Loại Xe', 'Tuyến', 'Trạng Thái Hôm Nay', 'Giờ Vào Ca', 'Giờ Ra Ca', 'Tổng KM Đã Chạy', 'Điểm Danh Đúng Giờ', 'Số Lần Đi Trễ', 'Số Lần Nghỉ'];
    const rows = filteredPerformance.map((dp, i) => [
      i + 1,
      `"${dp.driver.name}"`,
      `"${dp.driver.licensePlate}"`,
      `"${dp.driver.vehicleType}"`,
      `"${dp.driver.route}"`,
      dp.todayStatus === 'on_time' ? 'Đúng giờ' : dp.todayStatus === 'late' ? 'Đi trễ' : dp.todayStatus === 'leave' ? 'Nghỉ phép' : 'Chưa điểm danh',
      dp.checkInTime,
      dp.checkOutTime,
      dp.totalKm,
      dp.onTimeCount,
      dp.lateCount,
      dp.leaveCount
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Diem_Danh_Doi_Xe_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Buttons */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Báo Cáo Điểm Danh & Chấm Công Đội Xe</h2>
            <p className="text-xs text-slate-400">
              Tổng hợp dữ liệu chấm công từ Zalo Bot, tính tỷ lệ đúng giờ và km vận hành
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportFullCSV}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-md transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Báo Cáo Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>In Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Tỷ Lệ Điểm Danh</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.attendanceRate}%</div>
          <div className="text-[11px] text-emerald-400">
            {stats.totalCheckedIn} trên tổng {stats.totalDrivers} tài xế
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Tỷ Lệ Đúng Giờ</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300">{stats.punctualityRate}%</div>
          <div className="text-[11px] text-slate-400">
            {stats.onTimeCount} tài xế đúng giờ ca
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Số Lần Đi Trễ</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300">{stats.lateCount}</div>
          <div className="text-[11px] text-slate-400">
            Cần lưu ý theo dõi lịch trình
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Nghỉ Phép / Chưa Đến</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300">{stats.leaveCount + stats.absentCount}</div>
          <div className="text-[11px] text-slate-400">
            {stats.leaveCount} có phép, {stats.absentCount} chưa báo
          </div>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          placeholder="Tìm theo tên tài xế, biển số xe, tuyến..."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Performance Timesheet Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">
            Bảng Chấm Công Chi Tiết Từng Tài Xế ({selectedDate})
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {filteredPerformance.length} tài xế hiển thị
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-800">
                <th className="py-3 px-4">Tài Xế</th>
                <th className="py-3 px-4">Biển Số Xe</th>
                <th className="py-3 px-4">Phương Tiện</th>
                <th className="py-3 px-4">Tuyến Phụ Trách</th>
                <th className="py-3 px-4">Giờ Vào Ca</th>
                <th className="py-3 px-4">Giờ Ra Ca</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4">Đúng Giờ</th>
                <th className="py-3 px-4">Trễ Giờ</th>
                <th className="py-3 px-4 text-right">Tổng KM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPerformance.map((dp) => (
                <tr key={dp.driver.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-100">
                    {dp.driver.name}
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-white text-slate-950 font-mono font-black text-[11px] px-2 py-0.5 rounded border border-slate-400">
                      {dp.driver.licensePlate}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {dp.driver.vehicleType}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {dp.driver.route}
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                    {dp.checkInTime}
                  </td>
                  <td className="py-3 px-4 font-mono text-indigo-400 font-semibold">
                    {dp.checkOutTime}
                  </td>
                  <td className="py-3 px-4">
                    {dp.todayStatus === 'on_time' ? (
                      <span className="text-emerald-400 font-semibold">Đúng giờ</span>
                    ) : dp.todayStatus === 'late' ? (
                      <span className="text-amber-400 font-semibold">Đi trễ</span>
                    ) : dp.todayStatus === 'leave' ? (
                      <span className="text-purple-400 font-semibold">Nghỉ phép</span>
                    ) : (
                      <span className="text-rose-400 font-semibold">Chưa có mặt</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">
                    {dp.onTimeCount}
                  </td>
                  <td className="py-3 px-4 text-amber-400 font-bold">
                    {dp.lateCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                    {dp.totalKm > 0 ? `${dp.totalKm.toLocaleString()} km` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
