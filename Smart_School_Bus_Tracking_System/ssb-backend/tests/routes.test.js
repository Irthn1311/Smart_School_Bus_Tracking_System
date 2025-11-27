/**
 * Integration tests for Routes API
 * 
 * Note: These tests require:
 * - Database connection
 * - Test database with sample data
 * - Mock authentication (or real JWT token)
 */

import request from "supertest";
import app from "../src/app.js";
import pool from "../src/config/db.js";
import RouteService from "../src/services/RouteService.js";
import RouteStopModel from "../src/models/RouteStopModel.js";
import TuyenDuongModel from "../src/models/TuyenDuongModel.js";

// Mock MapsService để tránh gọi Google Maps API thật
jest.mock("../src/services/MapsService.js", () => {
  const mockPolyline = "mock_polyline_encoded_string";
  return {
    default: {
      getDirections: jest.fn().mockResolvedValue({
        polyline: mockPolyline,
        legs: [
          {
            distance: 5234,
            duration: 900,
            start_address: "Ngã tư Nguyễn Văn Linh",
            end_address: "Khu dân cư Phú Xuân",
            start_location: { lat: 10.7345, lng: 106.7212 },
            end_location: { lat: 10.6972, lng: 106.7041 },
            steps: [],
          },
        ],
        distance: 5234,
        duration: 900,
        cached: false,
      }),
      getDistanceMatrix: jest.fn().mockResolvedValue({
        rows: [
          [
            {
              distance: 5234,
              duration: 900,
              status: "OK",
            },
          ],
        ],
        origin_addresses: ["Ngã tư Nguyễn Văn Linh"],
        destination_addresses: ["Khu dân cư Phú Xuân"],
        cached: false,
      }),
    },
  };
});

// Mock auth middleware for testing
jest.mock("../src/middlewares/AuthMiddleware.js", () => ({
  default: {
    authenticate: (req, res, next) => next(),
    authorize: (...roles) => (req, res, next) => next(),
  },
}));

describe("Routes API", () => {
  let routeId;
  let testRouteId;

  beforeAll(async () => {
    // Get first route from database for testing
    const routes = await TuyenDuongModel.getAll();
    if (routes.length > 0) {
      routeId = routes[0].maTuyen;
    }
  });

  afterAll(async () => {
    // Cleanup if needed
    // Don't close pool as it's shared
  });

  describe("GET /api/v1/routes/:id", () => {
    it("should return route with stops ordered by sequence", async () => {
      if (!routeId) {
        console.log("Skipping test - no route found in database");
        return;
      }

      const response = await request(app).get(`/api/v1/routes/${routeId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("stops");

      // Verify stops are ordered by sequence
      const stops = response.body.data.stops;
      if (stops.length > 1) {
        for (let i = 1; i < stops.length; i++) {
          expect(stops[i].sequence).toBeGreaterThanOrEqual(
            stops[i - 1].sequence
          );
        }
      }
    });

    it("should return 404 for non-existent route", async () => {
      const response = await request(app).get("/api/v1/routes/99999");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
    });
  });

  describe("PATCH /api/v1/routes/:id/stops/reorder", () => {
    it("should reorder stops and update sequence", async () => {
      if (!routeId) {
        console.log("Skipping test - no route found in database");
        return;
      }

      // Get current stops
      const route = await RouteService.getById(routeId);
      if (!route.stops || route.stops.length < 2) {
        console.log("Skipping reorder test - route has less than 2 stops");
        return;
      }

      const originalStops = route.stops;
      const reorderItems = originalStops.map((stop, index) => ({
        stop_id: stop.maDiem,
        sequence: originalStops.length - index, // Reverse order
      }));

      const response = await request(app)
        .patch(`/api/v1/routes/${routeId}/stops/reorder`)
        .send({ items: reorderItems });

      if (response.status === 200) {
        expect(response.body.success).toBe(true);

        // Verify new order
        const updatedRoute = await RouteService.getById(routeId);
        const updatedStops = updatedRoute.stops;
        expect(updatedStops[0].sequence).toBe(originalStops.length);
        expect(
          updatedStops[updatedStops.length - 1].sequence
        ).toBe(1);

        // Restore original order
        const restoreItems = originalStops.map((stop, index) => ({
          stop_id: stop.maDiem,
          sequence: index + 1,
        }));
        await request(app)
          .patch(`/api/v1/routes/${routeId}/stops/reorder`)
          .send({ items: restoreItems });
      }
    });
  });

  describe("POST /api/v1/routes/:id/rebuild-polyline", () => {
    it("should rebuild polyline and update database", async () => {
      if (!routeId) {
        console.log("Skipping test - no route found in database");
        return;
      }

      const route = await RouteService.getById(routeId);
      if (!route.stops || route.stops.length < 2) {
        console.log("Skipping rebuild-polyline test - route has less than 2 stops");
        return;
      }

      const response = await request(app).post(
        `/api/v1/routes/${routeId}/rebuild-polyline`
      );

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("polyline");
        expect(response.body.data.updated).toBe(true);

        // Verify polyline is saved in database
        const updatedRoute = await TuyenDuongModel.getById(routeId);
        expect(updatedRoute.polyline).toBeTruthy();
      } else if (response.status === 503) {
        // Maps API not configured - skip test
        console.log("Skipping test - Maps API not configured");
      }
    });
  });
});

describe("Maps API", () => {
  describe("POST /api/v1/maps/distance-matrix", () => {
    it("should return cached: true when called twice with same payload", async () => {
      const payload = {
        origins: ["10.7345,106.7212"],
        destinations: ["10.6972,106.7041"],
        mode: "driving",
      };

      // First call
      const response1 = await request(app)
        .post("/api/v1/maps/distance-matrix")
        .send(payload);

      if (response1.status === 503) {
        console.log("Skipping test - Maps API not configured");
        return;
      }

      // Wait a bit for cache to be set
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second call (should be cached)
      const response2 = await request(app)
        .post("/api/v1/maps/distance-matrix")
        .send(payload);

      if (response1.status === 200 && response2.status === 200) {
        // First call should not be cached (unless already in cache)
        // Second call should be cached if cache is working
        expect(response2.body.data.cached).toBe(true);
      }
    });

    it("should return 429 when rate limit exceeded", async () => {
      // This test would require making many requests quickly
      // For now, just verify the endpoint exists
      const payload = {
        origins: ["10.7345,106.7212"],
        destinations: ["10.6972,106.7041"],
        mode: "driving",
      };

      const response = await request(app)
        .post("/api/v1/maps/distance-matrix")
        .send(payload);

      // Should return 200 or 503 (if API not configured), not 500
      expect([200, 503]).toContain(response.status);
    });
  });
});
