// @ts-nocheck
import BusStopOptimizationService from "../services/BusStopOptimizationService.js";
import VehicleRoutingService from "../services/VehicleRoutingService.js";
import ClusteringRoutingService from "../services/ClusteringRoutingService.js";
import RouteFromOptimizationService from "../services/RouteFromOptimizationService.js";
import ScheduleFromRoutesService from "../services/ScheduleFromRoutesService.js";
import TuyenDuongModel from "../models/TuyenDuongModel.js";
import LichTrinhModel from "../models/LichTrinhModel.js";

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
        depot = { lat: 10.760064662799088, lng: 106.6822422067464 }, // Đại học Sài Gòn mặc định
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
        school_location = { lat: 10.760064662799088, lng: 106.6822422067464 },
        r_walk = 500,
        s_max = 25,
        c_bus = 40,
        max_routes = 4,
        max_route_distance = 50, // km - Giới hạn quãng đường tối đa của một tuyến
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

      // Validate max_routes
      if (max_routes <= 0 || max_routes > 100) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAMETER",
            message: "max_routes phải trong khoảng (0, 100]",
          },
        });
      }

      // Validate max_route_distance
      if (max_route_distance <= 0 || max_route_distance > 200) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAMETER",
            message: "max_route_distance phải trong khoảng (0, 200] km",
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

      // 🔥 CHỈ TÍNH TOÁN VÀ TRẢ VỀ KẾT QUẢ, KHÔNG TẠO ROUTES TRONG DB
      console.log(`[BusStopOptimization] Computing polylines for preview (not saving to DB)...`);
      const depot = {
        lat: school_location.lat,
        lng: school_location.lng,
        name: school_location.name || "Đại học Sài Gòn",
      };

      // Giới hạn số routes theo max_routes
      const routesToPreview = clusteringResult.tier2.routes.slice(0, max_routes);
      
      // Tính polyline cho preview (không lưu DB)
      // Xử lý tách routes nếu vượt quá max_route_distance
      let routesToPreviewWithDistance = routesToPreview;
      if (max_route_distance) {
        const processedRoutes = [];
        for (const route of routesToPreview) {
          if ((route.estimatedDistance || 0) > max_route_distance) {
            console.log(`[BusStopOptimization] Route estimated distance (${(route.estimatedDistance || 0).toFixed(2)}km) exceeds max (${max_route_distance}km), will be split when creating routes`);
            // Giữ nguyên route để preview, nhưng sẽ được tách khi tạo routes
          }
          processedRoutes.push(route);
        }
        routesToPreviewWithDistance = processedRoutes;
      }

      const routesWithPolylines = await Promise.all(
        routesToPreviewWithDistance.map(async (route, idx) => {
          try {
            // Tính polyline và độ dài thực tế cho route này (chỉ để preview)
            const { polyline, distance } = await RouteFromOptimizationService.computePolylineForRoute({
              route,
              depot,
              routeIndex: idx + 1,
            });
            
            return {
              ...route,
              routeId: route.routeId || (idx + 1),
              polyline: polyline || null,
              actualDistance: distance || route.estimatedDistance || 0, // Độ dài thực tế từ Maps API
            };
          } catch (error) {
            console.warn(`[BusStopOptimization] ⚠️ Could not compute polyline for route ${idx + 1}:`, error.message);
            return {
              ...route,
              routeId: route.routeId || (idx + 1),
              polyline: null,
              actualDistance: route.estimatedDistance || 0,
            };
          }
        })
      );

      console.log(`[BusStopOptimization] ✅ Computed polylines for ${routesWithPolylines.filter(r => r.polyline).length}/${routesWithPolylines.length} routes (preview only)`);

      // Format routes để tương thích với frontend
      const formattedRoutes = routesWithPolylines.map((route, idx) => ({
        routeId: route.routeId || (idx + 1),
        nodes: route.nodes || [],
        totalDemand: route.totalDemand || 0,
        stopCount: route.stopCount || 0,
        estimatedDistance: route.estimatedDistance || 0,
        maTuyen: null, // Chưa có ID vì chưa lưu DB
        tenTuyen: `Tuyến Tối Ưu ${idx + 1} - Đi`, // Tên tạm để preview
        polyline: route.polyline || null,
      }));

      console.log(`[BusStopOptimization] ✅ Formatted ${formattedRoutes.length} routes for preview`);

      // Format response để tương thích với frontend
      // Lưu vrpResult để có thể tạo routes sau
      const vrpResult = {
        routes: routesToPreview,
        stats: {
          ...clusteringResult.tier2.stats,
          totalRoutes: routesToPreview.length,
        },
      };

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
        vrpResult: vrpResult, // Lưu để có thể tạo routes sau
        optimizationParams: {
          depot,
          capacity: c_bus,
          max_routes,
          max_route_distance,
        },
      };

      console.log(`[BusStopOptimization] ✅ Final result: ${result.tier2.routes.length} routes (preview only, not saved to DB)`);

      res.status(200).json({
        success: true,
        data: result,
        message: `Tối ưu hóa hoàn chỉnh thành công: ${result.summary.totalStops} điểm dừng, ${result.summary.totalRoutes} tuyến xe (chưa lưu vào database)`,
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
   * Tạo tuyến đường từ kết quả VRP optimization và xóa tuyến cũ nếu cần
   */
  static async createRoutes(req, res) {
    try {
      const {
        vrp_result = null, // Kết quả VRP từ optimizeFull
        depot = { lat: 10.760064662799088, lng: 106.6822422067464, name: "Đại học Sài Gòn" },
        capacity = 40,
        route_name_prefix = "Tuyến Tối Ưu",
        create_return_routes = false, // Mặc định chỉ tạo tuyến đi
        clear_existing_routes = true, // Mặc định xóa tuyến cũ
        max_route_distance = 50, // km - Giới hạn quãng đường tối đa của một tuyến
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

      // Validate vrp_result
      if (!vrp_result || !vrp_result.routes || vrp_result.routes.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAMETER",
            message: "vrp_result phải có routes",
          },
        });
      }

      console.log(`[BusStopOptimization] Creating routes from VRP optimization`);
      console.log(`[BusStopOptimization] Will clear existing routes: ${clear_existing_routes}`);

      // Tạo routes trong DB
      const result = await RouteFromOptimizationService.createRoutesFromVRP({
        vrpResult: vrp_result,
        depot,
        capacity,
        routeNamePrefix: route_name_prefix,
        createReturnRoutes: create_return_routes,
        clearExistingRoutes: clear_existing_routes,
        maxRouteDistance: max_route_distance,
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

  /**
   * DELETE /api/v1/bus-stops/old-routes
   * Xóa các tuyến cũ từ optimization (chỉ xóa tuyến không có schedule)
   */
  static async deleteOldRoutes(req, res) {
    try {
      const { routeIds = [] } = req.body;

      if (!Array.isArray(routeIds) || routeIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAMETER",
            message: "routeIds phải là mảng không rỗng",
          },
        });
      }

      console.log(`[BusStopOptimization] Deleting ${routeIds.length} old routes...`);

      const deletedRoutes = [];
      const cannotDeleteRoutes = [];
      const errors = [];

      // Kiểm tra và xóa từng route
      for (const routeId of routeIds) {
        try {
          // Kiểm tra route có tồn tại không
          const route = await TuyenDuongModel.getById(routeId);
          if (!route) {
            errors.push({ routeId, error: "Route not found" });
            continue;
          }

          // Kiểm tra route có schedule không
          const schedules = await LichTrinhModel.getByRouteId(routeId);
          if (schedules.length > 0) {
            cannotDeleteRoutes.push({
              maTuyen: routeId,
              tenTuyen: route.tenTuyen,
              scheduleCount: schedules.length,
            });
            continue;
          }

          // Xóa route (hard delete)
          // Xóa tuyến về trước (nếu có), sau đó xóa tuyến đi (tránh foreign key constraint)
          if (route.routeType === 've') {
            await TuyenDuongModel.hardDelete(routeId);
            deletedRoutes.push({
              maTuyen: routeId,
              tenTuyen: route.tenTuyen,
            });
            console.log(`[BusStopOptimization] ✅ Deleted return route: ${route.tenTuyen} (ID: ${routeId})`);
          }
        } catch (error) {
          console.error(`[BusStopOptimization] Error processing route ${routeId}:`, error);
          errors.push({ routeId, error: error.message });
        }
      }

      // Xóa tuyến đi sau (sau khi đã xóa tuyến về)
      for (const routeId of routeIds) {
        try {
          const route = await TuyenDuongModel.getById(routeId);
          if (!route) continue;

          const schedules = await LichTrinhModel.getByRouteId(routeId);
          if (schedules.length > 0) continue;

          if (route.routeType === 'di' || !route.routeType) {
            await TuyenDuongModel.hardDelete(routeId);
            // Chỉ thêm vào deletedRoutes nếu chưa có (tránh duplicate)
            if (!deletedRoutes.find(r => r.maTuyen === routeId)) {
              deletedRoutes.push({
                maTuyen: routeId,
                tenTuyen: route.tenTuyen,
              });
            }
            console.log(`[BusStopOptimization] ✅ Deleted route: ${route.tenTuyen} (ID: ${routeId})`);
          }
        } catch (error) {
          console.error(`[BusStopOptimization] Error processing route ${routeId}:`, error);
          if (!errors.find(e => e.routeId === routeId)) {
            errors.push({ routeId, error: error.message });
          }
        }
      }

      res.status(200).json({
        success: true,
        data: {
          deleted: deletedRoutes,
          cannotDelete: cannotDeleteRoutes,
          errors: errors.length > 0 ? errors : undefined,
        },
        message: `Đã xóa ${deletedRoutes.length} tuyến đường. ${cannotDeleteRoutes.length > 0 ? `${cannotDeleteRoutes.length} tuyến không thể xóa (có lịch trình).` : ''}`,
      });
    } catch (error) {
      console.error("Error in BusStopOptimizationController.deleteOldRoutes:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Lỗi server khi xóa tuyến đường cũ",
        },
      });
    }
  }
}

export default BusStopOptimizationController;

