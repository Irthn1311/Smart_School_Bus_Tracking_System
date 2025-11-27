import express from "express";
import MapsController from "../../controllers/MapsController.js";
import AuthMiddleware from "../../middlewares/AuthMiddleware.js";
import {
  distanceMatrixLimiter,
  directionsLimiter,
  geocodeLimiter,
  roadsLimiter,
} from "../../middlewares/mapsLimiter.js";

const router = express.Router();

// =============================================================================
// Maps API Proxy Endpoints
// =============================================================================

// POST /api/v1/maps/directions - Get Directions
router.post(
  "/directions",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  directionsLimiter,
  MapsController.getDirections
);

// POST /api/v1/maps/distance-matrix - Get Distance Matrix
router.post(
  "/distance-matrix",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  distanceMatrixLimiter,
  MapsController.getDistanceMatrix
);

// POST /api/v1/maps/geocode - Geocode (address to coordinates)
router.post(
  "/geocode",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  geocodeLimiter,
  MapsController.geocode
);

// POST /api/v1/maps/reverse-geocode - Reverse Geocode (coordinates to address)
router.post(
  "/reverse-geocode",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  geocodeLimiter,
  MapsController.reverseGeocode
);

// POST /api/v1/maps/roads/snap - Snap to Roads
router.post(
  "/roads/snap",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri", "tai_xe"),
  roadsLimiter,
  MapsController.snapToRoads
);

export default router;

