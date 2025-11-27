import express from "express";
import DriverController from "../../controllers/DriverController.js";
import AuthMiddleware from "../../middlewares/AuthMiddleware.js";
import ValidationMiddleware from "../../middlewares/ValidationMiddleware.js";

const router = express.Router();

// =============================================================================
// CRUD Endpoints
// =============================================================================

// GET /api/v1/drivers - Danh sách tài xế
router.get(
  "/",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  DriverController.getAll
);

// GET /api/v1/drivers/:id - Chi tiết tài xế
router.get(
  "/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  DriverController.getById
);

// POST /api/v1/drivers - Tạo tài xế mới
router.post(
  "/",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ValidationMiddleware.validateDriver,
  DriverController.create
);

// PUT /api/v1/drivers/:id - Cập nhật tài xế
router.put(
  "/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ValidationMiddleware.validateId,
  ValidationMiddleware.validateDriver,
  DriverController.update
);

// DELETE /api/v1/drivers/:id - Xóa tài xế
router.delete(
  "/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ValidationMiddleware.validateId,
  DriverController.delete
);

// =============================================================================
// Business Logic Endpoints
// =============================================================================

// GET /api/v1/drivers/:id/schedules - Lịch trình được phân công
router.get(
  "/:id/schedules",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  DriverController.getSchedules
);

// GET /api/v1/drivers/stats - Thống kê tài xế
router.get(
  "/stats",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  DriverController.getStats
);

// GET /api/v1/drivers/:id/history - Lịch sử chuyến đi của tài xế
router.get(
  "/:id/history",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  DriverController.getHistory
);

export default router;
