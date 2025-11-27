/**
 * Service để tạo tuyến đường từ kết quả VRP Optimization
 * 
 * Flow:
 * 1. Lấy kết quả VRP (hoặc chạy VRP nếu chưa có)
 * 2. Với mỗi route trong VRP results:
 *    - Tạo tuyến đường trong DB (TuyenDuong)
 *    - Tạo polyline từ depot → stops → depot
 *    - Gán các điểm dừng vào tuyến
 *    - Tính toán thời gian ước tính
 */

import TuyenDuongModel from "../models/TuyenDuongModel.js";
import DiemDungModel from "../models/DiemDungModel.js";
import RouteStopModel from "../models/RouteStopModel.js";
import MapsService from "./MapsService.js";
import VehicleRoutingService from "./VehicleRoutingService.js";
import GeoUtils from "../utils/GeoUtils.js";
import pool from "../config/db.js";

class RouteFromOptimizationService {
  /**
   * Tạo tuyến đường từ kết quả VRP
   * @param {Object} options - {
   *   vrpResult: Object (optional, nếu không có sẽ chạy VRP),
   *   depot: {lat, lng, name},
   *   capacity: Number,
   *   routeNamePrefix: String (default: "Tuyến Tối Ưu"),
   *   createReturnRoutes: Boolean (default: true)
   * }
   * @returns {Promise<Object>} {routes, stats}
   */
  static async createRoutesFromVRP(options = {}) {
    const {
      vrpResult = null,
      depot = { lat: 10.77653, lng: 106.700981, name: "Đại học Sài Gòn" },
      capacity = 40,
      routeNamePrefix = "Tuyến Tối Ưu",
      createReturnRoutes = true,
    } = options;

    console.log(`[RouteFromOptimization] Starting route creation from VRP`);
    console.log(`[RouteFromOptimization] Depot: ${depot.name} (${depot.lat}, ${depot.lng})`);

    // Lấy kết quả VRP (chạy nếu chưa có)
    let vrp = vrpResult;
    if (!vrp) {
      console.log(`[RouteFromOptimization] Running VRP optimization...`);
      vrp = await VehicleRoutingService.solveVRP({
        depot: { lat: depot.lat, lng: depot.lng },
        capacity,
        splitVirtualNodes: true,
      });
    }

    if (!vrp.routes || vrp.routes.length === 0) {
      console.warn(`[RouteFromOptimization] ⚠️ No routes found in VRP result`);
      return {
        routes: [],
        stats: {
          totalRoutes: 0,
          totalStops: 0,
          totalStudents: 0,
        },
      };
    }

    console.log(`[RouteFromOptimization] Found ${vrp.routes.length} routes in VRP result`);

    const createdRoutes = [];
    const errors = [];

    // Tạo từng tuyến đường
    for (let i = 0; i < vrp.routes.length; i++) {
      const vrpRoute = vrp.routes[i];
      try {
        console.log(`[RouteFromOptimization] Creating route ${i + 1}/${vrp.routes.length}...`);
        
        const route = await this.createSingleRoute({
          vrpRoute,
          routeIndex: i + 1,
          depot,
          routeNamePrefix,
        });

        createdRoutes.push(route);

        // Tạo tuyến về nếu cần
        if (createReturnRoutes) {
          console.log(`[RouteFromOptimization] Creating return route for route ${i + 1}...`);
          const returnRoute = await this.createReturnRoute({
            vrpRoute,
            routeIndex: i + 1,
            depot,
            routeNamePrefix,
            originalRouteId: route.maTuyen,
          });
          createdRoutes.push(returnRoute);
        }
      } catch (error) {
        console.error(`[RouteFromOptimization] Error creating route ${i + 1}:`, error);
        errors.push({ routeIndex: i + 1, error: error.message });
      }
    }

    const stats = {
      totalRoutes: createdRoutes.length,
      totalStops: createdRoutes.reduce((sum, r) => sum + (r.stopCount || 0), 0),
      totalStudents: vrp.stats.totalStudents || 0,
      errors: errors.length,
    };

    console.log(`[RouteFromOptimization] ✅ Created ${createdRoutes.length} routes`);
    console.log(`[RouteFromOptimization] Stats:`, stats);

    return {
      routes: createdRoutes,
      stats,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Tạo một tuyến đường đi (depot → stops → depot)
   */
  static async createSingleRoute({ vrpRoute, routeIndex, depot, routeNamePrefix }) {
    const nodes = vrpRoute.nodes || [];
    
    if (nodes.length === 0) {
      throw new Error("Route has no stops");
    }

    // Origin = depot (trường học) - bắt đầu từ trường
    const origin = depot;
    // Destination = stop cuối cùng (để tạo polyline từ depot → stops)
    const lastStop = nodes[nodes.length - 1];
    const destination = {
      lat: parseFloat(lastStop.viDo),
      lng: parseFloat(lastStop.kinhDo),
    };

    // Tên tuyến
    const tenTuyen = `${routeNamePrefix} ${routeIndex} - Đi`;

    // Tạo polyline từ depot → stops (destination = stop cuối cùng)
    const waypoints = nodes.slice(0, -1).map((node) => ({
      location: `${node.viDo},${node.kinhDo}`,
    }));

    console.log(`[RouteFromOptimization] Getting directions for route: ${tenTuyen}`);
    console.log(`[RouteFromOptimization] Origin (depot): (${origin.lat}, ${origin.lng})`);
    console.log(`[RouteFromOptimization] Destination (last stop): (${destination.lat}, ${destination.lng})`);
    console.log(`[RouteFromOptimization] Waypoints (stops): ${waypoints.length}`);

    // Lấy directions từ Google Maps API: depot → stops (destination = stop cuối cùng)
    const directionsResult = await MapsService.getDirections({
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      waypoints: waypoints, // Tất cả các điểm dừng trừ stop cuối (đã là destination)
      mode: "driving",
      vehicleType: "bus",
      optimizeWaypoints: false, // Giữ nguyên thứ tự từ VRP
    });

    // Lấy polyline từ depot → stop cuối cùng
    let polyline = directionsResult.polyline;
    let estimatedTime = Math.round(directionsResult.duration / 60); // minutes

    // Tạo polyline từ stop cuối → depot và nối vào polyline chính
    try {
      const returnDirectionsResult = await MapsService.getDirections({
        origin: `${destination.lat},${destination.lng}`,
        destination: `${origin.lat},${origin.lng}`,
        mode: "driving",
        vehicleType: "bus",
      });

      // Nối 2 polyline lại (decode, merge, encode)
      // Sử dụng @mapbox/polyline để encode (decode đã có trong GeoUtils)
      const path1 = GeoUtils.decodePolyline(polyline);
      const path2 = GeoUtils.decodePolyline(returnDirectionsResult.polyline);
      
      // Merge paths (bỏ điểm cuối của path1 vì trùng với điểm đầu của path2)
      const mergedPath = [...path1, ...path2.slice(1)];
      
      // Encode lại polyline (sử dụng @mapbox/polyline - tương thích với Google Maps encoding)
      try {
        const polylineLib = await import("@mapbox/polyline");
        // @mapbox/polyline.encode() nhận mảng [lat, lng]
        polyline = polylineLib.encode(mergedPath.map(p => [p.lat, p.lng]));
        estimatedTime += Math.round(returnDirectionsResult.duration / 60);
        console.log(`[RouteFromOptimization] ✅ Combined polyline: depot → stops → depot (${mergedPath.length} points)`);
      } catch (encodeError) {
        console.warn(`[RouteFromOptimization] ⚠️ Failed to encode merged polyline, using forward polyline only:`, encodeError.message);
        // Nếu không encode được, chỉ dùng polyline đi (depot → stops)
      }
    } catch (error) {
      console.warn(`[RouteFromOptimization] ⚠️ Failed to create return polyline, using one-way only:`, error.message);
      // Nếu không tạo được return polyline, vẫn dùng polyline một chiều
    }

    // Tạo điểm dừng depot nếu chưa có (cần cho route_stops)
    let depotStopId = await this.findOrCreateDepotStop(depot);

    // Tạo route trong DB
    const routeId = await TuyenDuongModel.create({
      tenTuyen,
      diemBatDau: origin.name || "Đại học Sài Gòn",
      diemKetThuc: destination.name || "Đại học Sài Gòn",
      thoiGianUocTinh: estimatedTime,
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      dest_lat: destination.lat,
      dest_lng: destination.lng,
      polyline,
      trangThai: true,
      routeType: "di",
    });

    console.log(`[RouteFromOptimization] ✅ Created route ${routeId}: ${tenTuyen}`);

    // Thêm depot như điểm dừng đầu tiên (sequence 1)
    await RouteStopModel.addStop(routeId, depotStopId, 1, 0);

    // Gán các điểm dừng vào tuyến (bắt đầu từ sequence 2)
    const stops = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      
      // Kiểm tra điểm dừng có tồn tại không
      const stop = await DiemDungModel.getById(node.maDiem);
      if (!stop) {
        console.warn(`[RouteFromOptimization] ⚠️ Stop ${node.maDiem} not found, skipping`);
        continue;
      }

      // Tạo route_stop (sequence = i + 2 vì depot là sequence 1)
      await RouteStopModel.addStop(routeId, node.maDiem, i + 2, 30);

      stops.push({
        maDiem: node.maDiem,
        tenDiem: node.tenDiem,
        viDo: node.viDo,
        kinhDo: node.kinhDo,
        sequence: i + 2,
      });
    }

    // Thêm depot như điểm dừng cuối cùng (sequence = nodes.length + 2)
    await RouteStopModel.addStop(routeId, depotStopId, nodes.length + 2, 0);

    console.log(`[RouteFromOptimization] ✅ Assigned ${stops.length + 2} stops to route ${routeId} (depot at start and end)`);

    return {
      maTuyen: routeId,
      tenTuyen,
      diemBatDau: origin.name || "Đại học Sài Gòn",
      diemKetThuc: destination.name || "Đại học Sài Gòn",
      thoiGianUocTinh: estimatedTime,
      stopCount: stops.length + 2, // +2 vì có depot ở đầu và cuối
      totalDemand: vrpRoute.totalDemand || 0,
      stops,
    };
  }

  /**
   * Tạo tuyến về (depot → stops ngược lại → depot)
   */
  static async createReturnRoute({ vrpRoute, routeIndex, depot, routeNamePrefix, originalRouteId }) {
    const nodes = [...(vrpRoute.nodes || [])].reverse(); // Đảo ngược thứ tự
    
    if (nodes.length === 0) {
      throw new Error("Route has no stops");
    }

    // Origin = depot (trường học)
    const origin = depot;
    // Destination = điểm dừng đầu tiên (xa depot nhất trong tuyến đi)
    const destination = nodes[nodes.length - 1]; // Điểm cuối cùng sau khi reverse

    // Tên tuyến
    const tenTuyen = `${routeNamePrefix} ${routeIndex} - Về`;

    // Tạo polyline từ origin → stops → destination
    const waypoints = nodes.slice(0, -1).map((node) => ({
      location: `${node.viDo},${node.kinhDo}`,
    }));

    console.log(`[RouteFromOptimization] Getting directions for return route: ${tenTuyen}`);

    // Lấy directions từ Google Maps API
    const directionsResult = await MapsService.getDirections({
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.viDo},${destination.kinhDo}`,
      waypoints: waypoints,
      mode: "driving",
      vehicleType: "bus",
      optimizeWaypoints: false,
    });

    const polyline = directionsResult.polyline;
    const estimatedTime = Math.round(directionsResult.duration / 60); // minutes

    // Tạo route trong DB
    const routeId = await TuyenDuongModel.create({
      tenTuyen,
      diemBatDau: origin.name || "Đại học Sài Gòn",
      diemKetThuc: destination.tenDiem || `Điểm dừng ${destination.maDiem}`,
      thoiGianUocTinh: estimatedTime,
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      dest_lat: destination.viDo,
      dest_lng: destination.kinhDo,
      polyline,
      trangThai: true,
      routeType: "ve",
      pairedRouteId: originalRouteId, // Link với tuyến đi
    });

    console.log(`[RouteFromOptimization] ✅ Created return route ${routeId}: ${tenTuyen}`);

    // Gán các điểm dừng vào tuyến (theo thứ tự ngược lại)
    const stops = [];
    
    // Thêm depot như điểm dừng đầu tiên
    let depotStopId = await this.findOrCreateDepotStop(depot);
    
    await RouteStopModel.addStop(routeId, depotStopId, 1, 0);

    // Thêm các điểm dừng theo thứ tự ngược lại
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      
      const stop = await DiemDungModel.getById(node.maDiem);
      if (!stop) {
        console.warn(`[RouteFromOptimization] ⚠️ Stop ${node.maDiem} not found, skipping`);
        continue;
      }

      await RouteStopModel.addStop(routeId, node.maDiem, i + 2, 30);

      stops.push({
        maDiem: node.maDiem,
        tenDiem: node.tenDiem,
        viDo: node.viDo,
        kinhDo: node.kinhDo,
        sequence: i + 2,
      });
    }

    console.log(`[RouteFromOptimization] ✅ Assigned ${stops.length + 1} stops to return route ${routeId}`);

    return {
      maTuyen: routeId,
      tenTuyen,
      diemBatDau: origin.name || "Đại học Sài Gòn",
      diemKetThuc: destination.tenDiem || `Điểm dừng ${destination.maDiem}`,
      thoiGianUocTinh: estimatedTime,
      stopCount: stops.length + 1,
      totalDemand: vrpRoute.totalDemand || 0,
      stops,
    };
  }

  /**
   * Tìm hoặc tạo điểm dừng depot (trường học)
   */
  static async findOrCreateDepotStop(depot) {
    // Tìm điểm dừng depot đã có (trong bán kính 100m)
    const [existing] = await pool.query(
      `SELECT maDiem FROM DiemDung 
       WHERE ABS(viDo - ?) < 0.001 AND ABS(kinhDo - ?) < 0.001
       LIMIT 1`,
      [depot.lat, depot.lng]
    );

    if (existing.length > 0) {
      return existing[0].maDiem;
    }

    // Tạo mới nếu chưa có
    const stopId = await DiemDungModel.create({
      tenDiem: depot.name || "Đại học Sài Gòn",
      viDo: depot.lat,
      kinhDo: depot.lng,
      address: depot.address || depot.name || "Đại học Sài Gòn",
    });

    return stopId;
  }
}

export default RouteFromOptimizationService;

