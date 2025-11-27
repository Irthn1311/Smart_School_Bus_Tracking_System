import pool from "../config/db.js";

class SuCoModel {
  // Tạo báo cáo sự cố mới
  async create(data) {
    const { maChuyen, moTa, mucDo = "nhe", trangThai = "moi" } = data;

    const [result] = await pool.query(
      `INSERT INTO SuCo (maChuyen, moTa, thoiGianBao, mucDo, trangThai)
       VALUES (?, ?, NOW(), ?, ?)`,
      [maChuyen, moTa, mucDo, trangThai]
    );

    return {
      maSuCo: result.insertId,
      maChuyen,
      moTa,
      thoiGianBao: new Date(),
      mucDo,
      trangThai,
    };
  }

  // Lấy tất cả sự cố
  async getAll(filters = {}) {
    const {
      mucDo,
      maChuyen,
      trangThai,
      tuNgay,
      denNgay,
      limit = 50,
      offset = 0,
    } = filters;

    let query = `
      SELECT sc.*, 
             cd.maLichTrinh,
             lt.maXe, lt.maTaiXe, lt.loaiChuyen, lt.gioKhoiHanh,
             xb.bienSoXe,
             nd.hoTen as tenTaiXe
      FROM SuCo sc
      LEFT JOIN ChuyenDi cd ON sc.maChuyen = cd.maChuyen
      LEFT JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
      LEFT JOIN XeBuyt xb ON lt.maXe = xb.maXe
      LEFT JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
      WHERE 1=1
    `;
    const params = [];

    if (mucDo) {
      query += ` AND sc.mucDo = ?`;
      params.push(mucDo);
    }

    if (maChuyen) {
      query += ` AND sc.maChuyen = ?`;
      params.push(maChuyen);
    }

    if (trangThai) {
      query += ` AND sc.trangThai = ?`;
      params.push(trangThai);
    }

    if (tuNgay) {
      query += ` AND sc.thoiGianBao >= ?`;
      params.push(tuNgay);
    }

    if (denNgay) {
      query += ` AND sc.thoiGianBao <= ?`;
      params.push(denNgay);
    }

    query += ` ORDER BY sc.thoiGianBao DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    return rows;
  }

  // Lấy sự cố theo ID
  async getById(maSuCo) {
    const [rows] = await pool.query(
      `SELECT sc.*, 
             cd.ngayChay,
             lt.maXe, lt.maTaiXe, lt.loaiChuyen, lt.gioKhoiHanh,
             xb.bienSoXe, xb.dongXe,
             nd.hoTen as tenTaiXe, nd.soDienThoai as sdtTaiXe,
             td.tenTuyen
      FROM SuCo sc
      LEFT JOIN ChuyenDi cd ON sc.maChuyen = cd.maChuyen
      LEFT JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
      LEFT JOIN XeBuyt xb ON lt.maXe = xb.maXe
      LEFT JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
      LEFT JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
      WHERE sc.maSuCo = ?`,
      [maSuCo]
    );
    return rows[0];
  }

  // Lấy sự cố theo chuyến đi
  async getByTrip(maChuyen) {
    const [rows] = await pool.query(
      `SELECT * FROM SuCo 
       WHERE maChuyen = ? 
       ORDER BY thoiGianBao DESC`,
      [maChuyen]
    );
    return rows;
  }

  // Lấy sự cố theo mức độ
  async getByLevel(mucDo, limit = 50) {
    const [rows] = await pool.query(
      `SELECT sc.*, 
             cd.ngayChay,
             lt.gioKhoiHanh,
             xb.bienSoXe,
             nd.hoTen as tenTaiXe
      FROM SuCo sc
      LEFT JOIN ChuyenDi cd ON sc.maChuyen = cd.maChuyen
      LEFT JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
      LEFT JOIN XeBuyt xb ON lt.maXe = xb.maXe
      LEFT JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
      WHERE sc.mucDo = ?
      ORDER BY sc.thoiGianBao DESC
      LIMIT ?`,
      [mucDo, limit]
    );
    return rows;
  }

  // Cập nhật mức độ sự cố
  async updateLevel(maSuCo, mucDo) {
    const [result] = await pool.query(
      `UPDATE SuCo 
       SET mucDo = ? 
       WHERE maSuCo = ?`,
      [mucDo, maSuCo]
    );

    return result.affectedRows > 0;
  }

  // Cập nhật mô tả sự cố
  async update(maSuCo, data) {
    const { moTa, mucDo, trangThai } = data;
    const updates = [];
    const params = [];

    if (moTa !== undefined) {
      updates.push("moTa = ?");
      params.push(moTa);
    }

    if (mucDo !== undefined) {
      updates.push("mucDo = ?");
      params.push(mucDo);
    }

    if (trangThai !== undefined) {
      updates.push("trangThai = ?");
      params.push(trangThai);
    }

    if (updates.length === 0) {
      return false;
    }

    params.push(maSuCo);

    const [result] = await pool.query(
      `UPDATE SuCo SET ${updates.join(", ")} WHERE maSuCo = ?`,
      params
    );

    return result.affectedRows > 0;
  }

  // Xóa sự cố
  async delete(maSuCo) {
    const [result] = await pool.query(`DELETE FROM SuCo WHERE maSuCo = ?`, [
      maSuCo,
    ]);

    return result.affectedRows > 0;
  }

  // Đếm số sự cố theo mức độ
  async countByLevel() {
    const [rows] = await pool.query(
      `SELECT 
        mucDo,
        COUNT(*) as soLuong
       FROM SuCo
       GROUP BY mucDo`
    );
    return rows;
  }

  // Thống kê sự cố trong khoảng thời gian
  async getStatistics(tuNgay, denNgay) {
    const [rows] = await pool.query(
      `SELECT 
        COUNT(*) as tongSuCo,
        SUM(CASE WHEN mucDo = 'nhe' THEN 1 ELSE 0 END) as suCoNhe,
        SUM(CASE WHEN mucDo = 'trung_binh' THEN 1 ELSE 0 END) as suCoTrungBinh,
        SUM(CASE WHEN mucDo = 'nghiem_trong' THEN 1 ELSE 0 END) as suCoNghiemTrong,
        DATE(thoiGianBao) as ngay
       FROM SuCo
       WHERE thoiGianBao BETWEEN ? AND ?
       GROUP BY DATE(thoiGianBao)
       ORDER BY ngay DESC`,
      [tuNgay, denNgay]
    );
    return rows;
  }

  // Lấy sự cố gần đây nhất
  async getRecent(limit = 10) {
    const [rows] = await pool.query(
      `SELECT sc.*, 
             cd.ngayChay,
             xb.bienSoXe,
             nd.hoTen as tenTaiXe
      FROM SuCo sc
      LEFT JOIN ChuyenDi cd ON sc.maChuyen = cd.maChuyen
      LEFT JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
      LEFT JOIN XeBuyt xb ON lt.maXe = xb.maXe
      LEFT JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
      ORDER BY sc.thoiGianBao DESC
      LIMIT ?`,
      [limit]
    );
    return rows;
  }

  // Lấy sự cố nghiêm trọng chưa xử lý (trong 24h gần nhất)
  async getCriticalUnresolved() {
    const [rows] = await pool.query(
      `SELECT sc.*, 
             cd.trangThai,
             xb.bienSoXe,
             nd.hoTen as tenTaiXe, nd.soDienThoai as sdtTaiXe
      FROM SuCo sc
      LEFT JOIN ChuyenDi cd ON sc.maChuyen = cd.maChuyen
      LEFT JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
      LEFT JOIN XeBuyt xb ON lt.maXe = xb.maXe
      LEFT JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
      WHERE sc.mucDo = 'nghiem_trong'
        AND sc.thoiGianBao >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND (cd.trangThai != 'hoan_thanh' OR cd.trangThai IS NULL)
      ORDER BY sc.thoiGianBao DESC`
    );
    return rows;
  }

  // Lấy sự cố theo xe buýt
  async getByBus(maXeBuyt, limit = 20) {
    const [rows] = await pool.query(
      `SELECT sc.*, 
             cd.ngayChay,
             lt.gioKhoiHanh,
             nd.hoTen as tenTaiXe
      FROM SuCo sc
      JOIN ChuyenDi cd ON sc.maChuyen = cd.maChuyen
      LEFT JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
      LEFT JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
      WHERE lt.maXe = ?
      ORDER BY sc.thoiGianBao DESC
      LIMIT ?`,
      [maXeBuyt, limit]
    );
    return rows;
  }

  // Lấy sự cố theo tài xế
  async getByDriver(maTaiXe, limit = 20) {
    const [rows] = await pool.query(
      `SELECT sc.*, 
             cd.ngayChay,
             lt.gioKhoiHanh,
             xb.bienSoXe
      FROM SuCo sc
      JOIN ChuyenDi cd ON sc.maChuyen = cd.maChuyen
      LEFT JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
      LEFT JOIN XeBuyt xb ON lt.maXe = xb.maXe
      WHERE lt.maTaiXe = ?
      ORDER BY sc.thoiGianBao DESC
      LIMIT ?`,
      [maTaiXe, limit]
    );
    return rows;
  }
}

const instance = new SuCoModel();
export default instance;
