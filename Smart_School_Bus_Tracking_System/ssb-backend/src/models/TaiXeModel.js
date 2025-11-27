import pool from "../config/db.js";

const TaiXeModel = {
  // Lấy tất cả tài xế (JOIN với NguoiDung)
  async getAll() {
    const [rows] = await pool.query(
      `SELECT 
        tx.maTaiXe,
        nd.hoTen,
        nd.email,
        nd.soDienThoai,
        nd.anhDaiDien,
        tx.soBangLai,
        tx.ngayHetHanBangLai,
        tx.soNamKinhNghiem,
        tx.trangThai,
        tx.ngayTao,
        tx.ngayCapNhat
       FROM TaiXe tx
       INNER JOIN NguoiDung nd ON tx.maTaiXe = nd.maNguoiDung
       ORDER BY nd.hoTen`
    );
    return rows;
  },

  // Lấy tài xế theo ID
  async getById(id) {
    const [rows] = await pool.query(
      `SELECT 
        tx.maTaiXe,
        nd.hoTen,
        nd.email,
        nd.soDienThoai,
        nd.anhDaiDien,
        tx.soBangLai,
        tx.ngayHetHanBangLai,
        tx.soNamKinhNghiem,
        tx.trangThai,
        tx.ngayTao,
        tx.ngayCapNhat
       FROM TaiXe tx
       INNER JOIN NguoiDung nd ON tx.maTaiXe = nd.maNguoiDung
       WHERE tx.maTaiXe = ?`,
      [id]
    );
    return rows[0];
  },

  // Lấy tài xế theo số bằng lái
  async getByLicense(soBangLai) {
    const [rows] = await pool.query("SELECT * FROM TaiXe WHERE soBangLai = ?", [
      soBangLai,
    ]);
    return rows[0];
  },

  // Lấy tài xế theo trạng thái
  async getByStatus(trangThai) {
    const [rows] = await pool.query(
      `SELECT 
        tx.maTaiXe,
        nd.hoTen,
        nd.email,
        nd.soDienThoai,
        tx.soBangLai,
        tx.ngayHetHanBangLai,
        tx.soNamKinhNghiem,
        tx.trangThai
       FROM TaiXe tx
       INNER JOIN NguoiDung nd ON tx.maTaiXe = nd.maNguoiDung
       WHERE tx.trangThai = ?
       ORDER BY nd.hoTen`,
      [trangThai]
    );
    return rows;
  },

  // Tạo tài xế mới (phải tạo NguoiDung trước)
  async create(data) {
    const {
      maTaiXe,
      tenTaiXe,
      soBangLai,
      ngayHetHanBangLai,
      soNamKinhNghiem,
      trangThai,
    } = data;
    const [result] = await pool.query(
      `INSERT INTO TaiXe (maTaiXe, tenTaiXe, soBangLai, ngayHetHanBangLai, soNamKinhNghiem, trangThai)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        maTaiXe,
        tenTaiXe,
        soBangLai,
        ngayHetHanBangLai,
        soNamKinhNghiem || 0,
        trangThai || "hoat_dong",
      ]
    );
    return result.affectedRows > 0;
  },

  // Cập nhật thông tin tài xế (partial update)
  async update(id, data) {
    const fields = [];
    const values = [];

    if (data.soBangLai !== undefined) {
      fields.push("soBangLai = ?");
      values.push(data.soBangLai);
    }
    if (data.ngayHetHanBangLai !== undefined) {
      fields.push("ngayHetHanBangLai = ?");
      values.push(data.ngayHetHanBangLai);
    }
    if (data.soNamKinhNghiem !== undefined) {
      fields.push("soNamKinhNghiem = ?");
      values.push(data.soNamKinhNghiem);
    }
    if (data.trangThai !== undefined) {
      fields.push("trangThai = ?");
      values.push(data.trangThai);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const query = `UPDATE TaiXe SET ${fields.join(", ")} WHERE maTaiXe = ?`;

    const [result] = await pool.query(query, values);
    return result.affectedRows > 0;
  },

  // Xóa tài xế
  async delete(id) {
    const [result] = await pool.query("DELETE FROM TaiXe WHERE maTaiXe = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  },

  // Lấy lịch trình của tài xế
  async getSchedules(id) {
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
      [id]
    );
    return rows;
  },

  // Kiểm tra tài xế có khả dụng không (không bị trùng lịch)
  async isAvailable(maTaiXe, gioKhoiHanh, loaiChuyen) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) as count
       FROM LichTrinh
       WHERE maTaiXe = ? 
       AND gioKhoiHanh = ? 
       AND loaiChuyen = ?
       AND dangApDung = TRUE`,
      [maTaiXe, gioKhoiHanh, loaiChuyen]
    );
    return rows[0].count === 0;
  },

  // Thống kê tài xế
  async getStats() {
    const [statusCounts] = await pool.query(
      `SELECT trangThai, COUNT(*) as count 
       FROM TaiXe 
       GROUP BY trangThai`
    );

    const [totalResult] = await pool.query(
      `SELECT COUNT(*) as total FROM TaiXe`
    );

    return {
      statusCounts: statusCounts || [],
      total: totalResult[0].total || 0,
    };
  },

  // Alias for getByLicense (for consistency)
  async getBySoBangLai(soBangLai) {
    return this.getByLicense(soBangLai);
  },
};

export default TaiXeModel;
