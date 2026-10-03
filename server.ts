import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
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

// Global Crash Prevention
process.on('uncaughtException', (err: any) => {
  console.error('[⚠️ Server Crash Prevented - Uncaught Exception]:', err?.message || err);
});
process.on('unhandledRejection', (reason: any) => {
  console.warn('[⚠️ Server Unhandled Rejection]:', reason?.message || reason);
});

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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Nghi Sơn',
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
    zaloName: 'Tuấn Nguyễn (Xế 36B)',
    licensePlate: '36B-3389',
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia - Phố Còng (Giao đồ ăn)',
    active: true,
    notes: 'Tài xế ví dụ mẫu (Mã đuôi: 3389, online3389 6h-14h)',
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
          zaloName: `${name} (${phoneTail ? 'Đuôi ' + phoneTail : 'Tài xế'})`,
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
    description: 'Ca tài xế chạy chuyên tuyến giao đồ ăn theo giờ hành chính'
  }
];

function getTodayString(baseDate: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(baseDate);
}

function getTomorrowString(baseDate: Date = new Date()): string {
  const vnNow = new Date(baseDate.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  vnNow.setDate(vnNow.getDate() + 1);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(vnNow);
}

function formatTime(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return formatter.format(date);
}

function getVietnamHour(date: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    hour12: false
  });
  return parseInt(formatter.format(date), 10);
}

function getVietnamMinute(date: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    minute: '2-digit',
    hour12: false
  });
  return parseInt(formatter.format(date), 10);
}

interface HotspotGuidance {
  timeStr: string;
  timeSlotName: string;
  currentHotspot: string;
  reason: string;
  nextTip: string;
}

function getCurrentHotspotGuidance(date: Date = new Date()): HotspotGuidance {
  const hour = getVietnamHour(date);
  const minute = getVietnamMinute(date);
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  if (hour >= 6 && hour < 10) {
    return {
      timeStr,
      timeSlotName: 'Sáng sớm & Điểm tâm (06:00 - 10:00)',
      currentHotspot: 'Khu vực Hải Bình và Hải Yến',
      reason: 'Bà con dậy sớm ăn sáng, các quán bún bò, phở, bánh cuốn, cafe sáng nổ đơn liên tục!',
      nextTip: 'Tầm gần trưa (từ 10h) bác nhớ tản dần về khu vực Cầu Còng đón đầu đơn cơm văn phòng nhé!'
    };
  } else if (hour >= 10 && (hour < 13 || (hour === 13 && minute < 30))) {
    return {
      timeStr,
      timeSlotName: 'Trưa cao điểm cơm trưa (10:00 - 13:30)',
      currentHotspot: 'Tìm chỗ râm mát quanh khu vực Cầu Còng',
      reason: 'Cao điểm cơm trưa văn phòng, công ty và các quán ăn quanh phố Còng đang nổ đơn ầm ầm!',
      nextTip: 'Tới đầu chiều (sau 13h30) hãy ghé Bình Minh bản xứ hoặc Hải Bình Đậu Hi săn đơn trà sữa, đồ uống.'
    };
  } else if ((hour === 13 && minute >= 30) || (hour >= 14 && hour < 16)) {
    return {
      timeStr,
      timeSlotName: 'Đầu chiều ăn vặt & Trà sữa (13:30 - 16:00)',
      currentHotspot: 'Khu vực Bình Minh bản xứ & Hải Bình Đậu Hi',
      reason: 'Khung giờ vàng của các đơn trà sữa, chè, đồ uống giải nhiệt và ăn vặt của giới trẻ, chị em!',
      nextTip: 'Tầm 16h-18h người ta tan ca về tắm rửa ít đơn hơn, ghé Gỏi Vịt Nhân Loan (Hải Bình) nổ đều nhất.'
    };
  } else if (hour >= 16 && hour < 19) {
    return {
      timeStr,
      timeSlotName: 'Tan tầm & Chiều muộn (16:00 - 19:00)',
      currentHotspot: 'Gỏi Vịt Nhân Loan (tái định cư Hải Bình) & các quán đồ nhắm/ăn sớm',
      reason: 'Giờ tan ca bà con về nghỉ ngơi, các quán đồ nhậu, vịt nổ đơn sớm rất đều tay!',
      nextTip: 'Sau 19h nhớ tản ra khu vực Phố Còng / Cầu Còng đón bão đơn ăn tối gia đình nhé!'
    };
  } else if (hour >= 19 && (hour < 21 || (hour === 21 && minute < 30))) {
    return {
      timeStr,
      timeSlotName: 'Tối cao điểm bữa ăn gia đình (19:00 - 21:30)',
      currentHotspot: 'Khu vực Phố Còng / Cầu Còng',
      reason: 'Khung giờ vàng ăn tối gia đình, phố ẩm thực ăn uống sầm uất nhất Nghi Sơn nổ đơn liên tục!',
      nextTip: 'Sau 21h30 đêm dạt dần về trục Đường đôi Hải Bình làm trùm đơn đêm.'
    };
  } else {
    return {
      timeStr,
      timeSlotName: 'Đêm muộn & Khuya (21:30 - 06:00 sáng)',
      currentHotspot: 'Đường đôi Hải Bình & các quán ăn đêm gần ngân hàng VIB, Mai Hương, Gấu Cola',
      reason: 'Trùm đơn đêm của Tĩnh Gia, phục vụ các cú đêm ăn khuya, nướng lẩu, cháo đêm!',
      nextTip: 'Sáng sớm mai từ 6h lại tản ra đón đơn bún phở tại Hải Bình, Hải Yến nhé bác tài!'
    };
  }
}

const todayStr = getTodayString();

const ATTENDANCE_FILE = path.resolve(__dirname, 'attendance_records.json');

