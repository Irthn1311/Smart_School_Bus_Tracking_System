import pool from "../config/db.js";
import HocSinhModel from "../models/HocSinhModel.js";
import DiemDungModel from "../models/DiemDungModel.js";
import MapsService from "./MapsService.js";
import StopSuggestionService from "./StopSuggestionService.js";

/**
 * Service Tầng 1 - Tối ưu tập điểm dừng bằng Greedy Maximum Coverage
 * 
 * Thuật toán:
 * 1. Khởi tạo: U = tập học sinh chưa gán, C = tập ứng viên điểm dừng (ban đầu = tọa độ học sinh)
 * 2. Lặp:
 *    - Với mỗi ứng viên c, tính Cov(c) = {s ∈ U | distance(s, c) <= R_walk}
 *    - Chọn c* có |Cov(c*)| lớn nhất
 *    - Gán tối đa S_max học sinh gần nhất từ Cov(c*) vào điểm dừng mới
 *    - Xóa các học sinh đã gán khỏi U
 * 3. Snap điểm dừng lên đường bằng Roads API
 * 4. Lưu vào DB: DiemDung và HocSinh_DiemDung
 */
class BusStopOptimizationService {

  static async _findOrCreateStop({ tenDiem, viDo, kinhDo, diaChiChiTiet }) {
    // Tạo điểm dừng nếu chưa có, nếu trùng unique key thì lấy lại record cũ
    const lat = Number(viDo);
    const lng = Number(kinhDo);

    // 1. Thử tìm theo (tên + toạ độ)
    const existing = await DiemDungModel.findByNameAndCoords(tenDiem, lat, lng);
    if (existing) {
      return existing.maDiem; // trả về ID
    }

    try {
      // 2. Nếu chưa có thì tạo mới
      const id = await DiemDungModel.create({
        tenDiem,
        viDo: lat,
        kinhDo: lng,
        address: diaChiChiTiet || null,
      });
      return id;
    } catch (err) {
      // 3. Nếu vẫn bị ER_DUP_ENTRY (race condition) => tìm lại
      if (err.code === "ER_DUP_ENTRY") {
        const again = await DiemDungModel.findByNameAndCoords(tenDiem, lat, lng);
        if (again) return again.maDiem;
      }
      throw err;
    }
  }


  /**
   * Tính khoảng cách giữa 2 điểm (mét) - wrapper cho Haversine
   */
  static calculateDistanceMeters(lat1, lng1, lat2, lng2) {
    const distanceKm = StopSuggestionService.calculateDistance(lat1, lng1, lat2, lng2);
    return distanceKm * 1000; // Convert to meters
  }

  /**
   * Lấy tất cả học sinh có tọa độ hợp lệ
   */
  static async getStudentsWithCoordinates() {
    const allStudents = await HocSinhModel.getAll();
    console.log(`[BusStopOptimization] Total students from DB: ${allStudents.length}`);
    
    // Debug: Log sample student để xem cấu trúc dữ liệu
    if (allStudents.length > 0) {
      const sample = allStudents[0];
      console.log(`[BusStopOptimization] Sample student structure:`, {
        maHocSinh: sample.maHocSinh,
        hoTen: sample.hoTen,
        viDo: sample.viDo,
        kinhDo: sample.kinhDo,
        viDoType: typeof sample.viDo,
        kinhDoType: typeof sample.kinhDo,
        trangThai: sample.trangThai,
        trangThaiType: typeof sample.trangThai,
      });
    }
    
    // Filter với logic linh hoạt hơn (hỗ trợ cả number và string)
    const filtered = allStudents.filter((s) => {
      // Kiểm tra viDo và kinhDo
      const hasValidCoords = 
        s.viDo != null && 
        s.kinhDo != null &&
        s.viDo !== '' &&
        s.kinhDo !== '' &&
        !isNaN(parseFloat(s.viDo)) &&
        !isNaN(parseFloat(s.kinhDo)) &&
        isFinite(parseFloat(s.viDo)) &&
        isFinite(parseFloat(s.kinhDo));
      
      // Kiểm tra trangThai (hỗ trợ cả boolean true và number 1)
      const isActive = s.trangThai === true || s.trangThai === 1 || s.trangThai === '1';
      
      return hasValidCoords && isActive;
    });
    
    console.log(`[BusStopOptimization] Students with valid coordinates: ${filtered.length}`);
    
    // Code snippet removed - this was orphaned code that's not part of any function




    // Log thống kê về học sinh không có tọa độ
    const withoutCoords = allStudents.filter((s) => {
      return !s.viDo || 
             !s.kinhDo || 
             s.viDo === '' || 
             s.kinhDo === '' ||
             isNaN(parseFloat(s.viDo)) || 
             isNaN(parseFloat(s.kinhDo)) ||
             !isFinite(parseFloat(s.viDo)) ||
             !isFinite(parseFloat(s.kinhDo));
    });
    if (withoutCoords.length > 0) {
      console.warn(`[BusStopOptimization] ⚠️ ${withoutCoords.length} students without coordinates`);
      // Log sample để debug
      if (withoutCoords.length > 0) {
        const sample = withoutCoords[0];
        console.warn(`[BusStopOptimization] Sample student without coords:`, {
          maHocSinh: sample.maHocSinh,
          hoTen: sample.hoTen,
          viDo: sample.viDo,
          kinhDo: sample.kinhDo,
        });
      }
    }
    
    // Log thống kê về học sinh không active
    const inactive = allStudents.filter((s) => {
      return s.trangThai !== true && s.trangThai !== 1 && s.trangThai !== '1';
    });
    if (inactive.length > 0) {
      console.warn(`[BusStopOptimization] ⚠️ ${inactive.length} inactive students`);
    }
    
    return filtered;
  }

