// StudentController - Controller chuyên nghiệp cho quản lý học sinh
import StudentService from "../services/StudentService.js";
import HocSinhModel from "../models/HocSinhModel.js";
import NguoiDungModel from "../models/NguoiDungModel.js";
import EmailService from "../services/EmailService.js";
import * as response from "../utils/response.js";
import bcrypt from "bcryptjs";

class StudentController {
  // Lấy danh sách tất cả học sinh
  static async getAll(req, res) {
    try {
      const {
        page = 1,
        pageSize,
        limit,
        q, // search query
        lop,
        sortBy = "maHocSinh",
        sortOrder = "desc",
      } = req.query;

      // Normalize query params - accept both pageSize and limit
      const pageNum = Math.max(1, parseInt(page) || 1);
      const pageSizeValue = pageSize || limit || 10;
      const limitValue = Math.max(1, Math.min(200, parseInt(pageSizeValue) || 10));
      const search = q || req.query.search;
      const sortDir = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

      // Use service if available
      let result;
      if (StudentService && StudentService.list) {
        result = await StudentService.list({
          page: pageNum,
          limit: limitValue,
          search,
          lop,
          sortBy,
          sortDir,
        });
      } else {
        // Fallback to direct model access
        let students = await HocSinhModel.getWithParentInfo();
        let totalCount = students.length;

        if (search) {
          students = students.filter(
            (s) =>
              s.hoTen?.toLowerCase().includes(search.toLowerCase()) ||
              s.maHocSinh?.toString().includes(search.toLowerCase())
          );
          totalCount = students.length;
        }

        if (lop) {
          students = students.filter((s) => s.lop === lop);
          totalCount = students.length;
        }

        const offset = (pageNum - 1) * limitValue;
        const paginatedStudents = students.slice(offset, offset + limitValue);

        result = {
          data: paginatedStudents,
          pagination: {
            page: pageNum,
            limit: limitValue,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limitValue),
          },
        };
      }

      return response.ok(res, result.data, {
        page: pageNum,
        pageSize: limitValue,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
        sortBy,
        sortOrder: sortOrder.toLowerCase(),
        q: search || null,
      });
    } catch (error) {
      console.error("Error in StudentController.getAll:", error);
      return response.serverError(res, "Lỗi server khi lấy danh sách học sinh", error);
    }
  }

  // Lấy thông tin chi tiết một học sinh
  static async getById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return response.validationError(res, "Mã học sinh là bắt buộc", [
          { field: "id", message: "Mã học sinh không được để trống" }
        ]);
      }

      const student = await (StudentService && StudentService.getById 
        ? StudentService.getById(id)
        : HocSinhModel.getById(id));

      if (!student) {
        return response.notFound(res, "Không tìm thấy học sinh");
      }

      // Lấy thông tin phụ huynh nếu có
      let parentInfo = null;
      if (student.maPhuHuynh) {
        parentInfo = await NguoiDungModel.getById(student.maPhuHuynh);
      }

      return response.ok(res, {
        ...student,
        parentInfo,
      });
    } catch (error) {
      console.error("Error in StudentController.getById:", error);
      return response.serverError(res, "Lỗi server khi lấy thông tin học sinh", error);
    }
  }

  // Tạo học sinh mới
  static async create(req, res) {
    try {
      const { 
        hoTen, 
        ngaySinh, 
        lop, 
        maPhuHuynh, 
        diaChi, 
        anhDaiDien,
        // Thông tin phụ huynh để tự động tạo tài khoản
        tenPhuHuynh,
        emailPhuHuynh,
        sdtPhuHuynh
      } = req.body;

      // Validation dữ liệu bắt buộc
      if (!hoTen || !ngaySinh || !lop) {
        return res.status(400).json({
          success: false,
          message: "Họ tên, ngày sinh và lớp là bắt buộc",
        });
      }

      // Validation ngày sinh
      const birthDate = new Date(ngaySinh);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 3 || age > 18) {
        return res.status(400).json({
          success: false,
          message: "Tuổi học sinh phải từ 3 đến 18 tuổi",
        });
      }

      let finalMaPhuHuynh = maPhuHuynh || null;

      // Tự động tạo tài khoản phụ huynh nếu có email hoặc SĐT
      if (!finalMaPhuHuynh && (emailPhuHuynh || sdtPhuHuynh)) {
        if (!tenPhuHuynh) {
          return res.status(400).json({
            success: false,
            message: "Tên phụ huynh là bắt buộc khi tạo tài khoản mới",
          });
        }

        if (!emailPhuHuynh) {
          return res.status(400).json({
            success: false,
            message: "Email phụ huynh là bắt buộc để tạo tài khoản",
          });
        }

        // Kiểm tra email đã tồn tại chưa
        const existingUser = await NguoiDungModel.getByEmail(emailPhuHuynh);
        if (existingUser) {
          // Nếu đã tồn tại, sử dụng tài khoản đó
          if (existingUser.vaiTro === 'phu_huynh') {
            finalMaPhuHuynh = existingUser.maNguoiDung;
          } else {
            return res.status(409).json({
              success: false,
              message: "Email này đã được sử dụng bởi tài khoản khác",
            });
          }
        } else {
          // Kiểm tra SĐT đã tồn tại chưa (nếu có)
          if (sdtPhuHuynh) {
            const existingPhone = await NguoiDungModel.getByPhone(sdtPhuHuynh);
            if (existingPhone) {
              if (existingPhone.vaiTro === 'phu_huynh') {
                finalMaPhuHuynh = existingPhone.maNguoiDung;
              } else {
                return res.status(409).json({
                  success: false,
                  message: "Số điện thoại này đã được sử dụng bởi tài khoản khác",
                });
              }
            }
          }

          // Tạo tài khoản phụ huynh mới
          if (!finalMaPhuHuynh) {
            // Tạo mật khẩu mặc định từ email
            const defaultPassword = emailPhuHuynh.split('@')[0] + '123456';
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            const parentData = {
              hoTen: tenPhuHuynh,
              email: emailPhuHuynh,
              matKhau: hashedPassword,
              soDienThoai: sdtPhuHuynh || null,
              vaiTro: 'phu_huynh',
            };

            finalMaPhuHuynh = await NguoiDungModel.create(parentData);

            // Gửi email thông tin tài khoản (không chặn nếu lỗi)
            try {
              await EmailService.sendParentAccountInfo(
                emailPhuHuynh,
                tenPhuHuynh,
                emailPhuHuynh,
                defaultPassword,
                sdtPhuHuynh || ''
              );
            } catch (emailError) {
              console.error("Error sending email (non-blocking):", emailError);
              // Không throw error, chỉ log
            }
          }
        }
      }

      // Kiểm tra phụ huynh có tồn tại không (nếu có)
      if (finalMaPhuHuynh) {
        const parent = await NguoiDungModel.getById(finalMaPhuHuynh);
        if (!parent) {
          return res.status(404).json({
            success: false,
            message: "Không tìm thấy phụ huynh",
          });
        }
      }

      const studentData = {
        hoTen,
        ngaySinh,
        lop,
        maPhuHuynh: finalMaPhuHuynh,
        diaChi: diaChi || null,
        anhDaiDien: anhDaiDien || null,
      };

      const studentId = await HocSinhModel.create(studentData);
      
      // 🔥 Auto-geocode địa chỉ nếu có và chưa có tọa độ
      if (diaChi && diaChi.trim()) {
        try {
          const StopSuggestionService = (await import("../services/StopSuggestionService.js")).default;
          const enriched = await StopSuggestionService.enrichStudentCoordinates(
            [{ maHocSinh: studentId, diaChi: diaChi.trim() }],
            2 // Retry 2 lần
          );
          
          if (enriched[0]?.viDo && enriched[0]?.kinhDo && !enriched[0]?.missingCoords) {
            await HocSinhModel.update(studentId, {
              viDo: enriched[0].viDo,
              kinhDo: enriched[0].kinhDo,
            });
            console.log(`[StudentController] ✅ Auto-geocoded student ${studentId}: (${enriched[0].viDo}, ${enriched[0].kinhDo})`);
          } else {
            console.warn(`[StudentController] ⚠️ Failed to auto-geocode student ${studentId}: ${diaChi}`);
          }
        } catch (geocodeError) {
          console.warn(`[StudentController] ⚠️ Auto-geocode failed for student ${studentId}:`, geocodeError.message);
          // Không throw error - học sinh vẫn được tạo thành công
        }
      }
      
      const newStudent = await HocSinhModel.getById(studentId);

      res.status(201).json({
        success: true,
        data: newStudent,
        message: finalMaPhuHuynh && !maPhuHuynh 
          ? "Tạo học sinh và tài khoản phụ huynh thành công" 
          : "Tạo học sinh mới thành công",
      });
    } catch (error) {
      console.error("Error in StudentController.create:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi tạo học sinh mới",
        error: error.message,
      });
    }
  }

  // Cập nhật thông tin học sinh
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { 
        hoTen, 
        ngaySinh, 
        lop, 
        maPhuHuynh, 
        diaChi, 
        anhDaiDien,
        // Thông tin phụ huynh để tự động tạo tài khoản
        tenPhuHuynh,
        emailPhuHuynh,
        sdtPhuHuynh
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Mã học sinh là bắt buộc",
        });
      }

      // Kiểm tra học sinh có tồn tại không
      const existingStudent = await HocSinhModel.getById(id);
      if (!existingStudent) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy học sinh",
        });
      }

      // Validation ngày sinh nếu có thay đổi
      if (ngaySinh) {
        const birthDate = new Date(ngaySinh);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age < 3 || age > 18) {
          return res.status(400).json({
            success: false,
            message: "Tuổi học sinh phải từ 3 đến 18 tuổi",
          });
        }
      }

      let finalMaPhuHuynh = maPhuHuynh !== undefined ? maPhuHuynh : existingStudent.maPhuHuynh;

      // Lấy thông tin phụ huynh hiện tại để so sánh SĐT
      let currentParentPhone = null;
      if (existingStudent.maPhuHuynh) {
        const currentParent = await NguoiDungModel.getById(existingStudent.maPhuHuynh);
        if (currentParent) {
          currentParentPhone = currentParent.soDienThoai;
        }
      }

      // Xử lý thay đổi phụ huynh qua SĐT (tương tự như create)
      if (sdtPhuHuynh && sdtPhuHuynh !== currentParentPhone) {
        if (!tenPhuHuynh) {
          return res.status(400).json({
            success: false,
            message: "Tên phụ huynh là bắt buộc khi thay đổi phụ huynh",
          });
        }

        if (!emailPhuHuynh) {
          return res.status(400).json({
            success: false,
            message: "Email phụ huynh là bắt buộc để tạo tài khoản",
          });
        }

        // Kiểm tra email đã tồn tại chưa
        const existingUser = await NguoiDungModel.getByEmail(emailPhuHuynh);
        if (existingUser) {
          if (existingUser.vaiTro === 'phu_huynh') {
            finalMaPhuHuynh = existingUser.maNguoiDung;
          } else {
            return res.status(409).json({
              success: false,
              message: "Email này đã được sử dụng bởi tài khoản khác",
            });
          }
        } else {
          // Kiểm tra SĐT đã tồn tại chưa
          const existingPhone = await NguoiDungModel.getByPhone(sdtPhuHuynh);
          if (existingPhone) {
            if (existingPhone.vaiTro === 'phu_huynh') {
              finalMaPhuHuynh = existingPhone.maNguoiDung;
            } else {
              return res.status(409).json({
                success: false,
                message: "Số điện thoại này đã được sử dụng bởi tài khoản khác",
              });
            }
          } else {
            // Tạo tài khoản phụ huynh mới
            const defaultPassword = emailPhuHuynh.split('@')[0] + '123456';
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            const parentData = {
              hoTen: tenPhuHuynh,
              email: emailPhuHuynh,
              matKhau: hashedPassword,
              soDienThoai: sdtPhuHuynh || null,
              vaiTro: 'phu_huynh',
            };

            finalMaPhuHuynh = await NguoiDungModel.create(parentData);

            // Gửi email thông tin tài khoản
            try {
              await EmailService.sendParentAccountInfo(
                emailPhuHuynh,
                tenPhuHuynh,
                emailPhuHuynh,
                defaultPassword,
                sdtPhuHuynh || ''
              );
            } catch (emailError) {
              console.error("Error sending email (non-blocking):", emailError);
            }
          }
        }
      }

      // Kiểm tra phụ huynh có tồn tại không (nếu có)
      if (finalMaPhuHuynh) {
        const parent = await NguoiDungModel.getById(finalMaPhuHuynh);
        if (!parent) {
          return res.status(404).json({
            success: false,
            message: "Không tìm thấy phụ huynh",
          });
        }
      }

      const updateData = {};
      if (hoTen !== undefined) updateData.hoTen = hoTen;
      if (ngaySinh !== undefined) updateData.ngaySinh = ngaySinh;
      if (lop !== undefined) updateData.lop = lop;
      if (finalMaPhuHuynh !== undefined) updateData.maPhuHuynh = finalMaPhuHuynh;
      if (diaChi !== undefined) updateData.diaChi = diaChi;
      if (anhDaiDien !== undefined) updateData.anhDaiDien = anhDaiDien;

      const isUpdated = await HocSinhModel.update(id, updateData);

      if (!isUpdated) {
        return res.status(400).json({
          success: false,
          message: "Không thể cập nhật học sinh",
        });
      }

      // 🔥 Auto-geocode địa chỉ nếu có thay đổi và chưa có tọa độ
      const updatedStudent = await HocSinhModel.getById(id);
      const shouldGeocode = diaChi !== undefined && 
                            diaChi && 
                            diaChi.trim() && 
                            (!updatedStudent.viDo || !updatedStudent.kinhDo);
      
      if (shouldGeocode) {
        try {
          const StopSuggestionService = (await import("../services/StopSuggestionService.js")).default;
          const enriched = await StopSuggestionService.enrichStudentCoordinates(
            [{ maHocSinh: id, diaChi: diaChi.trim() }],
            2 // Retry 2 lần
          );
          
          if (enriched[0]?.viDo && enriched[0]?.kinhDo && !enriched[0]?.missingCoords) {
            await HocSinhModel.update(id, {
              viDo: enriched[0].viDo,
              kinhDo: enriched[0].kinhDo,
            });
            console.log(`[StudentController] ✅ Auto-geocoded student ${id}: (${enriched[0].viDo}, ${enriched[0].kinhDo})`);
            // Reload để có tọa độ mới
            const reloaded = await HocSinhModel.getById(id);
            if (reloaded) {
              Object.assign(updatedStudent, reloaded);
            }
          } else {
            console.warn(`[StudentController] ⚠️ Failed to auto-geocode student ${id}: ${diaChi}`);
          }
        } catch (geocodeError) {
          console.warn(`[StudentController] ⚠️ Auto-geocode failed for student ${id}:`, geocodeError.message);
          // Không throw error - học sinh vẫn được cập nhật thành công
        }
      }

      res.status(200).json({
        success: true,
        data: updatedStudent,
        message: "Cập nhật thông tin học sinh thành công",
      });
    } catch (error) {
      console.error("Error in StudentController.update:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi cập nhật học sinh",
        error: error.message,
      });
    }
  }

  // Xóa học sinh
  static async delete(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Mã học sinh là bắt buộc",
        });
      }

      // Kiểm tra học sinh có tồn tại không
      const existingStudent = await HocSinhModel.getById(id);
      if (!existingStudent) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy học sinh",
        });
      }

      const isDeleted = await HocSinhModel.delete(id);

      if (!isDeleted) {
        return res.status(400).json({
          success: false,
          message: "Không thể xóa học sinh",
        });
      }

      res.status(200).json({
        success: true,
        message: "Xóa học sinh thành công",
      });
    } catch (error) {
      console.error("Error in StudentController.delete:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi xóa học sinh",
        error: error.message,
      });
    }
  }

  // GET /api/v1/students/by-parent - Lấy học sinh của phụ huynh hiện tại
  static async getByCurrentParent(req, res) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Chưa đăng nhập",
        });
      }

      const students = await HocSinhModel.getByParent(userId);

      // Lấy thêm thông tin tài xế và tuyến đường từ chuyến đi gần nhất
      const ChuyenDiModel = (await import("../models/ChuyenDiModel.js")).default;
      const LichTrinhModel = (await import("../models/LichTrinhModel.js")).default;

      // Import models cần thiết
      const TuyenDuongModel = (await import("../models/TuyenDuongModel.js")).default;
      const XeBuytModel = (await import("../models/XeBuytModel.js")).default;
      const TaiXeModel = (await import("../models/TaiXeModel.js")).default;

      const studentsWithTripInfo = await Promise.all(
        students.map(async (student) => {
          // Lấy chuyến đi gần nhất của học sinh này (nếu có)
          const today = new Date().toISOString().slice(0, 10);
          const recentTrips = await ChuyenDiModel.getAll({
            ngayChay: today,
          });

          // Tìm trip có học sinh này
          let tripInfo = null;
          for (const trip of recentTrips) {
            const tripStudents = await ChuyenDiModel.getStudents(trip.maChuyen);
            const hasStudent = tripStudents.some((ts) => ts.maHocSinh === student.maHocSinh);
            if (hasStudent) {
              const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
              const route = schedule ? await TuyenDuongModel.getById(schedule.maTuyen) : null;
              const bus = schedule ? await XeBuytModel.getById(schedule.maXe) : null;
              const driver = schedule ? await TaiXeModel.getById(schedule.maTaiXe) : null;
              
              tripInfo = {
                maChuyen: trip.maChuyen,
                maTuyen: schedule?.maTuyen || route?.maTuyen,
                maXe: schedule?.maXe || bus?.maXe,
                tenTuyen: route?.tenTuyen || trip.tenTuyen,
                bienSoXe: bus?.bienSoXe || trip.bienSoXe,
                trangThai: trip.trangThai,
                gioKhoiHanh: schedule?.gioKhoiHanh || trip.gioKhoiHanh,
                tenTaiXe: driver?.tenTaiXe,
                sdtTaiXe: driver?.soDienThoai,
              };
              break;
            }
          }

          // 🔥 FIX: Nếu chưa có trip, tìm schedule dựa trên route của học sinh
          if (!tripInfo && student.maTuyen) {
            try {
              // Tìm schedule cho route này hôm nay
              const schedules = await LichTrinhModel.getAll({
                maTuyen: student.maTuyen,
              });

              // Tìm schedule phù hợp với ngày hôm nay (có thể check weekday_mask)
              const todaySchedule = schedules.find((s) => {
                // TODO: Check weekday_mask nếu có
                return true; // Tạm thời lấy schedule đầu tiên
              });

              if (todaySchedule) {
                const route = await TuyenDuongModel.getById(todaySchedule.maTuyen);
                const bus = await XeBuytModel.getById(todaySchedule.maXe);
                const driver = await TaiXeModel.getById(todaySchedule.maTaiXe);

                tripInfo = {
                  maChuyen: null, // Chưa có trip
                  maTuyen: todaySchedule.maTuyen,
                  maXe: todaySchedule.maXe,
                  tenTuyen: route?.tenTuyen,
                  bienSoXe: bus?.bienSoXe,
                  trangThai: "chua_khoi_hanh", // Chưa khởi hành
                  gioKhoiHanh: todaySchedule.gioKhoiHanh,
                  tenTaiXe: driver?.tenTaiXe,
                  sdtTaiXe: driver?.soDienThoai,
                };
              }
            } catch (scheduleError) {
              console.warn(`[StudentController] Failed to load schedule for student ${student.maHocSinh}:`, scheduleError.message);
            }
          }

          return {
            ...student,
            tripInfo,
          };
        })
      );

      res.status(200).json({
        success: true,
        data: studentsWithTripInfo,
        message: "Lấy danh sách học sinh thành công",
      });
    } catch (error) {
      console.error("Error in StudentController.getByCurrentParent:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy danh sách học sinh",
        error: error.message,
      });
    }
  }

  // Lấy danh sách học sinh theo lớp
  static async getByClass(req, res) {
    try {
      const { lop } = req.params;

      if (!lop) {
        return res.status(400).json({
          success: false,
          message: "Lớp là bắt buộc",
        });
      }

      const allStudents = await HocSinhModel.getWithParentInfo();
      const students = allStudents.filter((student) => student.lop === lop);

      res.status(200).json({
        success: true,
        data: students,
        message: "Lấy danh sách học sinh theo lớp thành công",
      });
    } catch (error) {
      console.error("Error in StudentController.getByClass:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy danh sách học sinh theo lớp",
        error: error.message,
      });
    }
  }

  // Tìm phụ huynh theo số điện thoại
  static async findParentByPhone(req, res) {
    try {
      const { phone } = req.params;

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: "Số điện thoại là bắt buộc",
        });
      }

      // Kiểm tra format SĐT (10-11 chữ số)
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Số điện thoại không hợp lệ (phải có 10-11 chữ số)",
        });
      }

      // Tìm phụ huynh theo SĐT
      const parent = await NguoiDungModel.getByPhone(phone);

      if (!parent) {
        return res.status(200).json({
          success: true,
          data: null,
          message: "Số điện thoại chưa được sử dụng",
        });
      }

      // Kiểm tra xem có phải là phụ huynh không
      if (parent.vaiTro !== 'phu_huynh') {
        return res.status(409).json({
          success: false,
          message: "Số điện thoại này đã được sử dụng bởi tài khoản khác (không phải phụ huynh)",
          data: {
            existingUser: {
              hoTen: parent.hoTen,
              email: parent.email,
              vaiTro: parent.vaiTro,
            },
          },
        });
      }

      // Trả về thông tin phụ huynh
      return res.status(200).json({
        success: true,
        data: {
          maNguoiDung: parent.maNguoiDung,
          hoTen: parent.hoTen,
          email: parent.email,
          soDienThoai: parent.soDienThoai,
          vaiTro: parent.vaiTro,
        },
        message: "Tìm thấy phụ huynh",
      });
    } catch (error) {
      console.error("Error in StudentController.findParentByPhone:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi tìm phụ huynh",
        error: error.message,
      });
    }
  }

  // Lấy thống kê học sinh
  static async getStats(req, res) {
    try {
      const allStudents = await HocSinhModel.getWithParentInfo();

      const stats = {
        total: allStudents.length,
        byClass: {},
        byGrade: {},
        averageAge: 0,
        withParent: 0,
        withoutParent: 0,
      };

      // Thống kê theo lớp
      allStudents.forEach((student) => {
        const className = student.lop || "Unknown";
        stats.byClass[className] = (stats.byClass[className] || 0) + 1;
      });

      // Thống kê theo khối (từ lớp)
      allStudents.forEach((student) => {
        const grade = student.lop ? student.lop.charAt(0) : "Unknown";
        stats.byGrade[grade] = (stats.byGrade[grade] || 0) + 1;
      });

      // Thống kê có phụ huynh
      stats.withParent = allStudents.filter(
        (student) => student.maPhuHuynh
      ).length;
      stats.withoutParent = allStudents.length - stats.withParent;

      // Tính tuổi trung bình
      const today = new Date();
      const totalAge = allStudents.reduce((sum, student) => {
        if (student.ngaySinh) {
          const birthDate = new Date(student.ngaySinh);
          const age = today.getFullYear() - birthDate.getFullYear();
          return sum + age;
        }
        return sum;
      }, 0);
      stats.averageAge =
        allStudents.length > 0 ? Math.round(totalAge / allStudents.length) : 0;

      res.status(200).json({
        success: true,
        data: stats,
        message: "Lấy thống kê học sinh thành công",
      });
    } catch (error) {
      console.error("Error in StudentController.getStats:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy thống kê học sinh",
        error: error.message,
      });
    }
  }

  // Geocode lại học sinh (lấy tọa độ từ địa chỉ)
  static async geocodeStudents(req, res) {
    try {
      const { studentIds } = req.body; // Optional: array of student IDs, nếu không có thì geocode tất cả chưa có tọa độ

      const StopSuggestionService = (await import("../services/StopSuggestionService.js")).default;
      
      let students;
      if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
        // Geocode các học sinh cụ thể
        students = await Promise.all(
          studentIds.map(id => HocSinhModel.getById(id))
        );
        students = students.filter(s => s && s.trangThai);
      } else {
        // Geocode tất cả học sinh chưa có tọa độ
        students = await HocSinhModel.getAll();
      }
      
      // Filter học sinh cần geocode
      const toGeocode = students.filter(
        s => (!s.viDo || !s.kinhDo || isNaN(s.viDo) || isNaN(s.kinhDo)) 
          && s.diaChi 
          && s.diaChi.trim()
          && s.trangThai
      );
      
      if (toGeocode.length === 0) {
        return res.status(200).json({
          success: true,
          message: "Không có học sinh nào cần geocode",
          data: {
            geocoded: 0,
            failed: 0,
            total: students.length,
          },
        });
      }
      
      console.log(`[StudentController] Geocoding ${toGeocode.length} students...`);
      
      // Geocode với retry
      const enriched = await StopSuggestionService.enrichStudentCoordinates(toGeocode, 2);
      
      // Update database
      let successCount = 0;
      let failCount = 0;
      
      for (const student of enriched) {
        if (student.viDo && student.kinhDo && !student.missingCoords && 
            !isNaN(student.viDo) && !isNaN(student.kinhDo)) {
          try {
            await HocSinhModel.update(student.maHocSinh, {
              viDo: student.viDo,
              kinhDo: student.kinhDo,
            });
            successCount++;
          } catch (updateError) {
            console.error(`[StudentController] Failed to update student ${student.maHocSinh}:`, updateError.message);
            failCount++;
          }
        } else {
          failCount++;
        }
      }
      
      return res.status(200).json({
        success: true,
        message: `Đã geocode ${successCount} học sinh thành công`,
        data: {
          geocoded: successCount,
          failed: failCount,
          total: toGeocode.length,
        },
      });
    } catch (error) {
      console.error("Error in StudentController.geocodeStudents:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi geocode học sinh",
        error: error.message,
      });
    }
  }
}

export default StudentController;
