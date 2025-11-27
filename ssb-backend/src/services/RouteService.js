import TuyenDuongModel from "../models/TuyenDuongModel.js";
import DiemDungModel from "../models/DiemDungModel.js";
import RouteStopModel from "../models/RouteStopModel.js";
import pool from "../config/db.js";

/**
 * Tính khoảng cách giữa 2 điểm (Haversine formula) - trả về km
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

class RouteService {
  static async list(options = {}) {
    const { page = 1, limit = 10, routeType } = options;
    const data = await TuyenDuongModel.getAll({ ...options, routeType });
    // TODO: Implement count method if needed
    const total = data.length;
    return {
      data,
      pagination: {
        page: +page,
        limit: +limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy route với stops (qua route_stops)
   */
  static async getById(id) {
    const route = await TuyenDuongModel.getById(id);
    if (!route) throw new Error("ROUTE_NOT_FOUND");
    
    // Lấy stops qua route_stops
    const stops = await RouteStopModel.getByRouteId(id);
    route.stops = stops;
    route.diemDung = stops; // Backward compatibility
    
    return route;
  }

  static async create(payload) {
    if (!payload.tenTuyen) throw new Error("MISSING_REQUIRED_FIELDS");
    
    const routeType = payload.routeType || null;
    const createReturnRoute = payload.createReturnRoute !== false; // Mặc định true
    
    // Tạo tuyến đi
    const routeId = await TuyenDuongModel.create({
      ...payload,
      routeType: routeType || 'di', // Mặc định là tuyến đi
    });
    
    // Thêm stops vào tuyến đi nếu có trong payload
    if (payload.stops && Array.isArray(payload.stops) && payload.stops.length > 0) {
      console.log(`[RouteService] Adding ${payload.stops.length} stops to route ${routeId}`);
      for (let i = 0; i < payload.stops.length; i++) {
        const stop = payload.stops[i];
        try {
          await this.addStopToRoute(routeId, {
            stop_id: stop.stop_id || null,
            tenDiem: stop.tenDiem || stop.name,
            viDo: stop.viDo || stop.lat,
            kinhDo: stop.kinhDo || stop.lng,
            sequence: stop.sequence || i + 1,
            address: stop.address,
          });
        } catch (stopError) {
          console.warn(`[RouteService] Failed to add stop ${i + 1} to route ${routeId}:`, stopError);
        }
      }
      
      // 🔥 Tự động gán học sinh vào student_stop_suggestions sau khi thêm stops
      try {
        const routeStops = await RouteStopModel.getByRouteId(routeId);
        if (routeStops.length > 0) {
          const assignedCount = await this.assignStudentsToStops(routeId, routeStops);
          console.log(`[RouteService] ✅ Auto-assigned ${assignedCount} students to route ${routeId} stops`);
        }
      } catch (assignError) {
        console.warn(`[RouteService] ⚠️ Failed to auto-assign students to route ${routeId}:`, assignError);
        // Không throw error - route đã được tạo thành công
      }
      
      // Rebuild polyline cho tuyến đi
      try {
        const MapsService = (await import("./MapsService.js")).default;
        await this.rebuildPolyline(routeId, MapsService);
      } catch (polylineError) {
        console.warn(`[RouteService] Failed to rebuild polyline for route ${routeId}:`, polylineError);
      }
    }
    
    let returnRouteId = null;
    
    // Nếu tạo tuyến đi và yêu cầu tạo tuyến về, tự động tạo tuyến về
    if (createReturnRoute && (!routeType || routeType === 'di')) {
      // Tạo tuyến về với thông tin đảo ngược
      const returnRouteData = {
        tenTuyen: `${payload.tenTuyen} (Về)`,
        diemBatDau: payload.diemKetThuc,
        diemKetThuc: payload.diemBatDau,
        thoiGianUocTinh: payload.thoiGianUocTinh,
        origin_lat: payload.dest_lat,
        origin_lng: payload.dest_lng,
        dest_lat: payload.origin_lat,
        dest_lng: payload.origin_lng,
        routeType: 've',
        pairedRouteId: routeId,
        trangThai: payload.trangThai !== undefined ? payload.trangThai : true,
      };
      
      returnRouteId = await TuyenDuongModel.create(returnRouteData);
      
      // Cập nhật tuyến đi để link với tuyến về
      await TuyenDuongModel.update(routeId, {
        pairedRouteId: returnRouteId,
      });
      
      console.log(`[RouteService] Created return route ${returnRouteId} for route ${routeId}`);
      
      // Nếu có stops trong payload, đảo ngược và thêm vào tuyến về
      if (payload.stops && Array.isArray(payload.stops) && payload.stops.length > 0) {
        const reversedStops = [...payload.stops].reverse();
        for (let i = 0; i < reversedStops.length; i++) {
          const stop = reversedStops[i];
          try {
            await this.addStopToRoute(returnRouteId, {
              stop_id: stop.stop_id || stop.maDiem,
              tenDiem: stop.tenDiem || stop.name,
              viDo: stop.viDo || stop.lat,
              kinhDo: stop.kinhDo || stop.lng,
              sequence: i + 1,
              address: stop.address,
            });
          } catch (stopError) {
            console.warn(`[RouteService] Failed to add stop ${i + 1} to return route:`, stopError);
          }
        }
        
        // 🔥 Tự động gán học sinh vào student_stop_suggestions cho tuyến về
        try {
          const returnRouteStops = await RouteStopModel.getByRouteId(returnRouteId);
          if (returnRouteStops.length > 0) {
            const assignedCount = await this.assignStudentsToStops(returnRouteId, returnRouteStops);
            console.log(`[RouteService] ✅ Auto-assigned ${assignedCount} students to return route ${returnRouteId} stops`);
          }
        } catch (assignError) {
          console.warn(`[RouteService] ⚠️ Failed to auto-assign students to return route ${returnRouteId}:`, assignError);
          // Không throw error - route đã được tạo thành công
        }
        
        // Rebuild polyline cho tuyến về
        try {
          const MapsService = (await import("./MapsService.js")).default;
          await this.rebuildPolyline(returnRouteId, MapsService);
        } catch (polylineError) {
          console.warn(`[RouteService] Failed to rebuild polyline for return route:`, polylineError);
        }
      }
    }
    
    return await this.getById(routeId);
  }

  static async update(id, data) {
    const r = await TuyenDuongModel.getById(id);
    if (!r) throw new Error("ROUTE_NOT_FOUND");
    await TuyenDuongModel.update(id, data);
    return await this.getById(id);
  }

  static async delete(id) {
    const r = await TuyenDuongModel.getById(id);
    if (!r) throw new Error("ROUTE_NOT_FOUND");
    await TuyenDuongModel.delete(id);
    return true;
  }

  /**
   * Tạo nhiều tuyến đường cùng lúc bằng transaction
   * Nếu một tuyến fail, rollback tất cả
   */
  static async createRoutesBatch(routesPayload) {
    if (!Array.isArray(routesPayload) || routesPayload.length === 0) {
      throw new Error("ROUTES_PAYLOAD_REQUIRED");
    }

    const connection = await pool.getConnection();
    const createdRoutes = [];
    const errors = [];

    try {
      await connection.beginTransaction();
      console.log(`[RouteService] Starting batch create transaction for ${routesPayload.length} routes`);

      for (let i = 0; i < routesPayload.length; i++) {
        const payload = routesPayload[i];
        const routeIndex = i + 1;

        try {
          // Validate required fields
          if (!payload.tenTuyen) {
            throw new Error(`Route ${routeIndex}: MISSING_REQUIRED_FIELDS - tenTuyen is required`);
          }

          // Validate stops: mỗi tuyến phải có ít nhất 2 điểm dừng
          const stops = payload.stops || [];
          if (stops.length < 2) {
            throw new Error(`Route ${routeIndex}: INSUFFICIENT_STOPS - Tuyến phải có ít nhất 2 điểm dừng (hiện tại: ${stops.length})`);
          }

          // Kiểm tra duplicate tên tuyến trong batch
          const duplicateInBatch = routesPayload.slice(0, i).find(r => r.tenTuyen === payload.tenTuyen);
          if (duplicateInBatch) {
            throw new Error(`Route ${routeIndex}: DUPLICATE_ROUTE_NAME - "${payload.tenTuyen}" already exists in this batch`);
          }

          // Kiểm tra duplicate với database (sử dụng connection trong transaction)
          const [existing] = await connection.query(
            `SELECT maTuyen FROM TuyenDuong WHERE tenTuyen = ? AND trangThai = TRUE`,
            [payload.tenTuyen]
          );
          if (existing.length > 0) {
            throw new Error(`Route ${routeIndex}: DUPLICATE_ROUTE_NAME - "${payload.tenTuyen}" already exists in database`);
          }

          // Tạo tuyến đường (sử dụng connection trong transaction)
          const routeType = payload.routeType || 'di';
          const finalTrangThai = payload.trangThai !== undefined 
            ? (payload.trangThai === true || payload.trangThai === 1 || payload.trangThai === 'true' || payload.trangThai === '1')
            : true;

          const [routeResult] = await connection.query(
            `INSERT INTO TuyenDuong 
             (tenTuyen, diemBatDau, diemKetThuc, thoiGianUocTinh, 
              origin_lat, origin_lng, dest_lat, dest_lng, polyline, trangThai, routeType, pairedRouteId)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              payload.tenTuyen,
              payload.diemBatDau || null,
              payload.diemKetThuc || null,
              payload.thoiGianUocTinh || null,
              payload.origin_lat || null,
              payload.origin_lng || null,
              payload.dest_lat || null,
              payload.dest_lng || null,
              payload.polyline || null,
              finalTrangThai,
              routeType || null,
              payload.pairedRouteId || null,
            ]
          );

          const routeId = routeResult.insertId;
          console.log(`[RouteService] Created route ${routeIndex}/${routesPayload.length}: ${routeId} - ${payload.tenTuyen}`);

          // Thêm stops vào tuyến nếu có
          if (payload.stops && Array.isArray(payload.stops) && payload.stops.length > 0) {
            const sortedStops = [...payload.stops].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

            for (let j = 0; j < sortedStops.length; j++) {
              const stop = sortedStops[j];
              const sequence = stop.sequence || j + 1;

              // Tìm hoặc tạo điểm dừng
              let stopId = stop.stop_id;

              if (!stopId) {
                // Generate tenDiem từ address nếu không có
                const tenDiem = stop.tenDiem || stop.address || `Điểm dừng ${sequence}`;
                
                // Hỗ trợ cả lat/lng và viDo/kinhDo
                const viDo = stop.viDo !== undefined ? stop.viDo : stop.lat;
                const kinhDo = stop.kinhDo !== undefined ? stop.kinhDo : stop.lng;
                
                if (viDo === undefined || kinhDo === undefined || isNaN(Number(viDo)) || isNaN(Number(kinhDo))) {
                  throw new Error(`Route ${routeIndex}, Stop ${j + 1}: MISSING_REQUIRED_FIELDS - viDo/kinhDo (hoặc lat/lng) required`);
                }

                // Kiểm tra điểm dừng đã tồn tại (theo tọa độ, không theo tên vì tên có thể khác nhau)
                const [existingStops] = await connection.query(
                  `SELECT maDiem FROM DiemDung 
                   WHERE ABS(viDo - ?) < 0.0001 
                     AND ABS(kinhDo - ?) < 0.0001
                   LIMIT 1`,
                  [viDo, kinhDo]
                );

                if (existingStops.length > 0) {
                  stopId = existingStops[0].maDiem;
                  console.log(`[RouteService] Found existing stop ${stopId} at (${viDo}, ${kinhDo})`);
                } else {
                  // Tạo điểm dừng mới
                  const [stopResult] = await connection.query(
                    `INSERT INTO DiemDung (tenDiem, viDo, kinhDo, address)
                     VALUES (?, ?, ?, ?)`,
                    [
                      tenDiem,
                      viDo,
                      kinhDo,
                      stop.address || null,
                    ]
                  );
                  stopId = stopResult.insertId;
                  console.log(`[RouteService] Created new stop ${stopId}: ${tenDiem} at (${viDo}, ${kinhDo})`);
                }
              }

              // Thêm vào route_stops
              await connection.query(
                `INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE sequence = VALUES(sequence)`,
                [routeId, stopId, sequence, stop.dwell_seconds || 30]
              );
            }

            console.log(`[RouteService] Added ${sortedStops.length} stops to route ${routeId}`);
          }

          // Lưu route info để trả về
          createdRoutes.push({
            routeId,
            tenTuyen: payload.tenTuyen,
            success: true,
          });

        } catch (routeError) {
          // Lỗi khi tạo một tuyến
          const errorMessage = routeError.message || `Route ${routeIndex}: Unknown error`;
          console.error(`[RouteService] Error creating route ${routeIndex}:`, errorMessage);
          errors.push({
            routeIndex,
            tenTuyen: payload.tenTuyen || `Route ${routeIndex}`,
            error: errorMessage,
          });
          
          // Nếu có lỗi, rollback toàn bộ transaction
          throw routeError;
        }
      }

      // Nếu tất cả thành công, commit transaction
      await connection.commit();
      console.log(`[RouteService] Batch create transaction committed successfully: ${createdRoutes.length} routes created`);

      return {
        success: true,
        created: createdRoutes,
        total: routesPayload.length,
        errors: [],
      };

    } catch (error) {
      // Rollback transaction nếu có lỗi
      await connection.rollback();
      console.error(`[RouteService] Batch create transaction rolled back:`, error.message);
      
      return {
        success: false,
        created: createdRoutes, // Các route đã tạo trước khi lỗi (sẽ bị rollback)
        total: routesPayload.length,
        errors: errors.length > 0 ? errors : [{
          routeIndex: errors.length + 1,
          tenTuyen: routesPayload[errors.length]?.tenTuyen || 'Unknown',
          error: error.message || 'Transaction failed',
        }],
        message: `Transaction failed: ${error.message}`,
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Lấy stops của route (qua route_stops)
   */
  static async getStops(routeId) {
    const route = await TuyenDuongModel.getById(routeId);
    if (!route) throw new Error("ROUTE_NOT_FOUND");
    return await RouteStopModel.getByRouteId(routeId);
  }

  /**
   * Thêm stop vào route (tạo stop mới nếu cần, rồi thêm vào route_stops)
   */
  static async addStopToRoute(routeId, stopData) {
    const route = await TuyenDuongModel.getById(routeId);
    if (!route) throw new Error("ROUTE_NOT_FOUND");

    let stopId = stopData.stop_id;

    // Nếu không có stop_id, kiểm tra xem điểm dừng đã tồn tại chưa (theo unique constraint)
    if (!stopId) {
      if (!stopData.tenDiem || stopData.viDo === undefined || stopData.kinhDo === undefined) {
        throw new Error("MISSING_REQUIRED_FIELDS");
      }
      
      // Kiểm tra xem điểm dừng với cùng tên và tọa độ đã tồn tại chưa
      const existingStops = await DiemDungModel.getByCoordinates(
        stopData.viDo, 
        stopData.kinhDo, 
        0.0001 // tolerance: ~11m
      );
      
      // Tìm điểm dừng có cùng tên và tọa độ gần nhau
      const exactMatch = existingStops.find(
        (s) => s.tenDiem === stopData.tenDiem &&
               Math.abs(s.viDo - stopData.viDo) < 0.0001 &&
               Math.abs(s.kinhDo - stopData.kinhDo) < 0.0001
      );
      
      if (exactMatch) {
        // Sử dụng điểm dừng đã tồn tại
        stopId = exactMatch.maDiem;
        console.log(`✅ Sử dụng điểm dừng đã tồn tại: ${exactMatch.maDiem} - ${exactMatch.tenDiem}`);
      } else {
        // Tạo điểm dừng mới
        try {
          stopId = await DiemDungModel.create(stopData);
        } catch (createError) {
          // Nếu lỗi duplicate key, thử tìm lại
          if (createError.code === 'ER_DUP_ENTRY' || createError.message?.includes('Duplicate entry')) {
            const retryStops = await DiemDungModel.getByCoordinates(
              stopData.viDo, 
              stopData.kinhDo, 
              0.0001
            );
            const match = retryStops.find(
              (s) => s.tenDiem === stopData.tenDiem &&
                     Math.abs(s.viDo - stopData.viDo) < 0.0001 &&
                     Math.abs(s.kinhDo - stopData.kinhDo) < 0.0001
            );
            if (match) {
              stopId = match.maDiem;
              console.log(`✅ Tìm thấy điểm dừng sau khi retry: ${match.maDiem} - ${match.tenDiem}`);
            } else {
              throw createError;
            }
          } else {
            throw createError;
          }
        }
      }
    } else {
      // Kiểm tra stop có tồn tại không
      const stop = await DiemDungModel.getById(stopId);
      if (!stop) throw new Error("STOP_NOT_FOUND");
    }

    // Thêm vào route_stops
    const sequence = stopData.sequence || null;
    const dwellSeconds = stopData.dwell_seconds || 30;
    await RouteStopModel.addStop(routeId, stopId, sequence, dwellSeconds);

    // Backfill origin/dest nếu cần
    await this._updateRouteOriginDest(routeId);

    return await RouteStopModel.getByRouteId(routeId);
  }

  /**
   * Xóa stop khỏi route (chỉ xóa khỏi route_stops, không xóa stop gốc)
   */
  static async removeStopFromRoute(routeId, stopId) {
    const route = await TuyenDuongModel.getById(routeId);
    if (!route) throw new Error("ROUTE_NOT_FOUND");

    const removed = await RouteStopModel.removeStop(routeId, stopId);
    if (!removed) throw new Error("STOP_NOT_IN_ROUTE");

    // Backfill origin/dest nếu cần
    await this._updateRouteOriginDest(routeId);

    return true;
  }

  /**
   * Cập nhật stop trong route (sequence, dwell_seconds, hoặc stop info)
   */
  static async updateStopInRoute(routeId, stopId, updateData) {
    const route = await TuyenDuongModel.getById(routeId);
    if (!route) throw new Error("ROUTE_NOT_FOUND");

    // Kiểm tra stop có trong route không
    const routeStop = await RouteStopModel.getByRouteAndStop(routeId, stopId);
    if (!routeStop) throw new Error("STOP_NOT_IN_ROUTE");

    // Validate lat/lng nếu có update stop info
    if (updateData.viDo !== undefined || updateData.kinhDo !== undefined) {
      if (updateData.viDo !== undefined && (updateData.viDo < -90 || updateData.viDo > 90)) {
        throw new Error("INVALID_LATITUDE");
      }
      if (updateData.kinhDo !== undefined && (updateData.kinhDo < -180 || updateData.kinhDo > 180)) {
        throw new Error("INVALID_LONGITUDE");
      }
    }

    // Update stop info nếu có
    if (updateData.tenDiem || updateData.viDo !== undefined || updateData.kinhDo !== undefined || updateData.address !== undefined || updateData.scheduled_time !== undefined) {
      const stopUpdateData = {};
      if (updateData.tenDiem !== undefined) stopUpdateData.tenDiem = updateData.tenDiem;
      if (updateData.viDo !== undefined) stopUpdateData.viDo = updateData.viDo;
      if (updateData.kinhDo !== undefined) stopUpdateData.kinhDo = updateData.kinhDo;
      if (updateData.address !== undefined) stopUpdateData.address = updateData.address;
      if (updateData.scheduled_time !== undefined) stopUpdateData.scheduled_time = updateData.scheduled_time;

      await DiemDungModel.update(stopId, stopUpdateData);
    }

    // Update route_stops (sequence, dwell_seconds)
    const sequence = updateData.sequence !== undefined ? updateData.sequence : null;
    const dwellSeconds = updateData.dwell_seconds !== undefined ? updateData.dwell_seconds : null;

    // Nếu update sequence, kiểm tra conflict
    if (sequence !== null && sequence !== routeStop.sequence) {
      const [existing] = await pool.query(
        `SELECT * FROM route_stops WHERE route_id = ? AND sequence = ? AND stop_id != ?`,
        [routeId, sequence, stopId]
      );
      if (existing.length > 0) {
        throw new Error("SEQUENCE_ALREADY_EXISTS");
      }
    }

    await RouteStopModel.updateStop(routeId, stopId, sequence, dwellSeconds);

    // Backfill origin/dest nếu cần
    await this._updateRouteOriginDest(routeId);

    return await RouteStopModel.getByRouteId(routeId);
  }

  /**
   * Sắp xếp lại stops trong route
   */
  static async reorderStops(routeId, items) {
    const route = await TuyenDuongModel.getById(routeId);
    if (!route) throw new Error("ROUTE_NOT_FOUND");

    await RouteStopModel.reorderStops(routeId, items);

    // Backfill origin/dest nếu cần
    await this._updateRouteOriginDest(routeId);

    return await RouteStopModel.getByRouteId(routeId);
  }

  /**
   * Cập nhật origin/dest của route dựa trên stops (MIN sequence = origin, MAX sequence = dest)
   */
  static async _updateRouteOriginDest(routeId) {
    const stops = await RouteStopModel.getByRouteId(routeId);
    if (stops.length === 0) {
      // Nếu không còn stop, set origin/dest = null
      await TuyenDuongModel.update(routeId, {
        origin_lat: null,
        origin_lng: null,
        dest_lat: null,
        dest_lng: null,
      });
      return;
    }

    // Origin = stop có MIN(sequence)
    const originStop = stops[0]; // Đã ORDER BY sequence ASC
    // Dest = stop có MAX(sequence)
    const destStop = stops[stops.length - 1];

    await TuyenDuongModel.update(routeId, {
      origin_lat: originStop.viDo,
      origin_lng: originStop.kinhDo,
      dest_lat: destStop.viDo,
      dest_lng: destStop.kinhDo,
    });
  }

  /**
   * Tự động gán học sinh vào student_stop_suggestions dựa trên khoảng cách
   * @param {number} routeId - Mã tuyến đường
   * @param {Array} routeStops - Danh sách stops của route (từ RouteStopModel.getByRouteId)
   * @returns {Promise<number>} Số lượng suggestions đã tạo
   */
  static async assignStudentsToStops(routeId, routeStops) {
    if (!routeStops || routeStops.length === 0) {
      console.log(`[RouteService] assignStudentsToStops: No stops provided for route ${routeId}`);
      return 0;
    }

    console.log(`[RouteService] assignStudentsToStops: Starting assignment for route ${routeId} with ${routeStops.length} stops`);

    try {
      // Lấy tất cả học sinh có tọa độ và đang hoạt động
      const HocSinhModel = (await import("../models/HocSinhModel.js")).default;
      const allStudents = await HocSinhModel.getAll();
      
      // Filter học sinh có tọa độ hợp lệ
      const studentsWithCoords = allStudents.filter(
        (s) => s.viDo && s.kinhDo && 
               !isNaN(s.viDo) && !isNaN(s.kinhDo) && 
               s.trangThai
      );

      console.log(`[RouteService] assignStudentsToStops: Found ${studentsWithCoords.length} students with valid coordinates`);

      if (studentsWithCoords.length === 0) {
        console.warn(`[RouteService] assignStudentsToStops: No students with coordinates found`);
        return 0;
      }

      // Maximum distance from stop to student (1km - giảm từ 2km để tránh gán quá nhiều)
      const MAX_DISTANCE_KM = 1.0;
      // Maximum students per stop (giống BusStopOptimizationService S_max = 25)
      const MAX_STUDENTS_PER_STOP = 25;

      // Tạo suggestions: với mỗi stop, tìm học sinh trong bán kính và giới hạn số lượng
      const suggestions = [];
      const assignedStudentIds = new Set(); // Track để tránh duplicate

      for (const stop of routeStops) {
        if (!stop.viDo || !stop.kinhDo || isNaN(stop.viDo) || isNaN(stop.kinhDo)) {
          console.warn(`[RouteService] assignStudentsToStops: Stop ${stop.maDiem} has invalid coordinates, skipping`);
          continue;
        }

        // Tìm học sinh gần stop này (trong bán kính MAX_DISTANCE_KM)
        const nearbyStudents = [];
        for (const student of studentsWithCoords) {
          const distance = calculateDistance(
            student.viDo,
            student.kinhDo,
            stop.viDo,
            stop.kinhDo
          );

          if (distance <= MAX_DISTANCE_KM) {
            nearbyStudents.push({
              student,
              distance,
            });
          }
        }

        // Sắp xếp theo khoảng cách (gần nhất trước)
        nearbyStudents.sort((a, b) => a.distance - b.distance);

        // 🔥 GIỚI HẠN: Chỉ lấy top MAX_STUDENTS_PER_STOP học sinh gần nhất
        const topStudents = nearbyStudents.slice(0, MAX_STUDENTS_PER_STOP);

        // Thêm suggestions cho học sinh gần stop này (chỉ top students)
        for (const { student, distance } of topStudents) {
          // Một học sinh có thể được gán vào nhiều stops (để admin chọn sau)
          // Nhưng tránh duplicate exact (maTuyen, maHocSinh, maDiemDung)
          const suggestionKey = `${routeId}_${student.maHocSinh}_${stop.maDiem}`;
          if (!assignedStudentIds.has(suggestionKey)) {
            suggestions.push({
              maTuyen: routeId,
              maDiemDung: stop.maDiem,
              maHocSinh: student.maHocSinh,
            });
            assignedStudentIds.add(suggestionKey);
          }
        }

        console.log(`[RouteService] assignStudentsToStops: Stop ${stop.maDiem} (${stop.tenDiem}): ${nearbyStudents.length} nearby students, assigned ${topStudents.length} (max ${MAX_STUDENTS_PER_STOP})`);
      }

      if (suggestions.length === 0) {
        console.warn(`[RouteService] assignStudentsToStops: No students found within ${MAX_DISTANCE_KM}km of any stop`);
        return 0;
      }

      // Lưu suggestions vào DB
      const StudentStopSuggestionModel = (await import("../models/StudentStopSuggestionModel.js")).default;
      const affectedRows = await StudentStopSuggestionModel.bulkCreate(suggestions);

      console.log(`[RouteService] assignStudentsToStops: ✅ Created ${affectedRows} suggestions for route ${routeId} (${suggestions.length} unique suggestions)`);

      // 🔥 Lưu vào HocSinh_DiemDung (mapping độc lập) - mỗi học sinh chỉ gán vào 1 điểm dừng gần nhất
      try {
        // Lấy assignments hiện tại từ HocSinh_DiemDung
        const BusStopOptimizationService = (await import("./BusStopOptimizationService.js")).default;
        const existingAssignments = await BusStopOptimizationService.getAssignments();
        const existingAssignmentsMap = new Map();
        existingAssignments.forEach(a => {
          existingAssignmentsMap.set(a.maHocSinh, {
            maDiemDung: a.maDiemDung,
            khoangCachMet: a.khoangCachMet || 0,
          });
        });

        // Group suggestions theo học sinh để tìm điểm dừng gần nhất cho mỗi học sinh
        const suggestionsByStudent = new Map();
        for (const suggestion of suggestions) {
          const { maHocSinh, maDiemDung } = suggestion;
          
          if (!suggestionsByStudent.has(maHocSinh)) {
            suggestionsByStudent.set(maHocSinh, []);
          }
          suggestionsByStudent.get(maHocSinh).push(suggestion);
        }

        // Tạo assignments mới cho HocSinh_DiemDung - mỗi học sinh chỉ gán vào điểm dừng gần nhất
        const hocSinhDiemDungAssignments = [];

        for (const [maHocSinh, studentSuggestions] of suggestionsByStudent.entries()) {
          const student = studentsWithCoords.find(s => s.maHocSinh === maHocSinh);
          if (!student) continue;

          // Tìm điểm dừng gần nhất cho học sinh này
          let nearestSuggestion = null;
          let minDistanceMeters = Infinity;

          for (const suggestion of studentSuggestions) {
            const stop = routeStops.find(s => s.maDiem === suggestion.maDiemDung);
            if (!stop || !stop.viDo || !stop.kinhDo) continue;

            // Tính khoảng cách (mét)
            const distanceKm = calculateDistance(
              student.viDo,
              student.kinhDo,
              stop.viDo,
              stop.kinhDo
            );
            const distanceMeters = Math.round(distanceKm * 1000);

            if (distanceMeters < minDistanceMeters) {
              minDistanceMeters = distanceMeters;
              nearestSuggestion = {
                maHocSinh,
                maDiemDung: suggestion.maDiemDung,
                khoangCachMet: distanceMeters,
              };
            }
          }

          if (!nearestSuggestion) continue;

          // Kiểm tra xem học sinh đã có assignment trong HocSinh_DiemDung chưa
          const existingAssignment = existingAssignmentsMap.get(maHocSinh);
          
          if (!existingAssignment) {
            // Học sinh chưa có assignment → lưu vào
            hocSinhDiemDungAssignments.push(nearestSuggestion);
          } else {
            // Học sinh đã có assignment → chỉ update nếu khoảng cách mới gần hơn
            if (minDistanceMeters < existingAssignment.khoangCachMet) {
              hocSinhDiemDungAssignments.push(nearestSuggestion);
            }
          }
        }

        // Lưu vào HocSinh_DiemDung
        // Lưu ý: Mỗi học sinh chỉ nên có 1 assignment trong HocSinh_DiemDung (điểm dừng gần nhất)
        // Nếu học sinh đã có assignment với điểm dừng khác, cần xóa assignment cũ trước
        if (hocSinhDiemDungAssignments.length > 0) {
          const studentIds = hocSinhDiemDungAssignments.map(a => a.maHocSinh);
          
          // Xóa assignments cũ của các học sinh này (nếu có)
          await pool.query(
            `DELETE FROM HocSinh_DiemDung WHERE maHocSinh IN (${studentIds.map(() => "?").join(",")})`,
            studentIds
          );

          // Insert assignments mới
          const values = hocSinhDiemDungAssignments.map(a => 
            `(${a.maHocSinh}, ${a.maDiemDung}, ${a.khoangCachMet})`
          );
          
          const query = `
            INSERT INTO HocSinh_DiemDung (maHocSinh, maDiemDung, khoangCachMet)
            VALUES ${values.join(", ")}
          `;

          const [result] = await pool.query(query);
          console.log(`[RouteService] assignStudentsToStops: ✅ Saved ${result.affectedRows} assignments to HocSinh_DiemDung (${hocSinhDiemDungAssignments.length} students)`);
        } else {
          console.log(`[RouteService] assignStudentsToStops: No new assignments for HocSinh_DiemDung (all students already have closer assignments)`);
        }
      } catch (hocSinhDiemDungError) {
        console.warn(`[RouteService] assignStudentsToStops: ⚠️ Failed to save to HocSinh_DiemDung:`, hocSinhDiemDungError);
        // Không throw error - suggestions đã được lưu thành công
      }

      return affectedRows;
    } catch (error) {
      console.error(`[RouteService] assignStudentsToStops: ❌ Error assigning students to stops:`, error);
      console.error(`[RouteService] assignStudentsToStops: Error stack:`, error.stack);
      // Không throw error - route đã được tạo thành công, chỉ log warning
      return 0;
    }
  }

  /**
   * Rebuild polyline cho route (dùng Maps API)
   */
  static async rebuildPolyline(routeId, mapsService) {
    console.log(`[RouteService] Rebuilding polyline for route ${routeId}`);
    
    const route = await TuyenDuongModel.getById(routeId);
    if (!route) {
      console.error(`[RouteService] Route ${routeId} not found`);
      throw new Error("ROUTE_NOT_FOUND");
    }

    const stops = await RouteStopModel.getByRouteId(routeId);
    console.log(`[RouteService] Found ${stops.length} stops for route ${routeId}`);
    
    if (stops.length < 2) {
      console.error(`[RouteService] Route ${routeId} has insufficient stops: ${stops.length}`);
      throw new Error("INSUFFICIENT_STOPS");
    }

    // Sort stops by sequence to ensure correct order
    const sortedStops = stops.sort((a, b) => (a.thuTu || 0) - (b.thuTu || 0));

    // Validate stops have coordinates
    for (const stop of sortedStops) {
      if (!stop.viDo || !stop.kinhDo || isNaN(Number(stop.viDo)) || isNaN(Number(stop.kinhDo))) {
        console.error(`[RouteService] Stop ${stop.maDiem} has invalid coordinates:`, stop);
        throw new Error(`Stop ${stop.maDiem} has invalid coordinates`);
      }
    }

    // Origin = stop đầu tiên
    const origin = `${sortedStops[0].viDo},${sortedStops[0].kinhDo}`;
    // Destination = stop cuối cùng
    const destination = `${sortedStops[sortedStops.length - 1].viDo},${sortedStops[sortedStops.length - 1].kinhDo}`;
    // Waypoints = các stop ở giữa
    const waypoints = sortedStops.slice(1, -1).map((stop) => ({
      location: `${stop.viDo},${stop.kinhDo}`,
    }));

    console.log(`[RouteService] Calling Maps API:`, {
      origin,
      destination,
      waypointsCount: waypoints.length,
    });

    try {
      // Gọi Maps API với vehicleType="bus" để tối ưu cho xe buýt
      const directionsResult = await mapsService.getDirections({
        origin,
        destination,
        waypoints: waypoints.length > 0 ? waypoints : undefined,
        mode: "driving", // Mode driving phù hợp với xe buýt
        vehicleType: "bus", // Chỉ định loại xe là buýt
      });

      if (!directionsResult || !directionsResult.polyline) {
        console.error(`[RouteService] No polyline in directions result for route ${routeId}`);
        throw new Error("MAPS_API_ERROR");
      }

      console.log(`[RouteService] Got polyline for route ${routeId}, length: ${directionsResult.polyline.length}`);

      // Cập nhật polyline vào DB
      await TuyenDuongModel.update(routeId, {
        polyline: directionsResult.polyline,
      });

      console.log(`[RouteService] Successfully updated polyline for route ${routeId}`);

      return {
        polyline: directionsResult.polyline,
        updated: true,
        cached: directionsResult.cached || false,
      };
    } catch (error) {
      console.error(`[RouteService] Error rebuilding polyline for route ${routeId}:`, {
        message: error.message,
        stack: error.stack,
      });
      // Re-throw with more context
      if (error.message.includes("Maps API") || error.message.includes("MAPS_API")) {
        throw error; // Let controller handle Maps API errors
      }
      throw error;
    }
  }
}

export default RouteService;
