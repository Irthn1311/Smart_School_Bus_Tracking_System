import LichTrinhModel from "../models/LichTrinhModel.js";
import TuyenDuongModel from "../models/TuyenDuongModel.js";
import XeBuytModel from "../models/XeBuytModel.js";
import TaiXeModel from "../models/TaiXeModel.js";
import ChuyenDiModel from "../models/ChuyenDiModel.js";
import ScheduleStudentStopModel from "../models/ScheduleStudentStopModel.js";

const VALID_LOAI_CHUYEN = ["don_sang", "tra_chieu"];

class ScheduleService {
  static async list(options = {}) {
    const { 
      page = 1, 
      limit = 10,
      maTuyen,
      maXe,
      maTaiXe,
      loaiChuyen,
      dangApDung,
    } = options;
    
    // Build filter conditions
    const filters = {};
    if (maTuyen) filters.maTuyen = maTuyen;
    if (maXe) filters.maXe = maXe;
    if (maTaiXe) filters.maTaiXe = maTaiXe;
    if (loaiChuyen) filters.loaiChuyen = loaiChuyen;
    if (dangApDung !== undefined) filters.dangApDung = dangApDung;
    
    const data = await LichTrinhModel.getAll(filters);
    const total = data.length; // TODO: Implement proper count with filters
    
    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedData = data.slice(offset, offset + limit);
    
    return {
      data: paginatedData,
      pagination: {
        page: +page,
        limit: +limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id) {
    const s = await LichTrinhModel.getById(id);
    if (!s || !s.dangApDung) throw new Error("SCHEDULE_NOT_FOUND");
    
    // Load students from schedule_student_stops
    const students = await ScheduleStudentStopModel.getByScheduleId(id);
    
    // Load route stops
    const RouteService = (await import("./RouteService.js")).default;
    const routeStops = await RouteService.getStops(s.maTuyen);
    
    // Nhóm students theo điểm dừng và tính số lượng
    const stopsWithStudents = routeStops.map((stop) => {
      const stopStudents = students.filter(
        (student) => student.maDiem === stop.maDiem || student.thuTuDiem === stop.sequence
      );
      return {
        ...stop,
        studentCount: stopStudents.length,
        students: stopStudents.map((s) => ({
          maHocSinh: s.maHocSinh,
          hoTen: s.hoTen,
          lop: s.lop,
          anhDaiDien: s.anhDaiDien,
          diaChi: s.diaChi,
        })),
      };
    });
    
    return {
      ...s,
      students: students || [],
      stops: stopsWithStudents,
      totalStudents: students.length,
    };
  }

  static async create(payload) {
    const { maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, ngayChay, students } = payload;
    if (!maTuyen || !maXe || !maTaiXe || !loaiChuyen || !gioKhoiHanh || !ngayChay)
      throw new Error("MISSING_REQUIRED_FIELDS");
    if (!VALID_LOAI_CHUYEN.includes(loaiChuyen))
      throw new Error("INVALID_TRIP_TYPE");

    const route = await TuyenDuongModel.getById(maTuyen);
    if (!route) throw new Error("ROUTE_NOT_FOUND");
    const bus = await XeBuytModel.getById(maXe);
    if (!bus) throw new Error("BUS_NOT_FOUND");
    const driver = await TaiXeModel.getById(maTaiXe);
    if (!driver) throw new Error("DRIVER_NOT_FOUND");

    const conflicts = await LichTrinhModel.checkConflict(
      maXe,
      maTaiXe,
      gioKhoiHanh,
      loaiChuyen,
      ngayChay
    );
    if (conflicts && conflicts.length > 0) {
      const error = new Error("SCHEDULE_CONFLICT");
      error.conflicts = conflicts; // Attach conflict details
      throw error;
    }

    const id = await LichTrinhModel.create({
      maTuyen,
      maXe,
      maTaiXe,
      loaiChuyen,
      gioKhoiHanh,
      ngayChay,
      dangApDung: true,
    });
    
    // 🔥 VALIDATION: Validate students[] nếu có
    let finalStudents = students;
    if (students && Array.isArray(students) && students.length > 0) {
      console.log(`[ScheduleService] Validating ${students.length} students for schedule ${id}...`);
      
      // Lấy route stops để validate
      const RouteService = (await import("./RouteService.js")).default;
      const routeStops = await RouteService.getStops(maTuyen);
      
      // Tạo map: sequence -> { maDiem, ... }
      const stopMap = new Map();
      routeStops.forEach(stop => {
        stopMap.set(stop.sequence, {
          maDiem: stop.maDiem || stop.stop_id,
          sequence: stop.sequence,
          tenDiem: stop.tenDiem || stop.name,
        });
      });
      
      // Validate từng student
      const HocSinhModel = (await import("../models/HocSinhModel.js")).default;
      const validationErrors = [];
      
      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        
        // Validate required fields
        if (!student.maHocSinh || !student.thuTuDiem || !student.maDiem) {
          validationErrors.push(`Student ${i + 1}: Missing required fields (maHocSinh, thuTuDiem, maDiem)`);
          continue;
        }
        
        // Validate maHocSinh tồn tại
        const studentExists = await HocSinhModel.getById(student.maHocSinh);
        if (!studentExists) {
          validationErrors.push(`Student ${i + 1}: maHocSinh ${student.maHocSinh} not found`);
          continue;
        }
        
        // Validate thuTuDiem khớp với route_stops.sequence
        const stopInfo = stopMap.get(student.thuTuDiem);
        if (!stopInfo) {
          validationErrors.push(`Student ${i + 1}: thuTuDiem ${student.thuTuDiem} does not exist in route ${maTuyen}`);
          continue;
        }
        
        // Validate maDiem khớp với stop có sequence = thuTuDiem
        if (student.maDiem !== stopInfo.maDiem) {
          validationErrors.push(
            `Student ${i + 1}: maDiem ${student.maDiem} does not match stop with sequence ${student.thuTuDiem} (expected maDiem: ${stopInfo.maDiem})`
          );
          continue;
        }
      }
      
      if (validationErrors.length > 0) {
        console.error(`[ScheduleService] Validation failed for ${validationErrors.length} students:`, validationErrors);
        const error = new Error("INVALID_STUDENT_ASSIGNMENT");
        error.validationErrors = validationErrors;
        throw error;
      }
      
      console.log(`[ScheduleService] ✅ Validated ${students.length} students successfully`);
    }
    
    // 🔥 TASK 2: Nếu không có students được gửi lên, tự động gán học sinh
    // Ưu tiên dùng student_stop_suggestions, fallback distance-based
    if ((!students || students.length === 0)) {
      try {
        console.log(`[ScheduleService] No students provided, auto-assigning students from route ${maTuyen}...`);
        
        // Lấy route stops
        const RouteService = (await import("./RouteService.js")).default;
        const routeStops = await RouteService.getStops(maTuyen);
        console.log(`[ScheduleService] Found ${routeStops.length} route stops for route ${maTuyen}`);
        
        if (routeStops.length === 0) {
          console.warn(`[ScheduleService] ⚠️ Route ${maTuyen} has no stops`);
        } else {
          // Tạo map: sequence -> { maDiem, ... } để lookup nhanh
          const stopMap = new Map();
          routeStops.forEach(stop => {
            stopMap.set(stop.sequence, {
              maDiem: stop.maDiem || stop.stop_id,
              sequence: stop.sequence,
              tenDiem: stop.tenDiem || stop.name,
              viDo: stop.viDo || stop.lat,
              kinhDo: stop.kinhDo || stop.lng,
            });
          });
          
          // BƯỚC 1: Ưu tiên load từ HocSinh_DiemDung (mapping độc lập từ Greedy Maximum Coverage)
          const BusStopOptimizationService = (await import("./BusStopOptimizationService.js")).default;
          const assignments = await BusStopOptimizationService.getAssignments();
          console.log(`[ScheduleService] Loaded ${assignments.length} assignments from HocSinh_DiemDung`);
          
          const autoAssignedStudents = [];
          const assignedStudentIds = new Set(); // Track học sinh đã được gán
          
          // Sử dụng assignments từ HocSinh_DiemDung nếu có và stop nằm trong route
          if (assignments.length > 0) {
            const routeStopIds = new Set(routeStops.map(s => s.maDiem || s.stop_id));
            
            for (const assignment of assignments) {
              // Chỉ gán nếu stop nằm trong route này
              if (routeStopIds.has(assignment.maDiemDung)) {
                const matchingStop = routeStops.find(s => (s.maDiem || s.stop_id) === assignment.maDiemDung);
                if (matchingStop) {
                  autoAssignedStudents.push({
                    maHocSinh: assignment.maHocSinh,
                    thuTuDiem: matchingStop.sequence,
                    maDiem: assignment.maDiemDung,
                    source: 'hocsinh_diemdung',
                  });
                  assignedStudentIds.add(assignment.maHocSinh);
                }
              }
            }
            console.log(`[ScheduleService] Assigned ${autoAssignedStudents.length} students from HocSinh_DiemDung`);
          }
          
          // BƯỚC 2: Load suggestions từ student_stop_suggestions (ƯU TIÊN - chỉ dùng từ đây)
          const StudentStopSuggestionModel = (await import("../models/StudentStopSuggestionModel.js")).default;
          const suggestions = await StudentStopSuggestionModel.getByRouteId(maTuyen);
          console.log(`[ScheduleService] Loaded ${suggestions.length} suggestions from student_stop_suggestions for route ${maTuyen}`);
          
          // Track học sinh đã được gán từ suggestions
          const studentsFromSuggestions = new Set();
          
          if (suggestions.length > 0) {
            // Group suggestions theo maHocSinh (một học sinh có thể có nhiều suggestions)
            const suggestionsByStudent = new Map();
            suggestions.forEach(s => {
              if (!suggestionsByStudent.has(s.maHocSinh)) {
                suggestionsByStudent.set(s.maHocSinh, []);
              }
              suggestionsByStudent.get(s.maHocSinh).push(s);
            });
            
            // Với mỗi học sinh có suggestions (chỉ xử lý học sinh chưa được gán từ HocSinh_DiemDung):
            // - Nếu chỉ có 1 suggestion → dùng luôn
            // - Nếu có nhiều suggestions → chọn stop gần nhất đến nhà học sinh
            for (const [maHocSinh, studentSuggestions] of suggestionsByStudent.entries()) {
              // Bỏ qua học sinh đã được gán từ HocSinh_DiemDung
              if (assignedStudentIds.has(maHocSinh)) {
                continue;
              }
              let selectedSuggestion = null;
              
              if (studentSuggestions.length === 1) {
                selectedSuggestion = studentSuggestions[0];
              } else {
                // Nhiều suggestions: chọn stop gần nhất
                const student = studentSuggestions[0]; // Lấy thông tin học sinh từ suggestion đầu
                const studentLat = student.studentLat || student.viDo;
                const studentLng = student.studentLng || student.kinhDo;
                
                if (studentLat && studentLng && !isNaN(studentLat) && !isNaN(studentLng)) {
                  const StopSuggestionService = (await import("./StopSuggestionService.js")).default;
                  let minDistance = Infinity;
                  
                  for (const suggestion of studentSuggestions) {
                    // Tìm stop trong routeStops có maDiem khớp với suggestion.maDiemDung
                    const matchingStop = routeStops.find(s => s.maDiem === suggestion.maDiemDung);
                    
                    if (matchingStop && matchingStop.viDo && matchingStop.kinhDo) {
                      const distance = StopSuggestionService.calculateDistance(
                        studentLat,
                        studentLng,
                        matchingStop.viDo,
                        matchingStop.kinhDo
                      );
                      
                      if (distance < minDistance) {
                        minDistance = distance;
                        selectedSuggestion = suggestion;
                      }
                    }
                  }
                  
                  // Fallback: nếu không tính được khoảng cách, chọn suggestion đầu tiên
                  if (!selectedSuggestion) {
                    selectedSuggestion = studentSuggestions[0];
                  }
                } else {
                  // Học sinh không có tọa độ, chọn suggestion đầu tiên
                  selectedSuggestion = studentSuggestions[0];
                }
              }
              
              // Lấy sequence từ route_stops
              const stopInfo = routeStops.find(s => s.maDiem === selectedSuggestion.maDiemDung);
              if (stopInfo && stopInfo.sequence) {
                autoAssignedStudents.push({
                  maHocSinh: maHocSinh,
                  thuTuDiem: stopInfo.sequence,
                  maDiem: selectedSuggestion.maDiemDung,
                });
                studentsFromSuggestions.add(maHocSinh);
                assignedStudentIds.add(maHocSinh); // Track để tránh duplicate
                console.log(`[ScheduleService] ✅ Assigned student ${maHocSinh} from suggestion to stop ${selectedSuggestion.maDiemDung} (sequence ${stopInfo.sequence})`);
              }
            }
            
            console.log(`[ScheduleService] ✅ Auto-assigned ${autoAssignedStudents.length} students from student_stop_suggestions`);
          } else {
            console.warn(`[ScheduleService] ⚠️ No suggestions found in student_stop_suggestions for route ${maTuyen}. Students will not be auto-assigned.`);
          }
          
          // 🔥 BỎ HOÀN TOÀN FALLBACK DISTANCE-BASED - Chỉ sử dụng student_stop_suggestions
          // Nếu không có suggestions, không gán học sinh nào cả (để admin tự gán thủ công)
          
          if (autoAssignedStudents.length > 0) {
            finalStudents = autoAssignedStudents;
            console.log(`[ScheduleService] ✅ Total auto-assigned ${autoAssignedStudents.length} students to schedule ${id} from student_stop_suggestions`);
          } else {
            console.warn(`[ScheduleService] ⚠️ No students found for schedule ${id} (suggestions: ${suggestions.length}). Please assign students manually or ensure student_stop_suggestions are created for this route.`);
          }
        }
      } catch (autoAssignError) {
        console.error(`[ScheduleService] ⚠️ Failed to auto-assign students:`, autoAssignError);
        console.error(`[ScheduleService] Error stack:`, autoAssignError.stack);
        // Continue - schedule đã được tạo thành công
      }
    }
    
    // Lưu students vào schedule_student_stops
    if (finalStudents && Array.isArray(finalStudents) && finalStudents.length > 0) {
      try {
        console.log(`[ScheduleService] Attempting to save ${finalStudents.length} students to schedule_student_stops for schedule ${id}`);
        console.log(`[ScheduleService] Sample student data:`, finalStudents.slice(0, 3));
        const affectedRows = await ScheduleStudentStopModel.bulkCreate(id, finalStudents);
        console.log(`[ScheduleService] ✅ Đã gán ${affectedRows} học sinh vào schedule ${id} (affectedRows: ${affectedRows})`);
        
        // Verify: Query lại để kiểm tra
        const verifyStudents = await ScheduleStudentStopModel.getByScheduleId(id);
        console.log(`[ScheduleService] Verification: Found ${verifyStudents.length} students in schedule_student_stops for schedule ${id}`);
      } catch (studentError) {
        console.error(`[ScheduleService] ⚠️ Lỗi khi gán học sinh vào schedule ${id}:`, studentError);
        console.error(`[ScheduleService] Error details:`, {
          message: studentError.message,
          stack: studentError.stack,
          studentsCount: finalStudents.length,
          sampleStudent: finalStudents[0],
        });
        // Không throw error - schedule đã được tạo thành công
      }
    } else {
      console.warn(`[ScheduleService] ⚠️ Schedule ${id} created without students`);
      console.warn(`[ScheduleService] finalStudents:`, finalStudents);
    }
    
    // Tự động tạo ChuyenDi từ LichTrinh nếu ngayChay là hôm nay hoặc tương lai
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Parse ngayChay (có thể là string "YYYY-MM-DD" hoặc Date object)
      let scheduleDate;
      if (typeof ngayChay === 'string') {
        scheduleDate = new Date(ngayChay);
      } else {
        scheduleDate = new Date(ngayChay);
      }
      scheduleDate.setHours(0, 0, 0, 0);
      
      // Chỉ tạo ChuyenDi nếu ngayChay >= hôm nay
      if (scheduleDate >= today) {
        // Kiểm tra xem đã có ChuyenDi cho lịch trình này chưa
        const existingTrip = await ChuyenDiModel.getByScheduleAndDate(id, ngayChay);
        if (!existingTrip) {
          const tripId = await ChuyenDiModel.create({
            maLichTrinh: id,
            ngayChay,
            trangThai: 'chua_khoi_hanh',
            ghiChu: null,
          });
          console.log(`✅ Tự động tạo ChuyenDi ${tripId} cho LichTrinh ${id}, ngayChay: ${ngayChay}`);
          
          // Copy students từ schedule_student_stops sang TrangThaiHocSinh
          try {
            const copiedCount = await ScheduleStudentStopModel.copyToTrip(id, tripId);
            if (copiedCount > 0) {
              console.log(`✅ Đã copy ${copiedCount} học sinh từ schedule ${id} sang trip ${tripId}`);
            }
          } catch (copyError) {
            console.error(`⚠️ Lỗi khi copy học sinh sang trip ${tripId}:`, copyError);
            // Không throw error - trip đã được tạo thành công
          }
        } else {
          console.log(`ℹ️ ChuyenDi đã tồn tại cho LichTrinh ${id}, ngayChay: ${ngayChay}`);
        }
      } else {
        console.log(`ℹ️ Không tạo ChuyenDi cho LichTrinh ${id} vì ngayChay (${ngayChay}) < hôm nay`);
      }
    } catch (tripError) {
      // Log lỗi chi tiết nhưng không throw - việc tạo schedule vẫn thành công
      console.error(`⚠️ Không thể tự động tạo ChuyenDi cho LichTrinh ${id}:`, tripError);
      console.error(`⚠️ Error details:`, {
        message: tripError.message,
        stack: tripError.stack,
        ngayChay: ngayChay,
        scheduleId: id
      });
    }
    
    return await LichTrinhModel.getById(id);
  }

