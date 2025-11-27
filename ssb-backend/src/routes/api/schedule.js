import express from "express";
import ScheduleController from "../../controllers/ScheduleController.js";
import AuthMiddleware from "../../middlewares/AuthMiddleware.js";
import ValidationMiddleware from "../../middlewares/ValidationMiddleware.js";

const router = express.Router();

// =============================================================================
// CRUD Endpoints for Schedules
// =============================================================================

// GET /api/v1/schedules - Lấy danh sách lịch trình
router.get(
  "/",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validatePagination,
  ScheduleController.getAll
);

// GET /api/v1/schedules/stats - Lấy thống kê lịch trình
router.get(
  "/stats",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ScheduleController.getStats
);

// GET /api/v1/schedules/date/:date - Lấy lịch trình theo ngày
router.get(
  "/date/:date",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ScheduleController.getByDate
);

// GET /api/v1/schedules/:id - Lấy chi tiết lịch trình
router.get(
  "/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  ScheduleController.getById
);

// POST /api/v1/schedules - Tạo lịch trình mới
router.post(
  "/",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ValidationMiddleware.validateSchedule,
  ScheduleController.create
);

// PUT /api/v1/schedules/:id - Cập nhật lịch trình
router.put(
  "/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ValidationMiddleware.validateId,
  ScheduleController.update
);

// DELETE /api/v1/schedules/:id - Xóa lịch trình
router.delete(
  "/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ValidationMiddleware.validateId,
  ScheduleController.delete
);

// =============================================================================
// Business Logic Endpoints
// =============================================================================

// POST /api/v1/schedules/:id/status - Cập nhật trạng thái và phát sự kiện real-time
router.post(
  "/:id/status",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  ScheduleController.updateStatus
);

// GET /api/v1/schedules/:id/students - Lấy danh sách học sinh của schedule
router.get(
  "/:id/students",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  ScheduleController.getStudents
);

export default router;
