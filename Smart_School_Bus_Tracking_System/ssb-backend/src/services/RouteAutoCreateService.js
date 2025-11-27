import TuyenDuongModel from "../models/TuyenDuongModel.js";
import DiemDungModel from "../models/DiemDungModel.js";
import RouteStopModel from "../models/RouteStopModel.js";
import HocSinhModel from "../models/HocSinhModel.js";
import StudentStopSuggestionModel from "../models/StudentStopSuggestionModel.js";
import MapsService from "./MapsService.js";
import StopSuggestionService from "./StopSuggestionService.js";
import GeoUtils from "../utils/GeoUtils.js";
import pool from "../config/db.js";

/**
 * RouteAutoCreateService - Service để tạo route tự động từ start → end
 * với auto suggestion điểm dừng và học sinh
 */
class RouteAutoCreateService {
  /**
   * Tạo route tự động từ start → end với auto suggestion
   * @param {Object} payload - {
   *   tenTuyen: string,
   *   startPoint: {lat, lng, name},
   *   endPoint: {lat, lng, name},
   *   options: {
   *     startRadiusKm: number (default: 2),
   *     corridorRadiusKm: number (default: 3),
   *     clusterRadiusKm: number (default: 0.4)
   *   }
   * }
   * @returns {Promise<Object>} Route với stops và suggestions
   */
  static async createAutoRoute(payload) {
    const {
      tenTuyen,
      startPoint,
      endPoint,
      options = {},
    } = payload;

    // Validate
    if (!tenTuyen || !startPoint || !endPoint) {
      throw new Error("MISSING_REQUIRED_FIELDS");
    }

    if (!startPoint.lat || !startPoint.lng || !endPoint.lat || !endPoint.lng) {
      throw new Error("INVALID_COORDINATES");
    }

    const {
      startRadiusKm = 2,
      corridorRadiusKm = 3,
      clusterRadiusKm = 0.4,
    } = options;

    // 🔥 TASK 5: Validate options
    const MAX_RADIUS_KM = 50; // Ngưỡng tối đa hợp lý
    const validationErrors = [];
    
    if (typeof startRadiusKm !== 'number' || startRadiusKm <= 0 || startRadiusKm > MAX_RADIUS_KM) {
      validationErrors.push(`startRadiusKm must be a number between 0 and ${MAX_RADIUS_KM}, got: ${startRadiusKm}`);
    }
    if (typeof corridorRadiusKm !== 'number' || corridorRadiusKm <= 0 || corridorRadiusKm > MAX_RADIUS_KM) {
      validationErrors.push(`corridorRadiusKm must be a number between 0 and ${MAX_RADIUS_KM}, got: ${corridorRadiusKm}`);
    }
    if (typeof clusterRadiusKm !== 'number' || clusterRadiusKm <= 0 || clusterRadiusKm > MAX_RADIUS_KM) {
      validationErrors.push(`clusterRadiusKm must be a number between 0 and ${MAX_RADIUS_KM}, got: ${clusterRadiusKm}`);
    }
    
    if (validationErrors.length > 0) {
      const error = new Error("INVALID_ROUTE_AUTO_CREATE_OPTIONS");
      error.validationErrors = validationErrors;
      throw error;
    }

    console.log(`[RouteAutoCreate] Creating route: ${tenTuyen}`);
    console.log(`[RouteAutoCreate] Start: ${startPoint.name} (${startPoint.lat}, ${startPoint.lng})`);
    console.log(`[RouteAutoCreate] End: ${endPoint.name} (${endPoint.lat}, ${endPoint.lng})`);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Lấy polyline từ start → end
      console.log(`[RouteAutoCreate] Step 1: Getting polyline from Google Directions API...`);
      const origin = `${startPoint.lat},${startPoint.lng}`;
      const destination = `${endPoint.lat},${endPoint.lng}`;
      
      let directionsResult;
      try {
        directionsResult = await MapsService.getDirections({
          origin,
          destination,
          mode: "driving",
          vehicleType: "bus",
        });
      } catch (directionsError) {
        console.error(`[RouteAutoCreate] Failed to get directions:`, directionsError);
        throw new Error(`DIRECTIONS_API_ERROR: ${directionsError.message}`);
      }

      const polyline = directionsResult.polyline;
      const polylinePoints = GeoUtils.decodePolyline(polyline);
      const estimatedTime = Math.round(directionsResult.duration / 60); // minutes

      console.log(`[RouteAutoCreate] ✅ Got polyline with ${polylinePoints.length} points, estimated time: ${estimatedTime} minutes`);

      // 2. Tạo route record
      console.log(`[RouteAutoCreate] Step 2: Creating route record...`);
      const routeId = await TuyenDuongModel.create({
        tenTuyen,
        diemBatDau: startPoint.name,
        diemKetThuc: endPoint.name,
        thoiGianUocTinh: estimatedTime,
        origin_lat: startPoint.lat,
        origin_lng: startPoint.lng,
        dest_lat: endPoint.lat,
        dest_lng: endPoint.lng,
        polyline,
        trangThai: true,
        routeType: 'di',
      });

      console.log(`[RouteAutoCreate] ✅ Created route ${routeId}`);

      // 3. Quét học sinh trong hành lang tuyến
      console.log(`[RouteAutoCreate] Step 3: Scanning students in corridor...`);
      const targetStudents = await this.scanStudentsInCorridor(
        startPoint,
        polylinePoints,
        startRadiusKm,
        corridorRadiusKm
      );

      console.log(`[RouteAutoCreate] ✅ Found ${targetStudents.length} students in corridor`);

      if (targetStudents.length === 0) {
        console.warn(`[RouteAutoCreate] ⚠️ No students found in corridor, creating route without stops`);
        await connection.commit();
        return {
          routeId,
          tenTuyen,
          stops: [],
          suggestions: [],
          message: "Route created but no students found in corridor",
        };
      }

      // 4. Clustering học sinh thành cụm
      console.log(`[RouteAutoCreate] Step 4: Clustering students (radius: ${clusterRadiusKm}km)...`);
      const clusters = StopSuggestionService.clusterStudents(targetStudents, clusterRadiusKm);
      console.log(`[RouteAutoCreate] ✅ Created ${clusters.length} clusters`);

      // 5. Snap clusters vào điểm dừng thực tế và tạo stops
      console.log(`[RouteAutoCreate] Step 5: Snapping clusters to roads and creating stops...`);
      const stops = await this.createStopsFromClusters(
        clusters,
        polylinePoints,
        connection
      );

      console.log(`[RouteAutoCreate] ✅ Created ${stops.length} stops`);

      // 6. Sắp xếp stops theo thứ tự trên polyline
      const sortedStops = this.sortStopsAlongPolyline(stops, polylinePoints);

      // 7. Lưu route_stops và student_stop_suggestions
      console.log(`[RouteAutoCreate] Step 6: Saving route_stops and suggestions...`);
      const suggestions = [];
      
      // Thêm stops vào route_stops sử dụng RouteStopModel
      for (let i = 0; i < sortedStops.length; i++) {
        const stop = sortedStops[i];
        const sequence = i + 1;

        // Kiểm tra stop có tồn tại không
        const existingStop = await DiemDungModel.getById(stop.maDiem);
        if (!existingStop) {
          console.warn(`[RouteAutoCreate] ⚠️ Stop ${stop.maDiem} not found, skipping`);
          continue;
        }

        // Sử dụng RouteStopModel.addStop() thay vì raw SQL
        try {
          await RouteStopModel.addStop(routeId, stop.maDiem, sequence, 30);
        } catch (stopError) {
          // Nếu đã tồn tại, update sequence
          if (stopError.message === "STOP_ALREADY_IN_ROUTE" || stopError.message === "SEQUENCE_ALREADY_EXISTS") {
            await RouteStopModel.updateStop(routeId, stop.maDiem, sequence, 30);
          } else {
            console.warn(`[RouteAutoCreate] Failed to add stop ${stop.maDiem} to route:`, stopError.message);
            continue;
          }
        }

        // Lưu suggestions
        if (stop.students && stop.students.length > 0) {
          const stopSuggestions = stop.students.map((student) => ({
            maTuyen: routeId,
            maDiemDung: stop.maDiem,
            maHocSinh: student.maHocSinh,
          }));

          await StudentStopSuggestionModel.bulkCreate(stopSuggestions);
          
          suggestions.push({
            sequence,
            maDiem: stop.maDiem,
            tenDiem: stop.tenDiem,
            students: stop.students.map((s) => ({
              maHocSinh: s.maHocSinh,
              hoTen: s.hoTen,
              lop: s.lop,
            })),
            studentCount: stop.students.length,
          });
        }
      }

      // 8. Thêm endPoint như điểm dừng cuối cùng (nếu chưa có)
      const endPointStopId = await this.findOrCreateStop(endPoint, connection);
      const endPointInStops = sortedStops.some(stop => {
        const dist = StopSuggestionService.calculateDistance(
          stop.viDo, stop.kinhDo, endPoint.lat, endPoint.lng
        );
        return dist < 0.01; // < 10m
      });

      if (!endPointInStops) {
        try {
          await RouteStopModel.addStop(routeId, endPointStopId, sortedStops.length + 1, 0);
          console.log(`[RouteAutoCreate] ✅ Added endPoint as final stop`);
        } catch (endPointError) {
          console.warn(`[RouteAutoCreate] Failed to add endPoint stop:`, endPointError.message);
        }
      }

      console.log(`[RouteAutoCreate] ✅ Saved ${suggestions.length} stop suggestions`);

      await connection.commit();

      return {
        routeId,
        tenTuyen,
        stops: sortedStops.map((s) => ({
          sequence: s.sequence,
          maDiem: s.maDiem,
          tenDiem: s.tenDiem,
          viDo: s.viDo,
          kinhDo: s.kinhDo,
          address: s.address,
          studentCount: s.students?.length || 0,
        })),
        suggestions,
        totalStudents: targetStudents.length,
        totalStops: sortedStops.length,
      };

    } catch (error) {
      await connection.rollback();
      console.error(`[RouteAutoCreate] Error:`, error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Quét học sinh trong hành lang tuyến
   * @param {Object} startPoint - {lat, lng, name}
   * @param {Array} polylinePoints - Mảng các điểm của polyline
   * @param {number} startRadiusKm - Bán kính quanh điểm bắt đầu
   * @param {number} corridorRadiusKm - Bán kính hành lang dọc theo tuyến
   * @returns {Promise<Array>} Danh sách học sinh trong hành lang
   */
  static async scanStudentsInCorridor(startPoint, polylinePoints, startRadiusKm, corridorRadiusKm) {
    // Lấy tất cả học sinh
    let allStudents = await HocSinhModel.getAll();
    
    // Filter học sinh đang hoạt động
    const activeStudents = allStudents.filter(s => s.trangThai);
    
    // Tách học sinh có tọa độ và chưa có tọa độ
    const studentsWithCoords = activeStudents.filter(
      (s) => s.viDo && s.kinhDo && !isNaN(s.viDo) && !isNaN(s.kinhDo)
    );
    
    const studentsWithoutCoords = activeStudents.filter(
      (s) => (!s.viDo || !s.kinhDo || isNaN(s.viDo) || isNaN(s.kinhDo)) && s.diaChi && s.diaChi.trim()
    );

    console.log(`[RouteAutoCreate] Found ${studentsWithCoords.length} students with coordinates`);
    
    // 🔥 Auto-geocode học sinh chưa có tọa độ (nếu có địa chỉ)
    if (studentsWithoutCoords.length > 0) {
      console.log(`[RouteAutoCreate] Auto-geocoding ${studentsWithoutCoords.length} students without coordinates...`);
      try {
        const enriched = await StopSuggestionService.enrichStudentCoordinates(studentsWithoutCoords, 2);
        
        // Update vào database và thêm vào danh sách có tọa độ
        const updatePromises = enriched
          .filter(s => s.viDo && s.kinhDo && !s.missingCoords)
          .map(async (student) => {
            try {
              await HocSinhModel.update(student.maHocSinh, {
                viDo: student.viDo,
                kinhDo: student.kinhDo,
              });
              // Thêm vào danh sách có tọa độ
              studentsWithCoords.push(student);
              return true;
            } catch (updateError) {
              console.warn(`[RouteAutoCreate] Failed to update coordinates for student ${student.maHocSinh}:`, updateError.message);
              return false;
            }
          });
        
        const updateResults = await Promise.all(updatePromises);
        const successCount = updateResults.filter(r => r === true).length;
        
        console.log(`[RouteAutoCreate] ✅ Geocoded and updated ${successCount} students`);
      } catch (geocodeError) {
        console.warn(`[RouteAutoCreate] ⚠️ Failed to geocode some students:`, geocodeError.message);
        // Continue với học sinh đã có tọa độ
      }
    }

    console.log(`[RouteAutoCreate] Scanning ${studentsWithCoords.length} students with coordinates...`);

    const targetStudents = [];

    for (const student of studentsWithCoords) {
      // Tính khoảng cách đến điểm bắt đầu
      const dStart = GeoUtils.distanceBetweenPoints(
        student.viDo,
        student.kinhDo,
        startPoint.lat,
        startPoint.lng
      );

      // Tính khoảng cách tối thiểu đến polyline
      const dCorridor = GeoUtils.minDistancePointToPolyline(
        student.viDo,
        student.kinhDo,
        polylinePoints
      );

      // Nếu học sinh nằm trong bán kính điểm bắt đầu HOẶC trong hành lang
      if (dStart <= startRadiusKm || dCorridor <= corridorRadiusKm) {
        targetStudents.push({
          ...student,
          distanceToStart: dStart,
          distanceToCorridor: dCorridor,
        });
      }
    }

    return targetStudents;
  }

  /**
   * Tạo stops từ clusters
   * @param {Array} clusters - Mảng các cluster học sinh
   * @param {Array} polylinePoints - Mảng các điểm của polyline
   * @param {Object} connection - Database connection
   * @returns {Promise<Array>} Danh sách stops với students
   */
  static async createStopsFromClusters(clusters, polylinePoints, connection) {
    const stops = [];

    for (const cluster of clusters) {
      if (cluster.length === 0) continue;

      // Tính centroid của cluster
      const centroid = StopSuggestionService.calculateClusterCenter(cluster);
      
      if (!centroid.lat || !centroid.lng) {
        console.warn(`[RouteAutoCreate] Cluster has no valid centroid, skipping`);
        continue;
      }

      // Snap centroid vào polyline (tìm điểm gần nhất trên polyline)
      const snappedPoint = this.snapToPolyline(centroid.lat, centroid.lng, polylinePoints);

      // Geocode để lấy địa chỉ
      let address = null;
      let tenDiem = null;
      
      try {
        const geocodeResult = await MapsService.reverseGeocode(
          `${snappedPoint.lat},${snappedPoint.lng}`
        );
        
        if (geocodeResult.results && geocodeResult.results.length > 0) {
          address = geocodeResult.results[0].formatted_address;
          // Extract tên đường từ địa chỉ
          tenDiem = this.extractStreetName(address) || address;
        }
      } catch (geocodeError) {
        console.warn(`[RouteAutoCreate] Geocode failed for (${snappedPoint.lat}, ${snappedPoint.lng}):`, geocodeError.message);
      }

      // Tạo tên điểm dừng
      if (!tenDiem) {
        tenDiem = `Điểm dừng ${snappedPoint.lat.toFixed(4)}, ${snappedPoint.lng.toFixed(4)}`;
      }

      // Thêm "Nhóm X học sinh" vào tên
      tenDiem = `${tenDiem} – Nhóm ${cluster.length} học sinh`;

      // Tìm hoặc tạo điểm dừng
      let stopId;
      const [existingStops] = await connection.query(
        `SELECT maDiem FROM DiemDung 
         WHERE ABS(viDo - ?) < 0.0001 
           AND ABS(kinhDo - ?) < 0.0001
         LIMIT 1`,
        [snappedPoint.lat, snappedPoint.lng]
      );

      if (existingStops.length > 0) {
        stopId = existingStops[0].maDiem;
        console.log(`[RouteAutoCreate] Found existing stop ${stopId} at (${snappedPoint.lat}, ${snappedPoint.lng})`);
      } else {
        const [stopResult] = await connection.query(
          `INSERT INTO DiemDung (tenDiem, viDo, kinhDo, address)
           VALUES (?, ?, ?, ?)`,
          [tenDiem, snappedPoint.lat, snappedPoint.lng, address]
        );
        stopId = stopResult.insertId;
        console.log(`[RouteAutoCreate] Created stop ${stopId}: ${tenDiem}`);
      }

      stops.push({
        maDiem: stopId,
        tenDiem,
        viDo: snappedPoint.lat,
        kinhDo: snappedPoint.lng,
        address,
        students: cluster,
      });
    }

    return stops;
  }

  /**
   * Snap một điểm vào polyline (tìm điểm gần nhất trên polyline)
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {Array} polylinePoints - Mảng các điểm của polyline
   * @returns {{lat: number, lng: number}} Điểm đã snap
   */
  static snapToPolyline(lat, lng, polylinePoints) {
    let minDistance = Infinity;
    let closestPoint = polylinePoints[0] || { lat, lng };

    for (let i = 0; i < polylinePoints.length - 1; i++) {
      const p1 = polylinePoints[i];
      const p2 = polylinePoints[i + 1];

      // Tính điểm gần nhất trên đoạn p1-p2
      const distance = GeoUtils.distancePointToSegment(
        lat, lng,
        p1.lat, p1.lng,
        p2.lat, p2.lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        
        // Tính tọa độ điểm gần nhất
        const dx = p2.lat - p1.lat;
        const dy = p2.lng - p1.lng;
        const dpx = lat - p1.lat;
        const dpy = lng - p1.lng;
        const dot = dpx * dx + dpy * dy;
        const lenSq = dx * dx + dy * dy;
        const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, dot / lenSq));
        
        closestPoint = {
          lat: p1.lat + t * dx,
          lng: p1.lng + t * dy,
        };
      }
    }

    return closestPoint;
  }

