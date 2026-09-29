const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server.ts');
let content = fs.readFileSync(serverFile, 'utf8');

// 1. Replace driver routes: 'Khu vực Thanh Hóa / Nội thành' and 'Thanh Hóa - Giao hàng nhanh'
content = content.replace(/route:\s*'Khu vực Thanh Hóa \/ Nội thành'/g, "route: 'Khu vực Tĩnh Gia, Thanh Hóa'");
content = content.replace(/route:\s*'Thanh Hóa - Giao hàng nhanh'/g, "route: 'Khu vực Tĩnh Gia, Thanh Hóa'");
content = content.replace(/route:\s*'Khu vực TP\. Thanh Hóa \(Nội thành giao đồ ăn\)'/g, "route: 'Khu vực Tĩnh Gia, Thanh Hóa'");
content = content.replace(/route:\s*'Kho Hà Nội - Bắc Ninh - KCN Quế Võ'/g, "route: 'Khu vực Tĩnh Gia, Thanh Hóa'");
content = content.replace(/route:\s*'Khu vực Đống Đa - Cầu Giấy \(Food Hub\)'/g, "route: 'Khu vực Tĩnh Gia, Thanh Hóa'");

// 2. Replace drv-01 Tuấn
const oldDrv01 = `  {
    id: 'drv-01',
    name: 'Nguyễn Văn Tuấn',
    phone: '0912343389', // Tail 3389
    zaloName: 'Tuấn Nguyễn (Xế 29C)',
    licensePlate: '29C-882.14',
    vehicleType: 'Xe tải 3.5T - 8T',
    route: 'Khu vực Tĩnh Gia, Thanh Hóa',
    active: true,
    notes: 'Tài xế ví dụ mẫu (Mã đuôi: 3389, online3389)',
    defaultShiftId: 'shift-morning'
  }`;

const newDrv01 = `  {
    id: 'drv-01',
    name: 'Nguyễn Văn Tuấn',
    phone: '0912343389', // Tail 3389
    zaloName: 'Tuấn Nguyễn (Đuôi 3389)',
    licensePlate: '36B-3389',
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia, Thanh Hóa',
    active: true,
    notes: 'Tài xế ví dụ mẫu (Mã đuôi: 3389, checkin3389/online3389)',
    defaultShiftId: 'shift-morning'
  }`;

content = content.replace(oldDrv01, newDrv01);

// 3. Replace att-01
content = content.replace(
  `    licensePlate: '29E1-882.14',\n    vehicleType: 'Xe máy có thùng giữ nhiệt',\n    route: 'Khu vực Tĩnh Gia, Thanh Hóa',`,
  `    licensePlate: '36B-3389',\n    vehicleType: 'Xe máy có thùng giữ nhiệt',\n    route: 'Khu vực Tĩnh Gia, Thanh Hóa',`
);
content = content.replace(
  `zaloSenderName: 'Tuấn Nguyễn (Shipper 29E1)'`,
  `zaloSenderName: 'Tuấn Nguyễn (Đuôi 3389)'`
);
content = content.replace(
  `note: 'Kẹt xe đường Lê Hoàn'`,
  `note: 'Kẹt xe Quốc Lộ 1A Tĩnh Gia'`
);

// 4. Replace companyKnowledge section 2
const oldCompKnowSec2 = `2. ĐẶC THÙ HOẠT ĐỘNG:
- Phương tiện: 100% XE MÁY (Xe số, xe tay ga, xe máy điện) có trang bị thùng giữ nhiệt giao đồ ăn.
- Mặt hàng: Đồ ăn nóng, cơm trưa, đồ uống/trà sữa, thức ăn nhanh, đồ ăn đêm, bánh ngọt.
- Khu vực hoạt động: Các quận nội thành, trung tâm thương mại, khu văn phòng, khu dân cư, tuyến ẩm thực.`;

