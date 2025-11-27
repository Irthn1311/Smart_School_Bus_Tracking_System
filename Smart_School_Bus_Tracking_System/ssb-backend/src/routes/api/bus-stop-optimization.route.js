import express from "express";
import rateLimit from "express-rate-limit";
import BusStopOptimizationController from "../../controllers/BusStopOptimizationController.js";
import AuthMiddleware from "../../middlewares/AuthMiddleware.js";

const router = express.Router();

// Rate limiters
const optimizationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Quá nhiều yêu cầu tối ưu hóa. Vui lòng thử lại sau.",
    },
  },
});

const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
    },
  },
});

// =============================================================================
// Bus Stop Optimization Endpoints (Tier 1)
// =============================================================================

// POST /api/v1/bus-stops/optimize - Chạy Tầng 1 (Greedy Maximum Coverage)
router.post(
  "/optimize",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  optimizationLimiter,
  BusStopOptimizationController.optimizeBusStops
);

// GET /api/v1/bus-stops/assignments - Lấy danh sách assignments
router.get(
  "/assignments",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  readLimiter,
  BusStopOptimizationController.getAssignments
);

// GET /api/v1/bus-stops/stats - Lấy thống kê
router.get(
  "/stats",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  readLimiter,
  BusStopOptimizationController.getStats
);

// POST /api/v1/bus-stops/optimize-full - Chạy cả 2 tầng
router.post(
  "/optimize-full",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  optimizationLimiter,
  BusStopOptimizationController.optimizeFull
);

// POST /api/v1/bus-stops/create-routes - Tạo tuyến đường từ kết quả VRP
router.post(
  "/create-routes",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  optimizationLimiter,
  BusStopOptimizationController.createRoutes
);

// POST /api/v1/bus-stops/create-schedules - Tự động tạo lịch trình từ tuyến đường
router.post(
  "/create-schedules",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  optimizationLimiter,
  BusStopOptimizationController.createSchedules
);

export default router;

