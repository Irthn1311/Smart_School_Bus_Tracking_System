import express from "express";
import ReportsController from "../../controllers/ReportsController.js";
import AuthMiddleware from "../../middlewares/AuthMiddleware.js";
import ReportTemplateModel from "../../models/ReportTemplateModel.js";
import EmailService from "../../services/EmailService.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

const router = express.Router();

router.get(
  "/overview",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ReportsController.overview
);

// View report data in JSON (for preview in FE)
router.get(
  "/view",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ReportsController.view
);

router.get(
  "/export",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  ReportsController.export
);

// Report templates
router.post(
  "/templates",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  async (req, res) => {
    try {
      const userId = req.user.maNguoiDung;
      const { name, reportType, dateRange, customFrom, customTo, filters } = req.body;

      if (!name || !reportType) {
        return res.status(400).json({
          success: false,
          message: "Tên mẫu và loại báo cáo là bắt buộc",
        });
      }

      const template = await ReportTemplateModel.create({
        user_id: userId,
        name,
        report_type: reportType,
        filters_json: filters,
        date_range: dateRange,
        custom_from: customFrom,
        custom_to: customTo,
      });

      return res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error) {
      console.error("Error creating template:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi tạo mẫu báo cáo",
      });
    }
  }
);

router.get(
  "/templates",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  async (req, res) => {
    try {
      const userId = req.user.maNguoiDung;
      const templates = await ReportTemplateModel.getByUserId(userId);
      return res.status(200).json({
        success: true,
        data: templates,
      });
    } catch (error) {
      console.error("Error getting templates:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy danh sách mẫu",
      });
    }
  }
);

router.delete(
  "/templates/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.maNguoiDung;

      // Verify template belongs to user
      const template = await ReportTemplateModel.getById(id);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy mẫu báo cáo",
        });
      }

      if (template.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xóa mẫu này",
        });
      }

      const deleted = await ReportTemplateModel.delete(id);
      if (deleted) {
        return res.status(200).json({
          success: true,
          message: "Đã xóa mẫu báo cáo",
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Không thể xóa mẫu báo cáo",
        });
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi xóa mẫu",
      });
    }
  }
);

