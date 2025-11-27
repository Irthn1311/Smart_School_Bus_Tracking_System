# 🧪 API Testing Guide - Postman

Hướng dẫn chi tiết test API của Smart School Bus Tracking System.

## 📦 Files

- `SSB_API_Collection.postman_collection.json` - Collection chứa **56 endpoints**
- `SSB_Local_Environment.postman_environment.json` - Environment variables cho local testing

---

## 🚀 Quick Start

### 1. Import vào Postman

1. Mở **Postman**
2. Click **Import** (góc trên bên trái)
3. Chọn 2 files:
   - `SSB_API_Collection.postman_collection.json`
   - `SSB_Local_Environment.postman_environment.json`
4. Click **Import**

### 2. Chọn Environment

1. Ở góc phải trên, chọn dropdown **Environment**
2. Chọn **"SSB - Local Development"**

### 3. Khởi động Server

```bash
cd ssb-backend
npm run dev
```

Server sẽ chạy tại: `http://localhost:4000`

---

## 📋 Testing Flow (Recommended Order)

### **Flow 1: Full CRUD Test**

```
1. Health Check
   ↓
2. Register Admin → Login Admin (Save token)
   ↓
3. Create Bus → Update Bus → Get Bus → Delete Bus
   ↓
4. Create Driver → Update Driver → Get Driver → Delete Driver
   ↓
5. Create Student → Update Student → Get Student → Delete Student
   ↓
6. Create Route → Add Stops → Update Route → Delete Route
   ↓
7. Create Schedule → Update Schedule → Delete Schedule
   ↓
8. Create Trip → Start Trip → End Trip → Delete Trip
```

### **Flow 2: Real-World Scenario**

```
1. Setup: Register & Login
   ↓
2. Infrastructure:
   - Create Bus (29A-12345)
   - Create Driver (Nguyễn Văn Tài)
   - Create Student (Nguyễn Văn An)
   ↓
3. Route Planning:
   - Create Route (Tuyến 1)
   - Add Stop 1 (Ngã tư Lê Lợi)
   - Add Stop 2 (Trường ABC)
   ↓
4. Scheduling:
   - Create Schedule (Bus + Driver + Route, 07:00)
   - Verify no conflicts
   ↓
5. Daily Operations:
   - Create Trip for today
   - Add Student to Trip
   - Start Trip (Socket.IO event)
   - Update Bus Position (GPS tracking)
   - Update Student Status (da_len_xe)
   - End Trip (Socket.IO event)
   ↓
6. Analytics:
   - Get Trip Stats
   - Get Driver Stats
   - Get Route Stats
```

---

## 🔐 Authentication

### Register & Login Flow

1. **Register Admin** (1. Authentication folder)

   ```json
   POST /auth/register
   {
     "email": "admin@ssb.com",
     "matKhau": "Admin@123",
     "hoTen": "Quản Trị Viên",
     "soDienThoai": "0901234567",
     "vaiTro": "quan_tri"
   }
   ```

2. **Login Admin**

   ```json
   POST /auth/login
   {
     "email": "admin@ssb.com",
     "matKhau": "Admin@123"
   }
   ```

   ✅ **Auto-saves token** to environment variable `{{token}}`

3. All subsequent requests automatically use the token via Bearer Authentication

---

## 📝 Test Scripts Included

### Auto-Save Variables

Collection includes test scripts that automatically save IDs:

```javascript
// After Login
pm.environment.set("token", jsonData.data.token);
pm.environment.set("userId", jsonData.data.user.maNguoiDung);

// After Create Bus
pm.environment.set("busId", jsonData.data.maXe);

// After Create Driver
pm.environment.set("driverId", jsonData.data.maTaiXe);

// And so on...
```

### Response Validation

```javascript
// Status code checks
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

// Response structure validation
pm.test("Response has success true", function () {
  var jsonData = pm.response.json();
  pm.expect(jsonData.success).to.eql(true);
});
```

---

## 🎯 Testing Each Module

### 1. Authentication (5 endpoints)

| Endpoint         | Method | Description                 |
| ---------------- | ------ | --------------------------- |
| `/auth/register` | POST   | Đăng ký tài khoản mới       |
| `/auth/login`    | POST   | Đăng nhập (auto-save token) |
| `/auth/profile`  | GET    | Xem profile                 |
| `/auth/profile`  | PUT    | Cập nhật profile            |
| `/auth/logout`   | POST   | Đăng xuất                   |

