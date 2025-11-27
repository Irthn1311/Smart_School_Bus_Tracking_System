import express from "express";
import rateLimit from "express-rate-limit";
import TripController from "../../controllers/TripController.ts";
import AuthMiddleware from "../../middlewares/AuthMiddleware.js";
import ValidationMiddleware from "../../middlewares/ValidationMiddleware.js";

const router = express.Router();

// =============================================================================
// CRUD Endpoints for Trips
// =============================================================================

// GET /api/v1/trips/history - Lịch sử chuyến đi cho phụ huynh
router.get(
  "/history",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "phu_huynh"),
  TripController.getHistory
);

// GET /api/v1/trips/stats - Lấy thống kê chuyến đi
router.get(
  "/stats",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  TripController.getStats
);

// GET /api/v1/trips - Lấy danh sách chuyến đi
router.get(
  "/",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe", "phu_huynh"),
  ValidationMiddleware.validatePagination,
  TripController.getAll
);

// M8: Rate limit for trip creation (burst protection) - DISABLED FOR DEVELOPMENT
// 🔥 Tắt rate limiting để phục vụ phát triển đồ án
// const tripCreateLimiter = rateLimit({
//   windowMs: 60 * 1000, // 1 minute
//   max: 10, // Max 10 trips per minute
//   message: {
//     success: false,
//     code: "RATE_LIMIT_EXCEEDED",
//     message: "Quá nhiều yêu cầu tạo chuyến đi, vui lòng thử lại sau",
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// POST /api/v1/trips - Tạo chuyến đi mới (Admin only)
// Rate limit đã tắt cho development
router.post(
  "/",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ValidationMiddleware.validateTrip,
  TripController.create
);

// POST /api/v1/trips/:id/incident - Báo cáo sự cố
// 🔥 FIX: Route này phải được định nghĩa TRƯỚC route /:id để tránh conflict
router.post(
  "/:id/incident",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  TripController.reportIncident
);

// =============================================================================
// 🔥 FIX: Specific routes MUST be defined BEFORE generic /:id route
// =============================================================================
// Trip State Management Endpoints
// =============================================================================

// POST /api/v1/trips/:id/start - Bắt đầu chuyến đi
router.post(
  "/:id/start",
  AuthMiddleware.authenticate,
  AuthMiddleware.checkTripAccess,
  ValidationMiddleware.validateId,
  TripController.startTrip
);

// POST /api/v1/trips/:id/end - Kết thúc chuyến đi
router.post(
  "/:id/end",
  AuthMiddleware.authenticate,
  AuthMiddleware.checkTripAccess,
  ValidationMiddleware.validateId,
  TripController.endTrip
);

// POST /api/v1/trips/:id/cancel - Hủy chuyến đi
router.post(
  "/:id/cancel",
  AuthMiddleware.authenticate,
  AuthMiddleware.checkTripAccess,
  ValidationMiddleware.validateId,
  TripController.cancelTrip
);

// =============================================================================
// Student Management in Trips
// =============================================================================

// POST /api/v1/trips/:id/students/:studentId/checkin - Check-in học sinh (lên xe)
router.post(
  "/:id/students/:studentId/checkin",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  TripController.checkinStudent
);

// POST /api/v1/trips/:id/students/:studentId/checkout - Check-out học sinh (xuống xe)
router.post(
  "/:id/students/:studentId/checkout",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  TripController.checkoutStudent
);

// POST /api/v1/trips/:id/students/:studentId/absent - Đánh vắng học sinh
router.post(
  "/:id/students/:studentId/absent",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  TripController.markStudentAbsent
);

// POST /api/v1/trips/:id/students - Thêm học sinh vào chuyến đi
router.post(
  "/:id/students",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  TripController.addStudent
);

// PUT /api/v1/trips/:id/students/:studentId - Cập nhật trạng thái học sinh (Legacy)
router.put(
  "/:id/students/:studentId",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  TripController.updateStudentStatus
);

// PUT /api/v1/trips/:id/students/:studentId/status - Cập nhật trạng thái học sinh (Alternative)
router.put(
  "/:id/students/:studentId/status",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  TripController.updateStudentStatus
);

// =============================================================================
// Stop Management Routes (must be BEFORE generic /:id route)
// =============================================================================

// GET /api/v1/trips/:id/stops/:sequence/students - Lấy danh sách học sinh tại điểm dừng
router.get(
  "/:id/stops/:sequence/students",
  AuthMiddleware.authenticate,
  AuthMiddleware.checkTripAccess,
  ValidationMiddleware.validateId,
  TripController.getStudentsAtStop
);

