# 🔍 Audit Report - Các vấn đề cần sửa

## 🚨 Vấn đề nghiêm trọng

### 1. Duplicate Route Files
**Vấn đề**: Có 2 file route cho trips:
- `ssb-backend/src/routes/api/trip.js` (không được sử dụng)
- `ssb-backend/src/routes/api/trip.route.js` (đang được sử dụng trong server.ts)

**Giải pháp**: Merge tất cả routes từ `trip.js` vào `trip.route.js`, sau đó xóa `trip.js`

### 2. Missing Routes trong trip.route.js
**Vấn đề**: `trip.route.js` thiếu một số routes quan trọng từ `trip.js`:
- `GET /trips/history`
- `GET /trips/stats` (có nhưng khác implementation)
- `POST /trips/:id/students`
- `PUT /trips/:id/students/:studentId`
- `GET /trips/:id/stops/:sequence/students` (có nhưng cần verify)

### 3. Inconsistent Authorization
**Vấn đề**: 
- Một số endpoints dùng `requireDriver`, một số dùng `authorize("tai_xe")`
- Một số endpoints thiếu authorization check

**Giải pháp**: Standardize tất cả về `authorize()` với roles cụ thể

### 4. Error Handling Inconsistency
**Vấn đề**: 
- Một số nơi dùng `response.error()`, một số dùng `res.status().json()`
- Một số nơi có try-catch, một số không có

**Giải pháp**: Standardize error handling pattern

### 5. Student Status Update Logic
**Vấn đề**: 
- `updateStudentStatus` có thể update status không hợp lệ
- Thiếu validation cho status transitions

**Giải pháp**: Thêm validation cho status transitions

### 6. Notification Logic
**Vấn đề**: 
- Một số nơi gửi notification, một số không
- Có thể thiếu notification cho một số events

**Giải pháp**: Đảm bảo tất cả events quan trọng đều gửi notification

## ⚠️ Vấn đề trung bình

### 7. Frontend API Error Handling
**Vấn đề**: 
- Một số nơi có error handling tốt, một số không
- Một số nơi chỉ log error, không hiển thị cho user

**Giải pháp**: Standardize error handling trong frontend

### 8. WebSocket Event Naming
**Vấn đề**: 
- Một số events dùng snake_case, một số dùng camelCase
- Inconsistent naming convention

**Giải pháp**: Standardize về camelCase

### 9. Missing Validation
**Vấn đề**: 
- Một số endpoints thiếu validation middleware
- Một số validation không đầy đủ

**Giải pháp**: Thêm validation middleware cho tất cả endpoints

## 📝 Vấn đề nhỏ

### 10. Console.log/error cleanup
**Vấn đề**: Nhiều console.log/error trong production code

**Giải pháp**: Replace bằng proper logging system

### 11. TODO Comments
**Vấn đề**: Nhiều TODO comments chưa được xử lý

**Giải pháp**: Xử lý hoặc xóa các TODO không cần thiết

---

## 🎯 Priority Fix Order

1. **HIGH**: Fix duplicate routes (#1, #2)
2. **HIGH**: Fix authorization inconsistencies (#3)
3. **MEDIUM**: Fix error handling (#4)
4. **MEDIUM**: Fix student status logic (#5)
5. **MEDIUM**: Fix notification logic (#6)
6. **LOW**: Frontend improvements (#7, #8, #9)
7. **LOW**: Code cleanup (#10, #11)

