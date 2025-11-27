import express from "express";
import IncidentController from "../../controllers/IncidentController.js";
import AuthMiddleware from "../../middlewares/AuthMiddleware.js";
import ValidationMiddleware from "../../middlewares/ValidationMiddleware.js";

const router = express.Router();

// List incidents
router.get(
  "/",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  IncidentController.list
);

// Recent incidents
router.get(
  "/recent",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  IncidentController.recent
);

// Get by id
router.get(
  "/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  IncidentController.get
);

// Create incident
router.post(
  "/",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  IncidentController.create
);

// Update incident
router.put(
  "/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  ValidationMiddleware.validateId,
  IncidentController.update
);

// Update level
router.patch(
  "/:id/level",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ValidationMiddleware.validateId,
  IncidentController.updateLevel
);

// Delete
router.delete(
  "/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ValidationMiddleware.validateId,
  IncidentController.remove
);

export default router;
