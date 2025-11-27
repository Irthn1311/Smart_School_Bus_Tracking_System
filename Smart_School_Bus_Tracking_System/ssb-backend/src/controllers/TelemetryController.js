/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📡 TELEMETRY CONTROLLER - Xử lý GPS qua REST API
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Endpoint: POST /api/v1/trips/:id/telemetry
 *
 * Cho phép tài xế gửi vị trí GPS qua HTTP request (thay vì WebSocket)
 * Phù hợp khi:
 * - WebSocket bị chặn/không ổn định
 * - Driver app không hỗ trợ WebSocket
 * - Cần fallback mechanism
 *
 * @author Nguyễn Tuấn Tài
 * @date 2025-10-29
 */

import TelemetryService from "../services/telemetryService.js";

class TelemetryController {
  /**
   * 📡 CẬP NHẬT VỊ TRÍ XE QUA REST
   *
   * @route POST /api/v1/trips/:id/telemetry
   * @access Driver only
   */
  static async updatePosition(req, res) {
    try {
      const { id: tripId } = req.params;
      const { lat, lng, speed, heading } = req.body;

      // Validate
      if (!tripId) {
        return res.status(400).json({
          success: false,
          message: "Trip ID là bắt buộc",
        });
      }

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: "Latitude và Longitude là bắt buộc",
        });
      }

      // Lấy Socket.IO instance
      const io = req.app.get("io");
      if (!io) {
        return res.status(500).json({
          success: false,
          message: "Socket.IO chưa được khởi tạo",
        });
      }

      // Gọi service
      const result = await TelemetryService.updatePosition(
        tripId,
        { lat, lng, speed, heading },
        io
      );

      res.status(200).json({
        success: true,
        message: "Cập nhật vị trí thành công",
        data: {
          position: result.position,
          events: result.events,
        },
      });
    } catch (error) {
      console.error("❌ TelemetryController.updatePosition:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Lỗi khi cập nhật vị trí",
      });
    }
  }

  /**
   * 📍 LẤY VỊ TRÍ HIỆN TẠI CỦA XE
   *
   * @route GET /api/v1/buses/:id/position
   * @access Public
   */
  static async getPosition(req, res) {
    try {
      const { id: busId } = req.params;

      const position = TelemetryService.getPosition(busId);

      if (!position) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy vị trí xe",
        });
      }

      res.status(200).json({
        success: true,
        data: position,
      });
    } catch (error) {
      console.error("❌ TelemetryController.getPosition:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy vị trí xe",
      });
    }
  }
}

export default TelemetryController;
