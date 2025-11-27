# Phase 5: Testing Guide - Bus Stop Optimization

## Tổng Quan

Phase 5 tập trung vào testing và validation hệ thống tối ưu hóa điểm dừng và tuyến xe buýt với dữ liệu thực tế TP.HCM.

---

## 📋 Test Scripts

### 1. Test Database Validation

**File:** `ssb-backend/scripts/test_bus_stop_optimization.js`

**Mục đích:** Kiểm tra dữ liệu học sinh, kết quả optimization, và validation rules.

**Chạy:**
```bash
cd ssb-backend
node scripts/test_bus_stop_optimization.js
```

**Tests bao gồm:**
- ✅ Test 1: Kiểm tra dữ liệu học sinh (tổng số, có tọa độ, phân bố theo quận)
- ✅ Test 2: Kiểm tra kết quả Tầng 1 (số điểm dừng, assignments, khoảng cách đi bộ)
- ✅ Test 3: Kiểm tra kết quả Tầng 2 (điểm dừng có demand, điểm dừng quá đông)
- ✅ Test 4: Performance Testing (số lượng, tỷ lệ coverage, đánh giá quy mô)
- ✅ Test 5: Validation Rules (duplicate assignments, khoảng cách đi bộ, tọa độ hợp lệ)

**Output mẫu:**
```
=== TEST 1: Kiểm tra dữ liệu học sinh ===
✓ Tổng số học sinh: 100
✓ Học sinh có tọa độ hợp lệ: 100
⚠ Học sinh không có tọa độ: 0
⚠ Học sinh inactive: 0

✓ Phân bố học sinh theo quận:
  - Quận 7: 20 học sinh
  - Quận 4: 15 học sinh
  ...
```

---

### 2. Test API Endpoints

**File:** `ssb-backend/scripts/test_optimization_api.js`

**Mục đích:** Kiểm tra các API endpoints hoạt động đúng và đo performance.

**Yêu cầu:** Backend server phải đang chạy (`npm run dev` hoặc `npm start`)

**Chạy:**
```bash
cd ssb-backend
node scripts/test_optimization_api.js
```

**Tests bao gồm:**
- ✅ Test 1: GET `/api/v1/bus-stops/stats` - Lấy thống kê
- ✅ Test 2: GET `/api/v1/bus-stops/assignments` - Lấy assignments
- ⏸️ Test 3: POST `/api/v1/bus-stops/optimize` - Tầng 1 (commented out)
- ⏸️ Test 4: POST `/api/v1/routes/optimize-vrp` - Tầng 2 (commented out)
- ⏸️ Test 5: POST `/api/v1/bus-stops/optimize-full` - Cả 2 tầng (commented out)

**Lưu ý:** Các test optimization (3-5) được comment out để tránh chạy mỗi lần (có thể mất vài phút). Uncomment khi cần test.

**Cấu hình:**
Tạo file `.env` trong `ssb-backend/`:
```env
API_BASE_URL=http://localhost:4000/api/v1
ADMIN_EMAIL=quantri@schoolbus.vn
ADMIN_PASSWORD=password123
```

---

## 🧪 Test Cases Cho UI Component

### Test Case 1: Form Input Validation

**Mô tả:** Kiểm tra form nhập tham số

**Steps:**
1. Vào `/admin/bus-stop-optimization`
2. Nhập các giá trị không hợp lệ (R_walk < 0, S_max < 1, etc.)
3. Kiểm tra validation messages

**Expected:** Form hiển thị lỗi validation

---

### Test Case 2: Tối Ưu Hoàn Chỉnh

**Mô tả:** Chạy cả 2 tầng optimization

**Steps:**
1. Vào `/admin/bus-stop-optimization`
2. Chọn tab "Tối Ưu Hoàn Chỉnh"
3. Nhập tham số:
   - R_walk: 500
   - S_max: 25
   - C_bus: 40
   - School location: (10.77653, 106.700981)
4. Nhấn "Chạy Tối Ưu Hóa"
5. Đợi kết quả (có thể mất vài phút)

**Expected:**
- Loading state hiển thị
- Kết quả hiển thị trên bản đồ
- Stats hiển thị đúng
- Toast notification thành công

---

### Test Case 3: Tầng 1 Riêng

**Mô tả:** Chỉ chạy Tầng 1

**Steps:**
1. Chọn tab "Tầng 1: Tối Ưu Điểm Dừng"
2. Nhập tham số và chạy

**Expected:**
- Chỉ có điểm dừng và học sinh trên bản đồ
- Không có tuyến xe

---

### Test Case 4: Tầng 2 Riêng (Sau Tầng 1)

**Mô tả:** Chạy Tầng 2 sau khi đã có kết quả Tầng 1

