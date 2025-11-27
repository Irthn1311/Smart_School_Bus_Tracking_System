// ScheduleController - Controller chuyên nghiệp cho quản lý lịch trình với real-time features
import ScheduleService from "../services/ScheduleService.js";
import LichTrinhModel from "../models/LichTrinhModel.js";
import XeBuytModel from "../models/XeBuytModel.js";
import TaiXeModel from "../models/TaiXeModel.js";
import TuyenDuongModel from "../models/TuyenDuongModel.js";
import ChuyenDiModel from "../models/ChuyenDiModel.js";
import * as response from "../utils/response.js";

class ScheduleController {
  // Lấy danh sách tất cả lịch trình
  static async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        maTuyen,
        maXe,
        maTaiXe,
        loaiChuyen,
        dangApDung,
      } = req.query;
      const offset = (page - 1) * limit;

      let schedules = await LichTrinhModel.getAll();
      let totalCount = schedules.length;

      // Lọc theo tuyến đường
      if (maTuyen) {
        schedules = schedules.filter(
          (schedule) => schedule.maTuyen === maTuyen
        );
        totalCount = schedules.length;
      }

      // Lọc theo xe buýt
      if (maXe) {
        schedules = schedules.filter((schedule) => schedule.maXe === maXe);
        totalCount = schedules.length;
      }

      // Lọc theo tài xế
      if (maTaiXe) {
        schedules = schedules.filter(
          (schedule) => schedule.maTaiXe === maTaiXe
        );
        totalCount = schedules.length;
      }

      // Lọc theo loại chuyến
      if (loaiChuyen) {
        schedules = schedules.filter(
          (schedule) => schedule.loaiChuyen === loaiChuyen
        );
        totalCount = schedules.length;
      }

      // Lọc theo trạng thái áp dụng
      if (dangApDung !== undefined) {
        const isActive = dangApDung === "true";
        schedules = schedules.filter(
          (schedule) => schedule.dangApDung === isActive
        );
        totalCount = schedules.length;
      }

      // Phân trang
      const paginatedSchedules = schedules.slice(
        offset,
        offset + parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: paginatedSchedules,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: parseInt(limit),
        },
        message: "Lấy danh sách lịch trình thành công",
      });
    } catch (error) {
      console.error("Error in ScheduleController.getAll:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy danh sách lịch trình",
        error: error.message,
      });
    }
  }

  // Lấy thông tin chi tiết một lịch trình
  static async getById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Mã lịch trình là bắt buộc",
        });
      }

      const schedule = await LichTrinhModel.getById(id);

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lịch trình",
        });
      }

      // Sử dụng ScheduleService để lấy đầy đủ thông tin (bao gồm stops với students)
      const scheduleDetail = await ScheduleService.getById(id);

      // Lấy thông tin chi tiết xe buýt và tài xế
      const busInfo = await XeBuytModel.getById(scheduleDetail.maXe);
      const driverInfo = await TaiXeModel.getById(scheduleDetail.maTaiXe);
      const routeInfo = await TuyenDuongModel.getById(scheduleDetail.maTuyen);

      // Lấy lịch sử chuyến đi của lịch trình này
      const tripHistory = await ChuyenDiModel.getByScheduleId(id);

      res.status(200).json({
        success: true,
        data: {
          ...scheduleDetail,
          busInfo,
          driverInfo,
          routeInfo,
          tripHistory,
        },
        message: "Lấy thông tin lịch trình thành công",
      });
    } catch (error) {
      console.error("Error in ScheduleController.getById:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy thông tin lịch trình",
        error: error.message,
      });
    }
  }

  // Tạo lịch trình mới
  static async create(req, res) {
    try {
      const { maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, ngayChay, dangApDung, students } =
        req.body;

      console.log(`[ScheduleController] create: Received request with students:`, {
        studentsCount: students ? students.length : 0,
        students: students ? students.slice(0, 3) : null,
        maTuyen,
        ngayChay,
      });

      // Validation dữ liệu bắt buộc
      if (!maTuyen || !maXe || !maTaiXe || !loaiChuyen || !gioKhoiHanh || !ngayChay) {
        return res.status(400).json({
          success: false,
          message:
            "Mã tuyến, mã xe, mã tài xế, loại chuyến, giờ khởi hành và ngày chạy là bắt buộc",
        });
      }

      // Validate students array format nếu có
      if (students && Array.isArray(students)) {
        const invalidStudents = students.filter(
          (s) => !s.maHocSinh || !s.thuTuDiem || !s.maDiem
        );
        if (invalidStudents.length > 0) {
          console.warn(`[ScheduleController] create: Found ${invalidStudents.length} invalid students:`, invalidStudents);
          return res.status(400).json({
            success: false,
            message: `Có ${invalidStudents.length} học sinh không hợp lệ. Mỗi học sinh cần có maHocSinh, thuTuDiem, và maDiem.`,
            invalidStudents,
          });
        }
        console.log(`[ScheduleController] create: ✅ Validated ${students.length} students`);
      } else if (students !== undefined && students !== null) {
        console.warn(`[ScheduleController] create: students is not an array:`, typeof students, students);
      }

      // Kiểm tra tuyến đường có tồn tại không
      const route = await TuyenDuongModel.getById(maTuyen);
      if (!route) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy tuyến đường",
        });
      }

      // Kiểm tra xe buýt có tồn tại và đang hoạt động không
      const bus = await XeBuytModel.getById(maXe);
      if (!bus) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy xe buýt",
        });
      }
      if (bus.trangThai !== "hoat_dong") {
        return res.status(400).json({
          success: false,
          message: "Xe buýt không đang hoạt động",
        });
      }

      // Kiểm tra tài xế có tồn tại và đang hoạt động không
      const driver = await TaiXeModel.getById(maTaiXe);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy tài xế",
        });
      }
      if (driver.trangThai !== "hoat_dong") {
        return res.status(400).json({
          success: false,
          message: "Tài xế không đang hoạt động",
        });
      }

      // Validation loại chuyến
      const validTripTypes = ["don_sang", "tra_chieu"];
      if (!validTripTypes.includes(loaiChuyen)) {
        return res.status(400).json({
          success: false,
          message: "Loại chuyến phải là 'don_sang' hoặc 'tra_chieu'",
        });
      }

      // Validation giờ khởi hành
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(gioKhoiHanh)) {
        return res.status(400).json({
          success: false,
          message: "Giờ khởi hành phải có định dạng HH:MM",
        });
      }

      // Validation ngày chạy
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(ngayChay)) {
        return res.status(400).json({
          success: false,
          message: "Ngày chạy phải có định dạng YYYY-MM-DD",
        });
      }

      // Validate students array if provided
      if (students !== undefined) {
        if (!Array.isArray(students)) {
          return response.validationError(res, "students phải là một mảng", [
            { field: "students", message: "students phải là một mảng các object {maHocSinh, thuTuDiem, maDiem}" }
          ]);
        }
        // Validate each student object
        for (const student of students) {
          if (!student.maHocSinh || !student.thuTuDiem || !student.maDiem) {
            return response.validationError(res, "Mỗi student phải có maHocSinh, thuTuDiem, và maDiem", [
              { field: "students", message: "Mỗi student phải có đầy đủ: maHocSinh, thuTuDiem, maDiem" }
            ]);
          }
        }
      }

      // M1-M3: Dùng ScheduleService để có conflict details
      try {
        const newSchedule = await ScheduleService.create({
          maTuyen,
          maXe,
          maTaiXe,
          loaiChuyen,
          gioKhoiHanh,
          ngayChay,
          dangApDung: dangApDung !== false,
          students: students || [],
        });
        return response.created(res, newSchedule);
      } catch (serviceError) {
        // Handle conflict with details
        if (serviceError.message === "SCHEDULE_CONFLICT" && serviceError.conflicts) {
          return response.error(res, "SCHEDULE_CONFLICT", "Xung đột lịch trình với xe buýt hoặc tài xế", 409, {
            conflicts: serviceError.conflicts.map(c => ({
              scheduleId: c.maLichTrinh,
              conflictType: c.conflictType,
              bus: c.bienSoXe,
              driver: c.tenTaiXe,
              time: c.gioKhoiHanh,
              date: c.ngayChay,
            }))
          });
        }
        // Handle other service errors
        if (serviceError.message === "MISSING_REQUIRED_FIELDS") {
          return response.validationError(res, "Thiếu trường bắt buộc", [
            { field: "maTuyen|maXe|maTaiXe|loaiChuyen|gioKhoiHanh|ngayChay", message: "Tất cả các trường này là bắt buộc" }
          ]);
        }
        if (serviceError.message === "ROUTE_NOT_FOUND") {
          return response.notFound(res, "Không tìm thấy tuyến đường");
        }
        if (serviceError.message === "BUS_NOT_FOUND") {
          return response.notFound(res, "Không tìm thấy xe buýt");
        }
        if (serviceError.message === "DRIVER_NOT_FOUND") {
          return response.notFound(res, "Không tìm thấy tài xế");
        }
        if (serviceError.message === "INVALID_TRIP_TYPE") {
          return response.validationError(res, "Loại chuyến không hợp lệ", [
            { field: "loaiChuyen", message: "Phải là 'don_sang' hoặc 'tra_chieu'" }
          ]);
        }
        if (serviceError.message === "INVALID_STUDENT_ASSIGNMENT") {
          return response.validationError(res, "Phân công học sinh không hợp lệ", 
            serviceError.validationErrors?.map((err, idx) => ({
              field: `students[${idx}]`,
              message: err
            })) || [{ field: "students", message: "Có lỗi trong phân công học sinh" }]
          );
        }
        throw serviceError;
      }
    } catch (err) {
      console.error("Error in ScheduleController.create:", err);
      return response.serverError(res, "Lỗi server khi tạo lịch trình", err);
    }
  }

  // Cập nhật lịch trình
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, ngayChay, dangApDung } =
        req.body;

      if (!id) {
        return response.validationError(res, "Mã lịch trình là bắt buộc", [
          { field: "id", message: "Mã lịch trình không được để trống" }
        ]);
      }

      // M1-M3: Dùng ScheduleService để có conflict details
      const updateData = {};
      if (maTuyen !== undefined) updateData.maTuyen = maTuyen;
      if (maXe !== undefined) updateData.maXe = maXe;
      if (maTaiXe !== undefined) updateData.maTaiXe = maTaiXe;
      if (loaiChuyen !== undefined) updateData.loaiChuyen = loaiChuyen;
      if (gioKhoiHanh !== undefined) updateData.gioKhoiHanh = gioKhoiHanh;
      if (ngayChay !== undefined) updateData.ngayChay = ngayChay;
      if (dangApDung !== undefined) updateData.dangApDung = dangApDung;
      if (req.body.students !== undefined) {
        // Validate students array if provided
        if (!Array.isArray(req.body.students)) {
          return response.validationError(res, "students phải là một mảng", [
            { field: "students", message: "students phải là một mảng các object {maHocSinh, thuTuDiem, maDiem}" }
          ]);
        }
        // Validate each student object
        for (const student of req.body.students) {
          if (!student.maHocSinh || !student.thuTuDiem || !student.maDiem) {
            return response.validationError(res, "Mỗi student phải có maHocSinh, thuTuDiem, và maDiem", [
              { field: "students", message: "Mỗi student phải có đầy đủ: maHocSinh, thuTuDiem, maDiem" }
            ]);
          }
        }
        updateData.students = req.body.students;
      }

      try {
        const updatedSchedule = await ScheduleService.update(id, updateData);
        return response.ok(res, updatedSchedule);
      } catch (serviceError) {
        // Handle conflict with details
        if (serviceError.message === "SCHEDULE_CONFLICT" && serviceError.conflicts) {
          return response.error(res, "SCHEDULE_CONFLICT", "Xung đột lịch trình với xe buýt hoặc tài xế", 409, {
            conflicts: serviceError.conflicts.map(c => ({
              scheduleId: c.maLichTrinh,
              conflictType: c.conflictType,
              bus: c.bienSoXe,
              driver: c.tenTaiXe,
              time: c.gioKhoiHanh,
              date: c.ngayChay,
            }))
          });
        }
        // Handle other service errors
        if (serviceError.message === "SCHEDULE_NOT_FOUND") {
          return response.notFound(res, "Không tìm thấy lịch trình");
        }
        if (serviceError.message === "ROUTE_NOT_FOUND") {
          return response.notFound(res, "Không tìm thấy tuyến đường");
        }
        if (serviceError.message === "BUS_NOT_FOUND") {
          return response.notFound(res, "Không tìm thấy xe buýt");
        }
        if (serviceError.message === "DRIVER_NOT_FOUND") {
          return response.notFound(res, "Không tìm thấy tài xế");
        }
        if (serviceError.message === "INVALID_TRIP_TYPE") {
          return response.validationError(res, "Loại chuyến không hợp lệ", [
            { field: "loaiChuyen", message: "Phải là 'don_sang' hoặc 'tra_chieu'" }
          ]);
        }
        if (serviceError.message === "INVALID_STUDENT_ASSIGNMENT") {
          return response.validationError(res, "Phân công học sinh không hợp lệ", 
            serviceError.validationErrors?.map((err, idx) => ({
              field: `students[${idx}]`,
              message: err
            })) || [{ field: "students", message: "Có lỗi trong phân công học sinh" }]
          );
        }
        throw serviceError;
      }
    } catch (err) {
      console.error("Error in ScheduleController.update:", err);
      return response.serverError(res, "Lỗi server khi cập nhật lịch trình", err);
    }
  }

  // Xóa lịch trình
  static async delete(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Mã lịch trình là bắt buộc",
        });
      }

      // Kiểm tra lịch trình có tồn tại không
      const existingSchedule = await LichTrinhModel.getById(id);
      if (!existingSchedule) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lịch trình",
        });
      }

      // Kiểm tra lịch trình có đang được sử dụng trong chuyến đi không
      const trips = await ChuyenDiModel.getByScheduleId(id);
      if (trips.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Không thể xóa lịch trình đang được sử dụng trong chuyến đi",
          data: { tripsCount: trips.length },
        });
      }

      const isDeleted = await LichTrinhModel.delete(id);

      if (!isDeleted) {
        return res.status(400).json({
          success: false,
          message: "Không thể xóa lịch trình",
        });
      }

      res.status(200).json({
        success: true,
        message: "Xóa lịch trình thành công",
      });
    } catch (error) {
      console.error("Error in ScheduleController.delete:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi xóa lịch trình",
        error: error.message,
      });
    }
  }

  // Cập nhật trạng thái lịch trình và phát sự kiện real-time
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { trangThai } = req.body;

      if (!id || !trangThai) {
        return res.status(400).json({
          success: false,
          message: "Mã lịch trình và trạng thái là bắt buộc",
        });
      }

      // Validation trạng thái
      const validStatuses = [
        "chua_khoi_hanh",
        "dang_chay",
        "da_hoan_thanh",
        "bi_huy",
      ];
      if (!validStatuses.includes(trangThai)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái không hợp lệ",
          validStatuses,
        });
      }

      // Kiểm tra lịch trình có tồn tại không
      const schedule = await LichTrinhModel.getById(id);
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lịch trình",
        });
      }

      // Cập nhật trạng thái
      const isUpdated = await LichTrinhModel.update(id, { trangThai });

      if (!isUpdated) {
        return res.status(400).json({
          success: false,
          message: "Không thể cập nhật trạng thái lịch trình",
        });
      }

      // Phát sự kiện real-time qua Socket.IO
      const io = req.app.get("io");
      if (io && schedule.maXe) {
        io.to(`bus-${schedule.maXe}`).emit("schedule_status_update", {
          scheduleId: id,
          busId: schedule.maXe,
          driverId: schedule.maTaiXe,
          status: trangThai,
          timestamp: new Date().toISOString(),
        });
      }

      const updatedSchedule = await LichTrinhModel.getById(id);

      res.status(200).json({
        success: true,
        data: updatedSchedule,
        message: "Cập nhật trạng thái lịch trình thành công",
      });
    } catch (error) {
      console.error("Error in ScheduleController.updateStatus:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi cập nhật trạng thái lịch trình",
        error: error.message,
      });
    }
  }

  // Lấy lịch trình theo ngày
  static async getByDate(req, res) {
    try {
      const { date } = req.params;
      const { maTuyen, loaiChuyen } = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: "Ngày là bắt buộc",
        });
      }

      // Validation định dạng ngày
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({
          success: false,
          message: "Ngày phải có định dạng YYYY-MM-DD",
        });
      }

      let schedules = await LichTrinhModel.getByDate(date);

      // Lọc theo tuyến đường
      if (maTuyen) {
        schedules = schedules.filter(
          (schedule) => schedule.maTuyen === maTuyen
        );
      }

      // Lọc theo loại chuyến
      if (loaiChuyen) {
        schedules = schedules.filter(
          (schedule) => schedule.loaiChuyen === loaiChuyen
        );
      }

      res.status(200).json({
        success: true,
        data: schedules,
        message: "Lấy lịch trình theo ngày thành công",
      });
    } catch (error) {
      console.error("Error in ScheduleController.getByDate:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy lịch trình theo ngày",
        error: error.message,
      });
    }
  }

  // Lấy thống kê lịch trình
  static async getStats(req, res) {
    try {
      const allSchedules = await LichTrinhModel.getAll();

      const stats = {
        total: allSchedules.length,
        active: allSchedules.filter((schedule) => schedule.dangApDung).length,
        inactive: allSchedules.filter((schedule) => !schedule.dangApDung)
          .length,
        byTripType: {
          di: allSchedules.filter((schedule) => schedule.loaiChuyen === "di")
            .length,
          ve: allSchedules.filter((schedule) => schedule.loaiChuyen === "ve")
            .length,
        },
        byRoute: {},
        byTimeSlot: {},
      };

      // Thống kê theo tuyến đường
      allSchedules.forEach((schedule) => {
        const routeName = schedule.tenTuyen || "Unknown";
        stats.byRoute[routeName] = (stats.byRoute[routeName] || 0) + 1;
      });

      // Thống kê theo khung giờ
      allSchedules.forEach((schedule) => {
        const hour = parseInt(schedule.gioKhoiHanh.split(":")[0]);
        let timeSlot;
        if (hour >= 6 && hour < 12) timeSlot = "Sáng (6h-12h)";
        else if (hour >= 12 && hour < 18) timeSlot = "Chiều (12h-18h)";
        else if (hour >= 18 && hour < 22) timeSlot = "Tối (18h-22h)";
        else timeSlot = "Đêm (22h-6h)";

        stats.byTimeSlot[timeSlot] = (stats.byTimeSlot[timeSlot] || 0) + 1;
      });

      res.status(200).json({
        success: true,
        data: stats,
        message: "Lấy thống kê lịch trình thành công",
      });
    } catch (error) {
      console.error("Error in ScheduleController.getStats:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy thống kê lịch trình",
        error: error.message,
      });
    }
  }

  // Lấy danh sách học sinh của một schedule, nhóm theo điểm dừng
  static async getStudents(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return response.validationError(res, "Mã lịch trình là bắt buộc", [
          { field: "id", message: "Mã lịch trình không được để trống" }
        ]);
      }

      // Kiểm tra schedule có tồn tại không
      const schedule = await LichTrinhModel.getById(id);
      if (!schedule) {
        return response.notFound(res, "Không tìm thấy lịch trình");
      }

      // Import ScheduleStudentStopModel
      const ScheduleStudentStopModel = (await import("../models/ScheduleStudentStopModel.js")).default;
      
      // Lấy tất cả students của schedule
      const students = await ScheduleStudentStopModel.getByScheduleId(id);

      // Nhóm students theo điểm dừng
      const studentsByStop = {};
      students.forEach((student) => {
        const stopKey = `${student.thuTuDiem}_${student.maDiem}`;
        if (!studentsByStop[stopKey]) {
          studentsByStop[stopKey] = {
            thuTuDiem: student.thuTuDiem,
            maDiem: student.maDiem,
            tenDiem: student.tenDiem,
            stopAddress: student.stopAddress,
            stopLat: student.stopLat,
            stopLng: student.stopLng,
            students: [],
          };
        }
        studentsByStop[stopKey].students.push({
          maHocSinh: student.maHocSinh,
          hoTen: student.hoTen,
          lop: student.lop,
          anhDaiDien: student.anhDaiDien,
          diaChi: student.diaChi,
        });
      });

      // Convert to array and sort by thuTuDiem
      const result = Object.values(studentsByStop).sort((a, b) => a.thuTuDiem - b.thuTuDiem);

      return response.ok(res, {
        scheduleId: id,
        studentsByStop: result,
        totalStudents: students.length,
      });
    } catch (error) {
      console.error("Error in ScheduleController.getStudents:", error);
      return response.serverError(res, "Lỗi server khi lấy danh sách học sinh", error);
    }
  }
}

export default ScheduleController;
