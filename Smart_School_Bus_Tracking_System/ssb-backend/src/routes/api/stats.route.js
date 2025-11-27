import express from "express";
import StatsController from "../../controllers/StatsController.js";
import AuthMiddleware from "../../middlewares/AuthMiddleware.js";

const router = express.Router();

/**
 * M7: Stats Endpoints
 * 
 * GET /api/stats/overview - Overall statistics
 * GET /api/stats/trips-by-day - Daily trip statistics
 * GET /api/stats/driver-performance - Driver performance
 * GET /api/stats/bus-utilization - Bus utilization
 * GET /api/stats/route-punctuality - Route punctuality
 * 
 * Filters: ?from=YYYY-MM-DD&to=YYYY-MM-DD&routeId=&driverId=&busId=
 * RBAC: Admin full access; Driver can only see own stats; Parent 403
 */

// GET /api/stats/overview
router.get(
  "/overview",
  AuthMiddleware.authenticate,
  (req, res, next) => {
    // Parent cannot access stats
    if (req.user.vaiTro === "phu_huynh") {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        message: "Phụ huynh không có quyền truy cập thống kê",
      });
    }
    next();
  },
  StatsController.overview
);

// GET /api/stats/trips-by-day
router.get(
  "/trips-by-day",
  AuthMiddleware.authenticate,
  (req, res, next) => {
    if (req.user.vaiTro === "phu_huynh") {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        message: "Phụ huynh không có quyền truy cập thống kê",
      });
    }
    next();
  },
  StatsController.tripsByDay
);

// GET /api/stats/driver-performance
router.get(
  "/driver-performance",
  AuthMiddleware.authenticate,
  (req, res, next) => {
    if (req.user.vaiTro === "phu_huynh") {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        message: "Phụ huynh không có quyền truy cập thống kê",
      });
    }
    next();
  },
  StatsController.driverPerformance
);

// GET /api/stats/bus-utilization
router.get(
  "/bus-utilization",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"), // Only admin
  StatsController.busUtilization
);

// GET /api/stats/route-punctuality
router.get(
  "/route-punctuality",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"), // Only admin
  StatsController.routePunctuality
);

export default router;

