const fs = require('fs');
const path = require('path');

// 1. Update server.ts
const serverPath = path.resolve(__dirname, '../server.ts');
let serverContent = fs.readFileSync(serverPath, 'utf8');

console.log('1. Updating server.ts...');

// Replace all Xe tải in vehicleType in drivers array
serverContent = serverContent.replace(/vehicleType:\s*'Xe tải 1\.25T - 2\.5T'/g, "vehicleType: 'Xe máy giao đồ ăn'");
serverContent = serverContent.replace(/vehicleType:\s*'Xe tải 3\.5T - 8T'/g, "vehicleType: 'Xe máy giao đồ ăn'");
serverContent = serverContent.replace(/vehicleType:\s*'Xe máy giao hàng'/g, "vehicleType: 'Xe máy giao đồ ăn'");

// Replace fallback defaults
serverContent = serverContent.replace(/vehicleType:\s*data\.vehicleType\s*\|\|\s*'Xe tải 1\.25T - 2\.5T'/g, "vehicleType: data.vehicleType || 'Xe máy giao đồ ăn'");
serverContent = serverContent.replace(/vehicleType:\s*item\.vehicleType\s*\|\|\s*'Xe tải 1\.25T - 2\.5T'/g, "vehicleType: item.vehicleType || 'Xe máy giao đồ ăn'");

// Update drv-01 Tuấn Nguyễn
const oldDrv01 = `  {
    id: 'drv-01',
    name: 'Nguyễn Văn Tuấn',
    phone: '0912343389', // Tail 3389
    zaloName: 'Tuấn Nguyễn (Xế 29C)',
    licensePlate: '29C-882.14',
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Kho Hà Nội - Bắc Ninh - KCN Quế Võ',
    active: true,
    notes: 'Tài xế ví dụ mẫu (Mã đuôi: 3389, online3389)',
    defaultShiftId: 'shift-morning'
  }`;

const newDrv01 = `  {
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
  }`;

if (serverContent.includes(oldDrv01)) {
  serverContent = serverContent.replace(oldDrv01, newDrv01);
  console.log('  ✅ Updated drv-01 Tuấn Nguyễn');
}

// Update routes for all drv-vg drivers to Tĩnh Gia - Nghi Sơn
serverContent = serverContent.replace(/route:\s*'Khu vực Thanh Hóa \/ Nội thành'/g, "route: 'Khu vực Tĩnh Gia - Nghi Sơn'");
serverContent = serverContent.replace(/route:\s*'Thanh Hóa - Giao hàng nhanh'/g, "route: 'Khu vực Tĩnh Gia - Nghi Sơn'");

// Update webhookLogs log-01
serverContent = serverContent.replace("groupName: 'ĐỘI XE VẬN TẢI HÀ NỘI'", "groupName: 'ĐỘI TÀI XẾ VIETGO TĨNH GIA'");
serverContent = serverContent.replace("licensePlate: '29C-882.14'", "licensePlate: '36B-3389'");
serverContent = serverContent.replace("message: 'online3389 48250km'", "message: 'online3389 6h-14h'");
serverContent = serverContent.replace("replySent: '✅ [ĐIỂM DANH THÀNH CÔNG] Tài xế Nguyễn Văn Tuấn (0912.34.3389 - Mã: 3389) lúc 05:52:10'", "replySent: '✅ [ĐIỂM DANH THÀNH CÔNG] Tài xế Nguyễn Văn Tuấn (Mã: 3389) lúc 05:52:10'");

// Update driverLocations GPS simulation to Tĩnh Gia motorbike fleet
const oldLocationsBlock = `let driverLocations: DriverLocation[] = [
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
  }
];`;

const newLocationsBlock = `let driverLocations: DriverLocation[] = [
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
];`;

if (serverContent.includes('let driverLocations: DriverLocation[] = [')) {
  const startIdx = serverContent.indexOf('let driverLocations: DriverLocation[] = [');
  const endIdx = serverContent.indexOf('];', startIdx) + 2;
  serverContent = serverContent.substring(0, startIdx) + newLocationsBlock + serverContent.substring(endIdx);
  console.log('  ✅ Updated driverLocations to Tĩnh Gia motorbike fleet');
}

// Update joke in server.ts
const oldJoke = `      \`Cảnh sát giao thông tuýt còi một bác tài xe tải:\\n\` +
      \`- "Bác tài! Xe chở quá tải, sao bác lại chở theo cả đàn vịt sau thùng thế này?"\\n\` +
      \`- Bác tài gãi đầu gãi tai: "Dạ thưa sếp, xe em quá tải thật nhưng đàn vịt nó biết bay sếp ạ, vừa chạy em vừa bắt chúng nó bay lơ lửng trong thùng xe cho nhẹ bớt tải đấy chứ!" 😂\\n\\n\` +
      \`Chúc bác \${senderName} và toàn thể anh em có một ngày chạy xe thật vui vẻ, tỉnh táo và không lo quá tải! 🚗💨\`;`;

