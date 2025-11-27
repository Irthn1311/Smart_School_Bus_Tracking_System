import pool from "../config/db.js";
import HocSinhModel from "../models/HocSinhModel.js";
import DiemDungModel from "../models/DiemDungModel.js";
import MapsService from "./MapsService.js";
import BusStopOptimizationService from "./BusStopOptimizationService.js";
import StopSuggestionService from "./StopSuggestionService.js";

/**
 * Service Clustering-First Bus Routing
 * 
 * Thay thế Sweep Algorithm bằng phương pháp:
 * 1. K-Means Clustering: Phân cụm học sinh theo địa lý
 * 2. Local Greedy Maximum Coverage: Chọn điểm dừng trong từng cụm
 * 3. TSP Routing: Định tuyến trong từng cụm
 */
class ClusteringRoutingService {
  /**
   * Tính khoảng cách giữa 2 điểm (mét) - wrapper cho Haversine
   */
  static calculateDistanceMeters(lat1, lng1, lat2, lng2) {
    const distanceKm = StopSuggestionService.calculateDistance(lat1, lng1, lat2, lng2);
    return distanceKm * 1000; // Convert to meters
  }

  /**
   * K-Means Clustering với Size Constraints
   * @param {Array} students - Danh sách học sinh [{maHocSinh, viDo, kinhDo, ...}]
   * @param {Number} K - Số lượng clusters (số xe)
   * @param {Number} capacity - Sức chứa tối đa mỗi cluster (số học sinh)
   * @param {Number} maxIterations - Số lần lặp tối đa (default: 100)
   * @returns {Array} Clusters - Mỗi cluster là mảng học sinh
   */
  static clusterStudents(students, K, capacity, maxIterations = 100) {
    if (students.length === 0) {
      return [];
    }

    if (K <= 0) {
      K = Math.ceil(students.length / capacity);
    }

    console.log(`[ClusteringRouting] Starting K-Means clustering: ${students.length} students, K=${K}, capacity=${capacity}`);

    // Khởi tạo centroids ngẫu nhiên
    const centroids = this._initializeCentroids(students, K);
    let clusters = null;
    let iterations = 0;

    // Lặp cho đến khi hội tụ
    while (iterations < maxIterations) {
      // Gán mỗi học sinh vào cluster gần nhất
      clusters = this._assignToClusters(students, centroids, K);

      // Cập nhật centroids
      const newCentroids = this._updateCentroids(clusters);

      // Kiểm tra hội tụ (centroids không thay đổi đáng kể)
      const converged = this._checkConvergence(centroids, newCentroids, 0.0001);
      if (converged) {
        console.log(`[ClusteringRouting] K-Means converged after ${iterations} iterations`);
        break;
      }

      centroids.splice(0, centroids.length, ...newCentroids);
      iterations++;
    }

    // Rebalance clusters để đảm bảo size constraints
    clusters = this._rebalanceClusters(clusters, capacity);

    // Log thống kê
    console.log(`[ClusteringRouting] Clustering completed: ${clusters.length} clusters`);
    clusters.forEach((cluster, idx) => {
      console.log(`[ClusteringRouting] Cluster ${idx + 1}: ${cluster.length} students`);
    });

    return clusters;
  }

  /**
   * Khởi tạo centroids ngẫu nhiên
   * @private
   */
  static _initializeCentroids(students, K) {
    if (students.length === 0) return [];

    // Tìm bounding box
    const lats = students.map((s) => parseFloat(s.viDo)).filter((v) => !isNaN(v));
    const lngs = students.map((s) => parseFloat(s.kinhDo)).filter((v) => !isNaN(v));

    if (lats.length === 0 || lngs.length === 0) {
      throw new Error("No valid coordinates found in students");
    }

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Chọn K điểm ngẫu nhiên trong bounding box
    const centroids = [];
    for (let i = 0; i < K; i++) {
      centroids.push({
        lat: minLat + Math.random() * (maxLat - minLat),
        lng: minLng + Math.random() * (maxLng - minLng),
      });
    }

    return centroids;
  }