// GET /api/v1/trips/:id/students-from-morning - Get students from morning trip (for afternoon trip)
router.get(
  "/:id/students-from-morning",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  TripController.getStudentsFromMorningTrip
);

// M5: Arrive at stop (Driver only) - notify parents when bus arrives at stop
router.post(
  "/:id/stops/:stopId/arrive",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  TripController.arriveAtStop
);

// M5: Leave stop (Driver only) - notify parents when bus leaves stop
router.post(
  "/:id/stops/:stopId/leave",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  TripController.leaveStop
);

// Get stop status (Driver & Parent) - get arrival/departure times for all stops
router.get(
  "/:id/stops/status",
  AuthMiddleware.authenticate,
  AuthMiddleware.checkTripAccess,
  ValidationMiddleware.validateId,
  TripController.getStopStatus
);

// =============================================================================
// Generic CRUD Endpoints (must be AFTER specific routes)
// =============================================================================

// GET /api/v1/trips/:id - Lấy thông tin chi tiết chuyến đi
router.get(
  "/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.checkTripAccess,
  ValidationMiddleware.validateId,
  TripController.getById
);

// PUT /api/v1/trips/:id - Cập nhật chuyến đi
router.put(
  "/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.checkTripAccess,
  ValidationMiddleware.validateId,
  TripController.update
);

// DELETE /api/v1/trips/:id - Xóa chuyến đi
router.delete(
  "/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ValidationMiddleware.validateId,
  TripController.delete
);

export default router;

// ============================================================
// 📚 TÀI LIỆU HƯỚNG DẪN - TRIP ROUTES
// ============================================================

/**
 * 🎯 MỤC ĐÍCH FILE NÀY
 *
 * File trip.route.js định nghĩa các API endpoints cho chuyến đi.
 *
 * Công việc chính:
 * - Bắt HTTP requests từ client (Postman, mobile app, web app)
 * - Gắn middleware (kiểm tra đăng nhập, phân quyền)
 * - Chuyển tiếp request đến Controller xử lý
 *
 * ═══════════════════════════════════════════════════════════
 *
 * 🏗️ FLOW XỬ LÝ REQUEST
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  CLIENT (Mobile App, Web App, Postman)                 │
 * │  POST /api/trips/123/start                             │
 * │  Headers: { Authorization: "Bearer token..." }         │
 * └────────────────────┬────────────────────────────────────┘
 *                      ↓
 * ┌─────────────────────────────────────────────────────────┐
 * │  EXPRESS SERVER                                         │
 * │  app.use('/api/trips', tripRoutes) ← Mount point       │
 * └────────────────────┬────────────────────────────────────┘
 *                      ↓
 * ┌─────────────────────────────────────────────────────────┐
 * │  ROUTE ← BẠN ĐANG Ở ĐÂY!                               │
 * │  router.post('/:id/start', ...)                        │
 * │  Khớp URL pattern? → Tiếp tục                          │
 * └────────────────────┬────────────────────────────────────┘
 *                      ↓
 * ┌─────────────────────────────────────────────────────────┐
 * │  MIDDLEWARE 1: AuthMiddleware.authenticate             │
 * │  Kiểm tra JWT token hợp lệ?                            │
 * │  - Nếu KHÔNG → 401 Unauthorized, DỪNG!                 │
 * │  - Nếu CÓ → Gắn req.user, tiếp tục                     │
 * └────────────────────┬────────────────────────────────────┘
 *                      ↓
 * ┌─────────────────────────────────────────────────────────┐
 * │  MIDDLEWARE 2 (Optional): requireAdmin/requireDriver  │
 * │  Kiểm tra vai trò user?                                │
 * │  - Nếu KHÔNG đủ quyền → 403 Forbidden, DỪNG!           │
 * │  - Nếu ĐỦ QUYỀN → Tiếp tục                             │
 * └────────────────────┬────────────────────────────────────┘
 *                      ↓
 * ┌─────────────────────────────────────────────────────────┐
 * │  CONTROLLER: TripController.startTrip(req, res)        │
 * │  - Lấy data từ req.params, req.body                    │
 * │  - Gọi Service xử lý logic                             │
 * │  - Trả JSON response về client                         │
 * └─────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════
 *
 * 💡 SO SÁNH VỚI THỰC TẾ
 *
 * Route giống như SECURITY GUARD ở cửa nhà hàng:
 * - Kiểm tra khách có vé (token) không?
 * - Kiểm tra vé VIP (admin) hay vé thường (driver, parent)?
 * - Nếu OK → Cho vào
 * - Nếu KHÔNG OK → Từ chối ngay, không cho vào
 *
 * Controller giống như PHỤC VỤ bên trong nhà hàng:
 * - Nhận order từ khách (request data)
 * - Gọi đầu bếp (Service) nấu món
 * - Mang đồ ra cho khách (response)
 *
 * ═══════════════════════════════════════════════════════════
 */