const newJoke = `      \`Cảnh sát giao thông tuýt còi một bác tài xe máy giao đồ ăn:\\n\` +
      \`- "Bác tài! Thùng hàng phía sau sao lại nghe tiếng vịt kêu cạp cạp thế này?"\\n\` +
      \`- Bác tài gãi đầu cười toe toét: "Dạ thưa sếp, đơn khách đặt Gỏi Vịt Nhân Loan nóng hổi, em bảo quán làm vịt tươi ngon thì nó phải kêu để chứng minh chất lượng sếp ơi!" 😂\\n\\n\` +
      \`Chúc bác \${senderName} và toàn thể anh em có một ngày chạy xe thật vui vẻ, tỉnh táo và nổ đơn liên tục nhé! 🛵💨\`;`;

if (serverContent.includes(oldJoke)) {
  serverContent = serverContent.replace(oldJoke, newJoke);
  console.log('  ✅ Updated joke to motorbike delivery');
}

// Replace groupName 'ĐỘI XE VẬN TẢI' with 'ĐỘI TÀI XẾ VIETGO TĨNH GIA'
serverContent = serverContent.replace(/groupName:\s*'ĐỘI XE VẬN TẢI'/g, "groupName: 'ĐỘI TÀI XẾ VIETGO TĨNH GIA'");
serverContent = serverContent.replace(/groupName\s*\|\|\s*'ĐỘI XE VẬN TẢI'/g, "groupName || 'ĐỘI TÀI XẾ VIETGO TĨNH GIA'");
serverContent = serverContent.replace(/groupName:\s*groupName\s*\|\|\s*'ĐỘI XE VẬN TẢI \(Mô phỏng\)'/g, "groupName: groupName || 'ĐỘI TÀI XẾ VIETGO TĨNH GIA (Mô phỏng)'");

fs.writeFileSync(serverPath, serverContent, 'utf8');
console.log('🎉 Saved server.ts successfully!');

// 2. Update attendance_records.json
const attendancePath = path.resolve(__dirname, '../attendance_records.json');
if (fs.existsSync(attendancePath)) {
  console.log('\n2. Updating attendance_records.json...');
  let attContent = fs.readFileSync(attendancePath, 'utf8');
  attContent = attContent.replace(/"vehicleType":\s*"Xe tải 1\.25T - 2\.5T"/g, '"vehicleType": "Xe máy giao đồ ăn"');
  attContent = attContent.replace(/"vehicleType":\s*"Xe tải 3\.5T - 8T"/g, '"vehicleType": "Xe máy giao đồ ăn"');
  attContent = attContent.replace(/"vehicleType":\s*"Xe máy giao hàng"/g, '"vehicleType": "Xe máy giao đồ ăn"');
  fs.writeFileSync(attendancePath, attContent, 'utf8');
  console.log('🎉 Saved attendance_records.json successfully!');
}

// 3. Update DriverManagement.tsx
const driverMgmtPath = path.resolve(__dirname, '../src/components/DriverManagement.tsx');
if (fs.existsSync(driverMgmtPath)) {
  console.log('\n3. Updating DriverManagement.tsx...');
  let dmContent = fs.readFileSync(driverMgmtPath, 'utf8');
  dmContent = dmContent.replace(/vehicleType:\s*\(parts\[4\] as VehicleType\)\s*\|\|\s*'Xe tải 1\.25T - 2\.5T'/g, "vehicleType: (parts[4] as VehicleType) || 'Xe máy giao đồ ăn'");
  fs.writeFileSync(driverMgmtPath, dmContent, 'utf8');
  console.log('🎉 Saved DriverManagement.tsx successfully!');
}

// 4. Update ZaloBotSimulator.tsx
const simPath = path.resolve(__dirname, '../src/components/ZaloBotSimulator.tsx');
if (fs.existsSync(simPath)) {
  console.log('\n4. Updating ZaloBotSimulator.tsx...');
  let simContent = fs.readFileSync(simPath, 'utf8');
  simContent = simContent.replace("groupName: 'ĐỘI XE VẬN TẢI - ĐIỂM DANH & HỖ TRỢ'", "groupName: 'ĐỘI TÀI XẾ VIETGO TĨNH GIA'");
  simContent = simContent.replace("<span>ĐỘI XE VẬN TẢI & TRỢ LÝ DEEPSEEK AI</span>", "<span>ĐỘI TÀI XẾ VIETGO TĨNH GIA & TRỢ LÝ DEEPSEEK AI</span>");
  fs.writeFileSync(simPath, simContent, 'utf8');
  console.log('🎉 Saved ZaloBotSimulator.tsx successfully!');
}