function loadAttendanceRecords(): AttendanceRecord[] {
  try {
    if (fs.existsSync(ATTENDANCE_FILE)) {
      const data = fs.readFileSync(ATTENDANCE_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Lỗi nạp attendance_records.json:', err);
  }
  return [];
}

function saveAttendanceRecords() {
  try {
    fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(attendanceRecords, null, 2), 'utf8');
  } catch (err) {
    console.error('Lỗi ghi attendance_records.json:', err);
  }
}

const initialLoadedRecords = loadAttendanceRecords();
let attendanceRecords: AttendanceRecord[] = initialLoadedRecords.length > 0 ? initialLoadedRecords : [
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
    zaloSenderName: 'Tuấn Nguyễn (Tài xế 29E1)',
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
  botName: 'Zalo Bot Điểm Danh Tài Xế Xe Máy Giao Đồ Ăn & DeepSeek AI',
  zaloPhoneNumber: '0901234567',
  webhookSecret: 'zalo_bot_secret_key_8899',
  autoReplyEnabled: true,
  allowedGroupIds: ['ALL_GROUPS', 'group_fleet_food_delivery'],
  checkInKeywords: ['online', 'on', 'dd', 'diem danh', 'cham cong', 'co mat', 'checkin', 'bat dau'],
  checkOutKeywords: ['off', 'offline', 'ofline', 'kt', 'ket thuc', 'checkout', 've bai', 'xong ca', 'xong'],
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
  morningReminderTemplate: `⏰ [NHẮC NHỞ ĐIỂM DANH CA SÁNG TÀI XẾ GIAO ĐỒ ĂN - 06:00 SÁNG] 🛵🍱
Chào buổi sáng toàn thể anh em tài xế giao đồ ăn! ☀️🍜
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
• Tài xế Full-time chỉ cần điểm danh 1 LẦN DUY NHẤT trong ngày/ca.
• ĐÚNG 09:00 SÁNG: Bot sẽ TỰ ĐỘNG TỔNG HỢP toàn bộ danh sách và TẠM KHÓA PHÁT ĐƠN với các tài xế quá hạn!`,

  // 09:00 AM Automated Scan & Comprehensive Summary Warning
  overdueMinutes: 180, // 3 hours window from 06:00 to 09:00
  autoOverdueWarningEnabled: true,
  dispatchPenaltyEnabled: true,
  overdueWarningTemplate: `📊 [BÁO CÁO TỔNG HỢP ĐIỂM DANH TÀI XẾ GIAO ĐỒ ĂN - 09:00 SÁNG] ⚠️🛵
Kính gửi Ban Quản Lý & Đội Ngũ Tài Xế Giao Đồ Ăn VietGo,
Đã hết khung giờ điểm danh sáng (06:00 - 09:00). Hệ thống AI tự động chốt và tổng hợp danh sách (Quét lúc: {scanTime}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 TỔNG QUAN QUÂN SỐ TÀI XẾ HÔM NAY ({today}):
• Tổng quân số: {totalCount} tài xế
• 🟢 Đã vào ca: {checkedInCount} tài xế ({checkedInPercent}%)
{leaveSummaryLine}• 🔴 Chưa điểm danh (Quá hạn 09:00): {missingCount} tài xế ({missingPercent}%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 I. DANH SÁCH ĐÃ ĐIỂM DANH & KHUNG GIỜ LÀM VIỆC ({checkedInCount}/{totalCount}):
{presentDriversList}
{leaveSection}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 {missingSectionNum}. DANH SÁCH CHƯA ĐIỂM DANH ({missingCount} tài xế):
{missingDriversList}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{penaltyAndUnlockGuide}`,

  welcomeMessage: '🤖 BOT ĐIỂM DANH & TRỢ LÝ AI TÀI XẾ XE MÁY GIAO ĐỒ ĂN ĐANG HOẠT ĐỘNG 24/7 🛵🍱.\n🌙 Điểm danh ngày mai tính từ 21h đêm hôm trước trở đi (sáng mai không cần điểm lại).\nKhung giờ sáng: 06:00 - 09:00 (Khuyến khích điểm danh sớm). Đúng 09:00 tự động chốt tổng hợp!\nCú pháp siêu gọn: online[4 số đuôi] (VD: online3389). Phím tắt: gõ "trogiupvietgo"',
  successCheckInTemplate: '✅ [ĐIỂM DANH THÀNH CÔNG - AI DEEPSEEK ĐÃ GHI NHẬN] 🛵🍱\n👤 Tài xế: {name} (Mã: {phoneTail})\n🛵 Biển số xe: {plate} ({type})\n⏰ Giờ điểm danh: {time} ({status})\n🎯 Ca trực: {shift}\n⏱️ Khung giờ làm việc: {workHours}\n📍 Khu vực giao hàng: {route}\nChúc bác tài nổ nhiều đơn, vạn dặm bình an! 🍜✨',
  lateCheckInTemplate: '⚠️ [ĐIỂM DANH ĐI TRỄ {lateMinutes} PHÚT - SAU 09:00 SÁNG] 🛵\n👤 Tài xế: {name} (Mã: {phoneTail})\n🛵 Biển số: {plate}\n⏰ Giờ điểm danh: {time} (Quá hạn chốt 09:00)\n🎯 Ca: {shift}\n⏱️ Khung giờ làm việc: {workHours}\nĐã tự động gỡ khóa nhận đơn. Chú ý lần sau điểm danh đúng hạn trước 09:00!',
  checkOutTemplate: '🏁 [KẾT THÚC CA GIAO ĐỒ ĂN THÀNH CÔNG] 🛵\n👤 Tài xế: {name} (Mã: {phoneTail})\n🛵 Biển số: {plate}\n⏰ Giờ ra ca: {time}\n⏱️ Số giờ hoạt động: {workHours} (Vào ca: {timeIn} ➔ Ra ca: {time})\nCảm ơn bác tài đã hoàn thành ca giao đồ ăn hôm nay! 👏',
  leaveTemplate: '📝 [GHI NHẬN BÁO NGHỈ - AI DEEPSEEK ĐÃ BÓC TÁCH]\n👤 Tài xế: {name} (Mã: {phoneTail})\n🛵 Biển số: {plate}\n📅 Ngày: {date}\n📌 Trạng thái: Nghỉ giao hàng hôm nay\n📋 Lý do: {reason}\nĐã cập nhật dữ liệu về bộ phận điều phối.',
  
  // DeepSeek AI Config
  deepseekEnabled: true,
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekModel: 'deepseek-chat',
  deepseekBaseUrl: 'https://api.deepseek.com/chat/completions',
  companyKnowledge: `THÔNG TIN VỀ ĐỘI NGŨ TÀI XẾ & HỆ THỐNG VIETGO FOOD TĨNH GIA (NGHI SƠN):
- ĐỊA BÀN DUY NHẤT: Toàn bộ hoạt động chỉ diễn ra tại Thị xã Tĩnh Gia (Nghi Sơn), Thanh Hóa.
- Các đầu mối hỗ trợ:
  • Anh Cương: 0967.659.655 (Phụ trách mọi vấn đề về tài xế, app, sự cố).
  • Anh Sức: 0969.397.370 (Hỗ trợ giải quyết công việc đội xe).
  • Anh Linh: Quản lý cấp cao.
  • TUYỆT ĐỐI KHÔNG có bộ phận kế toán, kết toán hay phụ cấp.

- LỊCH TRÌNH VÀNG SĂN ĐƠN THEO GIỜ TẠI TĨNH GIA:
  • Sáng sớm 6h-9h: Khu vực Hải Bình, Hải Yến (dân dậy sớm ăn sáng, cafe, công nhân).
  • Trưa 10h-13h: Tìm chỗ mát quanh Cầu Còng đứng đợi (cao điểm cơm trưa văn phòng nổ ầm ầm).
  • Đầu chiều 13h-15h (13-3h): Xuống Bình Minh bản xứ và Hải Bình Đậu Hi (trà sữa, ăn vặt).
  • Tan tầm 16h-18h: Người ta tan ca về tắm rửa nên đơn ít, ghé Gỏi Vịt Nhân Loan (tái định cư Hải Bình) nổ đều nhất.
  • Tối 19h-21h: Khu vực Phố Còng / Cầu Còng nổ cực tốt (bữa tối gia đình, phố ẩm thực).
  • Tối muộn 21h đổ đi: Đường đôi Hải Bình làm trùm đơn đêm.
  • Đêm khuya 22h-23h: Quán ăn đêm gần ngân hàng VIB, Mai Hương, Gấu Cola.
- ĐIỀU HƯỚNG & TRẤN AN TÀI XẾ:
  • Nhắc nhở: Giờ cao điểm dù nắng hay mưa cũng chịu khó làm việc, không hết cao điểm đơn lại lẻ tẻ rồi tiếc!
  • Nhắc nhở: Sắp xếp khu vực cho tốt, TUYỆT ĐỐI KHÔNG TỤ TẬP BU ĐÔNG 1 CHỖ để tránh dẫm chân nhau, chia mỏng ra các điểm nóng thì ai cũng nổ đơn liên tục!

- BÍ KÍP ĐI ĐƯỜNG HẢI THANH:
  • Địa hình phức tạp dốc cát ngõ ngách, KHÔNG NÊN phụ thuộc hoàn toàn vào Google Maps từ đầu như bác Bốn.
  • Xem trước địa chỉ (trục chính, ven sông hay mặt biển), đến gần 200-500m mới bật Google Map chỉ đúng nhà.

- LƯU Ý VỀ ĐỊNH HẢI & TRƯỜNG HỢP CÁ BIỆT KHÁCH TÊN TOÀN:
  • NGUYÊN TẮC: TUYỆT ĐỐI KHÔNG QUY CHUNG CẢ ĐỊNH HẢI LÀ BOM HÀNG! Khách hàng và bà con ở Định Hải vẫn rất uy tín, đặt đơn đàng hoàng, anh em nhận đơn cứ giao bình thường.
  • Nếu tài xế chỉ hỏi chung về Định Hải (ví dụ: "Định Hải có đơn không", "ở Định Hải thế nào"): Trả lời bình thường theo khung giờ, TUYỆT ĐỐI KHÔNG tự động cảnh báo bom hàng làm tài xế hoang mang!
  • CHỈ KHI TÀI XẾ HỎI ĐÍCH DANH VỀ "ANH TOÀN" HOẶC "KHÁCH BOM HÀNG Ở ĐỊNH HẢI": Mới giải thích là ở Định Hải CHỈ CÓ DUY NHẤT khách tên TOÀN từng có tiền lệ xấu (đặt đơn rồi không nghe máy, block số tài xế giữa trời mưa bão).
  • CHỈ KHI GẶP ĐƠN CỦA ANH TOÀN Ở ĐỊNH HẢI: Mới bắt buộc gọi điện thoại xác nhận trước khi đi, gọi 3 lần không nghe máy báo ngay Anh Cương 0967.659.655 để hủy đơn hợp lệ, không tự ý chạy ra tránh chịu thiệt. Còn đơn của khách khác ở Định Hải vẫn chạy bình thường!

- HƯỚNG DẪN SỬA LỖI APP TÀI XẾ TỰ TẮT:
  • Cài đặt điện thoại > Ứng dụng > App Tài xế VietGo > Quyền ứng dụng > Chế độ cài đặt cho ứng dụng không dùng đến > TẮT TOGGLE "Quản lý ứng dụng nếu không dùng" (gạt toggle sang Tắt / màu xám như trong ảnh hướng dẫn).


- CHƯƠNG TRÌNH KIẾM TIỀN & CÀY NGỌC TỪ THÊM ĐỊA ĐIỂM TRÊN APP TÀI XẾ:
  • Mức thưởng: 1.000 ngọc / mỗi địa điểm hợp lệ được duyệt. KHÔNG GIỚI HẠN số lượng địa điểm! Anh em tranh thủ ngoài giờ cao điểm hoặc lúc vắng đơn đi cày ngọc kiếm thêm thu nhập (lụm 20-50 điểm là có ngay 20.000 - 50.000 ngọc tha hồ đổi thưởng).
  • Cách làm: Mở App Tài Xế VietGo > chọn mục "Đóng góp / Thêm địa điểm" > Bấm "Lấy vị trí hiện tại" ngay tại chỗ (không sửa tọa độ thủ công để tránh lệch) > Chụp ảnh > Gửi duyệt.
  • QUY ĐỊNH CHỤP ẢNH BẮT BUỘC: Phải chụp rõ mặt tiền, BIỂN HIỆU, SỐ NHÀ, TÊN CÔNG TY, CỬA HÀNG, SHOP, QUÁN ĂN... Tối thiểu 1 ảnh, tối đa 2 ảnh trực tiếp rõ nét.
  • CHỈ GỬI ĐỊA ĐIỂM RIÊNG BIỆT, CỤ THỂ: Tòa nhà, chung cư (VD: Chung cư A1), công ty, nhà máy, shop thời trang, tạp hóa, quán ăn, nhà hàng, quán cafe, trà sữa, số nhà cụ thể (VD: 125 Nguyễn Văn Cừ)...
  • ⛔ TUYỆT ĐỐI KHÔNG GỬI ĐỊA ĐIỂM CHUNG CHUNG: như Tổ dân phố, tên đường (đường đôi, đường tránh, quốc lộ...), khu phố, thôn xóm, ngã ba ngã tư... Những địa điểm chung chung này SẼ BỊ TỪ CHỐI DUYỆT VÀ KHÔNG ĐƯỢC TÍNH THƯỞNG!
  • MẸO TIẾT KIỆM THỜI GIAN: Trước khi thêm, mở app VietGo lên tìm kiếm trước xem địa điểm đó đã có chưa. Chưa có thì mới thêm, tránh làm trùng lặp mất công vô ích.
  • TÂM SỰ & BÍ KÍP CHÂN TÌNH CHO TÀI XẾ (PHÂN TÍCH TÌNH CẢM, THỰC TẾ):
    - Đồng cảm sâu sắc với nỗi vất vả của anh em chạy xe máy ngoài đường nắng mưa.
    - Đưa ví dụ cụ thể thực tế: Khi chạy cuốc xa (ví dụ chạy từ Còng vào Tân Trường hay các xã xa giao hàng xong), ĐỪNG BAO GIỜ ĐỂ XE KHÔNG CHẠY VỀ vừa xót tiền xăng vừa uổng công!
    - Hãy dành chút thời gian dọc đường về mở App VietGo vào mục "Đóng góp địa điểm", ghé chụp ảnh quán ăn, tiệm tạp hóa, công ty, xưởng, xí nghiệp...
    - Lượm nhẹ 30-50 địa điểm dọc đường về là bỏ túi ngay 30.000 - 50.000 ngọc (tương đương 30k - 50k) đủ tiền đổ đầy bình xăng rồi, biến chuyến đi xa thành chuyến thắng lợi rực rỡ, không lo xe chạy rỗng lỗ tiền xăng!
  • KHI TÀI XẾ HỎI VỀ KIẾM TIỀN / CÁCH KIẾM THÊM THU NHẬP / CÀY NGỌC: DeepSeek trả lời linh hoạt, hóm hỉnh, động viên tinh thần anh em và nhắc nhở đầy đủ các lưu ý cụ thể chuẩn xác như trên!

- QUY TẮC ỨNG XỬ & XỬ LÝ TÌNH HUỐNG ĐƠN HÀNG THỰC TẾ:
  • Gọi khách không nghe máy: Hướng dẫn kết bạn Zalo với khách với lời chào: "Tài xế Vietgo không liên lạc được anh hoặc chị". Nếu khách không có Zalo hoặc vẫn không được -> Gọi Anh Cương (0967.659.655) giải quyết tiếp, tuyệt đối không tự ý hủy đơn.
  • Quán hết món / báo hủy: Hướng dẫn chủ động gọi lại ngay cho khách báo đổi món tương đương, giúp khách chủ động và tăng tối đa tỷ lệ khách đặt lại đơn mới.
  • Quán làm đồ lâu khi tài xế đã tới quán: Nhắn tin trên app cho khách: "Anh/chị đợi em một chút nhé, quán đang làm đồ, có cái em giao liền qua ạ" để khách an tâm không hủy đơn hay đánh giá 1 sao.
  • Khách nhờ mang lên phòng bệnh viện: Người ở viện đi lại khó khăn, tài xế hãy chịu khó đem lên tận phòng giúp khách. TUYỆT ĐỐI KHÔNG ĐƯỢC TỎ THÁI ĐỘ khó chịu hay gắt gỏng, luôn niềm nở tận tình!
`,
  aiSystemPrompt: `Bạn là Trợ lý AI DeepSeek kiêm người bạn đồng hành của Đội ngũ Tài xế Xe máy Giao Đồ Ăn VietGo Food Tĩnh Gia (Nghi Sơn, Thanh Hóa).
Phong cách: Hóm hỉnh, vui vẻ, thân thiện, biết điều hướng và trấn an tài xế nhưng CỰC KỲ DỨT KHOÁT VỚI CÁC VI PHẠM KỶ LUẬT.
Nhiệm vụ:
1. Khi tài xế hỏi về liên hệ hỗ trợ / hotline / người giải quyết công việc:
   • Mọi vấn đề về tài xế (ứng dụng, điểm danh, đơn hàng, sự cố, thắc mắc...): Hướng dẫn liên hệ Anh Cương (SĐT: 0967.659.655) hoặc Anh Sức (SĐT: 0969.397.370). Bác tài cần hỗ trợ hãy liên hệ 2 anh trước.
   • Các vấn đề ngoài phạm vi xử lý của Anh Cương và Anh Sức: Hướng dẫn liên hệ Anh Linh (Quản lý) giải quyết.
   • TUYỆT ĐỐI KHÔNG đề cập đến kế toán, kết toán hay phụ cấp (hệ thống không có bộ phận này).
2. Khi tài xế hỏi hoặc đề cập đến việc:
   • Chạy đơn ngoài nền tảng, hủy đơn app chạy chui, đòi tiền tip, vòi thu thêm tiền của khách, nâng giá ship: CẤM TUYỆT ĐỐI 100%, cảnh báo khóa tài khoản vĩnh viễn (BANNED).
   • Chê đơn gần, ngại chạy xa, từ chối đơn: Giải thích mọi đơn đều tích lũy thưởng và uy tín. CẤM chọn lọc đơn, cảnh báo phạt khóa nhận đơn 1-3 ngày.
3. ĐỊA BÀN HOẠT ĐỘNG CỦA ĐỘI NGŨ:
   • DUY NHẤT TẠI TĨNH GIA (TX NGHI SƠN), THANH HÓA. Tuyệt đối không hoạt động ở tỉnh thành nào khác.
4. KHI TÀI XẾ HỎI Ở ĐÂU LẮM ĐƠN / ĐỨNG ĐÂU NỔ ĐƠN / SĂN ĐƠN / Ế QUÁ / THAN PHIỀN ÍT ĐƠN / KHÔNG CÓ ĐƠN / RÊN RỈ:
   • TRẢ LỜI GÓP Ý Ở GÓC ĐỘ VUI VẺ, HÀI HƯỚC, KHÔNG GẮT GỎNG:
     - Khuyên tài xế: Thời gian ngồi than phiền, rên rỉ hay lướt mạng, hãy tranh thủ thời gian mở App VietGo đi ĐÓNG GÓP ĐỊA ĐIỂM để cày ngọc kiếm thêm thu nhập (1.000 ngọc / địa điểm hợp lệ, không giới hạn).
     - Phân tích tình cảm, thực tế: Chạy xe ai cũng xót tiền xăng, lúc vắng đơn hoặc chạy đơn xa (ví dụ chạy từ Còng vào Tân Trường), đừng để xe không chạy về! Dành chút thời gian dọc đường chụp 30-50 địa điểm (quán ăn, tạp hóa, công ty, xưởng...) là kiếm thêm 30k - 50k (30.000 - 50.000 ngọc) đổ đầy bình xăng rồi, biến cuốc đi xa thành cuốc bội thu.
     - Nêu gương điển hình thực tế:
       + Bác ĐÌNH HẢI đã âm thầm đóng góp được hơn 100 ĐỊA ĐIỂM rồi (bỏ túi hơn 100k ngọc ngọt xớt)!
       + Anh CƯƠNG cũng đã đóng góp được 75 ĐỊA ĐIỂM rồi (bỏ túi 75k ngọc tha hồ đổi quà)!
       + Nhắc nhở anh em: "LÀM VIỆC ÂM THẦM KIẾM TIỀN ĐỪNG RÊN RỈ!".
     - NGUYÊN TẮC SÓNG MẠNG & BẮN ĐƠN:
       + TUYỆT ĐỐI TRÁNH TỤ TẬP BU ĐÔNG 1 CHỖ! Tụ tập đông người làm sóng di động 4G và GPS bị nghẽn, sóng yếu chập chờn thì máy chủ hệ thống SẼ KHÔNG THỂ BẮN ĐƠN ĐƯỢC tới máy tài xế!
       + NGUYÊN TẮC VÀNG: "MỖI NGƯỜI 1 VỊ TRÍ", tản đều ra các ngã đường, chia mỏng lực lượng thì sóng mạng mới căng, máy chủ quét tọa độ mới dễ bắn đơn nổ liên tục!
     - GỢI Ý ĐIỂM NÓNG THEO GIỜ TẠI TĨNH GIA:
       - Sáng 6h-9h: Hải Bình, Hải Yến.
       - Trưa 10h-13h: Kiếm chỗ mát quanh Cầu Còng đợi đơn cơm.
       - Chiều 13h-15h: Bình Minh bản xứ & Hải Bình Đậu Hi.
       - Tan tầm 16h-18h: Gỏi Vịt Nhân Loan (tái định cư Hải Bình).
       - Tối 19h-21h: Khu vực Phố Còng / Cầu Còng.
       - Tối 21h đổ đi: Đường đôi Hải Bình làm trùm đơn đêm.
       - Đêm 22h-23h: Quán ăn đêm gần ngân hàng VIB, Mai Hương, Gấu Cola.
5. KHI TÀI XẾ HỎI ĐƯỜNG ĐI HẢI THANH:
   • Địa hình ngoằn ngoèo dốc cát, không nên phụ thuộc Google Maps từ đầu như bác Bốn kẻo lạc. Xem trước 3 trục chính rồi tới gần 200-500m mới bật map.
6. LƯU Ý VỀ ĐỊNH HẢI & TRƯỜNG HỢP CÁ BIỆT KHÁCH TÊN TOÀN:
   • NGUYÊN TẮC: TUYỆT ĐỐI KHÔNG QUY CHUNG CẢ ĐỊNH HẢI LÀ BOM HÀNG! Khách hàng ở Định Hải vẫn rất uy tín, đặt đơn đàng hoàng, anh em nhận đơn cứ giao bình thường.
   • Khi tài xế hỏi chung về Định Hải (ví dụ: "Định Hải có đơn không"): Trả lời bình thường theo khung giờ, TUYỆT ĐỐI KHÔNG tự ý nhắc chuyện bom hàng!
   • CHỈ KHI TÀI XẾ HỎI ĐÍCH DANH VỀ "ANH TOÀN" HOẶC "KHÁCH BOM HÀNG Ở ĐỊNH HẢI": Mới giải thích là ở Định Hải CHỈ CÓ DUY NHẤT khách tên TOÀN từng có tiền lệ xấu (đặt đơn rồi không nghe máy, block số tài xế giữa trời mưa bão).
   • CHỈ KHI GẶP ĐƠN CỦA ANH TOÀN Ở ĐỊNH HẢI: Mới bắt buộc gọi điện thoại xác nhận trước khi đi, gọi 3 lần không nghe máy báo ngay Anh Cương 0967.659.655 để hủy đơn hợp lệ, không tự ý chạy ra tránh chịu thiệt. Còn đơn của khách khác ở Định Hải vẫn chạy bình thường!
7. KHI HỎI VÌ SAO APP TÀI XẾ ĐANG BẬT MÀ LẠI BỊ TẮT / MẤT QUYỀN / DỪNG THÔNG BÁO:
   • Giải thích nguyên nhân Android tự quản lý app không dùng. Hướng dẫn vào Cài đặt > Ứng dụng > App tài xế VietGo > Quyền ứng dụng > Chế độ cho ứng dụng không dùng > Tắt toggle "Quản lý ứng dụng nếu không dùng".
8. QUY TẮC ỨNG XỬ & XỬ LÝ TÌNH HUỐNG ĐƠN HÀNG THỰC TẾ CHO TÀI XẾ:
   • Gọi khách không nghe máy: Hướng dẫn tài xế kết bạn Zalo với khách với lời nhắn: "Tài xế Vietgo không liên lạc được anh hoặc chị". Nếu khách không có Zalo hoặc vẫn không nghe -> Gọi Anh Cương (0967.659.655) để điều phối giải quyết tiếp, tuyệt đối không tự ý hủy đơn.
   • Quán hết món / hủy món: Hướng dẫn tài xế chủ động gọi lại ngay cho khách báo đổi món tương đương, giúp khách chủ động và tăng tối đa tỷ lệ khách đặt lại đơn mới.
   • Quán làm đồ lâu khi tài xế đã tới: Hướng dẫn tài xế chủ động nhắn tin trên app cho khách: "Anh/chị đợi em chút nhé, quán đang làm đồ, có cái em giao qua liền ạ" để khách an tâm không hủy đơn hay đánh giá thấp.
   • Khách nhờ mang lên phòng bệnh viện: Nhắc tài xế người ở viện đi lại khó khăn, hãy chịu khó đem lên tận phòng giúp khách. TUYỆT ĐỐI KHÔNG ĐƯỢC TỎ THÁI ĐỘ khó chịu hay gắt gỏng, luôn niềm nở, tận tâm vì hình ảnh tài xế VietGo thân thiện!
9. Khi tài xế chém gió, hỏi chuyện phiếm, đùa vui, tâm sự: Hãy giao lưu hóm hỉnh, ấm áp, chúc "Nổ thật nhiều đơn / Giao nhanh đúng hẹn / Vạn dặm bình an"!
10. Luôn giữ tinh thần trung thực, lịch sự với khách hàng, lái xe an toàn và bảo vệ uy tín VietGo Food.
- DỮ LIỆU THỜI TIẾT TẠI NGHI SƠN (TĨNH GIA), THANH HÓA:
  • Vị trí địa lý: Thị xã Nghi Sơn, Thanh Hóa (tọa độ 19.45° B, 105.78° Đ).
  • KHI TÀI XẾ HỎI VỀ THỜI TIẾT (hôm nay thế nào, trời mưa không, có mưa không, nhiệt độ, bão gió...):
    - Trả lời chi tiết, chính xác tình hình thời tiết Nghi Sơn (nhiệt độ, độ ẩm, sức gió, mưa hay nắng).
    - ĐỘNG VIÊN VÀ DẶN DÒ TÌNH CẢM DÀNH CHO TÀI XẾ XE MÁY GIAO ĐỒ ĂN:
      + Nếu MƯA / CÓ KHẢ NĂNG MƯA: Nhắc anh em mặc áo mưa bộ, bọc điện thoại chống nước, che đậy kỹ túi/thùng giữ nhiệt để đồ ăn (bún phở, cơm, trà sữa) của khách luôn nóng hổi giòn rụm không ngấm nước; đi chậm giảm tốc độ ở các khúc cua dốc cát (Hải Thanh, Hải Bình) tránh trơn trượt. Động viên: Trời mưa nhu cầu khách gọi đồ ăn tăng vọt, đơn nổ rất nhiều nhưng an toàn là số 1!
      + Nếu NẮNG NÓNG GẮT: Nhắc anh em mặc áo khoác chống nắng, đeo khẩu trang kính râm, mang theo bình nước lọc to bổ sung nước liên tục; lúc chờ đơn tấp vào bóng râm gầm Cầu Còng hoặc quán nước mát nghỉ ngơi, giữ gìn sức khỏe dẻo dai chạy đơn!
      + Nếu TRỜI MÁT MẺ / ĐẸP TRỜI: Chúc anh em khí thế hừng hực, đường khô ráo tay lái lụa nổ đơn mỏi tay!

- NGUYÊN TẮC NHẬN DIỆN VÀ PHẢN HỒI KHI TÀI XẾ GỌI BOT:
  • Tài xế có thể gọi Bot bằng nhiều cách: "Bot ơi", "Bót ơi", "bót", "alo bot", "ê bot", hoặc đặt chữ bot ở cuối câu ("giờ phải làm sao bot", "làm thế nào bot", "sao thế bot", "rồi bót"...).
  • Trong MỌI TÌNH HUỐNG tài xế kêu gọi Bot, AI đều phải nhận diện ngay là đang gọi mình, trả lời thân thiện, nhiệt tình, đúng trọng tâm vấn đề tài xế đang hỏi.
  • Nếu tài xế chỉ gọi vu vơ "bot ơi", "bót ơi", "alo bot", "rồi bót": Chào hỏi vui vẻ, thông báo em luôn túc trực 24/7 và hỏi bác tài cần hỗ trợ sự cố, săn đơn, cày ngọc hay tra cứu gì.
  • Nếu tài xế hỏi "giờ phải làm sao bot" mà chưa rõ tình huống: Hướng dẫn ngay các tình huống thường gặp (khách không nghe máy, quán hết món, quán làm lâu, bệnh viện, ít đơn, app tắt) kèm hotline Anh Cương (0967.659.655) và Anh Sức (0969.397.370).
Quy tắc: Viết hoa từ ngữ để nhấn mạnh, dùng emoji sinh động, không dùng markdown **chữ đậm** vì Zalo không hỗ trợ.`,};


let webhookLogs: WebhookLog[] = [
  {
    id: 'log-01',
    timestamp: `${todayStr} 05:52:10`,
    senderId: 'zalo_user_tuan29c',
    senderName: 'Tuấn Nguyễn (Xế 29C)',
    groupId: 'group_fleet_hanoi',
    groupName: 'ĐỘI TÀI XẾ VIETGO TĨNH GIA',
    message: 'online3389 6h-14h',
    parsedCommand: 'CHECKIN',
    matchedPlate: '29C-882.14',
    driverFound: true,
    status: 'success',
    replySent: '✅ [ĐIỂM DANH THÀNH CÔNG] Tài xế Nguyễn Văn Tuấn (Mã: 3389) lúc 05:52:10'
  }
];

// In-memory Real-time GPS Locations for active fleet
let driverLocations: DriverLocation[] = [
  {
    driverId: 'drv-vg-03',
    driverName: 'Hà Trọng Huy',
    phone: '0395987438',
    tailCode: '7438',
    licensePlate: '36B-7438',
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Phố Còng / Cầu Còng',
    lat: 19.4589,
    lng: 105.7865,
    speed: 35,
    heading: 90,
    accuracy: 3,
    battery: 95,
    status: 'running',
    address: 'Đường Lê Thế Long, Phố Còng, Tĩnh Gia',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  },
  {
    driverId: 'drv-vg-04',
    driverName: 'Hồ Văn Bốn',
    phone: '0397177363',
    tailCode: '7363',
    licensePlate: '36B-7363',
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Hải Bình - Hải Yến',
    lat: 19.4682,
    lng: 105.7950,
    speed: 28,
    heading: 45,
    accuracy: 4,
    battery: 88,
    status: 'running',
    address: 'Đường đôi Hải Bình, Tĩnh Gia',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  },
  {
    driverId: 'drv-vg-07',
    driverName: 'Lê Đình Hải',
    phone: '0364306634',
    tailCode: '6634',
    licensePlate: '36B-6634',
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Bình Minh - Đậu Hi',
    lat: 19.4450,
    lng: 105.7780,
    speed: 0,
    heading: 180,
    accuracy: 3,
    battery: 82,
    status: 'stopped',
    address: 'Ngã tư Bình Minh, Tĩnh Gia (Đang đợi đơn)',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  },
  {
    driverId: 'drv-vg-18',
    driverName: 'Nguyễn Việt Cương',
    phone: '0867420360',
    tailCode: '0360',
    licensePlate: '36AB-87870',
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu tái định cư Hải Bình (Gỏi Vịt Nhân Loan)',
    lat: 19.4620,
    lng: 105.7910,
    speed: 30,
    heading: 270,
    accuracy: 3,
    battery: 90,
    status: 'running',
    address: 'Gần quán Gỏi Vịt Nhân Loan, Hải Bình, Tĩnh Gia',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  },
  {
    driverId: 'drv-vg-22',
    driverName: 'Vũ Đình Hiếu',
    phone: '0354168805',
    tailCode: '8805',
    licensePlate: '36B-8805',
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Tuyến đường Còng - Tân Trường',
    lat: 19.4200,
    lng: 105.7500,
    speed: 40,
    heading: 210,
    accuracy: 4,
    battery: 78,
    status: 'running',
    address: 'Khu công nghiệp Tân Trường, Tĩnh Gia (Giao đồ ăn)',
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
  const fourDigitMatches = rawMessage.match(/\b\d{4}\b/) || rawMessage.match(/(?:checkin|checkout|check\s*in|check\s*out|offline|ofline|online|on|off|kt|nghi|phep|dd)\s*(\d{4})/i) || rawMessage.match(/(\d{4})\s*(?:checkin|checkout|check\s*in|check\s*out|offline|ofline|online|on|off|kt|nghi)/i);
  if (fourDigitMatches) {
    const code = fourDigitMatches[1] || fourDigitMatches[0];
    for (const drv of drivers) {
      const tail = getPhoneTail(drv.phone);
      if (tail === code) return drv;
      if (cleanPlate(drv.licensePlate).includes(code)) return drv;
    }
  }

  // 2. Check concatenated "onlineXXXX" where XXXX is digits
  const inlineMatch = rawClean.match(/(?:checkin|checkout|offline|ofline|online|on|off|kt|nghi|phep|dd)(\d{4})/i);
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


// Tracking map for drivers awaiting hours report: driverId -> { recordId, date, askedAt }
const pendingHoursDrivers = new Map<string, { recordId: string; date: string; askedAt: number }>();

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

// Extract Working Time Range (e.g. "8h-14h", "8h - 14h", "08:00 - 14:00", "8h den 14h", "8 tiếng", "ca 8h", "làm full")
function extractTimeRange(rawMsg: string): string | undefined {
  if (!rawMsg) return undefined;
  
  // Xóa các tiền tố lệnh checkin/online và mã số để tránh nhầm lẫn (ví dụ "online3389" hoặc "online 3389")
  let msg = rawMsg
    .replace(/(?:checkin|check\s*in|online|on|dd)\s*\d{3,4}/gi, '')
    .replace(/\b\d{3,4}\s*(?:checkin|check\s*in|online|on|dd)\b/gi, '')
    .trim();

  // 1. Dạng khoảng giờ: "8h-14h", "8h - 14h", "8h30-14h30", "08:00 - 14:00", "8-14h", "từ 8h đến 14h", "8h tới 14h", "8h den 14h"
  const rangePattern = /(?:từ|tu)?\s*(\d{1,2}(?:[h:]\d{1,2}|h)?)\s*(?:-|–|den|đến|tới|toi|to)\s*(\d{1,2}(?:[h:]\d{1,2}|h)?)/i;
  const rangeMatch = msg.match(rangePattern);
  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    let start = rangeMatch[1].trim();
    let end = rangeMatch[2].trim();
    if (!start.includes('h') && !start.includes(':')) start += 'h';
    if (!end.includes('h') && !end.includes(':')) end += 'h';
    return `${start} - ${end}`;
  }

  // 2. Dạng số tiếng / số giờ: "8 tiếng", "ca 8 tiếng", "6 tieng", "8h", "ca 8h", "8 giờ", "4 tiếng"
  const durationPattern = /(?:ca\s*)?(\d{1,2})\s*(?:tiếng|tieng|giờ|gio|h)\b/i;
  const durMatch = msg.match(durationPattern);
  if (durMatch && durMatch[1]) {
    const hours = parseInt(durMatch[1], 10);
    if (hours >= 1 && hours <= 24) {
      return `Ca ${hours} tiếng`;
    }
  }

  // 3. Dạng tên ca: "ca sáng", "ca chiều", "ca tối", "ca đêm", "cả ngày", "làm full", "full time", "part time"
  const norm = msg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd');
  if (norm.includes('ca sang')) return 'Ca Sáng (06:00 - 14:00)';
  if (norm.includes('ca chieu')) return 'Ca Chiều (14:00 - 22:00)';
  if (norm.includes('ca toi')) return 'Ca Tối (18:00 - 22:00)';
  if (norm.includes('ca dem')) return 'Ca Đêm (22:00 - 06:00)';
  if (norm.includes('lam full') || norm.includes('ca ngay') || norm.includes('full time') || norm.includes('fulltime')) return 'Cả Ngày (Full-time 08:00 - 22:00)';
  if (norm.includes('part time') || norm.includes('parttime')) return 'Part-time';

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
  let currentHour: number;
  let currentMin: number;
  if (timeStr) {
    const parts = timeStr.split(':').map(Number);
    currentHour = parts[0] || 0;
    currentMin = parts[1] || 0;
  } else {
    currentHour = getVietnamHour();
    currentMin = getVietnamMinute();
  }
  const currentTotalMins = currentHour * 60 + currentMin;

  if (currentTotalMins >= 300 && currentTotalMins < 840) {
    return shifts.find(s => s.id === 'shift-morning') || shifts[0];
  } else if (currentTotalMins >= 840 && currentTotalMins < 1320) {
    return shifts.find(s => s.id === 'shift-afternoon') || shifts[1];
  } else {
    return shifts.find(s => s.id === 'shift-night') || shifts[2];
  }
}


// Extract shift start time from working hours string (e.g. "14-22h30", "14h - 22h30", "08:00 - 14:00")
function extractShiftStartTime(hoursStr?: string): string | undefined {
  if (!hoursStr) return undefined;
  
  // 1. Match range: <start> [- đến tới] <end>
  // e.g. '14-22h30', '14h - 22h30', '14h30-22h30', '08:00 - 14:00', '14h den 22h'
  const rangeMatch = hoursStr.match(/(?:từ|tu)?\s*(\d{1,2})(?::(\d{1,2})|h(\d{1,2})?|h)?\s*(?:-|–|đến|den|tới|toi)\s*(\d{1,2})/i);
  if (rangeMatch) {
    const h = parseInt(rangeMatch[1], 10);
    const m = parseInt(rangeMatch[2] || rangeMatch[3] || '0', 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    }
  }

  // 2. Check named shift formats:
  const norm = hoursStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (norm.includes('ca sang')) return '06:00:00';
  if (norm.includes('ca chieu')) return '14:00:00';
  if (norm.includes('ca toi')) return '18:00:00';
  if (norm.includes('ca dem')) return '22:00:00';
  if (norm.includes('ca hanh chinh')) return '08:00:00';
  if (norm.includes('ca ngay') || norm.includes('full')) return '08:00:00';

  return undefined;
}

// Map registered work hours to appropriate shift
function getShiftFromWorkHours(workHours?: string, fallbackShift?: Shift): Shift {
  if (workHours) {
    const startTime = extractShiftStartTime(workHours);
    if (startTime) {
      const [h] = startTime.split(':').map(Number);
      if (h >= 5 && h < 11) return shifts.find(s => s.id === 'shift-morning') || shifts[0];
      if (h >= 11 && h < 21) return shifts.find(s => s.id === 'shift-afternoon') || shifts[1];
      if (h >= 21 || h < 5) return shifts.find(s => s.id === 'shift-night') || shifts[2];
    }
  }
  return fallbackShift || getActiveShift();
}

// Estimate shift based on checkout time (e.g. 21:40 is Afternoon-Evening shift, NOT Morning shift!)
function getEstimatedShiftForCheckOut(timeStr: string): Shift {
  const [h, m] = timeStr.split(':').map(Number);
  const totalM = (h || 0) * 60 + (m || 0);

  // Morning shift: 06:00 - 14:00 (Checkouts between 11:00 and 16:00)
  if (totalM >= 660 && totalM < 960) {
    return shifts.find(s => s.id === 'shift-morning') || shifts[0];
  }

  // Administrative shift: 08:00 - 17:00 (Checkouts between 16:00 and 18:30)
  if (totalM >= 960 && totalM < 1110) {
    return shifts.find(s => s.id === 'shift-flexible') || shifts[3] || shifts[0];
  }

  // Afternoon - Evening shift: 14:00 - 22:00 (Checkouts between 18:30 and 01:30 đêm)
  if (totalM >= 1110 || totalM < 90) {
    return shifts.find(s => s.id === 'shift-afternoon') || shifts[1];
  }

  // Night shift: 22:00 - 06:00 (Checkouts between 01:30 and 08:00)
  if (totalM >= 90 && totalM < 480) {
    return shifts.find(s => s.id === 'shift-night') || shifts[2];
  }

  return getActiveShift(timeStr);
}

// Determine effective shift start time ("Đầu giờ vào ca")
function getEffectiveStartTime(
  record?: AttendanceRecord, 
  checkOutTimeStr?: string, 
  customMessage?: string
): { startTime: string; display: string } {
  // 1. Check if the checkout message itself has hours, e.g. "off7438 14-22h30" or "off7438 14h"
  if (customMessage) {
    const parsedRange = extractTimeRange(customMessage);
    const parsedStart = extractShiftStartTime(parsedRange || customMessage);
    if (parsedStart) {
      return { startTime: parsedStart, display: parsedStart };
    }
  }

  // 2. Check if the attendance record has a registered working hours range (e.g. "14h - 22h30", "14-22h30")
  if (record?.workHoursExpected) {
    const scheduledStart = extractShiftStartTime(record.workHoursExpected);
    if (scheduledStart) {
      return { startTime: scheduledStart, display: scheduledStart };
    }
  }

  // 3. Check if checkInTime is recorded on the record
  if (record?.checkInTime && record.checkInTime !== '--:--:--') {
    if (checkOutTimeStr) {
      const inParts = record.checkInTime.split(':').map(Number);
      const outParts = checkOutTimeStr.split(':').map(Number);
      const inM = (inParts[0] || 0) * 60 + (inParts[1] || 0);
      const outM = (outParts[0] || 0) * 60 + (outParts[1] || 0);
      let diffM = outM - inM;
      if (diffM < 0) diffM += 24 * 60;

      // If diff is greater than 14 hours (e.g. checked in at 6h sáng but checking out at 21h40 đêm),
      // and not explicitly working full-day 24h, this driver actually worked the afternoon/evening shift!
      if (diffM > 14 * 60 && !record.workHoursExpected?.toLowerCase().includes('full')) {
        const estimatedShift = getEstimatedShiftForCheckOut(checkOutTimeStr);
        return { 
          startTime: estimatedShift.startTime + ':00', 
          display: estimatedShift.startTime + ':00' 
        };
      }
    }
    return { startTime: record.checkInTime, display: record.checkInTime };
  }

  // 4. Fallback if no record exists: infer from checkout time
  const estimatedShift = getEstimatedShiftForCheckOut(checkOutTimeStr || '14:00:00');
  return { 
    startTime: estimatedShift.startTime + ':00', 
    display: estimatedShift.startTime + ':00' 
  };
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

// formatTime is declared globally with Asia/Ho_Chi_Minh timezone

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

// =========================================================================
// REAL-TIME WEATHER SERVICE CHO THỊ XÃ NGHI SƠN (TĨNH GIA), THANH HÓA
// Nguồn API: Open-Meteo Vệ Tinh (Tọa độ Nghi Sơn: 19.45° B, 105.78° Đ)
// =========================================================================
interface NghiSonWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  rain: number;
  precipitation: number;
  weatherCode: number;
  conditionText: string;
  conditionIcon: string;
  isDay: boolean;
  isRain: boolean;
  isHot: boolean;
  isStorm: boolean;
  tempMax: number;
  tempMin: number;
  rainProbabilityMax: number;
  updatedAt: Date;
  updatedTimeStr: string;
}

let cachedWeather: NghiSonWeather | null = null;
let lastWeatherFetchTime = 0;
const WEATHER_CACHE_MS = 10 * 60 * 1000; // Cache 10 phút

function getWmoWeatherInfo(code: number, isDay: number = 1): { text: string; icon: string; isRain: boolean; isHot: boolean; isStorm: boolean } {
  switch (code) {
    case 0:
      return { text: isDay ? 'Trời quang đãng, nắng đẹp' : 'Trời quang mây, đêm tạnh ráo', icon: isDay ? '☀️' : '🌙', isRain: false, isHot: false, isStorm: false };
    case 1:
    case 2:
      return { text: 'Trời có mây nhẹ, râm mát dễ chịu', icon: isDay ? '⛅' : '☁️', isRain: false, isHot: false, isStorm: false };
    case 3:
      return { text: 'Trời nhiều mây u ám', icon: '☁️', isRain: false, isHot: false, isStorm: false };
    case 45:
    case 48:
      return { text: 'Có sương mù, tầm nhìn hạn chế', icon: '🌫️', isRain: false, isHot: false, isStorm: false };
    case 51:
    case 53:
    case 55:
      return { text: 'Mưa phùn hạt nhỏ / Mưa bay lất phất', icon: '🌦️', isRain: true, isHot: false, isStorm: false };
    case 61:
      return { text: 'Mưa rào nhẹ', icon: '🌧️', isRain: true, isHot: false, isStorm: false };
    case 63:
    case 65:
      return { text: 'Mưa vừa đến mưa to rải rác', icon: '🌧️🌧️', isRain: true, isHot: false, isStorm: false };
    case 80:
    case 81:
    case 82:
      return { text: 'Mưa rào nặng hạt từng cơn', icon: '⛈️', isRain: true, isHot: false, isStorm: false };
    case 95:
    case 96:
    case 99:
      return { text: 'Dông sét, mưa to kèm gió giật mạnh', icon: '⚡⛈️', isRain: true, isHot: false, isStorm: true };
    default:
      return { text: 'Thời tiết thay đổi', icon: '🌤️', isRain: false, isHot: false, isStorm: false };
  }
}

async function fetchNghiSonWeather(): Promise<NghiSonWeather> {
  const now = Date.now();
  if (cachedWeather && (now - lastWeatherFetchTime) < WEATHER_CACHE_MS) {
    return cachedWeather;
  }

  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=19.45&longitude=105.78&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FBangkok',
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: any = await res.json();
    const curr = data.current || {};
    const daily = data.daily || {};

    const code = Number(curr.weather_code ?? 0);
    const temp = Number(curr.temperature_2m ?? 28);
    const apparentTemp = Number(curr.apparent_temperature ?? temp);
    const humidity = Number(curr.relative_humidity_2m ?? 80);
    const windSpeed = Number(curr.wind_speed_10m ?? 5);
    const rain = Number(curr.rain ?? 0);
    const precipitation = Number(curr.precipitation ?? 0);
    const isDay = curr.is_day === 1;

    const wmo = getWmoWeatherInfo(code, isDay ? 1 : 0);

    const tempMax = Array.isArray(daily.temperature_2m_max) && daily.temperature_2m_max.length > 0 ? Number(daily.temperature_2m_max[0]) : temp;
    const tempMin = Array.isArray(daily.temperature_2m_min) && daily.temperature_2m_min.length > 0 ? Number(daily.temperature_2m_min[0]) : temp;
    const rainProb = Array.isArray(daily.precipitation_probability_max) && daily.precipitation_probability_max.length > 0 ? Number(daily.precipitation_probability_max[0]) : 0;

    const nowVn = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const pad = (n: number) => String(n).padStart(2, '0');
    const updatedTimeStr = `${pad(nowVn.getHours())}:${pad(nowVn.getMinutes())} (Hôm nay ${pad(nowVn.getDate())}/${pad(nowVn.getMonth() + 1)})`;

    cachedWeather = {
      temperature: temp,
      apparentTemperature: apparentTemp,
      humidity,
      windSpeed,
      rain,
      precipitation,
      weatherCode: code,
      conditionText: wmo.text,
      conditionIcon: wmo.icon,
      isDay,
      isRain: wmo.isRain || rain > 0 || precipitation > 0,
      isHot: temp >= 33 || apparentTemp >= 36,
      isStorm: wmo.isStorm,
      tempMax,
      tempMin,
      rainProbabilityMax: rainProb,
      updatedAt: new Date(),
      updatedTimeStr
    };
    lastWeatherFetchTime = now;
    return cachedWeather;
  } catch (err: any) {
    console.warn('⚠️ Lỗi lấy dữ liệu thời tiết Nghi Sơn từ Open-Meteo:', err.message);
    if (cachedWeather) return cachedWeather;

    const nowVn = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      temperature: 28,
      apparentTemperature: 31,
      humidity: 85,
      windSpeed: 8,
      rain: 0,
      precipitation: 0,
      weatherCode: 2,
      conditionText: 'Trời nhiều mây râm mát',
      conditionIcon: '⛅',
      isDay: true,
      isRain: false,
      isHot: false,
      isStorm: false,
      tempMax: 31,
      tempMin: 25,
      rainProbabilityMax: 30,
      updatedAt: new Date(),
      updatedTimeStr: `${pad(nowVn.getHours())}:${pad(nowVn.getMinutes())} hôm nay`
    };
  }
}

