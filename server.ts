import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import type { 
  Driver, 
  Shift, 
  AttendanceRecord, 
  BotConfig, 
  WebhookLog, 
  AttendanceStats,
  VehicleType,
  DriverLocation
} from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// External API Config for VietGo Drivers
const VIETGO_API_URL = 'https://vietgodriver.vercel.app/api/drivers';
const VIETGO_API_TOKEN = '8f2c7a4d61e930b57cfa42e87d16a099d81e437bc55012f493afe6726c03bd19';

let lastExternalSyncTime: string | null = null;
let lastExternalSyncCount: number = 23;
let lastExternalSyncError: string | null = null;

// In-memory Database Store - Pre-seeded with real drivers from VietGo API + User examples
let drivers: Driver[] = [
  {
    id: 'drv-vg-01',
    name: 'Bùi Bá Vũ',
    phone: '0978273026', // Tail 3026
    zaloName: 'Bùi Bá Vũ (Đuôi 3026)',
    licensePlate: '36B-3026',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã điểm danh: 3026',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-02',
    name: 'Đậu Văn Học',
    phone: '0986388813', // Tail 8813
    zaloName: 'Đậu Văn Học (Đuôi 8813)',
    licensePlate: '36B-8813',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã điểm danh: 8813',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-03',
    name: 'Hà Trọng Huy',
    phone: '0395987438', // Tail 7438
    zaloName: 'Hà Trọng Huy (Đuôi 7438)',
    licensePlate: '36B-7438',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: standby - Chờ lệnh). Mã điểm danh: 7438',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'standby',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-04',
    name: 'Hồ Văn Bốn',
    phone: '0397177363', // Tail 7363
    zaloName: 'Hồ Văn Bốn (Đuôi 7363)',
    licensePlate: '36B-7363',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: standby - Chờ lệnh). Mã điểm danh: 7363',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'standby',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-05',
    name: 'Khương Ngọc Tĩnh',
    phone: '0967870677', // Tail 0677
    zaloName: 'Khương Ngọc Tĩnh (Đuôi 0677)',
    licensePlate: '36B-0677',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã điểm danh: 0677',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-06',
    name: 'Lê Danh Tình',
    phone: '0325114014', // Tail 4014
    zaloName: 'Lê Danh Tình (Đuôi 4014)',
    licensePlate: '36B-4014',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: on_duty - Đang trong ca). Mã điểm danh: 4014',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'on_duty',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-07',
    name: 'Lê Đình Hải',
    phone: '0364306634', // Tail 6634
    zaloName: 'Lê Đình Hải (Đuôi 6634)',
    licensePlate: '36B-6634',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã điểm danh: 6634',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-08',
    name: 'Lê Minh Nhất',
    phone: '0327635798', // Tail 5798
    zaloName: 'Lê Minh Nhất (36AE-37211)',
    licensePlate: '36AE-37211',
    vehicleType: 'Xe máy giao hàng',
    route: 'Thanh Hóa - Giao hàng nhanh',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã: 5798 / Biển 36AE-37211',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-09',
    name: 'Lê Văn Sức',
    phone: '0969397370', // Tail 7370
    zaloName: 'Lê Văn Sức (Đuôi 7370)',
    licensePlate: '36B-7370',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã điểm danh: 7370',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-10',
    name: 'Lê Văn Vương',
    phone: '0981123492', // Tail 3492
    zaloName: 'Lê Văn Vương (Đuôi 3492)',
    licensePlate: '36B-3492',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã điểm danh: 3492',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-11',
    name: 'Lê Xuân Đức',
    phone: '0978304484', // Tail 4484
    zaloName: 'Lê Xuân Đức (Đuôi 4484)',
    licensePlate: '36B-4484',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã điểm danh: 4484',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-12',
    name: 'Mai Đắc Anh',
    phone: '0965642206', // Tail 2206
    zaloName: 'Mai Đắc Anh (Đuôi 2206)',
    licensePlate: '36B-2206',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã điểm danh: 2206',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-13',
    name: 'Mai Đắc Trường',
    phone: '0383276202', // Tail 6202
    zaloName: 'Mai Đắc Trường (Đuôi 6202)',
    licensePlate: '36B-6202',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã điểm danh: 6202',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-14',
    name: 'Mai Huy Trường',
    phone: '0356059230', // Tail 9230
    zaloName: 'Mai Huy Trường (Đuôi 9230)',
    licensePlate: '36B-9230',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã điểm danh: 9230',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-15',
    name: 'Nguyễn Bá Trường',
    phone: '0368296626', // Tail 6626
    zaloName: 'Nguyễn Bá Trường (Đuôi 6626)',
    licensePlate: '36B-6626',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã điểm danh: 6626',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-16',
    name: 'Nguyễn Ngọc Tâm',
    phone: '0355686136', // Tail 6136
    zaloName: 'Nguyễn Ngọc Tâm (Đuôi 6136)',
    licensePlate: '36B-6136',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã điểm danh: 6136',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-17',
    name: 'Nguyễn Sỹ Phú Lọc',
    phone: '0394888229', // Tail 8229
    zaloName: 'Nguyễn Sỹ Phú Lọc (Đuôi 8229)',
    licensePlate: '36B-8229',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã điểm danh: 8229',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-18',
    name: 'Nguyễn Việt Cương',
    phone: '0867420360', // Tail 0360
    zaloName: 'Nguyễn Việt Cương (36AB-87870)',
    licensePlate: '36AB-87870',
    vehicleType: 'Xe máy giao hàng',
    route: 'Thanh Hóa - Giao hàng nhanh',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã: 0360 / Biển 36AB-87870',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-19',
    name: 'Phạm Trung Anh',
    phone: '0385969485', // Tail 9485
    zaloName: 'Phạm Trung Anh (Đuôi 9485)',
    licensePlate: '36B-9485',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã điểm danh: 9485',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-20',
    name: 'Phạm Xuân Kiên',
    phone: '0865372916', // Tail 2916
    zaloName: 'Phạm Xuân Kiên (Đuôi 2916)',
    licensePlate: '36B-2916',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã điểm danh: 2916',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-21',
    name: 'Tăng Đình Trung',
    phone: '0335162876', // Tail 2876
    zaloName: 'Tăng Đình Trung (Đuôi 2876)',
    licensePlate: '36B-2876',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: emergency_leave - Nghỉ đột xuất). Mã điểm danh: 2876',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'emergency_leave',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-22',
    name: 'Vũ Đình Hiếu',
    phone: '0354168805', // Tail 8805
    zaloName: 'Vũ Đình Hiếu (Đuôi 8805)',
    licensePlate: '36B-8805',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã điểm danh: 8805',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-vg-23',
    name: 'Vũ Thị Tuyết',
    phone: '0867160457', // Tail 0457
    zaloName: 'Vũ Thị Tuyết (Đuôi 0457)',
    licensePlate: '36B-0457',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Khu vực Thanh Hóa / Nội thành',
    active: true,
    notes: 'Đồng bộ từ VietGo API (Trạng thái: not_checked_in). Mã điểm danh: 0457',
    defaultShiftId: 'shift-morning',
    shiftStatus: 'not_checked_in',
    online: false,
    externalSynced: true
  },
  {
    id: 'drv-01',
    name: 'Nguyễn Văn Tuấn',
    phone: '0912343389', // Tail 3389
    zaloName: 'Tuấn Nguyễn (Xế 29C)',
    licensePlate: '29C-882.14',
    vehicleType: 'Xe tải 3.5T - 8T',
    route: 'Kho Hà Nội - Bắc Ninh - KCN Quế Võ',
    active: true,
    notes: 'Tài xế ví dụ mẫu (Mã đuôi: 3389, online3389)',
    defaultShiftId: 'shift-morning'
  }
];