**Steps:**
1. Chạy Tầng 1 trước
2. Chọn tab "Tầng 2: Tối Ưu Tuyến Xe"
3. Nhập tham số và chạy

**Expected:**
- Có tuyến xe trên bản đồ
- Stats hiển thị số tuyến

---

### Test Case 5: Error Handling

**Mô tả:** Kiểm tra xử lý lỗi

**Scenarios:**
- Không có học sinh trong DB → Hiển thị cảnh báo
- Không có điểm dừng → Hiển thị cảnh báo
- API error → Hiển thị error message

**Expected:** Toast notification với message rõ ràng

---

## 📊 Performance Benchmarks

### Quy Mô Nhỏ (< 50 học sinh)
- **Tầng 1:** < 10 giây
- **Tầng 2:** < 5 giây
- **Tổng:** < 15 giây

### Quy Mô Trung Bình (50-200 học sinh)
- **Tầng 1:** < 30 giây
- **Tầng 2:** < 15 giây
- **Tổng:** < 45 giây

### Quy Mô Lớn (200-500 học sinh)
- **Tầng 1:** < 2 phút
- **Tầng 2:** < 1 phút
- **Tổng:** < 3 phút

### Quy Mô Rất Lớn (> 500 học sinh)
- **Tầng 1:** < 5 phút
- **Tầng 2:** < 2 phút
- **Tổng:** < 7 phút

---

## ✅ Validation Checklist

### Dữ Liệu Học Sinh
- [ ] Tất cả học sinh có tọa độ hợp lệ
- [ ] Học sinh đều active (trangThai = TRUE)
- [ ] Phân bố hợp lý theo quận/huyện

### Kết Quả Tầng 1
- [ ] Tất cả học sinh được gán điểm dừng
- [ ] Khoảng cách đi bộ <= R_walk
- [ ] Số học sinh/điểm dừng <= S_max
- [ ] Điểm dừng có tọa độ hợp lệ
- [ ] Không có điểm dừng trùng lặp

### Kết Quả Tầng 2
- [ ] Tất cả điểm dừng được phân vào tuyến
- [ ] Tổng demand mỗi tuyến <= C_bus
- [ ] Thứ tự điểm dừng hợp lý
- [ ] Không có tuyến rỗng

### Performance
- [ ] Response time trong giới hạn
- [ ] Không có memory leak
- [ ] API calls được cache khi có thể

---

## 🐛 Troubleshooting

### Vấn Đề: Test trả về 0 điểm dừng

**Nguyên nhân:**
- Không có học sinh trong DB
- Học sinh không có tọa độ
- Học sinh không active

**Giải pháp:**
1. Chạy `database/02_sample_data.sql` để import dữ liệu
2. Kiểm tra học sinh có tọa độ: `SELECT COUNT(*) FROM HocSinh WHERE viDo IS NOT NULL`
3. Kiểm tra học sinh active: `SELECT COUNT(*) FROM HocSinh WHERE trangThai = TRUE`

---

### Vấn Đề: API test timeout

**Nguyên nhân:**
- Optimization chạy quá lâu
- Google Maps API rate limit
- Network issues

**Giải pháp:**
1. Tăng timeout trong test script
2. Kiểm tra Google Maps API quota
3. Kiểm tra network connection

---

### Vấn Đề: Validation rules fail

**Nguyên nhân:**
- Logic optimization có bug
- Dữ liệu không hợp lệ

**Giải pháp:**
1. Xem logs backend để debug
2. Kiểm tra dữ liệu trong DB
3. Chạy lại optimization với tham số khác

---

## 📝 Test Report Template

```markdown
# Test Report - Bus Stop Optimization

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** Development/Production

## Test Results

### Database Validation
- [ ] Test 1: Student Data - PASSED/FAILED
- [ ] Test 2: Tier 1 Results - PASSED/FAILED
- [ ] Test 3: Tier 2 Results - PASSED/FAILED
- [ ] Test 4: Performance - PASSED/FAILED
- [ ] Test 5: Validation Rules - PASSED/FAILED

### API Endpoints
- [ ] GET /stats - PASSED/FAILED
- [ ] GET /assignments - PASSED/FAILED
- [ ] POST /optimize - PASSED/FAILED
- [ ] POST /optimize-vrp - PASSED/FAILED
- [ ] POST /optimize-full - PASSED/FAILED

### UI Component
- [ ] Form Validation - PASSED/FAILED
- [ ] Full Optimization - PASSED/FAILED
- [ ] Tier 1 Only - PASSED/FAILED
- [ ] Tier 2 Only - PASSED/FAILED
- [ ] Error Handling - PASSED/FAILED

## Issues Found

1. [Issue description]
2. [Issue description]

## Recommendations

1. [Recommendation]
2. [Recommendation]
```

---

**Last Updated:** 2025-01-XX

