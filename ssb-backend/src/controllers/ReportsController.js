import Joi from "joi";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";

// ES modules equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORT_TYPES = ["overview", "trips", "buses", "drivers", "students", "incidents"];
const FORMATS = ["csv", "excel", "xlsx", "pdf"];

function validateParams(query) {
  const schema = Joi.object({
    type: Joi.string()
      .valid(...REPORT_TYPES)
      .default("overview")
      .messages({
        "any.only": "Loại báo cáo không hợp lệ. Các loại hợp lệ: " + REPORT_TYPES.join(", "),
      }),
    format: Joi.string()
      .valid(...FORMATS)
      .default("excel")
      .messages({
        "any.only": "Định dạng xuất không hợp lệ. Các định dạng hợp lệ: " + FORMATS.join(", "),
      }),
    from: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .messages({
        "string.pattern.base": "Ngày bắt đầu phải có định dạng YYYY-MM-DD",
      }),
    to: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .messages({
        "string.pattern.base": "Ngày kết thúc phải có định dạng YYYY-MM-DD",
      }),
  })
    .custom((value, helpers) => {
      if (value.from && value.to && value.from > value.to) {
        return helpers.error("any.invalid", {
          message: "Khoảng thời gian không hợp lệ: ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc",
        });
      }
      return value;
    }, "from<=to validation");

  const { value, error } = schema.validate(query, { abortEarly: false, allowUnknown: true });
  if (error) {
    const messages = error.details.map((d) => {
      // Use custom message if available, otherwise use default
      return d.message || d.type;
    });
    const message = messages.join("; ");
    const err = new Error(message);
    err.status = 400;
    throw err;
  }
  return value;
}

async function buildDataByType(type, dateFrom, dateTo, filters = {}) {
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
      const queryParams = { from: dateFrom, to: dateTo };
      if (filters.routeId) queryParams.routeId = filters.routeId;
      if (filters.busId) queryParams.busId = filters.busId;
      if (filters.driverId) queryParams.driverId = filters.driverId;
      if (filters.status) queryParams.status = filters.status;
      const trips = await ChuyenDiModel.getAll(queryParams);
      // Apply client-side filtering if needed (for status, etc.)
      let filteredTrips = trips;
      if (filters.status) {
        filteredTrips = trips.filter(t => t.trangThai === filters.status);
      }
      return { trips: filteredTrips };
    }
    case "buses": {
      const queryParams = {};
      if (filters.status) queryParams.trangThai = filters.status;
      if (filters.routeId) queryParams.routeId = filters.routeId;
      if (filters.driverId) queryParams.driverId = filters.driverId;
      const buses = await XeBuytModel.getAll(queryParams);
      // Apply additional filtering
      let filteredBuses = buses;
      if (filters.status) {
        filteredBuses = buses.filter(b => b.trangThai === filters.status);
      }
      return { buses: filteredBuses };
    }
    case "drivers": {
      const queryParams = {};
      if (filters.status) queryParams.status = filters.status;
      if (filters.busId) queryParams.busId = filters.busId;
      const drivers = await TaiXeModel.getAll(queryParams);
      // Apply additional filtering
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
      return { drivers: filteredDrivers };
    }
    case "students": {
      const students = await HocSinhModel.getWithParentInfo();
      // Apply filtering
      let filteredStudents = students;
      if (filters.class) {
        filteredStudents = filteredStudents.filter(s => s.lop === filters.class);
      }
      if (filters.routeId) {
        filteredStudents = filteredStudents.filter(s => s.maTuyen === parseInt(filters.routeId));
      }
      // Note: attendanceStatus would need additional query to TrangThaiHocSinh
      return { students: filteredStudents };
    }
    case "incidents": {
      const queryParams = { tuNgay: dateFrom, denNgay: dateTo };
      if (filters.type) queryParams.loaiSuCo = filters.type;
      if (filters.severity) queryParams.mucDo = filters.severity;
      if (filters.status) queryParams.trangThai = filters.status;
      if (filters.busId) queryParams.maXe = filters.busId;
      const incidents = await SuCoModel.getAll(queryParams);
      return { incidents };
    }
    default:
      return {};
  }
}

