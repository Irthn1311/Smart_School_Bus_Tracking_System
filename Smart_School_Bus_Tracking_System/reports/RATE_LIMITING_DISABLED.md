# Rate Limiting Disabled for Development

## ⚠️ Lưu ý quan trọng

Rate limiting đã được **TẮT** để phục vụ phát triển đồ án. Điều này cho phép gửi nhiều requests mà không bị chặn.

## Các vị trí đã tắt rate limiting:

1. **`ssb-backend/src/server.ts`**
   - General API rate limiter (100 requests / 15 phút) - ĐÃ TẮT

2. **`ssb-backend/src/routes/api/auth.js`**
   - Login rate limiter (5 attempts / 15 phút) - ĐÃ TẮT

3. **`ssb-backend/src/routes/api/trip.route.js`**
   - Trip creation rate limiter (10 trips / 1 phút) - ĐÃ TẮT

## ⚠️ Trước khi deploy production:

**NHỚ BẬT LẠI RATE LIMITING** để bảo vệ server khỏi:
- DDoS attacks
- Brute force attacks
- Resource exhaustion
- API abuse

## Cách bật lại:

1. Uncomment các dòng code đã comment trong các file trên
2. Restart backend server
3. Test lại để đảm bảo rate limiting hoạt động

## Maps API Rate Limiting:

**KHÔNG TẮT** rate limiting cho Maps API (`ssb-backend/src/middlewares/mapsLimiter.js`) vì:
- Google Maps API có quota và billing
- Cần bảo vệ khỏi vượt quota
- Chi phí có thể phát sinh nếu không có rate limiting

---

**Ngày tắt:** $(date)
**Lý do:** Phục vụ phát triển đồ án - cần test với nhiều requests

