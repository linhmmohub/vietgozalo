import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { LiveAttendanceTable } from './components/LiveAttendanceTable';
import { ZaloBotSimulator } from './components/ZaloBotSimulator';
import { ZaloBotSetupGuide } from './components/ZaloBotSetupGuide';
import { DriverManagement } from './components/DriverManagement';
import { ShiftManagement } from './components/ShiftManagement';
import { ReportsAndStats } from './components/ReportsAndStats';
import { QuickCheckinModal } from './components/QuickCheckinModal';
import { WebhookLogDrawer } from './components/WebhookLogDrawer';
import { api, playChime } from './services/api';
import type { 
  Driver, 
  Shift, 
  AttendanceRecord, 
  BotConfig, 
  AttendanceStats 
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'simulator' | 'drivers' | 'shifts' | 'reports' | 'setup'>('attendance');

  
  // Data states
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    date: new Date().toISOString().split('T')[0],
    totalDrivers: 0,
    totalCheckedIn: 0,
    onTimeCount: 0,
    lateCount: 0,
    leaveCount: 0,
    absentCount: 0,
    completedCount: 0,
    attendanceRate: 0,
    punctualityRate: 100
  });
  const [botConfig, setBotConfig] = useState<BotConfig>({
    botName: 'Zalo Fleet Attendance & DeepSeek AI Bot',
    zaloPhoneNumber: '0901234567',
    webhookSecret: 'zalo_bot_secret_key_8899',
    autoReplyEnabled: true,
    allowedGroupIds: ['ALL_GROUPS'],
    checkInKeywords: ['online', 'on', 'dd', 'diem danh', 'cham cong'],
    checkOutKeywords: ['off', 'kt', 'ket thuc', 'checkout'],
    leaveKeywords: ['nghi', 'xin nghi'],
    statusKeywords: ['ds', 'bao cao'],
    helpKeywords: ['help', 'tro giup'],
    lateGracePeriod: 15,
    welcomeMessage: '',
    successCheckInTemplate: '',
    lateCheckInTemplate: '',
    checkOutTemplate: '',
    leaveTemplate: '',
    deepseekEnabled: true,
    deepseekApiKey: '',
    deepseekModel: 'deepseek-chat',
    deepseekBaseUrl: 'https://api.deepseek.com/chat/completions',
    companyKnowledge: '',
    aiSystemPrompt: ''
  });

  // Filter states
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showQuickCheckIn, setShowQuickCheckIn] = useState<boolean>(false);
  const [showLogsDrawer, setShowLogsDrawer] = useState<boolean>(false);
  const [quickCheckInDriverId, setQuickCheckInDriverId] = useState<string | undefined>(undefined);

  // Fetch all initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [driversData, shiftsData, recordsData, statsData, configData] = await Promise.all([
        api.getDrivers(),
        api.getShifts(),
        api.getAttendance({
          date: selectedDate,
          shiftId: selectedShift,
          status: selectedStatus,
          search: searchQuery
        }),
        api.getStats(selectedDate),
        api.getBotConfig()
      ]);

      setDrivers(driversData);
      setShifts(shiftsData);
      setRecords(recordsData);
      setStats(statsData);
      setBotConfig(configData);
    } catch (err) {
      console.error('Failed to load initial data', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedShift, selectedStatus, searchQuery]);

  useEffect(() => {
    loadData();
    // Auto-poll every 10 seconds for real-time Zalo updates
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Current active shift
  const now = new Date();
  const currentTotalMins = now.getHours() * 60 + now.getMinutes();
  const activeShift = shifts.find(s => {
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;
    if (startM < endM) {
      return currentTotalMins >= startM && currentTotalMins < endM;
    } else {
      // Night shift wrapping midnight
      return currentTotalMins >= startM || currentTotalMins < endM;
    }
  }) || shifts[0];

  // Handlers for drivers
  const handleAddDriver = async (data: Partial<Driver>) => {
    await api.createDriver(data);
    await loadData();
    playChime('success');
  };

  const handleUpdateDriver = async (id: string, data: Partial<Driver>) => {
    await api.updateDriver(id, data);
    await loadData();
  };

  const handleDeleteDriver = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tài xế này khỏi hệ thống?')) {
      await api.deleteDriver(id);
      await loadData();
    }
  };

  const handleBulkImportDrivers = async (list: Partial<Driver>[]) => {
    await api.bulkImportDrivers(list);
    await loadData();
    playChime('success');
  };

  // Handlers for shifts
  const handleUpdateShift = async (id: string, data: Partial<Shift>) => {
    await api.updateShift(id, data);
    await loadData();
  };

  const handleAddShift = async (data: Partial<Shift>) => {
    await api.createShift(data);
    await loadData();
    playChime('success');
  };

  // Handlers for attendance
  const handleQuickCheckInSubmit = async (data: any) => {
    await api.checkInManual(data);
    await loadData();
    playChime('success');
  };

  const handleDeleteRecord = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa bản ghi điểm danh này?')) {
      await api.deleteAttendance(id);
      await loadData();
    }
  };

  const handleUpdateRecord = async (id: string, updates: Partial<AttendanceRecord>) => {
    await api.updateAttendance(id, updates);
    await loadData();
  };

  const handleUpdateBotConfig = async (cfg: Partial<BotConfig>) => {
    const updated = await api.updateBotConfig(cfg);
    setBotConfig(updated);
    playChime('success');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeShift={activeShift}
        stats={stats}
        onOpenQuickCheckIn={() => {
          setQuickCheckInDriverId(undefined);
          setShowQuickCheckIn(true);
        }}
        onOpenLogs={() => setShowLogsDrawer(true)}
        onRefresh={loadData}
        isLoading={isLoading}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* TAB 1: ATTENDANCE BOARD */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <Dashboard
              stats={stats}
              recentRecords={records}
              activeShift={activeShift}
              drivers={drivers}
              onOpenSimulator={() => setActiveTab('simulator')}
              onFilterStatus={(status) => setSelectedStatus(status)}
            />

            <LiveAttendanceTable
              records={records}
              drivers={drivers}
              shifts={shifts}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedShift={selectedShift}
              setSelectedShift={setSelectedShift}
              selectedStatus={selectedStatus}
              setSelectedStatus={setSelectedStatus}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onOpenQuickCheckIn={(drvId) => {
                setQuickCheckInDriverId(drvId);
                setShowQuickCheckIn(true);
              }}
              onDeleteRecord={handleDeleteRecord}
              onUpdateRecord={handleUpdateRecord}
            />
          </div>
        )}

        {/* TAB 2: ZALO BOT SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
              <div>
                <h2 className="text-base font-bold text-white">Mô Phỏng Trực Quan Tin Nhắn Nhóm Zalo</h2>
                <p className="text-xs text-slate-400">
                  Thử nghiệm gửi tin nhắn điểm danh từ các tài xế khác nhau và xem phản hồi tự động của Bot
                </p>
              </div>
            </div>

            <ZaloBotSimulator
              drivers={drivers}
              onAttendanceUpdated={loadData}
            />
          </div>
        )}

        {/* TAB 3: DRIVERS & VEHICLES */}
        {activeTab === 'drivers' && (
          <DriverManagement
            drivers={drivers}
            shifts={shifts}
            onAddDriver={handleAddDriver}
            onUpdateDriver={handleUpdateDriver}
            onDeleteDriver={handleDeleteDriver}
            onBulkImport={handleBulkImportDrivers}
            onRefreshList={loadData}
          />
        )}

        {/* TAB 4: SHIFT MANAGEMENT */}
        {activeTab === 'shifts' && (
          <ShiftManagement
            shifts={shifts}
            onUpdateShift={handleUpdateShift}
            onAddShift={handleAddShift}
          />
        )}

        {/* TAB 5: REPORTS & STATS */}
        {activeTab === 'reports' && (
          <ReportsAndStats
            records={records}
            drivers={drivers}
            shifts={shifts}
            stats={stats}
            selectedDate={selectedDate}
          />
        )}

        {/* TAB 6: SETUP & HOSTING GUIDE */}
        {activeTab === 'setup' && (
          <ZaloBotSetupGuide
            botConfig={botConfig}
            onUpdateConfig={handleUpdateBotConfig}
          />
        )}
      </main>

      {/* Quick Check In Modal */}
      {showQuickCheckIn && (
        <QuickCheckinModal
          drivers={drivers}
          shifts={shifts}
          onClose={() => setShowQuickCheckIn(false)}
          onSubmitCheckIn={handleQuickCheckInSubmit}
          preselectedDriverId={quickCheckInDriverId}
        />
      )}

      {/* Webhook Logs Drawer */}
      <WebhookLogDrawer
        isOpen={showLogsDrawer}
        onClose={() => setShowLogsDrawer(false)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>Zalo Fleet Attendance System &copy; 2026 • Tự động hóa điểm danh đội xe qua Zalo Bot</span>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-mono text-[11px]">Webhook: /api/zalo/webhook</span>
            <span className="text-emerald-400 font-bold">• 24/7 Server Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
