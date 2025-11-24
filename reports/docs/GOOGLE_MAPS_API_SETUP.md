# Google Maps API Setup Guide

## Lỗi: REQUEST_DENIED - Legacy API Not Enabled

Nếu bạn gặp lỗi này, có nghĩa là Google Maps Directions API (legacy) chưa được bật trong Google Cloud Console.

## Cách 1: Bật Legacy Directions API (Nhanh nhất - Khuyến nghị cho development)

### Bước 1: Truy cập Google Cloud Console
1. Đi tới [Google Cloud Console](https://console.cloud.google.com/)
2. Chọn project của bạn
3. Vào **APIs & Services** > **Library**

### Bước 2: Bật Directions API (Legacy)
1. Tìm kiếm "**Directions API**" (không phải Routes API)
2. Click vào **Directions API**
3. Click nút **ENABLE**

### Bước 3: Kiểm tra các API khác cần bật
Đảm bảo các API sau đã được bật:
- ✅ **Maps JavaScript API** (cho frontend)
- ✅ **Directions API** (legacy - cho backend)
- ✅ **Distance Matrix API** (cho backend)
- ✅ **Geocoding API** (cho backend)
- ✅ **Places API** (cho frontend autocomplete)
- ✅ **Roads API** (cho backend)

### Bước 4: Kiểm tra API Key
1. Vào **APIs & Services** > **Credentials**
2. Kiểm tra API key của bạn có:
   - **API restrictions**: Chọn "Restrict key" và chọn tất cả APIs đã bật ở trên
   - **Application restrictions**: Có thể set HTTP referrers hoặc IP restrictions

### Bước 5: Restart backend server
```bash
# Trong thư mục ssb-backend
npm run dev
```

## Cách 2: Migrate sang Routes API (New) - Cho production

Google khuyến nghị sử dụng Routes API mới thay vì Directions API legacy. Tuy nhiên, điều này yêu cầu thay đổi code.

### Lợi ích của Routes API:
- ✅ Tính năng mới hơn
- ✅ Hiệu suất tốt hơn
- ✅ Hỗ trợ tốt hơn trong tương lai
- ✅ Pricing tốt hơn cho một số use cases

### Nhược điểm:
- ❌ Cần thay đổi code trong `MapsService.js`
- ❌ Cấu trúc response khác một chút
- ❌ Cần enable Routes API thay vì Directions API

### Nếu muốn migrate:
1. Enable **Routes API** trong Google Cloud Console
2. Cập nhật code trong `ssb-backend/src/services/MapsService.js` để sử dụng endpoint mới:
   - Endpoint cũ: `https://maps.googleapis.com/maps/api/directions/json`
   - Endpoint mới: `https://routes.googleapis.com/directions/v2:computeRoutes`

## Kiểm tra API đã bật

Bạn có thể kiểm tra các API đã bật bằng cách:
1. Vào [Google Cloud Console](https://console.cloud.google.com/apis/library)
2. Xem danh sách "Enabled APIs"
3. Đảm bảo có **Directions API** trong danh sách

## Troubleshooting

### Vẫn gặp lỗi sau khi enable?
1. **Đợi vài phút**: API có thể cần thời gian để activate
2. **Kiểm tra billing**: Đảm bảo billing account đã được link
3. **Kiểm tra API key**: Đảm bảo API key có quyền truy cập Directions API
4. **Kiểm tra restrictions**: Nếu có restrictions, đảm bảo chúng không block request

### Lỗi "API key not valid"?
1. Kiểm tra `MAPS_API_KEY` trong `.env` file của backend
2. Đảm bảo API key không có restrictions quá chặt
3. Thử tạo API key mới và test

## Tài liệu tham khảo

- [Google Maps Directions API Documentation](https://developers.google.com/maps/documentation/directions)
- [Google Routes API Documentation](https://developers.google.com/maps/documentation/routes)
- [Legacy API Migration Guide](https://developers.google.com/maps/legacy#LegacyApiNotActivatedMapError)

