import Joi from "joi";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";

const REPORT_TYPES = ["overview", "trips", "buses", "drivers", "students", "incidents"];
const FORMATS = ["csv", "excel", "xlsx", "pdf"];

function validateParams(query) {
  const schema = Joi.object({
    type: Joi.string().valid(...REPORT_TYPES).default("overview"),
    format: Joi.string().valid(...FORMATS).default("excel"),
    from: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    to: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
    .custom((value, helpers) => {
      if (value.from && value.to && value.from > value.to) {
        return helpers.error("any.invalid");
      }
      return value;
    }, "from<=to validation");

  const { value, error } = schema.validate(query, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join("; ");
    const err = new Error(message);
    err.status = 400;
    throw err;
  }
  return value;
}

async function buildDataByType(type, dateFrom, dateTo) {
  const XeBuytModel = (await import("../models/XeBuytModel.js")).default;
  const ChuyenDiModel = (await import("../models/ChuyenDiModel.js")).default;
  const TaiXeModel = (await import("../models/TaiXeModel.js")).default;
  const HocSinhModel = (await import("../models/HocSinhModel.js")).default;
  const SuCoModel = (await import("../models/SuCoModel.js")).default;

  switch (type) {
    case "overview": {
      const busStats = await XeBuytModel.getStats();
      const tripStats = await ChuyenDiModel.getStats(dateFrom, dateTo);
      return {
        period: { from: dateFrom, to: dateTo },
        buses: busStats,
        trips: tripStats,
      };
    }
    case "trips": {
      const trips = await ChuyenDiModel.getAll({ from: dateFrom, to: dateTo });
      const trendRaw = await ChuyenDiModel.getDailyTrend(dateFrom, dateTo);
      const busUtilizationRaw = await ChuyenDiModel.getBusUtilization(dateFrom, dateTo);
      // Bổ sung các ngày không có dữ liệu để frontend vẽ biểu đồ đều
      const fillTrend = () => {
        const map = new Map();
        trendRaw.forEach(r => map.set(r.date, r));
        const result = [];
        let cur = new Date(dateFrom + 'T00:00:00');
        const end = new Date(dateTo + 'T00:00:00');
        while (cur.getTime() <= end.getTime()) {
          const key = cur.toISOString().slice(0,10);
          const found = map.get(key);
          if (found) {
            result.push(found);
          } else {
            result.push({ date: key, total: 0, onTime: 0, late: 0 });
          }
          cur.setDate(cur.getDate() + 1);
        }
        return result;
      };
      const trend = fillTrend();
      // Chuẩn hóa busUtilization để FE dùng
      const busUtilization = busUtilizationRaw.map(b => ({
        plateNumber: b.bienSoXe,
        bienSoXe: b.bienSoXe,
        trips: b.trips,
        utilization: b.utilizationPercent, // % sử dụng theo số lịch trình * ngày
        onTimeRate: b.onTimeRate,
        scheduledTrips: b.theoreticalMax,
        activeDays: b.activeDays,
      }));
      return { trips, trend, busUtilization };
    }
    case "buses": {
      const buses = await XeBuytModel.getAll();
      return { buses };
    }
    case "drivers": {
      const drivers = await TaiXeModel.getAll();
      return { drivers };
    }
    case "students": {
      const students = await HocSinhModel.getWithParentInfo();
      return { students };
    }
    case "incidents": {
      const incidents = await SuCoModel.getAll({ tuNgay: dateFrom, denNgay: dateTo });
      return { incidents };
    }
    default:
      return {};
  }
}

class ReportsController {
  // GET /api/v1/reports/overview?from=YYYY-MM-DD&to=YYYY-MM-DD
  static async overview(req, res) {
    try {
      const { from, to } = req.query;

      const XeBuytModel = (await import("../models/XeBuytModel.js")).default;
      const ChuyenDiModel = (await import("../models/ChuyenDiModel.js")).default;

      const busStats = await XeBuytModel.getStats();
      const tripStats = from && to ? await ChuyenDiModel.getStats(from, to) : await ChuyenDiModel.getStats(new Date().toISOString().slice(0,10), new Date().toISOString().slice(0,10));

      const activeBuses = (busStats.busCounts || []).find(x => x.trangThai === 'hoat_dong')?.count || 0;
      const maintenanceBuses = (busStats.busCounts || []).find(x => x.trangThai === 'bao_tri')?.count || 0;

      return res.status(200).json({
        success: true,
        data: {
          buses: {
            total: busStats.totalBuses || 0,
            active: activeBuses,
            maintenance: maintenanceBuses,
          },
          trips: {
            total: tripStats.totalTrips || 0,
            completed: tripStats.completedTrips || 0,
            delayed: tripStats.delayedTrips || 0,
            cancelled: tripStats.cancelledTrips || 0,
            averageDurationMinutes: (tripStats.averageDurationInSeconds || 0) / 60,
          },
        },
      });
    } catch (error) {
      console.error("ReportsController.overview error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }

  // GET /api/v1/reports/export?format=pdf|excel&type=overview|trips|buses|drivers|students|incidents&from=YYYY-MM-DD&to=YYYY-MM-DD
  static async export(req, res) {
    try {
      const { format, type, from, to } = validateParams(req.query);

      // Xác định khoảng thời gian
      const dateFrom = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const dateTo = to || new Date().toISOString().slice(0, 10);

      // Lấy dữ liệu dựa trên type
      let data = {};
      let fileName = `report_${type}_${dateFrom}_${dateTo}`;
      data = await buildDataByType(type, dateFrom, dateTo);

      // Xuất Excel dạng XLSX chính tả tiếng Việt OK
      if (format === "excel" || format === "xlsx") {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Report");

        // Build columns/rows
        const buildTable = () => {
          if (type === "trips") {
            sheet.columns = [
              { header: "Mã chuyến", key: "maChuyen", width: 12 },
              { header: "Ngày chạy", key: "ngayChay", width: 12 },
              { header: "Tuyến đường", key: "tenTuyen", width: 22 },
              { header: "Biển số xe", key: "bienSoXe", width: 14 },
              { header: "Tài xế", key: "tenTaiXe", width: 18 },
              { header: "Trạng thái", key: "trangThai", width: 16 },
              { header: "Giờ khởi hành", key: "gioKhoiHanh", width: 16 },
              { header: "Bắt đầu thực tế", key: "gioBatDauThucTe", width: 18 },
            ];
            (data.trips || []).forEach((r) => sheet.addRow(r));
            return;
          }
          if (type === "buses") {
            sheet.columns = [
              { header: "Mã xe", key: "maXe", width: 10 },
              { header: "Biển số", key: "bienSoXe", width: 14 },
              { header: "Dòng xe", key: "dongXe", width: 16 },
              { header: "Sức chứa", key: "sucChua", width: 10 },
              { header: "Trạng thái", key: "trangThai", width: 14 },
            ];
            (data.buses || []).forEach((r) => sheet.addRow(r));
            return;
          }
          if (type === "drivers") {
            sheet.columns = [
              { header: "Mã tài xế", key: "maTaiXe", width: 10 },
              { header: "Họ tên", key: "hoTen", width: 20 },
              { header: "Số bằng lái", key: "soBangLai", width: 16 },
              { header: "SĐT", key: "soDienThoai", width: 14 },
              { header: "Trạng thái", key: "trangThai", width: 14 },
            ];
            (data.drivers || []).forEach((r) => sheet.addRow(r));
            return;
          }
          if (type === "students") {
            sheet.columns = [
              { header: "Mã học sinh", key: "maHocSinh", width: 12 },
              { header: "Họ tên", key: "hoTen", width: 22 },
              { header: "Lớp", key: "lop", width: 8 },
              { header: "Phụ huynh", key: "tenPhuHuynh", width: 20 },
              { header: "SĐT PH", key: "sdtPhuHuynh", width: 14 },
            ];
            (data.students || []).forEach((r) => sheet.addRow(r));
            return;
          }
          if (type === "incidents") {
            sheet.columns = [
              { header: "Mã sự cố", key: "maSuCo", width: 10 },
              { header: "Loại", key: "loaiSuCo", width: 16 },
              { header: "Mức độ", key: "mucDo", width: 12 },
              { header: "Mô tả", key: "moTa", width: 40 },
              { header: "Ngày", key: "ngayTao", width: 18 },
              { header: "Chuyến", key: "maChuyen", width: 10 },
            ];
            (data.incidents || []).forEach((r) => sheet.addRow(r));
            return;
          }
          // overview 2 cột
          sheet.columns = [
            { header: "Chỉ số", key: "label", width: 26 },
            { header: "Giá trị", key: "value", width: 22 },
          ];
          sheet.addRow({ label: "Thời gian", value: `${data.period?.from || ""} → ${data.period?.to || ""}` });
          sheet.addRow({ label: "Tổng số xe", value: data.buses?.totalBuses || 0 });
          sheet.addRow({ label: "Xe hoạt động", value: data.buses?.active || 0 });
          sheet.addRow({ label: "Tổng chuyến", value: data.trips?.totalTrips || 0 });
          sheet.addRow({ label: "Chuyến hoàn thành", value: data.trips?.completedTrips || 0 });
          sheet.addRow({ label: "Chuyến trễ", value: data.trips?.delayedTrips || 0 });
        };
        buildTable();

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}.xlsx"`);
        await workbook.xlsx.write(res);
        return res.end();
      }

      // Xuất CSV đơn giản (fallback)
      if (format === "csv") {
        const csv = convertToCSV(data, type);
        fileName += ".csv";
        res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        // Ensure BOM + CRLF for Excel
        const out = "\ufeff" + csv.replace(/\n/g, "\r\n");
        return res.end(out, "utf8");
      }

      // Xuất PDF (bố cục bảng theo hàng/cột – pdfkit)
      if (format === "pdf") {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}.pdf"`);
        const doc = new PDFDocument({ margin: 50 });
        // Pipe ngay từ đầu để đảm bảo stream chính xác
        doc.pipe(res);
        // Try to register Vietnamese-capable fonts if available
        let hasVNRegular = false;
        let hasVNBold = false;
        try {
          const __filename = fileURLToPath(import.meta.url);
          const __dirnameLocal = path.dirname(__filename);
          const fontsDir = path.resolve(path.join(__dirnameLocal, "../../assets/fonts"));
          const candidates = [
            // Project bundled fonts (recommended)
            { reg: path.join(fontsDir, "NotoSans-Regular.ttf"), bold: path.join(fontsDir, "NotoSans-Bold.ttf") },
            // Windows common fonts
            { reg: "C:/Windows/Fonts/segoeui.ttf", bold: "C:/Windows/Fonts/segoeuib.ttf" },
            { reg: "C:/Windows/Fonts/arial.ttf", bold: "C:/Windows/Fonts/arialbd.ttf" },
            { reg: "C:/Windows/Fonts/tahoma.ttf", bold: "C:/Windows/Fonts/tahomabd.ttf" },
            // Linux common fonts
            { reg: "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf", bold: "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf" },
            { reg: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", bold: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" },
            // macOS common fonts
            { reg: "/Library/Fonts/Arial.ttf", bold: "/Library/Fonts/Arial Bold.ttf" },
          ];

          for (const cand of candidates) {
            if (!hasVNRegular && fs.existsSync(cand.reg)) {
              doc.registerFont("vn-regular", cand.reg);
              hasVNRegular = true;
            }
            if (!hasVNBold && fs.existsSync(cand.bold)) {
              doc.registerFont("vn-bold", cand.bold);
              hasVNBold = true;
            }
            if (hasVNRegular && hasVNBold) break;
          }
        } catch {}
        doc.info.Title = `SSB Report - ${type}`;

        // Header
        if (hasVNBold) doc.font('vn-bold');
        doc.fillColor('#111').fontSize(20).text('Smart School Bus - Report', { align: 'center' });
        doc.moveDown(0.5);
        if (hasVNRegular) doc.font('vn-regular');
        doc.fillColor('#555').fontSize(10).text(`Type: ${String(type || '').toUpperCase()}`, { align: 'center' });
        // Use ASCII dash to avoid glyph issues when custom font missing
        doc.fillColor('#555').fontSize(10).text(`Period: ${dateFrom} - ${dateTo}`, { align: 'center' });
        doc.moveDown(1);

        // Divider
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const startX = doc.page.margins.left;
        const currentY = doc.y;
        doc.moveTo(startX, currentY).lineTo(startX + pageWidth, currentY).stroke('#DDD');
        doc.moveDown(1);

        // Helper: vẽ bảng theo cột/hàng, hỗ trợ phân trang (row height cố định)
        const drawTable = (columns, rows, opts = {}) => {
          const headBg = opts.headBg || '#F5F5F5';
          const zebraBg = opts.zebraBg || '#FAFAFA';
          const border = opts.border || '#E5E5E5';
          const textColor = '#111';
          const headerFontSize = 12;
          const cellFontSize = 10.5;
          const rowHeight = opts.rowHeight || 22;
          const colWidths = (() => {
            if (opts.widths && opts.widths.length === columns.length) return opts.widths;
            // phân bổ đều
            return columns.map(() => pageWidth / columns.length);
          })();

          // Vẽ hàng header
          const drawHeader = (y) => {
            doc.rect(startX, y, pageWidth, rowHeight).fill(headBg);
            let x = startX;
            if (hasVNBold) doc.font('vn-bold');
            doc.fillColor(textColor).fontSize(headerFontSize);
            columns.forEach((col, idx) => {
              doc.text(String(col.header || ''), x + 6, y + 6, { width: colWidths[idx] - 12, align: col.align || 'left' });
              x += colWidths[idx];
            });
            doc.strokeColor(border).lineWidth(0.5).rect(startX, y, pageWidth, rowHeight).stroke();
          };

          const bottomY = doc.page.height - doc.page.margins.bottom;
          let y = doc.y + 6;
          drawHeader(y);
          y += rowHeight;

          rows.forEach((row, rIdx) => {
            // New page nếu không đủ chỗ
            if (y + rowHeight > bottomY) {
              doc.addPage();
              // divider + header lại
              const pw = doc.page.width - doc.page.margins.left - doc.page.margins.right;
              const sx = doc.page.margins.left;
              const cy = doc.y;
              doc.moveTo(sx, cy).lineTo(sx + pw, cy).stroke('#DDD');
              doc.moveDown(0.8);
              y = doc.y;
              drawHeader(y);
              y += rowHeight;
            }

            // nền xen kẽ
            if (rIdx % 2 === 1) {
              doc.rect(startX, y, pageWidth, rowHeight).fill(zebraBg);
            }

            if (hasVNRegular) doc.font('vn-regular');
            doc.fillColor(textColor).fontSize(cellFontSize);
            let x = startX;
            columns.forEach((col, idx) => {
              const value = Array.isArray(row) ? row[idx] : row[col.key];
              doc.text(String(value ?? ''), x + 6, y + 6, { width: colWidths[idx] - 12, align: col.align || 'left' });
              x += colWidths[idx];
            });

            doc.strokeColor(border).lineWidth(0.5).rect(startX, y, pageWidth, rowHeight).stroke();
            y += rowHeight;
            // reset fill sau khi vẽ
            doc.fillColor('#000');
          });

          doc.moveDown(1.2);
        };

        // Content rendering theo từng type
        if (type === 'overview') {
          const columns = [
            { header: 'Chỉ số', key: 'label' },
            { header: 'Giá trị', key: 'value', align: 'right' },
          ];
          const rows = [
            { label: 'Thời gian', value: `${dateFrom} → ${dateTo}` },
            { label: 'Tổng số xe', value: String(data?.buses?.totalBuses ?? 0) },
            { label: 'Xe hoạt động', value: String(data?.buses?.active ?? 0) },
            { label: 'Tổng chuyến', value: String(data?.trips?.totalTrips ?? 0) },
            { label: 'Chuyến hoàn thành', value: String(data?.trips?.completedTrips ?? 0) },
            { label: 'Chuyến trễ', value: String(data?.trips?.delayedTrips ?? 0) },
          ];
          drawTable(columns, rows, { widths: [pageWidth * 0.6, pageWidth * 0.4] });
        } else if (type === 'trips') {
          const columns = [
            { header: 'Mã chuyến', key: 'maChuyen' },
            { header: 'Ngày chạy', key: 'ngayChay' },
            { header: 'Tuyến', key: 'tenTuyen' },
            { header: 'Biển số', key: 'bienSoXe' },
            { header: 'Tài xế', key: 'tenTaiXe' },
            { header: 'Trạng thái', key: 'trangThai' },
          ];
          drawTable(columns, data?.trips || []);
        } else if (type === 'buses') {
          const columns = [
            { header: 'Mã xe', key: 'maXe' },
            { header: 'Biển số', key: 'bienSoXe' },
            { header: 'Dòng xe', key: 'dongXe' },
            { header: 'Sức chứa', key: 'sucChua', align: 'right' },
            { header: 'Trạng thái', key: 'trangThai' },
          ];
          drawTable(columns, data?.buses || []);
        } else if (type === 'drivers') {
          const columns = [
            { header: 'Mã tài xế', key: 'maTaiXe' },
            { header: 'Họ tên', key: 'hoTen' },
            { header: 'Số bằng lái', key: 'soBangLai' },
            { header: 'SĐT', key: 'soDienThoai' },
            { header: 'Trạng thái', key: 'trangThai' },
          ];
          drawTable(columns, data?.drivers || []);
        } else if (type === 'students') {
          const columns = [
            { header: 'Mã HS', key: 'maHocSinh' },
            { header: 'Họ tên', key: 'hoTen' },
            { header: 'Lớp', key: 'lop' },
            { header: 'Phụ huynh', key: 'tenPhuHuynh' },
            { header: 'SĐT PH', key: 'sdtPhuHuynh' },
          ];
          drawTable(columns, data?.students || []);
        } else if (type === 'incidents') {
          const columns = [
            { header: 'Mã sự cố', key: 'maSuCo' },
            { header: 'Loại', key: 'loaiSuCo' },
            { header: 'Mức độ', key: 'mucDo' },
            { header: 'Mô tả', key: 'moTa' },
            { header: 'Ngày', key: 'ngayTao' },
          ];
          drawTable(columns, data?.incidents || []);
        }

        // Footer
        doc.moveDown(1.5);
        if (hasVNRegular) doc.font('vn-regular');
        doc.fillColor('#888').fontSize(9).text('Generated by Smart School Bus System', { align: 'right' });

        doc.end();
        return;
      }

      return res.status(400).json({ success: false, message: "Định dạng xuất không hợp lệ" });
    } catch (error) {
      console.error("ReportsController.export error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server khi xuất báo cáo" });
    }
  }

  // GET /api/v1/reports/view?type=...&from=...&to=...
  static async view(req, res) {
    try {
      const { type, from, to } = validateParams({ ...req.query, format: "csv" });
      const dateFrom = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const dateTo = to || new Date().toISOString().slice(0, 10);
      const data = await buildDataByType(type, dateFrom, dateTo);
      return res.status(200).json({ success: true, data, meta: { type, from: dateFrom, to: dateTo } });
    } catch (error) {
      console.error("ReportsController.view error:", error);
      const status = error?.status || 500;
      return res.status(status).json({ success: false, message: error?.message || "Lỗi server" });
    }
  }
}

// Helper function để chuyển đổi data sang CSV
function convertToCSV(data, type) {
  let csv = "";
  const headers = [];
  const rows = [];

  switch (type) {
    case "trips":
      if (data.trips && data.trips.length > 0) {
        headers.push("Mã chuyến", "Ngày chạy", "Tuyến đường", "Biển số xe", "Tài xế", "Trạng thái", "Giờ khởi hành", "Giờ bắt đầu thực tế");
        data.trips.forEach((trip) => {
          rows.push([
            trip.maChuyen || "",
            trip.ngayChay || "",
            trip.tenTuyen || "",
            trip.bienSoXe || "",
            trip.tenTaiXe || "",
            trip.trangThai || "",
            trip.gioKhoiHanh || "",
            trip.gioBatDauThucTe || "",
          ]);
        });
      }
      break;

    case "buses":
      if (data.buses && data.buses.length > 0) {
        headers.push("Mã xe", "Biển số", "Dòng xe", "Sức chứa", "Trạng thái");
        data.buses.forEach((bus) => {
          rows.push([
            bus.maXe || "",
            bus.bienSoXe || "",
            bus.dongXe || "",
            bus.sucChua || "",
            bus.trangThai || "",
          ]);
        });
      }
      break;

    case "students":
      if (data.students && data.students.length > 0) {
        headers.push("Mã học sinh", "Họ tên", "Lớp", "Phụ huynh", "SĐT phụ huynh");
        data.students.forEach((student) => {
          rows.push([
            student.maHocSinh || "",
            student.hoTen || "",
            student.lop || "",
            student.tenPhuHuynh || "",
            student.sdtPhuHuynh || "",
          ]);
        });
      }
      break;

    case "drivers":
      if (data.drivers && data.drivers.length > 0) {
        headers.push("Mã tài xế", "Họ tên", "Số bằng lái", "SĐT", "Trạng thái");
        data.drivers.forEach((d) => {
          rows.push([
            d.maTaiXe || d.id || "",
            d.hoTen || d.tenTaiXe || "",
            d.soBangLai || "",
            d.soDienThoai || "",
            d.trangThai || "",
          ]);
        });
      }
      break;

    case "incidents":
      if (data.incidents && data.incidents.length > 0) {
        headers.push("Mã sự cố", "Loại", "Mức độ", "Mô tả", "Ngày", "Chuyến liên quan");
        data.incidents.forEach((i) => {
          rows.push([
            i.maSuCo || i.id || "",
            i.loaiSuCo || i.type || "",
            i.mucDo || i.severity || "",
            i.moTa || i.description || "",
            i.ngayTao || i.createdAt || "",
            i.maChuyen || i.tripId || "",
          ]);
        });
      }
      break;

    default:
      // Overview - xuất dạng 2 cột dễ đọc cho Excel
      headers.push("Chỉ số", "Giá trị");
      rows.push(["Thời gian", `${data.period?.from || ""} → ${data.period?.to || ""}`]);
      rows.push(["Tổng số xe", data.buses?.totalBuses || 0]);
      rows.push(["Xe hoạt động", data.buses?.active || 0]);
      rows.push(["Tổng chuyến", data.trips?.totalTrips || 0]);
      rows.push(["Chuyến hoàn thành", data.trips?.completedTrips || 0]);
      rows.push(["Chuyến trễ", data.trips?.delayedTrips || 0]);
      break;
  }

  // Excel hint for separator
  let sepLine = "sep=,\n";
  // Tạo CSV từ headers và rows
  csv = sepLine + headers.join(",") + "\n";
  rows.forEach((row) => {
    csv += row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",") + "\n";
  });

  // Trả về string (BOM sẽ được thêm khi gửi response)
  return csv;
}

export default ReportsController;
