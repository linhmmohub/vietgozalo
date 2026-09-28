import React, { useState } from 'react';
import { 
  PlusCircle, 
  Check, 
  Truck, 
  Clock, 
  Gauge, 
  AlertTriangle, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';
import type { Driver, Shift } from '../types';

interface QuickCheckinModalProps {
  drivers: Driver[];
  shifts: Shift[];
  onClose: () => void;
  onSubmitCheckIn: (data: {
    driverId: string;
    shiftId: string;
    status: string;
    note: string;
    startOdometer?: number;
    date: string;
    checkInTime: string;
  }) => Promise<void>;
  preselectedDriverId?: string;
}

export const QuickCheckinModal: React.FC<QuickCheckinModalProps> = ({
  drivers,
  shifts,
  onClose,
  onSubmitCheckIn,
  preselectedDriverId,
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState(preselectedDriverId || drivers[0]?.id || '');
  const [selectedShiftId, setSelectedShiftId] = useState(shifts[0]?.id || '');
  const [status, setStatus] = useState('on_time');
  const [checkInTime, setCheckInTime] = useState(
    new Date().toTimeString().split(' ')[0].slice(0, 5) // 'HH:mm'
  );
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState<string>('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId) return;

    setIsSubmitting(true);
    try {
      await onSubmitCheckIn({
        driverId: selectedDriverId,
        shiftId: selectedShiftId,
        status,
        note,
        startOdometer: odometer ? Number(odometer) : undefined,
        date,
        checkInTime: checkInTime + ':00'
      });
      onClose();
    } catch (err) {
      console.error('Check-in error', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Điểm Danh Thủ Công</h3>
              <p className="text-xs text-slate-400">Ghi nhận chấm công cho tài xế trực tiếp trên hệ thống</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* Pick Driver */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Chọn Tài Xế & Xe (*)</label>
            <select
              required
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-medium focus:outline-none focus:border-blue-500"
            >
              {drivers.map((drv) => (
                <option key={drv.id} value={drv.id}>
                  {drv.name} - Biển số: {drv.licensePlate} ({drv.vehicleType})
                </option>
              ))}
            </select>
          </div>

          {selectedDriver && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Tuyến: </span>
                <span className="text-slate-200 font-semibold">{selectedDriver.route}</span>
              </div>
              <span className="bg-white text-slate-950 font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                {selectedDriver.licensePlate}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Shift */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Ca Làm Việc</label>
              <select
                value={selectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Trạng Thái</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="on_time">🟢 Đúng giờ</option>
                <option value="late">🟡 Đi trễ</option>
                <option value="leave">🟣 Nghỉ phép</option>
                <option value="completed">🔵 Đã xong ca</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Date */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Ngày Điểm Danh</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Giờ Vào Ca</label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Ghi Chú / Lý Do</label>
            <input
              type="text"
              placeholder="VD: Khung giờ đăng ký 8h-14h, ca tự do..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-semibold shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Xác Nhận Điểm Danh</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