  /**
   * Tính coverage của một ứng viên điểm dừng
   * @param {Object} candidate - {lat, lng}
   * @param {Array} unassignedStudents - Tập học sinh chưa gán
   * @param {Number} R_walk - Bán kính đi bộ tối đa (mét)
   * @returns {Array} Danh sách học sinh trong bán kính R_walk
   */
  static calculateCoverage(candidate, unassignedStudents, R_walk) {
    const coverage = [];
    const R_walkKm = R_walk / 1000; // Convert to km for Haversine

    for (const student of unassignedStudents) {
      const distanceKm = StopSuggestionService.calculateDistance(
        student.viDo,
        student.kinhDo,
        candidate.lat,
        candidate.lng
      );
      const distanceMeters = distanceKm * 1000;

      if (distanceMeters <= R_walk) {
        coverage.push({
          student,
          distance: distanceMeters,
        });
      }
    }

    // Sort by distance (nearest first)
    coverage.sort((a, b) => a.distance - b.distance);

    return coverage;
  }

  /**
   * Snap điểm dừng lên đường bằng Roads API
   * @param {Number} lat - Latitude
   * @param {Number} lng - Longitude
   * @returns {Promise<Object>} {lat, lng} - Tọa độ đã snap
   */
  static async snapToRoad(lat, lng) {
    try {
      const result = await MapsService.snapToRoads({
        path: [{ lat, lng }],
        interpolate: false,
      });

      if (
        result.snappedPolyline &&
        result.snappedPolyline.length > 0 &&
        result.snappedPolyline[0].location
      ) {
        return {
          lat: result.snappedPolyline[0].location.latitude,
          lng: result.snappedPolyline[0].location.longitude,
        };
      }
    } catch (error) {
      console.warn(`[BusStopOptimization] Failed to snap to road: ${error.message}`);
    }

    // Fallback: return original coordinates
    return { lat, lng };
  }

