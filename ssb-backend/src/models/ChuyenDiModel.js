import pool from "../config/db.js";

const ChuyenDiModel = {
  // Lấy tất cả chuyến đi
  async getAll(filters = {}) {
    let query = `
      SELECT 
        cd.*,
        lt.loaiChuyen,
        lt.gioKhoiHanh,
        lt.maTaiXe,
        lt.maTuyen,
        td.tenTuyen,
        xb.bienSoXe,
        nd.hoTen as tenTaiXe,
        -- Đếm số điểm dừng của route
        (SELECT COUNT(*) FROM route_stops WHERE route_id = lt.maTuyen) as soDiemDung,
        -- Đếm số học sinh trong chuyến đi
        (SELECT COUNT(*) FROM TrangThaiHocSinh WHERE maChuyen = cd.maChuyen) as soHocSinh
      FROM ChuyenDi cd
      INNER JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
      INNER JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
      INNER JOIN XeBuyt xb ON lt.maXe = xb.maXe
      INNER JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
      WHERE 1=1
    `;
    const params = [];

    if (filters.ngayChay) {
      // So khớp theo ngày, bỏ phần thời gian nếu có
      query += " AND DATE(cd.ngayChay) = DATE(?)";
      params.push(filters.ngayChay);
    }
    // Hỗ trợ lọc theo khoảng thời gian
    if (filters.from) {
      query += " AND DATE(cd.ngayChay) >= DATE(?)";
      params.push(filters.from);
    }
    if (filters.to) {
      query += " AND DATE(cd.ngayChay) <= DATE(?)";
      params.push(filters.to);
    }
    if (filters.trangThai) {
      query += " AND cd.trangThai = ?";
      params.push(filters.trangThai);
    }
    if (filters.maLichTrinh) {
      query += " AND cd.maLichTrinh = ?";
      params.push(filters.maLichTrinh);
    }
    if (filters.maTaiXe) {
      query += " AND lt.maTaiXe = ?";
      params.push(filters.maTaiXe);
    }
    if (filters.maXe) {
      query += " AND lt.maXe = ?";
      params.push(filters.maXe);
    }
    if (filters.maTuyen) {
      query += " AND lt.maTuyen = ?";
      params.push(filters.maTuyen);
    }

    query += " ORDER BY cd.ngayChay DESC, lt.gioKhoiHanh";

    const [rows] = await pool.query(query, params);
    return rows;
  },

  async getStats(ngayBatDau, ngayKetThuc, filters = {}) {
    let query = `
      SELECT
        COUNT(cd.maChuyen) AS totalTrips,
        
        SUM(CASE 
          WHEN cd.trangThai = 'hoan_thanh' THEN 1 ELSE 0 
        END) AS completedTrips,
        
        SUM(CASE 
          WHEN cd.trangThai = 'huy' THEN 1 ELSE 0  -- Sửa từ 'bi_huy' thành 'huy' nếu DB dùng 'huy'
        END) AS cancelledTrips,
        
        SUM(CASE 
          WHEN cd.trangThai = 'hoan_thanh' AND cd.gioBatDauThucTe > lt.gioKhoiHanh 
          THEN 1 ELSE 0 
        END) AS delayedTrips,
        
        SUM(CASE 
          WHEN cd.trangThai = 'hoan_thanh' AND cd.gioBatDauThucTe <= lt.gioKhoiHanh 
          THEN 1 ELSE 0 
        END) AS onTimeTrips,
        
        AVG(
          CASE 
            WHEN cd.trangThai = 'hoan_thanh' AND cd.gioBatDauThucTe IS NOT NULL AND cd.gioKetThucThucTe IS NOT NULL
            THEN TIME_TO_SEC(TIMEDIFF(cd.gioKetThucThucTe, cd.gioBatDauThucTe)) 
            ELSE NULL 
          END
        ) AS averageDurationInSeconds

      FROM ChuyenDi cd
      JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
      WHERE cd.ngayChay BETWEEN ? AND ?
    `;
    const params = [ngayBatDau, ngayKetThuc];

    // Apply filters
    if (filters.maTuyen) {
      query += " AND lt.maTuyen = ?";
      params.push(filters.maTuyen);
    }
    if (filters.maTaiXe) {
      query += " AND lt.maTaiXe = ?";
      params.push(filters.maTaiXe);
    }
    if (filters.maXe) {
      query += " AND lt.maXe = ?";
      params.push(filters.maXe);
    }

    const [rows] = await pool.query(query, params);

    // Nếu không có chuyến nào trong khoảng ngày, query có thể trả về nulls
    // Xử lý để đảm bảo trả về object với giá trị 0
    const result = rows[0];
    return {
      totalTrips: result.totalTrips || 0,
      completedTrips: result.completedTrips || 0,
      cancelledTrips: result.cancelledTrips || 0,
      delayedTrips: result.delayedTrips || 0,
      onTimeTrips: result.onTimeTrips || 0,
      averageDurationInSeconds: result.averageDurationInSeconds || 0,
    };
  },

  // Xu hướng theo ngày: tổng, đúng giờ, trễ
  async getDailyTrend(ngayBatDau, ngayKetThuc, filters = {}) {
    let query = `
      SELECT 
        DATE(cd.ngayChay) as date,
        COUNT(cd.maChuyen) AS total,
        SUM(CASE 
          WHEN cd.trangThai = 'hoan_thanh' AND cd.gioBatDauThucTe <= lt.gioKhoiHanh THEN 1 ELSE 0 
        END) AS onTime,
        SUM(CASE 
          WHEN cd.trangThai = 'hoan_thanh' AND cd.gioBatDauThucTe > lt.gioKhoiHanh THEN 1 ELSE 0 
        END) AS late
      FROM ChuyenDi cd
      JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
      WHERE cd.ngayChay BETWEEN ? AND ?
    `;
    const params = [ngayBatDau, ngayKetThuc];

    if (filters.maTuyen) {
      query += " AND lt.maTuyen = ?";
      params.push(filters.maTuyen);
    }
    if (filters.maTaiXe) {
      query += " AND lt.maTaiXe = ?";
      params.push(filters.maTaiXe);
    }
    if (filters.maXe) {
      query += " AND lt.maXe = ?";
      params.push(filters.maXe);
    }

    query += " GROUP BY DATE(cd.ngayChay) ORDER BY DATE(cd.ngayChay)";

    const [rows] = await pool.query(query, params);
    return rows.map(r => ({
      date: r.date,
      total: Number(r.total || 0),
      onTime: Number(r.onTime || 0),
      late: Number(r.late || 0),
    }));
  },

  // Sử dụng xe buýt theo khoảng ngày: số chuyến, ngày hoạt động, tỉ lệ on-time
  async getBusUtilization(ngayBatDau, ngayKetThuc, filters = {}) {
    const totalDays = (() => {
      const start = new Date(ngayBatDau + 'T00:00:00');
      const end = new Date(ngayKetThuc + 'T00:00:00');
      return Math.max(1, Math.round((end - start) / 86400000) + 1);
    })();

    // schedules: tổng số lịch trình gán cho xe (giả định mỗi lịch trình có thể chạy mỗi ngày)
    let query = `
      SELECT 
        xb.maXe,
        xb.bienSoXe,
        COUNT(DISTINCT cd.maChuyen) AS trips,
        SUM(CASE WHEN cd.trangThai = 'hoan_thanh' AND cd.gioBatDauThucTe <= lt.gioKhoiHanh THEN 1 ELSE 0 END) AS onTimeTrips,
        SUM(CASE WHEN cd.trangThai = 'hoan_thanh' AND cd.gioBatDauThucTe > lt.gioKhoiHanh THEN 1 ELSE 0 END) AS lateTrips,
        COUNT(DISTINCT DATE(cd.ngayChay)) AS activeDays,
        (SELECT COUNT(*) FROM LichTrinh lt2 WHERE lt2.maXe = xb.maXe) AS schedules
      FROM XeBuyt xb
      LEFT JOIN LichTrinh lt ON lt.maXe = xb.maXe
      LEFT JOIN ChuyenDi cd ON cd.maLichTrinh = lt.maLichTrinh AND cd.ngayChay BETWEEN ? AND ?
      WHERE 1=1
    `;
    const params = [ngayBatDau, ngayKetThuc];

    if (filters.maTuyen) {
      query += " AND lt.maTuyen = ?";
      params.push(filters.maTuyen);
    }
    if (filters.maTaiXe) {
      query += " AND lt.maTaiXe = ?";
      params.push(filters.maTaiXe);
    }
    if (filters.maXe) {
      query += " AND xb.maXe = ?";
      params.push(filters.maXe);
    }

    query += `
      GROUP BY xb.maXe, xb.bienSoXe
      ORDER BY trips DESC, xb.bienSoXe
    `;

    const [rows] = await pool.query(query, params);
    return rows.map(r => {
      const trips = Number(r.trips || 0);
      const activeDays = Number(r.activeDays || 0);
      const schedules = Number(r.schedules || 0);
      // utilization theo thực tế: trips / (schedules * totalDays) * 100
      const theoreticalMax = schedules * totalDays;
      const utilizationPercent = theoreticalMax > 0 ? Math.round((trips / theoreticalMax) * 100) : 0;
      const onTimeTrips = Number(r.onTimeTrips || 0);
      const lateTrips = Number(r.lateTrips || 0);
      const onTimeRate = (onTimeTrips + lateTrips) > 0 ? Math.round((onTimeTrips / (onTimeTrips + lateTrips)) * 100) : 0;
      return {
        maXe: r.maXe,
        bienSoXe: r.bienSoXe,
        trips,
        activeDays,
        schedules,
        theoreticalMax,
        utilizationPercent,
        utilization: utilizationPercent,
        onTimeRate,
        onTimeTrips,
        lateTrips,
      };
    });
  },

  // Lấy chuyến đi theo mã
  async getById(id) {
    const [rows] = await pool.query(
      `SELECT 
        cd.*,
        lt.loaiChuyen,
        lt.gioKhoiHanh,
        lt.maXe,
        lt.maTaiXe,
        td.tenTuyen,
        td.diemBatDau,
        td.diemKetThuc,
        xb.bienSoXe,
        xb.dongXe,
        nd.hoTen as tenTaiXe,
        nd.soDienThoai as sdtTaiXe
       FROM ChuyenDi cd
       INNER JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
       INNER JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
       INNER JOIN XeBuyt xb ON lt.maXe = xb.maXe
       INNER JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
       WHERE cd.maChuyen = ?`,
      [id]
    );
    return rows[0];
  },

  // Lấy chuyến đi theo tài xế và ngày
  async getByDriverAndDate(maTaiXe, ngayChay) {
    const [rows] = await pool.query(
      `SELECT 
        cd.*,
        lt.loaiChuyen,
        lt.gioKhoiHanh,
        td.tenTuyen,
        xb.bienSoXe
       FROM ChuyenDi cd
       INNER JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
       INNER JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
       INNER JOIN XeBuyt xb ON lt.maXe = xb.maXe
       WHERE lt.maTaiXe = ? AND cd.ngayChay = ?
       ORDER BY lt.gioKhoiHanh`,
      [maTaiXe, ngayChay]
    );
    return rows;
  },

  // Lấy lịch sử chuyến đi theo tài xế với filter (date range)
  async getByDriverId(maTaiXe, filters = {}) {
    let query = `
      SELECT 
        cd.*,
        lt.loaiChuyen,
        lt.gioKhoiHanh,
        td.tenTuyen,
        td.diemBatDau,
        td.diemKetThuc,
        xb.bienSoXe,
        xb.dongXe,
        COUNT(tth.maTrangThai) as soHocSinh,
        SUM(CASE WHEN tth.trangThai = 'vang' THEN 1 ELSE 0 END) as soVang
      FROM ChuyenDi cd
      INNER JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
      INNER JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
      INNER JOIN XeBuyt xb ON lt.maXe = xb.maXe
      LEFT JOIN TrangThaiHocSinh tth ON cd.maChuyen = tth.maChuyen
      WHERE lt.maTaiXe = ?
    `;
    const params = [maTaiXe];

    if (filters.from) {
      query += " AND cd.ngayChay >= ?";
      params.push(filters.from);
    }
    if (filters.to) {
      query += " AND cd.ngayChay <= ?";
      params.push(filters.to);
    }
    if (filters.trangThai) {
      query += " AND cd.trangThai = ?";
      params.push(filters.trangThai);
    }

    query += `
      GROUP BY cd.maChuyen
      ORDER BY cd.ngayChay DESC, lt.gioKhoiHanh DESC
    `;

    if (filters.limit) {
      query += " LIMIT ?";
      params.push(Number(filters.limit));
      if (filters.offset) {
        query += " OFFSET ?";
        params.push(Number(filters.offset));
      }
    }

    const [rows] = await pool.query(query, params);
    return rows;
  },

  // Tạo chuyến đi mới
  async create(data) {
    const { maLichTrinh, ngayChay, trangThai, ghiChu } = data;
    const [result] = await pool.query(
      `INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu)
       VALUES (?, ?, ?, ?)`,
      [maLichTrinh, ngayChay, trangThai || "chua_khoi_hanh", ghiChu]
    );
    return result.insertId;
  },

  // Cập nhật chuyến đi (partial update)
  async update(id, data) {
    // Chỉ update các field được gửi (dynamic UPDATE)
    const fields = [];
    const values = [];

    if (data.maLichTrinh !== undefined) {
      fields.push("maLichTrinh = ?");
      values.push(data.maLichTrinh);
    }
    if (data.ngayChay !== undefined) {
      fields.push("ngayChay = ?");
      values.push(data.ngayChay);
    }
    if (data.trangThai !== undefined) {
      fields.push("trangThai = ?");
      values.push(data.trangThai);
    }
    if (data.gioBatDauThucTe !== undefined) {
      fields.push("gioBatDauThucTe = ?");
      values.push(data.gioBatDauThucTe);
    }
    if (data.gioKetThucThucTe !== undefined) {
      fields.push("gioKetThucThucTe = ?");
      values.push(data.gioKetThucThucTe);
    }
    if (data.ghiChu !== undefined) {
      fields.push("ghiChu = ?");
      values.push(data.ghiChu);
    }

    if (fields.length === 0) {
      return false; // Không có gì để update
    }

    values.push(id); // Thêm id vào cuối cho WHERE clause

    const [result] = await pool.query(
      `UPDATE ChuyenDi SET ${fields.join(", ")} WHERE maChuyen = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  // Xóa chuyến đi
  async delete(id) {
    const [result] = await pool.query(
      "DELETE FROM ChuyenDi WHERE maChuyen = ?",
      [id]
    );
    return result.affectedRows > 0;
  },

  // Lấy danh sách học sinh trong chuyến
  async getStudents(maChuyen) {
    const [rows] = await pool.query(
      `SELECT 
        tths.*,
        hs.hoTen,
        hs.lop,
        hs.anhDaiDien,
        nd.hoTen as tenPhuHuynh,
        nd.soDienThoai as sdtPhuHuynh
       FROM TrangThaiHocSinh tths
       INNER JOIN HocSinh hs ON tths.maHocSinh = hs.maHocSinh
       LEFT JOIN NguoiDung nd ON hs.maPhuHuynh = nd.maNguoiDung
       WHERE tths.maChuyen = ?
       ORDER BY tths.thuTuDiemDon`,
      [maChuyen]
    );
    return rows;
  },

  // Đếm số lượng chuyến đi với filters (dùng cho pagination)
  async count(filters = {}) {
    let query = `
      SELECT COUNT(*) as total
      FROM ChuyenDi cd
      INNER JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
      WHERE 1=1
    `;
    const params = [];

    if (filters.ngayChay) {
      query += " AND DATE(cd.ngayChay) = DATE(?)";
      params.push(filters.ngayChay);
    }
    if (filters.trangThai) {
      query += " AND cd.trangThai = ?";
      params.push(filters.trangThai);
    }
    if (filters.maLichTrinh) {
      query += " AND cd.maLichTrinh = ?";
      params.push(filters.maLichTrinh);
    }
    if (filters.maTaiXe) {
      query += " AND lt.maTaiXe = ?";
      params.push(filters.maTaiXe);
    }
    if (filters.maXe) {
      query += " AND lt.maXe = ?";
      params.push(filters.maXe);
    }
    if (filters.maTuyen) {
      query += " AND lt.maTuyen = ?";
      params.push(filters.maTuyen);
    }

    const [rows] = await pool.query(query, params);
    return rows[0]?.total || 0;
  },

  // Thống kê chuyến đi
  async getStatusCounts(filters = {}) {
    let query = `
      SELECT 
        trangThai,
        COUNT(*) as count
      FROM ChuyenDi
      WHERE 1=1
    `;
    const params = [];

    if (filters.ngayChay) {
      query += " AND ngayChay = ?";
      params.push(filters.ngayChay);
    }
    if (filters.ngayBatDau && filters.ngayKetThuc) {
      query += " AND ngayChay BETWEEN ? AND ?";
      params.push(filters.ngayBatDau, filters.ngayKetThuc);
    }

    query += " GROUP BY trangThai";

    const [rows] = await pool.query(query, params);
    return rows;
  },

  // Lấy chuyến đi theo lịch trình và ngày
  async getByScheduleAndDate(maLichTrinh, ngayChay) {
    const [rows] = await pool.query(
      `SELECT cd.*,
        lt.gioKhoiHanh,
        lt.loaiChuyen,
        td.tenTuyen,
        xb.bienSoXe,
        nd.hoTen as tenTaiXe
       FROM ChuyenDi cd
       INNER JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
       INNER JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
       INNER JOIN XeBuyt xb ON lt.maXe = xb.maXe
       INNER JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
       WHERE cd.maLichTrinh = ? AND DATE(cd.ngayChay) = DATE(?)`,
      [maLichTrinh, ngayChay]
    );
    return rows[0];
  },
};

export default ChuyenDiModel;
