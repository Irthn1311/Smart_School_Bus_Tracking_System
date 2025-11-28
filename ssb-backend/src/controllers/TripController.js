import ChuyenDiModel from "../models/ChuyenDiModel.js";
import LichTrinhModel from "../models/LichTrinhModel.js";
import TrangThaiHocSinhModel from "../models/TrangThaiHocSinhModel.js";
import XeBuytModel from "../models/XeBuytModel.js";
import TaiXeModel from "../models/TaiXeModel.js";
import TuyenDuongModel from "../models/TuyenDuongModel.js";
import RouteStopModel from "../models/RouteStopModel.js";
import HocSinhModel from "../models/HocSinhModel.js";
import ThongBaoModel from "../models/ThongBaoModel.js"; // M5: Send notifications to parents
import TripStopStatusModel from "../models/TripStopStatusModel.js"; // Store stop arrival/departure times
import ScheduleStudentStopModel from "../models/ScheduleStudentStopModel.js"; // Schedule student stop mapping
import tripService from "../services/tripService.js"; // kết nối tới service xử lý logic trip
import TelemetryService from "../services/telemetryService.js"; // clear cache khi trip ends
import * as response from "../utils/response.js"; // M4-M6: Response envelope

class TripController {
  // Helper: Kiểm tra xem stop có phải điểm cuối không
  static async isLastStop(tripId, stopSequence) {
    try {
      const trip = await ChuyenDiModel.getById(tripId);
      if (!trip) return false;

      const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
      if (!schedule) return false;

      const maxSequence = await RouteStopModel.getMaxSequence(schedule.maTuyen);
      return parseInt(stopSequence) === maxSequence;
    } catch (error) {
      console.error("[TripController] Error in isLastStop:", error);
      return false;
    }
  }

  // Helper: Lấy loại chuyến đi (don_sang/tra_chieu)
  static async getTripType(tripId) {
    try {
      const trip = await ChuyenDiModel.getById(tripId);
      if (!trip) return null;

      const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
      return schedule?.loaiChuyen || null;
    } catch (error) {
      console.error("[TripController] Error in getTripType:", error);
      return null;
    }
  }

