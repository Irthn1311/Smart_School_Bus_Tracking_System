# 🔍 DEBUG GUIDE - Vấn Đề Thông Báo Reload & Realtime

## 📋 Mô Tả Vấn Đề

### Vấn đề 1: Reload trang đổi thông báo chuyến đi thành sự cố
- **Hiện tượng**: Sau khi reload, các thông báo về chuyến đi hiển thị sai loại (thành sự cố)
- **Nguyên nhân có thể**: 
  - Backend lưu sai `loaiThongBao` vào database
  - Frontend mapping sai khi load từ API
  - Logic `getNotificationType()` xử lý sai

### Vấn đề 2: Admin không nhận realtime notification
- **Hiện tượng**: 
  - Không reload: Không hiển thị thông báo mới
  - Reload: Hiển thị thông báo (nhưng sai loại)
- **Nguyên nhân có thể**:
  - Socket.IO không emit đến room `user-{adminId}`
  - Frontend không listen đúng event
  - Event listener không được đăng ký

## 🛠️ Debug Logs Đã Thêm

### 1. Backend Logs

#### NotificationController.list (API GET /api/v1/notifications)
```javascript
console.log('🔍 [NotificationController.list] Request params:', {
  userId,
  loaiThongBao,
  daDoc,
  limit,
  offset
});

console.log('✅ [NotificationController.list] Retrieved notifications:', data.length);
console.log('📋 [NotificationController.list] Sample data:', data.slice(0, 3).map(n => ({
  maThongBao: n.maThongBao,
  loaiThongBao: n.loaiThongBao,
  tieuDe: n.tieuDe,
  daDoc: n.daDoc
})));
```

**Kiểm tra**: 
- ✅ `loaiThongBao` có đúng là `"chuyen_di"` hay đã bị đổi thành `"su_co"`?
- ✅ Có bao nhiêu thông báo được trả về?

#### TripController (Emit notification:new)
```javascript
const notifData = {
  maNguoiNhan: parentId,
  tieuDe,
  noiDung,
  loaiThongBao: "chuyen_di",
  tripId: id,
  thoiGianGui: new Date(),
  daDoc: false,
};
console.log(`🔍 [TRIP] Emitting 'notification:new' to ${roomName}:`, notifData);
io.to(roomName).emit("notification:new", notifData);
```

**Kiểm tra**:
- ✅ `loaiThongBao` có phải là `"chuyen_di"`?
- ✅ Room name có đúng format `user-{userId}`?

#### IncidentController (Emit notification)
```javascript
const notifData = {
  type: 'su_co',
  title: `🚨 Sự cố ${severityText}`,
  message: `${typeText} - Chuyến #${maChuyen}`,
  severity: mucDo,
  maChuyen,
  maSuCo: created.maSuCo
};
console.log(`🔍 [INCIDENT] Emitting 'notification' to user-${admin.maNguoiDung}:`, notifData);
io.to(`user-${admin.maNguoiDung}`).emit('notification', notifData);
```

**Kiểm tra**:
- ✅ Có gửi đến đúng admin ID?
- ⚠️ **CHÚ Ý**: Incident dùng field `type` thay vì `loaiThongBao`!

### 2. Frontend Logs

#### Socket.ts (Nhận events từ backend)
```typescript
// Event: notification:new
console.log("🔔 [SOCKET] Received notification:new event:", data);
console.log("🔍 [SOCKET] notification:new details:", {
  maThongBao: data.maThongBao,
  loaiThongBao: data.loaiThongBao,
  tieuDe: data.tieuDe,
  noiDung: data.noiDung
});
console.log("✅ [SOCKET] Dispatched notificationNew custom event");

// Event: notification (từ IncidentController)
console.log("🔔 [SOCKET] Received notification event:", data);
console.log("🔍 [SOCKET] notification details:", {
  maThongBao: data.maThongBao,
  loaiThongBao: data.loaiThongBao,
  tieuDe: data.tieuDe,
  noiDung: data.noiDung
});
console.log("✅ [SOCKET] Dispatched notificationNew custom event (from notification)");
```

**Kiểm tra**:
- ✅ Socket có nhận được event không?
- ✅ Data có field `loaiThongBao` không?
- ⚠️ Incident event có thể dùng `type` thay vì `loaiThongBao`

#### Admin Notifications Page

**Initial Load (Reload trang)**:
```typescript
console.log('🔍 [ADMIN LOAD] Raw API response:', res)
console.log('🔍 [ADMIN LOAD] Total notifications from API:', arr.length)

