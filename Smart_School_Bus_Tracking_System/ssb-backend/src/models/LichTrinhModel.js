import pool from "../config/db.js";

const LichTrinhModel = {
  // Lấy tất cả lịch trình với filters
  async getAll(filters = {}) {
    let query = `
      SELECT 
        lt.maLichTrinh,
        lt.maTuyen,
        lt.maXe,
        lt.maTaiXe,
        lt.loaiChuyen,
        lt.gioKhoiHanh,
        DATE_FORMAT(lt.ngayChay, '%Y-%m-%d') as ngayChay,
        lt.dangApDung,
        lt.ngayTao,
        lt.ngayCapNhat,
        td.tenTuyen,
        xb.bienSoXe,
        xb.dongXe,
        nd.hoTen as tenTaiXe
       FROM LichTrinh lt
       INNER JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
       INNER JOIN XeBuyt xb ON lt.maXe = xb.maXe
       INNER JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
       WHERE 1=1
    `;
    const params = [];
    
    // Apply filters
    if (filters.maTuyen) {
      query += " AND lt.maTuyen = ?";
      params.push(filters.maTuyen);
    }
    if (filters.maXe) {
      query += " AND lt.maXe = ?";
      params.push(filters.maXe);
    }
    if (filters.maTaiXe) {
      query += " AND lt.maTaiXe = ?";
      params.push(filters.maTaiXe);
    }
    if (filters.loaiChuyen) {
      query += " AND lt.loaiChuyen = ?";
      params.push(filters.loaiChuyen);
    }
    if (filters.dangApDung !== undefined) {
      query += " AND lt.dangApDung = ?";
      params.push(filters.dangApDung ? 1 : 0);
    } else {
      // Default: only active schedules
      query += " AND lt.dangApDung = TRUE";
    }
    
    query += " ORDER BY lt.ngayChay DESC, lt.gioKhoiHanh";
    
    const [rows] = await pool.query(query, params);
    return rows;
  },

  // Lấy lịch trình theo ID
  async getById(id) {
    const [rows] = await pool.query(
      `SELECT 
        lt.maLichTrinh,
        lt.maTuyen,
        lt.maXe,
        lt.maTaiXe,
        lt.loaiChuyen,
        lt.gioKhoiHanh,
        DATE_FORMAT(lt.ngayChay, '%Y-%m-%d') as ngayChay,
        lt.dangApDung,
        lt.ngayTao,
        lt.ngayCapNhat,
        td.tenTuyen,
        td.diemBatDau,
        td.diemKetThuc,
        td.thoiGianUocTinh,
        xb.bienSoXe,
        xb.dongXe,
        xb.sucChua,
        nd.hoTen as tenTaiXe,
        nd.soDienThoai as sdtTaiXe
       FROM LichTrinh lt
       INNER JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
       INNER JOIN XeBuyt xb ON lt.maXe = xb.maXe
       INNER JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
       WHERE lt.maLichTrinh = ?`,
      [id]
    );
    return rows[0];
  },

  // Lấy lịch trình theo tuyến
  async getByRoute(maTuyen) {
    const [rows] = await pool.query(
      `SELECT 
        lt.*,
        xb.bienSoXe,
        nd.hoTen as tenTaiXe
       FROM LichTrinh lt
       INNER JOIN XeBuyt xb ON lt.maXe = xb.maXe
       INNER JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
       WHERE lt.maTuyen = ? AND lt.dangApDung = TRUE
       ORDER BY lt.gioKhoiHanh`,
      [maTuyen]
    );
    return rows;
  },

  // Alias for getByRoute (used by RouteController)
  async getByRouteId(maTuyen) {
    return this.getByRoute(maTuyen);
  },

  // Lấy lịch trình theo tuyến và loại chuyến (don_sang/tra_chieu)
  async getByRouteAndType(maTuyen, loaiChuyen) {
    const [rows] = await pool.query(
      `SELECT 
        lt.*,
        td.tenTuyen,
        xb.bienSoXe,
        xb.dongXe,
        nd.hoTen as tenTaiXe
       FROM LichTrinh lt
       INNER JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
       INNER JOIN XeBuyt xb ON lt.maXe = xb.maXe
       INNER JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
       WHERE lt.maTuyen = ? AND lt.loaiChuyen = ? AND lt.dangApDung = TRUE
       ORDER BY lt.gioKhoiHanh`,
      [maTuyen, loaiChuyen]
    );
    return rows;
  },

  // Lấy lịch trình theo xe buýt
  async getByBus(maXe) {
    const [rows] = await pool.query(
      `SELECT 
        lt.*,
        td.tenTuyen,
        nd.hoTen as tenTaiXe
       FROM LichTrinh lt
       INNER JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
       INNER JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
       WHERE lt.maXe = ? AND lt.dangApDung = TRUE
       ORDER BY lt.gioKhoiHanh`,
      [maXe]
    );
    return rows;
  },

  // Lấy lịch trình theo tài xế
  async getByDriver(maTaiXe) {
    const [rows] = await pool.query(
      `SELECT 
        lt.*,
        td.tenTuyen,
        xb.bienSoXe,
        xb.dongXe
       FROM LichTrinh lt
       INNER JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
       INNER JOIN XeBuyt xb ON lt.maXe = xb.maXe
       WHERE lt.maTaiXe = ? AND lt.dangApDung = TRUE
       ORDER BY lt.gioKhoiHanh`,
      [maTaiXe]
    );
    return rows;
  },

  // Tạo lịch trình mới
  async create(data) {
    const { maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, ngayChay, dangApDung } =
      data;
    const [result] = await pool.query(
      `INSERT INTO LichTrinh (maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, ngayChay, dangApDung)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, ngayChay, dangApDung !== false]
    );
    return result.insertId;
  },

  // Cập nhật lịch trình (partial update)
  async update(id, data) {
    const fields = [];
    const values = [];

    if (data.maTuyen !== undefined) {
      fields.push("maTuyen = ?");
      values.push(data.maTuyen);
    }
    if (data.maXe !== undefined) {
      fields.push("maXe = ?");
      values.push(data.maXe);
    }
    if (data.maTaiXe !== undefined) {
      fields.push("maTaiXe = ?");
      values.push(data.maTaiXe);
    }
    if (data.loaiChuyen !== undefined) {
      fields.push("loaiChuyen = ?");
      values.push(data.loaiChuyen);
    }
    if (data.gioKhoiHanh !== undefined) {
      fields.push("gioKhoiHanh = ?");
      values.push(data.gioKhoiHanh);
    }
    if (data.ngayChay !== undefined) {
      fields.push("ngayChay = ?");
      values.push(data.ngayChay);
    }
    if (data.dangApDung !== undefined) {
      fields.push("dangApDung = ?");
      values.push(data.dangApDung);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const query = `UPDATE LichTrinh SET ${fields.join(
      ", "
    )} WHERE maLichTrinh = ?`;

    const [result] = await pool.query(query, values);
    return result.affectedRows > 0;
  },

  // Xóa lịch trình (soft delete - đặt dangApDung = FALSE)
  async delete(id) {
    const [result] = await pool.query(
      "UPDATE LichTrinh SET dangApDung = FALSE WHERE maLichTrinh = ?",
      [id]
    );
    return result.affectedRows > 0;
  },

  // Xóa vĩnh viễn
  async hardDelete(id) {
    const [result] = await pool.query(
      "DELETE FROM LichTrinh WHERE maLichTrinh = ?",
      [id]
    );
    return result.affectedRows > 0;
  },

  // Kiểm tra xung đột lịch trình (xe/tài xế đã có lịch cùng giờ)
  async checkConflict(
    maXe,
    maTaiXe,
    gioKhoiHanh,
    loaiChuyen,
    ngayChay,
    excludeId = null
  ) {
    // M1-M3: Trả về chi tiết conflict thay vì chỉ boolean
    let query = `
      SELECT 
        lt.maLichTrinh,
        lt.maXe,
        lt.maTaiXe,
        lt.gioKhoiHanh,
        lt.loaiChuyen,
        lt.ngayChay,
        xb.bienSoXe,
        nd.hoTen as tenTaiXe,
        CASE 
          WHEN lt.maXe = ? THEN 'bus'
          WHEN lt.maTaiXe = ? THEN 'driver'
          ELSE 'both'
        END as conflictType
      FROM LichTrinh lt
      INNER JOIN XeBuyt xb ON lt.maXe = xb.maXe
      INNER JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
      WHERE (lt.maXe = ? OR lt.maTaiXe = ?)
      AND lt.gioKhoiHanh = ?
      AND lt.loaiChuyen = ?
      AND DATE(lt.ngayChay) = DATE(?)
      AND lt.dangApDung = TRUE
    `;
    const params = [maXe, maTaiXe, maXe, maTaiXe, gioKhoiHanh, loaiChuyen, ngayChay];

    if (excludeId) {
      query += " AND lt.maLichTrinh != ?";
      params.push(excludeId);
    }

    const [rows] = await pool.query(query, params);
    return rows.length > 0 ? rows : null;
  },

  // Thống kê lịch trình
  async getStats() {
    const [totalResult] = await pool.query(
      `SELECT COUNT(*) as total FROM LichTrinh WHERE dangApDung = TRUE`
    );

    const [byType] = await pool.query(
      `SELECT loaiChuyen, COUNT(*) as count 
       FROM LichTrinh 
       WHERE dangApDung = TRUE 
       GROUP BY loaiChuyen`
    );

    return {
      total: totalResult[0].total || 0,
      byType: byType || [],
    };
  },

  // Kiểm tra xung đột lịch trình (xe hoặc tài xế đã có lịch trình cùng giờ)
  async checkConflicts(maXe, maTaiXe, gioKhoiHanh, excludeId = null) {
    let query = `
      SELECT lt.*, td.tenTuyen, xb.bienSoXe, nd.hoTen as tenTaiXe
      FROM LichTrinh lt
      INNER JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
      INNER JOIN XeBuyt xb ON lt.maXe = xb.maXe
      INNER JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
      WHERE lt.dangApDung = TRUE
        AND lt.gioKhoiHanh = ?
        AND (lt.maXe = ? OR lt.maTaiXe = ?)
    `;

    const params = [gioKhoiHanh, maXe, maTaiXe];

    if (excludeId) {
      query += " AND lt.maLichTrinh != ?";
      params.push(excludeId);
    }

    const [rows] = await pool.query(query, params);
    return rows;
  },

  // Lấy lịch trình theo ngày (cho việc tạo chuyến đi)
  async getByDate(date) {
    const [rows] = await pool.query(
      `SELECT 
        lt.*,
        td.tenTuyen,
        xb.bienSoXe,
        xb.dongXe,
        nd.hoTen as tenTaiXe
       FROM LichTrinh lt
       INNER JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
       INNER JOIN XeBuyt xb ON lt.maXe = xb.maXe
       INNER JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
       WHERE lt.dangApDung = TRUE
         AND DATE(lt.ngayChay) = DATE(?)
       ORDER BY lt.gioKhoiHanh`,
      [date]
    );
    return rows;
  },
};

export default LichTrinhModel;
