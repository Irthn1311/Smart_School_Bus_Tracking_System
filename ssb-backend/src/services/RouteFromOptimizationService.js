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
import StopSuggestionService from "./StopSuggestionService.js";
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
      depot = { lat: 10.760064662799088, lng: 106.6822422067464, name: "Đại học Sài Gòn" },
      capacity = 40,
      routeNamePrefix = "Tuyến Tối Ưu",
      createReturnRoutes = true,
      clearExistingRoutes = false, // Option to clear existing routes with same prefix before creating
      maxRoutes = 4, // Số lượng tuyến tối đa được tạo (mặc định: 4)
      maxRouteDistance = 50, // km - Giới hạn quãng đường tối đa của một tuyến (mặc định: 50km)
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
    console.log(`[RouteFromOptimization] Max routes limit: ${maxRoutes}`);
    
    // Giới hạn số lượng routes được tạo
    const routesToCreate = vrp.routes.slice(0, maxRoutes);
    const skippedRoutes = vrp.routes.length - routesToCreate.length;
    
    if (skippedRoutes > 0) {
      console.log(`[RouteFromOptimization] ⚠️ Limiting to ${maxRoutes} routes (skipping ${skippedRoutes} routes)`);
    }
    
    if (routesToCreate.length < maxRoutes && vrp.routes.length > 0) {
      console.log(`[RouteFromOptimization] ℹ️ Only ${routesToCreate.length} routes available (less than maxRoutes=${maxRoutes})`);
    }
    
    console.log(`[RouteFromOptimization] VRP routes details (will create ${routesToCreate.length}):`, routesToCreate.map((r, idx) => ({
      index: idx + 1,
      nodeCount: r.nodes?.length || 0,
      totalDemand: r.totalDemand || 0,
    })));

    // Tìm và phân loại tuyến cũ từ optimization
    const oldRoutesResult = await this.findAndCleanOldRoutes(routeNamePrefix, {
      autoDelete: clearExistingRoutes,
    });
    
    // Lưu thông tin tuyến cũ để trả về cho frontend
    const oldRoutesInfo = oldRoutesResult.action !== 'none' ? {
      canDelete: oldRoutesResult.canDelete,
      cannotDelete: oldRoutesResult.cannotDelete,
    } : undefined;

    const createdRoutes = [];
    const errors = [];
    const createdRouteNames = new Set(); // Track created route names to avoid duplicates in this session

    // Tạo từng tuyến đường (chỉ tạo số lượng giới hạn)
    // Xử lý tách routes nếu vượt quá maxRouteDistance
    // 🔥 QUAN TRỌNG: Kiểm tra độ dài thực tế sau khi tính polyline, không chỉ dựa vào estimatedDistance
    const finalRoutesToCreate = [];
    const routesToProcess = [...routesToCreate];
    
    // Xử lý từng route và tách nếu cần
    // 🔥 THÊM GIỚI HẠN: Tránh vòng lặp vô hạn khi tách route
    const MAX_SPLIT_DEPTH = 3; // Tối đa tách 3 lần
    const routeSplitDepth = new Map(); // Track độ sâu tách của mỗi route
    
    while (routesToProcess.length > 0) {
      const vrpRoute = routesToProcess.shift();
      const routeKey = vrpRoute.routeId || `route_${finalRoutesToCreate.length + routesToProcess.length}`;
      const currentDepth = routeSplitDepth.get(routeKey) || 0;
      
      // Nếu đã tách quá nhiều lần, giữ nguyên route và cảnh báo
      if (currentDepth >= MAX_SPLIT_DEPTH) {
        console.warn(`[RouteFromOptimization] ⚠️ Route ${routeKey} has been split ${currentDepth} times, keeping as is (may exceed max distance)`);
        finalRoutesToCreate.push(vrpRoute);
        continue;
      }
      
      // Tính độ dài thực tế từ Maps API trước khi quyết định có tách hay không
      let actualDistance = vrpRoute.estimatedDistance || 0;
      
      // Nếu có maxRouteDistance, tính độ dài thực tế từ Maps API để kiểm tra chính xác
      if (maxRouteDistance && vrpRoute.nodes && vrpRoute.nodes.length > 0) {
        try {
          // Tính polyline và độ dài thực tế từ Maps API
          const { distance } = await this.computePolylineForRoute({
            route: vrpRoute,
            depot,
            routeIndex: finalRoutesToCreate.length + routesToProcess.length + 1,
          });
          
          // Sử dụng độ dài thực tế từ Maps API
          if (distance > 0) {
            actualDistance = distance;
            console.log(`[RouteFromOptimization] Route actual distance from Maps API: ${actualDistance.toFixed(2)}km (estimated: ${(vrpRoute.estimatedDistance || 0).toFixed(2)}km)`);
          }
        } catch (error) {
          console.warn(`[RouteFromOptimization] Could not compute actual distance for route:`, error.message);
          // Fallback to estimatedDistance
          actualDistance = vrpRoute.estimatedDistance || 0;
        }
      }
      
      // Kiểm tra và tách route nếu quá dài (dựa trên độ dài thực tế từ Maps API)
      // 🔥 CHỈ TÁCH NẾU CÓ NHIỀU HƠN 1 NODE - nếu chỉ có 1 node mà vẫn vượt quá giới hạn, giữ nguyên
      const nodeCount = vrpRoute.nodes ? this.deduplicateNodesByOriginalStop(vrpRoute.nodes).length : 0;
      
      if (maxRouteDistance && actualDistance > maxRouteDistance && nodeCount > 1) {
        console.log(`[RouteFromOptimization] ⚠️ Route actual distance (${actualDistance.toFixed(2)}km) exceeds max (${maxRouteDistance}km), splitting... (depth: ${currentDepth}/${MAX_SPLIT_DEPTH})`);
        // Tách route thành nhiều routes nhỏ hơn
        const splitRoutes = await this.splitRouteIfTooLong({
          vrpRoute,
          depot,
          maxRouteDistance,
          routeNamePrefix,
          createdRouteNames,
          routeIndex: finalRoutesToCreate.length + routesToProcess.length + 1,
        });
        
        // Đánh dấu độ sâu tách cho các routes đã tách
        splitRoutes.forEach((splitRoute, idx) => {
          const splitRouteKey = splitRoute.routeId || `${routeKey}_split_${idx}`;
          routeSplitDepth.set(splitRouteKey, currentDepth + 1);
        });
        
        // Thêm các routes đã tách vào queue để xử lý tiếp (kiểm tra lại độ dài)
        routesToProcess.unshift(...splitRoutes);
      } else if (maxRouteDistance && actualDistance > maxRouteDistance && nodeCount === 1) {
        // Nếu chỉ có 1 node mà vẫn vượt quá giới hạn, giữ nguyên và cảnh báo
        console.warn(`[RouteFromOptimization] ⚠️ Route with single node exceeds max distance (${actualDistance.toFixed(2)}km > ${maxRouteDistance}km), keeping as is`);
        finalRoutesToCreate.push(vrpRoute);
      } else {
        finalRoutesToCreate.push(vrpRoute);
      }
    }

    console.log(`[RouteFromOptimization] After distance check: ${finalRoutesToCreate.length} routes to create (original: ${routesToCreate.length})`);

    // Tạo từng tuyến đường
    for (let i = 0; i < finalRoutesToCreate.length; i++) {
      const vrpRoute = finalRoutesToCreate[i];
      try {
        console.log(`[RouteFromOptimization] Creating route ${i + 1}/${finalRoutesToCreate.length}...`);
        console.log(`[RouteFromOptimization] Route ${i + 1} has ${vrpRoute.nodes?.length || 0} nodes, estimated distance: ${(vrpRoute.estimatedDistance || 0).toFixed(2)}km`);
        
        const route = await this.createSingleRoute({
          vrpRoute,
          routeIndex: i + 1,
          depot,
          routeNamePrefix,
          createdRouteNames, // Pass set to track names
          maxRouteDistance, // Pass để kiểm tra độ dài thực tế
        });
        
        // 🔥 Kiểm tra độ dài thực tế sau khi tạo route
        if (maxRouteDistance && route && route.estimatedDistance) {
          const actualRouteDistance = route.estimatedDistance; // Độ dài thực tế từ Maps API (km)
          if (actualRouteDistance > maxRouteDistance) {
            console.warn(`[RouteFromOptimization] ⚠️ Route ${i + 1} actual distance (${actualRouteDistance.toFixed(2)}km) exceeds max (${maxRouteDistance}km) after creation!`);
            console.warn(`[RouteFromOptimization] Route was created but may need manual adjustment or re-optimization`);
          }
        }

        if (route && route.tenTuyen) {
          createdRouteNames.add(route.tenTuyen);
          console.log(`[RouteFromOptimization] ✅ Created route: ${route.tenTuyen} (ID: ${route.maTuyen})`);
        }

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
            createdRouteNames, // Pass set to track names
          });
          
          if (returnRoute && returnRoute.tenTuyen) {
            createdRouteNames.add(returnRoute.tenTuyen);
            console.log(`[RouteFromOptimization] ✅ Created return route: ${returnRoute.tenTuyen} (ID: ${returnRoute.maTuyen})`);
          }
          
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
      oldRoutes: oldRoutesInfo, // Thông tin tuyến cũ để frontend hiển thị dialog
    };
  }

  /**
   * Tính khoảng cách từ depot đến điểm dừng (km)
   */
  static calculateDistanceFromDepot(depot, stop) {
    return StopSuggestionService.calculateDistance(
      depot.lat,
      depot.lng,
      parseFloat(stop.viDo),
      parseFloat(stop.kinhDo)
    );
  }

  /**
   * Lấy ID thực của stop (xử lý virtual nodes)
   * @param {Object} node - Node có thể là virtual hoặc real
   * @returns {string|number} - ID thực của stop trong DB
   */
  static getRealStopId(node) {
    if (!node) return null;
    // Nếu là virtual node, dùng originalStopId
    if (node.isVirtual && node.originalStopId) {
      return node.originalStopId;
    }
    // Nếu có originalStopId (ngay cả khi không phải virtual), dùng nó
    if (node.originalStopId) {
      return node.originalStopId;
    }
    // Ngược lại, dùng maDiem
    return node.maDiem;
  }

  /**
   * Gộp các virtual nodes từ cùng một stop vật lý
   * @param {Array} nodes - Danh sách nodes (có thể có virtual nodes)
   * @returns {Array} - Danh sách nodes đã được deduplicate
   */
  static deduplicateNodesByOriginalStop(nodes) {
    if (!nodes || nodes.length === 0) return [];
    
    const stopMap = new Map(); // Map: realStopId -> node
    
    for (const node of nodes) {
      const realStopId = this.getRealStopId(node);
      
      if (!stopMap.has(realStopId)) {
        // Node đầu tiên của stop này - giữ lại
        stopMap.set(realStopId, {
          ...node,
          maDiem: realStopId, // Đảm bảo maDiem là ID thực
          originalStopId: realStopId,
          isVirtual: false, // Sau khi deduplicate, không còn là virtual
          demand: node.demand || 0, // Demand sẽ được tổng hợp sau
        });
      } else {
        // Đã có node của stop này - tổng hợp demand
        const existingNode = stopMap.get(realStopId);
        existingNode.demand = (existingNode.demand || 0) + (node.demand || 0);
      }
    }
    
    return Array.from(stopMap.values());
  }

  /**
   * Tìm điểm dừng xa nhất từ depot
   */
  static findFarthestStop(nodes, depot) {
    if (nodes.length === 0) return null;
    
    let farthestStop = nodes[0];
    let maxDistance = RouteFromOptimizationService.calculateDistanceFromDepot(depot, nodes[0]);
    
    for (let i = 1; i < nodes.length; i++) {
      const distance = RouteFromOptimizationService.calculateDistanceFromDepot(depot, nodes[i]);
      if (distance > maxDistance) {
        maxDistance = distance;
        farthestStop = nodes[i];
      }
    }
    
    return farthestStop;
  }

  /**
   * Tính polyline và độ dài thực tế cho route (chỉ để preview, không lưu DB)
   * @param {Object} options - {route, depot, routeIndex}
   * @returns {Promise<{polyline: string|null, distance: number}>} Polyline string và độ dài thực tế (km)
   */
  static async computePolylineForRoute({ route, depot, routeIndex }) {
    let nodes = route.nodes || [];
    
    if (nodes.length === 0) {
      return { polyline: null, distance: 0 };
    }

    // Deduplicate virtual nodes
    nodes = this.deduplicateNodesByOriginalStop(nodes);

    // Tìm điểm dừng xa nhất
    const farthestStop = RouteFromOptimizationService.findFarthestStop(nodes, depot);
    const farthestStopRealId = this.getRealStopId(farthestStop);
    
    const origin = {
      lat: parseFloat(farthestStop.viDo),
      lng: parseFloat(farthestStop.kinhDo),
    };
    
    const destination = depot;

    // Sắp xếp nodes từ xa đến gần
    const remainingNodes = nodes.filter(n => this.getRealStopId(n) !== farthestStopRealId);
    const sortedRemainingNodes = [...remainingNodes].sort((a, b) => {
      const distA = this.calculateDistanceFromDepot(depot, a);
      const distB = this.calculateDistanceFromDepot(depot, b);
      return distB - distA; // Xa nhất trước
    });
    
    const finalWaypoints = sortedRemainingNodes.map((node) => ({
      location: `${node.viDo},${node.kinhDo}`,
    }));

    try {
      const directionsResult = await MapsService.getDirections({
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        waypoints: finalWaypoints.length > 0 ? finalWaypoints : undefined,
        mode: "driving",
        vehicleType: "bus",
        optimize: false,
      });
      
      const actualDistance = directionsResult.distance ? directionsResult.distance / 1000 : 0; // Convert meters to km
      
      return {
        polyline: directionsResult.polyline || null,
        distance: actualDistance,
      };
    } catch (error) {
      console.warn(`[RouteFromOptimization] Error computing polyline for route ${routeIndex}:`, error.message);
      return { polyline: null, distance: 0 };
    }
  }

  /**
   * Tách route thành nhiều routes nhỏ hơn nếu vượt quá maxRouteDistance
   * 🔥 CẢI THIỆN: Sử dụng ước tính nhanh hơn để tránh gọi Maps API quá nhiều lần
   * @param {Object} options - {vrpRoute, depot, maxRouteDistance, routeNamePrefix, createdRouteNames, routeIndex}
   * @returns {Promise<Array>} Array of routes
   */
  static async splitRouteIfTooLong({ vrpRoute, depot, maxRouteDistance, routeNamePrefix, createdRouteNames, routeIndex }) {
    let nodes = vrpRoute.nodes || [];
    
    if (nodes.length === 0) {
      return [];
    }

    // Deduplicate virtual nodes
    nodes = this.deduplicateNodesByOriginalStop(nodes);
    
    // Nếu chỉ có 1 node, không thể tách
    if (nodes.length <= 1) {
      return [vrpRoute];
    }

    // Tính độ dài tuyến hiện tại
    const routeDistance = vrpRoute.estimatedDistance || 0; // km
    
    // Nếu tuyến không vượt quá giới hạn, trả về route gốc
    if (routeDistance <= maxRouteDistance) {
      return [vrpRoute];
    }

    console.log(`[RouteFromOptimization] ⚠️ Route ${routeIndex} distance (${routeDistance.toFixed(2)}km) exceeds max (${maxRouteDistance}km), splitting...`);

    // 🔥 CẢI THIỆN: Sử dụng ước tính nhanh để tách route, chỉ tính chính xác khi cần
    // Sắp xếp nodes theo khoảng cách từ depot (xa nhất trước)
    const sortedNodes = [...nodes].sort((a, b) => {
      const distA = this.calculateDistanceFromDepot(depot, a);
      const distB = this.calculateDistanceFromDepot(depot, b);
      return distB - distA; // Xa nhất trước
    });

    const splitRoutes = [];
    let currentRouteNodes = [];
    let splitRouteIndex = 1;
    
    // 🔥 Ước tính độ dài route: khoảng cách từ depot đến điểm xa nhất * 2 (đi và về)
    // Cộng thêm khoảng cách giữa các nodes (ước tính đơn giản)
    const estimateRouteDistance = (routeNodes) => {
      if (routeNodes.length === 0) return 0;
      if (routeNodes.length === 1) {
        return this.calculateDistanceFromDepot(depot, routeNodes[0]) * 2;
      }
      
      // Tìm điểm xa nhất
      let maxDist = 0;
      let totalInterNodeDistance = 0;
      
      for (let i = 0; i < routeNodes.length; i++) {
        const dist = this.calculateDistanceFromDepot(depot, routeNodes[i]);
        if (dist > maxDist) {
          maxDist = dist;
        }
        
        // Ước tính khoảng cách giữa các nodes (nếu có)
        if (i > 0) {
          const interDist = StopSuggestionService.calculateDistance(
            routeNodes[i-1].viDo,
            routeNodes[i-1].kinhDo,
            routeNodes[i].viDo,
            routeNodes[i].kinhDo
          );
          totalInterNodeDistance += interDist;
        }
      }
      
      // Ước tính: khoảng cách từ depot đến điểm xa nhất * 2 + khoảng cách giữa các nodes
      return maxDist * 2 + totalInterNodeDistance * 0.8; // Hệ số 0.8 để bù cho đường cong
    };

    // Tách route bằng cách thêm nodes vào route hiện tại cho đến khi ước tính vượt quá giới hạn
    for (let i = 0; i < sortedNodes.length; i++) {
      const node = sortedNodes[i];
      const testRouteNodes = [...currentRouteNodes, node];
      
      // Ước tính độ dài route nếu thêm node này
      const estimatedDistance = estimateRouteDistance(testRouteNodes);
      
      // Nếu ước tính vượt quá giới hạn và đã có nodes trong route hiện tại
      // (cho phép vượt quá một chút để tránh tách quá nhỏ)
      if (estimatedDistance > maxRouteDistance * 1.1 && currentRouteNodes.length > 0) {
        // Tính độ dài thực tế của route hiện tại (chỉ khi cần)
        let currentRouteDistance = estimateRouteDistance(currentRouteNodes);
        
        // Nếu route hiện tại có nhiều nodes, tính chính xác hơn
        if (currentRouteNodes.length > 3) {
          try {
            const currentRoute = {
              ...vrpRoute,
              nodes: currentRouteNodes,
            };
            const { distance } = await this.computePolylineForRoute({
              route: currentRoute,
              depot,
              routeIndex: `${routeIndex}_${splitRouteIndex}`,
            });
            if (distance > 0) {
              currentRouteDistance = distance;
            }
          } catch (error) {
            // Giữ nguyên ước tính nếu không tính được
            console.warn(`[RouteFromOptimization] Could not compute exact distance for split route, using estimate`);
          }
        }
        
        // Tạo route từ các nodes hiện tại
        splitRoutes.push({
          ...vrpRoute,
          nodes: [...currentRouteNodes],
          routeId: `${vrpRoute.routeId || routeIndex}_${splitRouteIndex}`,
          estimatedDistance: currentRouteDistance,
        });
        
        // Bắt đầu route mới với node hiện tại
        currentRouteNodes = [node];
        splitRouteIndex++;
      } else {
        // Thêm node vào route hiện tại
        currentRouteNodes.push(node);
      }
    }

    // Thêm route cuối cùng nếu còn nodes
    if (currentRouteNodes.length > 0) {
      // Tính độ dài thực tế của route cuối cùng (chỉ khi có nhiều nodes)
      let finalRouteDistance = estimateRouteDistance(currentRouteNodes);
      
      if (currentRouteNodes.length > 3) {
        try {
          const finalRoute = {
            ...vrpRoute,
            nodes: currentRouteNodes,
          };
          const { distance } = await this.computePolylineForRoute({
            route: finalRoute,
            depot,
            routeIndex: `${routeIndex}_${splitRouteIndex}`,
          });
          if (distance > 0) {
            finalRouteDistance = distance;
          }
        } catch (error) {
          // Giữ nguyên ước tính nếu không tính được
          console.warn(`[RouteFromOptimization] Could not compute exact distance for final split route, using estimate`);
        }
      }
      
      splitRoutes.push({
        ...vrpRoute,
        nodes: currentRouteNodes,
        routeId: `${vrpRoute.routeId || routeIndex}_${splitRouteIndex}`,
        estimatedDistance: finalRouteDistance,
      });
    }

    console.log(`[RouteFromOptimization] ✅ Split route ${routeIndex} into ${splitRoutes.length} routes`);
    
    // 🔥 VERIFY: Đảm bảo các routes đã tách không quá dài
    for (const splitRoute of splitRoutes) {
      if (splitRoute.estimatedDistance > maxRouteDistance * 1.2) {
        console.warn(`[RouteFromOptimization] ⚠️ Split route ${splitRoute.routeId} still exceeds max distance (${splitRoute.estimatedDistance.toFixed(2)}km > ${maxRouteDistance}km)`);
      }
    }
    
    return splitRoutes;
  }

  /**
   * Tạo một tuyến đường đi (điểm xa nhất → stops → trường SGU)
   * Tuyến đi: bắt đầu từ điểm dừng xa nhất, kết thúc tại trường SGU
   */
  static async createSingleRoute({ vrpRoute, routeIndex, depot, routeNamePrefix, createdRouteNames = null, maxRouteDistance = null }) {
    let nodes = vrpRoute.nodes || [];
    
    if (nodes.length === 0) {
      throw new Error("Route has no stops");
    }

    // 🔥 QUAN TRỌNG: Deduplicate virtual nodes trước khi xử lý
    nodes = this.deduplicateNodesByOriginalStop(nodes);
    console.log(`[RouteFromOptimization] After deduplication: ${nodes.length} unique stops`);

    // Tìm điểm dừng xa nhất từ trường (điểm bắt đầu của tuyến đi)
    const farthestStop = RouteFromOptimizationService.findFarthestStop(nodes, depot);
    const farthestStopRealId = this.getRealStopId(farthestStop); // Lấy ID thực một lần
    
    // Tuyến đi: điểm bắt đầu = điểm dừng xa nhất, điểm kết thúc = trường SGU
    const origin = {
      lat: parseFloat(farthestStop.viDo),
      lng: parseFloat(farthestStop.kinhDo),
      name: farthestStop.tenDiem || `Điểm dừng ${farthestStopRealId}`,
      address: null,
    };
    
    const destination = depot; // Trường SGU là điểm kết thúc

    // Tên tuyến - thống nhất format: dùng " - Đi" (giữ format cũ cho tuyến đi)
    // Tuyến về sẽ dùng " (Về)" để phân biệt
    let tenTuyen = `${routeNamePrefix} ${routeIndex} - Đi`;
    tenTuyen = await this.generateUniqueRouteName(tenTuyen, createdRouteNames);

    // Sắp xếp nodes: bắt đầu từ điểm xa nhất, kết thúc tại trường
    // Tạo thứ tự tối ưu: farthestStop → các điểm dừng khác → depot
    const orderedNodes = [];
    const remainingNodes = nodes.filter(n => this.getRealStopId(n) !== farthestStopRealId);
    
    // Bắt đầu từ điểm xa nhất
    orderedNodes.push(farthestStop);
    
    // Thêm các điểm dừng còn lại (giữ thứ tự từ VRP nếu có thể)
    // Nếu không, sắp xếp theo khoảng cách từ điểm xa nhất
    orderedNodes.push(...remainingNodes);
    
    // Depot (trường) là điểm cuối cùng - không thêm vào waypoints
    const waypoints = orderedNodes.slice(1).map((node) => ({
      location: `${node.viDo},${node.kinhDo}`,
    }));
    
    // Lưu mapping giữa waypoint index và node để cập nhật lại sau khi optimize
    const waypointToNodeMap = new Map();
    orderedNodes.slice(1).forEach((node, idx) => {
      waypointToNodeMap.set(idx, node);
    });

    console.log(`[RouteFromOptimization] Getting directions for route: ${tenTuyen}`);
    console.log(`[RouteFromOptimization] Origin (farthest stop): ${origin.name} (${origin.lat}, ${origin.lng})`);
    console.log(`[RouteFromOptimization] Destination (depot/school): ${destination.name} (${destination.lat}, ${destination.lng})`);
    console.log(`[RouteFromOptimization] Waypoints (stops): ${waypoints.length}`);

    // 🔥 QUAN TRỌNG: Sắp xếp các điểm dừng trung gian theo khoảng cách từ XA đến GẦN trường học
    // KHÔNG optimize waypoints vì Google Maps sẽ tối ưu cho quãng đường ngắn nhất, không phải từ xa đến gần
    // Tuyến đường đi: điểm xa nhất → các điểm gần hơn → trường học
    const sortedRemainingNodes = [...remainingNodes].sort((a, b) => {
      const distA = this.calculateDistanceFromDepot(depot, a);
      const distB = this.calculateDistanceFromDepot(depot, b);
      return distB - distA; // Xa nhất trước, gần nhất sau
    });
    
    // Tạo thứ tự cuối cùng: farthestStop (xa nhất) → sortedRemainingNodes (từ xa đến gần) → depot (trường)
    const finalOrderedNodes = [farthestStop, ...sortedRemainingNodes];
    
    console.log(`[RouteFromOptimization] Final nodes order (farthest → nearest → school):`, finalOrderedNodes.map((n, idx) => ({
      sequence: idx + 1,
      maDiem: n.maDiem,
      tenDiem: n.tenDiem,
      distance: this.calculateDistanceFromDepot(depot, n).toFixed(2) + 'km'
    })));
    
    // Tạo waypoints từ các điểm trung gian (không bao gồm farthestStop và depot)
    const finalWaypoints = sortedRemainingNodes.map((node) => ({
      location: `${node.viDo},${node.kinhDo}`,
    }));

    console.log(`[RouteFromOptimization] Getting directions for route: ${tenTuyen}`);
    console.log(`[RouteFromOptimization] Origin (farthest stop): ${origin.name} (${origin.lat}, ${origin.lng})`);
    console.log(`[RouteFromOptimization] Destination (depot/school): ${destination.name} (${destination.lat}, ${destination.lng})`);
    console.log(`[RouteFromOptimization] Waypoints (stops, từ xa đến gần): ${finalWaypoints.length}`);

    // Lấy directions từ Google Maps API: điểm xa nhất → stops (từ xa đến gần) → trường SGU
    // KHÔNG optimize waypoints để giữ thứ tự từ xa đến gần
    const directionsResult = await MapsService.getDirections({
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      waypoints: finalWaypoints.length > 0 ? finalWaypoints : undefined,
      mode: "driving",
      vehicleType: "bus",
      optimize: false, // 🔥 KHÔNG optimize để giữ thứ tự từ xa đến gần
    });
    
    // Sử dụng finalOrderedNodes đã được sắp xếp
    const optimizedNodes = finalOrderedNodes;

    // Lấy polyline từ điểm xa nhất → stops → trường SGU
    let polyline = directionsResult.polyline;
    let estimatedTime = Math.round(directionsResult.duration / 60); // minutes
    const routeDistanceKm = directionsResult.distance / 1000; // Convert meters to km

    // 🔥 Kiểm tra độ dài tuyến, nếu vượt quá giới hạn thì cảnh báo
    if (maxRouteDistance && routeDistanceKm > maxRouteDistance) {
      console.warn(`[RouteFromOptimization] ⚠️ Route ${routeIndex} actual distance (${routeDistanceKm.toFixed(2)}km) exceeds max (${maxRouteDistance}km)`);
      console.warn(`[RouteFromOptimization] Route will still be created, but consider adjusting optimization parameters`);
      // Không throw error, chỉ cảnh báo và tiếp tục tạo route
      // Route đã được tách ở bước trước nếu cần (dựa trên estimatedDistance)
    }

    // Tạo điểm dừng depot nếu chưa có (cần cho route_stops)
    let depotStopId = await this.findOrCreateDepotStop(depot);

    // Tạo route trong DB
    // Tuyến đi: diemBatDau = điểm xa nhất, diemKetThuc = trường SGU
    const routeId = await TuyenDuongModel.create({
      tenTuyen,
      diemBatDau: origin.name, // Điểm dừng xa nhất
      diemKetThuc: destination.name || "Đại học Sài Gòn", // Trường SGU
      thoiGianUocTinh: estimatedTime,
      origin_lat: origin.lat, // Tọa độ điểm xa nhất
      origin_lng: origin.lng,
      dest_lat: destination.lat, // Tọa độ trường SGU
      dest_lng: destination.lng,
      polyline,
      trangThai: true,
      routeType: "di",
    });

    console.log(`[RouteFromOptimization] ✅ Created route ${routeId}: ${tenTuyen}`);
    console.log(`[RouteFromOptimization] Route start: ${origin.name} (${origin.lat}, ${origin.lng})`);
    console.log(`[RouteFromOptimization] Route end: ${destination.name} (${destination.lat}, ${destination.lng})`);
    console.log(`[RouteFromOptimization] Route ${routeId} will be linked to return route later (if created)`);

    // Helper function để thêm hoặc cập nhật điểm dừng
    const addOrUpdateStop = async (stopId, seq, dwellSeconds) => {
      try {
        await RouteStopModel.addStop(routeId, stopId, seq, dwellSeconds);
      } catch (error) {
        if (error.message === "STOP_ALREADY_IN_ROUTE" || error.message === "SEQUENCE_ALREADY_EXISTS") {
          // Nếu đã tồn tại, cập nhật sequence và dwell_seconds
          console.log(`[RouteFromOptimization] Stop ${stopId} already in route, updating sequence to ${seq}`);
          await RouteStopModel.updateStop(routeId, stopId, seq, dwellSeconds);
        } else {
          throw error;
        }
      }
    };

    // 🔥 Gán các điểm dừng vào tuyến theo thứ tự: điểm xa nhất (sequence 1) → các điểm khác (từ xa đến gần) → trường SGU
    const stops = [];
    let sequence = 1;
    
    // Loại bỏ trùng lặp trong optimizedNodes (tránh thêm cùng một điểm dừng nhiều lần)
    // optimizedNodes đã được sắp xếp: [farthestStop, ...sortedRemainingNodes (từ xa đến gần)]
    const uniqueOptimizedNodes = [];
    const seenStopIds = new Set();
    
    // 🔥 Đảm bảo farthestStop luôn là điểm đầu tiên (nếu không trùng với depot)
    if (optimizedNodes.length > 0 && this.getRealStopId(optimizedNodes[0]) === farthestStopRealId) {
      uniqueOptimizedNodes.push(optimizedNodes[0]);
      seenStopIds.add(farthestStopRealId);
    }
    
    // Thêm các điểm còn lại (đã được sắp xếp từ xa đến gần)
    for (const node of optimizedNodes) {
      const nodeRealId = this.getRealStopId(node);
      if (!seenStopIds.has(nodeRealId)) {
        seenStopIds.add(nodeRealId);
        uniqueOptimizedNodes.push(node);
      }
    }
    
    // 🔥 Verify: điểm đầu tiên phải là điểm xa nhất
    console.log(`[RouteFromOptimization] Assigning stops to route_stops with sequence:`);
    if (uniqueOptimizedNodes.length > 0) {
      const firstNode = uniqueOptimizedNodes[0];
      const firstDistance = this.calculateDistanceFromDepot(depot, firstNode);
      console.log(`[RouteFromOptimization] Sequence 1 (farthest stop):`, {
        maDiem: firstNode.maDiem,
        tenDiem: firstNode.tenDiem,
        distance: firstDistance.toFixed(2) + 'km'
      });
      
      // Verify điểm đầu tiên là xa nhất
      const allDistances = uniqueOptimizedNodes.map(n => this.calculateDistanceFromDepot(depot, n));
      const maxDistance = Math.max(...allDistances);
      if (Math.abs(firstDistance - maxDistance) > 0.01) {
        console.error(`[RouteFromOptimization] ❌ ERROR: First node is NOT the farthest! First: ${firstDistance.toFixed(2)}km, Max: ${maxDistance.toFixed(2)}km`);
        // Sắp xếp lại để đảm bảo điểm xa nhất là đầu tiên
        uniqueOptimizedNodes.sort((a, b) => {
          const distA = this.calculateDistanceFromDepot(depot, a);
          const distB = this.calculateDistanceFromDepot(depot, b);
          return distB - distA; // Xa nhất trước
        });
        console.log(`[RouteFromOptimization] ✅ Re-sorted nodes to ensure farthest is first`);
      }
    }
    
    // Kiểm tra xem depot stop có trùng với farthest stop không
    const isDepotSameAsFarthest = farthestStopRealId === depotStopId;
    
    // 1. Điểm dừng đầu tiên: điểm xa nhất (điểm bắt đầu) - chỉ thêm nếu không trùng với depot
    if (!isDepotSameAsFarthest) {
      const farthestStopData = await DiemDungModel.getById(farthestStopRealId);
      if (farthestStopData) {
        await addOrUpdateStop(farthestStopRealId, sequence, 30);
        stops.push({
          maDiem: farthestStopRealId,
          tenDiem: farthestStop.tenDiem || farthestStopData.tenDiem,
          viDo: farthestStop.viDo,
          kinhDo: farthestStop.kinhDo,
          sequence: sequence++,
        });
      }
    } else {
      console.log(`[RouteFromOptimization] ⚠️ Farthest stop is same as depot, skipping duplicate`);
    }

    // 2. Các điểm dừng còn lại (theo thứ tự đã được optimize, đã loại bỏ trùng lặp)
    // Bỏ qua điểm đầu tiên (farthestStop) vì đã xử lý ở trên
    for (const node of uniqueOptimizedNodes.slice(1)) {
      const nodeRealId = this.getRealStopId(node);
      // Bỏ qua nếu trùng với depot hoặc farthest stop
      if (nodeRealId === depotStopId || nodeRealId === farthestStopRealId) {
        continue;
      }
      
      const stop = await DiemDungModel.getById(nodeRealId);
      if (!stop) {
        console.warn(`[RouteFromOptimization] ⚠️ Stop ${nodeRealId} not found, skipping`);
        continue;
      }

      await addOrUpdateStop(nodeRealId, sequence, 30);
      stops.push({
        maDiem: nodeRealId,
        tenDiem: node.tenDiem || stop.tenDiem,
        viDo: node.viDo,
        kinhDo: node.kinhDo,
        sequence: sequence++,
      });
    }

    // 3. Điểm dừng cuối cùng: trường SGU (không đón học sinh, dwell_seconds = 0)
    // Chỉ thêm nếu chưa có trong route (nếu farthest stop là depot thì đã có rồi)
    if (!isDepotSameAsFarthest && !stops.some(s => s.maDiem === depotStopId)) {
      await addOrUpdateStop(depotStopId, sequence, 0);
      stops.push({
        maDiem: depotStopId,
        tenDiem: destination.name || "Đại học Sài Gòn",
        viDo: destination.lat,
        kinhDo: destination.lng,
        sequence: sequence,
      });
    } else if (isDepotSameAsFarthest) {
      // Nếu depot là farthest stop, đảm bảo nó ở cuối với dwell_seconds = 0
      await addOrUpdateStop(depotStopId, sequence, 0);
      // Cập nhật sequence của depot stop nếu đã có
      const existingDepotIndex = stops.findIndex(s => s.maDiem === depotStopId);
      if (existingDepotIndex >= 0) {
        stops[existingDepotIndex].sequence = sequence;
      } else {
        stops.push({
          maDiem: depotStopId,
          tenDiem: destination.name || "Đại học Sài Gòn",
          viDo: destination.lat,
          kinhDo: destination.lng,
          sequence: sequence,
        });
      }
    }

    // 🔥 Verify thứ tự stops đã được gán đúng
    const finalStopsOrder = stops.sort((a, b) => a.sequence - b.sequence);
    console.log(`[RouteFromOptimization] ✅ Assigned ${stops.length} stops to route ${routeId}`);
    console.log(`[RouteFromOptimization] Final stops order (sequence):`, finalStopsOrder.map(s => ({
      sequence: s.sequence,
      maDiem: s.maDiem,
      tenDiem: s.tenDiem,
      distance: s.sequence === 1 ? 'FARTHEST' : (s.sequence === finalStopsOrder.length ? 'SCHOOL' : this.calculateDistanceFromDepot(depot, s).toFixed(2) + 'km')
    })));
    
    // 🔥 Verify điểm đầu tiên (sequence 1) là điểm xa nhất
    if (finalStopsOrder.length > 0) {
      const firstStop = finalStopsOrder[0];
      const firstStopDistance = this.calculateDistanceFromDepot(depot, firstStop);
      const allDistances = finalStopsOrder.map(s => this.calculateDistanceFromDepot(depot, s));
      const maxDistance = Math.max(...allDistances);
      
      if (Math.abs(firstStopDistance - maxDistance) > 0.1) {
        console.warn(`[RouteFromOptimization] ⚠️ WARNING: First stop (sequence 1) is NOT the farthest!`);
        console.warn(`[RouteFromOptimization] First stop distance: ${firstStopDistance.toFixed(2)}km, Max distance: ${maxDistance.toFixed(2)}km`);
      } else {
        console.log(`[RouteFromOptimization] ✅ Verified: First stop (sequence 1) is the farthest (${firstStopDistance.toFixed(2)}km)`);
      }
    }

    // 🔥 Tự động gán học sinh vào student_stop_suggestions sau khi thêm stops (giống như tạo thủ công)
    try {
      const RouteService = (await import("./RouteService.js")).default;
      const routeStops = await RouteStopModel.getByRouteId(routeId);
      if (routeStops.length > 0) {
        console.log(`[RouteFromOptimization] Assigning students to ${routeStops.length} stops for route ${routeId}...`);
        
        // Verify stops có tọa độ hợp lệ
        const validStops = routeStops.filter(s => s.viDo && s.kinhDo && !isNaN(s.viDo) && !isNaN(s.kinhDo));
        if (validStops.length !== routeStops.length) {
          console.warn(`[RouteFromOptimization] ⚠️ Some stops missing coordinates: ${routeStops.length - validStops.length} stops without valid coordinates`);
        }
        
        if (validStops.length > 0) {
          const assignedCount = await RouteService.assignStudentsToStops(routeId, validStops);
          console.log(`[RouteFromOptimization] ✅ Auto-assigned ${assignedCount} students to route ${routeId} stops (${validStops.length} valid stops)`);
          
          if (assignedCount === 0) {
            console.warn(`[RouteFromOptimization] ⚠️ No students assigned to route ${routeId}. Possible reasons:`);
            console.warn(`[RouteFromOptimization]   1. No students within 2km of any stop`);
            console.warn(`[RouteFromOptimization]   2. Students don't have valid coordinates`);
            console.warn(`[RouteFromOptimization]   3. Students are not active (trangThai = false)`);
          }
        } else {
          console.warn(`[RouteFromOptimization] ⚠️ No valid stops with coordinates for route ${routeId}, skipping student assignment`);
        }
      } else {
        console.warn(`[RouteFromOptimization] ⚠️ Route ${routeId} has no stops, skipping student assignment`);
      }
    } catch (assignError) {
      console.error(`[RouteFromOptimization] ❌ Failed to auto-assign students to route ${routeId}:`, assignError);
      console.error(`[RouteFromOptimization] Error stack:`, assignError.stack);
      // Không throw error - route đã được tạo thành công
    }

    return {
      maTuyen: routeId,
      tenTuyen,
      diemBatDau: origin.name, // Điểm xa nhất
      diemKetThuc: destination.name || "Đại học Sài Gòn", // Trường SGU
      thoiGianUocTinh: estimatedTime,
      stopCount: stops.length,
      totalDemand: vrpRoute.totalDemand || 0,
      stops,
    };
  }

  /**
   * Tạo tuyến về (trường SGU → stops → điểm xa nhất)
   * Tuyến về: bắt đầu từ trường SGU, kết thúc tại điểm dừng xa nhất
   */
  static async createReturnRoute({ vrpRoute, routeIndex, depot, routeNamePrefix, originalRouteId, createdRouteNames = null }) {
    let nodes = vrpRoute.nodes || [];
    
    if (nodes.length === 0) {
      throw new Error("Route has no stops");
    }

    // 🔥 QUAN TRỌNG: Deduplicate virtual nodes trước khi xử lý
    nodes = this.deduplicateNodesByOriginalStop(nodes);
    console.log(`[RouteFromOptimization] Return route after deduplication: ${nodes.length} unique stops`);

    // Tìm điểm dừng xa nhất từ trường (điểm kết thúc của tuyến về)
    const farthestStop = RouteFromOptimizationService.findFarthestStop(nodes, depot);
    const farthestStopRealId = this.getRealStopId(farthestStop); // Lấy ID thực một lần

    // Tuyến về: điểm bắt đầu = trường SGU, điểm kết thúc = điểm dừng xa nhất
    const origin = depot; // Trường SGU là điểm bắt đầu
    const destination = {
      lat: parseFloat(farthestStop.viDo),
      lng: parseFloat(farthestStop.kinhDo),
      name: farthestStop.tenDiem || `Điểm dừng ${farthestStopRealId}`,
      address: null,
    };

    // Tên tuyến - thống nhất format với tạo thủ công: dùng (Về) thay vì - Về
    // Tìm tên tuyến đi tương ứng để tạo tên tuyến về
    const originalRoute = await TuyenDuongModel.getById(originalRouteId);
    let tenTuyen;
    if (originalRoute && originalRoute.tenTuyen) {
      const originalName = originalRoute.tenTuyen;
      
      // Xử lý các format khác nhau:
      // 1. "Tuyến Tối Ưu X - Đi" -> "Tuyến Tối Ưu X (Về)"
      // 2. "Tuyến Tối Ưu X - Đi Y" -> "Tuyến Tối Ưu X - Đi Y (Về)" (giữ nguyên số thứ tự nếu có)
      // 3. Format khác -> thêm " (Về)" vào cuối
      
      if (originalName.endsWith(' - Đi')) {
        // Format: "Tuyến Tối Ưu 1 - Đi" -> "Tuyến Tối Ưu 1 (Về)"
        tenTuyen = originalName.replace(' - Đi', ' (Về)');
      } else if (originalName.match(/\s-\sĐi\s\d+$/)) {
        // Format: "Tuyến Tối Ưu 1 - Đi 2" -> "Tuyến Tối Ưu 1 - Đi 2 (Về)"
        // Giữ nguyên số thứ tự, chỉ thêm (Về)
        tenTuyen = `${originalName} (Về)`;
      } else {
        // Format khác: thêm " (Về)" vào cuối
        tenTuyen = `${originalName} (Về)`;
      }
    } else {
      // Fallback: tạo tên mới
      tenTuyen = `${routeNamePrefix} ${routeIndex} (Về)`;
    }
    // Kiểm tra duplicate và tạo tên unique
    tenTuyen = await this.generateUniqueRouteName(tenTuyen, createdRouteNames);

    // Sắp xếp nodes: bắt đầu từ trường, kết thúc tại điểm xa nhất
    const remainingNodes = nodes.filter(n => this.getRealStopId(n) !== farthestStopRealId);
    const waypoints = remainingNodes.map((node) => ({
      location: `${node.viDo},${node.kinhDo}`,
    }));

    console.log(`[RouteFromOptimization] Getting directions for return route: ${tenTuyen}`);
    console.log(`[RouteFromOptimization] Origin (depot/school): ${origin.name} (${origin.lat}, ${origin.lng})`);
    console.log(`[RouteFromOptimization] Destination (farthest stop): ${destination.name} (${destination.lat}, ${destination.lng})`);
    console.log(`[RouteFromOptimization] Waypoints (stops): ${waypoints.length}`);

    // 🔥 QUAN TRỌNG: Sắp xếp các điểm dừng trung gian theo khoảng cách từ GẦN đến XA trường học
    // KHÔNG optimize waypoints vì cần giữ thứ tự từ gần đến xa
    // Tuyến về: trường học → các điểm gần → điểm xa nhất
    const sortedRemainingNodes = [...remainingNodes].sort((a, b) => {
      const distA = this.calculateDistanceFromDepot(depot, a);
      const distB = this.calculateDistanceFromDepot(depot, b);
      return distA - distB; // Gần nhất trước, xa nhất sau
    });
    
    // Tạo thứ tự cuối cùng: depot (trường) → sortedRemainingNodes (từ gần đến xa) → farthestStop (xa nhất)
    const finalOrderedNodes = [depot, ...sortedRemainingNodes, farthestStop];
    
    console.log(`[RouteFromOptimization] Final return route nodes order (school → nearest → farthest):`, finalOrderedNodes.map((n, idx) => ({
      sequence: idx + 1,
      maDiem: n.maDiem || 'SCHOOL',
      tenDiem: n.tenDiem || n.name || 'Đại học Sài Gòn',
      distance: idx === 0 ? '0.00km' : this.calculateDistanceFromDepot(depot, n).toFixed(2) + 'km'
    })));
    
    // Tạo waypoints từ các điểm trung gian (không bao gồm depot và farthestStop)
    const finalWaypoints = sortedRemainingNodes.map((node) => ({
      location: `${node.viDo},${node.kinhDo}`,
    }));

    console.log(`[RouteFromOptimization] Getting directions for return route: ${tenTuyen}`);
    console.log(`[RouteFromOptimization] Origin (depot/school): ${origin.name} (${origin.lat}, ${origin.lng})`);
    console.log(`[RouteFromOptimization] Destination (farthest stop): ${destination.name} (${destination.lat}, ${destination.lng})`);
    console.log(`[RouteFromOptimization] Waypoints (stops, từ gần đến xa): ${finalWaypoints.length}`);

    // Lấy directions từ Google Maps API: trường SGU → stops (từ gần đến xa) → điểm xa nhất
    // KHÔNG optimize waypoints để giữ thứ tự từ gần đến xa
    const directionsResult = await MapsService.getDirections({
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      waypoints: finalWaypoints.length > 0 ? finalWaypoints : undefined,
      mode: "driving",
      vehicleType: "bus",
      optimize: false, // 🔥 KHÔNG optimize để giữ thứ tự từ gần đến xa
    });
    
    // Sử dụng sortedRemainingNodes đã được sắp xếp
    const optimizedRemainingNodes = sortedRemainingNodes;

    const polyline = directionsResult.polyline;
    const estimatedTime = Math.round(directionsResult.duration / 60); // minutes

    // Tạo điểm dừng depot nếu chưa có
    let depotStopId = await this.findOrCreateDepotStop(depot);

    // Tạo route trong DB
    // Tuyến về: diemBatDau = trường SGU, diemKetThuc = điểm xa nhất
    const routeId = await TuyenDuongModel.create({
      tenTuyen,
      diemBatDau: origin.name || "Đại học Sài Gòn", // Trường SGU
      diemKetThuc: destination.name, // Điểm dừng xa nhất
      thoiGianUocTinh: estimatedTime,
      origin_lat: origin.lat, // Tọa độ trường SGU
      origin_lng: origin.lng,
      dest_lat: destination.lat, // Tọa độ điểm xa nhất
      dest_lng: destination.lng,
      polyline,
      trangThai: true,
      routeType: "ve",
      pairedRouteId: originalRouteId, // Link với tuyến đi
    });

    console.log(`[RouteFromOptimization] ✅ Created return route ${routeId}: ${tenTuyen}`);
    console.log(`[RouteFromOptimization] Route start: ${origin.name} (${origin.lat}, ${origin.lng})`);
    console.log(`[RouteFromOptimization] Route end: ${destination.name} (${destination.lat}, ${destination.lng})`);

    // Helper function để thêm hoặc cập nhật điểm dừng
    const addOrUpdateStop = async (stopId, seq, dwellSeconds) => {
      try {
        await RouteStopModel.addStop(routeId, stopId, seq, dwellSeconds);
      } catch (error) {
        if (error.message === "STOP_ALREADY_IN_ROUTE" || error.message === "SEQUENCE_ALREADY_EXISTS") {
          // Nếu đã tồn tại, cập nhật sequence và dwell_seconds
          console.log(`[RouteFromOptimization] Stop ${stopId} already in route, updating sequence to ${seq}`);
          await RouteStopModel.updateStop(routeId, stopId, seq, dwellSeconds);
        } else {
          throw error;
        }
      }
    };

    // Gán các điểm dừng vào tuyến theo thứ tự đã được optimize: trường SGU → các điểm khác → điểm xa nhất
    const stops = [];
    let sequence = 1;
    
    // Loại bỏ trùng lặp trong optimizedRemainingNodes
    const uniqueOptimizedRemainingNodes = [];
    const seenStopIds = new Set();
    for (const node of optimizedRemainingNodes) {
      const nodeRealId = this.getRealStopId(node);
      if (!seenStopIds.has(nodeRealId)) {
        seenStopIds.add(nodeRealId);
        uniqueOptimizedRemainingNodes.push(node);
      }
    }
    
    // Kiểm tra xem depot stop có trùng với farthest stop không
    const isDepotSameAsFarthest = farthestStopRealId === depotStopId;
    
    // 1. Điểm dừng đầu tiên: trường SGU (không đón học sinh, dwell_seconds = 0)
    if (!isDepotSameAsFarthest) {
      await addOrUpdateStop(depotStopId, sequence, 0);
      stops.push({
        maDiem: depotStopId,
        tenDiem: origin.name || "Đại học Sài Gòn",
        viDo: origin.lat,
        kinhDo: origin.lng,
        sequence: sequence++,
      });
    }

    // 2. Các điểm dừng còn lại (theo thứ tự đã được optimize, đã loại bỏ trùng lặp)
    for (const node of uniqueOptimizedRemainingNodes) {
      const nodeRealId = this.getRealStopId(node);
      // Bỏ qua nếu trùng với depot hoặc farthest stop
      if (nodeRealId === depotStopId || nodeRealId === farthestStopRealId) {
        continue;
      }
      
      const stop = await DiemDungModel.getById(nodeRealId);
      if (!stop) {
        console.warn(`[RouteFromOptimization] ⚠️ Stop ${nodeRealId} not found, skipping`);
        continue;
      }

      await addOrUpdateStop(nodeRealId, sequence, 30);
      stops.push({
        maDiem: nodeRealId,
        tenDiem: node.tenDiem || stop.tenDiem,
        viDo: node.viDo,
        kinhDo: node.kinhDo,
        sequence: sequence++,
      });
    }

    // 3. Điểm dừng cuối cùng: điểm xa nhất (điểm kết thúc)
    // Chỉ thêm nếu không trùng với depot
    if (!isDepotSameAsFarthest) {
      const farthestStopData = await DiemDungModel.getById(farthestStopRealId);
      if (farthestStopData) {
        await addOrUpdateStop(farthestStopRealId, sequence, 30);
        stops.push({
          maDiem: farthestStopRealId,
          tenDiem: farthestStop.tenDiem || farthestStopData.tenDiem,
          viDo: farthestStop.viDo,
          kinhDo: farthestStop.kinhDo,
          sequence: sequence,
        });
      }
    } else {
      // Nếu depot là farthest stop, đảm bảo nó ở cuối với dwell_seconds = 30 (đón học sinh)
      await addOrUpdateStop(depotStopId, sequence, 30);
      // Cập nhật sequence của depot stop nếu đã có
      const existingDepotIndex = stops.findIndex(s => s.maDiem === depotStopId);
      if (existingDepotIndex >= 0) {
        stops[existingDepotIndex].sequence = sequence;
      } else {
        stops.push({
          maDiem: depotStopId,
          tenDiem: farthestStop.tenDiem || destination.name || "Đại học Sài Gòn",
          viDo: destination.lat,
          kinhDo: destination.lng,
          sequence: sequence,
        });
      }
    }

    console.log(`[RouteFromOptimization] ✅ Assigned ${stops.length} stops to return route ${routeId} (school → other stops → farthest stop)`);

    // 🔥 Tự động gán học sinh vào student_stop_suggestions sau khi thêm stops (giống như tạo thủ công)
    try {
      const RouteService = (await import("./RouteService.js")).default;
      const routeStops = await RouteStopModel.getByRouteId(routeId);
      if (routeStops.length > 0) {
        console.log(`[RouteFromOptimization] Assigning students to ${routeStops.length} stops for return route ${routeId}...`);
        
        // Verify stops có tọa độ hợp lệ
        const validStops = routeStops.filter(s => s.viDo && s.kinhDo && !isNaN(s.viDo) && !isNaN(s.kinhDo));
        if (validStops.length !== routeStops.length) {
          console.warn(`[RouteFromOptimization] ⚠️ Some stops missing coordinates: ${routeStops.length - validStops.length} stops without valid coordinates`);
        }
        
        if (validStops.length > 0) {
          const assignedCount = await RouteService.assignStudentsToStops(routeId, validStops);
          console.log(`[RouteFromOptimization] ✅ Auto-assigned ${assignedCount} students to return route ${routeId} stops (${validStops.length} valid stops)`);
          
          if (assignedCount === 0) {
            console.warn(`[RouteFromOptimization] ⚠️ No students assigned to return route ${routeId}. Possible reasons:`);
            console.warn(`[RouteFromOptimization]   1. No students within 2km of any stop`);
            console.warn(`[RouteFromOptimization]   2. Students don't have valid coordinates`);
            console.warn(`[RouteFromOptimization]   3. Students are not active (trangThai = false)`);
          }
        } else {
          console.warn(`[RouteFromOptimization] ⚠️ No valid stops with coordinates for return route ${routeId}, skipping student assignment`);
        }
      } else {
        console.warn(`[RouteFromOptimization] ⚠️ Return route ${routeId} has no stops, skipping student assignment`);
      }
    } catch (assignError) {
      console.error(`[RouteFromOptimization] ❌ Failed to auto-assign students to return route ${routeId}:`, assignError);
      console.error(`[RouteFromOptimization] Error stack:`, assignError.stack);
      // Không throw error - route đã được tạo thành công
    }

    return {
      maTuyen: routeId,
      tenTuyen,
      diemBatDau: origin.name || "Đại học Sài Gòn", // Trường SGU
      diemKetThuc: destination.name, // Điểm xa nhất
      thoiGianUocTinh: estimatedTime,
      stopCount: stops.length,
      totalDemand: vrpRoute.totalDemand || 0,
      stops,
    };
  }

  /**
   * Tạo tên tuyến unique (tránh duplicate)
   * Nếu tên đã tồn tại, thêm số thứ tự vào cuối
   * @param {string} baseName - Tên tuyến cơ bản
   * @param {Set<string>} createdRouteNames - Set các tên tuyến đã tạo trong session này (optional)
   */
  static async generateUniqueRouteName(baseName, createdRouteNames = null) {
    let uniqueName = baseName;
    let counter = 1;
    const maxAttempts = 100; // Prevent infinite loop
    let attempts = 0;
    
    // Log để debug
    console.log(`[RouteFromOptimization] Generating unique name for: "${baseName}"`);
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Kiểm tra trong session hiện tại trước (nếu có)
      if (createdRouteNames && createdRouteNames.has(uniqueName)) {
        console.log(`[RouteFromOptimization] Name "${uniqueName}" already used in this session, generating new name...`);
      } else {
        // Kiểm tra trong database
        const existing = await TuyenDuongModel.getByName(uniqueName);
        if (!existing) {
          // Tên chưa tồn tại, có thể dùng
          if (counter > 1) {
            console.log(`[RouteFromOptimization] ⚠️ Generated unique route name: ${uniqueName} (original: ${baseName}) - Name was already taken`);
          } else {
            console.log(`[RouteFromOptimization] ✅ Using original name: ${uniqueName}`);
          }
          return uniqueName;
        } else {
          console.log(`[RouteFromOptimization] Name "${uniqueName}" already exists in database (ID: ${existing.maTuyen}), generating new name...`);
        }
      }
      
      // Tên đã tồn tại, thêm số thứ tự
      counter++;
      
      // Xử lý các format khác nhau
      if (baseName.endsWith(')')) {
        // Format: "Tuyến Tối Ưu 1 (Về)" -> "Tuyến Tối Ưu 1 (Về 2)"
        const match = baseName.match(/^(.+?)\s*\(([^)]+)\)$/);
        if (match) {
          uniqueName = `${match[1]} (${match[2]} ${counter})`;
        } else {
          uniqueName = `${baseName} ${counter}`;
        }
      } else if (baseName.includes(' - Đi')) {
        // Format: "Tuyến Tối Ưu 1 - Đi" -> "Tuyến Tối Ưu 1 - Đi 2"
        uniqueName = `${baseName} ${counter}`;
      } else {
        // Format khác: thêm số vào cuối
        uniqueName = `${baseName} ${counter}`;
      }
    }
    
    // Fallback: nếu vẫn không tìm được tên unique sau maxAttempts lần
    console.error(`[RouteFromOptimization] ⚠️ Could not generate unique name after ${maxAttempts} attempts, using: ${uniqueName}`);
    return uniqueName;
  }

  /**
   * Tìm các tuyến cũ từ optimization với cùng prefix
   * @param {string} routeNamePrefix - Prefix của tên tuyến (ví dụ: "Tuyến Tối Ưu")
   * @returns {Promise<Array>} Danh sách tuyến cũ với thông tin schedule count
   */
  static async findOldOptimizationRoutes(routeNamePrefix) {
    const query = `
      SELECT 
        td.maTuyen,
        td.tenTuyen,
        td.ngayTao,
        td.routeType,
        td.pairedRouteId,
        COUNT(DISTINCT lt.maLichTrinh) as scheduleCount
      FROM TuyenDuong td
      LEFT JOIN LichTrinh lt ON td.maTuyen = lt.maTuyen
      WHERE td.tenTuyen LIKE ?
        AND td.trangThai = TRUE
      GROUP BY td.maTuyen
      ORDER BY td.ngayTao DESC
    `;
    
    const [routes] = await pool.query(query, [`${routeNamePrefix}%`]);
    
    // Convert MySQL TINYINT to boolean and format dates
    return routes.map(route => ({
      maTuyen: route.maTuyen,
      tenTuyen: route.tenTuyen,
      ngayTao: route.ngayTao ? new Date(route.ngayTao).toISOString() : null,
      routeType: route.routeType,
      pairedRouteId: route.pairedRouteId,
      scheduleCount: parseInt(route.scheduleCount) || 0,
    }));
  }

  /**
   * Phân loại tuyến cũ thành có thể xóa và không thể xóa
   * @param {Array} oldRoutes - Danh sách tuyến cũ từ findOldOptimizationRoutes
   * @returns {Object} { canDelete: [], cannotDelete: [] }
   */
  static categorizeOldRoutes(oldRoutes) {
    const canDelete = [];
    const cannotDelete = [];
    const processedRouteIds = new Set(); // Track processed routes to avoid duplicates
    
    for (const route of oldRoutes) {
      // Skip if already processed (could be paired route)
      if (processedRouteIds.has(route.maTuyen)) {
        continue;
      }
      
      // Mark as processed
      processedRouteIds.add(route.maTuyen);
      
      // Check if route has schedules
      if (route.scheduleCount > 0) {
        cannotDelete.push(route);
      } else {
        canDelete.push(route);
        
        // If route has paired route, also add it to canDelete (if not already processed)
        if (route.pairedRouteId && !processedRouteIds.has(route.pairedRouteId)) {
          const pairedRoute = oldRoutes.find(r => r.maTuyen === route.pairedRouteId);
          if (pairedRoute && pairedRoute.scheduleCount === 0) {
            canDelete.push(pairedRoute);
            processedRouteIds.add(pairedRoute.maTuyen);
          }
        }
      }
    }
    
    return { canDelete, cannotDelete };
  }

  /**
   * Tìm và phân loại tuyến cũ, có thể tự động xóa nếu được yêu cầu
   * @param {string} routeNamePrefix - Prefix của tên tuyến
   * @param {Object} options - { autoDelete: boolean }
   * @returns {Promise<Object>} { canDelete: [], cannotDelete: [], action: 'show_dialog' | 'deleted' | 'none' }
   */
  static async findAndCleanOldRoutes(routeNamePrefix, options = {}) {
    const { autoDelete = false } = options;
    
    // Tìm tuyến cũ
    const oldRoutes = await this.findOldOptimizationRoutes(routeNamePrefix);
    
    if (oldRoutes.length === 0) {
      console.log(`[RouteFromOptimization] No old routes found with prefix "${routeNamePrefix}"`);
      return { canDelete: [], cannotDelete: [], action: 'none' };
    }
    
    console.log(`[RouteFromOptimization] Found ${oldRoutes.length} old routes with prefix "${routeNamePrefix}"`);
    
    // Phân loại
    const categorized = this.categorizeOldRoutes(oldRoutes);
    
    console.log(`[RouteFromOptimization] Categorized: ${categorized.canDelete.length} can delete, ${categorized.cannotDelete.length} cannot delete`);
    
    // Nếu autoDelete và có tuyến có thể xóa
    if (autoDelete && categorized.canDelete.length > 0) {
      // Xóa các tuyến không có schedule
      let deletedCount = 0;
      for (const route of categorized.canDelete) {
        try {
          // Xóa tuyến về trước (nếu có), sau đó xóa tuyến đi (tránh foreign key constraint)
          if (route.routeType === 've') {
            await TuyenDuongModel.hardDelete(route.maTuyen);
            deletedCount++;
            console.log(`[RouteFromOptimization] Deleted return route: ${route.tenTuyen} (ID: ${route.maTuyen})`);
          }
        } catch (error) {
          console.error(`[RouteFromOptimization] Error deleting route ${route.maTuyen}:`, error);
        }
      }
      
      // Xóa tuyến đi sau
      for (const route of categorized.canDelete) {
        try {
          if (route.routeType === 'di' || !route.routeType) {
            await TuyenDuongModel.hardDelete(route.maTuyen);
            deletedCount++;
            console.log(`[RouteFromOptimization] Deleted route: ${route.tenTuyen} (ID: ${route.maTuyen})`);
          }
        } catch (error) {
          console.error(`[RouteFromOptimization] Error deleting route ${route.maTuyen}:`, error);
        }
      }
      
      return {
        canDelete: categorized.canDelete,
        cannotDelete: categorized.cannotDelete,
        action: 'deleted',
        deletedCount,
      };
    }
    
    // Trả về thông tin để hiển thị dialog
    return {
      canDelete: categorized.canDelete,
      cannotDelete: categorized.cannotDelete,
      action: 'show_dialog',
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