**Test Cases:**

- ✅ Register with all roles (quan_tri, tai_xe, phu_huynh)
- ✅ Login saves token automatically
- ✅ Profile returns user data
- ✅ Duplicate email returns 409

---

### 2. Buses (7 endpoints)

| Endpoint                   | Method | Description                 |
| -------------------------- | ------ | --------------------------- |
| `/buses`                   | GET    | List all buses (pagination) |
| `/buses/:id`               | GET    | Get bus details             |
| `/buses`                   | POST   | Create bus (auto-save ID)   |
| `/buses/:id`               | PUT    | Update bus                  |
| `/buses/:id/assign-driver` | POST   | Assign driver               |
| `/buses/:id/position`      | POST   | Update GPS (Socket.IO)      |
| `/buses/:id`               | DELETE | Delete bus                  |

**Test Cases:**

- ✅ Create bus with valid license plate
- ✅ Invalid capacity (< 10) returns 400
- ✅ Duplicate license plate returns 409
- ✅ Update GPS with valid coordinates
- ✅ Invalid lat/lng returns 400
- ✅ Pagination works (page, limit)
- ✅ Search filter works

**Sample GPS Update:**

```json
POST /buses/{{busId}}/position
{
  "lat": 21.0285,
  "lng": 105.8542,
  "speed": 45,
  "heading": 90
}
```

---

### 3. Drivers (7 endpoints)

| Endpoint                 | Method | Description                  |
| ------------------------ | ------ | ---------------------------- |
| `/drivers`               | GET    | List drivers                 |
| `/drivers/:id`           | GET    | Get driver details           |
| `/drivers`               | POST   | Create driver (auto-save ID) |
| `/drivers/:id`           | PUT    | Update driver                |
| `/drivers/:id/schedules` | GET    | Get driver schedules         |
| `/drivers/stats`         | GET    | Get driver statistics        |
| `/drivers/:id`           | DELETE | Delete driver                |

**Test Cases:**

- ✅ Create driver with valid license
- ✅ Duplicate license returns 409
- ✅ Expired license returns 400
- ✅ Invalid email format returns 400
- ✅ Phone validation (10-11 digits)
- ✅ Get assigned schedules

---

### 4. Students (7 endpoints)

| Endpoint               | Method | Description                   |
| ---------------------- | ------ | ----------------------------- |
| `/students`            | GET    | List students                 |
| `/students/:id`        | GET    | Get student details           |
| `/students/class/:lop` | GET    | Get students by class         |
| `/students`            | POST   | Create student (auto-save ID) |
| `/students/:id`        | PUT    | Update student                |
| `/students/stats`      | GET    | Get student statistics        |
| `/students/:id`        | DELETE | Delete student                |

**Test Cases:**

- ✅ Create student with valid age (3-18)
- ✅ Invalid age returns 400
- ✅ Filter by class works
- ✅ Stats show correct counts

---

### 5. Routes (11 endpoints)

| Endpoint                    | Method | Description                 |
| --------------------------- | ------ | --------------------------- |
| `/routes`                   | GET    | List routes                 |
| `/routes/:id`               | GET    | Get route details           |
| `/routes`                   | POST   | Create route (auto-save ID) |
| `/routes/:id`               | PUT    | Update route                |
| `/routes/:id/stops`         | GET    | Get route stops             |
| `/routes/:id/stops`         | POST   | Add stop (auto-save ID)     |
| `/routes/:id/stops/:stopId` | PUT    | Update stop                 |
| `/routes/:id/stops/:stopId` | DELETE | Delete stop                 |
| `/routes/stats`             | GET    | Get route statistics        |
| `/routes/:id`               | DELETE | Delete route                |

**Test Cases:**

- ✅ Create route with start/end points
- ✅ Add multiple stops with order (thuTu)
- ✅ Invalid coordinates returns 400
- ✅ Duplicate stop order returns 409
- ✅ Update stop details
- ✅ Delete stop from route

**Sample Stop:**

```json
POST /routes/{{routeId}}/stops
{
  "tenDiem": "Ngã tư Lê Lợi",
  "diaChi": "Ngã tư Lê Lợi - Nguyễn Huệ, Quận 1",
  "viDo": 10.7755,
  "kinhDo": 106.7011,
  "thuTu": 1,
  "thoiGianDung": 2
}
```