const newCompKnowSec2 = `2. ĐẶC THÙ HOẠT ĐỘNG & ĐỊA BÀN HOẠT ĐỘNG:
- ĐỊA BÀN HOẠT ĐỘNG DUY NHẤT: Thị xã Tĩnh Gia (TX Nghi Sơn), tỉnh Thanh Hóa.
- Đội ngũ tài xế / shipper CHỈ LÀM VIỆC TẠI TĨNH GIA, THANH HÓA. Tuyệt đối KHÔNG hoạt động ở bất kỳ tỉnh thành hay địa phương nào khác ngoài Tĩnh Gia, Thanh Hóa.
- Phương tiện: 100% XE MÁY (Xe số, xe tay ga, xe máy điện) có trang bị thùng giữ nhiệt giao đồ ăn.
- Mặt hàng: Đồ ăn nóng, cơm trưa, đồ uống/trà sữa, thức ăn nhanh, đồ ăn đêm, bánh ngọt.
- Khu vực giao hàng: Toàn bộ địa bàn Thị xã Tĩnh Gia (Nghi Sơn), Thanh Hóa: Chợ Còng, Hải Hòa, Ninh Hải, Hải Bình, Hải Thượng, Mai Lâm, Trúc Lâm, Cảng Nghi Sơn, các khu dân cư và tuyến ẩm thực.`;

content = content.replace(oldCompKnowSec2, newCompKnowSec2);

// 5. Replace aiSystemPrompt
const oldAiPrompt = `3. Khi shipper chém gió, hỏi chuyện phiếm, đùa vui, tâm sự, hỏi thời tiết mưa nắng, kẹt xe, món ăn ngon, động viên: Hãy giao lưu hóm hỉnh, ấm áp, chúc "Nổ thật nhiều đơn / Giao nhanh đúng hẹn / Vạn dặm bình an"!`;

const newAiPrompt = `3. ĐỊA BÀN HOẠT ĐỘNG CỦA ĐỘI NGŨ:
   • Đội ngũ tài xế và hệ thống CHỈ LÀM VIỆC TẠI ĐỊA BÀN TĨNH GIA (TX NGHI SƠN), TỈNH THANH HÓA. Tuyệt đối không hoạt động ở Hà Nội, TP.HCM, Đà Nẵng, Hải Phòng hay bất kỳ tỉnh thành nào khác ngoài Tĩnh Gia, Thanh Hóa.
   • Nếu bất kỳ ai hỏi về khu vực hoạt động hoặc hỏi các tỉnh khác: Hãy khẳng định rõ ràng, dứt khoát rằng hệ thống và anh em shipper CHỈ hoạt động phục vụ tại Tĩnh Gia - Nghi Sơn, tỉnh Thanh Hóa!
4. Khi shipper chém gió, hỏi chuyện phiếm, đùa vui, tâm sự, hỏi thời tiết mưa nắng, kẹt xe, món ăn ngon, động viên: Hãy giao lưu hóm hỉnh, ấm áp, chúc "Nổ thật nhiều đơn / Giao nhanh đúng hẹn / Vạn dặm bình an"!`;

content = content.replace(oldAiPrompt, newAiPrompt);

// 6. Replace webhookLogs
content = content.replace(`groupId: 'group_fleet_hanoi',\n    groupName: 'ĐỘI XE VẬN TẢI HÀ NỘI',`, `groupId: 'group_fleet_tinhgia',\n    groupName: 'ĐỘI XE TĨNH GIA - THANH HÓA',`);
content = content.replace(`matchedPlate: '29C-882.14',`, `matchedPlate: '36B-3389',`);
content = content.replace(`senderId: 'zalo_user_tuan29c',\n    senderName: 'Tuấn Nguyễn (Xế 29C)',`, `senderId: 'zalo_user_tuan3389',\n    senderName: 'Tuấn Nguyễn (Đuôi 3389)',`);
content = content.replace(`Tài xế Nguyễn Văn Tuấn (0912.34.3389 - Mã: 3389) lúc 05:52:10`, `Tài xế Nguyễn Văn Tuấn (Xe 36B-3389 - Mã: 3389) lúc 05:52:10`);

