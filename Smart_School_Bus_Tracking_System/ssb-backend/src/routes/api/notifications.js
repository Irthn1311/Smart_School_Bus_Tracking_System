import express from "express";
import NotificationController from "../../controllers/NotificationController.js";
import AuthMiddleware from "../../middlewares/AuthMiddleware.js";
import ValidationMiddleware from "../../middlewares/ValidationMiddleware.js";

const router = express.Router();

// List notifications for current user
router.get(
  "/",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe", "phu_huynh"),
  NotificationController.list
);

// Unread count
router.get(
  "/unread-count",
  AuthMiddleware.authenticate,
  NotificationController.unreadCount
);

// Create notification (admin only)
router.post(
  "/",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  NotificationController.create
);

// Bulk create (admin only)
router.post(
  "/bulk",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  NotificationController.createBulk
);

// Mark a notification as read
router.patch(
  "/:id/read",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe", "phu_huynh"),
  ValidationMiddleware.validateId,
  NotificationController.markRead
);

// Mark all as read
router.patch(
  "/read-all",
  AuthMiddleware.authenticate,
  NotificationController.markAllRead
);

// Delete one
router.delete(
  "/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe", "phu_huynh"),
  ValidationMiddleware.validateId,
  NotificationController.remove
);

// Delete all read
router.delete(
  "/clean-read",
  AuthMiddleware.authenticate,
  NotificationController.cleanRead
);

export default router;