/**
 * 📖 DANH SÁCH ROUTES
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ Method │ Path              │ Quyền        │ Controller              │ Mô tả│
 * ├────────┼───────────────────┼──────────────┼─────────────────────────┼──────┤
 * │ GET    │ /stats            │ Admin only   │ TripController.getStats │ Thống│
 * │        │                   │              │                         │ kê   │
 * │        │                   │              │                         │ trip │
 * ├────────┼───────────────────┼──────────────┼─────────────────────────┼──────┤
 * │ POST   │ /:id/start        │ Authenticated│ TripController.         │ Bắt  │
 * │        │                   │ (Driver rec) │ startTrip               │ đầu  │
 * │        │                   │              │                         │ trip │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════
 */

/**
 * 📊 ROUTE 1: GET /api/trips/stats
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  ENDPOINT: GET /api/trips/stats                        │
 * ├─────────────────────────────────────────────────────────┤
 * │  Quyền:    Admin only                                  │
 * │  Input:    Không cần body/params                       │
 * │  Output:   Thống kê chuyến đi                          │
 * └─────────────────────────────────────────────────────────┘
 *
 * ─────────────────────────────────────────────────────────
 * VÍ DỤ REQUEST:
 * ─────────────────────────────────────────────────────────
 *
 * GET http://localhost:4000/api/trips/stats
 * Headers: {
 *   "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR..."
 * }
 *
 * ─────────────────────────────────────────────────────────
 * VÍ DỤ RESPONSE (200 OK):
 * ─────────────────────────────────────────────────────────
 *
 * {
 *   "totalTrips": 150,
 *   "completedTrips": 120,
 *   "ongoingTrips": 5,
 *   "cancelledTrips": 25
 * }
 *
 * ─────────────────────────────────────────────────────────
 * ERRORS:
 * ─────────────────────────────────────────────────────────
 *
 * 401 Unauthorized:
 * {
 *   "error": "No token provided"
 * }
 *
 * 403 Forbidden:
 * {
 *   "error": "Admin access required"
 * }
 *
 * ═══════════════════════════════════════════════════════════
 */

/**
 * 🚀 ROUTE 2: POST /api/trips/:id/start
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  ENDPOINT: POST /api/trips/:id/start                   │
 * ├─────────────────────────────────────────────────────────┤
 * │  Quyền:    Authenticated (Driver recommended)          │
 * │  Input:    URL param: id (maChuyen)                    │
 * │  Output:   Trip object sau khi start                   │
 * └─────────────────────────────────────────────────────────┘
 *
 * ─────────────────────────────────────────────────────────
 * FLOW HOẠT ĐỘNG:
 * ─────────────────────────────────────────────────────────
 *
 * 1. Driver mở app → Nhấn "Bắt đầu chuyến"
 * 2. App gửi POST /api/trips/123/start + JWT token
 * 3. AuthMiddleware.authenticate:
 *    - Verify JWT token
 *    - Nếu hợp lệ → Gắn req.user = { userId, email, vaiTro }
 *    - Nếu không hợp lệ → 401 Unauthorized
 * 4. TripController.startTrip():
 *    - Lấy tripId = req.params.id ("123")
 *    - Gọi tripService.startTrip(tripId)
 *    - Service cập nhật DB: trangThai="dang_chay", gioBatDauThucTe=NOW()
 *    - Console.log event trip_started (Day 3: emit Socket.IO)
 *    - Trả response
 * 5. Driver app nhận response → Cập nhật UI
 *
 * ─────────────────────────────────────────────────────────
 * VÍ DỤ REQUEST:
 * ─────────────────────────────────────────────────────────
 *
 * POST http://localhost:4000/api/trips/123/start
 * Headers: {
 *   "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR..."
 * }
 * Body: {} (có thể rỗng)
 *
 * ─────────────────────────────────────────────────────────
 * VÍ DỤ RESPONSE (200 OK):
 * ─────────────────────────────────────────────────────────
 *
 * {
 *   "success": true,
 *   "message": "Trip started",
 *   "trip": {
 *     "maChuyen": 123,
 *     "trangThai": "dang_chay",
 *     "gioBatDauThucTe": "2025-10-27T06:30:00.000Z"
 *   }
 * }
 *
 * ─────────────────────────────────────────────────────────
 * ERRORS:
 * ─────────────────────────────────────────────────────────
 *
 * 401 Unauthorized (token không hợp lệ):
 * {
 *   "error": "Invalid token"
 * }
 *
 * 404 Not Found (trip không tồn tại):
 * {
 *   "success": false,
 *   "message": "Không tìm thấy chuyến đi"
 * }
 *
 * 400 Bad Request (trạng thái sai):
 * {
 *   "success": false,
 *   "message": "Chỉ có thể bắt đầu chuyến đi chưa khởi hành"
 * }
 *
 * ═══════════════════════════════════════════════════════════
 */