// 7. Replace driverLocations block
const oldLocStart = `// In-memory Real-time GPS Locations for active fleet\nlet driverLocations: DriverLocation[] = [`;
const oldLocEnd = `    lastUpdated: new Date().toISOString(),\n    isSimulated: true\n  }\n];`;

const newLocBlock = `// In-memory Real-time GPS Locations for active fleet (Khu vực Tĩnh Gia, Thanh Hóa)
let driverLocations: DriverLocation[] = [
  {
    driverId: 'drv-01',
    driverName: 'Nguyễn Văn Tuấn',
    phone: '0912343389',
    tailCode: '3389',
    licensePlate: '36B-3389',
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia, Thanh Hóa',
    lat: 19.4520,
    lng: 105.7850,
    speed: 38,
    heading: 65,
    accuracy: 5,
    battery: 88,
    status: 'running',
    address: 'Đường Quốc lộ 1A, Phường Hải Hòa, TX. Nghi Sơn (Tĩnh Gia), Thanh Hóa',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  },
  {
    driverId: 'drv-vg-01',
    driverName: 'Bùi Bá Vũ',
    phone: '0978273026',
    tailCode: '3026',
    licensePlate: '36B-3026',
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia, Thanh Hóa',
    lat: 19.4620,
    lng: 105.7910,
    speed: 28,
    heading: 140,
    accuracy: 8,
    battery: 92,
    status: 'running',
    address: 'Khu đô thị Bắc Tĩnh Gia, Phường Ninh Hải, TX. Nghi Sơn, Thanh Hóa',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  },
  {
    driverId: 'drv-vg-02',
    driverName: 'Đậu Văn Học',
    phone: '0986388813',
    tailCode: '8813',
    licensePlate: '36B-8813',
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia, Thanh Hóa',
    lat: 19.4410,
    lng: 105.7790,
    speed: 0,
    heading: 210,
    accuracy: 4,
    battery: 75,
    status: 'stopped',
    address: 'Đường Đào Duy Từ, Phường Hải Bình, TX. Nghi Sơn (Tĩnh Gia), Thanh Hóa',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  },
  {
    driverId: 'drv-vg-03',
    driverName: 'Hà Trọng Huy',
    phone: '0395987438',
    tailCode: '7438',
    licensePlate: '36B-7438',
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia, Thanh Hóa',
    lat: 19.4500,
    lng: 105.7820,
    speed: 35,
    heading: 320,
    accuracy: 6,
    battery: 64,
    status: 'running',
    address: 'Khu vực Chợ Còng, Phường Hải Hòa, Tĩnh Gia, Thanh Hóa',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  },
  {
    driverId: 'drv-vg-07',
    driverName: 'Lê Văn Sức',
    phone: '0969397370',
    tailCode: '7370',
    licensePlate: '36B-7370',
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia, Thanh Hóa',
    lat: 19.3850,
    lng: 105.7900,
    speed: 40,
    heading: 300,
    accuracy: 5,
    battery: 81,
    status: 'running',
    address: 'Đường vào Cảng Nghi Sơn, Hải Thượng, Tĩnh Gia, Thanh Hóa',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  },
  {
    driverId: 'drv-vg-10',
    driverName: 'Mai Đắc Anh',
    phone: '0368142206',
    tailCode: '2206',
    licensePlate: '36B-2206',
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia, Thanh Hóa',
    lat: 19.4750,
    lng: 105.7720,
    speed: 0,
    heading: 90,
    accuracy: 3,
    battery: 95,
    status: 'idle',
    address: 'Phường Nguyên Bình, TX. Nghi Sơn (Tĩnh Gia), Thanh Hóa',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  },
  {
    driverId: 'drv-vg-16',
    driverName: 'Nguyễn Việt Cương',
    phone: '0967659655',
    tailCode: '9655',
    licensePlate: '36AB-87870',
    vehicleType: 'Xe máy giao đồ ăn',
    route: 'Khu vực Tĩnh Gia, Thanh Hóa',
    lat: 19.4100,
    lng: 105.7650,
    speed: 32,
    heading: 180,
    accuracy: 4,
    battery: 78,
    status: 'running',
    address: 'Phường Trúc Lâm, TX. Nghi Sơn (Tĩnh Gia), Thanh Hóa',
    lastUpdated: new Date().toISOString(),
    isSimulated: true
  }
];`;

