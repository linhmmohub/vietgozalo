import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Truck, 
  FileSpreadsheet, 
  Check, 
  X, 
  Phone, 
  MapPin,
  Car,
  AlertCircle,
  RefreshCw,
  Globe,
  Key,
  Copy,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import type { Driver, VehicleType, Shift } from '../types';
import { api } from '../services/api';

interface DriverManagementProps {
  drivers: Driver[];
  shifts: Shift[];
  onAddDriver: (driver: Partial<Driver>) => Promise<void>;
  onUpdateDriver: (id: string, driver: Partial<Driver>) => Promise<void>;
  onDeleteDriver: (id: string) => Promise<void>;
  onBulkImport: (list: Partial<Driver>[]) => Promise<void>;
  onRefreshList?: () => Promise<void>;
}

const VEHICLE_TYPES: VehicleType[] = [
  'Xe máy giao đồ ăn',
  'Xe máy có thùng giữ nhiệt',
  'Xe máy số / tay ga',
  'Xe máy điện giao thức ăn',
  'Xe máy Wave/Sirius/Vision',
];

export const DriverManagement: React.FC<DriverManagementProps> = ({
  drivers,
  shifts,
  onAddDriver,
  onUpdateDriver,
  onDeleteDriver,
  onBulkImport,
  onRefreshList
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [isSyncingVietGo, setIsSyncingVietGo] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    zaloName: '',
    licensePlate: '',
    vehicleType: 'Xe máy giao đồ ăn' as VehicleType,
    route: 'Khu vực nội thành (Giao đồ ăn)',
    notes: '',
    defaultShiftId: 'shift-morning'
  });

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      zaloName: '',
      licensePlate: '',
      vehicleType: 'Xe máy giao đồ ăn',
      route: 'Khu vực nội thành (Giao đồ ăn)',
      notes: '',
      defaultShiftId: 'shift-morning'
    });
    setEditingDriver(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (drv: Driver) => {
    setEditingDriver(drv);
    setFormData({
      name: drv.name,
      phone: drv.phone || '',
      zaloName: drv.zaloName || '',
      licensePlate: drv.licensePlate,
      vehicleType: drv.vehicleType,
      route: drv.route,
      notes: drv.notes || '',
      defaultShiftId: drv.defaultShiftId || 'shift-morning'
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.licensePlate.trim()) return;

    if (editingDriver) {
      await onUpdateDriver(editingDriver.id, formData);
    } else {
      await onAddDriver(formData);
    }
    setShowAddModal(false);
    resetForm();
  };

  const handleBulkSubmit = async () => {
    const lines = bulkText.split('\n').filter(l => l.trim().length > 0);
    const parsed: Partial<Driver>[] = [];

    for (const line of lines) {
      const parts = line.split(/[|,;\t]/).map(p => p.trim());
      if (parts.length >= 2) {
        parsed.push({
          name: parts[0],
          licensePlate: parts[1].toUpperCase(),
          phone: parts[2] || '',
          route: parts[3] || 'Nội thành',
          vehicleType: (parts[4] as VehicleType) || 'Xe tải 1.25T - 2.5T'
        });
      }
    }

    if (parsed.length > 0) {
      await onBulkImport(parsed);
      setShowBulkModal(false);
      setBulkText('');
    }
  };

  const handleSyncVietGo = async () => {
    setIsSyncingVietGo(true);
    setSyncStatus({ message: '', type: null });
    try {
      const res = await api.syncVietGoDrivers();
      if (res.success) {
        setSyncStatus({
          message: `✅ Đồng bộ thành công ${res.count} tài xế từ VietGo API! (Tổng: ${res.totalDrivers} tài xế)`,
          type: 'success'
        });
        if (onRefreshList) {
          await onRefreshList();
        }
      } else {
        setSyncStatus({
          message: `⚠️ Không thể đồng bộ: ${res.error || 'Lỗi không xác định'}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setSyncStatus({
        message: `❌ Lỗi kết nối API: ${err.message}`,
        type: 'error'
      });
    } finally {
      setIsSyncingVietGo(false);
    }
  };

  const copyCurlCmd = () => {
    navigator.clipboard.writeText('curl.exe -H "Authorization: Bearer 8f2c7a4d61e930b57cfa42e87d16a099d81e437bc55012f493afe6726c03bd19" https://vietgodriver.vercel.app/api/drivers');
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  // Filtered drivers
  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.phone && d.phone.includes(searchQuery));
    const matchesVehicle = vehicleFilter === 'all' || d.vehicleType === vehicleFilter;
    return matchesSearch && matchesVehicle;
  });

  const vietgoSyncedCount = drivers.filter(d => d.externalSynced).length;

  return (
    <div className="space-y-4">
      {/* VietGo Driver External API Integration Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/40 rounded-xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                  <span>VietGo Driver API Integration</span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Live Connected
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-300">
                Tự động đồng bộ danh sách <strong>23 tài xế</strong> từ API máy chủ VietGo và kích hoạt mã nhận diện Zalo tự động.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncVietGo}
              disabled={isSyncingVietGo}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingVietGo ? 'animate-spin' : ''}`} />
              <span>{isSyncingVietGo ? 'Đang tải dữ liệu...' : 'Đồng Bộ VietGo API'}</span>
            </button>
          </div>
        </div>

        {/* API Endpoint & Token info bar */}
        <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800 text-[11px] sm:text-xs flex flex-wrap items-center justify-between gap-2 font-mono">
          <div className="flex flex-wrap items-center gap-2 text-slate-300 overflow-hidden text-ellipsis">
            <span className="text-indigo-400 font-bold">API:</span>
            <span className="text-slate-200">https://vietgodriver.vercel.app/api/drivers</span>
            <span className="text-slate-600">|</span>
            <span className="text-indigo-400 font-bold">Auth:</span>
            <span className="text-emerald-400">Bearer 8f2c7a...bd19</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Đã đồng bộ: <strong className="text-white">{vietgoSyncedCount}</strong> tài xế</span>
          </div>

          <button
            onClick={copyCurlCmd}
            className="flex items-center gap-1 text-slate-400 hover:text-indigo-300 bg-slate-900 px-2 py-1 rounded border border-slate-700 transition-colors ml-auto"
            title="Copy lệnh cURL"
          >
            {copiedCurl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedCurl ? 'Đã copy cURL' : 'Copy cURL'}</span>
          </button>
        </div>

        {syncStatus.message && (
          <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
            syncStatus.type === 'success' 
              ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200' 
              : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
          }`}>
            <span>{syncStatus.message}</span>
          </div>
        )}
      </div>

      {/* Header & Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Quản Lý Đội Xe & Danh Sách Tài Xế</h2>
            <p className="text-xs text-slate-400">
              Tổng số <strong>{drivers.length}</strong> tài xế ({vietgoSyncedCount} từ VietGo API) đã sẵn sàng nhận diện trên Zalo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Nhập Hàng Loạt</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Tài Xế Mới</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên tài xế, biển số xe, số điện thoại, tuyến..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs">
          <Truck className="w-4 h-4 text-blue-400" />
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả loại xe</option>
            {VEHICLE_TYPES.map(vt => (
              <option key={vt} value={vt}>{vt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDrivers.map(drv => (
          <div
            key={drv.id}
            className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg hover:border-slate-700 transition-all space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                    {drv.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{drv.name}</h3>
                    <p className="text-[11px] text-blue-400">
                      Nick Zalo: {drv.zaloName || drv.name}
                    </p>
                  </div>
                </div>

                {/* License Plate Badge */}
                <div className="bg-white text-slate-950 font-mono font-black text-xs px-2.5 py-0.5 rounded border border-slate-400 shadow-sm tracking-wider">
                  {drv.licensePlate}
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 pt-1 border-t border-slate-800/60">
                {/* Zalo Fast Check-in Code */}
                <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/30 p-1.5 rounded-lg text-[11px]">
                  <span className="text-emerald-300 flex items-center gap-1 font-medium">
                    ⚡ Cú pháp điểm danh:
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-200 font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/40">
                    online{drv.phone.replace(/\D/g, '').slice(-4) || '3389'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Car className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{drv.vehicleType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{drv.route}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="font-mono text-slate-300 font-semibold">{drv.phone || 'Chưa cập nhật SĐT'}</span>
                </div>
              </div>

              {drv.notes && (
                <p className="text-[11px] text-slate-400 italic bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  {drv.notes}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <span className="text-[10px] text-slate-500 font-mono">ID: {drv.id}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(drv)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-lg transition-colors"
                  title="Chỉnh sửa tài xế"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteDriver(drv.id)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                  title="Xóa tài xế"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Driver Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingDriver ? 'Chỉnh Sửa Thông Tin Tài Xế' : 'Thêm Tài Xế Mới'}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Họ và Tên (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Nguyễn Văn Tuấn"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Biển Số Xe (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.licensePlate}
                    onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                    placeholder="VD: 36B-3389"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono font-bold focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Số Điện Thoại</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="VD: 0912345678"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tên Hiển Thị Zalo (Nếu có)</label>
                  <input
                    type="text"
                    value={formData.zaloName}
                    onChange={(e) => setFormData({ ...formData, zaloName: e.target.value })}
                    placeholder="VD: Tuấn Nguyễn (Đuôi 3389)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Loại Phương Tiện</label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as VehicleType })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {VEHICLE_TYPES.map(vt => (
                      <option key={vt} value={vt}>{vt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ca Làm Việc Mặc Định</label>
                  <select
                    value={formData.defaultShiftId}
                    onChange={(e) => setFormData({ ...formData, defaultShiftId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {shifts.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tuyến Đường Phụ Trách</label>
                <input
                  type="text"
                  value={formData.route}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                  placeholder="VD: Khu vực Tĩnh Gia, Thanh Hóa"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ghi Chú</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú về bằng lái, kinh nghiệm, tình trạng xe..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md"
                >
                  {editingDriver ? 'Cập Nhật' : 'Lưu Tài Xế'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Nhập Hàng Loạt Danh Sách Tài Xế
              </h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Dán danh sách tài xế theo cú pháp mỗi dòng: <br />
                <code className="bg-slate-950 text-blue-300 px-1.5 py-0.5 rounded border border-slate-800">
                  Tên | Biển số | Số điện thoại | Tuyến đường
                </code>
              </p>

              <textarea
                rows={8}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`Nguyễn Văn A | 36B-111.22 | 0912345678 | Phường Hải Hòa, Tĩnh Gia
Trần Văn B | 36B-333.44 | 0988112233 | Khu vực Chợ Còng, Tĩnh Gia
Lê Văn C | 36B-555.66 | 0903445566 | Cảng Nghi Sơn, Tĩnh Gia`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500"
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleBulkSubmit}
                  disabled={!bulkText.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-semibold shadow-md"
                >
                  Xác Nhận Nhập
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