  // Lịch sử chuyến đi cho phụ huynh (các chuyến có con tham gia)
  static async getHistory(req, res) {
    try {
      const userId = req.user?.userId;
      const { from, to, page = 1, limit = 10 } = req.query;

      // Lấy danh sách con của phụ huynh
      const children = await HocSinhModel.getByParent(userId);
      const childIds = children.map((c) => c.maHocSinh);
      if (childIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: Number(limit),
          },
        });
      }

      // Truy vấn lịch sử các chuyến có con tham gia
      const pool = (await import("../config/db.js")).default;
      const params = [childIds];
      let where = "tth.maHocSinh IN (?)";
      if (from) {
        where += " AND cd.ngayChay >= ?";
        params.push(from);
      }
      if (to) {
        where += " AND cd.ngayChay <= ?";
        params.push(to);
      }

      const [rows] = await pool.query(
        `SELECT cd.maChuyen, cd.ngayChay, cd.trangThai,
                lt.loaiChuyen, lt.gioKhoiHanh,
                td.tenTuyen,
                xb.bienSoXe,
                tth.maHocSinh, hs.hoTen as tenHocSinh, tth.trangThai as trangThaiHocSinh
         FROM TrangThaiHocSinh tth
         JOIN ChuyenDi cd ON tth.maChuyen = cd.maChuyen
         JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
         JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
         JOIN XeBuyt xb ON lt.maXe = xb.maXe
         JOIN HocSinh hs ON tth.maHocSinh = hs.maHocSinh
         WHERE ${where}
         ORDER BY cd.ngayChay DESC, lt.gioKhoiHanh DESC`,
        params
      );

      // Phân trang tại controller (có thể tối ưu SQL sau)
      const total = rows.length;
      const start = (Number(page) - 1) * Number(limit);
      const data = rows.slice(start, start + Number(limit));

      return res.status(200).json({
        success: true,
        data,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
          itemsPerPage: Number(limit),
        },
      });
    } catch (error) {
      console.error("TripController.getHistory error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }
  // Lấy danh sách tất cả chuyến đi (M4-M6: Chuẩn hóa pagination)
  static async getAll(req, res) {
    try {
      const {
        page = 1,
        pageSize = 10,
        q, // search query
        ngayChay,
        trangThai,
        maTuyen,
        maXe,
        maTaiXe,
        sortBy = "ngayChay",
        sortOrder = "desc",
      } = req.query;

      // Normalize query params
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limit = Math.max(
        1,
        Math.min(200, parseInt(pageSize) || parseInt(req.query.limit) || 10)
      );
      const search = q || req.query.search;
      const sortDir = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

      // 🔥 FIX: Tự động tạo ChuyenDi từ LichTrinh nếu chưa có khi driver xem lịch trình hôm nay
      console.log("🔍 [TripController.getTrips] Query params:", {
        ngayChay,
        maTaiXe,
        trangThai,
        page,
        pageSize,
      });

      if (ngayChay && maTaiXe) {
        try {
          console.log(
            "🔍 [Auto-create] Checking if need to auto-create trips for driver:",
            maTaiXe,
            "date:",
            ngayChay
          );

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const queryDate = new Date(ngayChay);
          queryDate.setHours(0, 0, 0, 0);

          console.log(
            "🔍 [Auto-create] Date comparison - today:",
            today.toISOString(),
            "queryDate:",
            queryDate.toISOString()
          );

          // Chỉ tự động tạo nếu ngày query là hôm nay hoặc tương lai
          if (queryDate >= today) {
            // Lấy tất cả LichTrinh của driver cho ngày này
            const schedules = await LichTrinhModel.getByDriver(maTaiXe);
            const schedulesForDate = schedules.filter((s) => {
              const scheduleDate = new Date(s.ngayChay);
              scheduleDate.setHours(0, 0, 0, 0);
              return (
                scheduleDate.getTime() === queryDate.getTime() && s.dangApDung
              );
            });

            // Tạo ChuyenDi cho mỗi LichTrinh chưa có ChuyenDi
            for (const schedule of schedulesForDate) {
              const existingTrip = await ChuyenDiModel.getByScheduleAndDate(
                schedule.maLichTrinh,
                ngayChay
              );
              if (!existingTrip) {
                try {
                  const tripId = await ChuyenDiModel.create({
                    maLichTrinh: schedule.maLichTrinh,
                    ngayChay,
                    trangThai: "chua_khoi_hanh",
                    ghiChu: null,
                  });
                  console.log(
                    `✅ [Auto-create] Tạo ChuyenDi ${tripId} từ LichTrinh ${schedule.maLichTrinh} cho driver ${maTaiXe}, ngayChay: ${ngayChay}`
                  );
                } catch (createError) {
                  console.error(
                    `⚠️ [Auto-create] Không thể tạo ChuyenDi từ LichTrinh ${schedule.maLichTrinh}:`,
                    createError.message
                  );
                }
              }
            }
          }
        } catch (autoCreateError) {
          // Log lỗi nhưng không fail request
          console.error(
            `⚠️ [Auto-create] Lỗi khi tự động tạo ChuyenDi:`,
            autoCreateError.message
          );
        }
      } else {
        console.log("⚠️ [Auto-create] Skipping auto-create - missing params:", {
          hasNgayChay: !!ngayChay,
          hasMaTaiXe: !!maTaiXe,
        });
      }

      // Dùng SQL-level filter
      const filters = {
        ngayChay,
        trangThai,
        maTuyen,
        maXe,
        maTaiXe,
        search, // Thêm search nếu cần
      };

      console.log(
        "🔍 [TripController.getTrips] Querying with filters:",
        filters
      );

      // Use service if available, otherwise fallback to model
      let result;
      if (tripService && tripService.list) {
        result = await tripService.list({
          page: pageNum,
          limit,
          ...filters,
        });
      } else {
        // Fallback: Get all then filter
        let trips = await ChuyenDiModel.getAll(filters);
        let totalCount = trips.length;

        // Search filter (nếu có)
        if (search) {
          trips = trips.filter(
            (t) =>
              t.tenTuyen?.toLowerCase().includes(search.toLowerCase()) ||
              t.bienSoXe?.toLowerCase().includes(search.toLowerCase()) ||
              t.tenTaiXe?.toLowerCase().includes(search.toLowerCase())
          );
          totalCount = trips.length;
        }

        // Sort (simple client-side sort)
        trips.sort((a, b) => {
          const aVal = a[sortBy] || "";
          const bVal = b[sortBy] || "";
          if (sortDir === "ASC") {
            return aVal > bVal ? 1 : -1;
          }
          return aVal < bVal ? 1 : -1;
        });

        // Pagination
        const offset = (pageNum - 1) * limit;
        const paginatedTrips = trips.slice(offset, offset + limit);

        result = {
          data: paginatedTrips,
          pagination: {
            page: pageNum,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        };
      }

      // 🔥 FIX: Tự động copy students từ schedule sang trip nếu trip không có students
      // Chỉ làm cho trips hôm nay hoặc tương lai để tránh ảnh hưởng đến trips cũ
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const trip of result.data) {
        // Kiểm tra nếu trip không có students và có schedule
        if (trip.soHocSinh === 0 && trip.maLichTrinh) {
          const tripDate = new Date(trip.ngayChay);
          tripDate.setHours(0, 0, 0, 0);

          // Chỉ copy cho trips hôm nay hoặc tương lai
          if (tripDate >= today) {
            try {
              const ScheduleStudentStopModel = (
                await import("../models/ScheduleStudentStopModel.js")
              ).default;
              const copiedCount = await ScheduleStudentStopModel.copyToTrip(
                trip.maLichTrinh,
                trip.maChuyen
              );
              if (copiedCount > 0) {
                console.log(
                  `[TripController.getAll] ✅ Auto-copied ${copiedCount} students from schedule ${trip.maLichTrinh} to trip ${trip.maChuyen}`
                );
                // Cập nhật soHocSinh trong result
                trip.soHocSinh = copiedCount;
              }
            } catch (copyError) {
              console.error(
                `[TripController.getAll] ⚠️ Failed to auto-copy students for trip ${trip.maChuyen}:`,
                copyError
              );
              // Continue - không fail request
            }
          }
        }
      }

      console.log(
        "✅ [TripController.getTrips] Final result - trips count:",
        result.data.length
      );
      console.log(
        "✅ [TripController.getTrips] Trip IDs:",
        result.data.map((t) => t.maChuyen)
      );

      return response.ok(res, result.data, {
        page: pageNum,
        pageSize: limit,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
        sortBy,
        sortOrder: sortOrder.toLowerCase(),
        q: search || null,
      });
    } catch (error) {
      console.error("❌ [TripController.getTrips] Error:", error);
      return response.serverError(
        res,
        "Lỗi server khi lấy danh sách chuyến đi",
        error
      );
    }
  }

  // Lấy thông tin chi tiết một chuyến đi (M4-M6: Response envelope)
  static async getById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return response.validationError(res, "Mã chuyến đi là bắt buộc", [
          { field: "id", message: "Mã chuyến đi không được để trống" },
        ]);
      }

      const trip = await (tripService && tripService.getById
        ? tripService.getById(id)
        : ChuyenDiModel.getById(id));

      if (!trip) {
        return response.notFound(res, "Không tìm thấy chuyến đi");
      }

      // Lấy thông tin chi tiết lịch trình
      const schedule = await LichTrinhModel.getById(trip.maLichTrinh);

      // Lấy thông tin xe buýt và tài xế
      const busInfo = schedule
        ? await XeBuytModel.getById(schedule.maXe)
        : null;
      const driverInfo = schedule
        ? await TaiXeModel.getById(schedule.maTaiXe)
        : null;
      const routeInfo = schedule
        ? await TuyenDuongModel.getById(schedule.maTuyen)
        : null;

      // Lấy danh sách điểm dừng của tuyến đường
      let routeStops = [];
      if (routeInfo && routeInfo.maTuyen) {
        routeStops = await RouteStopModel.getByRouteId(routeInfo.maTuyen);
      }

      // Lấy danh sách học sinh trong chuyến đi
      let students = await TrangThaiHocSinhModel.getByTripId(id);

      // 🔥 TASK 4: Fallback đơn giản - chỉ copy từ schedule, không auto-assign từ route
      // Flow chuẩn: Schedule → Trip → Driver
      // Nếu trip không có students, thử copy từ schedule_student_stops một lần
      if (students.length === 0 && schedule && schedule.maLichTrinh) {
        console.log(
          `[TripController.getById] Trip ${id} has no students, trying to copy from schedule ${schedule.maLichTrinh}...`
        );
        try {
          const ScheduleStudentStopModel = (
            await import("../models/ScheduleStudentStopModel.js")
          ).default;

          // Kiểm tra schedule có students không
          const scheduleStudents =
            await ScheduleStudentStopModel.getByScheduleId(
              schedule.maLichTrinh
            );
          console.log(
            `[TripController.getById] Schedule ${schedule.maLichTrinh} has ${scheduleStudents.length} students`
          );

          if (scheduleStudents.length > 0) {
            // Copy từ schedule sang trip
            const copiedCount = await ScheduleStudentStopModel.copyToTrip(
              schedule.maLichTrinh,
              id
            );
            if (copiedCount > 0) {
              console.log(
                `[TripController.getById] ✅ Copied ${copiedCount} students from schedule ${schedule.maLichTrinh} to trip ${id}`
              );
              // Reload students sau khi copy
              students = await TrangThaiHocSinhModel.getByTripId(id);
            } else {
              console.warn(
                `[TripController.getById] ⚠️ Failed to copy students (copiedCount = 0)`
              );
            }
          } else {
            console.warn(
              `[TripController.getById] ⚠️ Schedule ${schedule.maLichTrinh} has no students assigned. Trip will be returned with empty students list.`
            );
            // Không auto-assign nữa - việc đó là của ScheduleService khi tạo schedule
          }
        } catch (copyError) {
          console.error(
            `[TripController.getById] ⚠️ Failed to copy students from schedule:`,
            copyError
          );
          // Continue anyway - trip vẫn có thể được xem (nhưng không có students)
        }
      }

      // Nếu sau fallback vẫn không có students, log warning nhưng vẫn trả về trip
      if (students.length === 0) {
        console.warn(
          `[TripController.getById] ⚠️ Trip ${id} has no students after fallback. This may indicate a missing schedule assignment.`
        );
      }

      // 🔥 CHUẨN HÓA: Group học sinh theo điểm dừng với format rõ ràng
      const stopsWithStudents = routeStops.map((stop) => {
        // Match students với stop bằng thuTuDiemDon (sequence) - đây là cách chính xác nhất
        const stopStudents = students.filter((student) => {
          // Match chính xác theo sequence
          if (
            student.thuTuDiemDon &&
            stop.sequence &&
            student.thuTuDiemDon === stop.sequence
          ) {
            return true;
          }
          // Fallback: match theo index nếu sequence không khớp
          return false;
        });

        return {
          sequence: stop.sequence,
          maDiem: stop.maDiem || stop.stop_id,
          tenDiem: stop.tenDiem || stop.name,
          viDo: stop.viDo || stop.lat,
          kinhDo: stop.kinhDo || stop.lng,
          address: stop.address || stop.diaChi,
          studentCount: stopStudents.length,
          students: stopStudents.map((s) => ({
            maHocSinh: s.maHocSinh,
            hoTen: s.hoTen,
            lop: s.lop,
            trangThai: s.trangThai,
            anhDaiDien: s.anhDaiDien,
            thuTuDiemDon: s.thuTuDiemDon,
            thoiGianThucTe: s.thoiGianThucTe,
            ghiChu: s.ghiChu,
          })),
        };
      });

      // Tính tổng số học sinh theo trạng thái
      const totalStudents = students.length;
      // 🔥 FIX: Đã đón bao gồm cả da_don và da_tra (cho cả chuyến đi và về)
      const pickedCount = students.filter(
        (s) => s.trangThai === "da_don" || s.trangThai === "da_tra"
      ).length;
      const absentCount = students.filter((s) => s.trangThai === "vang").length;
      const waitingCount = students.filter(
        (s) => s.trangThai === "cho_don"
      ).length;
      const droppedCount = students.filter(
        (s) => s.trangThai === "da_tra"
      ).length;

      return response.ok(res, {
        trip: {
          maChuyen: trip.maChuyen,
          maLichTrinh: trip.maLichTrinh,
          ngayChay: trip.ngayChay,
          trangThai: trip.trangThai,
          gioBatDauThucTe: trip.gioBatDauThucTe,
          gioKetThucThucTe: trip.gioKetThucThucTe,
          ghiChu: trip.ghiChu,
          // 🔥 FIX: Thêm currentStop và diemHienTai để frontend có thể cập nhật route guidance
          currentStop:
            trip.diemHienTai !== null && trip.diemHienTai !== undefined
              ? trip.diemHienTai
              : 0, // Default to 0 if not set
          diemHienTai:
            trip.diemHienTai !== null && trip.diemHienTai !== undefined
              ? trip.diemHienTai
              : 0, // Default to 0 if not set
        },
        schedule: schedule
          ? {
              maLichTrinh: schedule.maLichTrinh,
              maTuyen: schedule.maTuyen,
              maXe: schedule.maXe,
              maTaiXe: schedule.maTaiXe,
              loaiChuyen: schedule.loaiChuyen,
              gioKhoiHanh: schedule.gioKhoiHanh,
              ngayChay: schedule.ngayChay,
            }
          : null,
        route: routeInfo
          ? {
              maTuyen: routeInfo.maTuyen,
              tenTuyen: routeInfo.tenTuyen,
              diemBatDau: routeInfo.diemBatDau,
              diemKetThuc: routeInfo.diemKetThuc,
            }
          : null,
        busInfo: busInfo
          ? {
              maXe: busInfo.maXe,
              bienSoXe: busInfo.bienSoXe,
              dongXe: busInfo.dongXe,
              sucChua: busInfo.sucChua,
            }
          : null,
        driverInfo: driverInfo
          ? {
              maTaiXe: driverInfo.maTaiXe,
              hoTen: driverInfo.hoTen, // Field từ NguoiDung, không phải tenTaiXe
              soDienThoai: driverInfo.soDienThoai,
            }
          : null,
        stops: stopsWithStudents, // 🔥 Format chuẩn: stops[] với studentCount và students[]
        summary: {
          totalStudents,
          pickedCount,
          absentCount,
          waitingCount,
          droppedCount,
        },
        // Legacy: giữ lại để backward compatibility
        students: students,
        routeInfo: routeInfo
          ? {
              ...routeInfo,
              diemDung: stopsWithStudents,
            }
          : null,
      });
    } catch (error) {
      if (error.message === "TRIP_NOT_FOUND") {
        return response.notFound(res, "Không tìm thấy chuyến đi");
      }
      console.error("Error in TripController.getById:", error);
      return response.serverError(
        res,
        "Lỗi server khi lấy thông tin chuyến đi",
        error
      );
    }
  }

  // Tạo chuyến đi mới từ schedule (M4-M6: Response envelope + WS event)
  static async create(req, res) {
    try {
      const {
        maLichTrinh,
        ngayChay,
        trangThai = "chua_khoi_hanh", // M4-M6: planned (map từ chua_khoi_hanh)
        ghiChu = null,
      } = req.body;

      // Validation dữ liệu bắt buộc
      if (!maLichTrinh || !ngayChay) {
        return response.validationError(
          res,
          "Mã lịch trình và ngày chạy là bắt buộc",
          [
            {
              field: "maLichTrinh",
              message: "Mã lịch trình không được để trống",
            },
            { field: "ngayChay", message: "Ngày chạy không được để trống" },
          ]
        );
      }

      // Validation ngày chạy
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(ngayChay)) {
        return response.validationError(
          res,
          "Ngày chạy phải có định dạng YYYY-MM-DD",
          [{ field: "ngayChay", message: "Format: YYYY-MM-DD" }]
        );
      }

      // Use service if available
      let trip;
      try {
        if (tripService && tripService.create) {
          trip = await tripService.create({
            maLichTrinh,
            ngayChay,
            trangThai,
            ghiChu,
          });
        } else {
          // Fallback to model
          const schedule = await LichTrinhModel.getById(maLichTrinh);
          if (!schedule) {
            return response.notFound(res, "Không tìm thấy lịch trình");
          }

          if (!schedule.dangApDung) {
            return response.validationError(
              res,
              "Lịch trình không đang được áp dụng",
              [
                {
                  field: "maLichTrinh",
                  message: "Lịch trình phải đang được áp dụng",
                },
              ]
            );
          }

          // Check if trip already exists for this schedule + date
          const existing = await ChuyenDiModel.getByScheduleAndDate(
            maLichTrinh,
            ngayChay
          );
          if (existing) {
            return response.error(
              res,
              "TRIP_ALREADY_EXISTS",
              "Chuyến đi đã tồn tại cho lịch trình và ngày này",
              409
            );
          }

          const tripId = await ChuyenDiModel.create({
            maLichTrinh,
            ngayChay,
            trangThai,
            ghiChu,
          });
          trip = await ChuyenDiModel.getById(tripId);
        }
      } catch (serviceError) {
        if (serviceError.message === "SCHEDULE_NOT_FOUND") {
          return response.notFound(res, "Không tìm thấy lịch trình");
        }
        if (serviceError.message === "MISSING_REQUIRED_FIELDS") {
          return response.validationError(res, "Thiếu trường bắt buộc", [
            { field: "maLichTrinh", message: "Mã lịch trình là bắt buộc" },
            { field: "ngayChay", message: "Ngày chạy là bắt buộc" },
          ]);
        }
        throw serviceError;
      }

      // M4-M6: Emit WS event trip_created
      const io = req.app.get("io");
      if (io && trip) {
        const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
        if (schedule) {
          io.to(`trip-${trip.maChuyen}`).emit("trip_created", {
            tripId: trip.maChuyen,
            scheduleId: maLichTrinh,
            busId: schedule.maXe,
            driverId: schedule.maTaiXe,
            routeId: schedule.maTuyen,
            date: ngayChay,
            status: trangThai,
            timestamp: new Date().toISOString(),
          });
          // Also notify role-admin
          io.to("role-quan_tri").emit("trip_created", {
            tripId: trip.maChuyen,
            scheduleId: maLichTrinh,
            busId: schedule.maXe,
            driverId: schedule.maTaiXe,
            routeId: schedule.maTuyen,
            date: ngayChay,
            status: trangThai,
            timestamp: new Date().toISOString(),
          });
        }
      }

      return response.created(res, trip);
    } catch (error) {
      console.error("Error in TripController.create:", error);
      return response.serverError(res, "Lỗi server khi tạo chuyến đi", error);
    }
  }

  // Cập nhật chuyến đi
  static async update(req, res) {
    try {
      const { id } = req.params;
      const {
        maLichTrinh,
        ngayChay,
        trangThai,
        gioBatDauThucTe,
        gioKetThucThucTe,
        ghiChu,
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Mã chuyến đi là bắt buộc",
        });
      }

      // Kiểm tra chuyến đi có tồn tại không
      const existingTrip = await ChuyenDiModel.getById(id);
      if (!existingTrip) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy chuyến đi",
        });
      }

      // Validation ngày chạy nếu có thay đổi
      if (ngayChay) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(ngayChay)) {
          return res.status(400).json({
            success: false,
            message: "Ngày chạy phải có định dạng YYYY-MM-DD",
          });
        }
      }

      // Validation trạng thái nếu có thay đổi
      if (trangThai) {
        const validStatuses = [
          "chua_khoi_hanh",
          "dang_chay",
          "hoan_thanh",
          "bi_huy",
        ];
        if (!validStatuses.includes(trangThai)) {
          return res.status(400).json({
            success: false,
            message: "Trạng thái không hợp lệ",
            validStatuses,
          });
        }
      }

      // Kiểm tra lịch trình nếu có thay đổi
      if (maLichTrinh && maLichTrinh !== existingTrip.maLichTrinh) {
        const schedule = await LichTrinhModel.getById(maLichTrinh);
        if (!schedule) {
          return res.status(404).json({
            success: false,
            message: "Không tìm thấy lịch trình",
          });
        }
      }

      // Kiểm tra chuyến đi trùng lặp nếu có thay đổi lịch trình hoặc ngày
      const checkSchedule = maLichTrinh || existingTrip.maLichTrinh;
      const checkDate = ngayChay || existingTrip.ngayChay;

      if (maLichTrinh || ngayChay) {
        const duplicateTrip = await ChuyenDiModel.getByScheduleAndDate(
          checkSchedule,
          checkDate
        );
        if (duplicateTrip && duplicateTrip.maChuyen !== id) {
          return res.status(409).json({
            success: false,
            message: "Chuyến đi đã tồn tại cho lịch trình này trong ngày",
          });
        }
      }

      const updateData = {};
      if (maLichTrinh !== undefined) updateData.maLichTrinh = maLichTrinh;
      if (ngayChay !== undefined) updateData.ngayChay = ngayChay;
      if (trangThai !== undefined) updateData.trangThai = trangThai;
      if (gioBatDauThucTe !== undefined)
        updateData.gioBatDauThucTe = gioBatDauThucTe;
      if (gioKetThucThucTe !== undefined)
        updateData.gioKetThucThucTe = gioKetThucThucTe;
      if (ghiChu !== undefined) updateData.ghiChu = ghiChu;

      const isUpdated = await ChuyenDiModel.update(id, updateData);

      if (!isUpdated) {
        return res.status(400).json({
          success: false,
          message: "Không thể cập nhật chuyến đi",
        });
      }

      const updatedTrip = await ChuyenDiModel.getById(id);

      res.status(200).json({
        success: true,
        data: updatedTrip,
        message: "Cập nhật chuyến đi thành công",
      });
    } catch (error) {
      console.error("Error in TripController.update:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi cập nhật chuyến đi",
        error: error.message,
      });
    }
  }

  // Xóa chuyến đi
  static async delete(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Mã chuyến đi là bắt buộc",
        });
      }

      // Kiểm tra chuyến đi có tồn tại không
      const existingTrip = await ChuyenDiModel.getById(id);
      if (!existingTrip) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy chuyến đi",
        });
      }

      // Kiểm tra chuyến đi có đang chạy không
      if (existingTrip.trangThai === "dang_chay") {
        return res.status(409).json({
          success: false,
          message: "Không thể xóa chuyến đi đang chạy",
        });
      }

      // Kiểm tra có học sinh nào đang trong chuyến đi không
      const studentsInTrip = await TrangThaiHocSinhModel.getByTripId(id);
      if (studentsInTrip.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Không thể xóa chuyến đi có học sinh tham gia",
          data: { studentsCount: studentsInTrip.length },
        });
      }

      const isDeleted = await ChuyenDiModel.delete(id);

      if (!isDeleted) {
        return res.status(400).json({
          success: false,
          message: "Không thể xóa chuyến đi",
        });
      }

      res.status(200).json({
        success: true,
        message: "Xóa chuyến đi thành công",
      });
    } catch (error) {
      console.error("Error in TripController.delete:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi xóa chuyến đi",
        error: error.message,
      });
    }
  }

  // Bắt đầu chuyến đi
  /**
   * 🚀 START TRIP - Controller xử lý request bắt đầu chuyến
   *
   * 🎯 MỤC ĐÍCH:
   * - Nhận HTTP request từ driver app
   * - Gọi service để xử lý logic nghiệp vụ
   * - Trả response về client
   * - Emit Socket.IO event (Day 3)
   *
   * 📖 CÁCH HOẠT ĐỘNG:
   *
   * Controller có 3 nhiệm vụ chính:
   * 1. NHẬN REQUEST (req):
   *    - Lấy tripId từ URL params
   *    - Lấy gioBatDauThucTe từ body (optional)
   *    - Lấy user từ JWT token (req.user - từ middleware)
   *
   * 2. GỌI SERVICE:
   *    - Gọi tripService.startTrip(tripId)
   *    - Service xử lý tất cả logic nghiệp vụ
   *    - Nhận về trip object đã cập nhật
   *
   * 3. TRẢ RESPONSE (res):
   *    - Tạo JSON response
   *    - Set HTTP status code (200, 404, 500...)
   *    - Gửi về client
   *
   * 🔄 FLOW HOẠT ĐỘNG:
   * ```
   * POST /api/trips/123/start
   *   ↓
   * AuthMiddleware.authenticate → Verify JWT
   *   ↓
   * TripController.startTrip(req, res) ← ĐÂY!
   *   ↓
   * Step 1: Lấy tripId = req.params.id
   *   ↓
   * Step 2: Gọi tripService.startTrip(tripId)
   *   ↓ (Service xử lý logic)
   * Step 3: Nhận trip object từ service
   *   ↓
   * Step 4: Emit Socket.IO event (Day 3)
   *   ↓
   * Step 5: res.json({ success: true, trip })
   * ```
   *
   * 💡 TẠI SAO CONTROLLER NGẮN GỌN?
   * - Controller CHỈ xử lý HTTP request/response
   * - Logic nghiệp vụ → Service
   * - Database query → Model
   * - Nguyên tắc: Thin Controller, Fat Service
   *
   * 🧪 VÍ DỤ REQUEST/RESPONSE:
   *
   * Request:
   * ```http
   * POST /api/trips/123/start
   * Headers: {
   *   Authorization: Bearer eyJhbGci...
   * }
   * Body: {} (hoặc { "gioBatDauThucTe": "08:00" })
   * ```
   *
   * Response Success (200):
   * ```json
   * {
   *   "success": true,
   *   "message": "Trip started",
   *   "trip": {
   *     "maChuyen": 123,
   *     "trangThai": "dang_chay",
   *     "gioBatDauThucTe": "08:30"
   *   }
   * }
   * ```
   *
   * Response Error (404):
   * ```json
   * {
   *   "success": false,
   *   "message": "Không tìm thấy chuyến đi"
   * }
   * ```
   *
   * @method POST
   * @param {Object} req - Express request object (được tạo bởi Express khi có request)
   * @param {Object} req.params - URL parameters (được lấy từ đường dẫn)
   * @param {string} req.params.id - Trip ID (maChuyen) (lấy từ /api/trips/:id/start)
   * @param {Object} req.body - Request body (optional) (được gửi từ client)
   * @param {string} req.body.gioBatDauThucTe - Start time override (optional) (lấy từ body)
   * @param {Object} req.user - User from JWT (set by AuthMiddleware) (lấy từ middleware)
   * @param {Object} res - Express response object (được tạo bởi Express để trả về client)
   *
   * @returns {void} Trả response về client qua res.json()
   */
  static async startTrip(req, res) {
    try {
      /**
       * 📥 BƯỚC 1: LẤY DỮ LIỆU TỪ REQUEST
       *
       * Giải thích:
       * - req.params.id: Lấy từ URL /api/trips/:id/start
       *   VD: /api/trips/123/start → id = "123"
       *
       * - req.body.gioBatDauThucTe: Lấy từ JSON body (optional)
       *   VD: { "gioBatDauThucTe": "08:00" }
       *   Dùng khi driver muốn ghi đè thời gian (hiếm khi dùng)
       *
       * - req.user: Được set bởi AuthMiddleware.authenticate
       *   VD: { maNguoiDung: 5, email: "driver@ssb.vn", vaiTro: "tai_xe" }
       *   Dùng để check quyền (Day 3)
       *
       * Destructuring syntax:
       * const { id } = req.params;
       * ↓ Tương đương:
       * const id = req.params.id;
       */
      const { id } = req.params; // Trip ID từ URL
      console.log(
        `🚀 [M5 DEBUG] startTrip API called for trip ${id} by user ${req.user?.email}`
      );

      const { gioBatDauThucTe } = req.body; // Optional start time

      /**
       * ✅ VALIDATION: Kiểm tra tripId có được gửi không
       *
       * Giải thích:
       * - Express tự động parse :id từ URL
       * - Nhưng cần check để chắc chắn
       * - Nếu không có id → Trả 400 Bad Request
       *
       * Tại sao cần check?
       * - Tránh gọi service với undefined
       * - Trả lỗi rõ ràng cho client
       * - Best practice: Validate đầu vào
       */
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Mã chuyến đi là bắt buộc",
        });
      }

      /**
       * 🔧 BƯỚC 2: GỌI SERVICE XỬ LÝ LOGIC
       *
       * Giải thích:
       * - tripService.startTrip(id): Hàm async, trả về Promise
       * - await: Chờ service hoàn thành
       * - Service sẽ:
       *   + Check trip tồn tại
       *   + Check trạng thái hợp lệ
       *   + Update database
       *   + Trả về trip object
       *
       * Nếu service throw error → Catch block sẽ bắt
       *
       * Note: Hiện tại chưa dùng gioBatDauThucTe
       * Day 4 sẽ bổ sung logic override thời gian
       */
      // Kiểm tra chuyến đi tồn tại
      const existing = await ChuyenDiModel.getById(id);
      console.log(
        `🔍 [M5 DEBUG] Trip ${id} status:`,
        existing ? existing.trangThai : "NOT FOUND"
      );

      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy chuyến đi" });
      }

      // Chỉ start khi đang 'chua_khoi_hanh'
      if (existing.trangThai !== "chua_khoi_hanh") {
        console.log(
          `❌ [M5 DEBUG] Trip ${id} cannot start - current status: ${existing.trangThai}`
        );

        // Provide specific error message based on current status
        let errorMessage = "Chỉ có thể bắt đầu chuyến đi chưa khởi hành";
        if (existing.trangThai === "hoan_thanh") {
          errorMessage = "Chuyến đi đã kết thúc";
        } else if (existing.trangThai === "dang_chay") {
          errorMessage = "Chuyến đi đã bắt đầu";
        } else if (existing.trangThai === "bi_huy") {
          errorMessage = "Chuyến đi đã bị hủy";
        }

        return res.status(400).json({
          success: false,
          message: errorMessage,
          errorCode: "TRIP_ALREADY_STARTED_OR_INVALID_STATUS",
          currentStatus: existing.trangThai,
          tripId: id,
        });
      }

      // 🔥 FIX #1: Check if driver has any active trip before allowing start
      const driverSchedule = await LichTrinhModel.getById(existing.maLichTrinh);
      if (driverSchedule && driverSchedule.maTaiXe) {
        const activeTrips = await ChuyenDiModel.getByDriverId(
          driverSchedule.maTaiXe,
          {
            trangThai: "dang_chay",
          }
        );

        // Filter out the current trip and check if there are other active trips
        const otherActiveTrips = activeTrips.filter(
          (trip) => trip.maChuyen !== parseInt(id)
        );

        if (otherActiveTrips.length > 0) {
          const activeTrip = otherActiveTrips[0];
          console.log(
            `❌ [M5 DEBUG] Driver ${driverSchedule.maTaiXe} already has active trip ${activeTrip.maChuyen}`
          );
          return res.status(400).json({
            success: false,
            message: `Bạn đang có chuyến đi đang chạy (Chuyến #${activeTrip.maChuyen}). Vui lòng kết thúc chuyến đi hiện tại trước khi bắt đầu chuyến mới.`,
            errorCode: "DRIVER_HAS_ACTIVE_TRIP",
            activeTripId: activeTrip.maChuyen,
            tripId: id,
          });
        }
      }

      console.log(
        `✅ [M5 DEBUG] Trip ${id} is ready to start (status: chua_khoi_hanh)`
      );

      const startTime = gioBatDauThucTe || new Date(); // TIMESTAMP

      // 🔥 FIX: Lấy route stops để xác định điểm dừng đầu tiên (sequence = 1)
      const schedule = await LichTrinhModel.getById(existing.maLichTrinh);
      const routeStops = schedule
        ? await RouteStopModel.getByRouteId(schedule.maTuyen)
        : [];
      const routeStopsSorted = routeStops.sort(
        (a, b) => a.sequence - b.sequence
      );
      const firstStop = routeStopsSorted.find((s) => s.sequence === 1);
      const firstStopSequence = firstStop ? 1 : null; // Điểm dừng đầu tiên có sequence = 1

      console.log(`[TripController] 🔍 startTrip - Setting diemHienTai:`, {
        tripId: id,
        routeStopsCount: routeStopsSorted.length,
        routeStopsSequences: routeStopsSorted.map((s) => s.sequence),
        firstStopFound: !!firstStop,
        firstStopSequence,
      });

      const updated = await ChuyenDiModel.update(id, {
        trangThai: "dang_chay",
        gioBatDauThucTe: startTime,
        diemHienTai: firstStopSequence, // 🔥 FIX: Set diemHienTai = 1 khi bắt đầu chuyến đi
      });

      if (!updated) {
        return res
          .status(400)
          .json({ success: false, message: "Không thể bắt đầu chuyến đi" });
      }

      const trip = await ChuyenDiModel.getById(id);
      // schedule đã được load ở trên, không cần load lại

      /**
       * 🔥 BƯỚC 2.5: XỬ LÝ CHUYẾN VỀ (tra_chieu) - Load học sinh từ chuyến đi sáng
       * Chỉ thực hiện khi chưa có học sinh trong chuyến về (tránh duplicate)
       */
      if (schedule?.loaiChuyen === "tra_chieu") {
        try {
          // Kiểm tra xem đã có học sinh trong chuyến về chưa
          const existingStudents = await TrangThaiHocSinhModel.getByTripId(id);
          if (existingStudents.length > 0) {
            console.log(
              `[TripController] Afternoon trip ${id} already has ${existingStudents.length} students, skipping load from morning trip`
            );
          } else {
            console.log(
              `[TripController] Processing afternoon trip ${id}, loading students from morning trip...`
            );

            // Tìm chuyến đi sáng cùng ngày, cùng route
            const pool = (await import("../config/db.js")).default;
            const [morningTrips] = await pool.query(
              `SELECT cd.maChuyen 
             FROM ChuyenDi cd
             JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
             WHERE lt.maTuyen = ? 
               AND lt.loaiChuyen = 'don_sang'
               AND DATE(cd.ngayChay) = DATE(?)
               AND cd.trangThai IN ('dang_chay', 'hoan_thanh')
             ORDER BY cd.gioBatDauThucTe DESC
             LIMIT 1`,
              [schedule.maTuyen, trip.ngayChay]
            );

            if (morningTrips.length > 0) {
              const morningTripId = morningTrips[0].maChuyen;
              console.log(
                `[TripController] Found morning trip ${morningTripId} for afternoon trip ${id}`
              );

              // Lấy học sinh đã được đón từ chuyến đi sáng (status = 'da_don')
              const morningStudents = await TrangThaiHocSinhModel.getByTripId(
                morningTripId
              );
              const pickedStudents = morningStudents.filter(
                (s) => s.trangThai === "da_don"
              );

              console.log(
                `[TripController] Found ${pickedStudents.length} students picked up in morning trip`
              );

              if (pickedStudents.length > 0) {
                // Lấy schedule_student_stops để biết điểm đã đón
                const scheduleStudents =
                  await ScheduleStudentStopModel.getByScheduleId(
                    schedule.maLichTrinh
                  );

                // Tạo TrangThaiHocSinh cho chuyến về với status = 'da_don' (đã có trên xe)
                for (const student of pickedStudents) {
                  // Tìm điểm đã đón từ schedule_student_stops của chuyến về
                  // Điểm trả = điểm đã đón (từ schedule_student_stops của chuyến về)
                  const scheduleStudent = scheduleStudents.find(
                    (ss) => ss.maHocSinh === student.maHocSinh
                  );
                  const thuTuDiemTra =
                    scheduleStudent?.thuTuDiem || student.thuTuDiemDon;

                  await TrangThaiHocSinhModel.create({
                    maChuyen: parseInt(id),
                    maHocSinh: student.maHocSinh,
                    thuTuDiemDon: thuTuDiemTra, // Điểm sẽ trả học sinh
                    trangThai: "da_don", // Đã có trên xe từ đầu
                    thoiGianThucTe: null,
                    ghiChu: "Đã lên xe từ chuyến đi sáng",
                  });
                }

                console.log(
                  `[TripController] ✅ Created ${pickedStudents.length} student statuses for afternoon trip`
                );
              }
            } else {
              console.warn(
                `[TripController] ⚠️ No morning trip found for route ${schedule.maTuyen} on ${trip.ngayChay}`
              );
            }
          }
        } catch (error) {
          console.error(
            `[TripController] ❌ Error loading students from morning trip:`,
            error
          );
          // Continue anyway - trip can still start without students
        }
      }

      /**
       * 📡 BƯỚC 3: EMIT SOCKET.IO EVENT (CHỜ DAY 3)
       *
       * Giải thích:
       * - req.app: Express application instance
       * - req.app.get("io"): Lấy Socket.IO instance đã mount trong server.js
       * - io.to(`bus-${busId}`): Chọn room để emit
       * - io.emit("trip_started", data): Gửi event cho clients trong room
       *
       * Tại sao chưa hoạt động?
       * - Socket.IO server chưa được setup (Day 3)
       * - req.app.get("io") sẽ return undefined
       *
       * Flow Day 3:
       * 1. Setup Socket.IO server trong server.js
       * 2. app.set("io", io) để lưu instance
       * 3. Controller lấy io và emit event
       * 4. FE nhận event → Update UI realtime
       *
       * Event payload:
       * {
       *   tripId: 123,
       *   busId: 5,
       *   driverId: 7,
       *   startTime: "08:30",
       *   timestamp: "2025-10-27T01:30:00Z"
       * }
       */
      const io = req.app.get("io");
      if (io) {
        // Lấy thông tin schedule để biết busId, driverId
        const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
        if (schedule) {
          // Emit event vào room bus-{busId}
          // Tất cả clients đang subscribe room này sẽ nhận
          io.to(`bus-${schedule.maXe}`).emit("trip_started", {
            tripId: id,
            busId: schedule.maXe,
            driverId: schedule.maTaiXe,
            startTime: trip.gioBatDauThucTe,
            timestamp: new Date().toISOString(),
          });
        }
      }

      /**
       * ✅ BƯỚC 3.5: GỬI NOTIFICATION CHO PHỤ HUYNH (M5)
       *
       * Giải thích:
       * - Lấy danh sách học sinh trong chuyến đi
       * - Lấy maPhuHuynh của từng học sinh
       * - Gửi notification hàng loạt cho tất cả phụ huynh
       * - Emit WebSocket event "notification:new" đến room user-{parentId}
       *
       * Expected flow:
       * 1. Get students in trip from TrangThaiHocSinh
       * 2. Get parent IDs from HocSinh table
       * 3. Create bulk notifications in ThongBao table
       * 4. Emit socket events to parent rooms
       */
      try {
        // Lấy danh sách học sinh trong chuyến
        const studentStatuses = await TrangThaiHocSinhModel.getByTripId(id);
        console.log(
          `[M5 DEBUG] Trip ${id}: Found ${
            studentStatuses?.length || 0
          } students`
        );

        if (studentStatuses && studentStatuses.length > 0) {
          const studentIds = studentStatuses.map((s) => s.maHocSinh);
          console.log(`[M5 DEBUG] Student IDs:`, studentIds);

          // Lấy thông tin phụ huynh
          const pool = (await import("../config/db.js")).default;
          const [students] = await pool.query(
            `SELECT DISTINCT h.maPhuHuynh, h.hoTen as tenHocSinh, n.hoTen as tenPhuHuynh
             FROM HocSinh h
             JOIN NguoiDung n ON h.maPhuHuynh = n.maNguoiDung
             WHERE h.maHocSinh IN (?) AND h.maPhuHuynh IS NOT NULL`,
            [studentIds]
          );
          console.log(`[M5 DEBUG] Found ${students.length} parents`);
          console.log(`[M5 DEBUG] Parent details:`, students);

          if (students.length > 0) {
            const parentIds = students.map((s) => s.maPhuHuynh);
            console.log(`[M5 DEBUG] Parent IDs:`, parentIds);

            // Lấy thông tin xe và tuyến để tạo notification chi tiết
            const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
            const bus = schedule
              ? await XeBuytModel.getById(schedule.maXe)
              : null;
            const route = schedule
              ? await TuyenDuongModel.getById(schedule.maTuyen)
              : null;
            const driver = schedule
              ? await TaiXeModel.getById(schedule.maTaiXe)
              : null;

            const startTimeFormatted = new Date(
              trip.gioBatDauThucTe
            ).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            });

            // Tạo notification content
            const tieuDe = "🚌 Chuyến đi đã bắt đầu!";
            const noiDung = `Xe buýt ${bus?.bienSoXe || ""} đã bắt đầu ${
              schedule?.loaiChuyen === "don_sang" ? "đón" : "đưa"
            } con bạn về ${
              route?.tenTuyen ? `(${route.tenTuyen})` : ""
            }. Thời gian: ${startTimeFormatted}${
              driver?.hoTen ? `. Tài xế: ${driver.hoTen}` : ""
            }.`;

            // Tạo bulk notifications
            await ThongBaoModel.createMultiple({
              danhSachNguoiNhan: parentIds,
              tieuDe,
              noiDung,
              loaiThongBao: "chuyen_di",
            });

            // Emit socket events to parent rooms
            const io = req.app.get("io");
            if (io) {
              console.log(
                `[M5 DEBUG] Emitting notification:new to ${parentIds.length} parents`
              );
              parentIds.forEach((parentId) => {
                const roomName = `user-${parentId}`;
                console.log(`[M5 DEBUG] Emitting to room: ${roomName}`);
                const notifData = {
                  maNguoiNhan: parentId,
                  tieuDe,
                  noiDung,
                  loaiThongBao: "chuyen_di",
                  tripId: id,
                  thoiGianGui: new Date(),
                  daDoc: false,
                };
                console.log(
                  `🔍 [TRIP] Emitting 'notification:new' to ${roomName}:`,
                  notifData
                );
                io.to(roomName).emit("notification:new", notifData);
              });
            } else {
              console.warn(`[M5 DEBUG] Socket.IO instance not found!`);
            }

            console.log(
              `✅ [M5] Sent trip_started notifications to ${parentIds.length} parents for trip ${id}`
            );
          }

          // 🔥 NEW: Tạo thông báo cho ADMIN
          try {
            const NguoiDungModel = (await import("../models/NguoiDungModel.js"))
              .default;
            const admins = await NguoiDungModel.getByRole("quan_tri");
            const adminIds = admins
              .map((a) => a.maNguoiDung)
              .filter((id) => id);

            if (adminIds.length > 0) {
              const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
              const bus = schedule
                ? await XeBuytModel.getById(schedule.maXe)
                : null;
              const route = schedule
                ? await TuyenDuongModel.getById(schedule.maTuyen)
                : null;
              const driver = schedule
                ? await TaiXeModel.getById(schedule.maTaiXe)
                : null;

              const startTime = new Date(
                trip.gioBatDauThucTe
              ).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              });

              await ThongBaoModel.createMultiple({
                danhSachNguoiNhan: adminIds,
                tieuDe: `🚌 Chuyến #${id} bắt đầu`,
                noiDung: `🚌 CHUYẾN ĐI BẮT ĐẦU\n\n🆔 Mã chuyến: #${id}\n🚗 Xe: ${
                  bus?.bienSoXe || "N/A"
                }\n🛣️ Tuyến: ${route?.tenTuyen || "N/A"}\n👨‍✈️ Tài xế: ${
                  driver?.hoTen || "N/A"
                }\n⏰ Khởi hành: ${startTime}`,
                loaiThongBao: "chuyen_di",
              });

              const io = req.app.get("io");
              if (io) {
                console.log(
                  `🔔 [NOTIFICATION DEBUG] Emitting trip_started to role-quan_tri`
                );
                console.log(`   Room: role-quan_tri`);
                console.log(`   Admin count: ${adminIds.length}`);
                console.log(`   Trip: #${id}`);

                io.to("role-quan_tri").emit("notification:new", {
                  tieuDe: `🚌 Chuyến #${id} bắt đầu`,
                  noiDung: `Xe ${bus?.bienSoXe || "N/A"} - ${
                    route?.tenTuyen || "N/A"
                  } lúc ${startTime}`,
                  loaiThongBao: "chuyen_di",
                  thoiGianTao: new Date().toISOString(),
                });
              }

              console.log(
                `📬 Sent trip_started notification to ${adminIds.length} admins`
              );
            }
          } catch (adminNotifError) {
            console.warn(
              "⚠️  Failed to send admin notification:",
              adminNotifError.message
            );
          }
        }
      } catch (notifError) {
        // Don't fail the whole request if notification fails
        console.error(
          "⚠️  [M5] Error sending trip_started notifications:",
          notifError
        );
      }

      /**
       * ✅ BƯỚC 4: TRẢ RESPONSE THÀNH CÔNG
       *
       * Giải thích:
       * - res.status(200): Set HTTP status = 200 OK
       * - res.json(): Tạo JSON response và gửi về client
       *
       * Response structure:
       * {
       *   success: true,        // Đánh dấu thành công
       *   message: "...",       // Message cho user
       *   trip: { ... }         // Data trip đã cập nhật
       * }
       *
       * Driver app sẽ nhận response này và:
       * - Hiển thị message "Trip started"
       * - Cập nhật UI: Nút "Bắt đầu" → "Đang chạy"
       * - Enable tính năng gửi GPS
       * - Bắt đầu tracking
       */
      res.status(200).json({
        success: true,
        data: trip,
        message: "Bắt đầu chuyến đi thành công",
      });
    } catch (error) {
      console.error("Error in TripController.startTrip:", error);
      console.error("Error stack:", error.stack);
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        tripId: req.params.id,
        userId: req.user?.userId,
      });
      return response.serverError(
        res,
        "Lỗi server khi bắt đầu chuyến đi",
        error
      );
    }
  }

  // Kết thúc chuyến đi (M4-M6: Response envelope + stats calculation + WS events)
  static async endTrip(req, res) {
    try {
      const { id } = req.params;
      const { gioKetThucThucTe, ghiChu } = req.body;

      if (!id) {
        return response.validationError(res, "Mã chuyến đi là bắt buộc", [
          { field: "id", message: "Mã chuyến đi không được để trống" },
        ]);
      }

      // Get trip first
      const trip = await ChuyenDiModel.getById(id);
      if (!trip) {
        return response.notFound(res, "Không tìm thấy chuyến đi");
      }

      // M4-M6: Only end trips that are started/enroute
      if (
        trip.trangThai !== "dang_chay" &&
        trip.trangThai !== "dang_thuc_hien"
      ) {
        return response.error(
          res,
          "INVALID_TRIP_STATUS",
          "Chỉ có thể kết thúc chuyến đi đang chạy",
          400
        );
      }

      const endTime = gioKetThucThucTe || new Date();

      // M4-M6: Use service if available (will calculate stats)
      let updatedTrip;
      try {
        if (tripService && tripService.complete) {
          updatedTrip = await tripService.complete(id, req.user?.userId);
        } else {
          // Fallback: Update status and end time
          const isUpdated = await ChuyenDiModel.update(id, {
            trangThai: "hoan_thanh", // M4-M6: completed
            gioKetThucThucTe: endTime,
            ghiChu: ghiChu || trip.ghiChu,
          });

          if (!isUpdated) {
            return response.error(
              res,
              "TRIP_UPDATE_FAILED",
              "Không thể kết thúc chuyến đi",
              400
            );
          }

          updatedTrip = await ChuyenDiModel.getById(id);
        }
      } catch (serviceError) {
        if (serviceError.message === "TRIP_NOT_FOUND") {
          return response.notFound(res, "Không tìm thấy chuyến đi");
        }
        throw serviceError;
      }

      // M4-M6: Emit WS events
      const io = req.app.get("io");
      let busId = null;
      if (io && updatedTrip) {
        const schedule = await LichTrinhModel.getById(updatedTrip.maLichTrinh);
        if (schedule) {
          busId = schedule.maXe;
          const eventData = {
            tripId: parseInt(id),
            busId: busId,
            driverId: schedule.maTaiXe,
            routeId: schedule.maTuyen,
            endTime: updatedTrip.gioKetThucThucTe,
            status: "completed",
            timestamp: new Date().toISOString(),
          };

          // Emit to multiple rooms
          io.to(`trip-${id}`).emit("trip_completed", eventData);
          io.to(`bus-${busId}`).emit("trip_completed", eventData);
          io.to("role-quan_tri").emit("trip_completed", eventData);

          // 🔥 FIX: Cập nhật trạng thái học sinh thành "da_tra" khi kết thúc chuyến đi
          try {
            // Lấy danh sách học sinh trong chuyến
            const studentStatuses = await TrangThaiHocSinhModel.getByTripId(id);
            console.log(
              `[M5 End Trip] Trip ${id}: Found ${
                studentStatuses?.length || 0
              } students`
            );

            if (studentStatuses && studentStatuses.length > 0) {
              // 🔥 FIX: Cập nhật tất cả học sinh đã lên xe (da_don) thành đã đến nơi (da_tra)
              const studentsOnBus = studentStatuses.filter(
                (s) => s.trangThai === "da_don"
              );

              if (studentsOnBus.length > 0) {
                console.log(
                  `[M5 End Trip] Updating ${studentsOnBus.length} students from "da_don" to "da_tra"`
                );

                for (const studentStatus of studentsOnBus) {
                  await TrangThaiHocSinhModel.update(
                    id,
                    studentStatus.maHocSinh,
                    {
                      trangThai: "da_tra",
                      thoiGianThucTe: new Date(),
                      ghiChu: "Đã đến nơi - Chuyến đi hoàn thành",
                    }
                  );
                }
              }

              const studentIds = studentStatuses.map((s) => s.maHocSinh);

              // Lấy thông tin phụ huynh
              const pool = (await import("../config/db.js")).default;
              const [students] = await pool.query(
                `SELECT DISTINCT h.maPhuHuynh, h.hoTen as tenHocSinh, n.hoTen as tenPhuHuynh
                 FROM HocSinh h
                 JOIN NguoiDung n ON h.maPhuHuynh = n.maNguoiDung
                 WHERE h.maHocSinh IN (?) AND h.maPhuHuynh IS NOT NULL`,
                [studentIds]
              );
              console.log(
                `[M5 End Trip] Found ${students.length} parents to notify`
              );

              if (students.length > 0) {
                const parentIds = students.map((s) => s.maPhuHuynh);

                const route = await TuyenDuongModel.getById(schedule.maTuyen);
                const bus = await XeBuytModel.getById(busId);

                // 🔥 FIX: Use actual end time (current time) instead of potentially wrong cached value
                const actualEndTime =
                  updatedTrip.gioKetThucThucTe || new Date();
                const endTimeFormatted = new Date(
                  actualEndTime
                ).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                // Tạo notification content
                const tieuDe = "✅ Chuyến đi đã hoàn thành";
                const noiDung = `Xe buýt ${bus?.bienSoXe || ""} đã ${
                  schedule?.loaiChuyen === "don_sang" ? "đón" : "đưa"
                } con bạn về ${
                  route?.tenTuyen ? `(${route.tenTuyen})` : ""
                } an toàn. Thời gian kết thúc: ${endTimeFormatted}.`;

                // Tạo bulk notifications
                await ThongBaoModel.createMultiple({
                  danhSachNguoiNhan: parentIds,
                  tieuDe,
                  noiDung,
                  loaiThongBao: "chuyen_di",
                });

                // 🔥 FIX: Chỉ emit notification:new một lần (không emit lại vì đã có trong trip_completed event)
                // Frontend sẽ tự động hiển thị notification từ DB khi reload
                console.log(
                  `✅ [M5 End Trip] Created notifications for ${parentIds.length} parents for trip ${id}`
                );
              }

              // 🔥 Thông báo admin khi kết thúc chuyến đi
              try {
                const poolAdmin = (await import("../config/db.js")).default;
                const [admins] = await poolAdmin.query(
                  `SELECT maNguoiDung FROM NguoiDung WHERE vaiTro = 'quan_tri'`
                );
                const adminIds = admins.map((a) => a.maNguoiDung);

                if (adminIds.length > 0) {
                  const route = await TuyenDuongModel.getById(schedule.maTuyen);
                  const bus = await XeBuytModel.getById(busId);

                  // 🔥 FIX: Use actual current end time for accurate notification
                  const actualEndTime =
                    updatedTrip.gioKetThucThucTe || new Date();
                  const endTimeFormatted = new Date(
                    actualEndTime
                  ).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const tieuDe = "✅ Chuyến đi đã hoàn thành";
                  const noiDung = `Chuyến đi ${route?.tenTuyen || ""} (${
                    bus?.bienSoXe || ""
                  }) đã hoàn thành lúc ${endTimeFormatted}.`;

                  await ThongBaoModel.createMultiple({
                    danhSachNguoiNhan: adminIds,
                    tieuDe,
                    noiDung,
                    loaiThongBao: "chuyen_di",
                  });

                  // Emit notification:new to admin rooms
                  if (io) {
                    adminIds.forEach((adminId) => {
                      io.to(`user-${adminId}`).emit("notification:new", {
                        maNguoiNhan: adminId,
                        tieuDe,
                        noiDung,
                        loaiThongBao: "chuyen_di",
                        tripId: id,
                        thoiGianGui: new Date(),
                        daDoc: false,
                      });
                    });
                  }

                  console.log(
                    `✅ [M5 End Trip] Sent completion notifications to ${adminIds.length} admins for trip ${id}`
                  );
                }
              } catch (adminNotifError) {
                console.error(
                  "❌ [M5 End Trip] Failed to send admin notifications:",
                  adminNotifError
                );
              }
            }
          } catch (notifError) {
            console.error(
              "❌ [M5 End Trip] Failed to create notification:",
              notifError
            );
          }
        }
      }

      // M4-M6: Clear telemetry cache
      if (busId) {
        TelemetryService.clearTripData(parseInt(id), busId);
      }

      return response.ok(res, updatedTrip);
    } catch (error) {
      console.error("Error in TripController.endTrip:", error);
      return response.serverError(
        res,
        "Lỗi server khi kết thúc chuyến đi",
        error
      );
    }
  }

  /**
   * 📌 API: POST /api/v1/trips/:id/stops/:stopId/arrive
   * 👤 Role: taixe (driver marks arrival at stop)
   *
   * Purpose: Driver marks that bus has arrived at a stop
   * - Get students waiting at this stop
   * - Send notification to their parents
   * - Emit WebSocket event
   *
   * @param {string} req.params.id - Trip ID
   * @param {string} req.params.stopId - Stop ID (sequence number)
   * @returns {200} Success message
   * @returns {404} Trip or stop not found
   */
  static async arriveAtStop(req, res) {
    try {
      const { id, stopId } = req.params;

      // Validate
      if (!id || !stopId) {
        return response.validationError(res, "Trip ID và Stop ID là bắt buộc", [
          { field: "id", message: "Trip ID không được để trống" },
          { field: "stopId", message: "Stop ID không được để trống" },
        ]);
      }

      // Get trip
      const trip = await ChuyenDiModel.getById(id);
      if (!trip) {
        return response.notFound(res, "Không tìm thấy chuyến đi");
      }

      // Get schedule info
      const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
      if (!schedule) {
        return response.notFound(res, "Không tìm thấy lịch trình");
      }

      // Get route stops
      const routeStops = await RouteStopModel.getByRouteId(schedule.maTuyen);

      // stopId can be sequence number or stop ID (maDiem)
      // Try to find by sequence first, then by maDiem
      let stop = routeStops.find(
        (s) => s.sequence == stopId || s.maDiem == stopId
      );

      // If stopId is sequence number but not found, try parsing as integer
      if (!stop && !isNaN(parseInt(stopId))) {
        stop = routeStops.find((s) => s.sequence === parseInt(stopId));
      }

      if (!stop) {
        return response.notFound(res, "Không tìm thấy điểm dừng");
      }

      // Use sequence number (thuTuDiemDon maps to sequence, not maDiem)
      const sequence = stop.sequence;

      // 🔥 Kiểm tra xem có phải điểm cuối không
      const isLastStop = await TripController.isLastStop(id, sequence);
      const tripType = await TripController.getTripType(id);

      // 💾 Save arrival time to database
      try {
        await TripStopStatusModel.upsertArrival(id, sequence);
        console.log(
          `✅ [DB] Saved arrival time for trip ${id}, stop sequence ${sequence}`
        );
      } catch (dbError) {
        console.warn(`⚠️  Failed to save arrival time:`, dbError.message);
        console.error(dbError);
        // Continue anyway - notification is more important
      }

      // 🔥 FIX: Cập nhật diemHienTai (currentStop) trong database khi đến điểm dừng
      // diemHienTai = sequence của điểm dừng hiện tại
      try {
        await ChuyenDiModel.update(id, { diemHienTai: sequence });
        console.log(
          `✅ [DB] Updated diemHienTai for trip ${id} to ${sequence} (arrived at stop ${sequence})`
        );
      } catch (dbError) {
        console.warn(`⚠️  Failed to update diemHienTai:`, dbError.message);
        console.error(dbError);
        // Continue anyway - notification is more important
      }

      // 🔥 XỬ LÝ ĐIỂM CUỐI
      if (isLastStop) {
        if (tripType === "don_sang") {
          // Chuyến đi: Điểm cuối là trường học, không đón học sinh
          console.log(
            `[TripController] Arrived at final stop (school) for morning trip ${id}`
          );

          // Thông báo phụ huynh và admin: Xe đã đến trường
          const students = await TrangThaiHocSinhModel.getByTripId(id);
          const studentIds = students.map((s) => s.maHocSinh);

          if (studentIds.length > 0) {
            const pool = (await import("../config/db.js")).default;
            const [parents] = await pool.query(
              `SELECT DISTINCT h.maPhuHuynh, h.hoTen as tenHocSinh, n.hoTen as tenPhuHuynh
               FROM HocSinh h
               JOIN NguoiDung n ON h.maPhuHuynh = n.maNguoiDung
               WHERE h.maHocSinh IN (?) AND h.maPhuHuynh IS NOT NULL`,
              [studentIds]
            );

            if (parents.length > 0) {
              const parentIds = parents.map((s) => s.maPhuHuynh);
              const route = await TuyenDuongModel.getById(schedule.maTuyen);
              const bus = await XeBuytModel.getById(schedule.maXe);

              const tieuDe = "🏫 Xe đã đến trường";
              const noiDung = `Xe buýt ${
                bus?.bienSoXe || ""
              } đã đến trường an toàn${
                route?.tenTuyen ? ` (${route.tenTuyen})` : ""
              }.`;

              await ThongBaoModel.createMultiple({
                danhSachNguoiNhan: parentIds,
                tieuDe,
                noiDung,
                loaiThongBao: "chuyen_di",
              });

              // Thông báo admin
              const pool2 = (await import("../config/db.js")).default;
              const [admins] = await pool2.query(
                `SELECT maNguoiDung FROM NguoiDung WHERE vaiTro = 'quan_tri'`
              );
              const adminIds = admins.map((a) => a.maNguoiDung);

              if (adminIds.length > 0) {
                await ThongBaoModel.createMultiple({
                  danhSachNguoiNhan: adminIds,
                  tieuDe: "🏫 Xe đã đến trường",
                  noiDung: `Xe buýt ${bus?.bienSoXe || ""} đã đến trường${
                    route?.tenTuyen ? ` (${route.tenTuyen})` : ""
                  }.`,
                  loaiThongBao: "chuyen_di",
                });
              }

              // Emit WebSocket events
              const io = req.app.get("io");
              if (io) {
                parentIds.forEach((parentId) => {
                  io.to(`user-${parentId}`).emit("notification:new", {
                    maNguoiNhan: parentId,
                    tieuDe,
                    noiDung,
                    loaiThongBao: "chuyen_di",
                    tripId: id,
                    stopId: sequence,
                    thoiGianGui: new Date(),
                    daDoc: false,
                  });
                });

                io.to("role-quan_tri").emit("arrived_at_final_stop", {
                  tripId: parseInt(id),
                  stopId: sequence,
                  stopName: stop.tenDiem,
                  tripType: "don_sang",
                  timestamp: new Date().toISOString(),
                });
              }

              return response.success(
                res,
                {
                  arrivedAt: stop.tenDiem,
                  isFinalStop: true,
                  message: "Đã đến trường - Không có học sinh để đón",
                },
                "Đã đến điểm cuối (trường học)"
              );
            }
          }

          return response.success(
            res,
            {
              arrivedAt: stop.tenDiem,
              isFinalStop: true,
              studentsCount: 0,
            },
            "Đã đến điểm cuối (trường học)"
          );
        } else if (tripType === "tra_chieu") {
          // Chuyến về: Điểm cuối - trả học sinh còn lại trên xe
          console.log(
            `[TripController] Arrived at final stop for afternoon trip ${id}`
          );

          const students = await TrangThaiHocSinhModel.getByTripId(id);
          const studentsOnBus = students.filter(
            (s) => s.trangThai === "da_don"
          );

          // Trả tất cả học sinh còn lại
          for (const student of studentsOnBus) {
            await TrangThaiHocSinhModel.update(id, student.maHocSinh, {
              trangThai: "da_tra",
              thoiGianThucTe: new Date(),
              ghiChu: "Đã trả tại điểm cuối",
            });
          }

          // Thông báo phụ huynh và admin
          if (studentsOnBus.length > 0) {
            const studentIds = studentsOnBus.map((s) => s.maHocSinh);
            const pool = (await import("../config/db.js")).default;
            const [parents] = await pool.query(
              `SELECT DISTINCT h.maPhuHuynh, h.hoTen as tenHocSinh, n.hoTen as tenPhuHuynh
               FROM HocSinh h
               JOIN NguoiDung n ON h.maPhuHuynh = n.maNguoiDung
               WHERE h.maHocSinh IN (?) AND h.maPhuHuynh IS NOT NULL`,
              [studentIds]
            );

            if (parents.length > 0) {
              const parentIds = parents.map((s) => s.maPhuHuynh);
              const route = await TuyenDuongModel.getById(schedule.maTuyen);
              const bus = await XeBuytModel.getById(schedule.maXe);

              const tieuDe = "✅ Con đã xuống xe";
              const noiDung = `Con bạn đã được trả tại điểm cuối an toàn${
                route?.tenTuyen ? ` (${route.tenTuyen})` : ""
              }.`;

              await ThongBaoModel.createMultiple({
                danhSachNguoiNhan: parentIds,
                tieuDe,
                noiDung,
                loaiThongBao: "chuyen_di",
              });

              // Emit WebSocket events
              const io = req.app.get("io");
              if (io) {
                parentIds.forEach((parentId) => {
                  io.to(`user-${parentId}`).emit("notification:new", {
                    maNguoiNhan: parentId,
                    tieuDe,
                    noiDung,
                    loaiThongBao: "chuyen_di",
                    tripId: id,
                    thoiGianGui: new Date(),
                    daDoc: false,
                  });
                });
              }
            }
          }

          return response.success(
            res,
            {
              arrivedAt: stop.tenDiem,
              isFinalStop: true,
              studentsDropped: studentsOnBus.length,
            },
            `Đã đến điểm cuối - Đã trả ${studentsOnBus.length} học sinh`
          );
        }
      }

      // Xử lý điểm dừng thông thường (không phải điểm cuối)
      // 🔥 FIX: Get students at this stop - dùng thuTuDiemDon cho chuyến đi, thuTuDiemTra cho chuyến về
      const students = await TrangThaiHocSinhModel.getByTripId(id);
      // 🔥 FIX: Use existing tripType variable (already declared above at line 1877)

      // 🔥 FIX: Filter students based on trip type
      const studentsAtThisStop = students.filter((s) => {
        if (tripType === "tra_chieu") {
          // Return trip: use thuTuDiemTra
          return (
            s.thuTuDiemTra && parseInt(s.thuTuDiemTra) === parseInt(sequence)
          );
        } else {
          // Morning trip: use thuTuDiemDon
          return (
            s.thuTuDiemDon && parseInt(s.thuTuDiemDon) === parseInt(sequence)
          );
        }
      });

      console.log(
        `[TripController] arriveAtStop: Found ${
          studentsAtThisStop.length
        } students at stop ${sequence} (tripType: ${tripType}, using ${
          tripType === "tra_chieu" ? "thuTuDiemTra" : "thuTuDiemDon"
        })`
      );

      if (studentsAtThisStop.length === 0) {
        console.log(
          `[M5] No students at stop ${stopId} for trip ${id}, skipping notification`
        );
        return response.success(
          res,
          { arrivedAt: stop.tenDiem, studentsCount: 0 },
          "Đã đến điểm dừng (không có học sinh)"
        );
      }

      // Get parent IDs
      const studentIds = studentsAtThisStop.map((s) => s.maHocSinh);
      const pool = (await import("../config/db.js")).default;
      const [parents] = await pool.query(
        `SELECT DISTINCT h.maPhuHuynh, h.hoTen as tenHocSinh, n.hoTen as tenPhuHuynh
         FROM HocSinh h
         JOIN NguoiDung n ON h.maPhuHuynh = n.maNguoiDung
         WHERE h.maHocSinh IN (?) AND h.maPhuHuynh IS NOT NULL`,
        [studentIds]
      );

      if (parents.length === 0) {
        console.log(
          `[M5] No parents found for students at stop ${stopId}, skipping notification`
        );
        return response.success(
          res,
          { arrivedAt: stop.tenDiem, studentsCount: studentsAtThisStop.length },
          "Đã đến điểm dừng"
        );
      }

      const parentIds = parents.map((p) => p.maPhuHuynh);

      // Get bus and route info
      const bus = await XeBuytModel.getById(schedule.maXe);
      const route = await TuyenDuongModel.getById(schedule.maTuyen);

      // 🔥 FIX #4: Create notification content based on trip type
      let tieuDe, noiDung;
      if (tripType === "tra_chieu") {
        // Return trip: notify about drop-off
        tieuDe = "🚏 Xe buýt đã đến điểm dừng";
        noiDung = `Xe buýt ${bus?.bienSoXe || ""} đã đến ${stop.tenDiem}${
          route?.tenTuyen ? ` (${route.tenTuyen})` : ""
        }. Con bạn sẽ được trả trong giây lát.`;
      } else {
        // Morning trip: notify about pickup
        tieuDe = "🚏 Xe buýt đã đến điểm dừng";
        noiDung = `Xe buýt ${bus?.bienSoXe || ""} đã đến ${stop.tenDiem}${
          route?.tenTuyen ? ` (${route.tenTuyen})` : ""
        }. Con bạn sẽ được đón trong giây lát.`;
      }

      // Create notifications
      await ThongBaoModel.createMultiple({
        danhSachNguoiNhan: parentIds,
        tieuDe,
        noiDung,
        loaiThongBao: "chuyen_di",
      });

      // Emit WebSocket events
      const io = req.app.get("io");
      if (io) {
        parentIds.forEach((parentId) => {
          io.to(`user-${parentId}`).emit("notification:new", {
            maNguoiNhan: parentId,
            tieuDe,
            noiDung,
            loaiThongBao: "chuyen_di",
            tripId: id,
            stopId: stopId,
            thoiGianGui: new Date(),
            daDoc: false,
          });
        });

        console.log(
          `✅ [M5] Sent arrive_at_stop notifications to ${parentIds.length} parents for stop ${stop.tenDiem}`
        );

        // 🔥 FIX: Emit tripStatusUpdate với currentStop để frontend cập nhật tuyến đường
        // Fetch trip mới nhất để lấy diemHienTai đã cập nhật
        const updatedTrip = await ChuyenDiModel.getById(id);
        if (updatedTrip) {
          const currentStopValue =
            updatedTrip.diemHienTai !== null &&
            updatedTrip.diemHienTai !== undefined
              ? updatedTrip.diemHienTai
              : sequence;

          // Emit to trip room để tất cả người theo dõi trip này nhận được
          io.to(`trip-${id}`).emit("tripStatusUpdate", {
            tripId: parseInt(id),
            currentStop: currentStopValue,
            diemHienTai: currentStopValue,
            status: updatedTrip.trangThai || trip.trangThai,
            timestamp: new Date().toISOString(),
          });

          console.log(
            `✅ [TripController] Emitted tripStatusUpdate with currentStop=${currentStopValue} for trip ${id} (arrived at stop ${sequence})`
          );
        }
      }

      return response.success(
        res,
        {
          arrivedAt: stop.tenDiem,
          studentsCount: studentsAtThisStop.length,
          parentsNotified: parentIds.length,
        },
        "Đã gửi thông báo đến phụ huynh"
      );
    } catch (error) {
      console.error("❌ [TripController] arriveAtStop error:", error);
      return response.error(
        res,
        "ARRIVE_AT_STOP_ERROR",
        "Lỗi khi đánh dấu đã đến điểm dừng",
        500,
        error
      );
    }
  }

  /**
   * 🔥 API: GET /api/v1/trips/:id/students-from-morning
   * Lấy danh sách học sinh từ chuyến đi sáng cùng ngày (cho chuyến về)
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @param {string} req.params.id - Trip ID (afternoon trip)
   */
  static async getStudentsFromMorningTrip(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return response.validationError(res, "Trip ID là bắt buộc", [
          { field: "id", message: "Trip ID không được để trống" },
        ]);
      }

      // Get trip
      const trip = await ChuyenDiModel.getById(id);
      if (!trip) {
        return response.notFound(res, "Không tìm thấy chuyến đi");
      }

      // Get schedule info
      const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
      if (!schedule) {
        return response.notFound(res, "Không tìm thấy lịch trình");
      }

      // Chỉ hoạt động với chuyến về
      if (schedule.loaiChuyen !== "tra_chieu") {
        return response.error(
          res,
          "INVALID_TRIP_TYPE",
          "API này chỉ dành cho chuyến về (tra_chieu)",
          400
        );
      }

      // Tìm chuyến đi sáng cùng ngày, cùng route
      const pool = (await import("../config/db.js")).default;
      const [morningTrips] = await pool.query(
        `SELECT cd.maChuyen 
         FROM ChuyenDi cd
         JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
         WHERE lt.maTuyen = ? 
           AND lt.loaiChuyen = 'don_sang'
           AND DATE(cd.ngayChay) = DATE(?)
           AND cd.trangThai IN ('dang_chay', 'hoan_thanh')
         ORDER BY cd.gioBatDauThucTe DESC
         LIMIT 1`,
        [schedule.maTuyen, trip.ngayChay]
      );

      if (morningTrips.length === 0) {
        return response.success(
          res,
          { students: [], morningTripId: null },
          "Không tìm thấy chuyến đi sáng cùng ngày"
        );
      }

      const morningTripId = morningTrips[0].maChuyen;

      // Lấy học sinh đã được đón từ chuyến đi sáng (status = 'da_don')
      const morningStudents = await TrangThaiHocSinhModel.getByTripId(
        morningTripId
      );
      const pickedStudents = morningStudents.filter(
        (s) => s.trangThai === "da_don"
      );

      // Lấy schedule_student_stops của chuyến về để biết điểm sẽ trả
      const scheduleStudents = await ScheduleStudentStopModel.getByScheduleId(
        schedule.maLichTrinh
      );

      // Map học sinh với điểm sẽ trả
      const studentsWithDropOff = pickedStudents.map((student) => {
        const scheduleStudent = scheduleStudents.find(
          (ss) => ss.maHocSinh === student.maHocSinh
        );
        return {
          maHocSinh: student.maHocSinh,
          hoTen: student.hoTen,
          lop: student.lop,
          anhDaiDien: student.anhDaiDien,
          thuTuDiemDon: scheduleStudent?.thuTuDiem || student.thuTuDiemDon, // Điểm sẽ trả
          trangThai: "da_don", // Đã có trên xe
        };
      });

      return response.success(
        res,
        {
          students: studentsWithDropOff,
          morningTripId: morningTripId,
          studentsCount: studentsWithDropOff.length,
        },
        "Danh sách học sinh từ chuyến đi sáng"
      );
    } catch (error) {
      console.error(
        "❌ [TripController] getStudentsFromMorningTrip error:",
        error
      );
      return response.error(
        res,
        "GET_STUDENTS_FROM_MORNING_ERROR",
        "Lỗi khi lấy danh sách học sinh từ chuyến đi sáng",
        500,
        error
      );
    }
  }

  /**
   * Lấy danh sách học sinh tại điểm dừng cụ thể
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @param {string} req.params.id - Trip ID
   * @param {string} req.params.sequence - Stop sequence number
   */
  static async getStudentsAtStop(req, res) {
    try {
      const { id, sequence } = req.params;

      if (!id || !sequence) {
        return response.validationError(
          res,
          "Trip ID và sequence là bắt buộc",
          [
            { field: "id", message: "Trip ID không được để trống" },
            { field: "sequence", message: "Sequence không được để trống" },
          ]
        );
      }

      // Get trip
      const trip = await ChuyenDiModel.getById(id);
      if (!trip) {
        return response.notFound(res, "Không tìm thấy chuyến đi");
      }

      // Get schedule info
      const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
      if (!schedule) {
        return response.notFound(res, "Không tìm thấy lịch trình");
      }

      // Get route stops to verify sequence exists
      const routeStops = await RouteStopModel.getByRouteId(schedule.maTuyen);
      const stop = routeStops.find((s) => s.sequence === parseInt(sequence));

      if (!stop) {
        return response.notFound(
          res,
          "Không tìm thấy điểm dừng với sequence này"
        );
      }

      // Get students at this stop - thuTuDiemDon maps to sequence number
      // 🔥 Join trực tiếp với HocSinh để lấy thông tin đầy đủ
      const pool = (await import("../config/db.js")).default;

      try {
        const tripIdInt = parseInt(id);
        const sequenceInt = parseInt(sequence);

        console.log(
          `[TripController] getStudentsAtStop: tripId=${tripIdInt}, sequence=${sequenceInt}`
        );

        // Query trực tiếp với điều kiện filter ngay trong SQL
        // 🔥 FIX: Với chuyến về (tra_chieu), thuTuDiemDon thực chất là điểm trả
        // Logic vẫn đúng: filter theo thuTuDiemDon = sequence
        // Sử dụng CAST để đảm bảo so sánh đúng kiểu dữ liệu
        const [studentInfo] = await pool.query(
          `SELECT 
            hs.maHocSinh,
            hs.hoTen,
            hs.lop,
            hs.anhDaiDien,
            tth.trangThai,
            tth.thuTuDiemDon,
            tth.thoiGianThucTe,
            tth.ghiChu
           FROM TrangThaiHocSinh tth
           LEFT JOIN HocSinh hs ON tth.maHocSinh = hs.maHocSinh
           WHERE tth.maChuyen = ? 
             AND CAST(tth.thuTuDiemDon AS UNSIGNED) = ?
           ORDER BY hs.hoTen ASC`,
          [tripIdInt, sequenceInt]
        );

        console.log(
          `[TripController] Found ${studentInfo.length} students at stop ${sequenceInt}`
        );

        const studentsAtThisStop = (studentInfo || []).map((s) => ({
          maHocSinh: s.maHocSinh,
          hoTen: s.hoTen || null,
          lop: s.lop || null,
          anhDaiDien: s.anhDaiDien || null,
          trangThai: s.trangThai || "cho_don",
          thuTuDiemDon: s.thuTuDiemDon,
          thoiGianThucTe: s.thoiGianThucTe || null,
          ghiChu: s.ghiChu || null,
        }));

        return response.success(
          res,
          {
            stop: {
              maDiem: stop.maDiem,
              tenDiem: stop.tenDiem,
              sequence: stop.sequence,
              viDo: stop.viDo,
              kinhDo: stop.kinhDo,
              address: stop.address,
            },
            students: studentsAtThisStop,
            studentsCount: studentsAtThisStop.length,
          },
          "Danh sách học sinh tại điểm dừng"
        );
      } catch (dbError) {
        console.error(
          "❌ [TripController] getStudentsAtStop DB error:",
          dbError
        );
        console.error("Error details:", {
          tripId: id,
          sequence,
          errorMessage: dbError.message,
          errorCode: dbError.code,
          errorStack: dbError.stack,
        });
        throw dbError;
      }
    } catch (error) {
      console.error("❌ [TripController] getStudentsAtStop error:", error);
      console.error("Error details:", {
        tripId: id,
        sequence,
        errorMessage: error.message,
        errorStack: error.stack,
      });
      return response.error(
        res,
        "GET_STUDENTS_AT_STOP_ERROR",
        "Lỗi khi lấy danh sách học sinh tại điểm dừng",
        500,
        error
      );
    }
  }

  /**
   * 📌 API: POST /api/v1/trips/:id/stops/:stopId/leave
   * 👤 Role: taixe (driver marks leaving stop)
   *
   * Purpose: Driver marks that bus has left a stop
   * - Get students picked up at this stop
   * - Send notification to their parents
   * - Emit WebSocket event
   *
   * @param {string} req.params.id - Trip ID
   * @param {string} req.params.stopId - Stop ID (sequence number)
   * @returns {200} Success message
   * @returns {404} Trip or stop not found
   */
  static async leaveStop(req, res) {
    try {
      const { id, stopId } = req.params;

      // Validate
      if (!id || !stopId) {
        return response.validationError(res, "Trip ID và Stop ID là bắt buộc", [
          { field: "id", message: "Trip ID không được để trống" },
          { field: "stopId", message: "Stop ID không được để trống" },
        ]);
      }

      // Get trip
      const trip = await ChuyenDiModel.getById(id);
      if (!trip) {
        return response.notFound(res, "Không tìm thấy chuyến đi");
      }

      // Get schedule info
      const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
      if (!schedule) {
        return response.notFound(res, "Không tìm thấy lịch trình");
      }

      // Get route stops
      const routeStops = await RouteStopModel.getByRouteId(schedule.maTuyen);

      // stopId can be sequence number or stop ID (maDiem)
      let stop = routeStops.find(
        (s) => s.sequence == stopId || s.maDiem == stopId
      );

      // If stopId is sequence number but not found, try parsing as integer
      if (!stop && !isNaN(parseInt(stopId))) {
        stop = routeStops.find((s) => s.sequence === parseInt(stopId));
      }

      if (!stop) {
        return response.notFound(res, "Không tìm thấy điểm dừng");
      }

      // Use sequence number
      const sequence = stop.sequence;

      // 💾 Save departure time to database
      try {
        await TripStopStatusModel.updateDeparture(id, sequence);
        console.log(
          `✅ [DB] Saved departure time for trip ${id}, stop sequence ${sequence}`
        );
      } catch (dbError) {
        console.warn(`⚠️  Failed to save departure time:`, dbError.message);
        console.error(dbError);
        // Continue anyway - notification is more important
      }

      // 🔥 FIX: Cập nhật diemHienTai (currentStop) trong database khi rời điểm dừng
      // diemHienTai = sequence của điểm dừng tiếp theo (sequence + 1)
      // Nhưng cần kiểm tra xem có điểm dừng tiếp theo không
      const routeStopsSorted = routeStops.sort(
        (a, b) => a.sequence - b.sequence
      );
      const nextStop = routeStopsSorted.find((s) => s.sequence > sequence);
      const nextStopSequence = nextStop ? nextStop.sequence : sequence; // Nếu không có điểm tiếp theo, giữ nguyên

      console.log(`[TripController] 🔍 leaveStop - Finding next stop:`, {
        currentSequence: sequence,
        routeStopsCount: routeStopsSorted.length,
        routeStopsSequences: routeStopsSorted.map((s) => s.sequence),
        nextStopFound: !!nextStop,
        nextStopSequence,
      });

      try {
        await ChuyenDiModel.update(id, { diemHienTai: nextStopSequence });
        console.log(
          `✅ [DB] Updated diemHienTai for trip ${id} to ${nextStopSequence} (left stop ${sequence})`
        );
      } catch (dbError) {
        console.warn(`⚠️  Failed to update diemHienTai:`, dbError.message);
        console.error(dbError);
        // Continue anyway - notification is more important
      }

      // 🔥 FIX: Emit tripStatusUpdate event ngay cả khi không có học sinh
      // Để phụ huynh có thể cập nhật route guidance
      const io = req.app.get("io");
      if (io) {
        // Fetch trip mới nhất để lấy diemHienTai đã cập nhật
        const updatedTrip = await ChuyenDiModel.getById(id);
        if (updatedTrip) {
          const currentStopValue =
            updatedTrip.diemHienTai !== null &&
            updatedTrip.diemHienTai !== undefined
              ? updatedTrip.diemHienTai
              : nextStopSequence;

          // Emit to trip room để tất cả người theo dõi trip này nhận được
          io.to(`trip-${id}`).emit("tripStatusUpdate", {
            tripId: parseInt(id),
            currentStop: currentStopValue,
            diemHienTai: currentStopValue,
            status: updatedTrip.trangThai || trip.trangThai,
            timestamp: new Date().toISOString(),
          });

          console.log(
            `✅ [TripController] Emitted tripStatusUpdate with currentStop=${currentStopValue} for trip ${id}`
          );
        }
      }

      // Get students at this stop - thuTuDiemDon maps to sequence number
      const students = await TrangThaiHocSinhModel.getByTripId(id);
      const studentsAtThisStop = students.filter(
        (s) => s.thuTuDiemDon && parseInt(s.thuTuDiemDon) === parseInt(sequence)
      );

      if (studentsAtThisStop.length === 0) {
        console.log(
          `[M5] No students at stop ${stopId} for trip ${id}, skipping notification`
        );
        return response.success(
          res,
          { leftFrom: stop.tenDiem, studentsCount: 0 },
          "Đã rời điểm dừng (không có học sinh)"
        );
      }

      // Get parent IDs
      const studentIds = studentsAtThisStop.map((s) => s.maHocSinh);
      const pool = (await import("../config/db.js")).default;
      const [parents] = await pool.query(
        `SELECT DISTINCT h.maPhuHuynh, h.hoTen as tenHocSinh, n.hoTen as tenPhuHuynh
         FROM HocSinh h
         JOIN NguoiDung n ON h.maPhuHuynh = n.maNguoiDung
         WHERE h.maHocSinh IN (?) AND h.maPhuHuynh IS NOT NULL`,
        [studentIds]
      );

      if (parents.length === 0) {
        console.log(
          `[M5] No parents found for students at stop ${stopId}, skipping notification`
        );
        return response.success(
          res,
          { leftFrom: stop.tenDiem, studentsCount: studentsAtThisStop.length },
          "Đã rời điểm dừng"
        );
      }

      const parentIds = parents.map((p) => p.maPhuHuynh);

      // Get bus and route info
      const bus = await XeBuytModel.getById(schedule.maXe);
      const route = await TuyenDuongModel.getById(schedule.maTuyen);

      // Create notification content
      const tieuDe = "🚌 Xe buýt đã rời điểm dừng";
      const noiDung = `Xe buýt ${bus?.bienSoXe || ""} đã rời ${stop.tenDiem}${
        route?.tenTuyen ? ` (${route.tenTuyen})` : ""
      }. Con bạn đã lên xe và đang trên đường đến trường.`;

      // Create notifications
      await ThongBaoModel.createMultiple({
        danhSachNguoiNhan: parentIds,
        tieuDe,
        noiDung,
        loaiThongBao: "chuyen_di",
      });

      // Emit WebSocket events
      if (io) {
        parentIds.forEach((parentId) => {
          io.to(`user-${parentId}`).emit("notification:new", {
            maNguoiNhan: parentId,
            tieuDe,
            noiDung,
            loaiThongBao: "chuyen_di",
            tripId: id,
            stopId: stopId,
            thoiGianGui: new Date(),
            daDoc: false,
          });
        });

        console.log(
          `✅ [M5] Sent leave_stop notifications to ${parentIds.length} parents for stop ${stop.tenDiem}`
        );
      }

      return response.success(
        res,
        {
          leftFrom: stop.tenDiem,
          studentsCount: studentsAtThisStop.length,
          parentsNotified: parentIds.length,
        },
        "Đã gửi thông báo đến phụ huynh"
      );
    } catch (error) {
      console.error("❌ [TripController] leaveStop error:", error);
      return response.error(
        res,
        "LEAVE_STOP_ERROR",
        "Lỗi khi đánh dấu rời điểm dừng",
        500,
        error
      );
    }
  }

  /**
   * 📌 API: GET /api/v1/trips/:id/stops/status
   * 👤 Role: taixe, phu_huynh (get stop status for trip)
   *
   * Purpose: Get arrival/departure status of all stops in a trip
   * - Used when page refreshes to restore state
   *
   * @param {string} req.params.id - Trip ID
   * @returns {200} List of stop statuses
   * @returns {404} Trip not found
   */
  static async getStopStatus(req, res) {
    try {
      const { id } = req.params;

      // Validate
      if (!id) {
        return response.validationError(res, "Trip ID là bắt buộc", [
          { field: "id", message: "Trip ID không được để trống" },
        ]);
      }

      // Get trip
      const trip = await ChuyenDiModel.getById(id);
      if (!trip) {
        return response.notFound(res, "Không tìm thấy chuyến đi");
      }

      // Get all stop statuses
      const statuses = await TripStopStatusModel.getByTripId(id);

      return response.ok(res, statuses);
    } catch (error) {
      console.error("❌ [TripController] getStopStatus error:", error);
      return response.serverError(
        res,
        "Lỗi khi lấy trạng thái điểm dừng",
        error
      );
    }
  }

  // Hủy chuyến đi (M4-M6: Response envelope + WS events)
  static async cancelTrip(req, res) {
    try {
      const { id } = req.params;
      const { lyDoHuy, ghiChu } = req.body;

      if (!id) {
        return response.validationError(res, "Mã chuyến đi là bắt buộc", [
          { field: "id", message: "Mã chuyến đi không được để trống" },
        ]);
      }

      // Get trip
      const trip = await ChuyenDiModel.getById(id);
      if (!trip) {
        return response.notFound(res, "Không tìm thấy chuyến đi");
      }

      // M4-M6: Cannot cancel completed trips
      if (trip.trangThai === "hoan_thanh") {
        return response.error(
          res,
          "INVALID_TRIP_STATUS",
          "Không thể hủy chuyến đi đã hoàn thành",
          400
        );
      }

      // Update status
      const cancelReason =
        lyDoHuy || ghiChu || trip.ghiChu || "Hủy bởi người dùng";
      const isUpdated = await ChuyenDiModel.update(id, {
        trangThai: "huy", // M4-M6: canceled (map từ huy/bi_huy)
        ghiChu: cancelReason,
      });

      if (!isUpdated) {
        return response.error(
          res,
          "TRIP_UPDATE_FAILED",
          "Không thể hủy chuyến đi",
          400
        );
      }

      // M4-M6: Emit WS events
      const io = req.app.get("io");
      let busId = null;
      if (io) {
        const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
        if (schedule) {
          busId = schedule.maXe;
          const eventData = {
            tripId: parseInt(id),
            busId: busId,
            driverId: schedule.maTaiXe,
            routeId: schedule.maTuyen,
            reason: cancelReason,
            status: "canceled",
            timestamp: new Date().toISOString(),
          };

          // Emit to multiple rooms
          io.to(`trip-${id}`).emit("trip_cancelled", eventData);
          io.to(`bus-${busId}`).emit("trip_cancelled", eventData);
          io.to("role-quan_tri").emit("trip_cancelled", eventData);
        }
      }

      // M4-M6: Clear telemetry cache
      if (busId) {
        TelemetryService.clearTripData(parseInt(id), busId);
      }

      const updatedTrip = await ChuyenDiModel.getById(id);
      return response.ok(res, updatedTrip);
    } catch (error) {
      console.error("Error in TripController.cancelTrip:", error);
      return response.serverError(res, "Lỗi server khi hủy chuyến đi", error);
    }
  }

  // Thêm học sinh vào chuyến đi
  static async addStudent(req, res) {
    try {
      const { id } = req.params;
      const { maHocSinh, trangThai = "dang_cho", ghiChu } = req.body;

      if (!id || !maHocSinh) {
        return res.status(400).json({
          success: false,
          message: "Mã chuyến đi và mã học sinh là bắt buộc",
        });
      }

      // Kiểm tra chuyến đi có tồn tại không
      const trip = await ChuyenDiModel.getById(id);
      if (!trip) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy chuyến đi",
        });
      }

      // Kiểm tra học sinh có tồn tại không
      const student = await HocSinhModel.getById(maHocSinh);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy học sinh",
        });
      }

      // Kiểm tra học sinh đã trong chuyến đi chưa
      const existingStatus = await TrangThaiHocSinhModel.getByTripAndStudent(
        id,
        maHocSinh
      );
      if (existingStatus) {
        return res.status(409).json({
          success: false,
          message: "Học sinh đã có trong chuyến đi này",
        });
      }

      // Kiểm tra học sinh có đang trong chuyến đi khác không
      const activeTrip = await TrangThaiHocSinhModel.getActiveByStudentId(
        maHocSinh
      );
      if (activeTrip.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Học sinh đang trong chuyến đi khác",
          data: { activeTripId: activeTrip[0].maChuyen },
        });
      }

      const statusData = {
        maChuyen: id,
        maHocSinh,
        trangThai,
        thoiGianCapNhat: new Date().toISOString(),
        ghiChu: ghiChu || null,
      };

      const newStatusId = await TrangThaiHocSinhModel.create(statusData);
      const newStatus = await TrangThaiHocSinhModel.getById(newStatusId);

      res.status(201).json({
        success: true,
        data: newStatus,
        message: "Thêm học sinh vào chuyến đi thành công",
      });
    } catch (error) {
      console.error("Error in TripController.addStudent:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi thêm học sinh vào chuyến đi",
        error: error.message,
      });
    }
  }

  // M4-M6: Check-in học sinh (lên xe) - Attendance API
  static async checkinStudent(req, res) {
    try {
      const { id, studentId } = req.params;
      const { ghiChu } = req.body;

      if (!id || !studentId) {
        return response.validationError(
          res,
          "Mã chuyến đi và mã học sinh là bắt buộc",
          [
            { field: "id", message: "Mã chuyến đi không được để trống" },
            { field: "studentId", message: "Mã học sinh không được để trống" },
          ]
        );
      }

      // Get trip
      const trip = await ChuyenDiModel.getById(id);
      if (!trip) {
        return response.notFound(res, "Không tìm thấy chuyến đi");
      }

      // M4-M6: Only allow checkin for active trips
      if (
        trip.trangThai !== "dang_chay" &&
        trip.trangThai !== "dang_thuc_hien"
      ) {
        return response.error(
          res,
          "INVALID_TRIP_STATUS",
          "Chỉ có thể điểm danh khi chuyến đi đang chạy",
          400
        );
      }

      // Get student status
      const studentStatus = await TrangThaiHocSinhModel.getById(id, studentId);
      if (!studentStatus) {
        return response.notFound(res, "Học sinh không có trong chuyến đi này");
      }

      // M4-M6: Update status to 'da_don' (onboard)
      const isUpdated = await TrangThaiHocSinhModel.update(id, studentId, {
        trangThai: "da_don", // M4-M6: onboard
        thoiGianThucTe: new Date(),
        ghiChu: ghiChu || studentStatus.ghiChu,
      });

      if (!isUpdated) {
        return response.error(
          res,
          "UPDATE_FAILED",
          "Không thể cập nhật trạng thái học sinh",
          400
        );
      }

      // Get updated status
      const updatedStatus = await TrangThaiHocSinhModel.getById(id, studentId);
      const student = await HocSinhModel.getById(studentId);

      // M4-M6: Emit WS event pickup_status_update
      const io = req.app.get("io");
      if (io) {
        const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
        const eventData = {
          tripId: parseInt(id),
          studentId: parseInt(studentId),
          studentName: student?.hoTen || `Học sinh #${studentId}`,
          status: "onboard", // M4-M6: Standardized status
          tsServer: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        };

        // Emit to trip room (parents + admin)
        io.to(`trip-${id}`).emit("pickup_status_update", eventData);

        // Emit to parent's user room
        if (student?.maPhuHuynh) {
          io.to(`user-${student.maPhuHuynh}`).emit(
            "pickup_status_update",
            eventData
          );
        }

        // Emit to role-admin
        io.to("role-quan_tri").emit("pickup_status_update", eventData);

        // 📬 M5: Create notification in database for parent
        if (student?.maPhuHuynh) {
          try {
            const route = await TuyenDuongModel.getById(schedule.maTuyen);
            const bus = await XeBuytModel.getById(schedule.maXe);

            const tieuDe = "🚌 Con bạn đã lên xe";
            const noiDung = `${student.hoTen} đã được đón lên xe buýt ${
              bus?.bienSoXe || trip.tenChuyen || "N/A"
            } tuyến ${route?.tenTuyen || "N/A"}`;

            console.log(
              `[Checkin Student] Creating notification for parent ${student.maPhuHuynh}`
            );

            await ThongBaoModel.createMultiple({
              danhSachNguoiNhan: [student.maPhuHuynh],
              tieuDe,
              noiDung,
              loaiThongBao: "chuyen_di",
            });

            console.log(
              `[Checkin Student] Emitting notification:new to user-${student.maPhuHuynh}`
            );

            // Emit notification:new event to parent
            io.to(`user-${student.maPhuHuynh}`).emit("notification:new", {
              tieuDe,
              noiDung,
              loaiThongBao: "chuyen_di",
              thoiGianGui: new Date().toISOString(),
              studentId: student.maHocSinh,
              studentName: student.hoTen,
              tripId: id,
            });

            console.log(
              `✅ Sent checkin notification to parent ${student.maPhuHuynh}`
            );
          } catch (notifError) {
            console.error(
              "❌ [Checkin Student] Failed to create notification:",
              notifError
            );
          }
        }
      }

      return response.ok(res, {
        ...updatedStatus,
        studentName: student?.hoTen,
        status: "onboard", // M4-M6: Standardized
      });
    } catch (error) {
      console.error("Error in TripController.checkinStudent:", error);
      return response.serverError(
        res,
        "Lỗi server khi điểm danh học sinh",
        error
      );
    }
  }

  // M4-M6: Check-out học sinh (xuống xe) - Attendance API
  static async checkoutStudent(req, res) {
    try {
      const { id, studentId } = req.params;
      const { ghiChu } = req.body;

      if (!id || !studentId) {
        return response.validationError(
          res,
          "Mã chuyến đi và mã học sinh là bắt buộc",
          [
            { field: "id", message: "Mã chuyến đi không được để trống" },
            { field: "studentId", message: "Mã học sinh không được để trống" },
          ]
        );
      }

      // Get trip
      const trip = await ChuyenDiModel.getById(id);
      if (!trip) {
        return response.notFound(res, "Không tìm thấy chuyến đi");
      }

      // Get student status
      const studentStatus = await TrangThaiHocSinhModel.getById(id, studentId);
      if (!studentStatus) {
        return response.notFound(res, "Học sinh không có trong chuyến đi này");
      }

      // M4-M6: Update status to 'da_tra' (dropped)
      const isUpdated = await TrangThaiHocSinhModel.update(id, studentId, {
        trangThai: "da_tra", // M4-M6: dropped
        thoiGianThucTe: new Date(),
        ghiChu: ghiChu || studentStatus.ghiChu,
      });

      if (!isUpdated) {
        return response.error(
          res,
          "UPDATE_FAILED",
          "Không thể cập nhật trạng thái học sinh",
          400
        );
      }

      // Get updated status
      const updatedStatus = await TrangThaiHocSinhModel.getById(id, studentId);
      const student = await HocSinhModel.getById(studentId);

      // M4-M6: Emit WS event pickup_status_update
      const io = req.app.get("io");
      if (io) {
        const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
        const eventData = {
          tripId: parseInt(id),
          studentId: parseInt(studentId),
          studentName: student?.hoTen || `Học sinh #${studentId}`,
          status: "dropped", // M4-M6: Standardized status
          tsServer: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        };

        // Emit to trip room (parents + admin)
        io.to(`trip-${id}`).emit("pickup_status_update", eventData);

        // Emit to parent's user room
        if (student?.maPhuHuynh) {
          io.to(`user-${student.maPhuHuynh}`).emit(
            "pickup_status_update",
            eventData
          );
        }

        // Emit to role-admin
        io.to("role-quan_tri").emit("pickup_status_update", eventData);

        // 📬 M5: Create notification in database for parent
        if (student?.maPhuHuynh) {
          try {
            const route = await TuyenDuongModel.getById(schedule.maTuyen);
            const bus = await XeBuytModel.getById(schedule.maXe);

            // 🔥 FIX: Get trip type to customize notification message
            const tripType = schedule?.loaiChuyen || "don_sang";

            let tieuDe, noiDung;
            if (tripType === "tra_chieu") {
              // Return trip: notify about drop-off
              tieuDe = "✅ Con đã được trả";
              noiDung = `${student.hoTen} đã được trả tại điểm dừng an toàn.`;
            } else {
              // Morning trip: notify about checkout (shouldn't happen in morning trip, but keep for safety)
              tieuDe = "Con đã xuống xe";
              noiDung = `${student.hoTen} đã được trả tại điểm dừng an toàn`;
            }

            // 🔥 FIX: Use correct signature for createMultiple (object format)
            await ThongBaoModel.createMultiple({
              danhSachNguoiNhan: [student.maPhuHuynh],
              tieuDe,
              noiDung,
              loaiThongBao: "chuyen_di",
            });

            // Emit notification:new event to parent
            const roomName = `user-${student.maPhuHuynh}`;
            console.log(
              `🔔 [CHECKOUT DEBUG] Emitting student_checkout notification`
            );
            console.log(`   Student: ${student.hoTen} (ID: ${studentId})`);
            console.log(`   Parent ID: ${student.maPhuHuynh}`);
            console.log(`   Room: ${roomName}`);
            console.log(`   Trip: #${id}`);
            console.log(`   Trip Type: ${tripType}`);

            io.to(roomName).emit("notification:new", {
              tieuDe,
              noiDung,
              loaiThongBao: "chuyen_di",
              tripId: parseInt(id),
              studentId: parseInt(studentId),
              thoiGianGui: new Date(),
              daDoc: false,
            });

            console.log(
              `✅ Sent checkout notification to parent ${student.maPhuHuynh}`
            );
          } catch (notifError) {
            console.warn(
              "⚠️  Failed to create checkout notification:",
              notifError.message
            );
          }
        }
      }

      return response.ok(res, {
        ...updatedStatus,
        studentName: student?.hoTen,
        status: "dropped", // M4-M6: Standardized
      });
    } catch (error) {
      console.error("Error in TripController.checkoutStudent:", error);
      return response.serverError(
        res,
        "Lỗi server khi điểm danh học sinh",
        error
      );
    }
  }

  // M5: Đánh vắng học sinh (absent)
  static async markStudentAbsent(req, res) {
    try {
      const { id, studentId } = req.params;
      const { ghiChu } = req.body;

      if (!id || !studentId) {
        return response.validationError(
          res,
          "Mã chuyến đi và mã học sinh là bắt buộc",
          [
            { field: "id", message: "Mã chuyến đi không được để trống" },
            { field: "studentId", message: "Mã học sinh không được để trống" },
          ]
        );
      }

      // Get trip
      const trip = await ChuyenDiModel.getById(id);
      if (!trip) {
        return response.notFound(res, "Không tìm thấy chuyến đi");
      }

      // Get student status
      const studentStatus = await TrangThaiHocSinhModel.getById(id, studentId);
      if (!studentStatus) {
        return response.notFound(res, "Học sinh không có trong chuyến đi này");
      }

      // Update status to 'vang' (absent)
      const isUpdated = await TrangThaiHocSinhModel.update(id, studentId, {
        trangThai: "vang",
        thoiGianThucTe: new Date(),
        ghiChu: ghiChu || "Học sinh vắng mặt",
      });

      if (!isUpdated) {
        return response.error(
          res,
          "UPDATE_FAILED",
          "Không thể cập nhật trạng thái học sinh",
          400
        );
      }

      // Get updated status
      const updatedStatus = await TrangThaiHocSinhModel.getById(id, studentId);
      const student = await HocSinhModel.getById(studentId);

      // Emit WS event pickup_status_update
      const io = req.app.get("io");
      if (io) {
        const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
        const eventData = {
          tripId: parseInt(id),
          studentId: parseInt(studentId),
          studentName: student?.hoTen || `Học sinh #${studentId}`,
          status: "absent",
          tsServer: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        };

        // Emit to trip room (parents + admin)
        io.to(`trip-${id}`).emit("pickup_status_update", eventData);

        // Emit to parent's user room
        if (student?.maPhuHuynh) {
          io.to(`user-${student.maPhuHuynh}`).emit(
            "pickup_status_update",
            eventData
          );
        }

        // Emit to role-admin
        io.to("role-quan_tri").emit("pickup_status_update", eventData);

        // 📧 M5: Create notification in database for parent
        if (student?.maPhuHuynh) {
          try {
            const route = await TuyenDuongModel.getById(schedule.maTuyen);
            const bus = await XeBuytModel.getById(schedule.maXe);

            console.log(
              `[Mark Absent] Creating notification for parent ${student.maPhuHuynh}`
            );

            const notificationTitle = "⚠️ Con bạn vắng mặt";
            const notificationContent = `${
              student.hoTen
            } không có mặt tại điểm đón trên chuyến đi tuyến ${
              route?.tenTuyen || "N/A"
            } (${bus?.bienSoXe || "N/A"})`;

            await ThongBaoModel.createMultiple({
              danhSachNguoiNhan: [student.maPhuHuynh],
              tieuDe: notificationTitle,
              noiDung: notificationContent,
              loaiThongBao: "chuyen_di",
            });

            console.log(
              `[Mark Absent] Emitting notification:new to user-${student.maPhuHuynh}`
            );
            await ThongBaoModel.createMultiple({
              danhSachNguoiNhan: [student.maPhuHuynh],
              tieuDe: "⚠️ Con vắng mặt",
              noiDung: `⚠️ VẮNG MẶT\n\n${
                student.hoTen
              } không có mặt tại điểm đón lúc ${new Date().toLocaleTimeString(
                "vi-VN"
              )}.\n\n🚌 Xe: ${bus?.bienSoXe || "N/A"}\n🛣️ Tuyến: ${
                route?.tenTuyen || "N/A"
              }\n\n📞 Vui lòng liên hệ nhà trường nếu có thắc mắc.`,
              loaiThongBao: "chuyen_di",
            });

            // Emit notification:new event to parent
            const roomName = `user-${student.maPhuHuynh}`;
            console.log(
              `🔔 [ABSENT DEBUG] Emitting student_absent notification`
            );
            console.log(`   Student: ${student.hoTen} (ID: ${studentId})`);
            console.log(`   Parent ID: ${student.maPhuHuynh}`);
            console.log(`   Room: ${roomName}`);
            console.log(`   Trip: #${id}`);

            io.to(`user-${student.maPhuHuynh}`).emit("notification:new", {
              tieuDe: notificationTitle,
              noiDung: notificationContent,
              tieuDe: "⚠️ Con vắng mặt",
              noiDung: `${student.hoTen} không có mặt tại điểm đón.`,
              loaiThongBao: "chuyen_di",
              thoiGianTao: new Date().toISOString(),
            });

            console.log(
              `✅ [Mark Absent] Sent notification to parent ${student.maPhuHuynh}``✅ Sent absent notification to parent ${student.maPhuHuynh}`
            );
          } catch (notifError) {
            console.error(
              "❌ [Mark Absent] Failed to create notification:",
              notifError.message
            );
          }
        }
      }

      return response.ok(res, {
        ...updatedStatus,
        studentName: student?.hoTen,
        status: "absent",
      });
    } catch (error) {
      console.error("Error in TripController.markStudentAbsent:", error);
      return response.serverError(
        res,
        "Lỗi server khi đánh vắng học sinh",
        error
      );
    }
  }

  // M5: Báo cáo sự cố (emergency/incident)
  // 🔥 NEW: Hỗ trợ báo cáo TRONG CHUYẾN và NGOÀI CHUYẾN
  static async reportIncident(req, res) {
    try {
      const { id } = req.params;
      const { loaiSuCo, moTa, viTri, loaiBaoCao = "trong_chuyen" } = req.body; // 'trong_chuyen' hoặc 'ngoai_chuyen'
      const rawAffected =
        req.body?.hocSinhLienQuan ||
        req.body?.affectedStudents ||
        req.body?.studentIds ||
        [];
      const affectedStudentIds = Array.isArray(rawAffected)
        ? [
            ...new Set(
              rawAffected
                .map((value) => Number(value))
                .filter((value) => Number.isInteger(value) && value > 0)
            ),
          ]
        : [];

      if (!id) {
        return response.validationError(res, "Mã chuyến đi là bắt buộc", [
          { field: "id", message: "Mã chuyến đi không được để trống" },
        ]);
      }

      if (!loaiSuCo || !moTa) {
        return response.validationError(
          res,
          "Loại sự cố và mô tả là bắt buộc",
          [
            { field: "loaiSuCo", message: "Loại sự cố không được để trống" },
            { field: "moTa", message: "Mô tả sự cố không được để trống" },
          ]
        );
      }

      // Get trip
      const trip = await ChuyenDiModel.getById(id);
      if (!trip) {
        return response.notFound(res, "Không tìm thấy chuyến đi");
      }

      // Get schedule and route info
      const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
      const route = await TuyenDuongModel.getById(schedule?.maTuyen);
      const bus = await XeBuytModel.getById(schedule?.maXe);

      // 🔥 FIX: Lưu incident vào DB
      const SuCoModel = (await import("../models/SuCoModel.js")).default;
      const mucDo = req.body.mucDo || "trung_binh"; // Map từ severity
      const createdIncident = await SuCoModel.create({
        maChuyen: parseInt(id),
        moTa: moTa,
        mucDo: mucDo,
        trangThai: "moi", // Mới báo cáo
      });
      console.log(
        `✅ [M5 Report Incident] Saved incident ${createdIncident.maSuCo} to database`
      );

      // Chuẩn bị dữ liệu phụ huynh bị ảnh hưởng (nếu có)
      const baseParentMessage = `Xe buýt tuyến ${route?.tenTuyen || "N/A"} (${
        bus?.bienSoXe || "N/A"
      }) đang gặp sự cố: ${moTa}. Vui lòng liên hệ nhà trường để biết thêm chi tiết.`;
      let parentNotificationMeta = {
        parentIds: [],
        parentMessage: baseParentMessage,
        affectedNamesText: "",
      };

      try {
        const students = await HocSinhModel.getByTripId(id);
        let targetStudents = students;
        let filteredBySelection = false;
        if (affectedStudentIds.length > 0) {
          const selectionSet = new Set(affectedStudentIds);
          targetStudents = students.filter((s) =>
            selectionSet.has(Number(s.maHocSinh))
          );
          if (targetStudents.length === 0) {
            console.warn(
              `[M5 Report Incident] No students matched selection ${affectedStudentIds.join(
                ", "
              )}. Defaulting to all parents on trip ${id}`
            );
            targetStudents = students;
          } else {
            filteredBySelection = true;
          }
        }

        const parentIds = [
          ...new Set(
            targetStudents.map((s) => s.maPhuHuynh).filter((pid) => pid)
          ),
        ];

        const affectedNames = filteredBySelection
          ? targetStudents.map((s) => s.hoTen).filter(Boolean)
          : [];
        const affectedNamesText =
          affectedNames.length > 0
            ? ` Học sinh liên quan: ${affectedNames.join(", ")}.`
            : "";

        parentNotificationMeta = {
          parentIds,
          parentMessage: `${baseParentMessage}${affectedNamesText}`,
          affectedNamesText,
        };
      } catch (studentLoadError) {
        console.warn(
          "[M5 Report Incident] Failed to prepare parent notifications:",
          studentLoadError.message
        );
      }

      // 🔥 FIX: Gửi notification cho admin
      const NguoiDungModel = (await import("../models/NguoiDungModel.js"))
        .default;
      const admins = await NguoiDungModel.getByRole("quan_tri");
      const adminIds = admins.map((a) => a.maNguoiDung).filter((id) => id);

      if (adminIds.length > 0) {
        await ThongBaoModel.createMultiple({
          danhSachNguoiNhan: adminIds,
          tieuDe: `🚨 Sự cố mới: ${loaiSuCo}`,
          noiDung: `Xe buýt ${bus?.bienSoXe || "N/A"} tuyến ${
            route?.tenTuyen || "N/A"
          } gặp sự cố: ${moTa}. Vị trí: ${viTri || "Chưa xác định"}.${
            parentNotificationMeta.affectedNamesText
          }`,
          loaiThongBao: "trip_incident",
          tieuDe: `${reportTypeText} - 🚨 ${loaiSuCo}`,
          noiDung: `${reportTypeText}\n🚌 Xe: ${
            bus?.bienSoXe || "N/A"
          }\n🛣️ Tuyến: ${
            route?.tenTuyen || "N/A"
          }\n⚠️ Sự cố: ${moTa}\n📍 Vị trí: ${viTri || "Chưa xác định"}${
            parentNotificationMeta.affectedNamesText
          }`,
          loaiThongBao: "su_co",
        });
        console.log(
          `✅ [M5 Report Incident] Sent notifications to ${adminIds.length} admins`
        );
      }

      // Emit WS event to all stakeholders
      const io = req.app.get("io");
      if (io) {
        const eventData = {
          tripId: parseInt(id),
          busId: schedule?.maXe,
          incidentType: loaiSuCo,
          description: moTa,
          location: viTri || null,
          timestamp: new Date().toISOString(),
        };

        // Emit to trip room
        io.to(`trip-${id}`).emit("trip_incident", eventData);
        // Emit to bus room
        io.to(`bus-${schedule?.maXe}`).emit("trip_incident", eventData);
        // Emit to admin room (high priority)
        io.to("role-quan_tri").emit("trip_incident", eventData);

        // 🚨 M5: Create urgent notification for parents on this trip (respect selection if provided)
        try {
          if (parentNotificationMeta.parentIds.length > 0) {
            await ThongBaoModel.createMultiple({
              danhSachNguoiNhan: parentNotificationMeta.parentIds,
              tieuDe: `⚠️ Sự cố: ${loaiSuCo}`,
              noiDung: parentNotificationMeta.parentMessage,
              loaiThongBao: "su_co",
            });

            // Emit notification:new event to each parent
            for (const parentId of parentNotificationMeta.parentIds) {
              io.to(`user-${parentId}`).emit("notification:new", {
                tieuDe: `⚠️ Sự cố: ${loaiSuCo}`,
                noiDung: parentNotificationMeta.parentMessage,
                loaiThongBao: "su_co",
                thoiGianTao: new Date().toISOString(),
              });
            }

            console.log(
              `🚨 Sent incident notifications to ${parentNotificationMeta.parentIds.length} parents`
            );
          } else {
            console.warn(
              "[M5 Report Incident] No parent IDs determined for incident notification"
            );
          }
        } catch (notifError) {
          console.warn(
            "⚠️  Failed to create incident notification:",
            notifError.message
          );
        }
      }

      return response.ok(res, {
        tripId: parseInt(id),
        incidentType: loaiSuCo,
        description: moTa,
        location: viTri,
        timestamp: new Date().toISOString(),
        message: "Đã gửi thông báo sự cố đến phụ huynh và quản trị viên",
      });
    } catch (error) {
      console.error("Error in TripController.reportIncident:", error);
      return response.serverError(res, "Lỗi server khi báo cáo sự cố", error);
    }
  }

  // Cập nhật trạng thái học sinh trong chuyến đi (Legacy - keep for backward compatibility)
  static async updateStudentStatus(req, res) {
    try {
      const { id, studentId } = req.params;
      const { trangThai, ghiChu } = req.body;

      console.log(`\n🔔 [updateStudentStatus] Request received:`);
      console.log(`   Trip ID: ${id}`);
      console.log(`   Student ID: ${studentId}`);
      console.log(`   New Status: ${trangThai}`);
      console.log(`   Note: ${ghiChu || "(none)"}`);

      if (!id || !studentId) {
        return response.validationError(
          res,
          "Mã chuyến đi và mã học sinh là bắt buộc",
          [
            { field: "id", message: "Mã chuyến đi không được để trống" },
            { field: "studentId", message: "Mã học sinh không được để trống" },
          ]
        );
      }

      if (!trangThai) {
        return response.validationError(res, "Trạng thái là bắt buộc", [
          { field: "trangThai", message: "Trạng thái không được để trống" },
        ]);
      }

      // Validation trạng thái
      const validStatuses = ["cho_don", "da_don", "da_tra", "vang"];
      if (!validStatuses.includes(trangThai)) {
        return response.validationError(res, "Trạng thái không hợp lệ", [
          {
            field: "trangThai",
            message: `Trạng thái phải là một trong: ${validStatuses.join(
              ", "
            )}`,
          },
        ]);
      }

      // Kiểm tra trạng thái học sinh có tồn tại không
      const existingStatus = await TrangThaiHocSinhModel.getByTripAndStudent(
        id,
        studentId
      );
      if (!existingStatus) {
        return response.notFound(
          res,
          "Không tìm thấy học sinh trong chuyến đi này"
        );
      }

      // Validate status transitions (business logic)
      const currentStatus = existingStatus.trangThai;
      const allowedTransitions = {
        cho_don: ["da_don", "vang"], // Chờ đón → Đã đón hoặc Vắng
        da_don: ["da_tra", "cho_don"], // Đã đón → Đã trả hoặc Reset về Chờ đón (for testing/correction)
        da_tra: ["cho_don"], // Đã trả → Reset về Chờ đón (for testing/correction)
        vang: ["cho_don"], // Vắng → Reset về Chờ đón (for testing/correction)
      };

      console.log(
        `[updateStudentStatus] Current status: ${currentStatus} → New status: ${trangThai}`
      );
      console.log(
        `[updateStudentStatus] Allowed transitions from ${currentStatus}:`,
        allowedTransitions[currentStatus]
      );

      if (
        currentStatus &&
        !allowedTransitions[currentStatus]?.includes(trangThai)
      ) {
        console.error(
          `❌ [updateStudentStatus] Invalid transition: ${currentStatus} → ${trangThai}`
        );
        return response.error(
          res,
          "INVALID_STATUS_TRANSITION",
          `Không thể chuyển từ trạng thái "${currentStatus}" sang "${trangThai}"`,
          400
        );
      }

      console.log(
        `✅ [updateStudentStatus] Transition allowed: ${currentStatus} → ${trangThai}`
      );

      // Cập nhật trạng thái - use old signature with maChuyen, maHocSinh
      const isUpdated = await TrangThaiHocSinhModel.update(
        id, // maChuyen
        studentId, // maHocSinh
        {
          thuTuDiemDon: existingStatus.thuTuDiemDon,
          trangThai,
          thoiGianThucTe: new Date().toISOString(),
          ghiChu: ghiChu || existingStatus.ghiChu,
        }
      );

      if (!isUpdated) {
        return response.error(
          res,
          "UPDATE_FAILED",
          "Không thể cập nhật trạng thái học sinh",
          400
        );
      }

      const updatedStatus = await TrangThaiHocSinhModel.getById(id, studentId);

      // 🔔 Send realtime notification to parent when student is picked up
      if (trangThai === "da_don") {
        try {
          console.log(
            `[Student Pickup] Starting notification for student ${studentId}`
          );

          // Get student and parent info
          const student = await HocSinhModel.getById(studentId);
          console.log(`[Student Pickup] Student info:`, student);

          if (student && student.maPhuHuynh) {
            const trip = await ChuyenDiModel.getById(id);
            const tieuDe = "🚌 Con bạn đã lên xe";
            const noiDung = `${student.hoTen} đã được đón lên xe buýt chuyến ${
              trip?.tenChuyen || id
            }`;

            console.log(
              `[Student Pickup] Creating notification in DB for parent ${student.maPhuHuynh}`
            );

            // Create notification in database
            const notificationResult = await ThongBaoModel.create({
              maNguoiNhan: student.maPhuHuynh,
              tieuDe,
              noiDung,
              loaiThongBao: "chuyen_di",
            });

            console.log(
              `[Student Pickup] Notification created in DB:`,
              notificationResult
            );

            // Send realtime notification via Socket.IO
            const io = req.app.get("io");
            console.log(
              `[Student Pickup] Socket.IO instance:`,
              io ? "Available" : "NOT Available"
            );

            if (io) {
              const notificationData = {
                tieuDe,
                noiDung,
                loaiThongBao: "chuyen_di",
                thoiGianGui: new Date().toISOString(),
                studentId: student.maHocSinh,
                studentName: student.hoTen,
                tripId: id,
              };

              const targetRoom = `user-${student.maPhuHuynh}`;
              console.log(
                `[Student Pickup] Emitting notification:new to room: ${targetRoom}`
              );
              console.log(
                `[Student Pickup] Notification data:`,
                notificationData
              );

              io.to(targetRoom).emit("notification:new", notificationData);

              console.log(
                `✅ [Student Pickup] Sent notification to parent ${student.maPhuHuynh} for student ${student.hoTen}`
              );
            } else {
              console.error(
                `❌ [Student Pickup] Socket.IO instance is not available!`
              );
            }
          } else {
            console.log(
              `[Student Pickup] Student not found or has no parent. Student:`,
              student
            );
          }
        } catch (notifError) {
          console.error(
            "❌ [Student Pickup] Error sending notification:",
            notifError
          );
          // Don't fail the request if notification fails
        }
      }

      // 🔔 Send realtime notification to parent when student is absent
      if (trangThai === "vang") {
        try {
          console.log(
            `[Student Absent] Starting notification for student ${studentId}`
          );

          // Get student and parent info
          const student = await HocSinhModel.getById(studentId);
          console.log(`[Student Absent] Student info:`, student);

          if (student && student.maPhuHuynh) {
            const trip = await ChuyenDiModel.getById(id);
            const tieuDe = "⚠️ Con bạn vắng mặt";
            const noiDung = `${
              student.hoTen
            } không có mặt tại điểm đón của chuyến ${trip?.tenChuyen || id}`;

            console.log(
              `[Student Absent] Creating notification in DB for parent ${student.maPhuHuynh}`
            );

            // Create notification in database
            const notificationResult = await ThongBaoModel.create({
              maNguoiNhan: student.maPhuHuynh,
              tieuDe,
              noiDung,
              loaiThongBao: "chuyen_di",
            });

            console.log(
              `[Student Absent] Notification created in DB:`,
              notificationResult
            );

            // Send realtime notification via Socket.IO
            const io = req.app.get("io");
            console.log(
              `[Student Absent] Socket.IO instance:`,
              io ? "Available" : "NOT Available"
            );

            if (io) {
              const notificationData = {
                tieuDe,
                noiDung,
                loaiThongBao: "chuyen_di",
                thoiGianGui: new Date().toISOString(),
                studentId: student.maHocSinh,
                studentName: student.hoTen,
                tripId: id,
              };

              const targetRoom = `user-${student.maPhuHuynh}`;
              console.log(
                `[Student Absent] Emitting notification:new to room: ${targetRoom}`
              );
              console.log(
                `[Student Absent] Notification data:`,
                notificationData
              );

              io.to(targetRoom).emit("notification:new", notificationData);

              console.log(
                `⚠️ [Student Absent] Sent notification to parent ${student.maPhuHuynh} for student ${student.hoTen}`
              );
            } else {
              console.error(
                `❌ [Student Absent] Socket.IO instance is not available!`
              );
            }
          } else {
            console.log(
              `[Student Absent] Student not found or has no parent. Student:`,
              student
            );
          }
        } catch (notifError) {
          console.error(
            "❌ [Student Absent] Error sending notification:",
            notifError
          );
          // Don't fail the request if notification fails
        }
      }

      res.status(200).json({
        success: true,
        data: updatedStatus,
        message: "Cập nhật trạng thái học sinh thành công",
      });
    } catch (error) {
      console.error("Error in TripController.updateStudentStatus:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi cập nhật trạng thái học sinh",
        error: error.message,
      });
    }
  }

  // Lấy thống kê chuyến đi
  static async getStats(req, res) {
    try {
      const { from, to } = req.query;

      if (!from || !to) {
        return res.status(400).json({
          success: false,
          code: "VALIDATION_400",
          message:
            "Vui lòng cung cấp ngày bắt đầu (from) và ngày kết thúc (to)",
        });
      }

      // 1. Gọi hàm Model đã tối ưu
      const stats = await ChuyenDiModel.getStats(from, to);

      // 2. Xử lý và tính toán
      const totalTrips = parseFloat(stats.totalTrips || 0);
      const completedTrips = parseFloat(stats.completedTrips || 0);
      const onTimeTrips = parseFloat(stats.onTimeTrips || 0);

      // Tính onTimePercentage (dựa trên số chuyến đã hoàn thành)
      const onTimePercentage =
        completedTrips > 0 ? (onTimeTrips / completedTrips) * 100 : 0;

      // 3. Tạo response data khớp 100% với openapi.yaml
      const responseData = {
        totalTrips: totalTrips,
        completedTrips: completedTrips,
        cancelledTrips: parseFloat(stats.cancelledTrips || 0),
        delayedTrips: parseFloat(stats.delayedTrips || 0),
        averageDuration: parseFloat((stats.averageDurationInSeconds || 0) / 60), // Chuyển sang phút
        onTimePercentage: parseFloat(onTimePercentage.toFixed(2)), // Làm tròn 2 chữ số
      };

      res.status(200).json({
        success: true,
        meta: { queryRange: { from, to } },
        data: responseData,
      });
    } catch (error) {
      console.error("Error in TripController.getStats:", error);
      res.status(500).json({
        success: false,
        code: "INTERNAL_500",
        message: "Lỗi server khi lấy thống kê chuyến đi",
        error: error.message,
      });
    }
  }
}

export default TripController;