  /**
   * Sắp xếp stops theo thứ tự trên polyline
   * @param {Array} stops - Danh sách stops
   * @param {Array} polylinePoints - Mảng các điểm của polyline
   * @returns {Array} Stops đã sắp xếp với sequence
   */
  static sortStopsAlongPolyline(stops, polylinePoints) {
    // Tính vị trí của mỗi stop trên polyline (distance từ start)
    const stopsWithPosition = stops.map((stop) => {
      let minDistance = Infinity;
      let position = 0; // Index trên polyline

      for (let i = 0; i < polylinePoints.length - 1; i++) {
        const distance = GeoUtils.distancePointToSegment(
          stop.viDo, stop.kinhDo,
          polylinePoints[i].lat, polylinePoints[i].lng,
          polylinePoints[i + 1].lat, polylinePoints[i + 1].lng
        );

        if (distance < minDistance) {
          minDistance = distance;
          position = i + (distance / (GeoUtils.distanceBetweenPoints(
            polylinePoints[i].lat, polylinePoints[i].lng,
            polylinePoints[i + 1].lat, polylinePoints[i + 1].lng
          ) || 1));
        }
      }

      return {
        ...stop,
        position,
      };
    });

    // Sắp xếp theo position
    stopsWithPosition.sort((a, b) => a.position - b.position);

    // Gán sequence
    return stopsWithPosition.map((stop, index) => ({
      ...stop,
      sequence: index + 1,
    }));
  }