// Helper function to generate PDF buffer (reusable for export and email)
// This function uses the same logic as export method but collects PDF into buffer instead of piping to response
async function generatePDFBuffer(type, dateFrom, dateTo, data, filters = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 40,
        size: 'A4',
        info: {
          Title: `Báo cáo ${type} - Smart School Bus`,
          Author: 'Smart School Bus System',
          Subject: `Báo cáo ${type}`,
          Creator: 'Smart School Bus Tracking System'
        }
      });
      
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', (err) => {
        reject(err);
      });
      
      // Use the same PDF generation logic as export method
      // Copy the entire PDF generation logic from export method here
      generatePDFContentForBuffer(doc, type, dateFrom, dateTo, data, filters);
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Helper function to generate PDF content for buffer (extracted from export method)
function generatePDFContentForBuffer(doc, type, dateFrom, dateTo, data, filters = {}) {
  // Try to register Vietnamese-capable fonts from Windows or custom fonts
  let hasVNRegular = false;
  let hasVNBold = false;
  
  // Helper function to validate and register font
  function tryRegisterFont(fontName, fontPath) {
    try {
      if (!fs.existsSync(fontPath)) {
        return false;
      }
      
      // Check if file is valid (at least 1KB and has TTF header)
      const stats = fs.statSync(fontPath);
      if (stats.size < 1024) {
        console.warn(`⚠️  Font file too small: ${fontPath}`);
        return false;
      }
      
      // Try to read first bytes to check TTF header
      const buffer = fs.readFileSync(fontPath, { start: 0, end: 4 });
      const isValidTTF = buffer[0] === 0x00 && buffer[1] === 0x01 && buffer[2] === 0x00 && buffer[3] === 0x00 ||
                        buffer[0] === 0x4F && buffer[1] === 0x54 && buffer[2] === 0x54 && buffer[3] === 0x4F; // OTTF (OpenType)
      
      if (!isValidTTF) {
        // Still try to register, PDFKit might handle it
        console.warn(`⚠️  Font file may not be valid TTF: ${fontPath}`);
      }
      
      doc.registerFont(fontName, fontPath);
      return true;
    } catch (err) {
      console.warn(`⚠️  Failed to register font ${fontName} from ${fontPath}:`, err.message);
      return false;
    }
  }
  
  // List of Windows fonts that support Vietnamese
  const windowsFonts = {
    regular: [
      "C:/Windows/Fonts/arial.ttf",
      "C:/Windows/Fonts/tahoma.ttf",
      "C:/Windows/Fonts/segoeui.ttf",
      "C:/Windows/Fonts/calibri.ttf",
    ],
    bold: [
      "C:/Windows/Fonts/arialbd.ttf",
      "C:/Windows/Fonts/tahomabd.ttf",
      "C:/Windows/Fonts/segoeuib.ttf",
      "C:/Windows/Fonts/calibrib.ttf",
    ]
  };
  
  const customFontsDir = path.resolve(path.join(__dirname, "../../assets/fonts"));
  const customFontRegular = path.join(customFontsDir, "NotoSans-Regular.ttf");
  const customFontBold = path.join(customFontsDir, "NotoSans-Bold.ttf");
  
  // Try custom fonts first
  if (tryRegisterFont("vn-regular", customFontRegular)) {
    hasVNRegular = true;
    console.log("✓ Vietnamese font (Regular) loaded from custom fonts");
  } else {
    // Try Windows fonts
    for (const fontPath of windowsFonts.regular) {
      if (tryRegisterFont("vn-regular", fontPath)) {
        hasVNRegular = true;
        console.log(`✓ Vietnamese font (Regular) loaded from Windows: ${path.basename(fontPath)}`);
        break;
      }
    }
  }
  
  if (tryRegisterFont("vn-bold", customFontBold)) {
    hasVNBold = true;
    console.log("✓ Vietnamese font (Bold) loaded from custom fonts");
  } else {
    // Try Windows fonts
    for (const fontPath of windowsFonts.bold) {
      if (tryRegisterFont("vn-bold", fontPath)) {
        hasVNBold = true;
        console.log(`✓ Vietnamese font (Bold) loaded from Windows: ${path.basename(fontPath)}`);
        break;
      }
    }
  }
  
  if (!hasVNRegular || !hasVNBold) {
    console.warn("⚠️  Some Vietnamese fonts not found. PDF may display Vietnamese incorrectly.");
    console.warn("💡 Tip: Install Arial or Tahoma fonts, or run 'npm run download-fonts'");
  }
  
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startX = doc.page.margins.left;
  let currentY = doc.page.margins.top;
  
  // Track page count
  let pageCount = 1;
  
  // Helper function để render header đẹp
  function renderHeader() {
    const headerHeight = 80;
    doc.rect(startX, currentY, pageWidth, headerHeight)
      .fill('#1e40af');
    
    if (hasVNBold) doc.font('vn-bold');
    else doc.font('Helvetica-Bold');
    doc.fillColor('#ffffff')
      .fontSize(24)
      .text('Smart School Bus', startX + 20, currentY + 15, { width: pageWidth - 40 });
    
    if (hasVNRegular) doc.font('vn-regular');
    else doc.font('Helvetica');
    doc.fillColor('#e0e7ff')
      .fontSize(12)
      .text('Hệ thống quản lý xe buýt trường học thông minh', startX + 20, currentY + 45, { width: pageWidth - 40 });
    
    const typeLabels = {
      overview: 'Tổng quan',
      trips: 'Chuyến đi',
      buses: 'Xe buýt',
      drivers: 'Tài xế',
      students: 'Học sinh',
      incidents: 'Sự cố'
    };
    const reportTypeLabel = typeLabels[type] || type.toUpperCase();
    
    if (hasVNBold) doc.font('vn-bold');
    else doc.font('Helvetica-Bold');
    const badgeWidth = doc.widthOfString(reportTypeLabel, { fontSize: 10 }) + 16;
    doc.rect(startX + pageWidth - badgeWidth - 20, currentY + 15, badgeWidth, 25)
      .fill('#3b82f6');
    doc.fillColor('#ffffff')
      .fontSize(10)
      .text(reportTypeLabel, startX + pageWidth - badgeWidth - 12, currentY + 22, { width: badgeWidth - 8, align: 'center' });
    
    currentY += headerHeight + 10;
    
    // Info box
    const infoBoxHeight = 35;
    doc.rect(startX, currentY, pageWidth, infoBoxHeight)
      .fill('#f1f5f9')
      .stroke('#cbd5e1');
    
    if (hasVNRegular) doc.font('vn-regular');
    else doc.font('Helvetica');
    doc.fillColor('#475569')
      .fontSize(9)
      .text(`Khoảng thời gian: ${dateFrom} - ${dateTo}`, startX + 15, currentY + 12, { width: pageWidth / 2 });
    
    const generatedDate = new Date().toLocaleString('vi-VN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    doc.text(`Tạo lúc: ${generatedDate}`, startX + pageWidth - 150, currentY + 12, { width: 140, align: 'right' });
    
    currentY += infoBoxHeight + 25;
  }
  
  // Helper function để render table
  function renderTable(headers, rows, startY) {
    const colCount = headers.length;
    const colWidth = pageWidth / colCount;
    const rowHeight = 25;
    const headerHeight = 30;
    let y = startY;
    
    // Table header
    doc.rect(startX, y, pageWidth, headerHeight)
      .fill('#1e40af');
    
    headers.forEach((header, idx) => {
      if (hasVNBold) doc.font('vn-bold');
      else doc.font('Helvetica-Bold');
      doc.fillColor('#ffffff')
        .fontSize(10)
        .text(header, startX + idx * colWidth + 10, y + 8, { 
          width: colWidth - 20,
          align: idx === headers.length - 1 ? 'right' : 'left'
        });
    });
    
    y += headerHeight;
    
    // Table rows
    rows.forEach((row, rowIdx) => {
      const isEven = rowIdx % 2 === 0;
      if (isEven) {
        doc.rect(startX, y, pageWidth, rowHeight)
          .fill('#f8fafc');
      }
      
      row.forEach((cell, colIdx) => {
        if (hasVNRegular) doc.font('vn-regular');
        else doc.font('Helvetica');
        doc.fillColor('#1e293b')
          .fontSize(9)
          .text(String(cell || ''), startX + colIdx * colWidth + 10, y + 6, {
            width: colWidth - 20,
            align: colIdx === headers.length - 1 ? 'right' : 'left'
          });
      });
      
      doc.strokeColor('#e2e8f0')
        .lineWidth(0.5)
        .moveTo(startX, y + rowHeight)
        .lineTo(startX + pageWidth, y + rowHeight)
        .stroke();
      
      y += rowHeight;
      
      // Check if need new page
      if (y > doc.page.height - 100) {
        renderFooter(pageCount);
        
        doc.addPage();
        pageCount++;
        y = doc.page.margins.top + 20;
        
        // Redraw header on new page
        const headerHeight = 80;
        const infoBoxHeight = 35;
        const headerStartY = doc.page.margins.top;
        
        doc.rect(startX, headerStartY, pageWidth, headerHeight)
          .fill('#1e40af');
        
        if (hasVNBold) doc.font('vn-bold');
        else doc.font('Helvetica-Bold');
        doc.fillColor('#ffffff')
          .fontSize(24)
          .text('Smart School Bus', startX + 20, headerStartY + 15, { width: pageWidth - 40 });
        
        if (hasVNRegular) doc.font('vn-regular');
        else doc.font('Helvetica');
        doc.fillColor('#e0e7ff')
          .fontSize(12)
          .text('Hệ thống quản lý xe buýt trường học thông minh', startX + 20, headerStartY + 45, { width: pageWidth - 40 });
        
        const typeLabels = {
          overview: 'Tổng quan',
          trips: 'Chuyến đi',
          buses: 'Xe buýt',
          drivers: 'Tài xế',
          students: 'Học sinh',
          incidents: 'Sự cố'
        };
        const typeLabel = typeLabels[type] || type.toUpperCase();
        const badgeWidth = doc.widthOfString(typeLabel, { fontSize: 10 }) + 16;
        doc.rect(startX + pageWidth - badgeWidth - 20, headerStartY + 15, badgeWidth, 25)
          .fill('#3b82f6');
        doc.fillColor('#ffffff')
          .fontSize(10)
          .text(typeLabel, startX + pageWidth - badgeWidth - 12, headerStartY + 22, { width: badgeWidth - 8, align: 'center' });
        
        const infoBoxY = headerStartY + headerHeight + 10;
        doc.rect(startX, infoBoxY, pageWidth, infoBoxHeight)
          .fill('#f1f5f9')
          .stroke('#cbd5e1');
        
        if (hasVNRegular) doc.font('vn-regular');
        else doc.font('Helvetica');
        doc.fillColor('#475569')
          .fontSize(9)
          .text(`Khoảng thời gian: ${dateFrom} - ${dateTo}`, startX + 15, infoBoxY + 12, { width: pageWidth / 2 });
        
        const generatedDate = new Date().toLocaleString('vi-VN', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        doc.text(`Tạo lúc: ${generatedDate}`, startX + pageWidth - 150, infoBoxY + 12, { width: 140, align: 'right' });
        
        // Redraw table header
        doc.rect(startX, y, pageWidth, 30)
          .fill('#1e40af');
        
        headers.forEach((header, idx) => {
          if (hasVNBold) doc.font('vn-bold');
          else doc.font('Helvetica-Bold');
          doc.fillColor('#ffffff')
            .fontSize(10)
            .text(header, startX + idx * colWidth + 10, y + 8, { 
              width: colWidth - 20,
              align: idx === headers.length - 1 ? 'right' : 'left'
            });
        });
        
        y += 30;
      }
    });
    
    doc.strokeColor('#cbd5e1')
      .lineWidth(1)
      .rect(startX, startY, pageWidth, y - startY)
      .stroke();
    
    return y + 15;
  }
  
  // Footer on each page
  function renderFooter(pageNum) {
    try {
      const footerY = doc.page.height - 40;
      doc.strokeColor('#e2e8f0')
        .lineWidth(0.5)
        .moveTo(startX, footerY - 10)
        .lineTo(startX + pageWidth, footerY - 10)
        .stroke();
      
      if (hasVNRegular) doc.font('vn-regular');
      else doc.font('Helvetica');
      doc.fillColor('#94a3b8')
        .fontSize(8)
        .text('Smart School Bus Tracking System', startX, footerY, { width: pageWidth / 2 });
      
      doc.text(`Trang ${pageNum}`, startX + pageWidth - 50, footerY, { width: 50, align: 'right' });
    } catch (err) {
      console.warn("Error rendering footer:", err.message);
    }
  }
  
  // Helper function để render stat card
  function renderStatCard(label, value, color = '#3b82f6', x, y, width) {
    const cardHeight = 50;
    doc.rect(x, y, width, cardHeight)
      .fill(color);
    
    if (hasVNRegular) doc.font('vn-regular');
    else doc.font('Helvetica');
    doc.fillColor('#ffffff')
      .fontSize(9)
      .text(label, x + 12, y + 8, { width: width - 24 });
    
    if (hasVNBold) doc.font('vn-bold');
    else doc.font('Helvetica-Bold');
    doc.fillColor('#ffffff')
      .fontSize(18)
      .text(String(value), x + 12, y + 22, { width: width - 24 });
  }
  
  // Render header
  renderHeader();
  
  // Content rendering based on type (same logic as export method)
  if (type === 'overview') {
    // Stats cards
    const cardWidth = (pageWidth - 20) / 3;
    const statsY = currentY;
    
    renderStatCard('Tổng số xe', data?.buses?.totalBuses ?? 0, '#3b82f6', startX, statsY, cardWidth);
    renderStatCard('Xe hoạt động', data?.buses?.active ?? 0, '#10b981', startX + cardWidth + 10, statsY, cardWidth);
    renderStatCard('Tổng chuyến', data?.trips?.totalTrips ?? 0, '#f59e0b', startX + (cardWidth + 10) * 2, statsY, cardWidth);
    
    currentY += 70;
    
    // Additional stats
    const statsRows = [
      ['Chuyến hoàn thành', String(data?.trips?.completedTrips ?? 0)],
      ['Chuyến trễ', String(data?.trips?.delayedTrips ?? 0)],
      ['Chuyến hủy', String(data?.trips?.cancelledTrips ?? 0)],
    ];
    
    const tableHeaders = ['Chỉ số', 'Giá trị'];
    const tableRows = statsRows;
    currentY = renderTable(tableHeaders, tableRows, currentY);
    
  } else if (type === 'trips') {
    const trips = Array.isArray(data.trips) ? data.trips : [];
    if (trips.length > 0) {
      const headers = ['Mã chuyến', 'Ngày chạy', 'Tuyến', 'Biển số', 'Tài xế', 'Trạng thái'];
      const rows = trips.slice(0, 50).map(trip => [
        trip.maChuyen || trip.id || '',
        trip.ngayChay || '',
        trip.tenTuyen || '',
        trip.bienSoXe || '',
        trip.tenTaiXe || '',
        trip.trangThai || ''
      ]);
      currentY = renderTable(headers, rows, currentY);
      
      if (trips.length > 50) {
        if (hasVNRegular) doc.font('vn-regular');
        else doc.font('Helvetica');
        doc.fillColor('#64748b')
          .fontSize(9)
          .text(`... và ${trips.length - 50} bản ghi khác`, startX, currentY, { width: pageWidth });
        currentY += 15;
      }
    } else {
      if (hasVNRegular) doc.font('vn-regular');
      else doc.font('Helvetica');
      doc.fillColor('#64748b')
        .fontSize(12)
        .text('Không có dữ liệu chuyến đi trong khoảng thời gian này', startX, currentY, { width: pageWidth });
      currentY += 30;
    }
    
  } else if (type === 'buses') {
    const buses = Array.isArray(data.buses) ? data.buses : [];
    if (buses.length > 0) {
      const headers = ['Mã xe', 'Biển số', 'Dòng xe', 'Sức chứa', 'Trạng thái'];
      const rows = buses.map(bus => [
        bus.maXe || bus.id || '',
        bus.bienSoXe || '',
        bus.dongXe || '',
        String(bus.sucChua || 0),
        bus.trangThai || ''
      ]);
      currentY = renderTable(headers, rows, currentY);
    } else {
      if (hasVNRegular) doc.font('vn-regular');
      else doc.font('Helvetica');
      doc.fillColor('#64748b')
        .fontSize(12)
        .text('Không có dữ liệu xe buýt', startX, currentY, { width: pageWidth });
      currentY += 30;
    }
    
  } else if (type === 'drivers') {
    const drivers = Array.isArray(data.drivers) ? data.drivers : [];
    if (drivers.length > 0) {
      const headers = ['Mã tài xế', 'Họ tên', 'Số bằng lái', 'SĐT', 'Trạng thái'];
      const rows = drivers.map(driver => [
        driver.maTaiXe || driver.id || '',
        driver.hoTen || driver.tenTaiXe || '',
        driver.soBangLai || '',
        driver.soDienThoai || '',
        driver.trangThai || ''
      ]);
      currentY = renderTable(headers, rows, currentY);
    } else {
      if (hasVNRegular) doc.font('vn-regular');
      else doc.font('Helvetica');
      doc.fillColor('#64748b')
        .fontSize(12)
        .text('Không có dữ liệu tài xế', startX, currentY, { width: pageWidth });
      currentY += 30;
    }
    
  } else if (type === 'students') {
    const students = Array.isArray(data.students) ? data.students : [];
    if (students.length > 0) {
      const headers = ['Mã học sinh', 'Họ tên', 'Lớp', 'Phụ huynh', 'SĐT PH'];
      const rows = students.slice(0, 50).map(student => [
        student.maHocSinh || student.id || '',
        student.hoTen || '',
        student.lop || '',
        student.tenPhuHuynh || '',
        student.sdtPhuHuynh || ''
      ]);
      currentY = renderTable(headers, rows, currentY);
      
      if (students.length > 50) {
        if (hasVNRegular) doc.font('vn-regular');
        else doc.font('Helvetica');
        doc.fillColor('#64748b')
          .fontSize(9)
          .text(`... và ${students.length - 50} bản ghi khác`, startX, currentY, { width: pageWidth });
        currentY += 15;
      }
    } else {
      if (hasVNRegular) doc.font('vn-regular');
      else doc.font('Helvetica');
      doc.fillColor('#64748b')
        .fontSize(12)
        .text('Không có dữ liệu học sinh', startX, currentY, { width: pageWidth });
      currentY += 30;
    }
    
  } else if (type === 'incidents') {
    const incidents = Array.isArray(data.incidents) ? data.incidents : [];
    if (incidents.length > 0) {
      const headers = ['Mã sự cố', 'Loại', 'Mức độ', 'Mô tả', 'Ngày', 'Chuyến'];
      const rows = incidents.slice(0, 50).map(incident => [
        incident.maSuCo || incident.id || '',
        incident.loaiSuCo || '',
        incident.mucDo || '',
        (incident.moTa || '').substring(0, 30) + (incident.moTa?.length > 30 ? '...' : ''),
        incident.ngayTao || incident.createdAt || '',
        incident.maChuyen || ''
      ]);
      currentY = renderTable(headers, rows, currentY);
      
      if (incidents.length > 50) {
        if (hasVNRegular) doc.font('vn-regular');
        else doc.font('Helvetica');
        doc.fillColor('#64748b')
          .fontSize(9)
          .text(`... và ${incidents.length - 50} bản ghi khác`, startX, currentY, { width: pageWidth });
        currentY += 15;
      }
    } else {
      if (hasVNRegular) doc.font('vn-regular');
      else doc.font('Helvetica');
      doc.fillColor('#64748b')
        .fontSize(12)
        .text('Không có dữ liệu sự cố trong khoảng thời gian này', startX, currentY, { width: pageWidth });
      currentY += 30;
    }
  }
  
  // Render footer on last page
  renderFooter(pageCount);
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

      // Extract filters from query params (filter_xxx)
      const filters = {};
      Object.keys(req.query).forEach(key => {
        if (key.startsWith('filter_')) {
          const filterKey = key.replace('filter_', '');
          filters[filterKey] = req.query[key];
        }
      });

      // Lấy dữ liệu dựa trên type
      let data = {};
      let fileName = `report_${type}_${dateFrom}_${dateTo}`;
      data = await buildDataByType(type, dateFrom, dateTo, filters);

      // Xuất Excel dạng XLSX với thiết kế hiện đại
      if (format === "excel" || format === "xlsx") {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Smart School Bus System";
        workbook.created = new Date();
        workbook.modified = new Date();
        
        const sheet = workbook.addWorksheet("Báo cáo");
        
        // Helper để style header row
        const styleHeaderRow = (row) => {
          row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1e40af" }, // Blue
          };
          row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          row.border = {
            top: { style: "thin", color: { argb: "FF1e3a8a" } },
            bottom: { style: "thin", color: { argb: "FF1e3a8a" } },
            left: { style: "thin", color: { argb: "FF1e3a8a" } },
            right: { style: "thin", color: { argb: "FF1e3a8a" } },
          };
          row.height = 30;
        };
        
        // Helper để style data rows
        const styleDataRow = (row, isEven) => {
          row.font = { size: 10 };
          if (isEven) {
            row.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8FAFC" }, // Light gray
            };
          }
          row.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
          row.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
          row.height = 20;
        };
        
        // Header section
        const typeLabels = {
          overview: "Tổng quan",
          trips: "Chuyến đi",
          buses: "Xe buýt",
          drivers: "Tài xế",
          students: "Học sinh",
          incidents: "Sự cố",
        };
        const typeLabel = typeLabels[type] || type.toUpperCase();
        
        // Title row
        const titleRow = sheet.addRow(["Smart School Bus - Báo cáo " + typeLabel]);
        titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: "FF1e40af" } };
        titleRow.getCell(1).alignment = { horizontal: "center" };
        sheet.mergeCells(1, 1, 1, 8);
        sheet.addRow([]);
        
        // Info rows
        const infoRow1 = sheet.addRow(["Khoảng thời gian:", `${dateFrom} → ${dateTo}`]);
        infoRow1.getCell(1).font = { bold: true };
        infoRow1.getCell(2).font = { size: 11 };
        sheet.mergeCells(3, 1, 3, 8);
        
        const generatedDate = new Date().toLocaleString("vi-VN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
        const infoRow2 = sheet.addRow(["Tạo lúc:", generatedDate]);
        infoRow2.getCell(1).font = { bold: true };
        infoRow2.getCell(2).font = { size: 11 };
        sheet.mergeCells(4, 1, 4, 8);
        
        sheet.addRow([]);
        
        // Data table
        let headerRow;
        let dataRows = [];
        
        if (type === "trips") {
          headerRow = sheet.addRow([
            "Mã chuyến",
            "Ngày chạy",
            "Tuyến đường",
            "Biển số xe",
            "Tài xế",
            "Trạng thái",
            "Giờ khởi hành",
            "Bắt đầu thực tế",
          ]);
          sheet.columns = [
            { width: 12 },
            { width: 12 },
            { width: 22 },
            { width: 14 },
            { width: 18 },
            { width: 16 },
            { width: 16 },
            { width: 18 },
          ];
          (data.trips || []).forEach((r) => {
            dataRows.push(sheet.addRow([
              r.maChuyen || r.id || "",
              r.ngayChay || "",
              r.tenTuyen || "",
              r.bienSoXe || "",
              r.tenTaiXe || "",
              r.trangThai || "",
              r.gioKhoiHanh || "",
              r.gioBatDauThucTe || "",
            ]));
          });
        } else if (type === "buses") {
          headerRow = sheet.addRow(["Mã xe", "Biển số", "Dòng xe", "Sức chứa", "Trạng thái"]);
          sheet.columns = [{ width: 10 }, { width: 14 }, { width: 16 }, { width: 10 }, { width: 14 }];
          (data.buses || []).forEach((r) => {
            dataRows.push(sheet.addRow([
              r.maXe || r.id || "",
              r.bienSoXe || "",
              r.dongXe || "",
              r.sucChua || 0,
              r.trangThai || "",
            ]));
          });
        } else if (type === "drivers") {
          headerRow = sheet.addRow(["Mã tài xế", "Họ tên", "Số bằng lái", "SĐT", "Trạng thái"]);
          sheet.columns = [{ width: 10 }, { width: 20 }, { width: 16 }, { width: 14 }, { width: 14 }];
          (data.drivers || []).forEach((r) => {
            dataRows.push(sheet.addRow([
              r.maTaiXe || r.id || "",
              r.hoTen || r.tenTaiXe || "",
              r.soBangLai || "",
              r.soDienThoai || "",
              r.trangThai || "",
            ]));
          });
        } else if (type === "students") {
          headerRow = sheet.addRow(["Mã học sinh", "Họ tên", "Lớp", "Phụ huynh", "SĐT PH"]);
          sheet.columns = [{ width: 12 }, { width: 22 }, { width: 8 }, { width: 20 }, { width: 14 }];
          (data.students || []).forEach((r) => {
            dataRows.push(sheet.addRow([
              r.maHocSinh || r.id || "",
              r.hoTen || "",
              r.lop || "",
              r.tenPhuHuynh || "",
              r.sdtPhuHuynh || "",
            ]));
          });
        } else if (type === "incidents") {
          headerRow = sheet.addRow(["Mã sự cố", "Loại", "Mức độ", "Mô tả", "Ngày", "Chuyến"]);
          sheet.columns = [{ width: 10 }, { width: 16 }, { width: 12 }, { width: 40 }, { width: 18 }, { width: 10 }];
          (data.incidents || []).forEach((r) => {
            dataRows.push(sheet.addRow([
              r.maSuCo || r.id || "",
              r.loaiSuCo || "",
              r.mucDo || "",
              r.moTa || "",
              r.ngayTao || r.createdAt || "",
              r.maChuyen || "",
            ]));
          });
        } else {
          // Overview
          headerRow = sheet.addRow(["Chỉ số", "Giá trị"]);
          sheet.columns = [{ width: 26 }, { width: 22 }];
          dataRows.push(sheet.addRow({ label: "Thời gian", value: `${data.period?.from || ""} → ${data.period?.to || ""}` }));
          dataRows.push(sheet.addRow({ label: "Tổng số xe", value: data.buses?.totalBuses || 0 }));
          dataRows.push(sheet.addRow({ label: "Xe hoạt động", value: data.buses?.active || 0 }));
          dataRows.push(sheet.addRow({ label: "Tổng chuyến", value: data.trips?.totalTrips || 0 }));
          dataRows.push(sheet.addRow({ label: "Chuyến hoàn thành", value: data.trips?.completedTrips || 0 }));
          dataRows.push(sheet.addRow({ label: "Chuyến trễ", value: data.trips?.delayedTrips || 0 }));
        }
        
        // Style header row
        styleHeaderRow(headerRow);
        
        // Style data rows
        dataRows.forEach((row, idx) => {
          styleDataRow(row, idx % 2 === 0);
        });
        
        // Footer
        sheet.addRow([]);
        const footerRow = sheet.addRow(["Smart School Bus Tracking System - Tạo bởi hệ thống tự động"]);
        footerRow.getCell(1).font = { size: 9, color: { argb: "FF94A3B8" }, italic: true };
        footerRow.getCell(1).alignment = { horizontal: "right" };
        sheet.mergeCells(headerRow.number + dataRows.length + 2, 1, headerRow.number + dataRows.length + 2, 8);

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}.xlsx"`);
        await workbook.xlsx.write(res);
        return res.end();
      }

      // Xuất CSV với format đẹp
      if (format === "csv") {
        const csv = convertToCSV(data, type, dateFrom, dateTo);
        fileName += ".csv";
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        // Ensure BOM + CRLF for Excel compatibility
        const out = "\ufeff" + csv.replace(/\n/g, "\r\n");
        return res.end(out, "utf8");
      }

      // Xuất PDF với thiết kế hiện đại
      if (format === "pdf") {
        try {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}.pdf"`);
          
          // Pipe PDF to response first
          const doc = new PDFDocument({ 
            margin: 40,
            size: 'A4',
            info: {
              Title: `Báo cáo ${type} - Smart School Bus`,
              Author: 'Smart School Bus System',
              Subject: `Báo cáo ${type}`,
              Creator: 'Smart School Bus Tracking System'
            }
          });
          
          // Handle errors during PDF generation
          doc.on('error', (err) => {
            console.error("PDF generation error:", err);
            if (!res.headersSent) {
              res.status(500).json({ success: false, message: "Lỗi khi tạo file PDF" });
            }
          });
          
          // Pipe to response before adding content
          doc.pipe(res);
        
        // Try to register Vietnamese-capable fonts from Windows or custom fonts
        let hasVNRegular = false;
        let hasVNBold = false;
        
        // Helper function to validate and register font
        function tryRegisterFont(fontName, fontPath) {
          try {
            if (!fs.existsSync(fontPath)) {
              return false;
            }
            
            // Check if file is valid (at least 1KB and has TTF header)
            const stats = fs.statSync(fontPath);
            if (stats.size < 1024) {
              console.warn(`⚠️  Font file too small: ${fontPath}`);
              return false;
            }
            
            // Try to read first bytes to check TTF header
            const buffer = fs.readFileSync(fontPath, { start: 0, end: 4 });
            const isValidTTF = buffer[0] === 0x00 && buffer[1] === 0x01 && buffer[2] === 0x00 && buffer[3] === 0x00 ||
                              buffer[0] === 0x4F && buffer[1] === 0x54 && buffer[2] === 0x54 && buffer[3] === 0x4F; // OTTF (OpenType)
            
            if (!isValidTTF) {
              // Still try to register, PDFKit might handle it
              console.warn(`⚠️  Font file may not be valid TTF: ${fontPath}`);
            }
            
            doc.registerFont(fontName, fontPath);
            return true;
          } catch (err) {
            console.warn(`⚠️  Failed to register font ${fontName} from ${fontPath}:`, err.message);
            return false;
          }
        }
        
        // List of Windows fonts that support Vietnamese
        const windowsFonts = {
          regular: [
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/tahoma.ttf",
            "C:/Windows/Fonts/segoeui.ttf",
            "C:/Windows/Fonts/calibri.ttf",
          ],
          bold: [
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/tahomabd.ttf",
            "C:/Windows/Fonts/segoeuib.ttf",
            "C:/Windows/Fonts/calibrib.ttf",
          ]
        };
        
        // Also check custom fonts directory
        const customFontsDir = path.resolve(path.join(__dirname, "../../assets/fonts"));
        const customFontRegular = path.join(customFontsDir, "NotoSans-Regular.ttf");
        const customFontBold = path.join(customFontsDir, "NotoSans-Bold.ttf");
        
        // Try custom fonts first
        if (tryRegisterFont("vn-regular", customFontRegular)) {
          hasVNRegular = true;
          console.log("✓ Vietnamese font (Regular) loaded from custom fonts");
        } else {
          // Try Windows fonts
          for (const fontPath of windowsFonts.regular) {
            if (tryRegisterFont("vn-regular", fontPath)) {
            hasVNRegular = true;
              console.log(`✓ Vietnamese font (Regular) loaded from Windows: ${path.basename(fontPath)}`);
              break;
            }
          }
        }
        
        if (tryRegisterFont("vn-bold", customFontBold)) {
          hasVNBold = true;
          console.log("✓ Vietnamese font (Bold) loaded from custom fonts");
        } else {
          // Try Windows fonts
          for (const fontPath of windowsFonts.bold) {
            if (tryRegisterFont("vn-bold", fontPath)) {
            hasVNBold = true;
              console.log(`✓ Vietnamese font (Bold) loaded from Windows: ${path.basename(fontPath)}`);
              break;
            }
          }
        }
        
        if (!hasVNRegular || !hasVNBold) {
          console.warn("⚠️  Some Vietnamese fonts not found. PDF may display Vietnamese incorrectly.");
          console.warn("💡 Tip: Install Arial or Tahoma fonts, or run 'npm run download-fonts'");
        }

        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const startX = doc.page.margins.left;
        let currentY = doc.page.margins.top;
        
        // Track page count - must be declared before helper functions that use it
        let pageCount = 1;

        // Helper function để render header đẹp
        function renderHeader() {
          // Header background với gradient effect (simulated)
          const headerHeight = 80;
          doc.rect(startX, currentY, pageWidth, headerHeight)
            .fill('#1e40af'); // Blue gradient base
          
          // Title
          if (hasVNBold) doc.font('vn-bold');
          else doc.font('Helvetica-Bold');
          doc.fillColor('#ffffff')
            .fontSize(24)
            .text('Smart School Bus', startX + 20, currentY + 15, { width: pageWidth - 40 });
          
          // Subtitle
          if (hasVNRegular) doc.font('vn-regular');
          else doc.font('Helvetica');
          doc.fillColor('#e0e7ff')
            .fontSize(12)
            .text('Hệ thống quản lý xe buýt trường học', startX + 20, currentY + 40, { width: pageWidth - 40 });
          
          // Report type badge
          const typeLabels = {
            overview: 'Tổng quan',
            trips: 'Chuyến đi',
            buses: 'Xe buýt',
            drivers: 'Tài xế',
            students: 'Học sinh',
            incidents: 'Sự cố'
          };
          const typeLabel = typeLabels[type] || type.toUpperCase();
          // Set font before calculating width
          if (hasVNRegular) doc.font('vn-regular');
          else doc.font('Helvetica');
          const badgeWidth = doc.widthOfString(typeLabel, { fontSize: 10 }) + 16;
          doc.rect(startX + pageWidth - badgeWidth - 20, currentY + 15, badgeWidth, 20)
            .fill('#3b82f6');
          doc.fillColor('#ffffff')
            .fontSize(10)
            .text(typeLabel, startX + pageWidth - badgeWidth - 12, currentY + 20, { width: badgeWidth - 8 });
          
          currentY += headerHeight + 20;
          
          // Date range info box
          const infoBoxY = currentY;
          const infoBoxHeight = 35;
          doc.rect(startX, infoBoxY, pageWidth, infoBoxHeight)
            .fill('#f8fafc')
            .stroke('#e2e8f0');
          
          if (hasVNRegular) doc.font('vn-regular');
          else doc.font('Helvetica');
          doc.fillColor('#475569')
            .fontSize(9)
            .text('Khoảng thời gian:', startX + 15, infoBoxY + 8);
          
          if (hasVNBold) doc.font('vn-bold');
          else doc.font('Helvetica-Bold');
          doc.fillColor('#1e293b')
            .fontSize(11)
            .text(`${dateFrom} → ${dateTo}`, startX + 15, infoBoxY + 20);
          
          const generatedDate = new Date().toLocaleString('vi-VN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          if (hasVNRegular) doc.font('vn-regular');
          else doc.font('Helvetica');
          doc.fillColor('#64748b')
            .fontSize(8)
            .text(`Tạo lúc: ${generatedDate}`, startX + pageWidth - 150, infoBoxY + 20, { width: 140, align: 'right' });
          
          currentY += infoBoxHeight + 25;
        }

        // Helper function để render stat card
        function renderStatCard(label, value, color = '#3b82f6', x, y, width) {
          const cardHeight = 50;
          doc.rect(x, y, width, cardHeight)
            .fill(color);
          
          if (hasVNRegular) doc.font('vn-regular');
          else doc.font('Helvetica');
          doc.fillColor('#ffffff')
            .fontSize(9)
            .text(label, x + 12, y + 8, { width: width - 24 });
          
          if (hasVNBold) doc.font('vn-bold');
          else doc.font('Helvetica-Bold');
          doc.fillColor('#ffffff')
            .fontSize(18)
            .text(String(value), x + 12, y + 22, { width: width - 24 });
        }

        // Helper function để render table
        function renderTable(headers, rows, startY) {
          const colCount = headers.length;
          const colWidth = pageWidth / colCount;
          const rowHeight = 25;
          const headerHeight = 30;
          let y = startY;
          
          // Table header
          doc.rect(startX, y, pageWidth, headerHeight)
            .fill('#1e40af');
          
          headers.forEach((header, idx) => {
            if (hasVNBold) doc.font('vn-bold');
            else doc.font('Helvetica-Bold');
            doc.fillColor('#ffffff')
              .fontSize(10)
              .text(header, startX + idx * colWidth + 10, y + 8, { 
                width: colWidth - 20,
                align: idx === headers.length - 1 ? 'right' : 'left'
              });
          });
          
          y += headerHeight;
          
          // Table rows
          rows.forEach((row, rowIdx) => {
            const isEven = rowIdx % 2 === 0;
            if (isEven) {
              doc.rect(startX, y, pageWidth, rowHeight)
                .fill('#f8fafc');
            }
            
            row.forEach((cell, colIdx) => {
              if (hasVNRegular) doc.font('vn-regular');
              else doc.font('Helvetica');
              doc.fillColor('#1e293b')
                .fontSize(9)
                .text(String(cell || ''), startX + colIdx * colWidth + 10, y + 6, {
                  width: colWidth - 20,
                  align: colIdx === headers.length - 1 ? 'right' : 'left'
                });
            });
            
            // Row border
            doc.strokeColor('#e2e8f0')
              .lineWidth(0.5)
              .moveTo(startX, y + rowHeight)
              .lineTo(startX + pageWidth, y + rowHeight)
              .stroke();
            
            y += rowHeight;
            
            // Check if need new page
            if (y > doc.page.height - 100) {
              // Render footer on current page before adding new page
              renderFooter(pageCount);
              
              doc.addPage();
              pageCount++;
              y = doc.page.margins.top + 20;
              // Redraw header on new page
              const headerHeight = 80;
              const infoBoxHeight = 35;
              const headerStartY = doc.page.margins.top;
              
              // Header background
              doc.rect(startX, headerStartY, pageWidth, headerHeight)
                .fill('#1e40af');
              
              if (hasVNBold) doc.font('vn-bold');
              else doc.font('Helvetica-Bold');
              doc.fillColor('#ffffff')
                .fontSize(24)
                .text('Smart School Bus', startX + 20, headerStartY + 15, { width: pageWidth - 40 });
              
              if (hasVNRegular) doc.font('vn-regular');
              else doc.font('Helvetica');
              doc.fillColor('#e0e7ff')
                .fontSize(12)
                .text('Hệ thống quản lý xe buýt trường học', startX + 20, headerStartY + 40, { width: pageWidth - 40 });
              
              const typeLabels = {
                overview: 'Tổng quan',
                trips: 'Chuyến đi',
                buses: 'Xe buýt',
                drivers: 'Tài xế',
                students: 'Học sinh',
                incidents: 'Sự cố'
              };
              const typeLabel = typeLabels[type] || type.toUpperCase();
              const badgeWidth = doc.widthOfString(typeLabel, { fontSize: 10 }) + 16;
              doc.rect(startX + pageWidth - badgeWidth - 20, headerStartY + 15, badgeWidth, 20)
                .fill('#3b82f6');
              doc.fillColor('#ffffff')
                .fontSize(10)
                .text(typeLabel, startX + pageWidth - badgeWidth - 12, headerStartY + 20, { width: badgeWidth - 8 });
              
              // Redraw table header
              doc.rect(startX, y, pageWidth, 30)
                .fill('#1e40af');
              
              headers.forEach((header, idx) => {
                if (hasVNBold) doc.font('vn-bold');
                else doc.font('Helvetica-Bold');
                doc.fillColor('#ffffff')
                  .fontSize(10)
                  .text(header, startX + idx * colWidth + 10, y + 8, { 
                    width: colWidth - 20,
                    align: idx === headers.length - 1 ? 'right' : 'left'
                  });
              });
              
              y += 30;
            }
          });
          
          // Table border
          doc.strokeColor('#cbd5e1')
            .lineWidth(1)
            .rect(startX, startY, pageWidth, y - startY)
            .stroke();
          
          return y + 15;
        }

        // Render header
        renderHeader();

        // Content rendering based on type
        if (type === 'overview') {
          // Stats cards
          const cardWidth = (pageWidth - 20) / 3;
          const statsY = currentY;
          
          renderStatCard('Tổng số xe', data?.buses?.totalBuses ?? 0, '#3b82f6', startX, statsY, cardWidth);
          renderStatCard('Xe hoạt động', data?.buses?.active ?? 0, '#10b981', startX + cardWidth + 10, statsY, cardWidth);
          renderStatCard('Tổng chuyến', data?.trips?.totalTrips ?? 0, '#f59e0b', startX + (cardWidth + 10) * 2, statsY, cardWidth);
          
          currentY += 70;
          
          // Additional stats
          const statsRows = [
            ['Chuyến hoàn thành', String(data?.trips?.completedTrips ?? 0)],
            ['Chuyến trễ', String(data?.trips?.delayedTrips ?? 0)],
            ['Chuyến hủy', String(data?.trips?.cancelledTrips ?? 0)],
          ];
          
          const tableHeaders = ['Chỉ số', 'Giá trị'];
          const tableRows = statsRows;
          currentY = renderTable(tableHeaders, tableRows, currentY);
          
        } else if (type === 'trips') {
          const trips = Array.isArray(data.trips) ? data.trips : [];
          if (trips.length > 0) {
            const headers = ['Mã chuyến', 'Ngày chạy', 'Tuyến', 'Biển số', 'Tài xế', 'Trạng thái'];
            const rows = trips.slice(0, 50).map(trip => [
              trip.maChuyen || trip.id || '',
              trip.ngayChay || '',
              trip.tenTuyen || '',
              trip.bienSoXe || '',
              trip.tenTaiXe || '',
              trip.trangThai || ''
            ]);
            currentY = renderTable(headers, rows, currentY);
            
            if (trips.length > 50) {
              if (hasVNRegular) doc.font('vn-regular');
              else doc.font('Helvetica');
              doc.fillColor('#64748b')
                .fontSize(9)
                .text(`... và ${trips.length - 50} bản ghi khác`, startX, currentY, { width: pageWidth });
              currentY += 15;
            }
          } else {
            if (hasVNRegular) doc.font('vn-regular');
            else doc.font('Helvetica');
            doc.fillColor('#64748b')
              .fontSize(12)
              .text('Không có dữ liệu chuyến đi trong khoảng thời gian này', startX, currentY, { width: pageWidth });
            currentY += 30;
          }
          
        } else if (type === 'buses') {
          const buses = Array.isArray(data.buses) ? data.buses : [];
          if (buses.length > 0) {
            const headers = ['Mã xe', 'Biển số', 'Dòng xe', 'Sức chứa', 'Trạng thái'];
            const rows = buses.map(bus => [
              bus.maXe || bus.id || '',
              bus.bienSoXe || '',
              bus.dongXe || '',
              String(bus.sucChua || 0),
              bus.trangThai || ''
            ]);
            currentY = renderTable(headers, rows, currentY);
          } else {
            if (hasVNRegular) doc.font('vn-regular');
            else doc.font('Helvetica');
            doc.fillColor('#64748b')
              .fontSize(12)
              .text('Không có dữ liệu xe buýt', startX, currentY, { width: pageWidth });
            currentY += 30;
          }
          
        } else if (type === 'drivers') {
          const drivers = Array.isArray(data.drivers) ? data.drivers : [];
          if (drivers.length > 0) {
            const headers = ['Mã tài xế', 'Họ tên', 'Số bằng lái', 'SĐT', 'Trạng thái'];
            const rows = drivers.map(driver => [
              driver.maTaiXe || driver.id || '',
              driver.hoTen || driver.tenTaiXe || '',
              driver.soBangLai || '',
              driver.soDienThoai || '',
              driver.trangThai || ''
            ]);
            currentY = renderTable(headers, rows, currentY);
          } else {
            if (hasVNRegular) doc.font('vn-regular');
            else doc.font('Helvetica');
            doc.fillColor('#64748b')
              .fontSize(12)
              .text('Không có dữ liệu tài xế', startX, currentY, { width: pageWidth });
            currentY += 30;
          }
          
        } else if (type === 'students') {
          const students = Array.isArray(data.students) ? data.students : [];
          if (students.length > 0) {
            const headers = ['Mã học sinh', 'Họ tên', 'Lớp', 'Phụ huynh', 'SĐT PH'];
            const rows = students.slice(0, 50).map(student => [
              student.maHocSinh || student.id || '',
              student.hoTen || '',
              student.lop || '',
              student.tenPhuHuynh || '',
              student.sdtPhuHuynh || ''
            ]);
            currentY = renderTable(headers, rows, currentY);
            
            if (students.length > 50) {
              if (hasVNRegular) doc.font('vn-regular');
              else doc.font('Helvetica');
              doc.fillColor('#64748b')
                .fontSize(9)
                .text(`... và ${students.length - 50} bản ghi khác`, startX, currentY, { width: pageWidth });
              currentY += 15;
            }
        } else {
            if (hasVNRegular) doc.font('vn-regular');
            else doc.font('Helvetica');
            doc.fillColor('#64748b')
              .fontSize(12)
              .text('Không có dữ liệu học sinh', startX, currentY, { width: pageWidth });
            currentY += 30;
          }
          
        } else if (type === 'incidents') {
          const incidents = Array.isArray(data.incidents) ? data.incidents : [];
          if (incidents.length > 0) {
            const headers = ['Mã sự cố', 'Loại', 'Mức độ', 'Mô tả', 'Ngày', 'Chuyến'];
            const rows = incidents.slice(0, 50).map(incident => [
              incident.maSuCo || incident.id || '',
              incident.loaiSuCo || '',
              incident.mucDo || '',
              (incident.moTa || '').substring(0, 30) + (incident.moTa?.length > 30 ? '...' : ''),
              incident.ngayTao || incident.createdAt || '',
              incident.maChuyen || ''
            ]);
            currentY = renderTable(headers, rows, currentY);
            
            if (incidents.length > 50) {
          if (hasVNRegular) doc.font('vn-regular');
              else doc.font('Helvetica');
              doc.fillColor('#64748b')
                .fontSize(9)
                .text(`... và ${incidents.length - 50} bản ghi khác`, startX, currentY, { width: pageWidth });
              currentY += 15;
            }
          } else {
            if (hasVNRegular) doc.font('vn-regular');
            else doc.font('Helvetica');
            doc.fillColor('#64748b')
              .fontSize(12)
              .text('Không có dữ liệu sự cố trong khoảng thời gian này', startX, currentY, { width: pageWidth });
            currentY += 30;
          }
        }

        // Footer on each page - render manually to avoid infinite loops
        function renderFooter(pageNum) {
          try {
            const footerY = doc.page.height - 40;
            doc.strokeColor('#e2e8f0')
              .lineWidth(0.5)
              .moveTo(startX, footerY - 10)
              .lineTo(startX + pageWidth, footerY - 10)
              .stroke();
            
        if (hasVNRegular) doc.font('vn-regular');
            else doc.font('Helvetica');
            doc.fillColor('#94a3b8')
              .fontSize(8)
              .text('Smart School Bus Tracking System', startX, footerY, { width: pageWidth / 2 });
            
            doc.text(`Trang ${pageNum}`, startX + pageWidth - 50, footerY, { width: 50, align: 'right' });
          } catch (err) {
            console.warn("Error rendering footer:", err.message);
          }
        }

        // Render footer on last page (before ending)
        renderFooter(pageCount);

        // End PDF document (response is already piped)
        doc.end();
        
        // Don't return anything, response is handled by pipe
        return;
        } catch (pdfError) {
          console.error("Error generating PDF:", pdfError);
          // Make sure to close the response if headers not sent
          if (!res.headersSent) {
            try {
              return res.status(500).json({ 
                success: false, 
                message: "Lỗi khi tạo file PDF: " + pdfError.message 
              });
            } catch (err) {
              console.error("Error sending error response:", err);
            }
          } else {
            // Headers already sent, try to end the response gracefully
            try {
              if (!res.writableEnded) {
                res.end();
              }
            } catch (err) {
              console.error("Error ending response:", err);
            }
          }
        }
      }

      return res.status(400).json({ success: false, message: "Định dạng xuất không hợp lệ" });
    } catch (error) {
      console.error("ReportsController.export error:", error);
      const status = error?.status || 500;
      const message = error?.status === 400 
        ? error?.message || "Tham số không hợp lệ"
        : "Không thể xuất báo cáo. Vui lòng thử lại";
      return res.status(status).json({
        success: false,
        message,
      });
    }
  }

  // GET /api/v1/reports/view?type=...&from=...&to=...&filter_xxx=...
  static async view(req, res) {
    try {
      const { type, from, to } = validateParams({ ...req.query, format: "csv" });
      const dateFrom = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const dateTo = to || new Date().toISOString().slice(0, 10);
      
      // Extract filters from query params (filter_xxx)
      const filters = {};
      Object.keys(req.query).forEach(key => {
        if (key.startsWith('filter_')) {
          const filterKey = key.replace('filter_', '');
          filters[filterKey] = req.query[key];
        }
      });
      
      const data = await buildDataByType(type, dateFrom, dateTo, filters);
      
      // Check if data is empty
      const hasData = checkHasData(data, type);
      if (!hasData) {
        return res.status(200).json({ 
          success: true, 
          data, 
          meta: { type, from: dateFrom, to: dateTo },
          message: "Không có dữ liệu trong khoảng thời gian này"
        });
      }
      
      return res.status(200).json({ success: true, data, meta: { type, from: dateFrom, to: dateTo } });
    } catch (error) {
      console.error("ReportsController.view error:", error);
      const status = error?.status || 500;
      const message = error?.status === 400 
        ? error?.message || "Tham số không hợp lệ"
        : "Lỗi server khi tải dữ liệu báo cáo";
      return res.status(status).json({ success: false, message });
    }
  }
  
  // Static method to generate PDF buffer (for email)
  static async generatePDFBuffer(type, dateFrom, dateTo, data, filters = {}) {
    return generatePDFBuffer(type, dateFrom, dateTo, data, filters);
  }
}

