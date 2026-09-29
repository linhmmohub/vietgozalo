import type { 
  Driver, 
  Shift, 
  AttendanceRecord, 
  BotConfig, 
  WebhookLog, 
  AttendanceStats
} from '../types';

export const api = {
  // Status
  async getStatus() {
    const res = await fetch('/api/status');
    return res.json();
  },

  // Automated 6:00 AM Reminder & 10-Minute Overdue Penalty Warnings
  async triggerMorningReminder(): Promise<{ success: boolean; broadcastTime: string; message: string }> {
    const res = await fetch('/api/attendance/trigger-reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async triggerOverdueWarning(): Promise<{ success: boolean; overdueCount: number; overdueDrivers?: Driver[]; message: string }> {
    const res = await fetch('/api/attendance/trigger-overdue-warning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },



  // Drivers & VietGo External API
  async getDrivers(): Promise<Driver[]> {
    const res = await fetch('/api/drivers');
    return res.json();
  },

  async syncVietGoDrivers(): Promise<{ 
    success: boolean; 
    count: number; 
    error?: string; 
    totalDrivers: number; 
    lastSyncTime: string; 
    drivers: Driver[] 
  }> {
    const res = await fetch('/api/drivers/sync-vietgo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async getExternalApiStatus(): Promise<{
    apiUrl: string;
    tokenConfigured: boolean;
    lastSyncTime: string | null;
    syncedCount: number;
    totalDrivers: number;
    lastError: string | null;
  }> {
    const res = await fetch('/api/external-api/status');
    return res.json();
  },

  async createDriver(driver: Partial<Driver>): Promise<Driver> {
    const res = await fetch('/api/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(driver),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Lỗi thêm tài xế');
    return res.json();
  },

  async updateDriver(id: string, driver: Partial<Driver>): Promise<Driver> {
    const res = await fetch(`/api/drivers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(driver),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Lỗi cập nhật tài xế');
    return res.json();
  },

  async deleteDriver(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/drivers/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async bulkImportDrivers(driverList: Partial<Driver>[]): Promise<{ success: boolean; imported: number; total: number }> {
    const res = await fetch('/api/drivers/bulk-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverList }),
    });
    return res.json();
  },

  // Shifts
  async getShifts(): Promise<Shift[]> {
    const res = await fetch('/api/shifts');
    return res.json();
  },

  async updateShift(id: string, shift: Partial<Shift>): Promise<Shift> {
    const res = await fetch(`/api/shifts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shift),
    });
    return res.json();
  },

  async createShift(shift: Partial<Shift>): Promise<Shift> {
    const res = await fetch('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shift),
    });
    return res.json();
  },

  // Attendance
  async getAttendance(params?: { date?: string; shiftId?: string; status?: string; search?: string }): Promise<AttendanceRecord[]> {
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    if (params?.shiftId) query.set('shiftId', params.shiftId);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`/api/attendance?${query.toString()}`);
    return res.json();
  },

  async checkInManual(data: {
    driverId: string;
    shiftId?: string;
    status?: string;
    note?: string;
    startOdometer?: number;
    date?: string;
    checkInTime?: string;
  }): Promise<AttendanceRecord> {
    const res = await fetch('/api/attendance/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Lỗi điểm danh');
    return res.json();
  },

  async updateAttendance(id: string, record: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
    const res = await fetch(`/api/attendance/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    return res.json();
  },

  async deleteAttendance(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/attendance/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Stats
  async getStats(date?: string): Promise<AttendanceStats> {
    const url = date ? `/api/stats?date=${date}` : '/api/stats';
    const res = await fetch(url);
    return res.json();
  },

  // Bot Config
  async getBotConfig(): Promise<BotConfig> {
    const res = await fetch('/api/bot-config');
    return res.json();
  },

  async updateBotConfig(config: Partial<BotConfig>): Promise<BotConfig> {
    const res = await fetch('/api/bot-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },

  // Webhook Logs
  async getWebhookLogs(): Promise<WebhookLog[]> {
    const res = await fetch('/api/zalo/logs');
    return res.json();
  },

  // Simulate Message
  async simulateZaloMessage(data: {
    message: string;
    senderName?: string;
    senderId?: string;
    groupId?: string;
    groupName?: string;
  }) {
    const res = await fetch('/api/zalo/simulate-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};

// Sound chime generator using Web Audio API
export function playChime(type: 'success' | 'alert' | 'message' = 'success') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'alert') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(350, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch (e) {
    console.debug('Audio chime skipped', e);
  }
}