  /**
   * Extract tên đường từ địa chỉ
   * @param {string} address - Địa chỉ đầy đủ
   * @returns {string|null} Tên đường hoặc null
   */
  static extractStreetName(address) {
    if (!address) return null;

    // Pattern: "số nhà, Tên Đường, ..."
    const match = address.match(/\d+\s*,\s*([^,]+)/);
    if (match && match[1]) {
      return match[1].trim();
    }

    // Fallback: lấy phần đầu tiên trước dấu phẩy
    const parts = address.split(",");
    if (parts.length > 1) {
      return parts[1].trim();
    }

    return null;
  }

  /**
   * Tìm hoặc tạo điểm dừng (helper method)
   * @param {Object} point - {lat, lng, name, address}
   * @param {Object} connection - Database connection
   * @returns {Promise<number>} Stop ID
   */
  static async findOrCreateStop(point, connection) {
    // Tìm điểm dừng đã có (trong bán kính 100m)
    const [existing] = await connection.query(
      `SELECT maDiem FROM DiemDung 
       WHERE ABS(viDo - ?) < 0.001 AND ABS(kinhDo - ?) < 0.001
       LIMIT 1`,
      [point.lat, point.lng]
    );

    if (existing.length > 0) {
      return existing[0].maDiem;
    }

    // Tạo mới nếu chưa có
    const tenDiem = point.name || point.address || `Điểm dừng ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
    const [stopResult] = await connection.query(
      `INSERT INTO DiemDung (tenDiem, viDo, kinhDo, address)
       VALUES (?, ?, ?, ?)`,
      [tenDiem, point.lat, point.lng, point.address || null]
    );

    return stopResult.insertId;
  }
}

export default RouteAutoCreateService;

