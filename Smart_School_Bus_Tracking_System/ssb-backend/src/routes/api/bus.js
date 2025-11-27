import express from "express";
const router = express.Router();

import BusController from "../../controllers/BusController.js";
import AuthMiddleware from "../../middlewares/AuthMiddleware.js";
import ValidationMiddleware from "../../middlewares/ValidationMiddleware.js";

// =============================================================================
// CRUD Endpoints
// =============================================================================

// GET /api/v1/buses - Danh sách xe buýt
router.get(
  "/",
  AuthMiddleware.verifyToken,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  BusController.list
);

// GET /api/v1/buses/stats - Thống kê xe buýt
router.get(
  "/stats", // Route này sẽ được gắn vào prefix /reports/buses trong server.ts
  AuthMiddleware.authenticate, // Đổi verifyToken thành authenticate cho nhất quán
  AuthMiddleware.requireAdmin, 
  BusController.getStats // Gọi hàm vừa thêm ở trên
);


// GET /api/v1/buses/:id - Chi tiết xe buýt
router.get(
  "/:id",
  AuthMiddleware.verifyToken,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  BusController.get
);


// POST /api/v1/buses - Tạo xe buýt mới
router.post(
  "/",
  AuthMiddleware.verifyToken,
  AuthMiddleware.authorize("quan_tri"),
  ValidationMiddleware.validateBus,
  BusController.create
);

// PUT /api/v1/buses/:id - Cập nhật xe buýt
router.put(
  "/:id",
  AuthMiddleware.verifyToken,
  AuthMiddleware.authorize("quan_tri"),
  ValidationMiddleware.validateId,
  ValidationMiddleware.validateBus,
  BusController.update
);

// DELETE /api/v1/buses/:id - Xóa xe buýt
router.delete(
  "/:id",
  AuthMiddleware.verifyToken,
  AuthMiddleware.authorize("quan_tri"),
  ValidationMiddleware.validateId,
  BusController.delete
);

// =============================================================================
// Business Logic Endpoints
// =============================================================================

/**
 * @route   POST /api/v1/buses/:id/assign-driver
 * @desc    Phân công tài xế cho xe buýt
 * @param   {string} id - ID của xe buýt
 * @body    {string} driverId - ID của tài xế (required)
 * @access  Private (Admin only)
 *
 * Body example:
 * {
 *   "driverId": "5"
 * }
 */
router.post(
  "/:id/assign-driver",
  AuthMiddleware.verifyToken,
  AuthMiddleware.authorize("quan_tri"),
  ValidationMiddleware.validateId,
  ValidationMiddleware.validateAssignDriver,
  BusController.assignDriver
);

/**
 * @route   POST /api/v1/buses/:id/position
 * @desc    Cập nhật vị trí xe buýt (real-time tracking)
 * @param   {string} id - ID của xe buýt
 * @body    {number} lat - Vĩ độ (required, -90 to 90)
 * @body    {number} lng - Kinh độ (required, -180 to 180)
 * @body    {number} speed - Tốc độ km/h (optional)
 * @body    {number} heading - Hướng di chuyển 0-360 độ (optional)
 * @body    {string} timestamp - Thời gian ISO string (optional)
 * @access  Private (Tài xế only)
 *
 * Body example:
 * {
 *   "lat": 21.0285,
 *   "lng": 105.8542,
 *   "speed": 45,
 *   "heading": 90,
 *   "timestamp": "2025-10-27T10:30:00Z"
 * }
 *
 * Validation:
 * - lat ∈ [-90, 90]
 * - lng ∈ [-180, 180]
 * - speed >= 0 (nếu có)
 * - heading ∈ [0, 360] (nếu có)
 */
router.post(
  "/:id/position",
  AuthMiddleware.verifyToken,
  AuthMiddleware.authorize("tai_xe"),
  ValidationMiddleware.validateId,
  ValidationMiddleware.validatePosition,
  BusController.updatePosition
);

export default router;
