import express from "express";
import ReportsController from "../../controllers/ReportsController.js";
import AuthMiddleware from "../../middlewares/AuthMiddleware.js";

const router = express.Router();

router.get(
  "/overview",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ReportsController.overview
);

// View report data in JSON (for preview in FE)
router.get(
  "/view",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ReportsController.view
);

router.get(
  "/export",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ReportsController.export
);

export default router;