  /**
   * Gán mỗi học sinh vào cluster gần nhất
   * @private
   */
  static _assignToClusters(students, centroids, K) {
    const clusters = Array(K)
      .fill(null)
      .map(() => []);

    for (const student of students) {
      const lat = parseFloat(student.viDo);
      const lng = parseFloat(student.kinhDo);

      if (isNaN(lat) || isNaN(lng)) {
        console.warn(`[ClusteringRouting] Skipping student ${student.maHocSinh} with invalid coordinates`);
        continue;
      }

      // Tìm centroid gần nhất
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < centroids.length; i++) {
        const distance = this.calculateDistanceMeters(
          lat,
          lng,
          centroids[i].lat,
          centroids[i].lng
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }

      clusters[nearestIndex].push(student);
    }

    return clusters;
  }

  /**
   * Cập nhật centroids dựa trên clusters hiện tại
   * @private
   */
  static _updateCentroids(clusters) {
    const centroids = [];

    for (const cluster of clusters) {
      if (cluster.length === 0) {
        // Nếu cluster rỗng, giữ nguyên centroid cũ hoặc tạo mới
        continue;
      }

      // Tính centroid (trung bình tọa độ)
      const sumLat = cluster.reduce((sum, s) => sum + parseFloat(s.viDo), 0);
      const sumLng = cluster.reduce((sum, s) => sum + parseFloat(s.kinhDo), 0);

      centroids.push({
        lat: sumLat / cluster.length,
        lng: sumLng / cluster.length,
      });
    }

    return centroids;
  }

  /**
   * Kiểm tra hội tụ (centroids không thay đổi đáng kể)
   * @private
   */
  static _checkConvergence(oldCentroids, newCentroids, threshold) {
    if (oldCentroids.length !== newCentroids.length) return false;

    for (let i = 0; i < oldCentroids.length; i++) {
      const distance = this.calculateDistanceMeters(
        oldCentroids[i].lat,
        oldCentroids[i].lng,
        newCentroids[i].lat,
        newCentroids[i].lng
      );

      if (distance > threshold * 1000) {
        // threshold in km, convert to meters
        return false;
      }
    }

    return true;
  }

  /**
   * Rebalance clusters để đảm bảo size constraints
   * Di chuyển học sinh từ cluster lớn sang cluster nhỏ
   * @private
   */
  static _rebalanceClusters(clusters, capacity) {
    let changed = true;
    let iterations = 0;
    const maxRebalanceIterations = 50;

    while (changed && iterations < maxRebalanceIterations) {
      changed = false;
      iterations++;

      // Tìm cluster lớn nhất và nhỏ nhất
      const clusterSizes = clusters.map((c, idx) => ({ size: c.length, index: idx }));
      clusterSizes.sort((a, b) => b.size - a.size);

      const largestCluster = clusterSizes[0];
      const smallestCluster = clusterSizes[clusterSizes.length - 1];

      // Nếu cluster lớn nhất vượt quá capacity, di chuyển học sinh
      if (largestCluster.size > capacity) {
        const excess = largestCluster.size - capacity;
        const sourceCluster = clusters[largestCluster.index];
        const targetCluster = clusters[smallestCluster.index];

        // Di chuyển học sinh xa centroid nhất từ cluster lớn sang cluster nhỏ
        const studentsToMove = this._selectStudentsToMove(
          sourceCluster,
          targetCluster,
          excess
        );

        for (const student of studentsToMove) {
          const index = sourceCluster.indexOf(student);
          if (index > -1) {
            sourceCluster.splice(index, 1);
            targetCluster.push(student);
            changed = true;
          }
        }
      }
    }

    // Loại bỏ clusters rỗng
    return clusters.filter((c) => c.length > 0);
  }

