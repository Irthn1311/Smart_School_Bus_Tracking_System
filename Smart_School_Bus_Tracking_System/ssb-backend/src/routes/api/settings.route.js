import express from "express";
import SettingsController from "../../controllers/SettingsController.js";
import AuthMiddleware from "../../middlewares/AuthMiddleware.js";

const router = express.Router();

/**
 * M8: Settings Endpoints
 * 
 * GET /api/settings - Get current settings (Admin only)
 * PUT /api/settings - Update settings (Admin only)
 */

// GET /api/settings
router.get(
  "/",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"), // Admin only
  SettingsController.getSettings
);

// PUT /api/settings
router.put(
  "/",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"), // Admin only
  SettingsController.updateSettings
);

export default router;

