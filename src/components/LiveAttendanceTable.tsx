import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  UserX, 
  FileText, 
  MessageSquare, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  Download, 
  Printer, 
  Plus, 
  CheckCheck,
  MapPin,
  Gauge
} from 'lucide-react';
import type { AttendanceRecord, Shift, Driver } from '../types';

interface LiveAttendanceTableProps {
  records: AttendanceRecord[];
  drivers: Driver[];
  shifts: Shift[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedShift: string;
  setSelectedShift: (shiftId: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenQuickCheckIn: (driverId?: string) => void;
  onDeleteRecord: (id: string) => void;
  onUpdateRecord: (id: string, updates: Partial<AttendanceRecord>) => void;
}

export const LiveAttendanceTable: React.FC<LiveAttendanceTableProps> = ({
  records,
  drivers,
  shifts,
  selectedDate,
  setSelectedDate,
  selectedShift,
  setSelectedShift,
  selectedStatus,
  setSelectedStatus,
  searchQuery,
  setSearchQuery,
  onOpenQuickCheckIn,
  onDeleteRecord,
  onUpdateRecord,
}) => {
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<AttendanceRecord | null>(null);
  const [isEditingNote, setIsEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Calculate active work duration
  const getRecordActiveHours = (record: AttendanceRecord): string => {
    if (record.status === 'leave') return '-';
    const checkIn = record.checkInTime;
    const checkOut = record.checkOutTime || new Date().toTimeString().split(' ')[0];
    if (!checkIn) return record.workHoursExpected || '-';

    try {
      const inParts = checkIn.split(':').map(Number);
      const outParts = checkOut.split(':').map(Number);
      const inH = inParts[0], inM = inParts[1] || 0;
      const outH = outParts[0], outM = outParts[1] || 0;

      let startTotalM = inH * 60 + inM;
      let endTotalM = outH * 60 + outM;
      let durationM = endTotalM - startTotalM;
      if (durationM < 0) durationM += 24 * 60;

      const h = Math.floor(durationM / 60);
      const m = durationM % 60;

      if (h === 0) return `${m} phút`;
      if (m === 0) return `${h} tiếng`;
      return `${h} tiếng ${m}p`;
    } catch (e) {
      return record.workHoursExpected || '-';
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['STT', 'Tài Xế', 'Biển Số', 'Loại Phương Tiện', 'Tuyến Đường', 'Ca Làm Việc', 'Giờ Điểm Danh', 'Giờ Ra Ca', 'Trạng Thái', 'Số Phút Trễ', 'Số Giờ Hoạt Động', 'Nguồn', 'Ghi Chú'];
    const rows = records.map((r, i) => [
      i + 1,
      `"${r.driverName}"`,
      `"${r.licensePlate}"`,
      `"${r.vehicleType}"`,
      `"${r.route}"`,
      `"${r.shiftName}"`,
      r.checkInTime,
      r.checkOutTime || '',
      r.status === 'on_time' ? 'Đúng giờ' : r.status === 'late' ? 'Đi trễ' : r.status === 'leave' ? 'Nghỉ phép' : 'Hoàn thành ca',
      r.lateMinutes || 0,
      `"${getRecordActiveHours(r)}"`,
      r.source === 'zalo_bot' ? 'Zalo Bot' : 'Thủ công',
      `"${(r.note || r.leaveReason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Diem_Danh_Tai_Xe_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderStatusBadge = (record: AttendanceRecord) => {
    switch (record.status) {
      case 'on_time':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đúng giờ
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            Trễ {record.lateMinutes || 0} phút
          </span>
        );
      case 'leave':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <FileText className="w-3.5 h-3.5" />
            Nghỉ phép
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <CheckCheck className="w-3.5 h-3.5" />
            Đã hoàn thành ca
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {record.status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên tài xế, biển số, tuyến đường..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            />
          </div>

          {/* Shift Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả ca trực</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="on_time">Đúng giờ</option>
              <option value="late">Đi trễ</option>
              <option value="leave">Nghỉ phép</option>
              <option value="completed">Đã kết thúc ca</option>
            </select>
          </div>

          {/* Action Buttons: Export & Print */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 transition-colors"
            title="Xuất file Excel/CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Xuất CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 transition-colors"
            title="In bảng điểm danh"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">In Bảng</span>
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3.5 px-4">Tài Xế & Biển Số</th>
                <th className="py-3.5 px-4">Phương Tiện & Tuyến</th>
                <th className="py-3.5 px-4">Ca Trực</th>
                <th className="py-3.5 px-4">Giờ Vào Ca</th>
                <th className="py-3.5 px-4">Giờ Ra Ca</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-4">Số Giờ Hoạt Động</th>
                <th className="py-3.5 px-4">Nguồn & Ghi Chú</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <UserX className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-60" />
                    <p className="font-semibold text-slate-400">Không tìm thấy bản ghi điểm danh nào</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Thử đổi ngày, bỏ lọc hoặc nhắn tin qua Zalo Bot để điểm danh ngay!
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr 
                    key={record.id} 
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Driver Name & License Plate */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-md flex-shrink-0">
                          {record.driverName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            <span>{record.driverName}</span>
                            {record.zaloSenderName && (
                              <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded font-normal" title={`Nick Zalo: ${record.zaloSenderName}`}>
                                Zalo
                              </span>
                            )}
                          </div>
                          {/* Realistic Vietnamese License Plate Badge */}
                          <div className="mt-1 inline-block bg-white text-slate-950 font-mono font-black text-[11px] px-2 py-0.5 rounded border border-slate-400 shadow-sm tracking-wider">
                            {record.licensePlate}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Vehicle Type & Route */}
                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-medium">{record.vehicleType}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span className="truncate max-w-[180px]" title={record.route}>{record.route}</span>
                      </div>
                    </td>

                    {/* Shift & AI Analyzed Work Hours */}
                    <td className="py-3 px-4">
                      <div className="text-slate-300 font-medium">{record.shiftName}</div>
                      {record.workHoursExpected && (
                        <div className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded mt-1 inline-block" title="Khung giờ làm việc do AI DeepSeek phân tích">
                          ⏱️ {record.workHoursExpected}
                        </div>
                      )}
                    </td>

                    {/* Check In Time */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-emerald-400 font-bold text-sm">
                        {record.checkInTime}
                      </div>
                      <div className="text-[10px] text-slate-500">{record.date}</div>
                      {record.dispatchRestricted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800 px-1.5 py-0.2 rounded mt-1">
                          🚫 Hạn chế nhận đơn (Trễ &gt;10p)
                        </span>
                      )}
                    </td>


                    {/* Check Out Time */}
                    <td className="py-3 px-4">
                      {record.checkOutTime ? (
                        <div>
                          <span className="font-mono text-indigo-300 font-bold text-sm">
                            {record.checkOutTime}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            const nowStr = new Date().toTimeString().split(' ')[0];
                            onUpdateRecord(record.id, {
                              checkOutTime: nowStr,
                              status: 'completed',
                              note: (record.note || '') + ' | Ra ca: ' + nowStr
                            });
                          }}
                          className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white border border-slate-700 transition-colors"
                        >
                          Chốt ra ca
                        </button>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      {renderStatusBadge(record)}
                    </td>

                    {/* Active Work Hours Duration */}
                    <td className="py-3 px-4 font-mono">
                      {record.status === 'leave' ? (
                        <span className="text-slate-500 text-xs">-</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{getRecordActiveHours(record)}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {record.checkOutTime ? 'Đã hoàn thành' : 'Đang trong ca'}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Source & Notes */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {record.source === 'zalo_bot' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-300 bg-blue-950/60 border border-blue-800/60 px-2 py-0.5 rounded">
                            <MessageSquare className="w-3 h-3 text-blue-400" />
                            Zalo Bot
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            Thủ công
                          </span>
                        )}
                      </div>

                      {record.leaveReason && (
                        <p className="text-[11px] text-purple-300 mt-1 italic">
                          Lý do: {record.leaveReason}
                        </p>
                      )}

                      {record.note && !record.leaveReason && (
                        <p className="text-[11px] text-slate-400 mt-1 truncate max-w-[150px]" title={record.note}>
                          {record.note}
                        </p>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setSelectedRecordForDetail(record)}
                          title="Xem chi tiết & Tin nhắn Zalo gốc"
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteRecord(record.id)}
                          title="Xóa bản ghi này"
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Chi Tiết Điểm Danh Tài Xế</h3>
                  <p className="text-xs text-slate-400">Mã bản ghi: #{selectedRecordForDetail.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tài xế:</span>
                  <span className="font-bold text-white">{selectedRecordForDetail.driverName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Biển số:</span>
                  <span className="bg-white text-slate-950 font-mono font-black text-xs px-2 py-0.5 rounded border border-slate-400">
                    {selectedRecordForDetail.licensePlate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Loại phương tiện:</span>
                  <span className="text-slate-200">{selectedRecordForDetail.vehicleType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tuyến phụ trách:</span>
                  <span className="text-slate-200">{selectedRecordForDetail.route}</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ca trực:</span>
                  <span className="font-semibold text-blue-400">{selectedRecordForDetail.shiftName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Giờ vào ca:</span>
                  <span className="font-mono font-bold text-emerald-400">{selectedRecordForDetail.checkInTime}</span>
                </div>
                {selectedRecordForDetail.checkOutTime && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Giờ ra ca:</span>
                    <span className="font-mono font-bold text-indigo-400">{selectedRecordForDetail.checkOutTime}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Trạng thái:</span>
                  <span>{renderStatusBadge(selectedRecordForDetail)}</span>
                </div>
                {selectedRecordForDetail.startOdometer && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Số km ODO đầu ca:</span>
                    <span className="font-mono text-slate-200">{selectedRecordForDetail.startOdometer.toLocaleString()} km</span>
                  </div>
                )}
              </div>

              {/* Raw Zalo Message Log */}
              {selectedRecordForDetail.rawZaloMessage && (
                <div className="bg-blue-950/30 border border-blue-900/50 p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-300 font-semibold text-xs">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>Tin nhắn gốc từ Zalo:</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-xs text-slate-300 border border-slate-800 break-words">
                    "{selectedRecordForDetail.rawZaloMessage}"
                  </div>
                  {selectedRecordForDetail.zaloSenderName && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Người gửi: <span className="text-slate-200 font-medium">{selectedRecordForDetail.zaloSenderName}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