  /**
   * Chọn học sinh để di chuyển từ cluster lớn sang cluster nhỏ
   * Chọn những học sinh gần với target cluster hơn
   * @private
   */
  static _selectStudentsToMove(sourceCluster, targetCluster, count) {
    if (sourceCluster.length === 0) return [];

    // Tính centroid của target cluster
    const targetCentroid = {
      lat:
        targetCluster.length > 0
          ? targetCluster.reduce((sum, s) => sum + parseFloat(s.viDo), 0) /
            targetCluster.length
          : 0,
      lng:
        targetCluster.length > 0
          ? targetCluster.reduce((sum, s) => sum + parseFloat(s.kinhDo), 0) /
            targetCluster.length
          : 0,
    };

    // Tính centroid của source cluster
    const sourceCentroid = {
      lat:
        sourceCluster.reduce((sum, s) => sum + parseFloat(s.viDo), 0) /
        sourceCluster.length,
      lng:
        sourceCluster.reduce((sum, s) => sum + parseFloat(s.kinhDo), 0) /
        sourceCluster.length,
    };

    // Tính khoảng cách từ mỗi học sinh đến cả 2 centroids
    const studentsWithDistance = sourceCluster.map((student) => {
      const lat = parseFloat(student.viDo);
      const lng = parseFloat(student.kinhDo);

      const distToTarget = this.calculateDistanceMeters(
        lat,
        lng,
        targetCentroid.lat,
        targetCentroid.lng
      );
      const distToSource = this.calculateDistanceMeters(
        lat,
        lng,
        sourceCentroid.lat,
        sourceCentroid.lng
      );

      return {
        student,
        score: distToTarget - distToSource, // Học sinh gần target hơn sẽ có score âm
      };
    });

    // Sắp xếp theo score (chọn những học sinh gần target hơn)
    studentsWithDistance.sort((a, b) => a.score - b.score);

    // Chọn count học sinh đầu tiên
    return studentsWithDistance
      .slice(0, Math.min(count, studentsWithDistance.length))
      .map((item) => item.student);
  }

  /**
   * Local Greedy Maximum Coverage cho một cluster
   * Tương tự BusStopOptimizationService.greedyMaximumCoverage nhưng chỉ xét học sinh trong cluster
   * @param {Array} clusterStudents - Học sinh trong cluster
   * @param {Object} options - {R_walk, S_max, use_roads_api, use_places_api, school_location, max_distance_from_school}
   * @returns {Promise<Object>} {stops, assignments}
   */
  static async optimizeCluster(clusterStudents, options = {}) {
    const {
      R_walk = 500,
      S_max = 25,
      use_roads_api = false,
      use_places_api = false,
      school_location = null,
      max_distance_from_school = 15000,
    } = options;

    console.log(
      `[ClusteringRouting] Optimizing cluster: ${clusterStudents.length} students, R_walk=${R_walk}m, S_max=${S_max}`
    );

    if (clusterStudents.length === 0) {
      return {
        stops: [],
        assignments: [],
      };
    }

    // Tái sử dụng logic từ BusStopOptimizationService
    const result = await BusStopOptimizationService.greedyMaximumCoverage({
      students: clusterStudents,
      R_walk,
      S_max,
      MAX_STOPS: null, // Không giới hạn số điểm dừng trong cluster
      use_roads_api,
      use_places_api,
      school_location,
      max_distance_from_school,
    });

    return {
      stops: result.stops,
      assignments: result.assignments,
    };
  }

  /**
   * TSP Routing cho một cluster (Nearest Neighbor heuristic)
   * @param {Array} stops - Danh sách điểm dừng trong cluster [{maDiem, tenDiem, viDo, kinhDo, ...}]
   * @param {Object} depot - {lat, lng} - Điểm xuất phát và kết thúc (trường học)
   * @returns {Array} Route - Thứ tự điểm dừng đã được sắp xếp tối ưu
   */
  static routeCluster(stops, depot) {
    if (stops.length === 0) {
      return [];
    }

    if (stops.length === 1) {
      return [...stops];
    }

    console.log(
      `[ClusteringRouting] Routing cluster: ${stops.length} stops, depot=(${depot.lat}, ${depot.lng})`
    );

    // Nearest Neighbor heuristic
    const route = [];
    const unvisited = [...stops];
    let current = depot;

    while (unvisited.length > 0) {
      let nearest = null;
      let nearestDistance = Infinity;
      let nearestIndex = -1;

      for (let i = 0; i < unvisited.length; i++) {
        const stop = unvisited[i];
        const distance = this.calculateDistanceMeters(
          current.lat,
          current.lng,
          parseFloat(stop.viDo),
          parseFloat(stop.kinhDo)
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = stop;
          nearestIndex = i;
        }
      }

      if (nearest) {
        route.push(nearest);
        unvisited.splice(nearestIndex, 1);
        current = {
          lat: parseFloat(nearest.viDo),
          lng: parseFloat(nearest.kinhDo),
        };
      } else {
        // Fallback: thêm tất cả còn lại
        route.push(...unvisited);
        break;
      }
    }

    return route;
  }