  /**
   * Tìm địa điểm gần nhất bằng Places API (qua reverse geocoding)
   * @param {Number} lat - Latitude
   * @param {Number} lng - Longitude
   * @returns {Promise<Object>} {name, address}
   */
  static async findNearbyPlace(lat, lng) {
    try {
      const geocodeResult = await MapsService.reverseGeocode(`${lat},${lng}`, "vi");
      if (geocodeResult.results && geocodeResult.results.length > 0) {
        const result = geocodeResult.results[0];
        return {
          name: result.formatted_address || `Điểm dừng ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          address: result.formatted_address || null,
        };
      }
    } catch (error) {
      console.warn(`[BusStopOptimization] Failed to find nearby place: ${error.message}`);
    }

    // Fallback: return default name
    return {
      name: `Điểm dừng ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      address: null,
    };
  }

  /**
   * Thuật toán Greedy Maximum Coverage
   * @param {Object} options - {
   *   students: Array (optional, nếu không có sẽ lấy từ DB),
   *   R_walk: Number (mét, default: 500),
   *   S_max: Number (default: 25),
   *   MAX_STOPS: Number (optional),
   *   use_roads_api: Boolean (default: false),
   *   use_places_api: Boolean (default: false)
   * }
   * @returns {Promise<Object>} {stops, assignments, stats}
   */
  static async greedyMaximumCoverage(options = {}) {
    const {
      students = null,
      R_walk = 500, // meters
      S_max = 25,
      MAX_STOPS = null,
      use_roads_api = false,
      use_places_api = false,
      school_location = null, // {lat, lng} - vị trí trường học
      max_distance_from_school = 15000, // meters - khoảng cách tối đa từ trường (15km)
    } = options;

    console.log(`[BusStopOptimization] Starting Greedy Maximum Coverage`);
    console.log(`[BusStopOptimization] Parameters: R_walk=${R_walk}m, S_max=${S_max}, MAX_STOPS=${MAX_STOPS || "unlimited"}`);
    if (school_location) {
      console.log(`[BusStopOptimization] School location: (${school_location.lat}, ${school_location.lng}), max_distance=${max_distance_from_school}m`);
    }

    // Lấy học sinh
    let allStudents = students;
    if (!allStudents || allStudents.length === 0) {
      allStudents = await this.getStudentsWithCoordinates();
    }

    if (allStudents.length === 0) {
      console.warn(`[BusStopOptimization] ⚠️ No students found with valid coordinates. Please check:`);
      console.warn(`[BusStopOptimization]   1. Are there students in the database?`);
      console.warn(`[BusStopOptimization]   2. Do students have viDo and kinhDo?`);
      console.warn(`[BusStopOptimization]   3. Are students active (trangThai = true)?`);
      return {
        stops: [],
        assignments: [],
        stats: {
          totalStudents: 0,
          assignedStudents: 0,
          totalStops: 0,
          error: "No students found with valid coordinates",
        },
      };
    }

    console.log(`[BusStopOptimization] Processing ${allStudents.length} students`);
    
    // Log sample student data để debug
    if (allStudents.length > 0) {
      const sample = allStudents[0];
      console.log(`[BusStopOptimization] Sample student: maHocSinh=${sample.maHocSinh}, viDo=${sample.viDo}, kinhDo=${sample.kinhDo}`);
    }

    // Khởi tạo
    let U = [...allStudents]; // Tập học sinh chưa gán
    let C = allStudents.map((s) => ({
      lat: s.viDo,
      lng: s.kinhDo,
      studentId: s.maHocSinh,
    })); // Tập ứng viên điểm dừng (ban đầu = tọa độ học sinh)
    const STOP_SET = []; // Danh sách điểm dừng đã tạo
    const ASSIGN = new Map(); // Map: maHocSinh -> {maDiemDung, khoangCachMet}

    // Lặp cho đến khi tất cả học sinh đã được gán hoặc đạt MAX_STOPS
    let iteration = 0;
    while (U.length > 0 && (MAX_STOPS === null || STOP_SET.length < MAX_STOPS)) {
      iteration++;
      console.log(`[BusStopOptimization] Iteration ${iteration}: ${U.length} unassigned students, ${STOP_SET.length} stops created`);

      // Tìm ứng viên tốt nhất
      // Ràng buộc: khoảng cách tối thiểu giữa các điểm dừng = 200m (để tránh quá gần)
      const MIN_STOP_DISTANCE = 200; // meters
      let bestCandidate = null;
      let bestCoverage = [];
      let bestCoverageSize = 0;
      let bestScore = 0; // Score có trọng số (coverage + khoảng cách đến trường)

      for (const candidate of C) {
        // Kiểm tra khoảng cách với các điểm dừng đã tạo
        let tooClose = false;
        for (const existingStop of STOP_SET) {
          const distance = this.calculateDistanceMeters(
            candidate.lat,
            candidate.lng,
            existingStop.viDo,
            existingStop.kinhDo
          );
          if (distance < MIN_STOP_DISTANCE) {
            tooClose = true;
            break;
          }
        }
        
        // Bỏ qua ứng viên quá gần với điểm dừng đã tạo
        if (tooClose) {
          continue;
        }

        // Kiểm tra khoảng cách đến trường học (nếu có)
        if (school_location) {
          const distanceToSchool = this.calculateDistanceMeters(
            candidate.lat,
            candidate.lng,
            school_location.lat,
            school_location.lng
          );
          
          // Bỏ qua ứng viên quá xa trường học
          if (distanceToSchool > max_distance_from_school) {
            continue;
          }
        }

        const coverage = this.calculateCoverage(candidate, U, R_walk);
        
        // Tính score có trọng số: coverage + khoảng cách đến trường
        let score = coverage.length;
        if (school_location && coverage.length > 0) {
          const distanceToSchool = this.calculateDistanceMeters(
            candidate.lat,
            candidate.lng,
            school_location.lat,
            school_location.lng
          );
          // Công thức: score = coverage * (1 - distancePenalty)
          // distancePenalty = (distanceToSchool / max_distance_from_school) * 0.3
          // Trọng số 0.3 = 30% cho khoảng cách đến trường
          const distancePenalty = (distanceToSchool / max_distance_from_school) * 0.3;
          score = coverage.length * (1 - distancePenalty);
        }
        
        // Chọn ứng viên có score cao nhất
        if (score > bestScore) {
          bestScore = score;
          bestCoverageSize = coverage.length;
          bestCandidate = candidate;
          bestCoverage = coverage;
        }
      }

      // Nếu không tìm được ứng viên nào phủ thêm học sinh
      if (!bestCandidate || bestCoverageSize === 0) {
        console.log(`[BusStopOptimization] No candidate can cover more students. Creating individual stops for remaining ${U.length} students`);
        
          // Tạo điểm dừng riêng cho từng học sinh còn lại
        for (const student of U) {
          const stopCoords = use_roads_api
            ? await this.snapToRoad(student.viDo, student.kinhDo)
            : { lat: student.viDo, lng: student.kinhDo };

          const placeInfo = use_places_api
            ? await this.findNearbyPlace(stopCoords.lat, stopCoords.lng)
            : {
                name: `Điểm dừng ${student.hoTen}`,
                address: student.diaChi || null,
              };          // Tạo điểm dừng
          const stopId = await this._findOrCreateStop({
            tenDiem: placeInfo.name,
            viDo: stopCoords.lat,
            kinhDo: stopCoords.lng,
            diaChiChiTiet: placeInfo.address,
          });

          STOP_SET.push({
            maDiem: stopId,
            tenDiem: placeInfo.name,
            viDo: stopCoords.lat,
            kinhDo: stopCoords.lng,
            address: placeInfo.address,
          });

          // Gán học sinh
          ASSIGN.set(student.maHocSinh, {
            maDiemDung: stopId,
            khoangCachMet: 0, // Tại nhà
          });
        }
        break;
      }

      // Chọn tối đa S_max học sinh gần nhất từ bestCoverage
      const assignedStudents = bestCoverage.slice(0, S_max);
      const assignedStudentIds = assignedStudents.map((item) => item.student.maHocSinh);

      // Snap điểm dừng lên đường
      const stopCoords = use_roads_api
        ? await this.snapToRoad(bestCandidate.lat, bestCandidate.lng)
        : { lat: bestCandidate.lat, lng: bestCandidate.lng };

      // Tìm địa điểm gần nhất
      const placeInfo = use_places_api
        ? await this.findNearbyPlace(stopCoords.lat, stopCoords.lng)
        : {
            name: `Điểm dừng ${stopCoords.lat.toFixed(6)}, ${stopCoords.lng.toFixed(6)}`,
            address: null,
          };

      // Tạo điểm dừng
      const stopId = await this._findOrCreateStop({
        tenDiem: placeInfo.name,
        viDo: stopCoords.lat,
        kinhDo: stopCoords.lng,
        diaChiChiTiet: placeInfo.address,
      });

      // Tính khoảng cách đến trường học (nếu có) để logging
      let distanceToSchool = null;
      if (school_location) {
        distanceToSchool = this.calculateDistanceMeters(
          stopCoords.lat,
          stopCoords.lng,
          school_location.lat,
          school_location.lng
        );
        console.log(`[BusStopOptimization] Created stop: ${placeInfo.name}, distance to school: ${(distanceToSchool / 1000).toFixed(2)}km, students: ${assignedStudents.length}`);
      } else {
        console.log(`[BusStopOptimization] Created stop: ${placeInfo.name}, students: ${assignedStudents.length}`);
      }

      STOP_SET.push({
        maDiem: stopId,
        tenDiem: placeInfo.name,
        viDo: stopCoords.lat,
        kinhDo: stopCoords.lng,
        address: placeInfo.address,
        studentCount: assignedStudents.length,
        distanceToSchool: distanceToSchool, // Thêm thông tin khoảng cách đến trường
      });

      // Gán học sinh cho điểm dừng
      for (const item of assignedStudents) {
        ASSIGN.set(item.student.maHocSinh, {
          maDiemDung: stopId,
          khoangCachMet: Math.round(item.distance),
        });
      }

      // Xóa học sinh đã gán khỏi U
      U = U.filter((s) => !assignedStudentIds.includes(s.maHocSinh));
      
      // Cập nhật lại danh sách ứng viên C (loại bỏ các học sinh đã được gán)
      C = C.filter((c) => !assignedStudentIds.includes(c.studentId));

      // Xóa ứng viên đã dùng khỏi C
      C.splice(C.indexOf(bestCandidate), 1);
    }

    // Lưu assignments vào DB
    const assignments = [];
    for (const [maHocSinh, assignment] of ASSIGN.entries()) {
      assignments.push({
        maHocSinh,
        maDiemDung: assignment.maDiemDung,
        khoangCachMet: assignment.khoangCachMet,
      });
    }

    // Bulk insert vào HocSinh_DiemDung
    if (assignments.length > 0) {
      await this.saveAssignments(assignments);
    }

    const stats = {
      totalStudents: allStudents.length,
      assignedStudents: assignments.length,
      totalStops: STOP_SET.length,
      averageStudentsPerStop: STOP_SET.length > 0 ? (assignments.length / STOP_SET.length).toFixed(2) : 0,
      maxWalkDistance: Math.max(...assignments.map((a) => a.khoangCachMet || 0)),
    };

    console.log(`[BusStopOptimization] Completed: ${stats.totalStops} stops, ${stats.assignedStudents} students assigned`);

    return {
      stops: STOP_SET,
      assignments,
      stats,
    };
  }

  /**
   * Lưu assignments vào bảng HocSinh_DiemDung
   * @param {Array} assignments - [{maHocSinh, maDiemDung, khoangCachMet}]
   */
  static async saveAssignments(assignments) {
    if (assignments.length === 0) return;

    // Xóa assignments cũ (nếu có)
    const studentIds = assignments.map((a) => a.maHocSinh);
    await pool.query(
      `DELETE FROM HocSinh_DiemDung WHERE maHocSinh IN (${studentIds.map(() => "?").join(",")})`,
      studentIds
    );

    // Insert assignments mới
    const values = assignments.map((a) => [a.maHocSinh, a.maDiemDung, a.khoangCachMet || 0]);
    const placeholders = values.map(() => "(?, ?, ?)").join(",");
    const flatValues = values.flat();

    await pool.query(
      `INSERT INTO HocSinh_DiemDung (maHocSinh, maDiemDung, khoangCachMet) VALUES ${placeholders}`,
      flatValues
    );

    console.log(`[BusStopOptimization] Saved ${assignments.length} assignments to HocSinh_DiemDung`);
  }

  /**
   * Lấy assignments hiện tại từ DB
   * @returns {Promise<Array>} [{maHocSinh, maDiemDung, khoangCachMet}]
   */
  static async getAssignments() {
    const [rows] = await pool.query(
      `SELECT hsd.*, hs.hoTen, hs.viDo as studentLat, hs.kinhDo as studentLng,
              dd.tenDiem, dd.viDo as stopLat, dd.kinhDo as stopLng
       FROM HocSinh_DiemDung hsd
       JOIN HocSinh hs ON hsd.maHocSinh = hs.maHocSinh
       JOIN DiemDung dd ON hsd.maDiemDung = dd.maDiem
       ORDER BY hsd.maDiemDung, hsd.khoangCachMet`
    );
    return rows;
  }

  /**
   * Lấy thống kê về điểm dừng và assignments
   * @returns {Promise<Object>} Stats
   */
  static async getStats() {
    const [stopStats] = await pool.query(
      `SELECT 
        COUNT(DISTINCT dd.maDiem) as totalStops,
        COUNT(DISTINCT hsd.maHocSinh) as totalAssignedStudents,
        AVG(hsd.khoangCachMet) as avgWalkDistance,
        MAX(hsd.khoangCachMet) as maxWalkDistance,
        COUNT(*) as totalAssignments
       FROM DiemDung dd
       LEFT JOIN HocSinh_DiemDung hsd ON dd.maDiem = hsd.maDiemDung`
    );

    const [stopStudentCounts] = await pool.query(
      `SELECT 
        dd.maDiem,
        dd.tenDiem,
        COUNT(hsd.maHocSinh) as studentCount
       FROM DiemDung dd
       LEFT JOIN HocSinh_DiemDung hsd ON dd.maDiem = hsd.maDiemDung
       GROUP BY dd.maDiem, dd.tenDiem
       ORDER BY studentCount DESC`
    );

    return {
      ...stopStats[0],
      stopStudentCounts,
    };
  }
}

export default BusStopOptimizationService;

