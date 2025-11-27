// Simple in-memory data store for demo purposes only
// Kho dữ liệu trong bộ nhớ để demo API

const buses = new Map();
const drivers = new Map();
const schedules = new Map();

// Hàm tạo ID duy nhất
function generateId(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

// Hàm chuyển Map thành Array
function toArray(map) {
  return Array.from(map.values());
}

// Thêm dữ liệu mẫu để test API
function initializeSampleData() {
  // Thêm xe bus mẫu
  const sampleBuses = [
    {
      id: "bus_001",
      code: "BUS001",
      plate: "29A-12345",
      capacity: 50,
      status: "active",
      driverId: "drv_001",
      lastPosition: {
        lat: 21.0285,
        lng: 105.8542,
        ts: new Date().toISOString(),
      },
    },
    {
      id: "bus_002",
      code: "BUS002",
      plate: "29B-67890",
      capacity: 45,
      status: "active",
      driverId: "drv_002",
      lastPosition: { lat: 21.03, lng: 105.86, ts: new Date().toISOString() },
    },
    {
      id: "bus_003",
      code: "BUS003",
      plate: "29C-11111",
      capacity: 40,
      status: "maintenance",
      driverId: null,
      lastPosition: null,
    },
  ];

  // Thêm tài xế mẫu
  const sampleDrivers = [
    {
      id: "drv_001",
      name: "Nguyễn Văn An",
      phone: "0901234567",
      licenseNo: "A123456789",
      status: "active",
    },
    {
      id: "drv_002",
      name: "Trần Thị Bình",
      phone: "0907654321",
      licenseNo: "B987654321",
      status: "active",
    },
    {
      id: "drv_003",
      name: "Lê Văn Cường",
      phone: "0905555555",
      licenseNo: "C555555555",
      status: "inactive",
    },
  ];

  // Thêm lịch trình mẫu
  const sampleSchedules = [
    {
      id: "sch_001",
      date: "2024-01-15",
      routeName: "Tuyến A - Trường Tiểu học ABC",
      busId: "bus_001",
      driverId: "drv_001",
      startTime: "07:00",
      endTime: "08:30",
      status: "scheduled",
    },
    {
      id: "sch_002",
      date: "2024-01-15",
      routeName: "Tuyến B - Trường THCS XYZ",
      busId: "bus_002",
      driverId: "drv_002",
      startTime: "07:15",
      endTime: "08:45",
      status: "in_progress",
    },
    {
      id: "sch_003",
      date: "2024-01-15",
      routeName: "Tuyến C - Trường THPT DEF",
      busId: null,
      driverId: null,
      startTime: "07:30",
      endTime: "09:00",
      status: "scheduled",
    },
  ];

  // Thêm dữ liệu vào Map
  sampleBuses.forEach((bus) => buses.set(bus.id, bus));
  sampleDrivers.forEach((driver) => drivers.set(driver.id, driver));
  sampleSchedules.forEach((schedule) => schedules.set(schedule.id, schedule));

  console.log(" Đã khởi tạo dữ liệu mẫu:");
  console.log(`   - ${buses.size} xe bus`);
  console.log(`   - ${drivers.size} tài xế`);
  console.log(`   - ${schedules.size} lịch trình`);
}

// Khởi tạo dữ liệu mẫu khi load module
initializeSampleData();

export {
  buses,
  drivers,
  schedules,
  generateId,
  toArray,
};
