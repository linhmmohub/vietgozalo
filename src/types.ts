export type VehicleType = 
  | 'Xe máy giao đồ ăn'
  | 'Xe máy số / tay ga'
  | 'Xe máy điện giao thức ăn'
  | 'Xe máy có thùng giữ nhiệt'
  | 'Xe máy Wave/Sirius/Vision';

export type AttendanceStatus = 'on_time' | 'late' | 'leave' | 'absent' | 'in_progress' | 'completed';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  zaloId?: string;
  zaloName?: string;
  licensePlate: string; // e.g., '29C-882.14'
  vehicleType: VehicleType;
  route: string; // e.g., 'HN - Bắc Ninh', 'Nội thành TP.HCM', 'Khu vực Thanh Hóa'
  avatarUrl?: string;
  active: boolean;
  notes?: string;
  defaultShiftId?: string;
  shiftStatus?: 'not_checked_in' | 'standby' | 'on_duty' | 'emergency_leave' | string;
  online?: boolean;
  externalSynced?: boolean;
}

export interface Shift {
  id: string;
  name: string; // e.g., 'Ca Sáng (06:00 - 14:00)'
  startTime: string; // '06:00'
  endTime: string; // '14:00'
  graceMinutes: number; // e.g., 15 minutes before marked as late
  isActive: boolean;
  description?: string;
}

export interface AttendanceRecord {
  id: string;
  driverId: string;
  driverName: string;
  licensePlate: string;
  vehicleType: VehicleType;
  route: string;
  date: string; // 'YYYY-MM-DD'
  shiftId: string;
  shiftName: string;
  checkInTime: string; // 'HH:mm:ss'
  checkOutTime?: string; // 'HH:mm:ss'
  status: AttendanceStatus;
  lateMinutes?: number;
  workHoursExpected?: string; // e.g. "8h - 14h" hoặc "08:00 - 17:00"
  dispatchRestricted?: boolean; // Bị hạn chế nhận đơn do trễ quá hạn
  aiAnalysis?: {
    intent: 'checkin' | 'checkout' | 'leave' | 'query';
    detectedTimeRange?: string; // "8h - 14h"
    parsedReason?: string;
    summary?: string;
  };
  startOdometer?: number; // km
  endOdometer?: number; // km
  leaveReason?: string;
  note?: string;
  source: 'zalo_bot' | 'manual' | 'qr_code' | 'api';
  rawZaloMessage?: string;
  zaloSenderName?: string;
  createdAt: string;
}

export interface BotConfig {
  botName: string;
  zaloPhoneNumber: string;
  webhookSecret: string;
  autoReplyEnabled: boolean;
  allowedGroupIds: string[];
  checkInKeywords: string[];
  checkOutKeywords: string[];
  leaveKeywords: string[];
  statusKeywords: string[];
  helpKeywords: string[];
  lateGracePeriod: number; // minutes
  
  // 6:00 AM Automated Reminder & Overdue Warning Configuration
  reminderTime: string; // "06:00"
  autoReminderEnabled: boolean;
  morningReminderTemplate: string;
  
  overdueMinutes: number; // 10 minutes
  autoOverdueWarningEnabled: boolean;
  overdueWarningTemplate: string;
  dispatchPenaltyEnabled: boolean;

  welcomeMessage: string;
  successCheckInTemplate: string;
  lateCheckInTemplate: string;
  checkOutTemplate: string;
  leaveTemplate: string;
  
  // DeepSeek AI Integration & Knowledge Training
  deepseekEnabled: boolean;
  deepseekApiKey: string;
  deepseekModel: string;
  deepseekBaseUrl: string;
  companyKnowledge: string;
  aiSystemPrompt: string;
}


export interface WebhookLog {
  id: string;
  timestamp: string;
  senderId?: string;
  senderName: string;
  groupId?: string;
  groupName?: string;
  message: string;
  parsedCommand: string;
  matchedPlate?: string;
  driverFound: boolean;
  status: 'success' | 'error' | 'ignored';
  replySent: string;
}

export interface AttendanceStats {
  date: string;
  totalDrivers: number;
  totalCheckedIn: number;
  onTimeCount: number;
  lateCount: number;
  leaveCount: number;
  absentCount: number;
  completedCount: number;
  attendanceRate: number; // percentage
  punctualityRate: number; // percentage
}

export interface DriverLocation {
  driverId: string;
  driverName: string;
  phone: string;
  tailCode: string; // 4 số cuối SĐT
  licensePlate: string;
  vehicleType: VehicleType;
  route: string;
  lat: number;
  lng: number;
  speed: number; // km/h
  heading: number; // 0-360 độ
  accuracy?: number; // mét
  battery?: number; // %
  status: 'running' | 'stopped' | 'idle' | 'offline';
  address: string;
  lastUpdated: string;
  isSimulated?: boolean;
}

