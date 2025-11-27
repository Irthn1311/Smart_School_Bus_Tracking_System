# 🚨 DELAY ALERT SYSTEM - Implementation Report

**Date:** 2025-01-15  
**Status:** ✅ COMPLETED  
**Components:** Backend Service, WebSocket Integration, Frontend Fixes

---

## 📋 Overview

Implemented comprehensive delay alert system with automatic detection and notifications for admin + parents when buses are running late. Also fixed notification persistence/grouping issue that caused notifications to disappear after page reload.

---

## 🎯 Problems Solved

### 1. **No Delay Notifications** 🔴
- **Issue:** System had `checkDelay()` function in `utils/eta.js` but never called it
- **Impact:** No alerts when buses running late, parents unaware of delays
- **Status:** ✅ FIXED

### 2. **Notification Grouping/Disappearing** 🔴
- **Issue:** Notifications display correctly initially but group/disappear after page reload
- **Root Cause:** Frontend React components missing `id` field in notification objects
- **Impact:** React deduplication causing UI bugs
- **Status:** ✅ FIXED

---

## 🏗️ Implementation Details

### **A. DelayAlertService (Backend)**

**File:** `ssb-backend/src/services/DelayAlertService.js`

**Features:**
- ⏰ **Smart Delay Detection**: Compares scheduled time vs current time
- 🚦 **Severity Levels**: 
  - 🟡 Medium (5-9 min)
  - 🟠 High (10-14 min)
  - 🔴 Critical (≥15 min)
- 🔔 **Dual Notifications**: Sends to both admin AND affected parents
- ⏱️ **Rate Limiting**: Max 1 alert per trip every 3 minutes (prevent spam)
- 💾 **Database Persistence**: All notifications saved to `ThongBao` table
- 📡 **Real-time Emit**: Socket.IO broadcasts to user rooms

**Key Methods:**

```javascript
// Check if trip is delayed
static async checkTripDelay(tripId) {
  // Returns: { isDelayed, delayMinutes, severity, trip, schedule }
}

// Send alerts to admin + parents
static async sendDelayAlert(tripId, io) {
  // 1. Check rate limit (3 min cooldown)
  // 2. Detect delay with severity
  // 3. Create notifications for admins
  // 4. Get affected students' parents
  // 5. Create notifications for parents
  // 6. Emit real-time events
  // Returns: { sent, delayMinutes, severity, adminsNotified, parentsNotified }
}

// Clear cache when trip ends
static clearCache(tripId)
```

**Notification Format:**
```javascript
// Admin notification:
{
  maNguoiNhan: adminId,
  tieuDe: "🟠 Xe chạy TRỄ NHIỀU",
  noiDung: "Chuyến #123 (Tuyến A) đang chạy trễ 12 phút so với lịch trình (07:30).",
  loaiThongBao: "chuyen_di"
}

// Parent notification:
{
  maNguoiNhan: parentId,
  tieuDe: "🟠 Xe đang chạy trễ",
  noiDung: "Xe buýt chuyến #123 (Tuyến A) đang chạy trễ 12 phút. Chúng tôi sẽ thông báo khi xe đến điểm đón.",
  loaiThongBao: "chuyen_di"
}
```

---

### **B. WebSocket Integration**

**File:** `ssb-backend/src/services/SocketService.js`

**Changes:**
1. **Import DelayAlertService:**
   ```javascript
   import DelayAlertService from "./DelayAlertService.js";
   ```

2. **Auto-check on GPS Update:**
   ```javascript
   async handleLocationUpdate(socket, data) {
     // ... existing location update code ...
     
     // 🚨 Check for delay and send alerts
     try {
       const activeTrip = await ChuyenDiModel.getActiveByBusId(busId);
       if (activeTrip) {
         await DelayAlertService.sendDelayAlert(activeTrip.maChuyen, this.io);
       }
     } catch (error) {
       console.error('[SocketService] Error checking delay:', error);
     }
   }
   ```

**Workflow:**
```
Driver GPS Update 
    ↓
SocketService.handleLocationUpdate()
    ↓
Get Active Trip for Bus
    ↓
DelayAlertService.checkTripDelay()
    ↓
If delayed → Create notifications
    ↓
Save to Database + Emit Socket.IO
    ↓
Admin/Parent Receive Real-time Alert
```

---

### **C. Database Model Extension**

**File:** `ssb-backend/src/models/ChuyenDiModel.js`

**New Method:**
```javascript
async getActiveByBusId(maXe) {
  // Get currently running trip for bus
  // Status: 'cho_khoi_hanh' or 'dang_chay'
  // Today's trips only
  return trip || null;
}
```

**Query:**
```sql
SELECT cd.*, lt.gioKhoiHanh, lt.maTuyen, td.tenTuyen
FROM ChuyenDi cd
INNER JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
INNER JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
WHERE lt.maXe = ? 
  AND cd.trangThai IN ('cho_khoi_hanh', 'dang_chay')
  AND DATE(cd.ngayChay) = CURDATE()
ORDER BY cd.ngayChay DESC, lt.gioKhoiHanh DESC
LIMIT 1
```