function formatNghiSonWeatherResponse(w: NghiSonWeather, senderName: string): string {
  let advice = '';

  if (w.isStorm) {
    advice = `🚨 CẢNH BÁO BÃO DÔNG & GIÓ GIẬT MẠNH:\n` +
      `• Khu vực Nghi Sơn đang có dông sét nguy hiểm! Bác tài tạm thời tìm chỗ trú an toàn kiên cố, TUYỆT ĐỐI KHÔNG đứng dưới gốc cây to, cột điện hay biển quảng cáo.\n` +
      `• Tắt máy xe khi mưa xối xả ngập đường, an toàn tính mạng của bác tài luôn là số 1!`;
  } else if (w.isRain) {
    advice = `🌧️ DẶN DÒ TÌNH CẢM KHI TRỜI MƯA CHO ANH EM TÀI XẾ XE MÁY:\n` +
      `• Bác tài nhớ mặc sẵn ÁO MƯA BỘ và bọc chống nước kín cho điện thoại ngay nhé!\n` +
      `• 🥡 ĐẶC BIỆT LƯU Ý: Bọc kỹ và kéo kín túi giữ nhiệt/thùng hàng để đồ ăn của khách (cơm, bún phở, chè, trà sữa...) luôn nóng hổi, giòn rụm không bị dính nước mưa!\n` +
      `• 🛵 Đường ướt trơn trượt, nhất là các khúc cua hay đoạn dốc cát ở Hải Thanh, Hải Bình: Giảm ga, đi chậm, phanh sớm bằng cả hai phanh và giữ khoảng cách an toàn với xe trước.\n` +
      `• Trời mưa khách ngại ra đường nên ĐƠN NỔ RẤT NHIỀU, nhưng an toàn của bác tài vẫn là trên hết, đừng vì vội mà phóng nhanh vượt ẩu nhé!`;
  } else if (w.isHot) {
    advice = `☀️ DẶN DÒ TÌNH CẢM KHI TRỜI NẮNG GẮT CHO BÁC TÀI:\n` +
      `• Nhiệt độ ngoài đường đang rất cao (${w.temperature}°C, cảm nhận thực tế ${w.apparentTemperature}°C)! Bác tài nhớ mặc áo khoác chống nắng, đeo khẩu trang, kính râm để bảo vệ mắt và da.\n` +
      `• 🥤 Luôn thủ sẵn bình nước to trên xe, nhớ uống từng ngụm nhỏ liên tục bổ sung nước và khoáng chất, chớ để khát khô cổ họng.\n` +
      `• 🌳 Lúc vắng đơn nhớ ghé bóng râm dưới tán cây, gầm Cầu Còng hoặc quán nước mát nghỉ ngơi, đừng phơi nắng lâu kẻo say nắng say nóng! Chúc các bác dẻo dai, giữ sức cày đơn!`;
  } else {
    advice = `🌤️ LỜI CHÚC & ĐỘNG VIÊN ANH EM TÀI XẾ:\n` +
      `• Thời tiết Nghi Sơn đang cực kỳ chiều lòng người, mát mẻ khô ráo (${w.temperature}°C)! ${w.conditionIcon}\n` +
      `• Không sợ mưa ướt cũng chẳng ngại nắng nôi, anh em xốc lại tinh thần, phân tán mỗi người 1 vị trí để hứng bão đơn nổ liên tục nhé!\n` +
      `• Bác nào chạy cuốc xa vào Tân Trường đừng quên tranh thủ lượm vài địa điểm kiếm ngọc đổ xăng nha! Chúc toàn đội vạn dặm bình an, tiền vô đầy túi! 🛵💨🔥`;
  }

  return `🌤️ [TÌNH HÌNH & DỰ BÁO THỜI TIẾT TẠI NGHI SƠN - TĨNH GIA] 🛵✨\n\n` +
    `Chào bác tài ${senderName}! Đây là dữ liệu thời tiết trực tiếp từ trạm vệ tinh tại Thị xã Nghi Sơn:\n\n` +
    `📍 Khu vực: Thị xã Nghi Sơn (Tĩnh Gia), Thanh Hóa\n` +
    `⏰ Cập nhật lúc: ${w.updatedTimeStr}\n` +
    `🌡️ Nhiệt độ hiện tại: ${w.temperature}°C (Cảm nhận thực tế: ${w.apparentTemperature}°C)\n` +
    `☁️ Trạng thái: ${w.conditionText} ${w.conditionIcon}\n` +
    `💧 Độ ẩm không khí: ${w.humidity}%\n` +
    `💨 Sức gió: ${w.windSpeed} km/h\n` +
    `🌧️ Lượng mưa đo được: ${w.precipitation} mm\n` +
    `📊 Dự báo trong ngày: Thấp nhất ${w.tempMin}°C - Cao nhất ${w.tempMax}°C | Khả năng có mưa: ${w.rainProbabilityMax}%\n\n` +
    `❤️ ${advice}`;
}