console.log('📋 [ADMIN LOAD] Processing notification:', {
  maThongBao: n.maThongBao,
  loaiThongBao: n.loaiThongBao,
  tieuDe: n.tieuDe,
  calculatedType: type,
  daDoc: n.daDoc
})

console.log('✅ [ADMIN LOAD] Mapped notifications:', mapped.length, mapped)
```

**Realtime Listener**:
```typescript
console.log('🎧 [ADMIN NOTIF] Registering notificationNew listener')

console.log('🔔 [ADMIN NOTIF] Received new notification:', payload)
console.log('🔔 [ADMIN NOTIF] Event type:', event.type)
console.log('🔍 [ADMIN NOTIF] Payload details:', {
  maThongBao: payload.maThongBao,
  loaiThongBao: payload.loaiThongBao,
  tieuDe: payload.tieuDe,
  noiDung: payload.noiDung
})

console.log('🔍 [ADMIN NOTIF] Calculated type:', type, 'from loaiThongBao:', payload.loaiThongBao)
console.log('✅ [ADMIN NOTIF] Adding to list:', newNotif)
console.log('📊 [ADMIN NOTIF] Current list size:', prev.length)
console.log('📊 [ADMIN NOTIF] New list size:', updated.length)
```

**getNotificationType Helper**:
```typescript
console.log('🔍 [getNotificationType] Input:', { loaiThongBao: n.loaiThongBao, tieuDe: n.tieuDe })
console.log('✅ [getNotificationType] Result:', type)
```

#### Parent Notifications Page

**Initial Load**:
```typescript
console.log('🔍 [PARENT LOAD] Raw API response:', res)
console.log('🔍 [PARENT LOAD] Total notifications from API:', arr.length)

console.log('📋 [PARENT LOAD] Processing notification:', {
  maThongBao: n.maThongBao,
  loaiThongBao: n.loaiThongBao,
  tieuDe: n.tieuDe,
  calculatedType: t
})

console.log('✅ [PARENT LOAD] Mapped notifications:', mapped.length, mapped)
```

**Realtime Listener**:
```typescript
console.log('🔔 [PARENT NOTIF] Received new notification:', payload)
console.log('🔍 [PARENT NOTIF] Payload details:', {
  maThongBao: payload.maThongBao,
  loaiThongBao: payload.loaiThongBao,
  tieuDe: payload.tieuDe,
  noiDung: payload.noiDung
})
console.log('🔍 [PARENT NOTIF] Calculated type:', t, 'from loaiThongBao:', payload.loaiThongBao)
```

#### Parent Dashboard

```typescript
console.log('📋 [PARENT DASH] Adding notification to recent list:', {
  maThongBao: data.maThongBao,
  loaiThongBao: data.loaiThongBao,
  tieuDe: data.tieuDe,
  title: title,
  calculatedType: notifType
})