// Asynchronous sync with VietGo API
async function syncVietGoDrivers(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const response = await fetch(VIETGO_API_URL, {
      headers: {
        'Authorization': `Bearer ${VIETGO_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      lastExternalSyncError = `HTTP ${response.status}: ${errText}`;
      console.error('VietGo API sync error:', lastExternalSyncError);
      return { success: false, count: 0, error: lastExternalSyncError };
    }

    const resJson: any = await response.json();
    const rawList: any[] = resJson.data || [];
    
    if (Array.isArray(rawList) && rawList.length > 0) {
      let updatedCount = 0;
      rawList.forEach((item: any, idx: number) => {
        const cleanPhone = (item.phone || '').replace(/\s+/g, '');
        const phoneTail = cleanPhone.slice(-4);
        const name = (item.name || '').trim();
        if (!name) return;

        const plate = item.licensePlate && item.licensePlate.trim() 
          ? item.licensePlate.trim().toUpperCase() 
          : (phoneTail ? `36B-${phoneTail}` : `36B-${idx + 100}`);

        const vehicleType: VehicleType = 'Xe máy giao đồ ăn';

        const existingIndex = drivers.findIndex(d => 
          (cleanPhone && d.phone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '')) ||
          normalizeText(d.name) === normalizeText(name)
        );

        const driverObj: Driver = {
          id: existingIndex >= 0 ? drivers[existingIndex].id : `drv-vg-${idx + 1}`,
          name: name,
          phone: cleanPhone,
          zaloName: `${name} (${phoneTail ? 'Đuôi ' + phoneTail : 'Shipper'})`,
          licensePlate: plate,
          vehicleType: vehicleType,
          route: 'Khu vực TP. Thanh Hóa (Nội thành giao đồ ăn)',
          active: true,
          notes: `Đồng bộ từ VietGo API (Trạng thái ca: ${item.shiftStatus || 'not_checked_in'}, Online: ${item.online ? 'Có' : 'Chưa'})`,
          defaultShiftId: 'shift-morning',
          shiftStatus: item.shiftStatus || 'not_checked_in',
          online: !!item.online,
          externalSynced: true
        };

        if (existingIndex >= 0) {
          drivers[existingIndex] = { ...drivers[existingIndex], ...driverObj };
        } else {
          drivers.push(driverObj);
        }
        updatedCount++;
      });

      lastExternalSyncTime = new Date().toISOString();
      lastExternalSyncCount = updatedCount;
      lastExternalSyncError = null;
      console.log(`✅ [VIETGO API] Đồng bộ thành công ${updatedCount} tài xế từ VietGo API`);
      return { success: true, count: updatedCount };
    }

    return { success: false, count: 0, error: 'Dữ liệu API trống' };
  } catch (err: any) {
    lastExternalSyncError = err.message || 'Lỗi mạng khi kết nối VietGo API';
    console.error('Failed to sync VietGo drivers:', lastExternalSyncError);
    return { success: false, count: 0, error: lastExternalSyncError };
  }
}

let shifts: Shift[] = [
  {
    id: 'shift-morning',
    name: 'Ca Sáng (06:00 - 14:00)',
    startTime: '06:00',
    endTime: '14:00',
    graceMinutes: 180, // 3 hours window from 06:00 to 09:00
    isActive: true,
    description: 'Ca sáng & trưa cao điểm (Giao đồ ăn sáng, cà phê, cơm trưa văn phòng)'
  },
  {
    id: 'shift-afternoon',
    name: 'Ca Chiều - Tối (14:00 - 22:00)',
    startTime: '14:00',
    endTime: '22:00',
    graceMinutes: 15,
    isActive: true,
    description: 'Ca chiều & tối cao điểm (Giao trà sữa, ăn vặt & bữa tối gia đình)'
  },
  {
    id: 'shift-night',
    name: 'Ca Đêm (22:00 - 06:00)',
    startTime: '22:00',
    endTime: '06:00',
    graceMinutes: 20,
    isActive: true,
    description: 'Ca đêm giao đồ ăn khuya, thức ăn nhanh & đồ uống xuyên đêm'
  },
  {
    id: 'shift-flexible',
    name: 'Ca Hành Chính (08:00 - 17:00)',
    startTime: '08:00',
    endTime: '17:00',
    graceMinutes: 15,
    isActive: true,
    description: 'Ca shipper chạy chuyên tuyến giao đồ ăn theo giờ hành chính'
  }
];

function getTodayString(baseDate: Date = new Date()): string {
  return baseDate.toISOString().split('T')[0];
}

function getTomorrowString(baseDate: Date = new Date()): string {
  const tomorrow = new Date(baseDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

const todayStr = getTodayString();

let attendanceRecords: AttendanceRecord[] = [
  {
    id: 'att-01',
    driverId: 'drv-01',
    driverName: 'Nguyễn Văn Tuấn',
    licensePlate: '29E1-882.14',
    vehicleType: 'Xe máy có thùng giữ nhiệt',
    route: 'Khu vực Đống Đa - Cầu Giấy (Food Hub)',
    date: todayStr,
    shiftId: 'shift-morning',
    shiftName: 'Ca Sáng (06:00 - 14:00)',
    checkInTime: '05:52:10',
    status: 'on_time',
    startOdometer: 48250,
    source: 'zalo_bot',
    rawZaloMessage: 'online3389 48250km',
    zaloSenderName: 'Tuấn Nguyễn (Shipper 29E1)',
    createdAt: `${todayStr}T05:52:10.000Z`
  },
  {
    id: 'att-02',
    driverId: 'drv-vg-01',
    driverName: 'Bùi Bá Vũ',
    licensePlate: '36B-3026',
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực TP. Thanh Hóa (Nội thành giao đồ ăn)',
    date: todayStr,
    shiftId: 'shift-morning',
    shiftName: 'Ca Sáng (06:00 - 14:00)',
    checkInTime: '06:08:45',
    status: 'on_time',
    startOdometer: 62100,
    source: 'zalo_bot',
    rawZaloMessage: 'online3026 62100km',
    zaloSenderName: 'Bùi Bá Vũ (Đuôi 3026)',
    createdAt: `${todayStr}T06:08:45.000Z`
  },
  {
    id: 'att-03',
    driverId: 'drv-vg-02',
    driverName: 'Đậu Văn Học',
    licensePlate: '36B-8813',
    vehicleType: 'Xe máy có thùng giữ nhiệt',
    route: 'Khu vực TP. Thanh Hóa (Nội thành giao đồ ăn)',
    date: todayStr,
    shiftId: 'shift-morning',
    shiftName: 'Ca Sáng (06:00 - 14:00)',
    checkInTime: '06:28:15',
    status: 'late',
    lateMinutes: 13,
    startOdometer: 31400,
    note: 'Kẹt xe đường Lê Hoàn',
    source: 'zalo_bot',
    rawZaloMessage: 'online8813 tre 10p ket xe',
    zaloSenderName: 'Đậu Văn Học (Đuôi 8813)',
    createdAt: `${todayStr}T06:28:15.000Z`
  }
];

let botConfig: BotConfig = {
  botName: 'Zalo Bot Điểm Danh Shipper Xe Máy Giao Đồ Ăn & DeepSeek AI',
  zaloPhoneNumber: '0901234567',
  webhookSecret: 'zalo_bot_secret_key_8899',
  autoReplyEnabled: true,
  allowedGroupIds: ['ALL_GROUPS', 'group_fleet_food_delivery'],
  checkInKeywords: ['online', 'on', 'dd', 'diem danh', 'cham cong', 'co mat', 'checkin', 'bat dau'],
  checkOutKeywords: ['off', 'kt', 'ket thuc', 'checkout', 've bai', 'xong ca', 'xong'],
  leaveKeywords: ['nghi', 'xin nghi', 'bao nghi', 'phep', 'bao duong', 'nghi lam', 'xin nghi lam'],
  statusKeywords: [
    'checkonline',
    'check online',
    'checkon',
    'dsonline',
    'ds online',
    'checkoffline',
    'check offline',
    'kiemtraonline',
    'kiem tra online',
    'tinhhinh',
    'tình hình',
    'tinh hinh online',
    'trangthai',
    'trạng thái',
    'ds',
    'danh sach',
    'danh sách',
    'bao cao',
    'báo cáo',
    'thong ke',
    'thống kê',
    'kiem tra',
    'kiểm tra',
    'ai online',
    'ai dang online',
    'whoisonline'
  ],
  helpKeywords: [
    'trogiupvietgo',
    'trogiup',
    'tro giup',
    'trợ giúp',
    'trợgiúp',
    'tro giup vietgo',
    'trợ giúp vietgo',
    'trogiup vg',
    'tro giup vg',
    'help',
    '/help',
    'huong dan',
    'hướng dẫn',
    'cu phap',
    'cú pháp',
    'cmd',
    'phim tat',
    'phimtat',
    'phím tắt',
    'gio lam viec',
    'giờ làm việc',
    'gio lam',
    'giờ làm',
    'gio giac',
    'giờ giấc',
    'gio giac lam viec',
    'quy dinh ca'
  ],
  lateGracePeriod: 15,
  
  // 6:00 AM Automated Reminder Configuration (Opens 3-hour window until 09:00 AM)
  reminderTime: '06:00',
  autoReminderEnabled: true,
  morningReminderTemplate: `⏰ [NHẮC NHỞ ĐIỂM DANH CA SÁNG SHIPPER GIAO ĐỒ ĂN - 06:00 SÁNG] 🛵🍱
Chào buổi sáng toàn thể anh em Shipper giao đồ ăn! ☀️🍜
🚪 CỔNG ĐIỂM DANH ĐẦU NGÀY ĐÃ MỞ (Khung giờ: 06:00 - 09:00 sáng)!
🌟 KHUYẾN KHÍCH ANH EM ĐIỂM DANH SỚM để Ban Điều Phối kịp phân tuyến khu vực & nổ đơn ăn sáng/trưa sớm nhất!
👉 Cú pháp điểm danh siêu gọn:
   • online[4 số đuôi SĐT] (hoặc: online[4 số đuôi] [Khung giờ])
   • Ví dụ 1: online3389  (hoặc: on3389)
   • Ví dụ 2: online3389 8h-14h  (AI nhận diện ca tùy chỉnh)
   • Báo nghỉ làm: nghi lam 3389 [Lý do] (hoặc: nghi3389 [Lý do])
   • Xem phím tắt & giờ làm việc: Gõ "trogiupvietgo" hoặc "trợ giúp"
📌 LƯU Ý QUAN TRỌNG:
• 🌙 ĐIỂM DANH SỚM TỪ ĐÊM: Điểm danh cho ngày mai tính từ 21:00 ĐÊM HÔM TRƯỚC trở đi. Anh em đã điểm danh từ 21h tối thì sáng mai KHÔNG CẦN điểm danh lại!
• Shipper Full-time chỉ cần điểm danh 1 LẦN DUY NHẤT trong ngày/ca.
• ĐÚNG 09:00 SÁNG: Bot sẽ TỰ ĐỘNG TỔNG HỢP toàn bộ danh sách và TẠM KHÓA PHÁT ĐƠN với các shipper quá hạn!`,

  // 09:00 AM Automated Scan & Comprehensive Summary Warning
  overdueMinutes: 180, // 3 hours window from 06:00 to 09:00
  autoOverdueWarningEnabled: true,
  dispatchPenaltyEnabled: true,
  overdueWarningTemplate: `📊 [BÁO CÁO TỔNG HỢP ĐIỂM DANH SHIPPER GIAO ĐỒ ĂN - 09:00 SÁNG] ⚠️🛵
Kính gửi Ban Quản Lý & Đội Ngũ Shipper Giao Đồ Ăn VietGo,
Đã hết khung giờ điểm danh sáng (06:00 - 09:00). Hệ thống AI tự động chốt và tổng hợp danh sách (Quét lúc: {scanTime}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 TỔNG QUAN QUÂN SỐ SHIPPER HÔM NAY ({today}):
• Tổng quân số: {totalCount} shipper
• 🟢 Đã vào ca: {checkedInCount} shipper ({checkedInPercent}%)
{leaveSummaryLine}• 🔴 Chưa điểm danh (Quá hạn 09:00): {missingCount} shipper ({missingPercent}%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 I. DANH SÁCH ĐÃ ĐIỂM DANH & KHUNG GIỜ LÀM VIỆC ({checkedInCount}/{totalCount}):
{presentDriversList}
{leaveSection}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 {missingSectionNum}. DANH SÁCH CHƯA ĐIỂM DANH ({missingCount} shipper):
{missingDriversList}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{penaltyAndUnlockGuide}`,

  welcomeMessage: '🤖 BOT ĐIỂM DANH & TRỢ LÝ AI SHIPPER XE MÁY GIAO ĐỒ ĂN ĐANG HOẠT ĐỘNG 24/7 🛵🍱.\n🌙 Điểm danh ngày mai tính từ 21h đêm hôm trước trở đi (sáng mai không cần điểm lại).\nKhung giờ sáng: 06:00 - 09:00 (Khuyến khích điểm danh sớm). Đúng 09:00 tự động chốt tổng hợp!\nCú pháp siêu gọn: online[4 số đuôi] (VD: online3389). Phím tắt: gõ "trogiupvietgo"',
  successCheckInTemplate: '✅ [ĐIỂM DANH THÀNH CÔNG - AI DEEPSEEK ĐÃ GHI NHẬN] 🛵🍱\n👤 Shipper: {name}\n📞 SĐT: {phone} (Mã: {phoneTail})\n🛵 Biển số xe: {plate} ({type})\n⏰ Giờ điểm danh: {time} ({status})\n🎯 Ca trực: {shift}\n⏱️ Khung giờ làm việc: {workHours}\n📍 Khu vực giao hàng: {route}\nChúc bác tài nổ nhiều đơn, vạn dặm bình an! 🍜✨',
  lateCheckInTemplate: '⚠️ [ĐIỂM DANH ĐI TRỄ {lateMinutes} PHÚT - SAU 09:00 SÁNG] 🛵\n👤 Shipper: {name} (Mã: {phoneTail})\n🛵 Biển số: {plate}\n⏰ Giờ điểm danh: {time} (Quá hạn chốt 09:00)\n🎯 Ca: {shift}\n⏱️ Khung giờ làm việc: {workHours}\nĐã tự động gỡ khóa nhận đơn. Chú ý lần sau điểm danh đúng hạn trước 09:00!',
  checkOutTemplate: '🏁 [KẾT THÚC CA GIAO ĐỒ ĂN THÀNH CÔNG] 🛵\n👤 Shipper: {name} (Mã: {phoneTail})\n🛵 Biển số: {plate}\n⏰ Giờ ra ca: {time}\n⏱️ Số giờ hoạt động: {workHours} (Vào ca: {timeIn} ➔ Ra ca: {time})\nCảm ơn bác tài đã hoàn thành ca giao đồ ăn hôm nay! 👏',
  leaveTemplate: '📝 [GHI NHẬN BÁO NGHỈ - AI DEEPSEEK ĐÃ BÓC TÁCH]\n👤 Shipper: {name} (Mã: {phoneTail})\n🛵 Biển số: {plate}\n📅 Ngày: {date}\n📌 Trạng thái: Nghỉ giao hàng hôm nay\n📋 Lý do: {reason}\nĐã cập nhật dữ liệu về bộ phận điều phối.',
  
  // DeepSeek AI Config
  deepseekEnabled: true,
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekModel: 'deepseek-chat',
  deepseekBaseUrl: 'https://api.deepseek.com/chat/completions',
  companyKnowledge: `[DỮ LIỆU ĐÀO TẠO ĐỘI SHIPPER XE MÁY GIAO ĐỒ ĂN VIETGO FOOD]
1. BAN ĐIỀU PHỐI & HOTLINE KHẨN CẤP:
- Hotline Điều Phối Đơn Hàng Food: Anh Nguyễn Văn Hoàng - SĐT: 0988.999.888 (Trực 24/7)
- Hỗ trợ sự cố xe máy & vá xe lưu động: Đội Hỗ Trợ Đường Phố - SĐT: 0911.222.333
- Kế toán tiền ship, phụ cấp ca & thưởng nổ đơn: Chị Mai Phương - SĐT: 0977.444.555 (Giờ hành chính 08:00 - 17:00)

2. ĐẶC THÙ HOẠT ĐỘNG:
- Phương tiện: 100% XE MÁY (Xe số, xe tay ga, xe máy điện) có trang bị thùng giữ nhiệt giao đồ ăn.
- Mặt hàng: Đồ ăn nóng, cơm trưa, đồ uống/trà sữa, thức ăn nhanh, đồ ăn đêm, bánh ngọt.
- Khu vực hoạt động: Các quận nội thành, trung tâm thương mại, khu văn phòng, khu dân cư, tuyến ẩm thực.

3. QUY ĐỊNH GIỜ GIẤC LÀM VIỆC & KHUNG ĐIỂM DANH (VIETGO FOOD):
- Phím tắt tra cứu trợ giúp: Khi gõ "trogiupvietgo" hoặc "trợ giúp" hoặc "phim tat", hệ thống gửi đầy đủ danh sách phím tắt và giờ giấc làm việc.
- ĐIỂM DANH CHO NGÀY MAI: Bắt đầu tính từ 21:00 ĐÊM HÔM TRƯỚC trở đi. Bác tài nhắn tin điểm danh từ 21:00 tối, Bot tự động ghi nhận điểm danh sớm cho ca ngày mai, sáng mai không cần dậy sớm điểm danh lại.
- KHUNG GIỜ ĐIỂM DANH SÁNG: Mở điểm danh trong vòng 3 tiếng trước 9h sáng (từ 06:00 đến 09:00 sáng). Khuyến khích anh em điểm danh càng sớm càng tốt (từ 21h tối hôm trước hoặc 06:00 sáng) để kịp điều phối đơn hàng.
- TỔNG HỢP LÚC 09:00 SÁNG: Đúng 09:00 sáng, Bot tự động tổng hợp toàn bộ danh sách (người đã điểm danh kèm khung giờ làm việc của họ, người báo nghỉ phép, và những người chưa điểm danh để áp dụng chế tài tạm khóa điều đơn).
- Shipper Full-time mỗi ngày/ca CHỈ CẦN ĐIỂM DANH 1 LẦN DUY NHẤT.
- Điểm danh đầu ca bằng cú pháp: online[4 số đuôi SĐT] [Khung giờ làm việc] (ví dụ: online3389 hoặc online3389 8h-14h).
- Shipper nghỉ làm báo qua Zalo: nghi lam [4 số đuôi SĐT] [Lý do] (ví dụ: nghi lam 3389 xe bị thủng lốp).
- CHẾ TÀI QUÁ HẠN 09:00: Sau 09:00 sáng chưa điểm danh, hệ thống tự động tạm khóa nhận đơn hàng cho đến khi gửi tin nhắn "online[4 số đuôi]" vào nhóm!

4. QUY ĐỊNH KỶ LUẬT CẤM TUYỆT ĐỐI (QUAN TRỌNG HÀNG ĐẦU):
❌ CẤM TUYỆT ĐỐI CHẠY ĐƠN NGOÀI NỀN TẢNG:
   • Nghiêm cấm rủ rê, gạ gẫm, dụ dỗ khách hàng hủy đơn trên ứng dụng để chạy ngoài thu tiền mặt riêng.
   • Nghiêm cấm việc tắt app, giả vờ xe hỏng để hủy đơn hệ thống rồi tự ý chở/giao đơn chui.
   • Chế tài xử lý: KHÓA VĨNH VIỄN TÀI KHOẢN (Banned) trên toàn bộ hệ thống VietGo, thu hồi toàn bộ tiền thưởng/tiền ship tích lũy, đưa vào danh sách đen (Blacklist) toàn ngành và xử lý vi phạm quy định.
❌ CẤM TUYỆT ĐỐI VÒI VĨNH, THU THÊM TIỀN CỦA KHÁCH HÀNG:
   • Nghiêm cấm vòi tiền tip, đòi tiền bồi dưỡng, đòi phụ phí không có trong ứng dụng (tiền gửi xe, tiền công đi cầu thang, tiền thời tiết xấu...).
   • Nghiêm cấm hành vi tự ý tăng tiền ship, ép khách trả thêm tiền hoặc không trả lại tiền thừa cho khách.
   • Giá cước hiển thị trên app là chính xác và duy nhất. Tiền tip là hoàn toàn tự nguyện từ khách hàng, cấm mọi hành vi gợi ý/đòi hỏi.
   • Chế tài xử lý: Xử phạt kỷ luật, hoàn lại 100% tiền thu thừa cho khách, đình chỉ chạy 7 - 30 ngày đối với vi phạm lần đầu, và KHÓA TÀI KHOẢN VĨNH VIỄN nếu tái phạm.
❌ CẤM TUYỆT ĐỐI CHÊ ĐƠN GẦN, NGẠI CHẠY ĐƠN XA HOẶC KÉO CHỌN LỌC ĐƠN HÀNG:
   • Nghiêm cấm shipper chê đơn gần (vài trăm mét đến 1km) vì ít tiền ship, cố tình bỏ qua hoặc cằn nhằn với điều phối/khách hàng.
   • Nghiêm cấm shipper ngại chạy xa, từ chối nhận đơn ngoại thành/đơn xa hoặc tự ý hủy đơn sau khi hệ thống phân công.
   • Mọi đơn hàng (gần hay xa) đều tích lũy điểm uy tín, cộng dồn doanh số nổ đơn và tiền thưởng mốc ca làm việc.
   • Chế tài xử lý: Hạ tỷ lệ nhận đơn (Acceptance Rate), bị giảm thứ tự ưu tiên phát đơn VIP/đơn cao điểm, tạm khóa quyền nhận đơn từ 1 - 3 ngày nếu cố tình chọn lọc hoặc hủy đơn phân công.`,
  aiSystemPrompt: `Bạn là Trợ lý AI DeepSeek kiêm người bạn đồng hành của Đội ngũ Shipper Xe máy Giao Đồ Ăn VietGo Food.
Phong cách: Hóm hỉnh, vui vẻ, thân thiện nhưng CỰC KỲ DỨT KHOÁT VỚI CÁC VI PHẠM KỶ LUẬT.
Nhiệm vụ:
1. Khi shipper hỏi về công việc (SĐT đồng nghiệp, biển số xe máy, khu vực giao đồ ăn, ca trực, hotline điều phối đơn, quán ăn, khách hàng, xử lý sự cố đồ ăn): Trả lời chính xác, ngắn gọn theo dữ liệu đội shipper đã được cung cấp.
2. Khi shipper hỏi hoặc đề cập đến việc:
   • Chạy đơn ngoài nền tảng, hủy đơn app chạy chui, đòi tiền tip, vòi thu thêm tiền của khách, thu thêm phí gửi xe, nâng giá ship:
     👉 TRẢ LỜI CỰC KỲ CỨNG RẮN & THẲNG THẮN: Khẳng định hệ thống CẤM TUYỆT ĐỐI 100%, nêu rõ tác hại làm mất uy tín thương hiệu và CẢNH BÁO MẠNH MẼ VỀ CHẾ TÀI KHÓA TÀI KHOẢN VĨNH VIỄN (BANNED), tịch thu tiền thưởng, đưa vào danh sách đen toàn hệ thống.
   • Chê đơn gần, ngại chạy xa, muốn chọn lọc đơn, từ chối đơn phân công:
     👉 GIẢI THÍCH & ĐỘNG VIÊN CHUẨN XÁC: Nhắc nhở shipper mọi đơn hàng (gần/xa) đều tích lũy thưởng mốc nổ đơn và điểm uy tín. Khẳng định CẤM TUYỆT ĐỐI việc chê đơn gần hay ngại xa. Cảnh báo chế tài giảm thứ tự ưu tiên phát đơn ngon và phạt khóa nhận đơn 1 - 3 ngày.
3. Khi shipper chém gió, hỏi chuyện phiếm, đùa vui, tâm sự, hỏi thời tiết mưa nắng, kẹt xe, món ăn ngon, động viên: Hãy giao lưu hóm hỉnh, ấm áp, chúc "Nổ thật nhiều đơn / Giao nhanh đúng hẹn / Vạn dặm bình an"!
4. Luôn giữ tinh thần trung thực, lịch sự với khách hàng, lái xe an toàn và bảo vệ uy tín VietGo Food.`
};


let webhookLogs: WebhookLog[] = [
  {
    id: 'log-01',
    timestamp: `${todayStr} 05:52:10`,
    senderId: 'zalo_user_tuan29c',
    senderName: 'Tuấn Nguyễn (Xế 29C)',
    groupId: 'group_fleet_hanoi',
    groupName: 'ĐỘI XE VẬN TẢI HÀ NỘI',
    message: 'online3389 48250km',
    parsedCommand: 'CHECKIN',
    matchedPlate: '29C-882.14',
    driverFound: true,
    status: 'success',
    replySent: '✅ [ĐIỂM DANH THÀNH CÔNG] Tài xế Nguyễn Văn Tuấn (0912.34.3389 - Mã: 3389) lúc 05:52:10'
  }
];

// In-memory Real-time GPS Locations for active fleet
let driverLocations: DriverLocation[] = [
  {
    driverId: 'drv-01',
    driverName: 'Nguyễn Văn Tuấn',
    phone: '0912343389',
    tailCode: '3389',
    licensePlate: '29C-882.14',
    vehicleType: 'Xe tải 3.5T - 8T',
    route: 'Kho Hà Nội - Bắc Ninh - KCN Quế Võ',
    lat: 21.0538,
    lng: 105.8924,
    speed: 52,
    heading: 65,
    accuracy: 5,
    battery: 88,
    status: 'running',
    address: 'Cao tốc Hà Nội - Bắc Giang (Gần cầu Phù Đổng)',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  },
  {
    driverId: 'drv-02',
    driverName: 'Trần Đình Trọng',
    phone: '0988776655',
    tailCode: '6655',
    licensePlate: '51D-938.22',
    vehicleType: 'Xe tải 1.25T - 2.5T',
    route: 'Nội thành TP.HCM (Quận 1, 3, Bình Thạnh)',
    lat: 10.7925,
    lng: 106.6912,
    speed: 28,
    heading: 140,
    accuracy: 8,
    battery: 92,
    status: 'running',
    address: 'Đường Điện Biên Phủ, P.15, Bình Thạnh, TP.HCM',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  },
  {
    driverId: 'drv-03',
    driverName: 'Lê Hoàng Nam',
    phone: '0903112233',
    tailCode: '2233',
    licensePlate: '60B-019.45',
    vehicleType: 'Xe du lịch 4 - 7 chỗ',
    route: 'Đưa đón chuyên gia KCN Biên Hòa - Sân bay TSN',
    lat: 10.8184,
    lng: 106.6588,
    speed: 0,
    heading: 210,
    accuracy: 4,
    battery: 75,
    status: 'stopped',
    address: 'Ga Quốc tế, Sân bay Tân Sơn Nhất, TP.HCM (Đang chờ khách)',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  },
  {
    driverId: 'drv-04',
    driverName: 'Phạm Minh Đức',
    phone: '0934556677',
    tailCode: '6677',
    licensePlate: '43A-552.19',
    vehicleType: 'Xe đầu kéo Container',
    route: 'Cảng Đà Nẵng - KCN Hòa Khánh - Huế',
    lat: 16.0825,
    lng: 108.2215,
    speed: 45,
    heading: 320,
    accuracy: 6,
    battery: 64,
    status: 'running',
    address: 'Đường Nguyễn Tất Thành, Liên Chiểu, TP. Đà Nẵng',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  },
  {
    driverId: 'drv-05',
    driverName: 'Vũ Quốc Bảo',
    phone: '0977223344',
    tailCode: '3344',
    licensePlate: '30F-128.90',
    vehicleType: 'Xe tải 3.5T - 8T',
    route: 'Hà Nội - Vĩnh Phúc - Phú Thọ',
    lat: 21.3125,
    lng: 105.6022,
    speed: 62,
    heading: 300,
    accuracy: 5,
    battery: 81,
    status: 'running',
    address: 'Cao tốc Nội Bài - Lào Cai (Đoạn qua Vĩnh Yên)',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  },
  {
    driverId: 'drv-06',
    driverName: 'Đỗ Hữu Thắng',
    phone: '0944118899',
    tailCode: '8899',
    licensePlate: '29B-601.78',
    vehicleType: 'Xe khách 16 - 45 chỗ',
    route: 'Hà Nội - Hải Phòng - Cát Bà',
    lat: 20.8449,
    lng: 106.6881,
    speed: 0,
    heading: 90,
    accuracy: 3,
    battery: 95,
    status: 'idle',
    address: 'Bến xe Cầu Rào, Lê Chân, Hải Phòng (Nghỉ trưa)',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  },
  {
    driverId: 'drv-07',
    driverName: 'Bùi Thanh Tùng',
    phone: '0966332211',
    tailCode: '2211',
    licensePlate: '59P1-889.34',
    vehicleType: 'Xe máy giao hàng',
    route: 'Nội thành TP.HCM (Tân Bình, Phú Nhuận)',
    lat: 10.8015,
    lng: 106.6652,
    speed: 35,
    heading: 180,
    accuracy: 4,
    battery: 58,
    status: 'running',
    address: 'Đường Cộng Hòa, P.12, Tân Bình, TP.HCM',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  }
];


// Helper functions
function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
}

function cleanPlate(plate: string): string {
  return (plate || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function getPhoneTail(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : digits;
}

// Find Driver by 4-digit phone tail, full phone, license plate, or name
function findDriverByMessageOrSender(rawMessage: string, senderName: string, senderId?: string): Driver | null {
  const normMsg = normalizeText(rawMessage);
  const cleanMsg = cleanPlate(rawMessage);
  const rawClean = rawMessage.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  // 1. Check for 4-digit phone number in patterns like "online3389", "on3389", "off3389", "nghi3389", "3389"
  // Match 4 continuous digits in message
  const fourDigitMatches = rawMessage.match(/\b\d{4}\b/) || rawMessage.match(/(?:online|on|off|kt|nghi|phep|dd)\s*(\d{4})/i) || rawMessage.match(/(\d{4})\s*(?:online|on|off|kt|nghi)/i);
  if (fourDigitMatches) {
    const code = fourDigitMatches[1] || fourDigitMatches[0];
    for (const drv of drivers) {
      const tail = getPhoneTail(drv.phone);
      if (tail === code) return drv;
      if (cleanPlate(drv.licensePlate).includes(code)) return drv;
    }
  }

  // 2. Check concatenated "onlineXXXX" where XXXX is digits
  const inlineMatch = rawClean.match(/(?:online|on|off|kt|nghi|phep|dd)(\d{4})/i);
  if (inlineMatch && inlineMatch[1]) {
    const code = inlineMatch[1];
    for (const drv of drivers) {
      if (getPhoneTail(drv.phone) === code) return drv;
    }
  }

  // 3. Match License Plate directly
  for (const drv of drivers) {
    const drvPlateClean = cleanPlate(drv.licensePlate);
    if (drvPlateClean && cleanMsg.includes(drvPlateClean)) {
      return drv;
    }
    const lastDigits = drvPlateClean.slice(-5);
    if (lastDigits.length >= 4 && cleanMsg.includes(lastDigits)) {
      return drv;
    }
  }

  // 4. Match full phone number
  for (const drv of drivers) {
    const drvPhoneClean = drv.phone.replace(/\D/g, '');
    if (drvPhoneClean && drvPhoneClean.length >= 8 && rawMessage.replace(/\D/g, '').includes(drvPhoneClean)) {
      return drv;
    }
  }

  // 5. Match sender ID or sender name / driver name
  for (const drv of drivers) {
    if (senderId && drv.zaloId === senderId) return drv;
    
    if (senderName) {
      const normSender = normalizeText(senderName);
      const normDrvName = normalizeText(drv.name);
      const nameParts = normDrvName.split(' ');
      const lastName = nameParts[nameParts.length - 1]; // "tuan", "trong", "nam", "duc"...
      
      if (normDrvName.length > 3 && normSender.includes(normDrvName)) return drv;
      if (drv.zaloName && normSender.includes(normalizeText(drv.zaloName))) return drv;
      
      // Match sender's first name / last word if length >= 3
      if (lastName.length >= 3 && normSender.includes(lastName)) {
        // Double check plate in sender or direct name match
        return drv;
      }
    }

    const normDrvName = normalizeText(drv.name);
    const nameParts = normDrvName.split(' ');
    const lastName = nameParts[nameParts.length - 1];
    
    // 6. Match driver mentioned in natural text (e.g. "hôm nay anh Tuấn nghỉ", "Tuấn 29C nay nghỉ", "nay bác Trọng bận")
    if (normMsg.includes(`anh ${lastName}`) || 
        normMsg.includes(`bac ${lastName}`) || 
        normMsg.includes(`tai xe ${lastName}`) || 
        normMsg.includes(`xe ${lastName}`) || 
        normMsg.includes(` ${lastName} `) ||
        normMsg.startsWith(`${lastName} `) ||
        normMsg.endsWith(` ${lastName}`)) {
      return drv;
    }
  }

  // 7. If sender uses self-referencing pronouns ("hôm nay a nghỉ", "nay a nghỉ", "e xin nghỉ", "em nghỉ")
  // and we have a senderName, try matching the closest driver to senderName
  if (senderName) {
    const normSender = normalizeText(senderName);
    for (const drv of drivers) {
      const normDrvName = normalizeText(drv.name);
      const lastName = normDrvName.split(' ').slice(-1)[0];
      if (normSender.includes(lastName) || (drv.zaloName && normSender.includes(normalizeText(drv.zaloName)))) {
        return drv;
      }
    }
  }

  return null;
}


// Parse Odometer reading
function extractOdometer(msg: string): number | undefined {
  const match = msg.match(/(?:km|odo|so km|km:)\s*[:=]?\s*(\d{2,7})/i) || 
                msg.match(/(\d{2,7})\s*(?:km|odo)/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    // Exclude 4-digit phone codes from being confused as ODO if it's explicitly onlineXXXX
    if (num > 0 && num < 2000000) return num;
  }
  return undefined;
}

// Extract Working Time Range (e.g. "8h-14h", "8h - 14h", "08:00 - 14:00", "8h den 14h", "ca sang 6h-12h")
function extractTimeRange(msg: string): string | undefined {
  // Pattern matches 8h-14h, 8h30-14h30, 08:00 - 14:00, 8h den 14h, 8h toi 14h
  const pattern = /(\d{1,2}(?:h\d{0,2}|:\d{2})?)\s*(?:-|–|den|tới|toi|to)\s*(\d{1,2}(?:h\d{0,2}|:\d{2})?)/i;
  const match = msg.match(pattern);
  if (match && match[1] && match[2]) {
    return `${match[1].trim()} - ${match[2].trim()}`;
  }
  
  // Also check for explicit duration like "6 tieng", "8 tieng", "ca 6h"
  const durationMatch = msg.match(/(?:ca\s*)?(\d{1,2})\s*(?:tieng|gio|h)/i);
  if (durationMatch && !msg.toLowerCase().includes('online') && parseInt(durationMatch[1], 10) <= 24) {
    return `Ca ${durationMatch[1]} tiếng`;
  }
  return undefined;
}

// Extract Leave reason from Vietnamese message
function extractLeaveReason(msg: string): string {
  // Strip out common Vietnamese intro phrases and leave keywords
  let cleaned = msg
    .replace(/(?:hom\s*nay|nay|ngay\s*mai|sang\s*nay|chieu\s*nay)\s*/gi, '')
    .replace(/(?:nghi\s*lam|xin\s*nghi\s*lam|bao\s*nghi|xin\s*nghi|nghi|phep)\s*/gi, '')
    .replace(/(?:a|anh|e|em|toi|to|bac|chu)\s*/gi, '')
    .replace(/\b\d{4}\b/g, '')
    .replace(/(?:nha|nhe|nhé|nha\s*bac|nhe\s*ad|a|ah)\s*$/gi, '')
    .trim();
  
  cleaned = cleaned.replace(/^[:-]\s*/, '').trim();
  if (cleaned.length >= 3) {
    return cleaned;
  }
  return 'Việc cá nhân / Gia đình có việc bận';
}



function getActiveShift(timeStr?: string): Shift {
  const now = new Date();
  const currentHour = timeStr ? parseInt(timeStr.split(':')[0], 10) : now.getHours();
  const currentMin = timeStr ? parseInt(timeStr.split(':')[1], 10) : now.getMinutes();
  const currentTotalMins = currentHour * 60 + currentMin;

  if (currentTotalMins >= 300 && currentTotalMins < 840) {
    return shifts.find(s => s.id === 'shift-morning') || shifts[0];
  } else if (currentTotalMins >= 840 && currentTotalMins < 1320) {
    return shifts.find(s => s.id === 'shift-afternoon') || shifts[1];
  } else {
    return shifts.find(s => s.id === 'shift-night') || shifts[2];
  }
}

function calculateAttendanceStatus(shift: Shift, checkInTimeStr: string): { status: 'on_time' | 'late'; lateMinutes: number } {
  const [shHour, shMin] = shift.startTime.split(':').map(Number);
  const [ciHour, ciMin] = checkInTimeStr.split(':').map(Number);

  const checkInTotal = ciHour * 60 + ciMin;

  // Morning shift allows check-in within 3 hours window before 09:00 AM (06:00 - 09:00)
  if (shift.id === 'shift-morning' || (ciHour >= 5 && ciHour < 12)) {
    const morningCutoffTotal = 9 * 60; // 09:00 AM = 540 mins
    if (checkInTotal <= morningCutoffTotal) {
      return { status: 'on_time', lateMinutes: 0 };
    } else {
      return { status: 'late', lateMinutes: checkInTotal - morningCutoffTotal };
    }
  }

  const shiftStartTotal = shHour * 60 + shMin;
  let diffMinutes = checkInTotal - shiftStartTotal;
  if (shHour > 20 && ciHour < 6) {
    diffMinutes = (ciHour + 24) * 60 + ciMin - shiftStartTotal;
  }

  if (diffMinutes > shift.graceMinutes) {
    return { status: 'late', lateMinutes: diffMinutes };
  } else {
    return { status: 'on_time', lateMinutes: 0 };
  }
}

function calculateStats(date: string = getTodayString()): AttendanceStats {
  const total = drivers.filter(d => d.active).length;
  const records = attendanceRecords.filter(r => r.date === date);

  const onTimeCount = records.filter(r => r.status === 'on_time').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const leaveCount = records.filter(r => r.status === 'leave').length;
  const completedCount = records.filter(r => r.status === 'completed' || !!r.checkOutTime).length;
  const totalCheckedIn = records.filter(r => r.status === 'on_time' || r.status === 'late' || r.status === 'completed' || r.status === 'in_progress').length;
  const absentCount = Math.max(0, total - totalCheckedIn - leaveCount);

  const attendanceRate = total > 0 ? Math.round((totalCheckedIn / total) * 100) : 0;
  const punctualityRate = totalCheckedIn > 0 ? Math.round((onTimeCount / totalCheckedIn) * 100) : 100;

  return {
    date,
    totalDrivers: total,
    totalCheckedIn,
    onTimeCount,
    lateCount,
    leaveCount,
    absentCount,
    completedCount,
    attendanceRate,
    punctualityRate
  };
}

function formatTime(date: Date = new Date()): string {
  return date.toTimeString().split(' ')[0];
}

// Calculate active duration in hours & minutes between checkin and checkout
function calculateWorkDuration(checkInTimeStr?: string, checkOutTimeStr?: string): string {
  if (!checkInTimeStr || !checkOutTimeStr) return 'Ca làm việc đã hoàn thành';
  try {
    const inParts = checkInTimeStr.split(':').map(Number);
    const outParts = checkOutTimeStr.split(':').map(Number);
    const inH = inParts[0], inM = inParts[1] || 0;
    const outH = outParts[0], outM = outParts[1] || 0;
    if (isNaN(inH) || isNaN(outH)) return 'Ca làm việc đã hoàn thành';

    let startTotalM = inH * 60 + inM;
    let endTotalM = outH * 60 + outM;
    let durationM = endTotalM - startTotalM;
    if (durationM < 0) durationM += 24 * 60; // Overnight shift

    const h = Math.floor(durationM / 60);
    const m = durationM % 60;

    if (h === 0) return `${m} phút`;
    if (m === 0) return `${h} tiếng`;
    return `${h} tiếng ${m} phút`;
  } catch (e) {
    return 'Ca làm việc đã hoàn thành';
  }
}

// Build knowledge context for AI queries
function buildFleetKnowledgeContext(): string {
  const today = getTodayString();
  const records = attendanceRecords.filter(r => r.date === today);

  let driverListContext = `[DANH SÁCH TOÀN BỘ TÀI XẾ TRONG ĐỘI XE]:\n`;
  drivers.forEach((d, i) => {
    const tail = getPhoneTail(d.phone);
    const rec = records.find(r => r.driverId === d.id);
    let todayStatusText = 'Chưa điểm danh hôm nay';
    if (rec) {
      if (rec.status === 'on_time') todayStatusText = `Đã điểm danh ĐÚNG GIỜ lúc ${rec.checkInTime}`;
      else if (rec.status === 'late') todayStatusText = `Đã điểm danh ĐI TRỄ ${rec.lateMinutes}p lúc ${rec.checkInTime}`;
      else if (rec.status === 'leave') todayStatusText = `BÁO NGHỈ PHÉP (Lý do: ${rec.leaveReason || 'Việc riêng'})`;
      else if (rec.status === 'completed') todayStatusText = `ĐÃ HOÀN THÀNH CA (Vào ${rec.checkInTime}, Ra ${rec.checkOutTime})`;
    }

    driverListContext += `${i + 1}. Tài xế: ${d.name}\n` +
      `   - SĐT: ${d.phone} (Mã điểm danh: ${tail})\n` +
      `   - Biển số xe: ${d.licensePlate}\n` +
      `   - Loại xe: ${d.vehicleType}\n` +
      `   - Tuyến phụ trách: ${d.route}\n` +
      `   - Nick Zalo: ${d.zaloName || d.name}\n` +
      `   - Trạng thái hôm nay (${today}): ${todayStatusText}\n` +
      `   - Ghi chú: ${d.notes || 'Không có'}\n\n`;
  });

  return `${driverListContext}\n${botConfig.companyKnowledge}`;
}

// Query DeepSeek API or Fallback Smart Engine
async function queryDeepSeekAI(userQuestion: string, senderName: string): Promise<string> {
  const knowledgeContext = buildFleetKnowledgeContext();

  // If user provided a DeepSeek API key, call the real DeepSeek API
  if (botConfig.deepseekEnabled && botConfig.deepseekApiKey && botConfig.deepseekApiKey.trim() !== '') {
    try {
      const response = await fetch(botConfig.deepseekBaseUrl || 'https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${botConfig.deepseekApiKey.trim()}`
        },
        body: JSON.stringify({
          model: botConfig.deepseekModel || 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `${botConfig.aiSystemPrompt}\n\nTHÔNG TIN ĐÃ TRAIN & DỮ LIỆU ĐỘI XE MỚI NHẤT:\n${knowledgeContext}`
            },
            {
              role: 'user',
              content: `Tài xế/Người gửi: ${senderName}\nNội dung câu hỏi: ${userQuestion}`
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiReply = data.choices?.[0]?.message?.content;
        if (aiReply && aiReply.trim()) {
          return aiReply.trim();
        }
      } else {
        console.warn('DeepSeek API returned error status:', response.status, await response.text());
      }
    } catch (e: any) {
      console.error('DeepSeek fetch error:', e.message);
    }
  }

  // Built-in Smart RAG / Knowledge Search Fallback (Works instantly without requiring API key)
  const normQ = normalizeText(userQuestion);

  // 1. Search for a specific driver's phone number or details
  for (const drv of drivers) {
    const normName = normalizeText(drv.name);
    const nameWords = normName.split(' ');
    const lastName = nameWords[nameWords.length - 1]; // e.g. "tuan", "trong", "nam"
    const plateClean = cleanPlate(drv.licensePlate).toLowerCase();
    const phoneTail = getPhoneTail(drv.phone);

    if (normQ.includes(normName) || (lastName.length >= 2 && normQ.includes(lastName)) || normQ.includes(plateClean) || normQ.includes(phoneTail)) {
      const today = getTodayString();
      const rec = attendanceRecords.find(r => r.driverId === drv.id && r.date === today);
      let statusText = 'chưa điểm danh ca hôm nay';
      if (rec) {
        if (rec.status === 'on_time') statusText = `đã có mặt (đúng giờ lúc ${rec.checkInTime})`;
        else if (rec.status === 'late') statusText = `đã có mặt (đi trễ ${rec.lateMinutes}p)`;
        else if (rec.status === 'leave') statusText = `hôm nay nghỉ phép (${rec.leaveReason || 'việc bận'})`;
        else if (rec.status === 'completed') statusText = `đã hoàn thành ca lúc ${rec.checkOutTime}`;
      }

      return `🤖 [THÔNG TIN TÀI XẾ THEO YÊU CẦU]\n` +
        `👤 Bác tài: ${drv.name}\n` +
        `📞 Số điện thoại: ${drv.phone} (Mã điểm danh: ${phoneTail})\n` +
        `🚗 Biển số: ${drv.licensePlate} (${drv.vehicleType})\n` +
        `📍 Tuyến phụ trách: ${drv.route}\n` +
        `⏰ Trạng thái hôm nay: ${statusText}\n` +
        (drv.notes ? `📝 Ghi chú: ${drv.notes}\n` : '') +
        `Cần hỗ trợ thêm gì bác cứ nhắn em nhé! 🚚`;
    }
  }

  // 1.5. Check for STRICT ANTI-FRAUD / REGULATION RULES (Running outside app & demanding extra money/tip)
  if (
    normQ.includes('chay ngoai') || 
    normQ.includes('chạy ngoài') || 
    normQ.includes('huy don chay') || 
    normQ.includes('hủy đơn chạy') || 
    normQ.includes('tat app chay') || 
    normQ.includes('chay chui') ||
    normQ.includes('don ngoai') ||
    normQ.includes('đơn ngoài') ||
    normQ.includes('huy don') ||
    normQ.includes('hủy đơn')
  ) {
    return `🚫 [QUY ĐỊNH CẤM TUYỆT ĐỐI CHẠY ĐƠN NGOÀI NỀN TẢNG] 🚫\n` +
      `CẢNH BÁO TỪ BỘ PHẬN ĐIỀU PHỐI VIETGO FOOD:\n` +
      `❌ Hệ thống CẤM TUYỆT ĐỐI 100% tài xế/shipper rủ rê khách hủy đơn trên ứng dụng để chạy ngoài thu tiền mặt riêng, hoặc tắt app giả vờ xe hỏng để nhận đơn chui!\n\n` +
      `⚠️ CHẾ TÀI XỬ LÝ VI PHẠM TẬP TRUNG:\n` +
      `1. KHÓA VĨNH VIỄN TÀI KHOẢN (BANNED) trên toàn hệ thống VietGo.\n` +
      `2. Thu hồi toàn bộ tiền thưởng nổ đơn, tiền phụ cấp ca và thu nhập đã tích lũy.\n` +
      `3. Đưa tên vào DANH SÁCH ĐEN (Blacklist) ngành vận tải & xử lý vi phạm quy định.\n\n` +
      `Anh em shipper hãy giữ uy tín, trung thực để được hỗ trợ đầy đủ quyền lợi, bảo hiểm và thu nhập lâu dài! 🛵🛡️`;
  }

  if (
    normQ.includes('thu them') || 
    normQ.includes('thu thêm') || 
    normQ.includes('voi tien') || 
    normQ.includes('vòi tiền') || 
    normQ.includes('doi tip') || 
    normQ.includes('đòi tip') || 
    normQ.includes('xin tip') || 
    normQ.includes('tien gui xe') || 
    normQ.includes('tiền gửi xe') ||
    normQ.includes('phu phi') ||
    normQ.includes('phụ phí') ||
    normQ.includes('doi them') ||
    normQ.includes('đòi thêm') ||
    normQ.includes('nang gia') ||
    normQ.includes('nâng giá')
  ) {
    return `🚫 [QUY ĐỊNH CẤM VÒI VĨNH & THU THÊM TIỀN CỦA KHÁCH HÀNG] 🚫\n` +
      `CẢNH BÁO TỪ BỘ PHẬN ĐIỀU PHỐI VIETGO FOOD:\n` +
      `❌ CẤM TUYỆT ĐỐI vòi vĩnh, đòi tiền tip, tự ý đòi thêm tiền gửi xe, tiền công leo cầu thang hay nâng cước phí cao hơn số tiền hiển thị trên ứng dụng!\n\n` +
      `📌 LƯU Ý QUAN TRỌNG:\n` +
      `• Cước phí hiển thị trên app là DUY NHẤT và CHÍNH XÁC 100%.\n` +
      `• Tiền tip là HOÀN TOÀN TỰ NGUYỆN từ phía khách hàng. Cấm mọi hành vi đòi hỏi hay gợi ý gây khó chịu cho khách!\n\n` +
      `⚠️ CHẾ TÀI XỬ LÝ VI PHẠM:\n` +
      `• Vi phạm lần 1: Đình chỉ chạy 7 - 30 ngày, bắt hoàn 100% tiền thu thừa cho khách.\n` +
      `• Tái phạm: KHÓA VĨNH VIỄN TÀI KHOẢN (BANNED)!\n\n` +
      `Anh em shipper giữ thái độ lịch sự, chuyên nghiệp để nhận được đánh giá 5 sao nhé! 🛵⭐`;
  }

  if (
    normQ.includes('che don') || 
    normQ.includes('chê đơn') || 
    normQ.includes('don gan') || 
    normQ.includes('đơn gần') || 
    normQ.includes('don xa') || 
    normQ.includes('đơn xa') || 
    normQ.includes('ngai xa') || 
    normQ.includes('ngại xa') ||
    normQ.includes('xa qua') ||
    normQ.includes('xa quá') ||
    normQ.includes('it tien') ||
    normQ.includes('ít tiền') ||
    normQ.includes('tu choi don') ||
    normQ.includes('từ chối đơn') ||
    normQ.includes('chon loc don') ||
    normQ.includes('chọn lọc đơn')
  ) {
    return `🚫 [QUY ĐỊNH CẤM CHÊ ĐƠN GẦN & NGẠI CHẠY ĐƠN XA] 🚫\n` +
      `CẢNH BÁO TỪ BỘ PHẬN ĐIỀU PHỐI VIETGO FOOD:\n` +
      `❌ Quy định CẤM TUYỆT ĐỐI hành vi chê đơn gần (ít tiền ship) bỏ qua không chạy, hoặc ngại di chuyển xa từ chối/tự ý hủy đơn hệ thống đã phân công!\n\n` +
      `📌 LƯU Ý DÀNH CHO SHIPPER:\n` +
      `• Mọi đơn hàng (dù gần vài trăm mét hay xa vài km) đều đã được tính cước phí chuẩn và CỘNG DỒN VÀO THƯỞNG MỐC NỔ ĐƠN trong ca.\n` +
      `• Chạy đơn gần giúp tăng tốc số lượng đơn nổ để cán mốc thưởng ca cực nhanh!\n\n` +
      `⚠️ CHẾ TÀI XỬ LÝ:\n` +
      `• Tỷ lệ nhận đơn (Acceptance Rate) giảm -> Bị giảm thứ tự ưu tiên phát đơn VIP/đơn cao điểm.\n` +
      `• Cố tình hủy đơn phân công hoặc chọn lọc đơn -> TẠM KHÓA QUYỀN NHẬN ĐƠN từ 1 - 3 ngày!\n\n` +
      `Anh em shipper vui vẻ tiếp nhận mọi đơn hàng để tối đa hóa thu nhập thưởng ca nhé! 🛵🔥`;
  }

  // 2. Check for hotline / điều phối / cứu hộ
  if (normQ.includes('dieu phoi') || normQ.includes('truong phong') || normQ.includes('hotline') || normQ.includes('cuu ho') || normQ.includes('gara') || normQ.includes('sua xe')) {
    return `🤖 [DANH BẠ KHẨN CẤP ĐỘI XE]:\n` +
      `📞 Trưởng phòng Điều phối: Anh Nguyễn Văn Hoàng - 0988.999.888 (24/7)\n` +
      `🛠️ Cứu hộ giao thông & Gara: Gara Toàn Thắng - 0911.222.333\n` +
      `⛽ Kế toán xăng dầu: Chị Mai Phương - 0977.444.555 (08:00 - 17:00)\n` +
      `Bác tài cần gọi hỗ trợ gấp hãy liên hệ số trên nhé!`;
  }

  // 3. Check for warehouse / kho bãi
  if (normQ.includes('kho') || normQ.includes('dia chi') || normQ.includes('bai xe') || normQ.includes('tan binh') || normQ.includes('ha noi') || normQ.includes('da nang')) {
    return `🏢 [ĐỊA CHỈ HỆ THỐNG KHO BÃI]:\n` +
      `📍 Kho Hà Nội: Số 18 Đường Phạm Hùng, Nam Từ Liêm (Mở cửa 05:30 - 23:00)\n` +
      `📍 Kho Tân Bình: 142 Trường Chinh, P.13, Tân Bình, TP.HCM (Mở cửa 24/24)\n` +
      `📍 Kho Đà Nẵng: Lô B2, KCN Hòa Khánh, Liên Chiểu (06:00 - 22:00)\n` +
      `Bác tài giao nhận hàng đúng khung giờ quy định nhé! 📦`;
  }

  // 4. Check for petrol / xăng dầu / định mức
  if (normQ.includes('xang') || normQ.includes('dau') || normQ.includes('hoa don') || normQ.includes('dinh muc') || normQ.includes('mst')) {
    return `⛽ [QUY ĐỊNH XĂNG DẦU & HÓA ĐƠN]:\n` +
      `- Đổ tại cây xăng Petrolimex trên toàn quốc.\n` +
      `- Lấy hóa đơn VAT MST Công ty: 0108998877.\n` +
      `- Định mức: Xe 1.25-2.5T: 11L/100km | Xe 3.5-8T: 16L/100km | Xe Container: 38L/100km.\n` +
      `- Mọi thắc mắc liên hệ Kế toán Mai Phương: 0977.444.555.`;
  }

  // 5. Chém gió, tâm sự, đùa vui, chuyện cười, thời tiết, ăn uống, thơ ca, động viên
  if (normQ.includes('chuyen cuoi') || normQ.includes('ke chuyen') || normQ.includes('hai huoc') || normQ.includes('vui ve')) {
    return `😄 [AI CHÉM GIÓ - CHUYỆN CƯỜI TÀI XẾ 🚚]\n` +
      `Cảnh sát giao thông tuýt còi một bác tài xe tải:\n` +
      `- "Bác tài! Xe chở quá tải, sao bác lại chở theo cả đàn vịt sau thùng thế này?"\n` +
      `- Bác tài nhanh trí: "Dạ thưa sếp, em đang chở các em nó đi thi 'Giọng Hát Vịt Nhí' của đài truyền hình đấy ạ!" 🦆😂\n\n` +
      `Chúc bác ${senderName} và toàn thể anh em có một ngày chạy xe thật vui vẻ, tỉnh táo và không lo quá tải! 🚗💨`;
  }

  if (normQ.includes('an gi') || normQ.includes('quan an') || normQ.includes('com binh dan') || normQ.includes('uong gi') || normQ.includes('cafe')) {
    return `🍲 [AI GỢI Ý MÓN NGON CHO BÁC TÀI ☕]\n` +
      `Chào bác ${senderName}! Chạy xe đường dài nhớ ăn uống đủ chất nhé:\n` +
      `• Sáng: Làm tô Phở Bò nóng hổi hoặc Bún Chả thêm ly cà phê đen đá tỉnh táo!\n` +
      `• Trưa: Ghé quán cơm bình dân dọc tuyến, nhớ gọi thêm canh chua giải nhiệt.\n` +
      `• Uống nước: Luôn thủ sẵn chai nước lọc trên xe, hạn chế nước ngọt có ga nha bác!\n` +
      `Chúc bác ngon miệng và nạp đầy năng lượng! 🚚✨`;
  }

  if (normQ.includes('tho') || normQ.includes('bai tho') || normQ.includes('lam tho')) {
    return `✍️ [AI TẶNG BÁC TÀI BÀI THƠ ĐƯỜNG DÀI 🛣️]\n` +
      `"Đời tài xế sớm hôm xuôi ngược,\n` +
      `Bánh xe lăn vững bước đường trường.\n` +
      `Bình minh vừa hé màn sương,\n` +
      `VietGo rẽ sóng vạn đường bình an!" 🚚🌾\n\n` +
      `Kính chúc bác ${senderName} chắc tay lái, êm chân ga, vạn dặm hanh thông! ❤️`;
  }

  if (normQ.includes('chuc') || normQ.includes('chao') || normQ.includes('tam su') || normQ.includes('chem gio') || normQ.includes('alo') || normQ.includes('khoe khong')) {
    return `🤖 [AI ĐỒNG HÀNH VIETGO]: Chào bác tài ${senderName}! Em luôn túc trực trong nhóm để hỗ trợ và chém gió cùng các bác đây ạ! 😄\n` +
      `Chúc toàn thể anh em đội xe hôm nay:\n` +
      `✨ Đường thông thoáng, không lo kẹt xe!\n` +
      `✨ Giao hàng chuẩn giờ, khách khen nức nở!\n` +
      `✨ Tay lái vững vàng, vạn dặm bình an! 🚚💨\n` +
      `Bác cần tra cứu SĐT, kho bãi hay muốn đố vui cứ nhắn "ai [câu hỏi]" nhé!`;
  }

  // Generic AI Response
  return `🤖 [AI VIETGO - TRẢ LỜI BÁC ${senderName.toUpperCase()}]:\n` +
    `Em đã nhận được câu hỏi: "${userQuestion}"!\n\n` +
    `👉 Bác có thể hỏi em bất kỳ điều gì bằng cú pháp "ai [câu hỏi]":\n` +
    `• SĐT & trạng thái tài xế (VD: "ai sdt anh Tuấn 29C?")\n` +
    `• Hotline điều phối 24/7, cứu hộ khẩn cấp, địa chỉ kho bãi\n` +
    `• Chém gió, kể chuyện cười, thời tiết, gợi ý ăn uống đường dài...\n` +
    `Chúc bác tài vạn dặm thượng lộ bình an! 🚚✨`;
}

// Generate Standalone Node.js Worker Bot Script
function generateBotScript(hostUrl: string, secret: string): string {
  return `/**
 * =========================================================================
 * ZALO DRIVER ATTENDANCE & DEEPSEEK AI ASSISTANT BOT GATEWAY (24/7 SERVER)
 * Tự động bắt tin nhắn điểm danh siêu gọn (online3389) & Giải đáp câu hỏi bằng DeepSeek AI
 * =========================================================================
 * CÁCH CHẠY 24/7 TRÊN VPS / SERVER:
 * 1. Cài Node.js: https://nodejs.org
 * 2. npm init -y && npm install zalo-api axios dotenv
 * 3. Chạy: node bot.js
 * 4. Treo vĩnh viễn: pm2 start bot.js --name "zalo-driver-bot" && pm2 save
 * =========================================================================
 */

const { Zalo } = require('zalo-api');
const axios = require('axios');
const fs = require('fs');

const CONFIG = {
  WEBHOOK_URL: process.env.WEBHOOK_URL || '${hostUrl}/api/zalo/webhook',
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || '${secret}',
  SESSION_FILE: './zalo_session.json',
  AUTO_REPLY: true
};

console.log('---------------------------------------------------------');
console.log('🚀 KHỞI ĐỘNG ZALO FLEET ATTENDANCE & DEEPSEEK BOT GATEWAY');
console.log('📡 Webhook URL:', CONFIG.WEBHOOK_URL);
console.log('---------------------------------------------------------');

async function initBot() {
  try {
    let sessionData = null;
    if (fs.existsSync(CONFIG.SESSION_FILE)) {
      sessionData = JSON.parse(fs.readFileSync(CONFIG.SESSION_FILE, 'utf8'));
      console.log('🔑 Đã tìm thấy phiên đăng nhập cũ, đang kết nối lại...');
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
    console.log('✅ ĐĂNG NHẬP ZALO THÀNH CÔNG! ĐANG LẮNG NGHE TIN NHẮN...');

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

        const response = await axios.post(CONFIG.WEBHOOK_URL, {
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

        if (response.data && response.data.reply && CONFIG.AUTO_REPLY) {
          const replyText = response.data.reply;
          console.log(\`[🤖 Bot Auto-Reply -> \${senderName}]:\\n\${replyText}\`);
          
          if (isGroup && groupId) {
            await api.sendMessage({ msg: replyText, quote: message }, groupId, 1);
          } else if (senderId) {
            await api.sendMessage({ msg: replyText }, senderId, 0);
          }
        }
      } catch (err) {
        console.error('❌ Lỗi xử lý tin nhắn:', err.message);
      }
    });

    api.listener.start();

  } catch (error) {
    console.error('❌ Lỗi khởi động Zalo Bot:', error.message);
    console.log('⏳ Thử lại sau 15 giây...');
    setTimeout(initBot, 15000);
  }
}

initBot();
`;
}

// Process an incoming Zalo command or query
async function processZaloMessage(
  message: string, 
  senderName: string, 
  senderId?: string, 
  groupId?: string, 
  groupName?: string
): Promise<{ 
  action: 'checkin' | 'checkout' | 'leave' | 'report' | 'help' | 'ai_query' | 'unknown'; 
  reply: string; 
  record?: AttendanceRecord;
  driver?: Driver;
  success: boolean;
}> {
  const normMsg = normalizeText(message);
  const now = new Date();
  const timeStr = formatTime(now);
  const today = getTodayString(now);
  const tomorrow = getTomorrowString(now);
  const currentHour = now.getHours();
  const rawClean = message.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  // Check if this action is for Tomorrow (sent from 21:00 night onwards or explicitly mentioning "mai" / "ngày mai")
  const isAfter21PM = currentHour >= 21;
  const isExplicitTomorrow = normMsg.includes('ngay mai') || normMsg.includes('mai');
  const isForTomorrow = isAfter21PM || isExplicitTomorrow;
  const effectiveDate = isForTomorrow ? tomorrow : today;

  // 1. HELP / SHORTCUTS & WORKING HOURS COMMAND (e.g. trogiupvietgo, trợ giúp, tro giup, phim tat, gio lam viec, help)
  const isHelpCommand = 
    rawClean === 'trogiupvietgo' ||
    rawClean === 'trogiup' ||
    rawClean === 'trogiupvg' ||
    rawClean === 'phimtat' ||
    rawClean === 'cuphap' ||
    rawClean === 'huongdan' ||
    rawClean === 'help' ||
    botConfig.helpKeywords.some(k => {
      const normK = normalizeText(k);
      return normMsg === normK || 
             normMsg.startsWith(normK + ' ') || 
             normMsg.endsWith(' ' + normK) ||
             normMsg === '/' + normK ||
             normMsg === '!' + normK ||
             rawClean.includes(k.replace(/\s+/g, ''));
    }) ||
    normMsg.includes('tro giup') ||
    normMsg.includes('trogiup') ||
    normMsg.includes('phim tat') ||
    normMsg.includes('gio lam viec') ||
    normMsg.includes('gio giac lam viec') ||
    normMsg.includes('gio giac') ||
    normMsg.includes('khung gio lam');

  if (isHelpCommand) {
    const helpReply = `🔰 [VIETGO DRIVER - BẢNG PHÍM TẮT BÁO CA & GIỜ GIẤC LÀM VIỆC] 🚚\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ 1. CÁC PHÍM TẮT BÁO CA (SIÊU GỌN & NHANH):\n\n` +
      `🟢 BÁO VÀO CA (ONLINE / ĐIỂM DANH):\n` +
      `👉 Cú pháp: online[4 số đuôi SĐT] (hoặc: online[4 số đuôi] [Khung giờ])\n` +
      `   • Ví dụ 1: online3389  (hoặc ngắn gọn: on3389)\n` +
      `   • Ví dụ 2: online3389 8h-14h  (AI nhận diện ca 6 tiếng)\n` +
      `   • 🌙 ĐIỂM DANH SỚM CHO NGÀY MAI: Tính từ 21:00 ĐÊM HÔM TRƯỚC trở đi! Bác tài nhắn từ 21h tối, bot tự động ghi nhận cho ca ngày mai, sáng mai KHÔNG CẦN điểm danh lại!\n\n` +
      `🔴 BÁO RA CA (OFFLINE / KẾT THÚC CA):\n` +
      `👉 Cú pháp: off[4 số đuôi SĐT] (hoặc: kt[4 số đuôi SĐT])\n` +
      `   • Ví dụ: off3389  (hoặc: kt3389)\n\n` +
      `🟡 BÁO NGHỈ LÀM / XIN NGHỈ PHÉP:\n` +
      `👉 Cú pháp: nghi[4 số đuôi SĐT] [Lý do] (hoặc: nghi lam [4 số đuôi] [Lý do])\n` +
      `   • Ví dụ: nghi3389 xe bảo dưỡng  (hoặc: nghi lam 3389 việc gia đình)\n` +
      `   • Chat tự nhiên: "hôm nay a nghỉ nhé", "mai Tuấn nghỉ bận việc"\n\n` +
      `📊 TRA CỨU TÌNH HÌNH ONLINE, OFFLINE & ĐIỂM DANH:\n` +
      `👉 Cú pháp: checkonline (hoặc: dsonline, check online, ds, baocao)\n` +
      `   • Bot báo cáo chi tiết: Số lượng & Danh sách cụ thể ai đang Online (kèm khung giờ), ai đã Offline, ai Báo nghỉ, ai Chưa điểm danh!\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⏰ 2. QUY ĐỊNH KHUNG GIỜ ĐIỂM DANH VIETGO:\n` +
      `🌙 Điểm Danh Sớm Cho Ngày Mai: Mở từ 21:00 ĐÊM HÔM TRƯỚC trở đi (Ghi nhận sớm cho ngày mai).\n` +
      `🌅 Khung Điểm Danh Sáng: 06:00 - 09:00 (Mở trong 3h trước 9h sáng).\n` +
      `🌟 KHUYẾN KHÍCH ĐIỂM DANH SỚM (Từ 21h tối hoặc trước 07:00 sáng) để Ban Điều Phối kịp phân tuyến và giao đơn đầu ngày!\n` +
      `☀️ Ca Chiều: 14:00 - 22:00 (Check-in: 13:45 - 14:15)\n` +
      `🌙 Ca Đêm:   22:00 - 06:00 (Check-in: 21:45 - 22:15)\n` +
      `⏱️ Ca Tùy Chỉnh: Bác tài có thể báo kèm giờ thực tế (VD: online3389 8h-14h, ca 6 tiếng). AI DeepSeek tự động tính thời lượng ca.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚠️ 3. QUY CHẾ ĐIỂM DANH & TỔNG HỢP 09:00 SÁNG:\n` +
      `• Tài xế Full-time: Mỗi ngày/ca CHỈ CẦN ĐIỂM DANH 1 LẦN DUY NHẤT.\n` +
      `• ĐÚNG 09:00 SÁNG: Bot TỰ ĐỘNG TỔNG HỢP toàn bộ danh sách (người đã điểm danh kèm khung giờ, người báo nghỉ & người chưa có mặt).\n` +
      `• CHẾ TÀI QUÁ HẠN 09:00: Tự động TẠM KHÓA NHẬN ĐƠN với ai chưa điểm danh! Nhắn "online[4 số đuôi]" (VD: online3389) để tự động gỡ khóa.\n\n` +
      `🤖 4. GỌI AI CHÉM GIÓ & HỎI ĐÁP (CÓ CÚ PHÁP ĐỂ TRÁNH SPAM NHÓM):\n` +
      `👉 Cú pháp: ai [nội dung]  (hoặc: bot [nội dung], hoi [nội dung])\n` +
      `   • Tra cứu đội xe: ai sdt anh Tuấn?, ai kho Tân Bình ở đâu?, ai hotline điều phối?\n` +
      `   • Chém gió vui vẻ: ai chém gió tí đi, ai kể chuyện cười đi, ai hôm nay ăn gì, ai chúc anh em đi!\n` +
      `   • Lưu ý: Bot chỉ trả lời khi có chữ "ai " hoặc "bot " đứng đầu để không làm phiền khi anh em nhắn tin thông thường!`;
    return { action: 'help', reply: helpReply, success: true };
  }

  // 2. CHECKONLINE / REPORT / STATUS / DS COMMAND
  const isStatusReportCommand = 
    rawClean === 'checkonline' ||
    rawClean === 'checkon' ||
    rawClean === 'dsonline' ||
    rawClean === 'checkoffline' ||
    rawClean === 'kiemtraonline' ||
    rawClean === 'kiemtra' ||
    rawClean === 'tinhhinh' ||
    rawClean === 'trangthai' ||
    rawClean === 'baocao' ||
    rawClean === 'ds' ||
    rawClean === 'danhsach' ||
    botConfig.statusKeywords.some(k => {
      const normK = normalizeText(k);
      return normMsg === normK || 
             normMsg.startsWith(normK + ' ') || 
             normMsg.endsWith(' ' + normK) ||
             rawClean.includes(k.replace(/\s+/g, ''));
    }) ||
    normMsg.includes('check online') ||
    normMsg.includes('checkonline') ||
    normMsg.includes('tinh hinh online') ||
    normMsg.includes('danh sach online') ||
    normMsg.includes('ai online') ||
    normMsg.includes('ai dang online') ||
    normMsg.includes('ai off') ||
    normMsg.includes('ai nghi') ||
    normMsg.includes('ai chua diem danh');

  if (isStatusReportCommand) {
    const activeDrivers = drivers.filter(d => d.active);
    const todayRecords = attendanceRecords.filter(r => r.date === today);

    // 1. Offline Drivers (Completed shift / Checked-out)
    const offlineDrivers = activeDrivers.filter(d => 
      todayRecords.some(r => r.driverId === d.id && (r.status === 'completed' || (r.checkOutTime && r.checkOutTime !== '--:--:--')))
    );

    // 2. Online Drivers (Currently on duty / Checked in and not completed)
    const onlineDrivers = activeDrivers.filter(d => 
      todayRecords.some(r => r.driverId === d.id && 
        (r.status === 'on_time' || r.status === 'late' || r.status === 'in_progress') && 
        r.status !== 'leave' && 
        (!r.checkOutTime || r.checkOutTime === '--:--:--')
      )
    );

    // 3. Leave Drivers (Registered leave for today)
    const leaveDrivers = activeDrivers.filter(d => 
      todayRecords.some(r => r.driverId === d.id && r.status === 'leave')
    );

    // 4. Missing / Absent Drivers (Not checked-in yet)
    const missingDrivers = activeDrivers.filter(d => 
      !todayRecords.some(r => r.driverId === d.id && r.status !== 'absent')
    );

    const totalCount = activeDrivers.length;
    const onlineCount = onlineDrivers.length;
    const offlineCount = offlineDrivers.length;
    const leaveCount = leaveDrivers.length;
    const missingCount = missingDrivers.length;

    const onlinePercent = totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0;
    const offlinePercent = totalCount > 0 ? Math.round((offlineCount / totalCount) * 100) : 0;
    const leavePercent = totalCount > 0 ? Math.round((leaveCount / totalCount) * 100) : 0;
    const missingPercent = totalCount > 0 ? Math.round((missingCount / totalCount) * 100) : 0;

    // Build Online Drivers List
    const onlineListStr = onlineDrivers.length > 0
      ? onlineDrivers.map((d, i) => {
          const rec = todayRecords.find(r => r.driverId === d.id && (r.status === 'on_time' || r.status === 'late' || r.status === 'in_progress'));
          const shift = shifts.find(s => s.id === (rec?.shiftId || d.defaultShiftId)) || getActiveShift();
          const workHours = rec?.workHoursExpected || `${shift.startTime} - ${shift.endTime} (${shift.name})`;
          const checkInStatus = rec?.status === 'on_time' ? 'Đúng hạn ✅' : `Trễ sau 09h (${rec?.lateMinutes || 0}p) ⚠️`;
          const timeDisplay = rec?.checkInTime && rec.checkInTime !== '--:--:--' ? rec.checkInTime : 'Đang hoạt động';
          return `${i + 1}. 🟢 @${d.name} (Xe ${d.licensePlate} - Mã: ${getPhoneTail(d.phone)} - SĐT: ${d.phone})\n   ⏱️ Khung giờ làm việc: ${workHours}\n   ⏰ Vào ca: ${timeDisplay} (${checkInStatus}) • Tuyến: ${d.route}`;
        }).join('\n')
      : '   (Hiện chưa có tài xế nào đang Online trong ca)';

    // Build Offline Drivers List
    const offlineListStr = offlineDrivers.length > 0
      ? offlineDrivers.map((d, i) => {
          const rec = todayRecords.find(r => r.driverId === d.id && (r.status === 'completed' || (r.checkOutTime && r.checkOutTime !== '--:--:--')));
          const kmRan = (rec?.endOdometer && rec?.startOdometer) ? (rec.endOdometer - rec.startOdometer) : 0;
          const odoStr = rec?.endOdometer ? `ODO: ${rec.endOdometer.toLocaleString()} km` : '';
          const kmStr = kmRan > 0 ? `Đã chạy: ${kmRan} km` : '';
          const statsInfo = [kmStr, odoStr].filter(Boolean).join(' • ');
          return `${i + 1}. 🏁 @${d.name} (Xe ${d.licensePlate} - Mã: ${getPhoneTail(d.phone)})\n   ⏰ Vào ca: ${rec?.checkInTime || '--'} ➡️ Ra ca: ${rec?.checkOutTime || timeStr} (Hoàn thành ca)\n   ${statsInfo ? `📊 ${statsInfo}` : '📊 Đã chốt ca về bãi'}`;
        }).join('\n')
      : '   (Chưa có tài xế nào hoàn thành / ra ca hôm nay)';

    // Build Leave Drivers List
    const leaveListStr = leaveDrivers.length > 0
      ? leaveDrivers.map((d, i) => {
          const rec = todayRecords.find(r => r.driverId === d.id && r.status === 'leave');
          const reason = rec?.leaveReason || rec?.note || 'Báo nghỉ phép';
          return `${i + 1}. 📝 @${d.name} (Xe ${d.licensePlate} - Mã: ${getPhoneTail(d.phone)} - SĐT: ${d.phone})\n   📋 Lý do: ${reason}`;
        }).join('\n')
      : '   (Không có tài xế nào nghỉ phép hôm nay)';

    // Build Missing Drivers List
    const missingListStr = missingDrivers.length > 0
      ? missingDrivers.map((d, i) => {
          const shift = shifts.find(s => s.id === d.defaultShiftId) || getActiveShift();
          return `${i + 1}. ❌ @${d.name} (Xe ${d.licensePlate} - Mã: ${getPhoneTail(d.phone)} - SĐT: ${d.phone})\n   🎯 Phân công: ${shift.name}\n   🚨 Trạng thái: Chưa có mặt (Quá 09:00 bị tạm khóa đơn)`;
        }).join('\n')
      : '   🎉 Tuyệt vời! Toàn bộ 100% tài xế đã điểm danh đầy đủ!';

    const reportReply = 
      `📊 [BÁO CÁO TÌNH HÌNH ONLINE, OFFLINE & ĐIỂM DANH ĐỘI XE] 🚚\n` +
      `📅 Ngày: ${today} | Cập nhật lúc: ${timeStr}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📈 TỔNG QUAN QUÂN SỐ TOÀN ĐỘI (${totalCount} TÀI XẾ):\n` +
      `• 🟢 Đang Online (Trong ca): ${onlineCount} tài xế (${onlinePercent}%)\n` +
      `• 🏁 Đã Offline (Ra ca/Về bãi): ${offlineCount} tài xế (${offlinePercent}%)\n` +
      `• 🟡 Báo Nghỉ Phép: ${leaveCount} tài xế (${leavePercent}%)\n` +
      `• 🔴 Chưa Điểm Danh: ${missingCount} tài xế (${missingPercent}%)\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🟢 I. DANH SÁCH ĐANG ONLINE (TRONG CA LÀM VIỆC) (${onlineCount}/${totalCount}):\n` +
      `${onlineListStr}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏁 II. DANH SÁCH ĐÃ OFFLINE / RA CA (${offlineCount}/${totalCount}):\n` +
      `${offlineListStr}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🟡 III. DANH SÁCH BÁO NGHỈ PHÉP (${leaveCount}/${totalCount}):\n` +
      `${leaveListStr}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔴 IV. DANH SÁCH CHƯA ĐIỂM DANH (${missingCount}/${totalCount}):\n` +
      `${missingListStr}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 CÚ PHÁP TƯƠNG TÁC NHANH:\n` +
      `👉 Báo vào ca: online[4 số đuôi] (VD: online3389 hoặc online3389 8h-14h)\n` +
      `👉 Báo ra ca: off[4 số đuôi] (VD: off3389)\n` +
      `👉 Báo nghỉ làm: nghi[4 số đuôi] [Lý do] (VD: nghi3389 xe bảo dưỡng)\n` +
      `👉 Tra cứu phím tắt: Nhắn "trogiupvietgo"`;

    return { action: 'report', reply: reportReply, success: true };
  }

  // Check if message is a Question intended for AI (e.g. asking for driver phone, route, warehouse, general question)
  const isQuestion = 
    message.includes('?') || 
    normMsg.includes('cho hoi') || 
    normMsg.includes('sdt') || 
    normMsg.includes('so dien thoai') || 
    normMsg.includes('ai biet') || 
    normMsg.includes('bac tai') || 
    normMsg.includes('xe nao') || 
    normMsg.includes('tuyen nao') || 
    normMsg.includes('chay tuyen') || 
    normMsg.includes('dia chi kho') || 
    normMsg.includes('quy dinh') || 
    normMsg.includes('dieu phoi') ||
    normMsg.includes('cuu ho') ||
    normMsg.includes('gara') ||
    normMsg.includes('xang dau') ||
    normMsg.includes('mai phuong') ||
    normMsg.includes('nguyen van hoang');

  // Try matching driver
  const driver = findDriverByMessageOrSender(message, senderName, senderId);

  // Check explicit Check-in keywords or patterns: online3389, on3389, dd3389, 3389 on
  const isCheckInExplicit = 
    rawClean.startsWith('online') || 
    rawClean.startsWith('on') || 
    rawClean.startsWith('dd') || 
    normMsg.startsWith('online') || 
    normMsg.startsWith('on ') || 
    normMsg.startsWith('dd ') || 
    normMsg.startsWith('co mat') || 
    normMsg.startsWith('diem danh') ||
    (driver !== null && !isQuestion && (rawClean.includes('online') || rawClean.includes('on') || rawClean.includes('dd')));

  // Check explicit Checkout keywords: off3389, off 3389, kt3389, kt 3389, xong3389
  const isCheckOutExplicit = 
    rawClean.startsWith('off') || 
    rawClean.startsWith('kt') || 
    rawClean.startsWith('xong') || 
    normMsg.startsWith('off') || 
    normMsg.startsWith('kt ') || 
    normMsg.startsWith('ket thuc') || 
    normMsg.startsWith('ve bai') || 
    normMsg.startsWith('xong ca') ||
    (driver !== null && (rawClean.includes('off') || rawClean.includes('kt')));

  // Check explicit Leave keywords: nghi3389, hom nay a nghi, nay a nghi, nghi lam, xin nghi
  const isLeaveExplicit = 
    rawClean.startsWith('nghi') || 
    rawClean.startsWith('phep') || 
    normMsg.startsWith('nghi') || 
    normMsg.startsWith('xin nghi') || 
    normMsg.startsWith('bao nghi') || 
    normMsg.startsWith('phep') ||
    normMsg.includes('nghi lam') ||
    normMsg.includes('xin nghi lam') ||
    normMsg.includes('hom nay a nghi') ||
    normMsg.includes('nay a nghi') ||
    normMsg.includes('a nghi hom nay') ||
    normMsg.includes('a nghi nha') ||
    normMsg.includes('a nghi nhe') ||
    normMsg.includes('hom nay anh nghi') ||
    normMsg.includes('nay anh nghi') ||
    normMsg.includes('anh nghi hom nay') ||
    normMsg.includes('nay e nghi') ||
    normMsg.includes('nay em nghi') ||
    normMsg.includes('e xin nghi') ||
    normMsg.includes('em xin nghi') ||
    normMsg.includes('hom nay em nghi') ||
    normMsg.includes('hom nay e nghi') ||
    (normMsg.includes('nghi') && (normMsg.includes('hom nay') || normMsg.includes('nay') || normMsg.includes('ban viec') || normMsg.includes('xe hu') || normMsg.includes('om') || normMsg.includes('kham')));


  // 3. LEAVE COMMAND (nghi lam 3389, nghi3389, 3389 nghi lam, xin nghi lam)
  if (isLeaveExplicit && !isQuestion) {
    if (!driver) {
      return {
        action: 'leave',
        reply: `⚠️ Không tìm thấy thông tin tài xế để báo nghỉ.\n👉 Cú pháp: nghi lam [4 số đuôi SĐT] [Lý do]\n(Ví dụ: nghi lam 3389 Xe bị hư hoặc nghi3389 Bận việc gia đình)`,
        success: false
      };
    }

    const reason = extractLeaveReason(message);
    const phoneTail = getPhoneTail(driver.phone);

    let record = attendanceRecords.find(r => r.driverId === driver.id && r.date === effectiveDate);
    if (!record) {
      const shift = shifts.find(s => s.id === driver.defaultShiftId) || getActiveShift();
      record = {
        id: `att-${Date.now()}`,
        driverId: driver.id,
        driverName: driver.name,
        licensePlate: driver.licensePlate,
        vehicleType: driver.vehicleType,
        route: driver.route,
        date: effectiveDate,
        shiftId: shift.id,
        shiftName: shift.name,
        checkInTime: timeStr,
        status: 'leave',
        leaveReason: reason,
        dispatchRestricted: false,
        aiAnalysis: {
          intent: 'leave',
          parsedReason: reason,
          summary: `Tài xế báo nghỉ làm ngày ${effectiveDate} do: ${reason}`
        },
        note: `AI ghi nhận báo nghỉ làm ngày ${effectiveDate} lúc ${timeStr}: ${reason}`,
        source: 'zalo_bot',
        rawZaloMessage: message,
        zaloSenderName: senderName,
        createdAt: new Date().toISOString()
      };
      attendanceRecords.push(record);
    } else {
      record.status = 'leave';
      record.leaveReason = reason;
      record.dispatchRestricted = false;
      record.note = `AI cập nhật báo nghỉ làm ngày ${effectiveDate} lúc ${timeStr}: ${reason}`;
      record.aiAnalysis = {
        intent: 'leave',
        parsedReason: reason,
        summary: `Cập nhật nghỉ làm ngày ${effectiveDate}: ${reason}`
      };
    }

    const reply = botConfig.leaveTemplate
      .replace('{name}', driver.name)
      .replace('{phone}', driver.phone)
      .replace('{phoneTail}', phoneTail)
      .replace('{plate}', driver.licensePlate)
      .replace('{date}', isForTomorrow ? `${effectiveDate} (Ngày mai)` : effectiveDate)
      .replace('{reason}', reason);

    return { action: 'leave', reply, record, driver, success: true };
  }

  // 4. CHECKOUT COMMAND
  if (isCheckOutExplicit && !isQuestion) {
    if (!driver) {
      return {
        action: 'checkout',
        reply: `⚠️ Không tìm thấy thông tin tài xế.\n👉 Cú pháp: off[4 số đuôi SĐT] [Số km ODO] (Ví dụ: off3389 48450km)`,
        success: false
      };
    }

    const endOdo = extractOdometer(message);
    const phoneTail = getPhoneTail(driver.phone);
    let record = attendanceRecords.find(r => r.driverId === driver.id && r.date === today);

    if (!record) {
      const shift = shifts.find(s => s.id === driver.defaultShiftId) || getActiveShift();
      record = {
        id: `att-${Date.now()}`,
        driverId: driver.id,
        driverName: driver.name,
        licensePlate: driver.licensePlate,
        vehicleType: driver.vehicleType,
        route: driver.route,
        date: today,
        shiftId: shift.id,
        shiftName: shift.name,
        checkInTime: shift.startTime + ':00',
        checkOutTime: timeStr,
        status: 'completed',
        endOdometer: endOdo,
        dispatchRestricted: false,
        aiAnalysis: {
          intent: 'checkout',
          summary: 'Tài xế kết thúc ca làm việc'
        },
        source: 'zalo_bot',
        rawZaloMessage: message,
        zaloSenderName: senderName,
        createdAt: new Date().toISOString()
      };
      attendanceRecords.push(record);
    } else {
      record.checkOutTime = timeStr;
      record.status = 'completed';
      record.dispatchRestricted = false;
      if (endOdo) record.endOdometer = endOdo;
      record.rawZaloMessage = (record.rawZaloMessage ? record.rawZaloMessage + ' | ' : '') + message;
    }

    const durationStr = calculateWorkDuration(record.checkInTime, timeStr);

    const reply = botConfig.checkOutTemplate
      .replace('{name}', driver.name)
      .replace('{phone}', driver.phone)
      .replace('{phoneTail}', phoneTail)
      .replace('{plate}', driver.licensePlate)
      .replace('{time}', timeStr)
      .replace('{timeIn}', record.checkInTime || 'Vào ca')
      .replace('{workHours}', durationStr)
      .replace('{duration}', durationStr);

    return { action: 'checkout', reply, record, driver, success: true };
  }

  // 5. CHECKIN COMMAND (online3389, online3389 8h-14h, on3389 8h-14h, etc.)
  if (isCheckInExplicit && !isQuestion) {
    if (!driver) {
      return {
        action: 'checkin',
        reply: `⚠️ Không tìm thấy tài xế trong hệ thống!\n👉 Cú pháp điểm danh nhanh: online[4 số đuôi SĐT] [Khung giờ làm việc] (Ví dụ: online3389 8h-14h)\nHoặc: DD [Biển số xe] (Ví dụ: DD 29C-882.14)`,
        success: false
      };
    }

    const shift = shifts.find(s => s.id === driver.defaultShiftId) || getActiveShift();
    const { status, lateMinutes } = isForTomorrow 
      ? { status: 'on_time' as const, lateMinutes: 0 }
      : calculateAttendanceStatus(shift, timeStr);
    const startOdo = extractOdometer(message);
    const workHours = extractTimeRange(message);
    const phoneTail = getPhoneTail(driver.phone);

    let existingRecord = attendanceRecords.find(r => r.driverId === driver.id && r.date === effectiveDate);

    if (existingRecord) {
      if (startOdo && !existingRecord.startOdometer) {
        existingRecord.startOdometer = startOdo;
      }
      if (workHours) {
        existingRecord.workHoursExpected = workHours;
      }
      existingRecord.dispatchRestricted = false;
      const dateLabel = isForTomorrow ? `CHO NGÀY MAI (${effectiveDate})` : `HÔM NAY (${effectiveDate})`;
      const reply = `ℹ️ [BÁC TÀI ĐÃ HOÀN THÀNH ĐIỂM DANH ${dateLabel}]\n` +
        `👤 Bác tài: ${driver.name} (Xe ${driver.licensePlate} - Mã: ${phoneTail})\n` +
        `⏰ Đã ghi nhận có mặt lúc: ${existingRecord.checkInTime} (${existingRecord.status === 'on_time' ? 'Đúng hạn ✅' : `Đi trễ ${existingRecord.lateMinutes || 0} phút`})\n` +
        `⏱️ Khung giờ làm việc: ${existingRecord.workHoursExpected || `${shift.startTime} - ${shift.endTime}`}\n` +
        `📌 Quy định: Bác tài Full-time mỗi ngày/ca CHỈ CẦN ĐIỂM DANH 1 LẦN DUY NHẤT!\n` +
        (isForTomorrow ? `🌙 Sáng mai bác tài KHÔNG CẦN điểm danh lại. Chúc bác tài ngủ ngon, vạn dặm bình an! 🚚✨` : `Chúc bác tài lái xe an toàn, vạn dặm bình an! 🚚✨`);
      return { action: 'checkin', reply, record: existingRecord, driver, success: true };
    }

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      driverId: driver.id,
      driverName: driver.name,
      licensePlate: driver.licensePlate,
      vehicleType: driver.vehicleType,
      route: driver.route,
      date: effectiveDate,
      shiftId: shift.id,
      shiftName: shift.name,
      checkInTime: timeStr,
      status: status,
      lateMinutes: lateMinutes > 0 ? lateMinutes : undefined,
      workHoursExpected: workHours || `${shift.startTime} - ${shift.endTime}`,
      dispatchRestricted: false,
      aiAnalysis: {
        intent: 'checkin',
        detectedTimeRange: workHours,
        summary: isForTomorrow 
          ? `AI nhận diện điểm danh sớm ngày mai (${effectiveDate}): Tài xế ${driver.name}, giờ làm: ${workHours || shift.name}`
          : `AI nhận diện điểm danh: Tài xế ${driver.name}, giờ làm: ${workHours || shift.name}`
      },
      note: isForTomorrow ? `Điểm danh sớm từ 21h đêm hôm trước (${today} ${timeStr}) cho ngày ${effectiveDate}` : undefined,
      startOdometer: startOdo,
      source: 'zalo_bot',
      rawZaloMessage: message,
      zaloSenderName: senderName,
      createdAt: new Date().toISOString()
    };

    attendanceRecords.push(newRecord);

    let reply = '';
    if (isForTomorrow) {
      reply = `✅ [ĐIỂM DANH SỚM THÀNH CÔNG CHO NGÀY MAI - AI DEEPSEEK ĐÃ GHI NHẬN] 🌙\n` +
        `👤 Tài xế: ${driver.name}\n` +
        `📞 SĐT: ${driver.phone} (Mã: ${phoneTail})\n` +
        `🚗 Biển số: ${driver.licensePlate} (${driver.vehicleType})\n` +
        `📅 Ngày áp dụng: ${effectiveDate} (Ngày mai)\n` +
        `⏰ Giờ điểm danh: ${timeStr} (Mở từ 21:00 đêm hôm trước - Đúng hạn ✅)\n` +
        `🎯 Ca phân công: ${shift.name}\n` +
        `⏱️ Khung giờ làm việc: ${workHours || `${shift.startTime} - ${shift.endTime}`}\n` +
        `📍 Tuyến: ${driver.route}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 LƯU Ý: Hệ thống đã chốt lịch trực sớm cho ngày mai (${effectiveDate}). Sáng mai bác tài KHÔNG CẦN điểm danh lại!\n` +
        `Chúc bác tài nghỉ ngơi tốt và sẵn sàng nhận chuyến ngày mai! 🚚✨`;
    } else if (status === 'late') {
      reply = botConfig.lateCheckInTemplate
        .replace('{lateMinutes}', `${lateMinutes}`)
        .replace('{name}', driver.name)
        .replace('{phone}', driver.phone)
        .replace('{phoneTail}', phoneTail)
        .replace('{plate}', driver.licensePlate)
        .replace('{time}', timeStr)
        .replace('{shiftStart}', shift.startTime)
        .replace('{shift}', shift.name)
        .replace('{workHours}', workHours || `${shift.startTime} - ${shift.endTime}`);
    } else {
      reply = botConfig.successCheckInTemplate
        .replace('{name}', driver.name)
        .replace('{phone}', driver.phone)
        .replace('{phoneTail}', phoneTail)
        .replace('{plate}', driver.licensePlate)
        .replace('{type}', driver.vehicleType)
        .replace('{time}', timeStr)
        .replace('{status}', 'Đúng hạn ✅')
        .replace('{shift}', shift.name)
        .replace('{workHours}', workHours || `${shift.startTime} - ${shift.endTime}`)
        .replace('{route}', driver.route);
    }

    return { action: 'checkin', reply, record: newRecord, driver, success: true };
  }


  // 6. QUESTION / DEEPSEEK AI ASSISTANT QUERY (Requires explicit prefix to prevent group spam)
  const isAITriggered = 
    rawClean.startsWith('ai') || 
    rawClean.startsWith('bot') || 
    rawClean.startsWith('hoi') ||
    rawClean.startsWith('hoidap') ||
    rawClean.startsWith('vietgo') ||
    normMsg.startsWith('ai ') ||
    normMsg.startsWith('ai:') ||
    normMsg.startsWith('ai,') ||
    normMsg.startsWith('ai oi') ||
    normMsg.startsWith('ai ơi') ||
    normMsg.startsWith('@ai') ||
    normMsg.startsWith('/ai') ||
    normMsg.startsWith('!ai') ||
    normMsg.startsWith('bot ') ||
    normMsg.startsWith('bot:') ||
    normMsg.startsWith('bot,') ||
    normMsg.startsWith('bot oi') ||
    normMsg.startsWith('bot ơi') ||
    normMsg.startsWith('@bot') ||
    normMsg.startsWith('/bot') ||
    normMsg.startsWith('!bot') ||
    normMsg.startsWith('hoi ') ||
    normMsg.startsWith('hỏi ') ||
    normMsg.startsWith('vietgo ') ||
    normMsg.startsWith('hoi ai') ||
    normMsg.startsWith('hỏi ai') ||
    normMsg.startsWith('hoi bot') ||
    normMsg.startsWith('hỏi bot');

  if (isAITriggered) {
    // Clean prefix to get actual question/chit-chat prompt
    let cleanPrompt = message
      .replace(/^(?:@ai|\/ai|!ai|ai|@bot|\/bot|!bot|bot|hỏi|hoi|vietgo)\s*[:,\-\.]?\s*/i, '')
      .replace(/^(?:ơi|oi)\s*[:,\-\.]?\s*/i, '')
      .trim();
    if (!cleanPrompt) cleanPrompt = message.trim();

    const aiAnswer = await queryDeepSeekAI(cleanPrompt, senderName);
    return {
      action: 'ai_query',
      reply: aiAnswer,
      success: true
    };
  }

  // 7. UNKNOWN / CASUAL CONVERSATION -> SILENT IGNORE TO PREVENT GROUP SPAM
  // If no attendance command and no AI trigger keyword was used, the bot does not reply.
  return {
    action: 'unknown',
    reply: '',
    success: true
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API ROUTES
  app.get('/api/status', (req: Request, res: Response) => {
    res.json({
      status: 'online',
      service: 'Zalo Driver Attendance & DeepSeek AI Server',
      version: '3.0.0',
      serverTime: new Date().toISOString(),
      today: getTodayString(),
      driversCount: drivers.length,
      deepseekConfigured: !!botConfig.deepseekApiKey,
      todayRecordsCount: attendanceRecords.filter(r => r.date === getTodayString()).length
    });
  });

  // DRIVERS
  app.get('/api/drivers', (req: Request, res: Response) => {
    res.json(drivers);
  });

  // SYNC DRIVERS FROM VIETGO API
  app.post('/api/drivers/sync-vietgo', async (req: Request, res: Response) => {
    const syncResult = await syncVietGoDrivers();
    res.json({
      success: syncResult.success,
      count: syncResult.count,
      error: syncResult.error,
      totalDrivers: drivers.length,
      lastSyncTime: lastExternalSyncTime,
      drivers
    });
  });

  // EXTERNAL API STATUS
  app.get('/api/external-api/status', (req: Request, res: Response) => {
    res.json({
      apiUrl: VIETGO_API_URL,
      tokenConfigured: !!VIETGO_API_TOKEN,
      lastSyncTime: lastExternalSyncTime,
      syncedCount: lastExternalSyncCount,
      totalDrivers: drivers.length,
      lastError: lastExternalSyncError
    });
  });

  app.post('/api/drivers', (req: Request, res: Response) => {
    const data = req.body;
    if (!data.name || !data.licensePlate) {
      return res.status(400).json({ error: 'Tên tài xế và biển số xe là bắt buộc' });
    }
    const newDriver: Driver = {
      id: `drv-${Date.now()}`,
      name: data.name,
      phone: data.phone || '',
      zaloName: data.zaloName || data.name,
      licensePlate: data.licensePlate.trim().toUpperCase(),
      vehicleType: data.vehicleType || 'Xe tải 1.25T - 2.5T',
      route: data.route || 'Nội thành',
      active: data.active !== false,
      notes: data.notes || '',
      defaultShiftId: data.defaultShiftId || 'shift-morning'
    };
    drivers.push(newDriver);
    res.json(newDriver);
  });

  app.put('/api/drivers/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const index = drivers.findIndex(d => d.id === id);
    if (index === -1) return res.status(404).json({ error: 'Không tìm thấy tài xế' });
    
    drivers[index] = { ...drivers[index], ...req.body };
    res.json(drivers[index]);
  });

  app.delete('/api/drivers/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    drivers = drivers.filter(d => d.id !== id);
    res.json({ success: true, message: 'Đã xóa tài xế thành công' });
  });

  app.post('/api/drivers/bulk-import', (req: Request, res: Response) => {
    const { driverList } = req.body;
    if (!Array.isArray(driverList)) {
      return res.status(400).json({ error: 'Danh sách không hợp lệ' });
    }
    let imported = 0;
    driverList.forEach((item, idx) => {
      if (item.name && item.licensePlate) {
        drivers.push({
          id: `drv-${Date.now()}-${idx}`,
          name: item.name,
          phone: item.phone || '',
          zaloName: item.zaloName || item.name,
          licensePlate: item.licensePlate.trim().toUpperCase(),
          vehicleType: item.vehicleType || 'Xe tải 1.25T - 2.5T',
          route: item.route || 'Nội thành',
          active: true,
          defaultShiftId: item.defaultShiftId || 'shift-morning'
        });
        imported++;
      }
    });
    res.json({ success: true, imported, total: drivers.length });
  });

  // SHIFTS
  app.get('/api/shifts', (req: Request, res: Response) => {
    res.json(shifts);
  });

  app.post('/api/shifts', (req: Request, res: Response) => {
    const data = req.body;
    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      name: data.name,
      startTime: data.startTime || '06:00',
      endTime: data.endTime || '14:00',
      graceMinutes: Number(data.graceMinutes) || 15,
      isActive: data.isActive !== false,
      description: data.description || ''
    };
    shifts.push(newShift);
    res.json(newShift);
  });

  app.put('/api/shifts/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const idx = shifts.findIndex(s => s.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy ca trực' });
    shifts[idx] = { ...shifts[idx], ...req.body };
    res.json(shifts[idx]);
  });

  // ATTENDANCE RECORDS
  app.get('/api/attendance', (req: Request, res: Response) => {
    const { date, shiftId, status, search } = req.query;
    let filtered = [...attendanceRecords];

    if (date) {
      filtered = filtered.filter(r => r.date === String(date));
    }
    if (shiftId && shiftId !== 'all') {
      filtered = filtered.filter(r => r.shiftId === String(shiftId));
    }
    if (status && status !== 'all') {
      filtered = filtered.filter(r => r.status === String(status));
    }
    if (search) {
      const q = normalizeText(String(search));
      filtered = filtered.filter(r => 
        normalizeText(r.driverName).includes(q) || 
        normalizeText(r.licensePlate).includes(q) ||
        normalizeText(r.route).includes(q) ||
        (drivers.find(d => d.id === r.driverId)?.phone.includes(q))
      );
    }

    filtered.sort((a, b) => b.checkInTime.localeCompare(a.checkInTime));
    res.json(filtered);
  });

  app.post('/api/attendance/checkin', (req: Request, res: Response) => {
    const { driverId, shiftId, status, note, startOdometer, date, checkInTime } = req.body;
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return res.status(404).json({ error: 'Không tìm thấy tài xế' });

    const targetDate = date || getTodayString();
    const targetTime = checkInTime || formatTime();
    const shift = shifts.find(s => s.id === shiftId) || shifts.find(s => s.id === driver.defaultShiftId) || getActiveShift();

    attendanceRecords = attendanceRecords.filter(r => !(r.driverId === driver.id && r.date === targetDate));

    const calc = calculateAttendanceStatus(shift, targetTime);
    const finalStatus = status || calc.status;

    const record: AttendanceRecord = {
      id: `att-${Date.now()}`,
      driverId: driver.id,
      driverName: driver.name,
      licensePlate: driver.licensePlate,
      vehicleType: driver.vehicleType,
      route: driver.route,
      date: targetDate,
      shiftId: shift.id,
      shiftName: shift.name,
      checkInTime: targetTime,
      status: finalStatus,
      lateMinutes: finalStatus === 'late' ? (calc.lateMinutes || 10) : undefined,
      startOdometer: startOdometer ? Number(startOdometer) : undefined,
      note: note || 'Điểm danh thủ công qua Dashboard',
      source: 'manual',
      createdAt: new Date().toISOString()
    };

    attendanceRecords.push(record);
    res.json(record);
  });

  app.put('/api/attendance/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const idx = attendanceRecords.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy bản ghi điểm danh' });
    attendanceRecords[idx] = { ...attendanceRecords[idx], ...req.body };
    res.json(attendanceRecords[idx]);
  });

  app.delete('/api/attendance/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    attendanceRecords = attendanceRecords.filter(r => r.id !== id);
    res.json({ success: true });
  });

  // STATS
  app.get('/api/stats', (req: Request, res: Response) => {
    const date = String(req.query.date || getTodayString());
    res.json(calculateStats(date));
  });

  // BOT CONFIG
  app.get('/api/bot-config', (req: Request, res: Response) => {
    res.json(botConfig);
  });

  app.put('/api/bot-config', (req: Request, res: Response) => {
    botConfig = { ...botConfig, ...req.body };
    res.json(botConfig);
  });

  // 06:00 AM MORNING REMINDER TRIGGER
  app.post('/api/attendance/trigger-reminder', (req: Request, res: Response) => {
    const today = getTodayString();
    const message = botConfig.morningReminderTemplate;

    const log: WebhookLog = {
      id: `log-${Date.now()}`,
      timestamp: `${today} 06:00:00`,
      senderName: '🤖 Zalo Fleet Scheduler Bot',
      groupName: 'ĐỘI XE VẬN TẢI',
      message: '[TỰ ĐỘNG PHÁT SÓNG 06:00 SÁNG]',
      parsedCommand: 'MORNING_REMINDER',
      driverFound: false,
      status: 'success',
      replySent: message
    };
    webhookLogs.push(log);

    res.json({
      success: true,
      broadcastTime: '06:00:00',
      message
    });
  });

  // 30-MINUTE OVERDUE WARNING, COMPREHENSIVE ATTENDANCE SUMMARY & DISPATCH RESTRICTION TRIGGER
  app.post('/api/attendance/trigger-overdue-warning', (req: Request, res: Response) => {
    const today = getTodayString();
    const currentTime = formatTime();
    const activeDrivers = drivers.filter(d => d.active);
    const todayRecords = attendanceRecords.filter(r => r.date === today);

    // 1. Present / Checked-in Drivers
    const checkedInDrivers = activeDrivers.filter(d => 
      todayRecords.some(r => r.driverId === d.id && (r.status === 'on_time' || r.status === 'late' || r.status === 'in_progress' || r.status === 'completed'))
    );

    // 2. Leave / Off Drivers
    const leaveDrivers = activeDrivers.filter(d => 
      todayRecords.some(r => r.driverId === d.id && r.status === 'leave')
    );

    // 3. Missing / Absent Drivers (Un-checked)
    const missingDrivers = activeDrivers.filter(d => 
      !todayRecords.some(r => r.driverId === d.id && r.status !== 'absent')
    );

    // Apply dispatch restriction to un-checked drivers in attendance records
    missingDrivers.forEach(drv => {
      let record = attendanceRecords.find(r => r.driverId === drv.id && r.date === today);
      if (!record) {
        const shift = shifts.find(s => s.id === drv.defaultShiftId) || getActiveShift();
        attendanceRecords.push({
          id: `att-overdue-${drv.id}-${Date.now()}`,
          driverId: drv.id,
          driverName: drv.name,
          licensePlate: drv.licensePlate,
          vehicleType: drv.vehicleType,
          route: drv.route,
          date: today,
          shiftId: shift.id,
          shiftName: shift.name,
          checkInTime: '--:--:--',
          status: 'absent',
          workHoursExpected: `${shift.startTime} - ${shift.endTime}`,
          dispatchRestricted: true,
          note: `Quá hạn 09:00 sáng chưa điểm danh: Bị tạm khóa nhận đơn lúc ${currentTime}`,
          source: 'zalo_bot',
          createdAt: new Date().toISOString()
        });
      } else {
        record.dispatchRestricted = true;
      }
    });

    const totalCount = activeDrivers.length;
    const checkedInCount = checkedInDrivers.length;
    const leaveCount = leaveDrivers.length;
    const missingCount = missingDrivers.length;
    const checkedInPercent = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;
    const missingPercent = totalCount > 0 ? Math.round((missingCount / totalCount) * 100) : 0;

    // Build Present List with Work Hours
    const presentDriversList = checkedInDrivers.length > 0
      ? checkedInDrivers.map((d, i) => {
          const rec = todayRecords.find(r => r.driverId === d.id && (r.status === 'on_time' || r.status === 'late' || r.status === 'in_progress' || r.status === 'completed'));
          const shift = shifts.find(s => s.id === (rec?.shiftId || d.defaultShiftId)) || getActiveShift();
          const workHours = rec?.workHoursExpected || `${shift.startTime} - ${shift.endTime} (${shift.name})`;
          const checkInStatus = rec?.status === 'on_time' ? 'Đúng hạn ✅' : `Trễ sau 09:00 (${rec?.lateMinutes || 0}p) ⚠️`;
          const timeDisplay = rec?.checkInTime && rec.checkInTime !== '--:--:--' ? rec.checkInTime : 'Đã có mặt';
          return `${i + 1}. ✅ @${d.name} (Xe ${d.licensePlate} - Mã: ${getPhoneTail(d.phone)})\n   ⏱️ Khung giờ làm việc: ${workHours}\n   ⏰ Điểm danh lúc: ${timeDisplay} (${checkInStatus})`;
        }).join('\n')
      : '   (Chưa có tài xế nào hoàn thành điểm danh)';

    // Build Leave List
    const leaveDriversList = leaveDrivers.length > 0
      ? leaveDrivers.map((d, i) => {
          const rec = todayRecords.find(r => r.driverId === d.id && r.status === 'leave');
          const reason = rec?.leaveReason || rec?.note || 'Báo nghỉ phép';
          return `${i + 1}. 📝 @${d.name} (Xe ${d.licensePlate} - Mã: ${getPhoneTail(d.phone)})\n   📋 Lý do nghỉ: ${reason}`;
        }).join('\n')
      : '';

    const leaveSection = leaveDrivers.length > 0
      ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🟡 II. DANH SÁCH BÁO NGHỈ PHÉP (${leaveCount} tài xế):\n${leaveDriversList}\n`
      : '';

    const leaveSummaryLine = leaveCount > 0
      ? `• 🟡 Báo nghỉ phép: ${leaveCount} tài xế\n`
      : '';

    // Build Missing List
    const missingDriversList = missingDrivers.length > 0
      ? missingDrivers.map((d, i) => {
          const shift = shifts.find(s => s.id === d.defaultShiftId) || getActiveShift();
          return `${i + 1}. ❌ @${d.name} (Xe ${d.licensePlate} - Mã: ${getPhoneTail(d.phone)} - SĐT: ${d.phone})\n   🎯 Phân công: ${shift.name}\n   🚨 Trạng thái: QUÁ HẠN 09:00 SÁNG - TẠM KHÓA NHẬN ĐƠN`;
        }).join('\n')
      : '   🎉 Tuyệt vời! Toàn bộ 100% tài xế hôm nay đã điểm danh đầy đủ đúng hạn trước 09:00!';

    const missingSectionNum = leaveDrivers.length > 0 ? 'III' : 'II';

    const penaltyAndUnlockGuide = missingCount > 0
      ? `🚨 CHẾ TÀI ÁP DỤNG: Đã quá hạn 09:00 sáng! Hệ thống TẠM KHÓA & HẠN CHẾ ĐIỀU PHỐI ĐƠN HÀNG đối với các tài xế chưa có mặt.\n` +
        `⚡ HƯỚNG DẪN MỞ KHÓA TỨC THÌ:\n` +
        `👉 Bác tài chưa điểm danh vui lòng nhắn ngay vào nhóm Zalo:\n` +
        `   • Cú pháp: online[4 số đuôi SĐT] (hoặc: online[4 số đuôi] [Khung giờ])\n` +
        `   • Ví dụ: online3389 (hoặc: online3389 8h-14h)\n` +
        `   • Sau khi gửi tin nhắn, hệ thống sẽ TỰ ĐỘNG GỠ KHÓA & CẤP LẠI QUYỀN NHẬN ĐƠN HÀNG!`
      : `🎉 CHÚC MỪNG: Toàn bộ đội xe hôm nay đã điểm danh đầy đủ 100%! Chúc anh em vạn dặm bình an! 🚚✨`;

    const warningMessage = botConfig.overdueWarningTemplate
      .replace('{scanTime}', currentTime)
      .replace('{today}', today)
      .replace('{totalCount}', `${totalCount}`)
      .replace('{checkedInCount}', `${checkedInCount}`)
      .replace('{checkedInPercent}', `${checkedInPercent}`)
      .replace('{leaveSummaryLine}', leaveSummaryLine)
      .replace('{missingCount}', `${missingCount}`)
      .replace('{missingPercent}', `${missingPercent}`)
      .replace('{presentDriversList}', presentDriversList)
      .replace('{leaveSection}', leaveSection)
      .replace('{missingSectionNum}', missingSectionNum)
      .replace('{missingDriversList}', missingDriversList)
      .replace('{penaltyAndUnlockGuide}', penaltyAndUnlockGuide);

    const log: WebhookLog = {
      id: `log-${Date.now()}`,
      timestamp: `${today} ${currentTime}`,
      senderName: '🤖 Zalo Bot Quản Lý Chế Tài',
      groupName: 'ĐỘI XE VẬN TẢI',
      message: `[TỰ ĐỘNG QUÉT 09:00 SÁNG - ${checkedInCount} ĐÃ ĐIỂM DANH, ${missingCount} CHƯA ĐIỂM DANH]`,
      parsedCommand: 'OVERDUE_WARNING',
      driverFound: true,
      status: 'success',
      replySent: warningMessage
    };
    webhookLogs.push(log);

    res.json({
      success: true,
      scanTime: currentTime,
      totalCount,
      checkedInCount,
      leaveCount,
      overdueCount: missingCount,
      checkedInDrivers,
      leaveDrivers,
      overdueDrivers: missingDrivers,
      message: warningMessage
    });
  });


  // WEBHOOK LOGS
  app.get('/api/zalo/logs', (req: Request, res: Response) => {
    res.json(webhookLogs.slice(-60).reverse());
  });

  // WEBHOOK RECEIVER (Called by Zalo Gateway Script)
  app.post('/api/zalo/webhook', async (req: Request, res: Response) => {
    const { message, senderName, senderId, groupId, groupName } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Missing message content' });
    }

    const result = await processZaloMessage(
      String(message), 
      String(senderName || 'Tài xế'), 
      senderId ? String(senderId) : undefined, 
      groupId ? String(groupId) : undefined,
      groupName ? String(groupName) : undefined
    );

    const newLog: WebhookLog = {
      id: `log-${Date.now()}`,
      timestamp: `${getTodayString()} ${formatTime()}`,
      senderId: senderId ? String(senderId) : undefined,
      senderName: String(senderName || 'Tài xế'),
      groupId: groupId ? String(groupId) : undefined,
      groupName: groupName ? String(groupName) : undefined,
      message: String(message),
      parsedCommand: result.action.toUpperCase(),
      matchedPlate: result.driver?.licensePlate,
      driverFound: !!result.driver,
      status: result.success ? 'success' : 'ignored',
      replySent: result.reply
    };
    webhookLogs.push(newLog);

    res.json({
      success: result.success,
      action: result.action,
      reply: result.reply,
      record: result.record,
      driver: result.driver
    });
  });

  // SIMULATE MESSAGE (For UI testing)
  app.post('/api/zalo/simulate-message', async (req: Request, res: Response) => {
    const { message, senderName, groupId, groupName } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Vui lòng nhập nội dung tin nhắn' });
    }

    const result = await processZaloMessage(
      String(message), 
      String(senderName || 'Nguyễn Văn Tuấn'),
      'sim_user_001',
      groupId || 'sim_group_01',
      groupName || 'ĐỘI XE VẬN TẢI'
    );

    const simLog: WebhookLog = {
      id: `log-${Date.now()}`,
      timestamp: `${getTodayString()} ${formatTime()}`,
      senderName: String(senderName || 'Nguyễn Văn Tuấn'),
      groupId: groupId || 'sim_group_01',
      groupName: groupName || 'ĐỘI XE VẬN TẢI (Mô phỏng)',
      message: String(message),
      parsedCommand: result.action.toUpperCase(),
      matchedPlate: result.driver?.licensePlate,
      driverFound: !!result.driver,
      status: result.success ? 'success' : 'ignored',
      replySent: result.reply
    };
    webhookLogs.push(simLog);

    res.json({
      ...result,
      stats: calculateStats()
    });
  });

  // AI DIRECT TEST API
  app.post('/api/deepseek/ask', async (req: Request, res: Response) => {
    const { question, senderName } = req.body;
    if (!question) return res.status(400).json({ error: 'Question is required' });
    const reply = await queryDeepSeekAI(question, senderName || 'Bác tài');
    res.json({ reply });
  });

  // GET BOT SCRIPT
  app.get('/api/bot-script', (req: Request, res: Response) => {
    const host = req.protocol + '://' + req.get('host');
    const script = generateBotScript(host, botConfig.webhookSecret);
    res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="zalo-bot-worker.js"');
    res.send(script);
  });

  // VITE OR STATIC
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚛 ZALO DRIVER ATTENDANCE & DEEPSEEK AI SERVER READY (PORT ${PORT})`);
    console.log(`📡 Webhook Endpoint: http://localhost:${PORT}/api/zalo/webhook`);
    console.log(`=======================================================`);

    // Fetch initial fresh drivers from VietGo API
    syncVietGoDrivers().then(res => {
      if (res.success) {
        console.log(`🚀 [VIETGO API] Khởi tạo tự động đồng bộ ${res.count} tài xế thành công!`);
      }
    }).catch(e => {
      console.warn('Initial VietGo sync warning:', e.message);
    });
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
});
