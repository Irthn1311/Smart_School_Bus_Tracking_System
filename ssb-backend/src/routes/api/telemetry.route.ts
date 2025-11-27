import express from "express";
import TelemetryController from "../../controllers/TelemetryController.ts";
import AuthMiddleware from "../../middlewares/AuthMiddleware.js";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🛰️ TELEMETRY ROUTES - GPS & Vị trí xe
 * ═══════════════════════════════════════════════════════════════════════════
 * @author Nguyễn Tuấn Tài
 * @date 2025-10-29
 */

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────
// 📤 POST /api/trips/:id/telemetry
// ─────────────────────────────────────────────────────────────────────────
// Tài xế gửi GPS qua REST API (fallback nếu WebSocket die)
// Body: { lat, lng, speed?, heading? }
router.post(
  "/trips/:id/telemetry",
  AuthMiddleware.authenticate,
  TelemetryController.updatePosition
);

// ─────────────────────────────────────────────────────────────────────────
// 📥 GET /api/buses/:id/position
// ─────────────────────────────────────────────────────────────────────────
// Lấy vị trí hiện tại của xe (từ cache in-memory)
router.get(
  "/buses/:id/position",
  AuthMiddleware.authenticate,
  TelemetryController.getPosition
);

export default router;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📖 CÁCH SỬ DỤNG
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1️⃣ CẬP NHẬT VỊ TRÍ (Driver):
 * POST /api/trips/42/telemetry
 * Headers: { Authorization: "Bearer <driver_token>" }
 * Body: {
 *   "lat": 21.0285,
 *   "lng": 105.8542,
 *   "speed": 35,
 *   "heading": 90
 * }
 *
 * Response 200:
 * {
 *   "success": true,
 *   "events": ["bus_position_update", "approach_stop"]
 * }
 *
 * 2️⃣ LẤY VỊ TRÍ HIỆN TẠI (Parent/Admin):
 * GET /api/buses/5/position
 * Headers: { Authorization: "Bearer <token>" }
 *
 * Response 200:
 * {
 *   "success": true,
 *   "data": {
 *     "busId": 5,
 *     "tripId": 42,
 *     "lat": 21.0285,
 *     "lng": 105.8542,
 *     "speed": 35,
 *     "heading": 90,
 *     "timestamp": "2025-10-29T10:30:45.123Z"
 *   }
 * }
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
