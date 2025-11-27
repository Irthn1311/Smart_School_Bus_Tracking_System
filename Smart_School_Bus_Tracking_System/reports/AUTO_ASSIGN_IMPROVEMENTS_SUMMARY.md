# BÁO CÁO CẢI TIẾN: PHÂN CÔNG TỰ ĐỘNG LỊCH TRÌNH

**Ngày thực hiện:** 2025-01-XX  
**File:** `ssb-frontend/app/admin/schedule/page.tsx`

---

## 📋 YÊU CẦU

Cải tiến chức năng phân công tự động (auto-assign) trong màn hình `/admin/schedule`:

1. **Theo ngày**: Phân công tất cả các chuyến trong ngày được chọn (không chỉ 2 chuyến)
2. **Theo tuần**: Phân công từ ngày hiện tại đến hết tuần (thứ 7)
3. **Theo tháng**: Phân công từ ngày hiện tại đến hết tháng (ngày cuối tháng)
4. Có thể chọn ngày/tuần/tháng cụ thể để phân công

---

## ✅ CÁC THAY ĐỔI ĐÃ THỰC HIỆN

### 1. Thêm State và UI Controls

**Files đã sửa:**
- `ssb-frontend/app/admin/schedule/page.tsx`

**Thay đổi:**
- Thêm state `autoAssignType`: `'day' | 'week' | 'month'` (mặc định: `'day'`)
- Thêm state `autoAssignStartDate`: Date picker để chọn ngày bắt đầu
- Thêm imports: `Popover`, `PopoverContent`, `PopoverTrigger`, `format`, `vi` (date-fns), `cn`

**UI mới:**
- Dropdown chọn loại phân công:
  - "Theo ngày"
  - "Theo tuần (đến thứ 7)"
  - "Theo tháng (đến cuối tháng)"
- Date picker để chọn ngày bắt đầu
- Preview số ngày sẽ được phân công (hiển thị range ngày)

---

### 2. Logic Tính Toán Danh Sách Ngày

**Function mới:** `getDatesToAssign(type, startDate)`

**Logic:**

#### Theo ngày:
- Trả về mảng 1 ngày: ngày được chọn

#### Theo tuần:
- Tính từ ngày hiện tại đến thứ 7
- Xử lý edge case: Nếu là Chủ nhật (dayOfWeek = 0) → tính đến thứ 7 tuần sau (6 ngày)
- Nếu không phải Chủ nhật → tính đến thứ 7 tuần này

#### Theo tháng:
- Tính từ ngày hiện tại đến ngày cuối cùng của tháng
- Sử dụng `new Date(year, month + 1, 0).getDate()` để lấy ngày cuối tháng

---

### 3. Cải Thiện Logic Phân Công

**Function:** `handleAutoAssign()`

**Thay đổi:**

1. **Tính toán danh sách ngày:**
   ```typescript
   const datesToAssign = getDatesToAssign(autoAssignType, autoAssignStartDate)
   ```

2. **Phân công cho từng ngày:**
   - Loop qua tất cả ngày trong `datesToAssign`
   - Với mỗi ngày:
     - Lấy resources đã được phân công (từ DB)
     - Tìm available resources (chưa được phân công)
     - Phân công **tất cả routes** với **cả 2 loại chuyến** (don_sang + tra_chieu)

3. **Logic phân công:**
   - Mỗi route × 2 chuyến (đón sáng + trả chiều) = tổng số chuyến cần tạo
   - Round-robin để phân bổ đều bus và driver
   - Track assigned resources để tránh conflict trong cùng ngày

4. **Error handling:**
   - Track `totalCreated` và `totalFailed`
   - Log chi tiết errors
   - Hiển thị summary sau khi hoàn thành

---

### 4. UI Preview và Feedback

**Preview:**
- Hiển thị số ngày sẽ được phân công
- Hiển thị range ngày (từ - đến)
- Hiển thị thông tin: "Mỗi ngày: Tất cả tuyến × 2 chuyến (đón sáng + trả chiều)"

**Toast notification:**
- Thành công: "Đã tự động phân công X lịch trình cho [ngày/tuần/tháng] (Y ngày)"
- Nếu có lỗi: Hiển thị số lượng lỗi

---

## 📊 VÍ DỤ SỬ DỤNG

### Ví dụ 1: Phân công theo ngày

1. Chọn "Theo ngày"
2. Chọn ngày: 15/01/2025
3. Click "Phân công tự động"
4. **Kết quả:** Phân công tất cả routes × 2 chuyến cho ngày 15/01/2025

**Số lượng chuyến:** Nếu có 5 routes → 5 × 2 = 10 chuyến

---

### Ví dụ 2: Phân công theo tuần

1. Chọn "Theo tuần"
2. Chọn ngày bắt đầu: Thứ 3, 14/01/2025
3. Click "Phân công tự động"
4. **Kết quả:** Phân công từ Thứ 3 (14/01) đến Thứ 7 (18/01) = 5 ngày

**Số lượng chuyến:** 5 routes × 2 chuyến × 5 ngày = 50 chuyến

---

### Ví dụ 3: Phân công theo tháng

1. Chọn "Theo tháng"
2. Chọn ngày bắt đầu: 10/01/2025
3. Click "Phân công tự động"
4. **Kết quả:** Phân công từ 10/01 đến 31/01 = 22 ngày