const locIdx1 = content.indexOf(oldLocStart);
if (locIdx1 !== -1) {
  const locIdx2 = content.indexOf('// Helper functions', locIdx1);
  if (locIdx2 !== -1) {
    content = content.slice(0, locIdx1) + newLocBlock + '\n\n' + content.slice(locIdx2);
    console.log('✅ Replaced driverLocations successfully');
  }
}

// 8. Replace warehouse / kho bãi and petrol rules
const oldWarehouseCheck = `  // 3. Check for warehouse / kho bãi
  if (normQ.includes('kho') || normQ.includes('dia chi') || normQ.includes('bai xe') || normQ.includes('tan binh') || normQ.includes('ha noi') || normQ.includes('da nang')) {
    return \`🏢 [ĐỊA CHỈ HỆ THỐNG KHO BÃI]:\\n\` +
      \`📍 Kho Hà Nội: Số 18 Đường Phạm Hùng, Nam Từ Liêm (Mở cửa 05:30 - 23:00)\\n\` +
      \`📍 Kho Tân Bình: 142 Trường Chinh, P.13, Tân Bình, TP.HCM (Mở cửa 24/24)\\n\` +
      \`📍 Kho Đà Nẵng: Lô B2, KCN Hòa Khánh, Liên Chiểu (06:00 - 22:00)\\n\` +
      \`Bác tài giao nhận hàng đúng khung giờ quy định nhé! 📦\`;
  }`;

const newWarehouseCheck = `  // 3. Check for warehouse / kho bãi / địa bàn hoạt động
  if (normQ.includes('kho') || normQ.includes('dia chi') || normQ.includes('bai xe') || normQ.includes('dia ban') || normQ.includes('tinh gia') || normQ.includes('o dau') || normQ.includes('tinh nao') || normQ.includes('khu vuc') || normQ.includes('ha noi') || normQ.includes('sai gon') || normQ.includes('da nang')) {
    return \`🏢 [ĐỊA BÀN HOẠT ĐỘNG & ĐIỀU HÀNH ĐỘI XE]:\\n\` +
      \`📍 ĐỊA BÀN HOẠT ĐỘNG DUY NHẤT: Thị xã Tĩnh Gia (TX Nghi Sơn), tỉnh Thanh Hóa.\\n\` +
      \`📍 Đội ngũ tài xế / shipper CHỈ LÀM VIỆC TẠI TĨNH GIA, THANH HÓA (Tuyệt đối không hoạt động ở bất kỳ tỉnh thành nào khác).\\n\\n\` +
      \`👉 Mọi thắc mắc công việc và hỗ trợ tài xế vui lòng liên hệ:\\n\` +
      \`• Anh Cương: 0967.659.655 (Chuyên hỗ trợ mọi vấn đề về tài xế)\\n\` +
      \`• Anh Sức: 0969.397.370 (Hỗ trợ giải quyết công việc đội xe)\\n\` +
      \`• Các vấn đề ngoài phạm vi của Cương & Sức: Liên hệ Anh Linh giải quyết.\`;
  }`;

content = content.replace(oldWarehouseCheck, newWarehouseCheck);

