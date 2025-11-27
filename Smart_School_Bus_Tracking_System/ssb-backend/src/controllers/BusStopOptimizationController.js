import BusStopOptimizationService from "../services/BusStopOptimizationService.js";
import VehicleRoutingService from "../services/VehicleRoutingService.js";
import ClusteringRoutingService from "../services/ClusteringRoutingService.js";
import RouteFromOptimizationService from "../services/RouteFromOptimizationService.js";
import ScheduleFromRoutesService from "../services/ScheduleFromRoutesService.js";

/**
 * Controller cho Bus Stop Optimization và Vehicle Routing
 */
class BusStopOptimizationController {
  /**
   * POST /api/v1/bus-stops/optimize
   * Chạy Tầng 1 - Greedy Maximum Coverage
   */
  static async optimizeBusStops(req, res) {
    try {
      const {
        r_walk = 500, // meters
        s_max = 25,
        max_stops = null,
        use_roads_api = true,
        use_places_api = true,
        students = null, // Optional: nếu không có sẽ lấy từ DB
        school_location = null, // Optional: {lat, lng}
        max_distance_from_school = 15000, // Optional: meters (15km)
      } = req.body;

      // Validate parameters
      if (r_walk <= 0 || r_walk > 2000) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAMETER",
            message: "r_walk phải trong khoảng (0, 2000] mét",
          },
        });
      }

      if (s_max <= 0 || s_max > 100) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAMETER",
            message: "s_max phải trong khoảng (0, 100]",
          },
        });
      }

      // Validate school_location nếu được cung cấp
      if (school_location !== null) {
        if (
          typeof school_location !== "object" ||
          typeof school_location.lat !== "number" ||
          typeof school_location.lng !== "number"
        ) {
          return res.status(400).json({
            success: false,
            error: {
              code: "INVALID_PARAMETER",
              message: "school_location phải là object có lat và lng (number)",
            },
          });
        }
      }

      // Validate max_distance_from_school
      if (max_distance_from_school <= 0 || max_distance_from_school > 50000) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAMETER",
            message: "max_distance_from_school phải trong khoảng (0, 50000] mét",
          },
        });
      }

      const result = await BusStopOptimizationService.greedyMaximumCoverage({
        students,
        R_walk: r_walk,
        S_max: s_max,
        MAX_STOPS: max_stops,
        use_roads_api: use_roads_api,
        use_places_api: use_places_api,
        school_location: school_location,
        max_distance_from_school: max_distance_from_school,
      });

      res.status(200).json({
        success: true,
        data: result,
        message: `Tối ưu hóa điểm dừng thành công: ${result.stats.totalStops} điểm dừng, ${result.stats.assignedStudents} học sinh`,
      });
    } catch (error) {
      console.error("Error in BusStopOptimizationController.optimizeBusStops:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Lỗi server khi tối ưu hóa điểm dừng",
        },
      });
    }
  }

  /**
   * POST /api/v1/routes/optimize-vrp
   * Chạy Tầng 2 - Vehicle Routing Problem
   */
  static async optimizeVRP(req, res) {
    try {
      const {
        depot = { lat: 10.77653, lng: 106.700981 }, // Đại học Sài Gòn mặc định
        capacity = 40,
        split_virtual_nodes = true,
      } = req.body;

      // Validate parameters
      if (!depot || typeof depot.lat !== "number" || typeof depot.lng !== "number") {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAMETER",
            message: "depot phải là object có lat và lng",
          },
        });
      }

      if (capacity <= 0 || capacity > 100) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAMETER",
            message: "capacity phải trong khoảng (0, 100]",
          },
        });
      }

      const result = await VehicleRoutingService.solveVRP({
        depot,
        capacity,
        splitVirtualNodes: split_virtual_nodes,
      });

      res.status(200).json({
        success: true,
        data: result,
        message: `Tối ưu hóa tuyến xe thành công: ${result.stats.totalRoutes} tuyến, ${result.stats.totalStudents} học sinh`,
      });
    } catch (error) {
      console.error("Error in BusStopOptimizationController.optimizeVRP:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Lỗi server khi tối ưu hóa tuyến xe",
        },
      });
    }
  }

  /**
   * POST /api/v1/bus-stops/optimize-full
   * Chạy cả 2 tầng: Tầng 1 (Greedy Maximum Coverage) + Tầng 2 (VRP)
   */
  static async optimizeFull(req, res) {
    try {
      const {
        school_location = { lat: 10.77653, lng: 106.700981 },
        r_walk = 500,
        s_max = 25,
        c_bus = 40,
        max_stops = null,
        use_roads_api = true,
        use_places_api = true,
        split_virtual_nodes = true,
        max_distance_from_school = 15000, // meters (15km)
      } = req.body;

      // Validate parameters
      if (!school_location || typeof school_location.lat !== "number" || typeof school_location.lng !== "number") {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAMETER",
            message: "school_location phải là object có lat và lng",
          },
        });
      }

      // Validate max_distance_from_school
      if (max_distance_from_school <= 0 || max_distance_from_school > 50000) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAMETER",
            message: "max_distance_from_school phải trong khoảng (0, 50000] mét",
          },
        });
      }

      console.log(`[BusStopOptimization] Starting full optimization pipeline (Clustering-First)`);

      // Sử dụng Clustering-First approach thay vì Sweep Algorithm
      const clusteringResult = await ClusteringRoutingService.solveClusteringVRP({
        school_location: school_location,
        r_walk: r_walk,
        s_max: s_max,
        c_bus: c_bus,
        use_roads_api: use_roads_api,
        use_places_api: use_places_api,
        max_distance_from_school: max_distance_from_school,
      });

      // Tạo routes trong DB với polyline
      console.log(`[BusStopOptimization] Creating routes in database...`);
      const depot = {
        lat: school_location.lat,
        lng: school_location.lng,
        name: school_location.name || "Đại học Sài Gòn",
      };

      // Format vrpResult để tương thích với RouteFromOptimizationService
      const vrpResult = {
        routes: clusteringResult.tier2.routes,
        stats: clusteringResult.tier2.stats,
      };

      // Tạo routes trong DB
      const routesResult = await RouteFromOptimizationService.createRoutesFromVRP({
        vrpResult: vrpResult,
        depot: depot,
        capacity: c_bus,
        routeNamePrefix: "Tuyến Tối Ưu",
        createReturnRoutes: false, // Chỉ tạo tuyến đi (don_sang)
      });

      console.log(`[BusStopOptimization] ✅ Created ${routesResult.routes.length} routes in database`);

      // Lấy polyline từ DB cho tất cả routes
      const TuyenDuongModel = (await import("../models/TuyenDuongModel.js")).default;
      const routePolylines = await Promise.all(
        routesResult.routes.map(async (dbRoute) => {
          try {
            const route = await TuyenDuongModel.getById(dbRoute.maTuyen);
            return { maTuyen: dbRoute.maTuyen, polyline: route?.polyline || null };
          } catch (error) {
            console.warn(`[BusStopOptimization] ⚠️ Could not fetch polyline for route ${dbRoute.maTuyen}:`, error.message);
            return { maTuyen: dbRoute.maTuyen, polyline: null };
          }
        })
      );
      const polylineMap = new Map(routePolylines.map(r => [r.maTuyen, r.polyline]));
      console.log(`[BusStopOptimization] ✅ Fetched polylines for ${routePolylines.filter(r => r.polyline).length}/${routesResult.routes.length} routes`);

      // Format routes để tương thích với frontend
      // Frontend expect: { routeId, nodes, totalDemand, stopCount, estimatedDistance, polyline }
      console.log(`[BusStopOptimization] Formatting routes: ${routesResult.routes.length} DB routes, ${clusteringResult.tier2.routes.length} clustering routes`);
      
      const formattedRoutes = routesResult.routes.map((dbRoute, idx) => {
        // Lấy thông tin từ clustering result (có đầy đủ nodes với viDo, kinhDo, etc.)
        const originalRoute = clusteringResult.tier2.routes[idx];
        
        const routePolyline = polylineMap.get(dbRoute.maTuyen);
        
        if (!originalRoute) {
          console.warn(`[BusStopOptimization] ⚠️ No original route found for index ${idx}, using DB route only`);
          return {
            routeId: dbRoute.maTuyen,
            nodes: [],
            totalDemand: dbRoute.totalDemand || 0,
            stopCount: dbRoute.stopCount || 0,
            estimatedDistance: 0,
            maTuyen: dbRoute.maTuyen,
            tenTuyen: dbRoute.tenTuyen,
            polyline: routePolyline || null, // Polyline từ DB
          };
        }

        return {
          routeId: dbRoute.maTuyen,
          nodes: originalRoute.nodes || [],
          totalDemand: dbRoute.totalDemand || originalRoute.totalDemand || 0,
          stopCount: dbRoute.stopCount || originalRoute.stopCount || 0,
          estimatedDistance: originalRoute.estimatedDistance || 0,
          maTuyen: dbRoute.maTuyen,
          tenTuyen: dbRoute.tenTuyen,
          polyline: routePolyline || null, // Polyline từ DB (depot → stops → depot)
        };
      });

      console.log(`[BusStopOptimization] ✅ Formatted ${formattedRoutes.length} routes for frontend`);
      console.log(`[BusStopOptimization] Sample route:`, formattedRoutes[0] ? {
        routeId: formattedRoutes[0].routeId,
        nodesCount: formattedRoutes[0].nodes?.length || 0,
        totalDemand: formattedRoutes[0].totalDemand,
        stopCount: formattedRoutes[0].stopCount,
      } : 'No routes');

      // Đảm bảo formattedRoutes không rỗng
      if (formattedRoutes.length === 0) {
        console.error(`[BusStopOptimization] ⚠️ No formatted routes! Using clustering routes as fallback`);
        // Fallback: dùng routes từ clustering result nếu formattedRoutes rỗng
        formattedRoutes.push(...clusteringResult.tier2.routes.map((route, idx) => ({
          routeId: routesResult.routes[idx]?.maTuyen || route.routeId || (idx + 1),
          nodes: route.nodes || [],
          totalDemand: route.totalDemand || 0,
          stopCount: route.stopCount || 0,
          estimatedDistance: route.estimatedDistance || 0,
        })));
      }

      // Format response để tương thích với frontend
      const result = {
        tier1: clusteringResult.tier1,
        tier2: {
          ...clusteringResult.tier2,
          routes: formattedRoutes, // Routes đã format với routeId và nodes
          stats: {
            ...clusteringResult.tier2.stats,
            totalRoutes: formattedRoutes.length, // Đảm bảo totalRoutes khớp với số routes thực tế
          },
        },
        summary: {
          totalStops: clusteringResult.tier1.stats.totalStops,
          totalStudents: clusteringResult.tier1.stats.assignedStudents,
          totalRoutes: formattedRoutes.length, // Dùng số routes đã format
          averageStudentsPerStop: clusteringResult.tier1.stats.averageStudentsPerStop,
          averageStopsPerRoute: formattedRoutes.length > 0 
            ? (formattedRoutes.reduce((sum, r) => sum + (r.stopCount || 0), 0) / formattedRoutes.length).toFixed(2)
            : clusteringResult.tier2.stats.averageStopsPerRoute,
        },
      };

      console.log(`[BusStopOptimization] ✅ Final result: ${result.tier2.routes.length} routes, ${result.summary.totalRoutes} total routes`);

      res.status(200).json({
        success: true,
        data: result,
        message: `Tối ưu hóa hoàn chỉnh thành công: ${result.summary.totalStops} điểm dừng, ${result.summary.totalRoutes} tuyến xe`,
      });
    } catch (error) {
      console.error("Error in BusStopOptimizationController.optimizeFull:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Lỗi server khi tối ưu hóa hoàn chỉnh",
        },
      });
    }
  }

  /**
   * GET /api/v1/bus-stops/assignments
   * Lấy danh sách assignments hiện tại
   */
  static async getAssignments(req, res) {
    try {
      const assignments = await BusStopOptimizationService.getAssignments();

      res.status(200).json({
        success: true,
        data: assignments,
        message: `Lấy ${assignments.length} assignments thành công`,
      });
    } catch (error) {
      console.error("Error in BusStopOptimizationController.getAssignments:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Lỗi server khi lấy assignments",
        },
      });
    }
  }

  /**
   * GET /api/v1/bus-stops/stats
   * Lấy thống kê về điểm dừng và assignments
   */
  static async getStats(req, res) {
    try {
      const stats = await BusStopOptimizationService.getStats();

      res.status(200).json({
        success: true,
        data: stats,
        message: "Lấy thống kê thành công",
      });
    } catch (error) {
      console.error("Error in BusStopOptimizationController.getStats:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Lỗi server khi lấy thống kê",
        },
      });
    }
  }

  /**
   * POST /api/v1/bus-stops/create-routes
   * Tạo tuyến đường từ kết quả VRP optimization
   */
  static async createRoutes(req, res) {
    try {
      const {
        vrp_result = null, // Optional: kết quả VRP nếu đã có
        depot = { lat: 10.77653, lng: 106.700981, name: "Đại học Sài Gòn" },
        capacity = 40,
        route_name_prefix = "Tuyến Tối Ưu",
        create_return_routes = true,
      } = req.body;

      // Validate depot
      if (!depot || typeof depot.lat !== "number" || typeof depot.lng !== "number") {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAMETER",
            message: "depot phải là object có lat và lng",
          },
        });
      }

      console.log(`[BusStopOptimization] Creating routes from VRP optimization`);

      const result = await RouteFromOptimizationService.createRoutesFromVRP({
        vrpResult: vrp_result,
        depot,
        capacity,
        routeNamePrefix: route_name_prefix,
        createReturnRoutes: create_return_routes,
      });

      res.status(200).json({
        success: true,
        data: result,
        message: `Tạo tuyến đường thành công: ${result.stats.totalRoutes} tuyến`,
      });
    } catch (error) {
      console.error("Error in BusStopOptimizationController.createRoutes:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Lỗi server khi tạo tuyến đường",
        },
      });
    }
  }

  /**
   * POST /api/v1/bus-stops/create-schedules
   * Tự động tạo lịch trình từ tuyến đường đã tạo
   */
  static async createSchedules(req, res) {
    try {
      const {
        route_ids = null,
        default_departure_time = "06:00:00",
        auto_assign_bus = true,
        auto_assign_driver = true,
        ngay_chay = null,
      } = req.body;

      console.log(`[BusStopOptimization] Creating schedules from routes`);

      const result = await ScheduleFromRoutesService.createSchedulesFromRoutes({
        routeIds: route_ids,
        defaultDepartureTime: default_departure_time,
        autoAssignBus: auto_assign_bus,
        autoAssignDriver: auto_assign_driver,
        ngayChay: ngay_chay,
      });

      res.status(200).json({
        success: true,
        data: result,
        message: `Tạo lịch trình thành công: ${result.stats.totalSchedules} lịch trình`,
      });
    } catch (error) {
      console.error("Error in BusStopOptimizationController.createSchedules:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Lỗi server khi tạo lịch trình",
        },
      });
    }
  }
}

export default BusStopOptimizationController;