**Số lượng chuyến:** 5 routes × 2 chuyến × 22 ngày = 220 chuyến

---

## 🔄 LOGIC PHÂN CÔNG CHI TIẾT

### Flow:

```
1. User chọn loại (ngày/tuần/tháng) + ngày bắt đầu
   ↓
2. Tính toán danh sách ngày cần phân công
   ↓
3. Với mỗi ngày:
   a. Lấy resources đã được phân công (từ DB)
   b. Tìm available resources (chưa được phân công)
   c. Với mỗi route:
      - Tạo chuyến "Đón sáng" (06:30)
      - Tạo chuyến "Trả chiều" (16:30)
      - Round-robin bus và driver
   d. Track assigned resources để tránh conflict
   ↓
4. Hiển thị kết quả (tổng số chuyến đã tạo, số lỗi)
```

### Round-robin Logic:

```typescript
const resourceIndex = (routeIndex * 2 + tripTypeIdx) % Math.min(availableBuses.length, availableDrivers.length)
const bus = availableBuses[resourceIndex % availableBuses.length]
const driver = availableDrivers[resourceIndex % availableDrivers.length]
```

**Ví dụ:**
- Route 1, Đón sáng: bus[0], driver[0]
- Route 1, Trả chiều: bus[1], driver[1]
- Route 2, Đón sáng: bus[2], driver[2]
- Route 2, Trả chiều: bus[3], driver[3]
- ...

---

## ⚠️ LƯU Ý

1. **Conflict handling:**
   - Frontend track assigned resources để tránh conflict cơ bản
   - Backend validate conflict thời gian (xe/tài xế không thể làm 2 chuyến cùng lúc)
   - Nếu có conflict → Backend trả về lỗi, frontend skip và tiếp tục

2. **Performance:**
   - Phân công theo tháng có thể tạo rất nhiều chuyến (ví dụ: 5 routes × 2 × 31 = 310 chuyến)
   - Có thể mất vài giây để hoàn thành
   - UI hiển thị loading indicator

3. **Resources:**
   - Nếu không đủ bus/driver → Skip ngày đó và tiếp tục
   - Log warning để admin biết

4. **Error handling:**
   - Mỗi lỗi được log chi tiết
   - Tổng hợp số lượng lỗi trong toast notification
   - Không dừng toàn bộ quá trình nếu 1 chuyến lỗi

---

## 🧪 TEST CASES

### Test Case 1: Phân công theo ngày

**Input:**
- Loại: "Theo ngày"
- Ngày: 15/01/2025
- Routes: 3 routes
- Buses: 5 buses (hoạt động)
- Drivers: 5 drivers (hoạt động)

**Kỳ vọng:**
- Tạo 3 × 2 = 6 chuyến cho ngày 15/01/2025
- Mỗi route có 1 chuyến đón sáng + 1 chuyến trả chiều

---

### Test Case 2: Phân công theo tuần (từ Thứ 3)

**Input:**
- Loại: "Theo tuần"
- Ngày bắt đầu: Thứ 3, 14/01/2025
- Routes: 2 routes

**Kỳ vọng:**
- Tính từ Thứ 3 (14/01) đến Thứ 7 (18/01) = 5 ngày
- Tạo 2 × 2 × 5 = 20 chuyến

---

### Test Case 3: Phân công theo tháng (từ ngày 10)

**Input:**
- Loại: "Theo tháng"
- Ngày bắt đầu: 10/01/2025 (tháng 1 có 31 ngày)
- Routes: 1 route

**Kỳ vọng:**
- Tính từ 10/01 đến 31/01 = 22 ngày
- Tạo 1 × 2 × 22 = 44 chuyến

---

### Test Case 4: Không đủ resources

**Input:**
- Loại: "Theo ngày"
- Ngày: 15/01/2025
- Routes: 10 routes
- Buses: 2 buses (hoạt động)
- Drivers: 2 drivers (hoạt động)

**Kỳ vọng:**
- Chỉ tạo được một số chuyến (tùy vào conflict)
- Log warning: "Skip date: No available resources"
- Toast hiển thị số lượng đã tạo và số lỗi

---

## 📝 FILES ĐÃ SỬA

1. `ssb-frontend/app/admin/schedule/page.tsx`
   - Thêm state: `autoAssignType`, `autoAssignStartDate`
   - Thêm function: `getDatesToAssign()`
   - Cải thiện: `handleAutoAssign()`
   - Cải thiện UI: Thêm dropdown, date picker, preview

---

## 🎯 KẾT QUẢ

✅ **Hoàn thành:**
- Hỗ trợ 3 loại phân công: ngày, tuần, tháng
- UI rõ ràng với dropdown và date picker
- Preview số ngày sẽ được phân công
- Phân công tất cả routes × 2 chuyến cho mỗi ngày
- Error handling và logging chi tiết
- Toast notification với summary

✅ **Cải thiện so với trước:**
- Trước: Chỉ phân công 2 chuyến (giới hạn `createdCount < 2`)
- Sau: Phân công tất cả routes × 2 chuyến cho mỗi ngày
- Trước: Chỉ phân công cho 1 ngày
- Sau: Hỗ trợ phân công cho nhiều ngày (tuần/tháng)

---

**Người thực hiện:** Senior Fullstack Developer  
**Ngày:** 2025-01-XX