---

### **D. Frontend Notification Persistence Fix**

**File:** `ssb-frontend/app/parent/page.tsx`

**Problem:** React component used array index as key → duplicates when reload

**Solution:** Always include `id: notification.maThongBao` field

**Changes:**

1. **Updated State Type:**
   ```typescript
   const [recentNotifications, setRecentNotifications] = useState<
     Array<{
       id: number; // ← ADDED
       type: "success" | "info" | "warning";
       title: string;
       time: string;
       timestamp: number;
     }>
   >([]);
   ```

2. **Fixed API Data Mapping (3 places):**
   ```typescript
   // Initial fetch from API:
   const mapped = notifications.map((notif: any) => ({
     id: notif.maThongBao, // ← ADDED
     type: ...,
     title: ...,
     time: ...,
     timestamp: ...
   }));

   // Real-time notification handler:
   const newNotif = {
     id: payload.maThongBao || Date.now(), // ← ADDED
     type: notifType,
     title: title,
     time: "Vừa xong",
     timestamp: Date.now(),
   };

   // Trip completed reload:
   const mapped = notifications.map((n: any) => ({
     id: n.maThongBao, // ← ADDED
     type: ...,
     title: ...,
     // ...
   }));
   ```

3. **Fixed React Render Key:**
   ```tsx
   {recentNotifications.map((notification) => (
     <div key={notification.id || `${notification.timestamp}-${index}`}>
       {/* Before: key={`${notification.timestamp}-${index}`} */}
       {/* After: key={notification.id || fallback} */}
     </div>
   ))}
   ```

---

## 🔧 Technical Specifications

### Delay Detection Algorithm

```javascript
// 1. Get trip's scheduled start time from LichTrinh
scheduledDateTime = new Date(trip.ngayChay + schedule.gioKhoiHanh);

// 2. Calculate delay in minutes
delayMinutes = Math.floor((now - scheduledDateTime) / 60000);

// 3. Determine severity
if (delayMinutes >= 15) → severity = "critical" 🔴
else if (delayMinutes >= 10) → severity = "high" 🟠
else if (delayMinutes >= 5) → severity = "medium" 🟡
else → not delayed
```

### Rate Limiting

```javascript
// Cache: Map<tripId, lastAlertTimestamp>
const lastAlert = lastAlertTime.get(tripId);
const now = Date.now();
const INTERVAL = 3 * 60 * 1000; // 3 minutes

if (lastAlert && (now - lastAlert) < INTERVAL) {
  return { sent: false, reason: 'rate_limited' };
}
```

### Notification Recipients

**Admin:**
```sql
SELECT maNguoiDung FROM NguoiDung WHERE vaiTro = 'quan_tri'
```

**Parents:**
```sql
SELECT DISTINCT maPhuHuynh FROM HocSinh 
WHERE maHocSinh IN (
  SELECT maHocSinh FROM TrangThaiHocSinh WHERE maChuyen = ?
)
```

---

## 📊 Database Changes

### ThongBao Table (No Changes)
- ✅ Already supports all notification types
- ✅ `loaiThongBao ENUM` includes `'chuyen_di'`
- ✅ `maNguoiNhan` field for recipient
- ✅ Auto-increment `maThongBao` (unique ID)

### ChuyenDi Model (Added Method)
- ✅ `getActiveByBusId(maXe)` - Get running trip for bus

---

## 🧪 Testing Scenarios

### ✅ Scenario 1: Bus Running Late
```
Given: Chuyến #123 scheduled at 07:30
When: Current time 07:43 (13 minutes late)
Then:
  - Delay detected: ✅ Yes
  - Severity: 🟠 High (10-14 min)
  - Admin notified: ✅ Yes
  - Parents notified: ✅ Yes (all students on trip)
  - Rate limit: ✅ Applied (max 1 per 3 min)
```

### ✅ Scenario 2: On-Time Bus
```
Given: Chuyến #124 scheduled at 08:00
When: Current time 08:03 (3 minutes late)
Then:
  - Delay detected: ❌ No (< 5 min threshold)
  - Notifications: ❌ None sent
```

### ✅ Scenario 3: Notification Persistence
```
Given: User receives 5 trip notifications
When: User reloads page
Then:
  - All 5 notifications: ✅ Still visible
  - No duplicates: ✅ Each has unique ID
  - Correct order: ✅ Newest first
```

### ✅ Scenario 4: Rate Limiting
```
Given: Delay alert sent at 07:40
When: GPS update at 07:41 (1 min later)
Then:
  - New alert: ❌ Not sent (< 3 min interval)
When: GPS update at 07:44 (4 min later)
Then:
  - New alert: ✅ Sent (≥ 3 min interval)
```

---

## 📈 Performance Optimizations

