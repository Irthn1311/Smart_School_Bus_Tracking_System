/**
 * SettingsController - M8: Admin Settings
 * 
 * Endpoints:
 * - GET /api/settings
 * - PUT /api/settings
 */

import SettingsService from "../services/settingsService.js";
import * as response from "../utils/response.js";

class SettingsController {
  /**
   * GET /api/settings
   * Returns current system settings
   */
  static async getSettings(req, res) {
    try {
      const settings = SettingsService.getSettings();
      return response.ok(res, settings);
    } catch (error) {
      console.error("Error in SettingsController.getSettings:", error);
      return response.serverError(res, "Lỗi server khi lấy cài đặt", error);
    }
  }

  /**
   * PUT /api/settings
   * Updates system settings
   */
  static async updateSettings(req, res) {
    try {
      const updates = req.body;

      // Validate required fields
      if (!updates || Object.keys(updates).length === 0) {
        return response.validationError(res, "Không có dữ liệu cập nhật", [
          { field: "body", message: "Cần ít nhất một trường để cập nhật" },
        ]);
      }

      const updatedSettings = SettingsService.updateSettings(updates);

      return response.ok(res, updatedSettings, {
        message: "Cài đặt đã được cập nhật và áp dụng",
      });
    } catch (error) {
      if (error.message === "VALIDATION_ERROR" && error.errors) {
        return response.validationError(res, "Lỗi validation", error.errors);
      }
      console.error("Error in SettingsController.updateSettings:", error);
      return response.serverError(res, "Lỗi server khi cập nhật cài đặt", error);
    }
  }
}

export default SettingsController;