// Send report via email
router.post(
  "/send-email",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize("quan_tri"),
  async (req, res) => {
    try {
      const { format, type, from, to, recipientEmail } = req.body;

      // Validate
      if (!recipientEmail) {
        return res.status(400).json({
          success: false,
          message: "Email người nhận là bắt buộc",
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        return res.status(400).json({
          success: false,
          message: "Email không hợp lệ",
        });
      }

      // Generate report (similar to export endpoint)
      const dateFrom = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const dateTo = to || new Date().toISOString().slice(0, 10);

      // Extract filters from request body
      const filters = req.body.filters || {};

      // Import buildDataByType function from ReportsController
      const XeBuytModel = (await import("../../models/XeBuytModel.js")).default;
      const ChuyenDiModel = (await import("../../models/ChuyenDiModel.js")).default;
      const TaiXeModel = (await import("../../models/TaiXeModel.js")).default;
      const HocSinhModel = (await import("../../models/HocSinhModel.js")).default;
      const SuCoModel = (await import("../../models/SuCoModel.js")).default;

      let data = {};
      switch (type) {
        case "overview": {
          const busStats = await XeBuytModel.getStats();
          const tripStats = await ChuyenDiModel.getStats(dateFrom, dateTo);
          data = { period: { from: dateFrom, to: dateTo }, buses: busStats, trips: tripStats };
          break;
        }
        case "trips": {
          const queryParams = { from: dateFrom, to: dateTo };
          if (filters.routeId) queryParams.routeId = filters.routeId;
          if (filters.busId) queryParams.busId = filters.busId;
          if (filters.driverId) queryParams.driverId = filters.driverId;
          if (filters.status) queryParams.status = filters.status;
          const trips = await ChuyenDiModel.getAll(queryParams);
          let filteredTrips = trips;
          if (filters.status) {
            filteredTrips = trips.filter(t => t.trangThai === filters.status);
          }
          data = { trips: filteredTrips };
          break;
        }
        case "buses": {
          const queryParams = {};
          if (filters.status) queryParams.trangThai = filters.status;
          if (filters.routeId) queryParams.routeId = filters.routeId;
          if (filters.driverId) queryParams.driverId = filters.driverId;
          const buses = await XeBuytModel.getAll(queryParams);
          let filteredBuses = buses;
          if (filters.status) {
            filteredBuses = buses.filter(b => b.trangThai === filters.status);
          }
          data = { buses: filteredBuses };
          break;
        }
        case "drivers": {
          const queryParams = {};
          if (filters.status) queryParams.status = filters.status;
          if (filters.busId) queryParams.busId = filters.busId;
          const drivers = await TaiXeModel.getAll(queryParams);
          let filteredDrivers = drivers;
          if (filters.status) {
            filteredDrivers = drivers.filter(d => d.trangThai === filters.status);
          }
          if (filters.rating) {
            const minRating = parseInt(filters.rating);
            filteredDrivers = filteredDrivers.filter(d => {
              const rating = d.danhGia || 0;
              if (minRating === 5) return rating >= 5;
              if (minRating === 4) return rating >= 4;
              if (minRating === 3) return rating >= 3;
              if (minRating === 2) return rating < 3;
              return true;
            });
          }
          data = { drivers: filteredDrivers };
          break;
        }
        case "students": {
          const students = await HocSinhModel.getWithParentInfo();
          let filteredStudents = students;
          if (filters.class) {
            filteredStudents = filteredStudents.filter(s => s.lop === filters.class);
          }
          if (filters.routeId) {
            filteredStudents = filteredStudents.filter(s => s.maTuyen === parseInt(filters.routeId));
          }
          data = { students: filteredStudents };
          break;
        }
        case "incidents": {
          const queryParams = { tuNgay: dateFrom, denNgay: dateTo };
          if (filters.type) queryParams.loaiSuCo = filters.type;
          if (filters.severity) queryParams.mucDo = filters.severity;
          if (filters.status) queryParams.trangThai = filters.status;
          if (filters.busId) queryParams.maXe = filters.busId;
          data = { incidents: await SuCoModel.getAll(queryParams) };
          break;
        }
      }
      
      // Generate file buffer using the same logic as export endpoint
      let fileBuffer;
      let fileName = `report_${type}_${dateFrom}_${dateTo}`;
      const reportFormat = format || "pdf";

      if (reportFormat === "pdf") {
        // Use the same PDF generation logic from ReportsController
        try {
          fileBuffer = await ReportsController.generatePDFBuffer(type, dateFrom, dateTo, data, filters);
          fileName += ".pdf";
        } catch (pdfError) {
          console.error("Error generating PDF buffer:", pdfError);
          return res.status(500).json({
            success: false,
            message: "Lỗi khi tạo file PDF: " + (pdfError.message || "Unknown error"),
          });
        }
      } else if (reportFormat === "excel" || reportFormat === "xlsx") {
        // Generate Excel
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Report");
        
        sheet.addRow(["Báo cáo", type]);
        sheet.addRow(["Từ", dateFrom]);
        sheet.addRow(["Đến", dateTo]);
        sheet.addRow([]);
        
        // Add data rows based on type
        if (type === "trips" && Array.isArray(data.trips)) {
          sheet.addRow(["Mã chuyến", "Ngày chạy", "Tuyến", "Biển số", "Tài xế", "Trạng thái"]);
          data.trips.forEach((trip) => {
            sheet.addRow([
              trip.maChuyen || "",
              trip.ngayChay || "",
              trip.tenTuyen || "",
              trip.bienSoXe || "",
              trip.tenTaiXe || "",
              trip.trangThai || "",
            ]);
          });
        } else if (type === "incidents" && Array.isArray(data.incidents)) {
          sheet.addRow(["Mã sự cố", "Mô tả", "Mức độ", "Ngày"]);
          data.incidents.forEach((incident) => {
            sheet.addRow([
              incident.maSuCo || "",
              incident.moTa || "",
              incident.mucDo || "",
              incident.ngayTao || "",
            ]);
          });
        }
        
        fileBuffer = await workbook.xlsx.writeBuffer();
        fileName += ".xlsx";
      } else {
        // CSV
        let csv = "";
        if (type === "trips" && Array.isArray(data.trips)) {
          csv = "Mã chuyến,Ngày chạy,Tuyến,Biển số,Tài xế,Trạng thái\n";
          data.trips.forEach((trip) => {
            csv += `${trip.maChuyen || ""},${trip.ngayChay || ""},${trip.tenTuyen || ""},${trip.bienSoXe || ""},${trip.tenTaiXe || ""},${trip.trangThai || ""}\n`;
          });
        } else {
          csv = Object.entries(data)
            .map(([key, value]) => `${key},${JSON.stringify(value)}`)
            .join("\n");
        }
        fileBuffer = Buffer.from(csv, "utf-8");
        fileName += ".csv";
      }

      // Send email
      const result = await EmailService.sendReportEmail(
        recipientEmail,
        type,
        format || "pdf",
        dateFrom,
        dateTo,
        fileBuffer,
        fileName
      );

      if (result.success && result.sent) {
        return res.status(200).json({
          success: true,
          message: `Đã gửi báo cáo đến ${recipientEmail}`,
        });
      } else {
        return res.status(500).json({
          success: false,
          message: result.message || "Không thể gửi email. Vui lòng kiểm tra cấu hình email.",
        });
      }
    } catch (error) {
      console.error("Error sending report email:", error);
      console.error("Error stack:", error.stack);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi gửi email: " + (error.message || "Unknown error"),
      });
    }
  }
);

export default router;