/**
 * 🧪 TEST BẰNG POSTMAN
 *
 * ─────────────────────────────────────────────────────────
 * TEST 1: START TRIP THÀNH CÔNG
 * ─────────────────────────────────────────────────────────
 *
 * 1. Lấy token từ login:
 *    POST http://localhost:4000/api/auth/login
 *    Body: { email: "driver01@ssb.vn", password: "123456" }
 *    → Copy "token" từ response
 *
 * 2. Start trip:
 *    POST http://localhost:4000/api/trips/1/start
 *    Headers: { Authorization: "Bearer <token>" }
 *    → Expect: 200 OK, trip.trangThai = "dang_chay"
 *
 * ─────────────────────────────────────────────────────────
 * TEST 2: KHÔNG CÓ TOKEN (401)
 * ─────────────────────────────────────────────────────────
 *
 * POST http://localhost:4000/api/trips/1/start
 * Headers: {} (không có Authorization)
 * → Expect: 401 Unauthorized
 *
 * ─────────────────────────────────────────────────────────
 * TEST 3: TRIP KHÔNG TỒN TẠI (404)
 * ─────────────────────────────────────────────────────────
 *
 * POST http://localhost:4000/api/trips/999/start
 * Headers: { Authorization: "Bearer <token>" }
 * → Expect: 404 Not Found
 *
 * ─────────────────────────────────────────────────────────
 * TEST 4: START TRIP ĐÃ CHẠY RỒI (400)
 * ─────────────────────────────────────────────────────────
 *
 * 1. Start trip lần 1 → 200 OK
 * 2. Start trip lần 2 với cùng tripId → 400 Bad Request
 *    "Chỉ có thể bắt đầu chuyến đi chưa khởi hành"
 *
 * ═══════════════════════════════════════════════════════════
 */

/**
 * 💡 TẠI SAO CẦN ROUTE NÀY?
 *
 * Chức năng trong hệ thống:
 *
 * 1️⃣ Driver Check-in:
 *    - Tài xế "check-in" khi bắt đầu lái xe
 *    - Ghi lại thời gian bắt đầu thực tế
 *    - So sánh với kế hoạch (late? early?)
 *
 * 2️⃣ Tracking Realtime:
 *    - Phụ huynh biết xe đã khởi hành
 *    - Bắt đầu tracking vị trí GPS
 *    - Hiển thị "Xe đang đến"
 *
 * 3️⃣ Business Logic:
 *    - Chỉ start được trip "chua_khoi_hanh"
 *    - Không start được trip đã chạy/hoàn thành
 *    - Đảm bảo tính toàn vẹn dữ liệu
 *
 * 4️⃣ Event Trigger (Day 3):
 *    - Emit Socket.IO event "trip_started"
 *    - Frontend realtime update UI
 *    - Parent app hiển thị notification
 *
 * ═══════════════════════════════════════════════════════════
 */

/**
 * 🔗 LIÊN KẾT VỚI CÁC PHẦN KHÁC
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  FILES LIÊN QUAN                                        │
 * ├─────────────────────────────────────────────────────────┤
 * │  • Controller: TripController.js                       │
 * │    Xử lý logic, gọi Service                            │
 * │                                                         │
 * │  • Service: tripService.js                             │
 * │    Validate, update DB                                 │
 * │                                                         │
 * │  • Middleware: AuthMiddleware.js                       │
 * │    Verify JWT, check roles                             │
 * │                                                         │
 * │  • Mount point: app.js                                 │
 * │    app.use('/api/trips', tripRoutes)                   │
 * │                                                         │
 * │  • Day 1: wsAuth.js                                    │
 * │    JWT authentication logic                            │
 * │                                                         │
 * │  • Day 3: Socket.IO                                    │
 * │    Emit event "trip_started"                           │
 * │                                                         │
 * │  • Day 4: GPS Telemetry                                │
 * │    Sau start, driver gửi GPS liên tục                  │
 * └─────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════
 */

