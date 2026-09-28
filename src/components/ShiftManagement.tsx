import React, { useState } from 'react';
import { 
  Clock, 
  Plus, 
  Edit2, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Sun, 
  Sunset, 
  Moon, 
  Briefcase 
} from 'lucide-react';
import type { Shift } from '../types';

interface ShiftManagementProps {
  shifts: Shift[];
  onUpdateShift: (id: string, shift: Partial<Shift>) => Promise<void>;
  onAddShift: (shift: Partial<Shift>) => Promise<void>;
}

export const ShiftManagement: React.FC<ShiftManagementProps> = ({
  shifts,
  onUpdateShift,
  onAddShift,
}) => {
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Shift>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newShift, setNewShift] = useState<Partial<Shift>>({
    name: '',
    startTime: '08:00',
    endTime: '17:00',
    graceMinutes: 15,
    description: '',
    isActive: true
  });

  const getShiftIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('sáng') || lower.includes('morning')) {
      return <Sun className="w-5 h-5 text-amber-400" />;
    } else if (lower.includes('chiều') || lower.includes('afternoon')) {
      return <Sunset className="w-5 h-5 text-orange-400" />;
    } else if (lower.includes('đêm') || lower.includes('night')) {
      return <Moon className="w-5 h-5 text-indigo-400" />;
    }
    return <Briefcase className="w-5 h-5 text-blue-400" />;
  };

  const startEdit = (shift: Shift) => {
    setEditingShiftId(shift.id);
    setEditForm({ ...shift });
  };

  const handleSaveEdit = async (id: string) => {
    await onUpdateShift(id, editForm);
    setEditingShiftId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShift.name) return;
    await onAddShift(newShift);
    setShowAddModal(false);
    setNewShift({
      name: '',
      startTime: '08:00',
      endTime: '17:00',
      graceMinutes: 15,
      description: '',
      isActive: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Cấu Hình Ca Trực & Quy Định Đi Trễ</h2>
            <p className="text-xs text-slate-400">
              Bot Zalo sẽ tự động so sánh giờ điểm danh của tài xế với khung giờ của ca để tính đúng giờ / đi trễ
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Ca Mới</span>
        </button>
      </div>

      {/* Shift Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shifts.map((shift) => {
          const isEditing = editingShiftId === shift.id;

          return (
            <div
              key={shift.id}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
                    {getShiftIcon(shift.name)}
                  </div>
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-bold text-white focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <h3 className="font-bold text-white text-sm">{shift.name}</h3>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">{shift.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <button
                      onClick={() => handleSaveEdit(shift.id)}
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs flex items-center gap-1 font-semibold"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Lưu</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => startEdit(shift)}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Time Configuration */}
              <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Giờ Bắt Đầu:</span>
                  {isEditing ? (
                    <input
                      type="time"
                      value={editForm.startTime || ''}
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-mono font-bold"
                    />
                  ) : (
                    <span className="font-mono font-black text-emerald-400 text-sm">
                      {shift.startTime}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Giờ Kết Thúc:</span>
                  {isEditing ? (
                    <input
                      type="time"
                      value={editForm.endTime || ''}
                      onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-indigo-400 font-mono font-bold"
                    />
                  ) : (
                    <span className="font-mono font-black text-indigo-400 text-sm">
                      {shift.endTime}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Ân Hạn Trễ:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.graceMinutes || 0}
                      onChange={(e) => setEditForm({ ...editForm, graceMinutes: Number(e.target.value) })}
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-400 font-mono font-bold"
                    />
                  ) : (
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      +{shift.graceMinutes} phút
                    </span>
                  )}
                </div>
              </div>

              {/* Explanation note */}
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span>
                  Điểm danh sau <strong>{shift.startTime} + {shift.graceMinutes} phút</strong> sẽ tự động chuyển trạng thái "Đi trễ" và gửi cảnh báo về nhóm Zalo.
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Shift Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Thêm Ca Trực Mới</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tên Ca (*)</label>
                <input
                  type="text"
                  required
                  value={newShift.name}
                  onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                  placeholder="VD: Ca Sáng Sớm (05:00 - 13:00)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Giờ Bắt Đầu (*)</label>
                  <input
                    type="time"
                    required
                    value={newShift.startTime}
                    onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Giờ Kết Thúc (*)</label>
                  <input
                    type="time"
                    required
                    value={newShift.endTime}
                    onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-indigo-400 font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Thời Gian Ân Hạn Trễ (Phút)</label>
                <input
                  type="number"
                  value={newShift.graceMinutes}
                  onChange={(e) => setNewShift({ ...newShift, graceMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mô Tả</label>
                <input
                  type="text"
                  value={newShift.description}
                  onChange={(e) => setNewShift({ ...newShift, description: e.target.value })}
                  placeholder="Ghi chú đối tượng áp dụng ca..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-md"
                >
                  Tạo Ca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