// Helper to check if report has data
function checkHasData(data, type) {
  if (!data) return false;
  if (type === "trips") return Array.isArray(data.trips) && data.trips.length > 0;
  if (type === "buses") return Array.isArray(data.buses) && data.buses.length > 0;
  if (type === "drivers") return Array.isArray(data.drivers) && data.drivers.length > 0;
  if (type === "students") return Array.isArray(data.students) && data.students.length > 0;
  if (type === "incidents") return Array.isArray(data.incidents) && data.incidents.length > 0;
  return false;
}

// Helper function để chuyển đổi data sang CSV với format đẹp
function convertToCSV(data, type, dateFrom, dateTo) {
  let csv = "";
  const headers = [];
  const rows = [];
  
  const typeLabels = {
    overview: "Tổng quan",
    trips: "Chuyến đi",
    buses: "Xe buýt",
    drivers: "Tài xế",
    students: "Học sinh",
    incidents: "Sự cố",
  };
  const typeLabel = typeLabels[type] || type.toUpperCase();
  const generatedDate = new Date().toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Header comment section
  csv += "# Smart School Bus - Báo cáo " + typeLabel + "\n";
  csv += `# Khoảng thời gian: ${dateFrom} → ${dateTo}\n`;
  csv += `# Tạo lúc: ${generatedDate}\n`;
  csv += "#\n";

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
  csv += "sep=,\n";
  // Tạo CSV từ headers và rows
  csv += headers.join(",") + "\n";
  rows.forEach((row) => {
    csv += row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",") + "\n";
  });
  
  // Footer comment
  csv += "#\n";
  csv += "# Smart School Bus Tracking System - Tạo bởi hệ thống tự động\n";

  // Trả về string (BOM sẽ được thêm khi gửi response)
  return csv;
}

export default ReportsController;
