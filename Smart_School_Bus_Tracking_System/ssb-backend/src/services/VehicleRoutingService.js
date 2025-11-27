import pool from "../config/db.js";
import DiemDungModel from "../models/DiemDungModel.js";
import MapsService from "./MapsService.js";
import BusStopOptimizationService from "./BusStopOptimizationService.js";
import StopSuggestionService from "./StopSuggestionService.js";

/**
 * Service Tầng 2 - Tối ưu tuyến xe buýt (Vehicle Routing Problem)
 * 
 * Sử dụng Sweep Algorithm:
 * 1. Chuyển tọa độ về hệ tương đối quanh depot (trường học)
 * 2. Tính góc angle = atan2(y, x) cho mỗi điểm dừng
 * 3. Sort điểm dừng theo angle
 * 4. Quét theo thứ tự và phân chia vào các route theo capacity
 * 5. Tối ưu thứ tự ghé trong mỗi route bằng nearest neighbour + 2-opt
 */
class VehicleRoutingService {
  /**
   * Chuyển tọa độ về hệ tương đối quanh depot
   * @param {Number} lat - Latitude
   * @param {Number} lng - Longitude
   * @param {Object} depot - {lat, lng}
   * @returns {Object} {x, y} - Tọa độ tương đối (km)
   */
  static toRelativeCoordinates(lat, lng, depot) {
    const R = 6371; // Earth radius in km
    const dLat = ((lat - depot.lat) * Math.PI) / 180;
    const dLng = ((lng - depot.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((depot.lat * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km

    // Calculate bearing
    const y = Math.sin(dLng) * Math.cos((lat * Math.PI) / 180);
    const x =
      Math.cos((depot.lat * Math.PI) / 180) * Math.sin((lat * Math.PI) / 180) -
      Math.sin((depot.lat * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.cos(dLng);
    const bearing = Math.atan2(y, x);

    return {
      x: distance * Math.cos(bearing),
      y: distance * Math.sin(bearing),
      distance,
      angle: bearing,
    };
  }

  /**
   * Lấy điểm dừng với demand (số học sinh)
   * @returns {Promise<Array>} [{maDiem, tenDiem, viDo, kinhDo, demand}]
   */
  static async getStopsWithDemand() {
    const [rows] = await pool.query(
      `SELECT 
        dd.maDiem,
        dd.tenDiem,
        dd.viDo,
        dd.kinhDo,
        dd.address,
        COUNT(hsd.maHocSinh) as demand
       FROM DiemDung dd
       LEFT JOIN HocSinh_DiemDung hsd ON dd.maDiem = hsd.maDiemDung
       GROUP BY dd.maDiem, dd.tenDiem, dd.viDo, dd.kinhDo, dd.address
       HAVING demand > 0
       ORDER BY demand DESC`
    );
    
    console.log(`[VehicleRouting] Found ${rows.length} stops with students assigned`);
    if (rows.length === 0) {
      console.warn(`[VehicleRouting] ⚠️ No stops with demand found. Make sure Tier 1 optimization has been run first.`);
    }
    
    return rows;
  }

  /**
   * Tách node ảo nếu điểm dừng có demand > capacity
   * @param {Array} stops - Danh sách điểm dừng với demand
   * @param {Number} capacity - Sức chứa xe buýt
   * @returns {Array} Danh sách nodes (có thể có node ảo)
   */
  static splitVirtualNodes(stops, capacity) {
    const nodes = [];

    for (const stop of stops) {
      const demand = stop.demand || 0;
      if (demand <= capacity) {
        // Không cần tách
        nodes.push({
          ...stop,
          isVirtual: false,
          virtualIndex: 0,
          originalStopId: stop.maDiem,
        });
      } else {
        // Tách thành nhiều node ảo
        const numNodes = Math.ceil(demand / capacity);
        const demandPerNode = Math.ceil(demand / numNodes);

        for (let i = 0; i < numNodes; i++) {
          const nodeDemand = i === numNodes - 1
            ? demand - (demandPerNode * (numNodes - 1)) // Node cuối lấy phần còn lại
            : demandPerNode;

          nodes.push({
            ...stop,
            maDiem: `${stop.maDiem}_v${i}`, // Virtual ID
            demand: nodeDemand,
            isVirtual: true,
            virtualIndex: i,
            originalStopId: stop.maDiem,
          });
        }
      }
    }

    return nodes;
  }

  /**
   * Sweep Algorithm - Phân chia điểm dừng vào các route
   * @param {Array} nodes - Danh sách nodes (có thể có node ảo)
   * @param {Object} depot - {lat, lng}
   * @param {Number} capacity - Sức chứa xe buýt
   * @returns {Array} Routes - Mỗi route là một mảng nodes
   */
  static sweepAlgorithm(nodes, depot, capacity) {
    // Tính góc và sort
    const nodesWithAngle = nodes.map((node) => {
      const rel = this.toRelativeCoordinates(node.viDo, node.kinhDo, depot);
      return {
        ...node,
        angle: rel.angle,
        distance: rel.distance,
      };
    });

    // Sort theo angle (từ 0 đến 2π)
    nodesWithAngle.sort((a, b) => {
      // Normalize angles to [0, 2π]
      const angleA = a.angle < 0 ? a.angle + 2 * Math.PI : a.angle;
      const angleB = b.angle < 0 ? b.angle + 2 * Math.PI : b.angle;
      return angleA - angleB;
    });

    // Quét và phân chia vào routes
    const routes = [];
    let currentRoute = [];
    let currentDemand = 0;

    for (const node of nodesWithAngle) {
      const nodeDemand = node.demand || 0;

      if (currentDemand + nodeDemand <= capacity) {
        // Thêm vào route hiện tại
        currentRoute.push(node);
        currentDemand += nodeDemand;
      } else {
        // Bắt đầu route mới
        if (currentRoute.length > 0) {
          routes.push({
            nodes: currentRoute,
            totalDemand: currentDemand,
          });
        }
        currentRoute = [node];
        currentDemand = nodeDemand;
      }
    }

    // Thêm route cuối cùng
    if (currentRoute.length > 0) {
      routes.push({
        nodes: currentRoute,
        totalDemand: currentDemand,
      });
    }

    return routes;
  }

  /**
   * Tối ưu thứ tự ghé trong route bằng Nearest Neighbour
   * @param {Array} nodes - Danh sách nodes trong route
   * @param {Object} depot - {lat, lng}
   * @returns {Promise<Array>} Nodes đã được sắp xếp tối ưu
   */
  static async optimizeRouteOrder(nodes, depot) {
    if (nodes.length <= 1) return nodes;

    // Nếu chỉ có 1-2 nodes, không cần optimize
    if (nodes.length <= 2) {
      return nodes;
    }

    try {
      // Sử dụng Distance Matrix API để tính khoảng cách
      const origins = [depot, ...nodes.map((n) => ({ lat: n.viDo, lng: n.kinhDo }))];
      const destinations = [...nodes.map((n) => ({ lat: n.viDo, lng: n.kinhDo })), depot];

      const distanceMatrix = await MapsService.getDistanceMatrix({
        origins: origins.map((o) => `${o.lat},${o.lng}`),
        destinations: destinations.map((d) => `${d.lat},${d.lng}`),
        mode: "driving",
      });

      // Build distance map
      const distances = new Map();
      if (distanceMatrix.rows && distanceMatrix.rows.length > 0) {
        for (let i = 0; i < distanceMatrix.rows.length; i++) {
          const row = distanceMatrix.rows[i];
          if (row.elements) {
            for (let j = 0; j < row.elements.length; j++) {
              const element = row.elements[j];
              const key = `${i}-${j}`;
              distances.set(key, element.distance?.value || Infinity);
            }
          }
        }
      }

      // Nearest Neighbour heuristic
      const unvisited = [...nodes];
      const route = [];
      let current = null; // Start from depot (index 0)

      while (unvisited.length > 0) {
        let nearest = null;
        let nearestDistance = Infinity;
        let nearestIndex = -1;

        for (let i = 0; i < unvisited.length; i++) {
          const node = unvisited[i];
          const nodeIndex = nodes.indexOf(node) + 1; // +1 because depot is index 0
          const distance = current === null
            ? distances.get(`0-${nodeIndex}`) || Infinity
            : distances.get(`${current + 1}-${nodeIndex}`) || Infinity;

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = node;
            nearestIndex = i;
          }
        }

        if (nearest) {
          route.push(nearest);
          unvisited.splice(nearestIndex, 1);
          current = nodes.indexOf(nearest);
        } else {
          // Fallback: add remaining nodes in order
          route.push(...unvisited);
          break;
        }
      }

      return route;
    } catch (error) {
      console.warn(`[VehicleRouting] Failed to optimize route order: ${error.message}, using original order`);
      return nodes;
    }
  }

  /**
   * Giải VRP và trả về các routes tối ưu
   * @param {Object} options - {
   *   depot: {lat, lng} (optional, default: SGU),
   *   capacity: Number (default: 40),
   *   splitVirtualNodes: Boolean (default: true)
   * }
   * @returns {Promise<Object>} {routes, stats}
   */
  static async solveVRP(options = {}) {
    const {
      depot = { lat: 10.77653, lng: 106.700981 }, // Đại học Sài Gòn
      capacity = 40,
      splitVirtualNodes: shouldSplit = true,
    } = options;

    console.log(`[VehicleRouting] Starting VRP solver`);
    console.log(`[VehicleRouting] Parameters: capacity=${capacity}, depot=(${depot.lat}, ${depot.lng})`);

    // Lấy điểm dừng với demand
    const stops = await this.getStopsWithDemand();
    console.log(`[VehicleRouting] Found ${stops.length} stops with students`);

    if (stops.length === 0) {
      return {
        routes: [],
        stats: {
          totalStops: 0,
          totalStudents: 0,
          totalRoutes: 0,
          totalDistance: 0,
        },
      };
    }

    // Tách node ảo nếu cần
    let nodes = stops;
    if (shouldSplit) {
      nodes = this.splitVirtualNodes(stops, capacity);
      console.log(`[VehicleRouting] Split into ${nodes.length} nodes (including virtual)`);
    }

    // Sweep Algorithm
    const routes = this.sweepAlgorithm(nodes, depot, capacity);
    console.log(`[VehicleRouting] Created ${routes.length} routes using Sweep Algorithm`);

    // Tối ưu thứ tự ghé trong mỗi route
    const optimizedRoutes = [];
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      console.log(`[VehicleRouting] Optimizing route ${i + 1}/${routes.length} (${route.nodes.length} stops)`);
      
      const optimizedNodes = await this.optimizeRouteOrder(route.nodes, depot);
      optimizedRoutes.push({
        routeId: i + 1,
        nodes: optimizedNodes,
        totalDemand: route.totalDemand,
        stopCount: optimizedNodes.length,
      });
    }

    // Tính tổng khoảng cách (ước tính)
    let totalDistance = 0;
    for (const route of optimizedRoutes) {
      if (route.nodes.length > 0) {
        // Tính khoảng cách từ depot đến node đầu tiên
        const firstNode = route.nodes[0];
        const distToFirst = StopSuggestionService.calculateDistance(
          depot.lat,
          depot.lng,
          firstNode.viDo,
          firstNode.kinhDo
        );

        // Tính khoảng cách giữa các nodes
        let routeDistance = distToFirst;
        for (let i = 0; i < route.nodes.length - 1; i++) {
          const node1 = route.nodes[i];
          const node2 = route.nodes[i + 1];
          routeDistance += StopSuggestionService.calculateDistance(
            node1.viDo,
            node1.kinhDo,
            node2.viDo,
            node2.kinhDo
          );
        }

        // Tính khoảng cách từ node cuối về depot
        const lastNode = route.nodes[route.nodes.length - 1];
        const distFromLast = StopSuggestionService.calculateDistance(
          lastNode.viDo,
          lastNode.kinhDo,
          depot.lat,
          depot.lng
        );
        routeDistance += distFromLast;

        route.estimatedDistance = routeDistance;
        totalDistance += routeDistance;
      }
    }

    const stats = {
      totalStops: stops.length,
      totalNodes: nodes.length,
      totalStudents: stops.reduce((sum, s) => sum + (s.demand || 0), 0),
      totalRoutes: optimizedRoutes.length,
      totalDistance: totalDistance.toFixed(2),
      averageStopsPerRoute: optimizedRoutes.length > 0
        ? (optimizedRoutes.reduce((sum, r) => sum + r.stopCount, 0) / optimizedRoutes.length).toFixed(2)
        : 0,
      averageStudentsPerRoute: optimizedRoutes.length > 0
        ? (optimizedRoutes.reduce((sum, r) => sum + r.totalDemand, 0) / optimizedRoutes.length).toFixed(2)
        : 0,
    };

    console.log(`[VehicleRouting] Completed: ${stats.totalRoutes} routes, ${stats.totalStudents} students`);

    return {
      routes: optimizedRoutes,
      stats,
    };
  }
}

export default VehicleRoutingService;

