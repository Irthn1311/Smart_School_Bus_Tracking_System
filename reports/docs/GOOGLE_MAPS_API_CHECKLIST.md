# ✅ Google Maps API - Checklist Enable APIs

## 📋 Danh sách APIs cần Enable

Dựa trên code hiện tại, bạn cần enable các API sau trong Google Cloud Console:

### Backend APIs (gọi qua proxy)
1. ✅ **Directions API** (Legacy) - **QUAN TRỌNG - Đang thiếu!**
   - Endpoint: `https://maps.googleapis.com/maps/api/directions/json`
   - Dùng cho: Tính toán đường đi giữa các điểm
   - **⚠️ API này chưa được enable - đây là nguyên nhân lỗi REQUEST_DENIED**

2. ✅ **Distance Matrix API**
   - Endpoint: `https://maps.googleapis.com/maps/api/distancematrix/json`
   - Dùng cho: Tính khoảng cách và thời gian giữa nhiều điểm

3. ✅ **Geocoding API**
   - Endpoint: `https://maps.googleapis.com/maps/api/geocode/json`
   - Dùng cho: Chuyển đổi địa chỉ ↔ tọa độ

4. ✅ **Roads API**
   - Endpoint: `https://maps.googleapis.com/maps/api/roads/snapToRoads`
   - Dùng cho: Snap GPS points vào đường

### Frontend APIs (gọi trực tiếp)
5. ✅ **Maps JavaScript API**
   - Dùng cho: Hiển thị bản đồ trên frontend
   - Load qua: `@googlemaps/js-api-loader`

6. ✅ **Places API** (Legacy - bản cũ)
   - Dùng cho: Autocomplete địa chỉ
   - Load qua: `@googlemaps/js-api-loader` với library `places`

## 🚀 Cách Enable APIs trong Google Cloud Console

### Bước 1: Truy cập Google Cloud Console
1. Đi tới: https://console.cloud.google.com/
2. Chọn project của bạn
3. Vào **APIs & Services** > **Library**

### Bước 2: Enable từng API

#### ⚠️ QUAN TRỌNG: Directions API (Legacy)
1. Tìm kiếm: **"Directions API"** (không phải "Routes API")
2. Click vào **Directions API**
3. Click nút **ENABLE**
4. ⚠️ Đây là API đang thiếu và gây ra lỗi `REQUEST_DENIED`

#### Distance Matrix API
1. Tìm kiếm: **"Distance Matrix API"**
2. Click **ENABLE**

#### Geocoding API
1. Tìm kiếm: **"Geocoding API"**
2. Click **ENABLE**

#### Roads API
1. Tìm kiếm: **"Roads API"**
2. Click **ENABLE**

#### Maps JavaScript API
1. Tìm kiếm: **"Maps JavaScript API"**
2. Click **ENABLE**

#### Places API (Legacy)
1. Tìm kiếm: **"Places API"** (không phải "Places API (New)")
2. Click **ENABLE**

### Bước 3: Kiểm tra Enabled APIs

1. Vào **APIs & Services** > **Enabled APIs**
2. Đảm bảo thấy tất cả 6 APIs trong danh sách:
   - ✅ Maps JavaScript API
   - ✅ Directions API
   - ✅ Distance Matrix API
   - ✅ Geocoding API
   - ✅ Places API
   - ✅ Roads API

### Bước 4: Kiểm tra API Key

1. Vào **APIs & Services** > **Credentials**
2. Click vào API key của bạn
3. Kiểm tra **API restrictions**:
   - Chọn "Restrict key"
   - Chọn tất cả 6 APIs đã enable ở trên
4. Kiểm tra **Application restrictions** (nếu có):
   - HTTP referrers: `http://localhost:3000/*`, `http://localhost:4000/*`
   - Hoặc IP addresses nếu dùng LAN

### Bước 5: Đợi vài phút

Sau khi enable, đợi 1-2 phút để Google activate APIs.

### Bước 6: Restart Backend

```bash
cd ssb-backend
# Stop server (Ctrl+C)
npm run dev
```

## 🧪 Kiểm tra sau khi Enable

### Test 1: Kiểm tra trong Console
```bash
cd ssb-backend
npm run check:env
```

Phải thấy:
```
✅ MAPS_API_KEY loaded: AIza...
```

### Test 2: Test Directions API
Sau khi enable Directions API, thử lại request từ frontend. Không còn lỗi `REQUEST_DENIED`.

### Test 3: Kiểm tra Enabled APIs
Vào Google Cloud Console > APIs & Services > Enabled APIs
- Phải thấy **Directions API** trong danh sách

## ⚠️ Lưu ý quan trọng

1. **Directions API (Legacy) vs Routes API (New)**
   - Code hiện tại dùng **Directions API (Legacy)**
   - Không dùng Routes API (New)
   - Phải enable **Directions API** (không phải Routes API)

2. **Places API (Legacy) vs Places API (New)**
   - Code hiện tại dùng **Places API (Legacy)**
   - Không dùng Places API (New)
   - Phải enable **Places API** (không phải Places API (New))

3. **Billing**
   - Đảm bảo billing account đã được link với project
   - Một số APIs có free tier, nhưng vẫn cần billing account

4. **API Key Restrictions**
   - Nếu có restrictions, đảm bảo chúng không block request
   - Test với unrestricted key trước, sau đó mới thêm restrictions

## 📝 Quick Reference

| API | Endpoint | Status | Notes |
|-----|----------|--------|-------|
| Directions API | `/directions/json` | ⚠️ **Cần enable** | Legacy API |
| Distance Matrix API | `/distancematrix/json` | ✅ | |
| Geocoding API | `/geocode/json` | ✅ | |
| Roads API | `/roads/snapToRoads` | ✅ | |
| Maps JavaScript API | Frontend | ✅ | |
| Places API | Frontend | ✅ | Legacy API |

## 🔗 Links hữu ích

- [Google Cloud Console - APIs & Services](https://console.cloud.google.com/apis/library)
- [Directions API Documentation](https://developers.google.com/maps/documentation/directions)
- [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)