  /**
   * Main method: Giải bài toán Clustering-First VRP
   * @param {Object} options - {
   *   school_location: {lat, lng},
   *   r_walk: Number (mét, default: 500),
   *   s_max: Number (default: 25),
   *   c_bus: Number (default: 40),
   *   use_roads_api: Boolean (default: false),
   *   use_places_api: Boolean (default: false),
   *   max_distance_from_school: Number (mét, default: 15000)
   * }
   * @returns {Promise<Object>} {routes, stats, tier1, tier2}
   */
  static async solveClusteringVRP(options = {}) {
    const {
      school_location = { lat: 10.77653, lng: 106.700981 }, // Đại học Sài Gòn
      r_walk = 500,
      s_max = 25,
      c_bus = 40,
      use_roads_api = false,
      use_places_api = false,
      max_distance_from_school = 15000,
    } = options;

    console.log(`[ClusteringRouting] Starting Clustering-First VRP`);
    console.log(
      `[ClusteringRouting] Parameters: r_walk=${r_walk}m, s_max=${s_max}, c_bus=${c_bus}, school_location=(${school_location.lat}, ${school_location.lng})`
    );

    // Bước 1: Lấy tất cả học sinh có tọa độ
    const allStudents = await BusStopOptimizationService.getStudentsWithCoordinates();
    console.log(`[ClusteringRouting] Found ${allStudents.length} students with coordinates`);

    if (allStudents.length === 0) {
      return {
        routes: [],
        stats: {
          totalStops: 0,
          totalNodes: 0,
          totalStudents: 0,
          totalRoutes: 0,
          totalDistance: "0.00",
          averageStopsPerRoute: "0.00",
          averageStudentsPerRoute: "0.00",
        },
        tier1: {
          stops: [],
          assignments: [],
          stats: {
            totalStudents: 0,
            assignedStudents: 0,
            totalStops: 0,
            averageStudentsPerStop: "0.00",
            maxWalkDistance: 0,
          },
        },
        tier2: {
          routes: [],
          stats: {
            totalStops: 0,
            totalNodes: 0,
            totalStudents: 0,
            totalRoutes: 0,
            totalDistance: "0.00",
            averageStopsPerRoute: "0.00",
            averageStudentsPerRoute: "0.00",
          },
        },
      };
    }

    // Bước 2: K-Means Clustering
    const K = Math.ceil(allStudents.length / c_bus);
    const clusters = this.clusterStudents(allStudents, K, c_bus);
    console.log(`[ClusteringRouting] Created ${clusters.length} clusters`);

    // Bước 3: Tối ưu điểm dừng cho từng cluster
    const allStops = [];
    const allAssignments = [];
    const clusterRoutes = [];

    for (let clusterIdx = 0; clusterIdx < clusters.length; clusterIdx++) {
      const cluster = clusters[clusterIdx];
      console.log(
        `[ClusteringRouting] Processing cluster ${clusterIdx + 1}/${clusters.length} (${cluster.length} students)`
      );

      // Chạy Local Greedy Maximum Coverage
      const clusterResult = await this.optimizeCluster(cluster, {
        R_walk: r_walk,
        S_max: s_max,
        use_roads_api,
        use_places_api,
        school_location,
        max_distance_from_school,
      });

      if (clusterResult.stops.length === 0) {
        console.warn(
          `[ClusteringRouting] Cluster ${clusterIdx + 1} has no stops created`
        );
        continue;
      }

      // Bước 4: TSP Routing cho cluster
      const routedStops = this.routeCluster(clusterResult.stops, school_location);

      // Lưu kết quả
      allStops.push(...clusterResult.stops);
      allAssignments.push(...clusterResult.assignments);

      // Tính tổng demand (số học sinh) trong cluster
      const totalDemand = clusterResult.assignments.length;

      // Tính khoảng cách ước tính
      let estimatedDistance = 0;
      if (routedStops.length > 0) {
        // Khoảng cách từ depot đến điểm dừng đầu tiên
        const firstStop = routedStops[0];
        estimatedDistance += this.calculateDistanceMeters(
          school_location.lat,
          school_location.lng,
          parseFloat(firstStop.viDo),
          parseFloat(firstStop.kinhDo)
        );

        // Khoảng cách giữa các điểm dừng
        for (let i = 0; i < routedStops.length - 1; i++) {
          const stop1 = routedStops[i];
          const stop2 = routedStops[i + 1];
          estimatedDistance += this.calculateDistanceMeters(
            parseFloat(stop1.viDo),
            parseFloat(stop1.kinhDo),
            parseFloat(stop2.viDo),
            parseFloat(stop2.kinhDo)
          );
        }

        // Khoảng cách từ điểm dừng cuối về depot
        const lastStop = routedStops[routedStops.length - 1];
        estimatedDistance += this.calculateDistanceMeters(
          parseFloat(lastStop.viDo),
          parseFloat(lastStop.kinhDo),
          school_location.lat,
          school_location.lng
        );
      }

      clusterRoutes.push({
        routeId: clusterIdx + 1,
        nodes: routedStops.map((stop) => ({
          maDiem: stop.maDiem,
          tenDiem: stop.tenDiem || `Điểm dừng ${stop.maDiem}`, // Đảm bảo tenDiem luôn có giá trị
          viDo: stop.viDo,
          kinhDo: stop.kinhDo,
          address: stop.address || null, // Thêm address để tương thích với RouteFromOptimizationService
          demand: clusterResult.assignments.filter(
            (a) => a.maDiemDung === stop.maDiem
          ).length,
        })),
        totalDemand: totalDemand,
        stopCount: routedStops.length,
        estimatedDistance: estimatedDistance / 1000, // Convert to km
      });
    }

    // Tính tổng khoảng cách
    const totalDistance = clusterRoutes.reduce(
      (sum, route) => sum + route.estimatedDistance,
      0
    );

    // Tính stats
    const stats = {
      totalStops: allStops.length,
      totalNodes: allStops.length,
      totalStudents: allAssignments.length,
      totalRoutes: clusterRoutes.length,
      totalDistance: totalDistance.toFixed(2),
      averageStopsPerRoute:
        clusterRoutes.length > 0
          ? (
              clusterRoutes.reduce((sum, r) => sum + r.stopCount, 0) /
              clusterRoutes.length
            ).toFixed(2)
          : "0.00",
      averageStudentsPerRoute:
        clusterRoutes.length > 0
          ? (
              clusterRoutes.reduce((sum, r) => sum + r.totalDemand, 0) /
              clusterRoutes.length
            ).toFixed(2)
          : "0.00",
    };

    console.log(
      `[ClusteringRouting] Completed: ${stats.totalRoutes} routes, ${stats.totalStudents} students, ${stats.totalStops} stops`
    );

    return {
      routes: clusterRoutes,
      stats,
      tier1: {
        stops: allStops,
        assignments: allAssignments,
        stats: {
          totalStudents: allStudents.length,
          assignedStudents: allAssignments.length,
          totalStops: allStops.length,
          averageStudentsPerStop:
            allStops.length > 0
              ? (allAssignments.length / allStops.length).toFixed(2)
              : "0.00",
          maxWalkDistance: Math.max(
            ...allAssignments.map((a) => a.khoangCachMet || 0),
            0
          ),
        },
      },
      tier2: {
        routes: clusterRoutes,
        stats,
      },
    };
  }
}

export default ClusteringRoutingService;

