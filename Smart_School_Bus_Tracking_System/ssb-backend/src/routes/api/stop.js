import express from "express";
import StopController from "../../controllers/StopController.js";
import AuthMiddleware from "../../middlewares/AuthMiddleware.js";
import ValidationMiddleware from "../../middlewares/ValidationMiddleware.js";

const router = express.Router();

// =============================================================================
// CRUD Endpoints for Stops (Điểm dừng độc lập)
// =============================================================================

// GET /api/v1/stops - Lấy danh sách điểm dừng
router.get(
  "/",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  StopController.getAllStops
);

// GET /api/v1/stops/:id - Lấy thông tin chi tiết điểm dừng
router.get(
  "/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  StopController.getStopById
);

// POST /api/v1/stops - Tạo điểm dừng mới
router.post(
  "/",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ValidationMiddleware.validateStop,
  StopController.createStop
);

// PUT /api/v1/stops/:id - Cập nhật điểm dừng
router.put(
  "/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ValidationMiddleware.validateId,
  StopController.updateStop
);

// DELETE /api/v1/stops/:id - Xóa điểm dừng
router.delete(
  "/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ValidationMiddleware.validateId,
  StopController.deleteStop
);

export default router;