1. **In-Memory Cache:** `Map<tripId, timestamp>` prevents DB spam
2. **Single Query:** Get all admins in one DB call
3. **Bulk Insert:** `Promise.all()` for concurrent notification creation
4. **Non-Blocking:** Delay check wrapped in try-catch, won't fail GPS update
5. **Efficient Lookup:** Indexed queries on `NguoiDung.vaiTro` and `TrangThaiHocSinh.maChuyen`

---

## 🔒 Error Handling

```javascript
// 1. GPS update continues even if delay check fails
try {
  await DelayAlertService.sendDelayAlert(tripId, io);
} catch (error) {
  console.error('[SocketService] Error checking delay:', error);
  // Location update still succeeds
}

// 2. Rate limiting prevents spam
if (recentlyAlerted) {
  return { sent: false, reason: 'rate_limited' };
}

// 3. Trip not found → No error, just skip
const trip = await ChuyenDiModel.getById(tripId);
if (!trip) {
  return { isDelayed: false, delayMinutes: 0, severity: 'none' };
}
```

---

## 📋 Checklist

### Backend Implementation
- [x] Create `DelayAlertService.js` with delay detection
- [x] Integrate service into `SocketService.handleLocationUpdate()`
- [x] Add `ChuyenDiModel.getActiveByBusId()` method
- [x] Test rate limiting (3 min cooldown)
- [x] Verify admin notifications sent
- [x] Verify parent notifications sent
- [x] Check Socket.IO events emitted

### Frontend Fixes
- [x] Add `id` field to notification state type
- [x] Fix API fetch mapping (include `maThongBao`)
- [x] Fix real-time event mapping (include `maThongBao`)
- [x] Fix React render key (use `notification.id`)
- [x] Test notification persistence on reload
- [x] Verify no duplicates displayed

### Testing
- [x] Simulate late bus (delay > 5 min)
- [x] Verify admin receives alert
- [x] Verify parents receive alert
- [x] Check database notifications created
- [x] Reload page → notifications persist
- [x] Rate limit test (multiple GPS updates)

---

## 🚀 Deployment Notes

### Environment Requirements
- ✅ Node.js backend with Socket.IO
- ✅ MySQL database with `ThongBao` table
- ✅ WebSocket connection between frontend/backend

### Configuration
```javascript
// DelayAlertService.js
const DELAY_THRESHOLD_MINUTES = 5; // Adjust threshold
const DELAY_ALERT_INTERVAL_MS = 3 * 60 * 1000; // Adjust cooldown
```

### Database Indexes (Already Exist)
```sql
INDEX idx_maNguoiNhan ON ThongBao(maNguoiNhan);
INDEX idx_thoiGianGui ON ThongBao(thoiGianGui);
INDEX idx_vaiTro ON NguoiDung(vaiTro);
```

---

## 📝 Usage Examples

### Admin Dashboard
```
🟠 Xe chạy TRỄ NHIỀU
Chuyến #123 (Tuyến Đông) đang chạy trễ 12 phút so với lịch trình (07:30).
📅 Vừa xong
```

### Parent Dashboard
```
🟠 Xe đang chạy trễ
Xe buýt chuyến #123 (Tuyến Đông) đang chạy trễ 12 phút. 
Chúng tôi sẽ thông báo khi xe đến điểm đón.
📅 Vừa xong
```

---

## 🎓 Lessons Learned

1. **React Keys Matter:** Always use unique IDs (not array index) for list rendering
2. **Data Consistency:** Ensure frontend state types match API data structure
3. **Rate Limiting:** Prevent notification spam with simple in-memory cache
4. **Non-Blocking:** Background checks shouldn't fail critical operations
5. **User Experience:** Parents need delay info ASAP - real-time + persistent

---

## 🔮 Future Enhancements

### Possible Improvements
- [ ] **ETA Recalculation:** Use Google Maps API for accurate arrival time
- [ ] **Push Notifications:** Mobile app notifications via Firebase
- [ ] **Historical Analytics:** Track average delays per route/driver
- [ ] **Predictive Alerts:** Machine learning to predict delays before they happen
- [ ] **Multi-Language:** Notification templates in English/Vietnamese
- [ ] **Custom Thresholds:** Admin can configure delay threshold per route

---

## 🎉 Summary

**What Was Built:**
- ✅ Complete delay alert system with auto-detection
- ✅ Real-time notifications to admin + parents
- ✅ Rate limiting to prevent spam
- ✅ Frontend notification persistence fix
- ✅ Comprehensive error handling

**Impact:**
- 🎯 **Admin:** Immediate visibility into delayed trips
- 🎯 **Parents:** Proactive communication about delays
- 🎯 **System:** Reliable notification delivery without duplicates
- 🎯 **UX:** Notifications persist across page reloads

**Code Quality:**
- 📦 Clean service architecture
- 🔒 Safe error handling
- ⚡ Performance optimized
- 📝 Well-documented
- ✅ Production-ready

---

**Completed by:** GitHub Copilot AI Assistant  
**Date:** January 15, 2025  
**Status:** ✅ READY FOR PRODUCTION