---

### 6. Schedules (8 endpoints)

| Endpoint                | Method | Description                      |
| ----------------------- | ------ | -------------------------------- |
| `/schedules`            | GET    | List schedules                   |
| `/schedules/:id`        | GET    | Get schedule details             |
| `/schedules/date/:date` | GET    | Get schedules by date            |
| `/schedules`            | POST   | Create schedule (conflict check) |
| `/schedules/:id`        | PUT    | Update schedule                  |
| `/schedules/:id/status` | POST   | Update status (Socket.IO)        |
| `/schedules/stats`      | GET    | Get statistics                   |
| `/schedules/:id`        | DELETE | Delete schedule                  |

**Test Cases:**

- ✅ Create schedule with valid route/bus/driver
- ✅ Conflict detection (same bus/driver at same time) returns 409
- ✅ Invalid time format returns 400
- ✅ Filter by date works
- ✅ Update status emits Socket.IO event

**Conflict Check Example:**

```json
POST /schedules
{
  "maTuyen": "{{routeId}}",
  "maXe": "{{busId}}",
  "maTaiXe": "{{driverId}}",
  "loaiChuyen": "di",
  "gioKhoiHanh": "07:00"
}
```

---

### 7. Trips (11 endpoints)

| Endpoint                         | Method | Description                |
| -------------------------------- | ------ | -------------------------- |
| `/trips`                         | GET    | List trips                 |
| `/trips/:id`                     | GET    | Get trip details           |
| `/trips`                         | POST   | Create trip (auto-save ID) |
| `/trips/:id`                     | PUT    | Update trip                |
| `/trips/:id/start`               | POST   | Start trip (Socket.IO)     |
| `/trips/:id/end`                 | POST   | End trip (Socket.IO)       |
| `/trips/:id/cancel`              | POST   | Cancel trip (Socket.IO)    |
| `/trips/:id/students`            | POST   | Add student to trip        |
| `/trips/:id/students/:studentId` | PUT    | Update student status      |
| `/trips/stats`                   | GET    | Get trip statistics        |
| `/trips/:id`                     | DELETE | Delete trip                |

**Test Cases:**

- ✅ Create trip for schedule + date
- ✅ Duplicate (schedule + date) returns 409
- ✅ Start trip changes state to 'dang_chay'
- ✅ Cannot start already started trip
- ✅ End trip changes state to 'hoan_thanh'
- ✅ Cannot cancel completed trip
- ✅ Add student to trip
- ✅ Update student status (dang_cho → da_len_xe → da_xuong_xe)
- ✅ Stats return correct counts

**Trip State Machine:**

```
chua_khoi_hanh → [Start] → dang_chay → [End] → hoan_thanh
                             ↓
                          [Cancel]
                             ↓
                            huy
```

---

## 🚀 Real-time Testing (Socket.IO)

### Events to Test

1. **Bus Position Updates**

   ```
   Event: bus_location_update
   Trigger: POST /buses/:id/position
   Room: bus-{busId}
   ```

2. **Schedule Status Updates**

   ```
   Event: schedule_status_update
   Trigger: POST /schedules/:id/status
   Room: bus-{busId}
   ```

3. **Trip State Changes**
   ```
   Events: trip_started, trip_completed, trip_cancelled
   Trigger: POST /trips/:id/start|end|cancel
   Room: bus-{busId}
   ```

### How to Test Socket.IO

1. Open browser console on `http://localhost:3000`
2. Connect to Socket.IO:

   ```javascript
   const socket = io("http://localhost:3000");
   socket.emit("join_bus", { busId: "1" });

   socket.on("bus_location_update", (data) => {
     console.log("GPS Update:", data);
   });

   socket.on("trip_started", (data) => {
     console.log("Trip Started:", data);
   });
   ```

3. Trigger events via Postman
4. Watch console for real-time events

---

## 📊 Validation Tests

### Common Validations Across All Modules

| Field          | Validation        | Error Code |
| -------------- | ----------------- | ---------- |
| Email          | Format + Unique   | 400/409    |
| Phone          | 10-11 digits      | 400        |
| Date           | YYYY-MM-DD format | 400        |
| Time           | HH:MM format      | 400        |
| Latitude       | -90 to 90         | 400        |
| Longitude      | -180 to 180       | 400        |
| Age            | 3-18 years        | 400        |
| Capacity       | 10-100            | 400        |
| License Plate  | Valid format      | 400        |
| License Number | Unique            | 409        |