console.log('✅ [PARENT DASH] Updated recent notifications:', updated.length, updated)
```

## 📖 Hướng Dẫn Sử Dụng

### Bước 1: Mở Console
1. Mở Developer Tools (F12)
2. Chọn tab Console
3. Lọc theo keyword để dễ theo dõi:
   - `[ADMIN LOAD]` - Load dữ liệu admin
   - `[ADMIN NOTIF]` - Realtime notification admin
   - `[PARENT LOAD]` - Load dữ liệu parent
   - `[PARENT NOTIF]` - Realtime notification parent
   - `[SOCKET]` - Socket.IO events
   - `[TRIP]` - Backend trip notifications
   - `[INCIDENT]` - Backend incident notifications

### Bước 2: Test Reload Trang (Admin)

1. **Reload trang admin notifications**
2. **Xem console logs**:
   ```
   🔍 [ADMIN LOAD] Raw API response: {...}
   🔍 [ADMIN LOAD] Total notifications from API: 10
   📋 [ADMIN LOAD] Processing notification: {
     maThongBao: 1,
     loaiThongBao: "chuyen_di",  ← KIỂM TRA GIÁ TRỊ NÀY
     tieuDe: "Chuyến đi đã bắt đầu",
     calculatedType: "info",
     daDoc: false
   }
   ```

3. **Kiểm tra**:
   - ✅ `loaiThongBao` từ API có đúng không?
   - ✅ `calculatedType` có được tính đúng không?
   - ❌ Nếu `loaiThongBao: "su_co"` nhưng tiêu đề là chuyến đi → **LỖI Ở DATABASE**
   - ❌ Nếu `loaiThongBao: "chuyen_di"` nhưng `calculatedType: "danger"` → **LỖI Ở HELPER FUNCTION**

### Bước 3: Test Realtime Notification (Admin)

1. **Tạo một chuyến đi mới hoặc gửi incident**
2. **Xem console logs**:

   **Backend logs (Terminal backend)**:
   ```
   🔍 [TRIP] Emitting 'notification:new' to user-1: {
     maNguoiNhan: 1,
     tieuDe: "Chuyến đi đã bắt đầu",
     noiDung: "Xe buýt...",
     loaiThongBao: "chuyen_di",  ← KIỂM TRA
     tripId: 32,
     thoiGianGui: "2025-11-27...",
     daDoc: false
   }
   ```

   **Frontend logs (Browser console)**:
   ```
   🔔 [SOCKET] Received notification:new event: {...}
   🔍 [SOCKET] notification:new details: {
     maThongBao: undefined,  ← CHÚ Ý: Có thể chưa có
     loaiThongBao: "chuyen_di",
     tieuDe: "Chuyến đi đã bắt đầu",
     noiDung: "..."
   }
   ✅ [SOCKET] Dispatched notificationNew custom event
   
   🔔 [ADMIN NOTIF] Received new notification: {...}
   🔔 [ADMIN NOTIF] Event type: notificationNew
   🔍 [ADMIN NOTIF] Payload details: {...}
   🔍 [ADMIN NOTIF] Calculated type: info from loaiThongBao: chuyen_di
   ✅ [ADMIN NOTIF] Adding to list: {...}
   📊 [ADMIN NOTIF] Current list size: 10
   📊 [ADMIN NOTIF] New list size: 11
   ```

3. **Kiểm tra**:
   - ✅ Backend có emit notification không?
   - ✅ Frontend Socket có nhận được event không?
   - ✅ Event listener có được gọi không?
   - ✅ `loaiThongBao` có bị thay đổi qua từng layer không?
   - ❌ Nếu không thấy `[SOCKET]` logs → **Socket.IO không kết nối hoặc room sai**
   - ❌ Nếu thấy `[SOCKET]` nhưng không thấy `[ADMIN NOTIF]` → **Event listener không được đăng ký**

### Bước 4: So Sánh Database vs UI

1. **Kiểm tra database**:
   ```sql
   SELECT maThongBao, loaiThongBao, tieuDe, maNguoiNhan 
   FROM ThongBao 
   ORDER BY thoiGianGui DESC 
   LIMIT 10;
   ```

2. **So sánh với API response trong console**:
   ```
   📋 [ADMIN LOAD] Sample data: [
     { maThongBao: 1, loaiThongBao: "chuyen_di", tieuDe: "...", daDoc: false },
     { maThongBao: 2, loaiThongBao: "su_co", tieuDe: "...", daDoc: false }
   ]
   ```

3. **Kiểm tra**:
   - ✅ Database `loaiThongBao` có khớp với API response không?
   - ❌ Nếu khác → **LỖI Ở MODEL hoặc QUERY**

## 🔧 Các Trường Hợp Lỗi Thường Gặp

### Case 1: Database lưu sai `loaiThongBao`

**Triệu chứng**:
- API trả về `loaiThongBao: "su_co"` cho thông báo chuyến đi
- Database có giá trị sai

**Debug**:
1. Kiểm tra backend logs khi tạo notification:
   ```
   🔍 [TRIP] Emitting 'notification:new' to user-1: {
     loaiThongBao: "chuyen_di"  ← Đúng
   }
   ```
2. Kiểm tra code lưu vào DB trong TripController hoặc DelayAlertService
3. Tìm nơi gọi `ThongBaoModel.create()` và xem tham số truyền vào

**Fix**: Sửa code backend để truyền đúng `loaiThongBao: "chuyen_di"`

### Case 2: Frontend mapping sai

**Triệu chứng**:
- API trả về đúng `loaiThongBao: "chuyen_di"`
- UI hiển thị sai loại (danger/warning thay vì info)

**Debug**:
1. Xem logs của `getNotificationType()`:
   ```
   🔍 [getNotificationType] Input: { loaiThongBao: "chuyen_di", tieuDe: "..." }
   ✅ [getNotificationType] Result: danger  ← SAI!
   ```

**Fix**: Sửa logic trong `getNotificationType()` helper function

### Case 3: Admin không nhận realtime notification

**Triệu chứng**:
- Backend emit notification
- Frontend không thấy logs `[ADMIN NOTIF]`

**Debug**:
1. Kiểm tra Socket.IO có kết nối không:
   ```javascript
   console.log('Socket connected:', socket.connected)
   console.log('Socket ID:', socket.id)
   ```

2. Kiểm tra admin có join đúng room không:
   ```
   // Trong backend logs
   User 1 (quan_tri) joined room: user-1
   User 1 (quan_tri) joined room: role-quan_tri
   ```

3. Kiểm tra event listener có được đăng ký không:
   ```
   🎧 [ADMIN NOTIF] Registering notificationNew listener
   ```

**Fix**: 
- Nếu không thấy logs → Event listener không chạy (check useEffect dependencies)
- Nếu thấy logs nhưng không nhận event → Room name sai hoặc socket không kết nối

### Case 4: Incident notification dùng field sai

**Triệu chứng**:
- Incident notification có `type: "su_co"` thay vì `loaiThongBao: "su_co"`
- Frontend không map được

**Debug**:
1. Xem backend logs:
   ```
   🔍 [INCIDENT] Emitting 'notification' to user-1: {
     type: 'su_co',  ← FIELD SAI
     title: '🚨 Sự cố...',
     message: '...'
   }
   ```

2. Xem frontend logs:
   ```
   🔍 [SOCKET] notification details: {
     maThongBao: undefined,
     loaiThongBao: undefined,  ← KHÔNG CÓ
     tieuDe: undefined,
     noiDung: undefined
   }
   ```

**Fix**: Sửa IncidentController để emit đúng format:
```javascript
io.to(`user-${admin.maNguoiDung}`).emit('notification', {
  maThongBao: notif.maThongBao,
  loaiThongBao: 'su_co',  // Thay vì 'type'
  tieuDe: `🚨 Sự cố ${severityText}`,  // Thay vì 'title'
  noiDung: `${typeText} - Chuyến #${maChuyen}`,  // Thay vì 'message'
  // ... other fields
});
```

## ✅ Checklist Debug

- [ ] Backend logs hiển thị đúng `loaiThongBao` khi emit
- [ ] Socket.IO emit đến đúng room (`user-{userId}`)
- [ ] Frontend Socket nhận được event
- [ ] CustomEvent được dispatch
- [ ] Event listener được đăng ký (thấy logs `🎧 Registering...`)
- [ ] Event listener được gọi (thấy logs `🔔 Received new notification`)
- [ ] `getNotificationType()` tính đúng type
- [ ] State được update (thấy logs `📊 New list size`)
- [ ] UI render đúng loại notification
- [ ] Reload trang load đúng data từ API
- [ ] Database có đúng `loaiThongBao`

## 🎯 Kết Luận

Với các logs trên, bạn có thể:
1. **Trace data flow** từ backend → socket → frontend → UI
2. **Xác định chính xác** nơi xảy ra lỗi
3. **So sánh** giá trị qua từng layer để tìm nơi data bị thay đổi
4. **Verify** các fix đã hoạt động đúng chưa

Hãy chạy lại app và theo dõi console logs để tìm ra vấn đề!