function getWeatherShortTip(w: NghiSonWeather): string {
  if (w.isStorm) {
    return `⚡ Nghi Sơn đang có dông sét (${w.temperature}°C)! Bác tài cẩn thận tìm chỗ trú an toàn nhé!`;
  } else if (w.isRain) {
    return `🌧️ Nghi Sơn đang có mưa (${w.temperature}°C). Bác tài nhớ mặc áo mưa, che kỹ thùng đồ ăn và đi cẩn thận trơn trượt nhé!`;
  } else if (w.isHot) {
    return `☀️ Nghi Sơn trời nắng gắt (${w.temperature}°C). Bác tài nhớ uống nhiều nước, mặc áo chống nắng và giữ gìn sức khỏe nhé!`;
  } else {
    return `🌤️ Nghi Sơn thời tiết mát mẻ (${w.temperature}°C, ${w.conditionText}). Chúc bác tài vạn dặm bình an, nổ đơn mỏi tay!`;
  }
}

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

  // 1. Search for a specific driver's phone number or details (CHỈ KHI HỎI ĐÍCH DANH SĐT / LÁI XE / BIỂN SỐ)
  const isDriverInquiry = (
    normQ.includes('sdt') || 
    normQ.includes('so dien thoai') || 
    normQ.includes('dien thoai') || 
    normQ.includes('thong tin tai xe') || 
    normQ.includes('bac tai') || 
    normQ.includes('tai xe') || 
    normQ.includes('bien so') || 
    normQ.includes('xe so') || 
    normQ.startsWith('tim ') ||
    normQ.startsWith('tra cuu ')
  );

  if (isDriverInquiry) {
    const wordsQ = normQ.split(/\s+/);
    let matchedDriver: Driver | null = null;

    // Priority 1: Full name match
    for (const drv of drivers) {
      const normName = normalizeText(drv.name);
      if (normQ.includes(normName)) { matchedDriver = drv; break; }
    }

    // Priority 2: License plate or phone tail match
    if (!matchedDriver) {
      for (const drv of drivers) {
        const plateClean = cleanPlate(drv.licensePlate).toLowerCase();
        const phoneTail = getPhoneTail(drv.phone);
        if ((plateClean.length >= 4 && normQ.includes(plateClean)) || (phoneTail.length === 4 && wordsQ.includes(phoneTail))) {
          matchedDriver = drv; break;
        }
      }
    }

    // Priority 3: Title + Name (e.g. "anh tuan", "bac bon", "chu tinh")
    if (!matchedDriver) {
      const honorifics = ['anh', 'bac', 'chu', 'em', 'ong', 'ba'];
      for (const drv of drivers) {
        const normName = normalizeText(drv.name);
        const nameWords = normName.split(' ');
        const lastName = nameWords[nameWords.length - 1];
        for (const h of honorifics) {
          if (normQ.includes(h + ' ' + lastName)) {
            matchedDriver = drv; break;
          }
        }
        if (matchedDriver) break;
      }
    }

    // Priority 4: Last name match (excluding ambiguous honorific prefixes)
    if (!matchedDriver) {
      for (const drv of drivers) {
        const normName = normalizeText(drv.name);
        const nameWords = normName.split(' ');
        const lastName = nameWords[nameWords.length - 1];
        if ((lastName === 'anh' || lastName === 'bac') && !normQ.includes('mai dac anh') && !normQ.includes('trung anh') && !normQ.includes('anh anh')) {
          continue;
        }
        if (wordsQ.includes(lastName)) {
          matchedDriver = drv; break;
        }
      }
    }

    if (matchedDriver) {
      const drv = matchedDriver;
      const phoneTail = getPhoneTail(drv.phone);
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
      `❌ Hệ thống CẤM TUYỆT ĐỐI 100% tài xế rủ rê khách hủy đơn trên ứng dụng để chạy ngoài thu tiền mặt riêng, hoặc tắt app giả vờ xe hỏng để nhận đơn chui!\n\n` +
      `⚠️ CHẾ TÀI XỬ LÝ VI PHẠM TẬP TRUNG:\n` +
      `1. KHÓA VĨNH VIỄN TÀI KHOẢN (BANNED) trên toàn hệ thống VietGo.\n` +
      `2. Thu hồi toàn bộ tiền thưởng nổ đơn, tiền phụ cấp ca và thu nhập đã tích lũy.\n` +
      `3. Đưa tên vào DANH SÁCH ĐEN (Blacklist) ngành vận tải & xử lý vi phạm quy định.\n\n` +
      `Anh em tài xế hãy giữ uy tín, trung thực để được hỗ trợ đầy đủ quyền lợi, bảo hiểm và thu nhập lâu dài! 🛵🛡️`;
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
      `Anh em tài xế giữ thái độ lịch sự, chuyên nghiệp để nhận được đánh giá 5 sao nhé! 🛵⭐`;
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
      `📌 LƯU Ý DÀNH CHO TÀI XẾ:\n` +
      `• Mọi đơn hàng (dù gần vài trăm mét hay xa vài km) đều đã được tính cước phí chuẩn và CỘNG DỒN VÀO THƯỞNG MỐC NỔ ĐƠN trong ca.\n` +
      `• Chạy đơn gần giúp tăng tốc số lượng đơn nổ để cán mốc thưởng ca cực nhanh!\n\n` +
      `⚠️ CHẾ TÀI XỬ LÝ:\n` +
      `• Tỷ lệ nhận đơn (Acceptance Rate) giảm -> Bị giảm thứ tự ưu tiên phát đơn VIP/đơn cao điểm.\n` +
      `• Cố tình hủy đơn phân công hoặc chọn lọc đơn -> TẠM KHÓA QUYỀN NHẬN ĐƠN từ 1 - 3 ngày!\n\n` +
      `Anh em tài xế vui vẻ tiếp nhận mọi đơn hàng để tối đa hóa thu nhập thưởng ca nhé! 🛵🔥`;
  }

  // 2. Check for hotline / điều phối / hỗ trợ / Cương / Sức / Linh
  if (normQ.includes('dieu phoi') || normQ.includes('hotline') || normQ.includes('ho tro') || normQ.includes('lien he') || normQ.includes('cuong') || normQ.includes('suc') || normQ.includes('linh') || normQ.includes('su co')) {
    return `🤖 [ĐẦU MỐI HỖ TRỢ TÀI XẾ VIETGO FOOD TĨNH GIA]:\n` +
      `📞 Anh Cương: 0967.659.655 (Chuyên hỗ trợ MỌI VẤN ĐỀ về tài xế, app, sự cố)\n` +
      `📞 Anh Sức: 0969.397.370 (Hỗ trợ giải quyết công việc đội xe)\n` +
      `👉 Khi cần hỗ trợ, bác tài vui lòng liên hệ trước với Anh Cương hoặc Anh Sức.\n` +
      `👑 Các vấn đề ngoài phạm vi của Cương & Sức: Liên hệ Anh Linh giải quyết.\n` +
      `❌ TUYỆT ĐỐI KHÔNG có bộ phận kế toán, kết toán hay phụ cấp.`;
  }

  // 2.1. Tình huống: Gọi khách không nghe máy
  if (
    (normQ.includes('khach') && (normQ.includes('khong nghe') || normQ.includes('khong bat may') || normQ.includes('khong lien lac') || normQ.includes('khong goi duoc') || normQ.includes('thue bao') || normQ.includes('khong nghe may'))) ||
    normQ.includes('goi khach khong nghe') ||
    normQ.includes('goi khong nghe') ||
    normQ.includes('khach khong nghe may') ||
    normQ.includes('khong lien lac duoc')
  ) {
    return `📞 [BÍ KÍP XỬ LÝ: GỌI KHÁCH KHÔNG NGHE MÁY] 🛵\n\n` +
      `Bác tài thực hiện đúng quy trình 2 bước chuẩn này nhé:\n\n` +
      `1️⃣ BƯỚC 1: KẾT BẠN ZALO VỚI KHÁCH\n` +
      `• Lấy số điện thoại của khách trên đơn hàng tra cứu Zalo và gửi lời mời kết bạn.\n` +
      `• Gửi kèm lời chào chuẩn: "Tài xế Vietgo không liên lạc được anh hoặc chị".\n` +
      `• Đa số khách hàng thấy tin nhắn Zalo sẽ phản hồi lại ngay hoặc gọi lại cho bác tài!\n\n` +
      `2️⃣ BƯỚC 2: NẾU KHÁCH KHÔNG CÓ ZALO HOẶC VẪN KHÔNG PHẢN HỒI\n` +
      `• Bác tài hãy GỌI NGAY CHO ANH CƯƠNG: 0967.659.655 để điều phối giải quyết bước tiếp theo.\n` +
      `• ❌ TUYỆT ĐỐI KHÔNG tự ý hủy đơn, tự ý mang về hoặc bỏ đi khi chưa báo điều phối!\n\n` +
      `Chúc bác tài liên lạc thông suốt, giao đơn suôn sẻ! 👍✨`;
  }

  // 2.2. Tình huống: Quán hết món / đổi món / quán hủy đơn
  if (
    (normQ.includes('quan') && (normQ.includes('het mon') || normQ.includes('het do') || normQ.includes('doi mon') || normQ.includes('huy don'))) ||
    normQ.includes('het mon') ||
    normQ.includes('quan bao het') ||
    normQ.includes('het do an')
  ) {
    return `🍲 [BÍ KÍP XỬ LÝ: QUÁN HẾT MÓN / BẢO HỦY ĐƠN] 🛵\n\n` +
      `Khi quán báo hết món, bác tài bình tĩnh xử lý cực kỳ chuyên nghiệp như sau:\n\n` +
      `1️⃣ CHỦ ĐỘNG GỌI LẠI NGAY CHO KHÁCH:\n` +
      `• Gọi điện thoại thông báo lịch sự cho khách: "Dạ em chào anh/chị, em là tài xế VietGo. Hiện món... của quán vừa hết, quán có món... tương đương rất ngon, anh/chị có muốn đổi sang món này luôn để quán làm kịp giao không ạ?".\n\n` +
      `2️⃣ GIÚP KHÁCH CHỦ ĐỘNG & TĂNG TỶ LỆ ĐẶT LẠI:\n` +
      `• Việc bác tài gọi báo sớm giúp khách hàng nắm bắt được tình hình, cảm thấy được phục vụ chu đáo.\n` +
      `• Dù khách đổi món ngay hay hủy đơn cũ để đặt lại món mới, tỷ lệ khách đặt lại đơn là CỰC KỲ CAO, vừa giữ chân khách cho quán và app, vừa giúp anh em có đơn chạy tiếp!\n\n` +
      `3️⃣ NẾU KHÁCH KHÔNG ĐỒNG Ý ĐỔI MÓN:\n` +
      `• Hướng dẫn khách thao tác hủy trên app hoặc báo ngay Anh Cương (0967.659.655) hỗ trợ hủy đúng quy trình hệ thống nhé!`;
  }

  // 2.3. Tình huống: Quán làm đồ lâu / làm chậm / chờ đồ
  if (
    (normQ.includes('quan') && (normQ.includes('lam lau') || normQ.includes('lam cham') || normQ.includes('doi lau') || normQ.includes('cho lau') || normQ.includes('lau qua'))) ||
    normQ.includes('lam do lau') ||
    normQ.includes('doi mon lau') ||
    normQ.includes('quan lam cham')
  ) {
    return `⏳ [BÍ KÍP XỬ LÝ: QUÁN LÀM ĐỒ LÂU KHI ĐÃ ĐẾN NƠI] 🛵\n\n` +
      `Đến quán mà thấy quán đang đông hoặc làm đồ lâu, bác tài làm ngay mẹo nhỏ mà có võ này nhé:\n\n` +
      `📲 NHẮN TIN TRỰC TIẾP TRÊN APP CHO KHÁCH:\n` +
      `• Mở mục tin nhắn trên app VietGo gửi cho khách một câu ngắn gọn, ấm áp:\n` +
      `👉 "Dạ em đã có mặt tại quán rồi ạ, quán đang chuẩn bị món anh/chị đợi em một chút nhé. Vừa có đồ xong một cái là em lập tức phi giao liền qua cho anh/chị ạ!"\n\n` +
      `🎯 TÁC DỤNG CỰC LỚN:\n` +
      `• Khách biết tài xế đã tới quán nên cực kỳ yên tâm, không gọi hối thúc, không hủy đơn giữa chừng.\n` +
      `• Tránh hoàn toàn việc bị khách bực bội đánh giá 1 sao vì nghĩ tài xế lề mề.\n` +
      `• Thể hiện sự chuyên nghiệp và chu đáo 100 điểm của bác tài VietGo! 👍✨`;
  }

  // 2.4. Tình huống: Mang lên phòng bệnh viện
  if (
    normQ.includes('benh vien') ||
    normQ.includes('mang len phong') ||
    normQ.includes('dem len phong') ||
    normQ.includes('mang len tang') ||
    normQ.includes('dem len tang') ||
    (normQ.includes('khach nho') && (normQ.includes('phong') || normQ.includes('tang') || normQ.includes('vien')))
  ) {
    return `🏥 [QUY TẮC ỨNG XỬ: KHÁCH NHỜ MANG ĐỒ LÊN PHÒNG BỆNH VIỆN] 🛵\n\n` +
      `Khi giao đơn ở Bệnh viện mà khách nhờ mang lên tận phòng, bác tài lưu ý điều này:\n\n` +
      `❤️ THẤU HIỂU & CHỊU KHÓ HỖ TRỢ KHÁCH:\n` +
      `• Khách hàng ở bệnh viện đa phần là bệnh nhân hoặc người nhà đang chăm sóc người ốm mệt mỏi, việc đi lại xuống cổng rất khó khăn và bất tiện.\n` +
      `• Bác tài hãy CHỊU KHÓ gửi xe đem đồ lên tận phòng giúp khách nhé!\n\n` +
      `⛔ TUYỆT ĐỐI KHÔNG ĐƯỢC TỎ THÁI ĐỘ:\n` +
      `• CẤM TUYỆT ĐỐI việc nhăn nhó, càu nhàu, gắt gỏng hay phàn nàn với khách.\n` +
      `• Luôn giữ nụ cười và thái độ niềm nở, tận tâm: "Dạ vâng cô/bác/anh/chị đợi em mang lên tận phòng ạ!".\n\n` +
      `🌟 GIÁ TRỊ NHẬN LẠI:\n` +
      `• Khách hàng ở bệnh viện cực kỳ cảm kích sự nhiệt tình của bác tài, hay thưởng thêm tiền tip và đánh giá 5 sao.\n` +
      `• Xây dựng hình ảnh đẹp, văn minh và ấm áp tình người của Đội ngũ Tài xế VietGo Food Tĩnh Gia! 🛵💖`;
  }

  // 2.5. Hải Thanh
  if (normQ.includes('hai thanh') || normQ.includes('duong hai thanh')) {
    return `🗺️ [BÍ KÍP ĐI ĐƯỜNG HẢI THANH - TRÁNH LẠC ĐƯỜNG CỦA BÁC TÀI VIETGO] 🛵\n\n` +
      `📌 ĐẶC ĐIỂM ĐỊA HÌNH HẢI THANH:\n` +
      `Khu vực Hải Thanh ngõ ngách ngoằn ngoèo, nhiều dốc cát ven biển, nhiều đường cụt. KHÔNG NÊN phụ thuộc hoàn toàn vào Google Map từ đầu như bác Bốn kẻo bị dẫn đi lòng vòng nhé!\n\n` +
      `✅ KINH NGHIỆM THỰC CHIẾN:\n` +
      `1️⃣ Xem trước địa chỉ trên đơn: Thuộc trục đường chính, đường ven sông hay mặt biển.\n` +
      `2️⃣ Chạy xe theo trục chính đến gần khu vực (còn khoảng 200 - 500m) mới bật Google Map để chỉ đúng ngõ và số nhà.\n` +
      `3️⃣ Nếu ngõ quá hẹp hoặc dốc cát: Chủ động gọi trước cho khách hướng dẫn điểm hẹn thuận tiện nhất.\n\n` +
      `Chúc bác tài giao hàng nhanh chóng, an toàn và thuận buồm xuôi gió! 🌊📦✨`;
  }

  // 2.8. Kiếm tiền / Kiếm ngọc / Thêm địa điểm trên App Tài xế VietGo
  if (
    normQ.includes('kiem tien') ||
    normQ.includes('kiem them') ||
    normQ.includes('kiem ngoc') ||
    normQ.includes('them dia diem') ||
    normQ.includes('dong gop dia diem') ||
    normQ.includes('chup anh dia diem') ||
    normQ.includes('lay ngoc') ||
    normQ.includes('cay ngoc') ||
    normQ.includes('xe khong ve') ||
    normQ.includes('xe chay rong') ||
    (normQ.includes('tan truong') && (normQ.includes('ve') || normQ.includes('cong') || normQ.includes('ngoc') || normQ.includes('xang'))) ||
    (normQ.includes('dia diem') && (normQ.includes('1k') || normQ.includes('1000') || normQ.includes('thuong') || normQ.includes('duyet') || normQ.includes('them') || normQ.includes('ngoc') || normQ.includes('xang'))) ||
    (normQ.includes('vang don') && (normQ.includes('ngoc') || normQ.includes('lam gi') || normQ.includes('kiem tien') || normQ.includes('dia diem'))) ||
    (normQ.includes('ranh') && (normQ.includes('lam gi') || normQ.includes('kiem tien')))
  ) {
    return `💰 [CƠ HỘI KIẾM TIỀN & CÀY NGỌC KHÔNG GIỚI HẠN TRÊN APP VIETGO] 📍✨\n\n` +
      `Chào bác tài! Ngoài chạy đơn, VietGo đang có chương trình ĐÓNG GÓP ĐỊA ĐIỂM nhận thưởng cực ngon, anh em tranh thủ lúc vắng đơn cày ngọc nhé! 🛵💨\n\n` +
      `🎁 MỨC THƯỞNG HẤP DẪN:\n` +
      `• Thưởng: 1.000 ngọc / mỗi địa điểm hợp lệ được duyệt.\n` +
      `• KHÔNG GIỚI HẠN số lượng địa điểm! Lụm 20 - 50 địa điểm là có ngay 20.000 - 50.000 ngọc tha hồ đổi thưởng đổ xăng trà đá nhẹ nhàng! 💎💵\n\n` +
      `❤️ TÂM SỰ CHÂN TÌNH & KINH NGHIỆM CHẠY XE THỰC TẾ:\n` +
      `• Chạy xe đường dài ai cũng xót tiền xăng. Ví dụ bác tài nhận cuốc giao từ Còng vào Tân Trường hay các xã xa, giao xong TUYỆT ĐỐI ĐỪNG ĐỂ XE KHÔNG CHẠY VỀ vừa tốn tiền xăng vừa uổng công!\n` +
      `• Hãy dành chút thời gian quý báu dọc đường về, mở ngay App VietGo ghé chụp ảnh vài quán ăn, tiệm tạp hóa, công ty, nhà máy, xí nghiệp, xưởng...\n` +
      `• Lượm nhẹ 30 - 50 địa điểm dọc đường về là bỏ túi ngay 30k - 50k (30.000 - 50.000 ngọc) đủ tiền đổ đầy bình xăng rồi! Vừa không lo xe chạy rỗng lỗ tiền xăng, vừa biến chuyến đi xa thành chuyến thắng lợi rực rỡ! ⛽🛵💵\n\n` +
      `📱 CÁCH THỰC HIỆN TRÊN APP TÀI XẾ:\n` +
      `1️⃣ Mở App Tài Xế VietGo ➔ Chọn mục "Đóng góp địa điểm".\n` +
      `2️⃣ Đang đứng trực tiếp tại quán/shop bấm "Lấy vị trí hiện tại" để hệ thống tự điền tọa độ chuẩn (hạn chế sửa tay kẻo lệch vị trí).\n` +
      `3️⃣ Chụp ảnh và gửi duyệt.\n\n` +
      `⚠️ CÁC LƯU Ý SỐNG CÒN ĐỂ ĐƯỢC DUYỆT 100% (ĐỌC KỸ ĐỠ MẤT CÔNG):\n` +
      `📸 1. QUY ĐỊNH CHỤP ẢNH:\n` +
      `• Chụp ít nhất 1 ảnh (tối đa 2 ảnh) rõ nét mặt tiền, BIỂN HIỆU, SỐ NHÀ, TÊN CÔNG TY, CỬA HÀNG, QUÁN ĂN.\n\n` +
      `🏢 2. CHỈ GỬI ĐỊA ĐIỂM RIÊNG BIỆT & CỤ THỂ:\n` +
      `• ĐƯỢC DUYỆT: Tòa nhà, chung cư (VD: Chung cư A1), công ty, nhà máy, shop thời trang, tiệm tạp hóa, quán ăn, quán cafe, trà sữa (VD: Trà sữa Mây, Hải sản 36...), số nhà cụ thể (VD: 125 Nguyễn Văn Cừ)...\n` +
      `• ❌ TUYỆT ĐỐI KHÔNG GỬI ĐỊA ĐIỂM CHUNG CHUNG: như Tổ dân phố, tên đường (đường đôi, đường tránh...), khu dân cư, thôn xóm, ngã ba ngã tư... Những địa điểm chung chung này SẼ BỊ TỪ CHỐI DUYỆT VÀ KHÔNG ĐƯỢC TÍNH THƯỞNG!\n\n` +
      `💡 3. MẸO TIẾT KIỆM THỜI GIAN:\n` +
      `• Trước khi thêm, mở app VietGo lên tìm kiếm xem quán/địa điểm đó đã có chưa. Chưa có thì mới thêm để tránh trùng lặp mất công nhé bác tài!\n\n` +
      `Chúc anh em tài xế vừa nổ đơn rực rỡ, vừa cày ngọc rủng rỉnh tiền tiêu! 🏆🛵💎`;
  }

  // 2.5.5. Góp ý vui vẻ cho tài xế hay than phiền ít đơn, không có đơn, than ế, rên rỉ
  const isOrderComplaintQuery = (
    normQ.includes('it don') ||
    normQ.includes('ít đơn') ||
    normQ.includes('khong co don') ||
    normQ.includes('không có đơn') ||
    normQ.includes('ko co don') ||
    normQ.includes('k co don') ||
    normQ.includes('chua co don') ||
    normQ.includes('chưa có đơn') ||
    normQ.includes('e qua') ||
    normQ.includes('ế quá') ||
    normQ.includes('e don') ||
    normQ.includes('ế đơn') ||
    normQ.includes('e am') ||
    normQ.includes('ế ẩm') ||
    normQ.includes('e moc mom') ||
    normQ.includes('than e') ||
    normQ.includes('than ế') ||
    normQ.includes('doi kem') ||
    normQ.includes('đói kém') ||
    normQ.includes('doi meo') ||
    normQ.includes('đói meo') ||
    normQ.includes('sao it don') ||
    normQ.includes('sao ít đơn') ||
    normQ.includes('sao khong co don') ||
    normQ.includes('sao không có đơn') ||
    normQ.includes('sao k co don') ||
    normQ.includes('sao ko co don') ||
    normQ.includes('chang co don') ||
    normQ.includes('chẳng có đơn') ||
    normQ.includes('cha co don') ||
    normQ.includes('chả có đơn') ||
    normQ.includes('chua no don') ||
    normQ.includes('chưa nổ đơn') ||
    normQ.includes('khong no don') ||
    normQ.includes('không nổ đơn') ||
    normQ.includes('chua thay no') ||
    normQ.includes('chưa thấy nổ') ||
    normQ.includes('khong no') ||
    normQ.includes('không nổ') ||
    normQ.includes('ko no') ||
    normQ.includes('ngoi choi') ||
    normQ.includes('ngồi chơi') ||
    normQ.includes('ngoi hong') ||
    normQ.includes('ngồi hóng') ||
    normQ.includes('ngoi bu') ||
    normQ.includes('ngồi bu') ||
    normQ.includes('khong co cuoc') ||
    normQ.includes('không có cuốc') ||
    normQ.includes('it cuoc') ||
    normQ.includes('ít cuốc') ||
    normQ.includes('chan qua khong co') ||
    normQ.includes('chán quá không có') ||
    (normQ.includes('chan qua') && normQ.includes('don')) ||
    normQ.includes('ren it don') ||
    normQ.includes('rên ít đơn') ||
    normQ.includes('ren ri') ||
    normQ.includes('rên rỉ') ||
    normQ.includes('than phien') ||
    normQ.includes('than phiền') ||
    normQ.includes('doi don') ||
    normQ.includes('đói đơn') ||
    normQ.includes('khong ban don') ||
    normQ.includes('không bắn đơn') ||
    normQ.includes('ko ban don') ||
    normQ.includes('sao khong ban') ||
    normQ.includes('chac doi') ||
    normQ.includes('chắc đói') ||
    normQ.includes('vang don') ||
    normQ.includes('vắng đơn') ||
    (normQ.includes('don') && (normQ.includes('it') || normQ.includes('cham') || normQ.includes('e') || normQ.includes('khong co') || normQ.includes('ko co') || normQ.includes('vang')))
  );

  if (isOrderComplaintQuery) {
    const hotspot = getCurrentHotspotGuidance(new Date());

    return `🛵 [GÓP Ý VUI VẺ TỪ BOT: THAY VÌ RÊN ÍT ĐƠN - HÃY ĐI CÀY NGỌC KIẾM TIỀN!] 💎✨\n\n` +
      `Ối dồi ôi bác tài ơi! Lại ca bài ca "ế đơn" với "chẳng có đơn nào" rồi! 😂\n` +
      `Ngồi một chỗ than phiền rên rỉ thì đơn cũng có tự rụng vào tay đâu, nghe bot góp ý chân tình mà cực kỳ vui vẻ này nha:\n\n` +
      `1️⃣ THỜI GIAN NGỒI THAN PHIỀN ➔ HÃY ĐI CÀY NGỌC BỎ TÚI 30K-50K ĐỔ XĂNG (1.000 NGỌC/ĐIỂM):\n` +
      `• Bot tâm sự chân tình với các bác: Đi chạy xe ai chẳng muốn nổ đơn liên tục, nhưng lúc vắng đơn hoặc lỡ nhận cuốc xa (ví dụ chạy từ Còng vào Tân Trường giao hàng xong), ĐỪNG BAO GIỜ ĐỂ XE KHÔNG CHẠY VỀ vừa xót tiền xăng vừa uổng công!\n` +
      `• Hãy dành chút thời gian quý báu dọc đường về, mở ngay App VietGo vào mục "Đóng góp địa điểm", ghé chụp ảnh các quán ăn, tiệm tạp hóa, công ty, nhà xưởng...\n` +
      `• Mỗi địa điểm hợp lệ được duyệt là nhận ngay 1.000 NGỌC (1k ngọc), KHÔNG GIỚI HẠN số lượng! Lượm nhẹ 30 - 50 địa điểm dọc đường về là bỏ túi ngay 30k - 50k (30.000 - 50.000 ngọc) đủ tiền đổ đầy bình xăng vi vu cả ngày, biến chuyến đi xa thành chuyến thắng lợi rực rỡ!\n` +
      `• Nhìn gương thực tế anh em đi trước:\n` +
      `  + Bác ĐÌNH HẢI âm thầm cày cuốc đã góp hơn 100 ĐỊA ĐIỂM (bỏ túi hơn 100.000 ngọc ngọt xớt)!\n` +
      `  + Anh CƯƠNG cũng đã đóng góp được 75 ĐỊA ĐIỂM rồi (rủng rỉnh 75.000 ngọc tha hồ đổi quà)!\n` +
      `👉 Người ta LÀM VIỆC ÂM THẦM, tiền vào túi rủng rỉnh chứ ĐỪNG CÓ NGỒI RÊN nha các bác! 👏💎\n\n` +
      `2️⃣ ⛔ BÍ MẬT KỸ THUẬT: TRÁNH TỤ TẬP BU ĐÔNG - SÓNG YẾU KHÔNG BẮN ĐƠN ĐƯỢC!\n` +
      `• Anh em hay có thói quen hễ vắng đơn là kéo nhau lại một quán nước ngồi bu đông tán gẫu.\n` +
      `• Khi tụ tập bu đông 1 chỗ: SÓNG 4G VÀ GPS BỊ NGHẼN, SÓNG YẾU CHẬP CHỜN thì hệ thống máy chủ KHÔNG THỂ BẮN ĐƠN tới máy các bác được!\n` +
      `• 🎯 NGUYÊN TẮC VÀNG: MỖI NGƯỜI 1 VỊ TRÍ! Tản đều ra các ngã đường, chia mỏng lực lượng thì sóng mạng mới căng đét, máy chủ quét định vị mới bắn đơn chuẩn xác, ai cũng nổ đơn đều tay!\n\n` +
      `3️⃣ 📍 ĐIỂM NÓNG GỢI Ý HIỆN TẠI (LÚC ${hotspot.timeStr}):\n` +
      `• Khung giờ: ${hotspot.timeSlotName}\n` +
      `👉 Bác tài hãy tản ngay về: ${hotspot.currentHotspot}!\n` +
      `• Tình hình đơn: ${hotspot.reason}\n` +
      `💡 Mẹo đón đầu: ${hotspot.nextTip}\n\n` +
      `4️⃣ ⚠️ LƯU Ý SỐNG CÒN: TỶ LỆ NHẬN ĐƠN & KHÔNG THẢ TRÔI HẾT HẠN!\n` +
      `• Khi hệ thống phát đơn: TUYỆT ĐỐI KHÔNG TỪ CHỐI NHIỀU hoặc THẢ TRÔI ĐƠN HẾT HẠN!\n` +
      `• Thả trôi hoặc từ chối đơn sẽ làm TỤT TỶ LỆ NHẬN ĐƠN (Acceptance Rate) thê thảm. Thuật toán hệ thống sẽ ĐÁNH GIÁ THẤP VÀ HẠN CHẾ BẮN ĐƠN TIẾP THEO cho máy của bác tài! Hãy cố gắng nhận và giao đơn để giữ tài khoản uy tín cao, đơn nổ liên tục!\n\n` +
      `5️⃣ 🛑 KHÔNG HOẠT ĐỘNG / KHÔNG CHẠY ĐƯỢC ➔ TẮT APP & CHECKOUT OFF NGAY LẬP TỨC!\n` +
      `• Nếu bận việc riêng, xe cộ sự cố, mệt mỏi hoặc không chạy tiếp được nữa: BẮT BUỘC PHẢI TẮT APP và nhắn lệnh "off[mã]" (hoặc checkout) NGAY LẬP TỨC!\n` +
      `• TUYỆT ĐỐI KHÔNG treo app bật online rồi bỏ đi làm việc khác để đơn trôi làm lỡ dở đơn của khách và quán.\n` +
      `• Việc tắt app & checkout giúp hệ thống nhận diện chính xác để ĐIỀU PHỐI ĐƠN HÀNG CHO CÁC TÀI XẾ KHÁC ĐANG SẴN SÀNG CHẠY!\n\n` +
      `Đứng dậy xách xe lên, mỗi người một vị trí hoặc đi lụm vài địa điểm kiếm ngọc ngay thôi các bác ơi! Chúc anh em nổ đơn ầm ầm, tiền về đầy túi! 🛵💨🔥`;
  }

  // 2.5.6. Gợi ý điểm nóng săn đơn theo giờ thực tế (Khi tài xế hỏi đứng đâu / ở đâu nhiều đơn)
  const isHotspotInquiry = (
    normQ.includes('dung dau') ||
    normQ.includes('đứng đâu') ||
    normQ.includes('o dau nhieu don') ||
    normQ.includes('ở đâu nhiều đơn') ||
    normQ.includes('o dau lam don') ||
    normQ.includes('ở đâu lắm đơn') ||
    normQ.includes('san don') ||
    normQ.includes('săn đơn') ||
    normQ.includes('diem nong') ||
    normQ.includes('điểm nóng') ||
    normQ.includes('khu nao nhieu don') ||
    normQ.includes('khu nào nhiều đơn') ||
    normQ.includes('dung o dau') ||
    normQ.includes('đứng ở đâu') ||
    normQ.includes('gio nay dung dau') ||
    normQ.includes('giờ này đứng đâu') ||
    normQ.includes('bay gio dung dau') ||
    normQ.includes('bây giờ đứng đâu') ||
    normQ.includes('cho nao nhieu don') ||
    normQ.includes('chỗ nào nhiều đơn')
  );

  if (isHotspotInquiry) {
    const hotspot = getCurrentHotspotGuidance(new Date());

    return `🛵 [GỢI Ý ĐIỂM NÓNG NỔ ĐƠN THEO GIỜ THỰC TẾ TẠI TĨNH GIA] 📍✨\n\n` +
      `Chào bác tài! Lúc này là ${hotspot.timeStr} (${hotspot.timeSlotName}), nghe bot chỉ điểm nóng chuẩn đét để đón đơn nhé:\n\n` +
      `1️⃣ 📍 ĐIỂM NÓNG NÊN ĐỨNG NGAY LÚC NÀY:\n` +
      `👉 Bác hãy tản ngay về: ${hotspot.currentHotspot}!\n` +
      `• Tình hình đơn: ${hotspot.reason}\n` +
      `💡 Mẹo đón đầu: ${hotspot.nextTip}\n\n` +
      `2️⃣ ⛔ NGUYÊN TẮC VÀNG: MỖI NGƯỜI 1 VỊ TRÍ - TRÁNH BU ĐÔNG SÓNG YẾU!\n` +
      `• Tản đều ra các ngã đường, tuyệt đối KHÔNG tụ tập bu đông 1 quán nước kẻo nghẽn sóng 4G/GPS máy chủ không bắn đơn được!\n\n` +
      `3️⃣ ⚠️ LƯU Ý SỐNG CÒN: TỶ LỆ NHẬN ĐƠN & KHÔNG THẢ TRÔI HẾT HẠN!\n` +
      `• Đơn bắn tới nhớ nhận và giao nhiệt tình, TUYỆT ĐỐI KHÔNG từ chối nhiều hay thả trôi hết hạn kẻo tụt tỷ lệ nhận đơn (Acceptance Rate) và bị thuật toán hạn chế phát đơn tiếp theo!\n\n` +
      `4️⃣ 🛑 KHÔNG HOẠT ĐỘNG / NGHỈ CHẠY ➔ TẮT APP & CHECKOUT OFF NGAY LẬP TỨC!\n` +
      `• Nếu không chạy được nữa, bác tài hãy tắt app và gõ "off[mã]" ngay để hệ thống kịp điều phối đơn cho anh em khác!\n\n` +
      `5️⃣ 💎 TÂM SỰ THỰC TẾ: ĐỪNG ĐỂ XE CHẠY RỖNG - CÀY NGỌC BỎ TÚI 30K-50K ĐỔ XĂNG! 🛵⛽\n` +
      `• Bot chia sẻ chân tình: Lúc vắng đơn, hoặc khi nhận đơn xa (ví dụ chạy từ Còng vào Tân Trường giao xong), ĐỪNG BAO GIỜ ĐỂ XE KHÔNG CHẠY VỀ vừa tốn tiền xăng vừa uổng công!\n` +
      `• Hãy dành chút thời gian dọc đường về, mở App VietGo vào mục "Đóng góp địa điểm", ghé chụp ảnh vài quán ăn, tiệm tạp hóa, xưởng, công ty, nhà máy...\n` +
      `• Mỗi điểm hợp lệ duyệt là có ngay 1.000 ngọc (1k/điểm). Lượm nhẹ 30 - 50 địa điểm dọc đường về là bác tài bỏ túi 30.000 - 50.000 ngọc (30k - 50k) đổ đầy bình xăng rồi! Vừa ấm túi, vừa không lo xe chạy rỗng lỗ tiền xăng!\n\n` +
      `Chúc bác tài chọn đúng điểm nóng, nổ đơn liên tục mỏi tay! 🛵💨🔥`;
  }
  // 2.6. Cảnh báo khách Toàn Định Hải
  const isToanDinhHai = (
    (normQ.includes('toan') && (normQ.includes('dinh hai') || normQ.includes('dinh'))) ||
    normQ.includes('anh toan') ||
    normQ.includes('a toan') ||
    (normQ.includes('dinh hai') && (normQ.includes('bom') || normQ.includes('bung') || normQ.includes('lua') || normQ.includes('canh bao') || normQ.includes('luu y'))) ||
    (normQ.includes('khach') && (normQ.includes('block') || normQ.includes('chan so')))
  );

  if (isToanDinhHai) {
    return `⚠️ [CẢNH BÁO KHÁCH HÀNG: ANH TOÀN Ở ĐỊNH HẢI] ⚠️\n\n` +
      `📌 LƯU Ý ĐẶC BIỆT QUAN TRỌNG: Ở Định Hải CHỈ CÓ DUY NHẤT ANH TOÀN là từng có tiền lệ xấu, TUYỆT ĐỐI KHÔNG QUY CHUNG CẢ VÙNG ĐỊNH HẢI LÀ BOM HÀNG nhé bác tài! Bà con và các khách hàng khác ở Định Hải vẫn đặt đơn rất uy tín, đàng hoàng, anh em nhận đơn cứ yên tâm giao bình thường! 👍\n\n` +
      `👤 ĐỐI TƯỢNG CẦN LƯU Ý: Duy nhất khách tên TOÀN (ở khu vực Định Hải)\n` +
      `🚨 TIỀN LỆ ĐÃ XẢY RA: Bác Toàn này từng đặt hàng, tài xế đội mưa to gió lớn mang đến nơi thì gọi điện KHÔNG NGHE MÁY và BLOCK (chặn) luôn số tài xế! 😤\n\n` +
      `✅ QUY TRÌNH XỬ LÝ (CHỈ ÁP DỤNG KHI GẶP ĐƠN ANH TOÀN ĐỊNH HẢI):\n` +
      `1️⃣ Trước khi lấy đồ / xuất phát, BẮT BUỘC gọi điện xác nhận anh Toàn có ở đó và sẵn sàng nhận hàng.\n` +
      `2️⃣ Gọi lần 1 không nghe: gọi lại lần 2, rồi lần 3. Vẫn không nghe máy -> BÁO NGAY cho Anh Cương (0967.659.655) để điều phối hủy đơn hợp lệ, KHÔNG tự ý chạy ra tránh chịu thiệt!\n` +
      `3️⃣ Các đơn khác ở Định Hải: Vẫn giao bình thường, chúc anh em luôn nổ đơn đều tay! 🛵💨`;
  }

  // 2.7. App bị tắt / Mất quyền
  if (
    normQ.includes('app bi tat') ||
    normQ.includes('ung dung bi tat') ||
    normQ.includes('app tu dong tat') ||
    normQ.includes('app tu tat') ||
    normQ.includes('mat quyen') ||
    normQ.includes('bi mat quyen') ||
    normQ.includes('khong nhan duoc don') ||
    normQ.includes('thong bao bi tat') ||
    normQ.includes('quan ly ung dung') ||
    normQ.includes('sao app tat') ||
    normQ.includes('app tat roi') ||
    normQ.includes('app tat hoai') ||
    normQ.includes('app bi dong') ||
    normQ.includes('vi sao app tat') ||
    normQ.includes('app dang bat ma') ||
    normQ.includes('bat ma bi tat') ||
    normQ.includes('bat ma lai bi tat') ||
    normQ.includes('dang bat ma lai bi tat') ||
    normQ.includes('muc khoanh tron') ||
    (normQ.includes('app') && (normQ.includes('bi tat') || normQ.includes('tu dong') || normQ.includes('mat quyen') || normQ.includes('tu tat')))
  ) {
    return `📱 [HƯỚNG DẪN SỬA LỖI APP TÀI XẾ ĐANG BẬT MÀ LẠI BỊ TẮT / MẤT QUYỀN] 🔧\n\n` +
      `🔍 NGUYÊN NHÂN PHỔ BIẾN NHẤT:\n` +
      `Điện thoại Android có tính năng "Quản lý ứng dụng nếu không dùng" - nó TỰ ĐỘNG LOẠI BỎ QUYỀN, XOÁ TỆP TẠM, DỪNG THÔNG BÁO và ĐÓNG APP NGẦM khi hệ thống nghĩ app không hoạt động. Đây là thủ phạm số 1 khiến app tài xế VietGo đang bật mà lại tự động bị tắt!\n\n` +
      `✅ CÁCH SỬA (Bác tài làm đúng theo 5 bước này):\n` +
      `1️⃣ Vào CÀI ĐẶT của điện thoại > chọn ỨNG DỤNG\n` +
      `2️⃣ Tìm và nhấn vào APP TÀI XẾ VietGo\n` +
      `3️⃣ Vào mục QUYỀN ỨNG DỤNG\n` +
      `4️⃣ Kéo xuống dưới cùng tìm phần "CHẾ ĐỘ CÀI ĐẶT CHO ỨNG DỤNG KHÔNG DÙNG ĐẾN"\n` +
      `5️⃣ Tìm dòng "QUẢN LÝ ỨNG DỤNG NẾU KHÔNG DÙNG" > TẮT MỤC KHOANH TRÒN NHƯ TRONG ẢNH HƯỚNG DẪN (gạt toggle sang TẮT / màu xám)!\n\n` +
      `🖼️ HƯỚNG DẪN BẰNG ẢNH: Em có đính kèm ảnh chụp màn hình khoanh tròn đúng nút toggle cần gạt tắt trong nhóm Zalo, bác tài nhìn ảnh làm theo 10 giây là xong ngay!\n\n` +
      `📌 TÓM TẮT NHANH:\n` +
      `Cài đặt > Ứng dụng > App tài xế > Quyền ứng dụng > "Quản lý ứng dụng nếu không dùng" > TẮT TOGGLE KHOANH TRÒN là xong!\n\n` +
      `⚠️ NẾU VẪN CHƯA ĐƯỢC: Bác tài liên hệ ngay Anh Cương 0967.659.655 hoặc Anh Sức 0969.397.370 để được hỗ trợ kỹ thuật trực tiếp!\n` +
      `Chúc bác tài sửa xong chạy mượt mà, nổ đơn liên tục không ngắt quãng! 🛵📦✨`;
  }

  // 4.5. Hỏi về thời tiết tại Nghi Sơn, Thanh Hóa (nắng, mưa, bão gió, nhiệt độ, dự báo...)
  const isWeatherInquiry = (
    normQ.includes('thoi tiet') ||
    normQ.includes('troi mua') ||
    normQ.includes('co mua khong') ||
    normQ.includes('mua khong') ||
    normQ.includes('mua gio') ||
    normQ.includes('troi nang') ||
    normQ.includes('nang khong') ||
    normQ.includes('nang gat') ||
    normQ.includes('nhiet do') ||
    normQ.includes('nong qua') ||
    normQ.includes('lanh qua') ||
    normQ.includes('du bao') ||
    (normQ.includes('mua') && (normQ.includes('nghi son') || normQ.includes('tinh gia') || normQ.includes('nay') || normQ.includes('chieu') || normQ.includes('toi') || normQ.includes('sang')))
  );

  if (isWeatherInquiry) {
    const weather = await fetchNghiSonWeather();
    return formatNghiSonWeatherResponse(weather, senderName);
  }

  // 5. Chém gió, tâm sự, đùa vui, chuyện cười, thời tiết, ăn uống, thơ ca, động viên
  if (normQ.includes('chuyen cuoi') || normQ.includes('ke chuyen') || normQ.includes('hai huoc') || normQ.includes('vui ve')) {
    return `😄 [AI CHÉM GIÓ - CHUYỆN CƯỜI TÀI XẾ 🛵💨]\n` +
      `Cảnh sát giao thông tuýt còi một bác tài xe máy giao đồ ăn:\n` +
      `- "Bác tài! Thùng hàng phía sau sao lại nghe tiếng vịt kêu cạp cạp thế này?"\n` +
      `- Bác tài cười toe toét: "Dạ thưa sếp, đơn khách đặt Gỏi Vịt Nhân Loan nóng hổi, quán làm vịt tươi nên nó phải kêu để chứng minh chất lượng sếp ơi!" 🦆😂\n\n` +
      `Chúc bác ${senderName} và toàn thể anh em có một ngày chạy xe thật vui vẻ, tỉnh táo và nổ đơn liên tục nhé! 🛵💨`;
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

  // 5.6. Tài xế gọi Bot (Bot ơi, bót ơi, rồi bót, alo bot, ê bot, bot đâu rồi...)
  const isCallingBotOnly = (
    normQ === 'bot' ||
    normQ === 'bot oi' ||
    normQ === 'bot a' ||
    normQ === 'roi bot' ||
    normQ === 'roi bot oi' ||
    normQ === 'alo bot' ||
    normQ === 'e bot' ||
    normQ === 'bot dau' ||
    normQ === 'bot dau roi' ||
    normQ === 'bot co do khong' ||
    normQ === 'bot co day khong' ||
    normQ === 'goi bot' ||
    normQ === 'chao bot' ||
    normQ === 'oi bot' ||
    normQ === 'hoi bot' ||
    normQ === 'bac bot' ||
    normQ === 'anh bot' ||
    normQ === 'bac bot oi' ||
    normQ === 'anh bot oi' ||
    normQ === 'bot vietgo' ||
    normQ === 'vietgo bot'
  );

  if (isCallingBotOnly) {
    return `🤖 [DẠ EM NGHE ĐÂY BÁC TÀI!] 🛵✨\n\n` +
      `Em là Trợ lý Bot VietGo Food Tĩnh Gia, luôn túc trực 24/7 đồng hành cùng anh em đội xe!\n\n` +
      `Bác cần em hỗ trợ gì cứ nhắn em nhé:\n` +
      `• Gặp sự cố đơn hàng? (Quán hết món, khách không nghe máy, quán làm lâu, giao viện...)\n` +
      `• Hỏi khung giờ & điểm nóng nổ đơn tại Tĩnh Gia?\n` +
      `• Hỏi thời tiết Nghi Sơn hôm nay thế nào (trời mưa hay nắng)?\n` +
      `• Cách cày ngọc kiếm tiền từ Đóng góp địa điểm (1.000 ngọc / địa điểm)?\n` +
      `• Tra cứu SĐT tài xế, hotline Anh Cương (0967.659.655) & Anh Sức (0969.397.370)?\n` +
      `• Hoặc cứ tâm sự, chém gió, kể chuyện cười lúc vắng đơn nhé bác! 😄`;
  }

  // 5.7. Tài xế hỏi chung "giờ phải làm sao bot" / "phải làm sao hả bot" / "giờ làm thế nào"
  const isAskingHowToDo = (
    normQ.includes('gio phai lam sao') ||
    normQ.includes('phai lam sao') ||
    normQ.includes('lam sao gio') ||
    normQ.includes('lam the nao') ||
    normQ.includes('gio lam sao') ||
    normQ.includes('sao bay gio') ||
    normQ.includes('cuu em voi') ||
    normQ.includes('cuu voi') ||
    normQ.includes('giup em voi')
  );

  if (isAskingHowToDo) {
    return `🤖 [BOT VIETGO ĐÂY Ạ - BÁC TÀI ĐANG GẶP TÌNH HUỐNG NÀO THẾ Ạ?] 🛵\n\n` +
      `Bác đang gặp sự cố nào dưới đây, nhắn cho em biết để em chỉ bí kíp xử lý ngay nhé:\n\n` +
      `1️⃣ GỌI KHÁCH KHÔNG NGHE MÁY? ➔ Kết bạn Zalo nhắn: "Tài xế Vietgo không liên lạc được anh/chị". Nếu không được gọi ngay Anh Cương 0967.659.655!\n` +
      `2️⃣ QUÁN HẾT MÓN / HỦY ĐƠN? ➔ Gọi ngay cho khách thương lượng đổi món tương đương, tăng tỷ lệ khách đặt lại đơn.\n` +
      `3️⃣ QUÁN ĐÔNG / LÀM ĐỒ LÂU? ➔ Nhắn tin trên app cho khách: "Em tới quán rồi, quán đang chuẩn bị đồ em giao qua liền ạ" để khách yên tâm không hủy.\n` +
      `4️⃣ KHÁCH BỆNH VIỆN NHỜ LÊN PHÒNG? ➔ Chịu khó gửi xe đem lên tận nơi cho khách, niềm nở tận tình ghi điểm 5 sao!\n` +
      `5️⃣ VẮNG ĐƠN / ÍT ĐƠN? ➔ Tản ra mỗi người 1 vị trí, tránh tụ tập bu đông sóng yếu, hoặc mở app cày ngọc đóng góp địa điểm (1.000 ngọc/điểm)!\n` +
      `6️⃣ APP BỊ TỰ TẮT / MẤT QUYỀN? ➔ Vào Cài đặt điện thoại tắt mục "Quản lý ứng dụng nếu không dùng".\n` +
      `7️⃣ SỰ CỐ KHẨN CẤP KHÁC? ➔ Gọi ngay Anh Cương: 0967.659.655 hoặc Anh Sức: 0969.397.370 để điều phối hỗ trợ trực tiếp!`;
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
  const currentHour = getVietnamHour(now);
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
          return `${i + 1}. 🟢 @${d.name} (Xe ${d.licensePlate} - Mã: ${getPhoneTail(d.phone)})\n   ⏱️ Khung giờ làm việc: ${workHours}\n   ⏰ Vào ca: ${timeDisplay} (${checkInStatus}) • Tuyến: ${d.route}`;
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
          return `${i + 1}. 📝 @${d.name} (Xe ${d.licensePlate} - Mã: ${getPhoneTail(d.phone)})\n   📋 Lý do: ${reason}`;
        }).join('\n')
      : '   (Không có tài xế nào nghỉ phép hôm nay)';

    // Build Missing Drivers List
    const missingListStr = missingDrivers.length > 0
      ? missingDrivers.map((d, i) => {
          const shift = shifts.find(s => s.id === d.defaultShiftId) || getActiveShift();
          return `${i + 1}. ❌ @${d.name} (Xe ${d.licensePlate} - Mã: ${getPhoneTail(d.phone)})\n   🎯 Phân công: ${shift.name}\n   🚨 Trạng thái: Chưa có mặt (Quá 09:00 bị tạm khóa đơn)`;
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

  // 0. BỔ SUNG KHUNG GIỜ LÀM VIỆC (Trả lời câu hỏi của Bot yêu cầu báo số giờ)
  const supplementalHours = extractTimeRange(message);
  if (supplementalHours && !rawClean.startsWith('checkout') && !rawClean.startsWith('offline') && !rawClean.startsWith('ofline') && !rawClean.startsWith('off') && !rawClean.startsWith('kt') && !rawClean.startsWith('nghi')) {
    let targetDriver = findDriverByMessageOrSender(message, senderName, senderId);
    if (!targetDriver && senderId) {
      targetDriver = drivers.find(d => d.zaloId === senderId) || null;
    }
    if (!targetDriver && pendingHoursDrivers.size === 1) {
      const singlePendingId = Array.from(pendingHoursDrivers.keys())[0];
      targetDriver = drivers.find(d => d.id === singlePendingId) || null;
    }

    if (targetDriver) {
      const rec = attendanceRecords.find(r => r.driverId === targetDriver!.id && (r.date === effectiveDate || r.date === today));
      if (rec && (rec.workHoursExpected === 'Chờ báo số giờ' || !rec.workHoursExpected || pendingHoursDrivers.has(targetDriver.id))) {
        rec.workHoursExpected = supplementalHours;
        rec.dispatchRestricted = false;
        if (rec.aiAnalysis) {
          rec.aiAnalysis.detectedTimeRange = supplementalHours;
          rec.aiAnalysis.summary = `Tài xế ${targetDriver.name}, khung giờ làm việc: ${supplementalHours} (Đã chốt thống kê)`;
        }
        pendingHoursDrivers.delete(targetDriver.id);

        const phoneTail = getPhoneTail(targetDriver.phone);
        const reply = `✅ [ĐÃ CẬP NHẬT KHUNG GIỜ LÀM VIỆC - HOÀN TẤT ĐIỂM DANH] 🛵✨\n` +
          `👤 Bác tài: ${targetDriver.name} (Mã: ${phoneTail} - Biển số: ${targetDriver.licensePlate})\n` +
          `⏱️ Khung giờ đã chốt: ${supplementalHours}\n` +
          `📅 Ngày áp dụng: ${rec.date}\n` +
          `📊 Hệ thống AI đã lưu số giờ vào bảng thống kê công của VietGo Food Tĩnh Gia!\n` +
          `Chúc bác tài làm việc an toàn, bội thu đơn hàng! 👏🎉`;

        return { action: 'update_hours', reply, record: rec, driver: targetDriver, success: true };
      }
    }
  }

  // Check if message is a Question intended for AI (e.g. asking for driver phone, route, warehouse, weather, general question)
  const isQuestion = 
    message.includes('?') || 
    normMsg.includes('cho hoi') || 
    normMsg.includes('thoi tiet') || 
    normMsg.includes('troi mua') || 
    normMsg.includes('co mua') || 
    normMsg.includes('mua khong') || 
    normMsg.includes('troi nang') || 
    normMsg.includes('nang khong') || 
    normMsg.includes('nhiet do') || 
    normMsg.includes('du bao') || 
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

  // Check explicit Check-in keywords or patterns: checkin3389, online3389, on3389, dd3389, 3389 on
  const isCheckInExplicit = 
    /^(?:checkin|check\s*in|online)\b/i.test(normMsg) ||
    /^(?:checkin|check\s*in|online|on|dd)\s*\d{3,4}/i.test(rawClean) ||
    /^(?:checkin|check\s*in|online)\s*(?:8h|ca|full)/i.test(normMsg) ||
    normMsg.startsWith('on ') || 
    normMsg.startsWith('dd ') || 
    normMsg.startsWith('co mat') || 
    normMsg.startsWith('diem danh') ||
    (driver !== null && !isQuestion && (
      /\b(?:checkin|check\s*in|online)\b/i.test(normMsg) ||
      /(?:checkin|check\s*in|online|on|dd)\s*\d{3,4}/i.test(rawClean) ||
      /\d{3,4}\s*(?:checkin|check\s*in|online|on|dd)/i.test(rawClean)
    ));

  // Check explicit Checkout keywords: checkout3389, offline3389, ofline3389, off3389, off 3389, kt3389, kt 3389, xong3389
  const isCheckOutExplicit = 
    /^(?:checkout|check\s*out|offline|ofline|off|kt|xong\s*ca)\s*\d{3,4}/i.test(rawClean) ||
    /^(?:checkout|check\s*out|offline|ofline|off|kt|ket\s*thuc|ve\s*bai|xong\s*ca)\b/i.test(normMsg) ||
    (driver !== null && (
      /\b(?:checkout|check\s*out|offline|ofline|off|xong\s*ca)\b/i.test(normMsg) ||
      /(?:checkout|check\s*out|offline|ofline|off|kt)\s*\d{3,4}/i.test(rawClean) ||
      /\d{3,4}\s*(?:checkout|check\s*out|offline|ofline|off|kt)/i.test(rawClean)
    ));

  // Loại bỏ cụm từ địa danh "nghi son" (Nghi Sơn) khỏi kiểm tra báo nghỉ kẻo nhầm lẫn
  const leaveCheckNorm = normMsg.replace(/\bnghi\s*son\b/g, '');
  const leaveCheckRaw = rawClean.replace(/^nghison/i, '');

  // Check explicit Leave keywords: nghi3389, hom nay a nghi, nay a nghi, nghi lam, xin nghi
  const isLeaveExplicit = 
    leaveCheckRaw.startsWith('nghi') || 
    leaveCheckRaw.startsWith('phep') || 
    leaveCheckNorm.startsWith('nghi') || 
    leaveCheckNorm.startsWith('xin nghi') || 
    leaveCheckNorm.startsWith('bao nghi') || 
    leaveCheckNorm.startsWith('phep') ||
    leaveCheckNorm.includes('nghi lam') ||
    leaveCheckNorm.includes('xin nghi lam') ||
    leaveCheckNorm.includes('hom nay a nghi') ||
    leaveCheckNorm.includes('nay a nghi') ||
    leaveCheckNorm.includes('a nghi hom nay') ||
    leaveCheckNorm.includes('a nghi nha') ||
    leaveCheckNorm.includes('a nghi nhe') ||
    leaveCheckNorm.includes('hom nay anh nghi') ||
    leaveCheckNorm.includes('nay anh nghi') ||
    leaveCheckNorm.includes('anh nghi hom nay') ||
    leaveCheckNorm.includes('nay e nghi') ||
    leaveCheckNorm.includes('nay em nghi') ||
    leaveCheckNorm.includes('e xin nghi') ||
    leaveCheckNorm.includes('em xin nghi') ||
    leaveCheckNorm.includes('hom nay em nghi') ||
    leaveCheckNorm.includes('hom nay e nghi') ||
    (leaveCheckNorm.includes('nghi') && (leaveCheckNorm.includes('hom nay') || leaveCheckNorm.includes('nay') || leaveCheckNorm.includes('ban viec') || leaveCheckNorm.includes('xe hu') || leaveCheckNorm.includes('om') || leaveCheckNorm.includes('kham')));


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
    saveAttendanceRecords();
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
      // Khi tài xế kết thúc ca mà chưa có bản ghi, ước tính ca theo giờ ra ca (VD: 21h40 là Ca Chiều 14:00 - 22:00, không lấy ca sáng 06:00)
      const estimatedShift = getEstimatedShiftForCheckOut(timeStr);
      record = {
        id: `att-${Date.now()}`,
        driverId: driver.id,
        driverName: driver.name,
        licensePlate: driver.licensePlate,
        vehicleType: driver.vehicleType,
        route: driver.route,
        date: today,
        shiftId: estimatedShift.id,
        shiftName: estimatedShift.name,
        checkInTime: estimatedShift.startTime + ':00',
        checkOutTime: timeStr,
        status: 'completed',
        endOdometer: endOdo,
        workHoursExpected: `${estimatedShift.startTime} - ${estimatedShift.endTime}`,
        dispatchRestricted: false,
        aiAnalysis: {
          intent: 'checkout',
          summary: `Tài xế kết thúc ca làm việc (${estimatedShift.name})`
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

    // Xác định đầu giờ vào ca thực tế (Effective Shift Start Time)
    // Ví dụ: Đăng ký online 14-22h30 thì đầu giờ vào tính từ 14:00, khi ra ca lúc 21:40 sẽ tính: 21:40 - 14:00 = 7 tiếng 40 phút!
    const effectiveStart = getEffectiveStartTime(record, timeStr, message);
    const durationStr = calculateWorkDuration(effectiveStart.startTime, timeStr);

    const reply = botConfig.checkOutTemplate
      .replace(/{name}/g, driver.name)
      .replace(/{phone}/g, driver.phone)
      .replace(/{phoneTail}/g, phoneTail)
      .replace(/{plate}/g, driver.licensePlate)
      .replace(/{time}/g, timeStr)
      .replace(/{timeIn}/g, effectiveStart.display)
      .replace(/{workHours}/g, durationStr)
      .replace(/{duration}/g, durationStr);

    saveAttendanceRecords();

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

    const startOdo = extractOdometer(message);
    const workHours = extractTimeRange(message);
    const shift = getShiftFromWorkHours(workHours, shifts.find(s => s.id === driver.defaultShiftId));
    const { status, lateMinutes } = isForTomorrow 
      ? { status: 'on_time' as const, lateMinutes: 0 }
      : calculateAttendanceStatus(shift, timeStr);
    const phoneTail = getPhoneTail(driver.phone);

    let existingRecord = attendanceRecords.find(r => r.driverId === driver.id && r.date === effectiveDate);

    // =========================================================================
    // QUY ĐỊNH BẮT BUỘC: PHẢI KÈM THEO SỐ GIỜ LÀM VIỆC ĐỂ THỐNG KÊ
    // =========================================================================
    if (!workHours) {
      // Nếu chưa có giờ làm việc, AI BẮT BUỘC PHẢI HỎI LẠI ĐỂ BIẾT LÀM THỜI GIAN NHƯ THẾ NÀO ĐỂ THỐNG KÊ!
      if (existingRecord && existingRecord.workHoursExpected && existingRecord.workHoursExpected !== 'Chờ báo số giờ') {
        const dateLabel = isForTomorrow ? `CHO NGÀY MAI (${effectiveDate})` : `HÔM NAY (${effectiveDate})`;
        const reply = `ℹ️ [BÁC TÀI ĐÃ HOÀN THÀNH ĐIỂM DANH ${dateLabel}]\n` +
          `👤 Bác tài: ${driver.name} (Xe ${driver.licensePlate} - Mã: ${phoneTail})\n` +
          `⏰ Đã ghi nhận có mặt lúc: ${existingRecord.checkInTime}\n` +
          `⏱️ Khung giờ làm việc đã chốt: ${existingRecord.workHoursExpected}\n` +
          `📌 Quy định: Bác tài mỗi ngày/ca chỉ cần điểm danh 1 lần duy nhất! Chúc bác nổ đơn liên tục! 🚚✨`;
        return { action: 'checkin', reply, record: existingRecord, driver, success: true };
      }

      // Chưa có số giờ: Lưu bản ghi tạm thời và AI đặt câu hỏi yêu cầu báo giờ
      if (!existingRecord) {
        existingRecord = {
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
          workHoursExpected: 'Chờ báo số giờ',
          dispatchRestricted: false,
          aiAnalysis: {
            intent: 'checkin',
            summary: `Tài xế ${driver.name} đã báo online lúc ${timeStr} nhưng CHƯA CÓ SỐ GIỜ (AI đang hỏi lại để thống kê)`
          },
          note: isForTomorrow ? `Điểm danh sớm cho ngày mai (${effectiveDate}) - Chờ tài xế báo số giờ làm việc` : `Chờ tài xế báo số giờ làm việc để thống kê`,
          source: 'zalo_bot',
          rawZaloMessage: message,
          zaloSenderName: senderName,
          createdAt: new Date().toISOString()
        };
        attendanceRecords.push(existingRecord);
      saveAttendanceRecords();
      } else {
        existingRecord.checkInTime = timeStr;
      }

      pendingHoursDrivers.set(driver.id, {
        recordId: existingRecord.id,
        date: effectiveDate,
        askedAt: Date.now()
      });

      const dateLabel = isForTomorrow ? `cho NGÀY MAI (${effectiveDate})` : `HÔM NAY (${effectiveDate})`;
      const askHoursReply = 
        `⚠️ [YÊU CẦU BỔ SUNG SỐ GIỜ LÀM VIỆC] 🛵🍱\n` +
        `👤 Bác tài: ${driver.name} (Mã: ${phoneTail} - Biển số: ${driver.licensePlate})\n` +
        `⏰ Giờ nhận lệnh: ${timeStr}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👉 QUY ĐỊNH BẮT BUỘC: Lệnh online ${dateLabel} PHẢI KÈM THEO SỐ GIỜ hoặc KHUNG GIỜ LÀM VIỆC để hệ thống AI thống kê giờ công & điều phối đơn!\n\n` +
        `❓ Bác tài dự kiến chạy từ mấy giờ đến mấy giờ (hoặc ca mấy tiếng) ạ?\n` +
        `📝 Bác tài vui lòng nhắn lại theo mẫu:\n` +
        `   • Báo khung giờ: online${phoneTail} 8h-14h (hoặc 11h-21h, 17h-23h...)\n` +
        `   • Báo số tiếng: online${phoneTail} 8 tiếng (hoặc 6 tiếng, 4 tiếng...)\n` +
        `   • Báo làm full: online${phoneTail} làm full (hoặc cả ngày)\n` +
        `   • Hoặc chỉ cần nhắn nhanh: "${phoneTail} 8h-14h" hoặc "8h-14h"\n\n` +
        `Hệ thống AI đang chờ số giờ của bác để hoàn tất lưu điểm danh vào bảng thống kê nhé! ⏳📊`;

      return { action: 'checkin_pending_hours', reply: askHoursReply, record: existingRecord, driver, success: true };
    }

    // ĐÃ KÈM THEO SỐ GIỜ LÀM VIỆC -> HOÀN TẤT ĐIỂM DANH & LƯU THỐNG KÊ
    pendingHoursDrivers.delete(driver.id);

    if (existingRecord) {
      if (startOdo && !existingRecord.startOdometer) existingRecord.startOdometer = startOdo;
      existingRecord.workHoursExpected = workHours;
      existingRecord.dispatchRestricted = false;
      existingRecord.checkInTime = timeStr; // Cập nhật đúng thời điểm tài xế gửi tin nhắn điểm danh thực tế
      existingRecord.shiftId = shift.id;
      existingRecord.shiftName = shift.name;
      existingRecord.status = status;
      if (lateMinutes > 0) existingRecord.lateMinutes = lateMinutes;
      if (existingRecord.aiAnalysis) {
        existingRecord.aiAnalysis.detectedTimeRange = workHours;
        existingRecord.aiAnalysis.summary = isForTomorrow
          ? `AI nhận diện điểm danh sớm ngày mai (${effectiveDate}): Tài xế ${driver.name}, khung giờ: ${workHours}`
          : `AI nhận diện điểm danh: Tài xế ${driver.name}, khung giờ: ${workHours}`;
      }
      saveAttendanceRecords();

      const dateLabel = isForTomorrow ? `CHO NGÀY MAI (${effectiveDate})` : `HÔM NAY (${effectiveDate})`;
      const reply = `✅ [ĐÃ CHỐT KHUNG GIỜ LÀM VIỆC THÀNH CÔNG] 🛵✨\n` +
        `👤 Bác tài: ${driver.name} (Mã: ${phoneTail} - Biển số: ${driver.licensePlate})\n` +
        `⏰ Giờ điểm danh: ${existingRecord.checkInTime}\n` +
        `⏱️ Khung giờ làm việc: ${workHours}\n` +
        `📅 Ngày áp dụng: ${dateLabel}\n` +
        `📊 Hệ thống AI đã lưu số giờ vào bảng thống kê công của VietGo!\n` +
        `Chúc bác tài làm việc an toàn, bội thu đơn hàng! 👏🎉`;
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
      workHoursExpected: workHours,
      dispatchRestricted: false,
      aiAnalysis: {
        intent: 'checkin',
        detectedTimeRange: workHours,
        summary: isForTomorrow 
          ? `AI nhận diện điểm danh sớm ngày mai (${effectiveDate}): Tài xế ${driver.name}, khung giờ: ${workHours}`
          : `AI nhận diện điểm danh: Tài xế ${driver.name}, khung giờ: ${workHours}`
      },
      note: isForTomorrow ? `Điểm danh sớm từ 21h đêm hôm trước cho ngày ${effectiveDate} - Khung giờ: ${workHours}` : `Khung giờ làm việc: ${workHours}`,
      startOdometer: startOdo,
      source: 'zalo_bot',
      rawZaloMessage: message,
      zaloSenderName: senderName,
      createdAt: new Date().toISOString()
    };

    attendanceRecords.push(newRecord);
    saveAttendanceRecords();

    let reply = '';
    if (isForTomorrow) {
      reply = `✅ [ĐIỂM DANH SỚM THÀNH CÔNG CHO NGÀY MAI - ĐÃ GHI NHẬN KHUNG GIỜ] 🌙\n` +
        `👤 Tài xế: ${driver.name} (Mã: ${phoneTail})\n` +
        `🚗 Biển số: ${driver.licensePlate} (${driver.vehicleType})\n` +
        `📅 Ngày áp dụng: ${effectiveDate} (Ngày mai)\n` +
        `⏰ Giờ điểm danh: ${timeStr} (Mở từ 21:00 đêm hôm trước - Đúng hạn ✅)\n` +
        `🎯 Ca phân công: ${shift.name}\n` +
        `⏱️ Khung giờ làm việc: ${workHours}\n` +
        `📍 Tuyến: ${driver.route}\n` +
        `📊 Đã chốt số giờ làm việc vào hệ thống thống kê ngày mai!\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 LƯU Ý: Sáng mai bác tài KHÔNG CẦN điểm danh lại!\n` +
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
        .replace('{workHours}', workHours);
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
        .replace('{workHours}', workHours)
        .replace('{route}', driver.route);
      const curWeather = await fetchNghiSonWeather();
      reply += '\n\n' + getWeatherShortTip(curWeather);
    }

    return { action: 'checkin', reply, record: newRecord, driver, success: true };
  }


  // 5.5. Tự động nhận diện rên rỉ than ế, ít đơn, không có đơn để góp ý vui vẻ
  const isOrderComplaintMsg = (
    normMsg.includes('it don') ||
    normMsg.includes('khong co don') ||
    normMsg.includes('ko co don') ||
    normMsg.includes('k co don') ||
    normMsg.includes('chua co don') ||
    normMsg.includes('e qua') ||
    normMsg.includes('e don') ||
    normMsg.includes('e am') ||
    normMsg.includes('e moc mom') ||
    normMsg.includes('than e') ||
    normMsg.includes('doi kem') ||
    normMsg.includes('doi meo') ||
    normMsg.includes('sao it don') ||
    normMsg.includes('sao khong co don') ||
    normMsg.includes('chang co don') ||
    normMsg.includes('cha co don') ||
    normMsg.includes('chua no don') ||
    normMsg.includes('khong no don') ||
    normMsg.includes('ko no don') ||
    normMsg.includes('chua thay no') ||
    normMsg.includes('khong no') ||
    normMsg.includes('ngoi choi') ||
    normMsg.includes('ngoi hong') ||
    normMsg.includes('ngoi bu') ||
    normMsg.includes('khong co cuoc') ||
    normMsg.includes('it cuoc') ||
    normMsg.includes('ren it don') ||
    normMsg.includes('ren ri') ||
    normMsg.includes('than phien') ||
    normMsg.includes('doi don') ||
    normMsg.includes('khong ban don') ||
    normMsg.includes('ko ban don') ||
    normMsg.includes('sao khong ban') ||
    normMsg.includes('chac doi') ||
    normMsg.includes('vang don') ||
    (normMsg.includes('don') && (normMsg.includes('it') || normMsg.includes('cham') || normMsg.includes('e') || normMsg.includes('khong co') || normMsg.includes('ko co') || normMsg.includes('vang')))
  );

  // 5.6. Tự động nhận diện mọi tình huống kêu gọi Bot (Bot ơi, bót ơi, giờ phải làm sao bot, rồi bót, alo bot, ê bot...)
  const wordsInNorm = normMsg.split(/\s+/);
  const mentionsBot = (
    wordsInNorm.includes('bot') || 
    rawClean.includes('bot') || 
    rawClean.includes('bót') ||
    /\b(?:bot|bót)\b/i.test(message)
  );

  // 5.8. Tự động nhận diện câu hỏi về thời tiết Nghi Sơn (nắng, mưa, bão, nhiệt độ...)
  const isWeatherMsg = (
    normMsg.includes('thoi tiet') ||
    normMsg.includes('troi mua') ||
    normMsg.includes('co mua khong') ||
    normMsg.includes('mua khong') ||
    normMsg.includes('mua gio') ||
    normMsg.includes('troi nang') ||
    normMsg.includes('nang khong') ||
    normMsg.includes('nang gat') ||
    normMsg.includes('nhiet do') ||
    normMsg.includes('du bao') ||
    (normMsg.includes('mua') && (normMsg.includes('nghi son') || normMsg.includes('tinh gia') || normMsg.includes('nay') || normMsg.includes('chieu') || normMsg.includes('toi') || normMsg.includes('sang')))
  );

  // 6. QUESTION / DEEPSEEK AI ASSISTANT QUERY (Kích hoạt khi hỏi bot, gọi bot, than ế, hỏi thời tiết hoặc có tiền tố)
  const isAITriggered = isOrderComplaintMsg || mentionsBot || isWeatherMsg ||
    rawClean.startsWith('ai') || 
    rawClean.startsWith('bot') || 
    rawClean.startsWith('bót') || 
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

  // Tình huống chỉ gọi Bot đơn thuần (Bot ơi, bót ơi, rồi bót, alo bot, ê bot...)
  const isSimpleCallingBot = (
    normMsg === 'bot' ||
    normMsg === 'bot oi' ||
    normMsg === 'bot a' ||
    normMsg === 'roi bot' ||
    normMsg === 'roi bot oi' ||
    normMsg === 'alo bot' ||
    normMsg === 'e bot' ||
    normMsg === 'bot dau' ||
    normMsg === 'bot dau roi' ||
    normMsg === 'bot co do khong' ||
    normMsg === 'bot co day khong' ||
    normMsg === 'goi bot' ||
    normMsg === 'chao bot' ||
    normMsg === 'oi bot' ||
    normMsg === 'hoi bot' ||
    normMsg === 'bac bot' ||
    normMsg === 'anh bot' ||
    normMsg === 'bac bot oi' ||
    normMsg === 'anh bot oi'
  );

  if (isSimpleCallingBot) {
    const aiAnswer = await queryDeepSeekAI('bot ơi', senderName);
    return {
      action: 'ai_query',
      reply: aiAnswer,
      success: true
    };
  }

  if (isAITriggered) {
    // Làm sạch từ gọi bot ở đầu câu hoặc cuối câu để lấy nội dung câu hỏi
    let cleanPrompt = message
      .replace(/^(?:@ai|\/ai|!ai|ai|@bot|\/bot|!bot|bot|bót|hỏi|hoi|vietgo)\b\s*[:\-,\.]?\s*/gi, '')
      .replace(/^(?:alo|này|bác|anh|ơi|oi|à|a|ê|e)\b\s*[:\-,\.]?\s*/gi, '')
      .replace(/\s*(?:nhỉ|nhi|hả|ha|nhé|nhe|nha|với|voi|ạ|a|được không|duoc khong|thế|the|vậy|vay)?\s*(?:hả|ha)?\s*(?:bot|bót|ai)\b\s*(?:ơi|oi|à|a)?[\s\.\?!]*$/gi, '')
      .trim();
    if (!cleanPrompt || cleanPrompt.length < 2) cleanPrompt = message.trim();

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
  app.use('/images_training', express.static(path.join(__dirname, 'zalobot/images_training')));

  // API ROUTES
  // API Thời tiết trực tiếp tại Nghi Sơn (Tĩnh Gia)
  app.get('/api/weather/nghison', async (req: Request, res: Response) => {
    try {
      const weather = await fetchNghiSonWeather();
      res.json({ success: true, weather });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

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
      vehicleType: data.vehicleType || 'Xe máy giao đồ ăn',
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
          vehicleType: item.vehicleType || 'Xe máy giao đồ ăn',
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
      groupName: 'ĐỘI TÀI XẾ VIETGO TĨNH GIA',
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
          return `${i + 1}. ❌ @${d.name} (Xe ${d.licensePlate} - Mã: ${getPhoneTail(d.phone)})\n   🎯 Phân công: ${shift.name}\n   🚨 Trạng thái: QUÁ HẠN 09:00 SÁNG - TẠM KHÓA NHẬN ĐƠN`;
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
      groupName: 'ĐỘI TÀI XẾ VIETGO TĨNH GIA',
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
      groupName || 'ĐỘI TÀI XẾ VIETGO TĨNH GIA'
    );

    const simLog: WebhookLog = {
      id: `log-${Date.now()}`,
      timestamp: `${getTodayString()} ${formatTime()}`,
      senderName: String(senderName || 'Nguyễn Văn Tuấn'),
      groupId: groupId || 'sim_group_01',
      groupName: groupName || 'ĐỘI TÀI XẾ VIETGO TĨNH GIA (Mô phỏng)',
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