---

## 🔍 Query Parameters

### Pagination (All List Endpoints)

```
GET /api/v1/{module}?page=1&limit=10
```

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)

### Search & Filters

**Buses:**

```
?search=29A&status=hoat_dong&sortBy=bienSoXe&sortDir=asc
```

**Drivers:**

```
?search=Nguyen&status=hoat_dong
```

**Students:**

```
?search=An&lop=1A
```

**Routes:**

```
?search=Tuyen&trangThai=hoat_dong
```

**Schedules:**

```
?maTuyen=1&maXe=2&maTaiXe=3&loaiChuyen=di&dangApDung=true
```

**Trips:**

```
?ngayChay=2025-10-27&trangThai=dang_chay&maTuyen=1
```

---

## ✅ Test Checklist

### Basic CRUD (All Modules)

- [ ] Create with valid data returns 201
- [ ] Create with invalid data returns 400
- [ ] Create duplicate returns 409
- [ ] Get by ID returns 200
- [ ] Get non-existent returns 404
- [ ] Update with valid data returns 200
- [ ] Update non-existent returns 404
- [ ] Delete existing returns 200
- [ ] Delete non-existent returns 404

### Pagination

- [ ] Default pagination (page=1, limit=10)
- [ ] Custom pagination (page=2, limit=20)
- [ ] Invalid page/limit returns default

### Filters

- [ ] Search filter works
- [ ] Status filter works
- [ ] Date filter works
- [ ] Multiple filters work together

### Authorization

- [ ] Admin can access all endpoints
- [ ] Driver can access own resources
- [ ] Parent can access children's data
- [ ] Unauthorized access returns 401
- [ ] Forbidden access returns 403

### Business Logic

- [ ] Conflict detection works (schedules)
- [ ] State transitions work (trips)
- [ ] Age validation works (students)
- [ ] Coordinate validation works (GPS)
- [ ] Unique constraints work

### Real-time

- [ ] GPS updates emit events
- [ ] Trip state changes emit events
- [ ] Schedule updates emit events

---

## 🐛 Common Issues & Solutions

### Issue 1: Token Expired

**Solution:** Re-login via "Login - Admin" endpoint

### Issue 2: 404 Not Found

**Solution:**

- Check server is running (`npm run dev`)
- Verify base URL is `http://localhost:3000/api/v1`

### Issue 3: 401 Unauthorized

**Solution:**

- Check token is saved (`{{token}}` in environment)
- Re-login if needed

### Issue 4: 409 Conflict

**Solution:**

- Check for duplicate emails, license plates, etc.
- Use different values

### Issue 5: Variable Not Saved

**Solution:**

- Check test scripts ran successfully
- Manually set in environment if needed

---

## 📈 Performance Testing

### Load Testing with Postman Runner

1. Select collection/folder
2. Click **Run**
3. Set iterations (e.g., 100)
4. Set delay (e.g., 100ms)
5. Run and analyze results

### Metrics to Track

- Response time (should be < 200ms for most endpoints)
- Success rate (should be 100% for valid requests)
- Error rate
- Throughput (requests/second)

---

## 🎓 Best Practices

1. **Always login first** - Token is required for most endpoints
2. **Follow the flow** - Create dependencies before using them (Bus → Driver → Route → Schedule → Trip)
3. **Check test results** - Look at Postman test results tab
4. **Use environment variables** - Don't hardcode IDs
5. **Clean up after testing** - Delete created test data
6. **Test error cases** - Not just happy paths
7. **Test real-time events** - Connect Socket.IO client

---

## 📚 Additional Resources

- **OpenAPI Spec**: `docs/openapi.yaml`
- **API Guide**: `API_GUIDE.md`
- **Routes Documentation**: `src/routes/README_ROUTES.md`
- **Services Documentation**: `src/services/README_SERVICES.md`
- **Models Documentation**: `src/models/README_MODELS.md`

---

## 🎯 Next Steps

1. ✅ Import collection and environment
2. ✅ Start server
3. ✅ Run "Health Check"
4. ✅ Run "Register → Login" flow
5. ✅ Test each module systematically
6. ✅ Test real-time events
7. ✅ Document any bugs found
8. ✅ Create test automation scripts

---

**Happy Testing! 🚀**

Last Updated: October 27, 2025