// 9. Replace petrol
const oldPetrol = `  // 4. Check for petrol / xăng dầu / định mức
  if (normQ.includes('xang') || normQ.includes('dau') || normQ.includes('hoa don') || normQ.includes('dinh muc') || normQ.includes('mst')) {
    return \`⛽ [QUY ĐỊNH XĂNG DẦU & HÓA ĐƠN]:\\n\` +
      \`- Đổ tại cây xăng Petrolimex trên toàn quốc.\\n\` +
      \`- Lấy hóa đơn VAT MST Công ty: 0108998877.\\n\` +
      \`- Định mức: Xe 1.25-2.5T: 11L/100km | Xe 3.5-8T: 16L/100km | Xe Container: 38L/100km.\\n\` +
      \`- Mọi thắc mắc liên hệ Anh Cương: 0967.659.655 hoặc Anh Sức: 0969.397.370.\`;
  }`;

const newPetrol = `  // 4. Check for petrol / xăng dầu / tiếp nhiên liệu
  if (normQ.includes('xang') || normQ.includes('dau') || normQ.includes('hoa don') || normQ.includes('dinh muc') || normQ.includes('mst')) {
    return \`⛽ [QUY ĐỊNH XĂNG DẦU & TIẾP NHIÊN LIỆU]:\\n\` +
      \`- Bác tài chủ động đổ xăng tại các cây xăng Petrolimex trên địa bàn Tĩnh Gia, Thanh Hóa.\\n\` +
      \`- Đội xe hoạt động 100% bằng xe máy giao đồ ăn nội hạt Tĩnh Gia.\\n\` +
      \`- Mọi thắc mắc hoặc cần hỗ trợ liên hệ Anh Cương: 0967.659.655 hoặc Anh Sức: 0969.397.370.\`;
  }`;

content = content.replace(oldPetrol, newPetrol);

// 10. Replace food suggestions
const oldFood = `  if (normQ.includes('an gi') || normQ.includes('quan an') || normQ.includes('com binh dan') || normQ.includes('uong gi') || normQ.includes('cafe')) {
    return \`🍲 [AI GỢI Ý MÓN NGON CHO BÁC TÀI ☕]:\\n\` +
      \`Chào bác \${senderName}! Chạy xe đường dài nhớ ăn uống đủ chất nhé:\\n\` +
      \`• Sáng: Làm tô Phở Bò nóng hổi hoặc Bún Chả thêm ly cà phê đen đá tỉnh táo!\\n\` +
      \`• Trưa: Ghé quán cơm bình dân dọc tuyến, nhớ gọi thêm canh chua giải nhiệt.\\n\` +
      \`• Tối: Thưởng thức bữa cơm ấm cúng cùng gia đình sau một ngày làm việc chăm chỉ! 🚚🍲\`;
  }`;

const newFood = `  if (normQ.includes('an gi') || normQ.includes('quan an') || normQ.includes('com binh dan') || normQ.includes('uong gi') || normQ.includes('cafe')) {
    return \`🍲 [AI GỢI Ý MÓN NGON TĨNH GIA CHO BÁC TÀI ☕]:\\n\` +
      \`Chào bác \${senderName}! Chạy đơn tại Tĩnh Gia nhớ ăn uống đủ chất nhé:\\n\` +
      \`• Sáng: Làm tô Bún bò, Bánh cuốn nóng hoặc Cháo lươn thêm ly cà phê đen đá tỉnh táo!\\n\` +
      \`• Trưa: Ghé cơm bình dân khu Chợ Còng hoặc Hải Hòa, nhớ ăn nhiều canh giải nhiệt.\\n\` +
      \`• Tối: Thưởng thức hải sản Nghi Sơn tươi ngon tiếp thêm năng lượng! 🛵🍲\`;
  }`;

content = content.replace(oldFood, newFood);

// 11. Example question in trogiupvietgo
content = content.replace(`• SĐT & trạng thái tài xế (VD: "ai sdt anh Tuấn 29C?")`, `• SĐT & trạng thái tài xế (VD: "ai sdt anh Tuấn 3389?" hoặc "ai sdt anh Cương?")`);

fs.writeFileSync(serverFile, content, 'utf8');
console.log('✅ Updated server.ts for Tĩnh Gia Thanh Hóa successfully!');