  static async update(id, data) {
    const existing = await LichTrinhModel.getById(id);
    if (!existing) throw new Error("SCHEDULE_NOT_FOUND");

    if (data.loaiChuyen && !VALID_LOAI_CHUYEN.includes(data.loaiChuyen))
      throw new Error("INVALID_TRIP_TYPE");
    
    // Handle students update if provided
    if (data.students !== undefined) {
      // Delete existing mappings
      await ScheduleStudentStopModel.deleteBySchedule(id);
      
      // Create new mappings if students array is provided and not empty
      if (Array.isArray(data.students) && data.students.length > 0) {
        try {
          await ScheduleStudentStopModel.bulkCreate(id, data.students);
          console.log(`✅ Đã cập nhật ${data.students.length} học sinh cho schedule ${id}`);
        } catch (studentError) {
          console.error(`⚠️ Lỗi khi cập nhật học sinh cho schedule ${id}:`, studentError);
          // Không throw error - schedule update vẫn tiếp tục
        }
      }
      
      // Remove students from data to avoid passing it to LichTrinhModel.update
      delete data.students;
    }

    if (data.maTuyen && data.maTuyen !== existing.maTuyen) {
      const r = await TuyenDuongModel.getById(data.maTuyen);
      if (!r) throw new Error("ROUTE_NOT_FOUND");
    }
    if (data.maXe && data.maXe !== existing.maXe) {
      const b = await XeBuytModel.getById(data.maXe);
      if (!b) throw new Error("BUS_NOT_FOUND");
    }
    if (data.maTaiXe && data.maTaiXe !== existing.maTaiXe) {
      const d = await TaiXeModel.getById(data.maTaiXe);
      if (!d) throw new Error("DRIVER_NOT_FOUND");
    }

    const checkMaXe = data.maXe || existing.maXe;
    const checkMaTaiXe = data.maTaiXe || existing.maTaiXe;
    const checkGio = data.gioKhoiHanh || existing.gioKhoiHanh;
    const checkLoai = data.loaiChuyen || existing.loaiChuyen;
    const checkNgay = data.ngayChay || existing.ngayChay;
    const conflicts = await LichTrinhModel.checkConflict(
      checkMaXe,
      checkMaTaiXe,
      checkGio,
      checkLoai,
      checkNgay,
      id
    );
    if (conflicts && conflicts.length > 0) {
      const error = new Error("SCHEDULE_CONFLICT");
      error.conflicts = conflicts; // Attach conflict details
      throw error;
    }

    await LichTrinhModel.update(id, data);
    return await LichTrinhModel.getById(id);
  }

  static async delete(id) {
    const ex = await LichTrinhModel.getById(id);
    if (!ex) throw new Error("SCHEDULE_NOT_FOUND");
    await LichTrinhModel.delete(id);
    return true;
  }

  static async getByRoute(maTuyen) {
    const r = await TuyenDuongModel.getById(maTuyen);
    if (!r) throw new Error("ROUTE_NOT_FOUND");
    return await LichTrinhModel.getByRoute(maTuyen);
  }

  static async getByBus(maXe) {
    const b = await XeBuytModel.getById(maXe);
    if (!b) throw new Error("BUS_NOT_FOUND");
    return await LichTrinhModel.getByBus(maXe);
  }

  static async getByDriver(maTaiXe) {
    const d = await TaiXeModel.getById(maTaiXe);
    if (!d) throw new Error("DRIVER_NOT_FOUND");
    return await LichTrinhModel.getByDriver(maTaiXe);
  }
}

export default ScheduleService;