/**
 * 📝 TODO - ROUTES SẼ BỔ SUNG
 *
 * ─────────────────────────────────────────────────────────
 * DAY 4 (29/10):
 * ─────────────────────────────────────────────────────────
 *
 * 1. POST /:id/end
 *    - Kết thúc chuyến đi
 *    - Driver only
 *    - Đổi trangThai → "da_hoan_thanh"
 *
 * 2. POST /:id/telemetry
 *    - Nhận GPS data từ driver
 *    - Driver only
 *    - Lưu vào DB + broadcast Socket.IO
 *
 * 3. GET /:id
 *    - Lấy chi tiết một chuyến
 *    - Authenticated users
 *    - Trả full info trip
 *
 * ─────────────────────────────────────────────────────────
 * DAY 5 (30/10):
 * ─────────────────────────────────────────────────────────
 *
 * 4. GET /
 *    - Danh sách chuyến đi
 *    - Filter: date, status, driverId...
 *    - Pagination: limit, offset
 *
 * 5. POST /
 *    - Tạo chuyến mới từ schedule
 *    - Admin only
 *    - Auto generate trip cho ngày mai
 *
 * ─────────────────────────────────────────────────────────
 * VÍ DỤ CODE SẼ THÊM:
 * ─────────────────────────────────────────────────────────
 *
 * router.post(
 *   "/:id/telemetry",
 *   AuthMiddleware.authenticate,
 *   AuthMiddleware.requireDriver,
 *   TripController.receiveTelemetry
 * );
 *
 * router.post(
 *   "/:id/end",
 *   AuthMiddleware.authenticate,
 *   AuthMiddleware.requireDriver,
 *   TripController.endTrip
 * );
 *
 * router.get(
 *   "/",
 *   AuthMiddleware.authenticate,
 *   TripController.getAllTrips
 * );
 *
 * ═══════════════════════════════════════════════════════════
 */

/**
 * 🔐 BẢO MẬT VÀ PHÂN QUYỀN
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  AUTHENTICATION vs AUTHORIZATION                        │
 * └─────────────────────────────────────────────────────────┘
 *
 * Authentication (Xác thực):
 * - "Bạn là ai?"
 * - Kiểm tra JWT token hợp lệ
 * - AuthMiddleware.authenticate
 *
 * Authorization (Phân quyền):
 * - "Bạn có quyền làm gì?"
 * - Kiểm tra vai trò (admin, driver, parent)
 * - AuthMiddleware.requireAdmin / requireDriver
 *
 * ─────────────────────────────────────────────────────────
 * PHÂN QUYỀN CHO TỪNG ROUTE:
 * ─────────────────────────────────────────────────────────
 *
 * GET /stats:
 * ✅ Admin → OK
 * ❌ Driver → 403 Forbidden
 * ❌ Parent → 403 Forbidden
 *
 * POST /:id/start:
 * ✅ Driver (được phân công) → OK
 * ⚠️ Hiện tại: Bất kỳ user đăng nhập (TODO: thêm requireDriver)
 *
 * POST /:id/end:
 * ✅ Driver (được phân công) → OK
 * ❌ Parent → 403 Forbidden
 *
 * ═══════════════════════════════════════════════════════════
 */

/**
 * 🎓 BÀI HỌC QUAN TRỌNG
 *
 * 1️⃣ MIDDLEWARE CHAIN:
 *    - Middleware chạy theo thứ tự từ trái qua phải
 *    - Nếu middleware không gọi next() → Dừng chain
 *    - Thứ tự: authenticate → authorize → controller
 *
 * 2️⃣ SEPARATION OF CONCERNS:
 *    - Route: Định nghĩa endpoint + middleware
 *    - Controller: Xử lý request/response
 *    - Service: Logic nghiệp vụ
 *    - Model: Database queries
 *
 * 3️⃣ RESTFUL API DESIGN:
 *    - GET: Lấy dữ liệu (không thay đổi state)
 *    - POST: Tạo mới hoặc trigger action
 *    - PUT/PATCH: Cập nhật
 *    - DELETE: Xóa
 *
 * 4️⃣ URL PARAMS vs BODY:
 *    - Params (:id): Định danh resource
 *    - Body: Dữ liệu cần gửi
 *    - Query (?date=2025-10-27): Filter/pagination
 *
 * 5️⃣ ERROR HANDLING:
 *    - Route không handle error (để Controller làm)
 *    - Controller catch error từ Service
 *    - Trả HTTP status code phù hợp
 *
 * ═══════════════════════════════════════════════════════════
 *
 * @author Nguyễn Tuấn Tài - M4/M5/M6
 * @date 2025-10-27 (Day 2 - Trip Lifecycle)
 * @lastUpdate 2025-10-28 (Refactor comments to end of file)
 */
