import pool from "../config/db.js";

const TrangThaiHocSinhModel = {
  // Lấy tất cả trạng thái học sinh trên chuyến đi
  async getAll() {
    const [rows] = await pool.query(`SELECT * FROM TrangThaiHocSinh`);
    return rows;
  },

  // Lấy trạng thái học sinh theo mã chuyến và mã học sinh
  async getById(maChuyen, maHocSinh) {
    const [rows] = await pool.query(
      `SELECT * FROM TrangThaiHocSinh WHERE maChuyen = ? AND maHocSinh = ?`,
      [maChuyen, maHocSinh]
    );
    return rows[0];
  },

  // Alias for getById - used by TripController
  async getByTripAndStudent(maChuyen, maHocSinh) {
    return this.getById(maChuyen, maHocSinh);
  },

  // Lấy tất cả học sinh trên chuyến đi
  async getByTripId(maChuyen) {
    const [rows] = await pool.query(
      `SELECT ts.*, hs.hoTen, hs.lop, hs.anhDaiDien
       FROM TrangThaiHocSinh ts
       LEFT JOIN HocSinh hs ON ts.maHocSinh = hs.maHocSinh
       WHERE ts.maChuyen = ?
       ORDER BY ts.thuTuDiemDon`,
      [maChuyen]
    );
    return rows;
  },

  // Thêm trạng thái học sinh mới
  async create(data) {
    const {
      maChuyen,
      maHocSinh,
      thuTuDiemDon,
      trangThai,
      thoiGianThucTe,
      ghiChu,
    } = data;
    const [result] = await pool.query(
      `INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai, thoiGianThucTe, ghiChu)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        maChuyen,
        maHocSinh,
        thuTuDiemDon,
        trangThai || "cho_don",
        thoiGianThucTe,
        ghiChu,
      ]
    );
    return result.insertId;
  },

  // Cập nhật trạng thái học sinh
  async update(maTrangThaiOrMaChuyen, dataOrMaHocSinh, maybeData) {
    // Support both signatures:
    // 1. update(maTrangThai, data) - used by new code
    // 2. update(maChuyen, maHocSinh, data) - used by old code

    if (maybeData !== undefined) {
      // Old signature: update(maChuyen, maHocSinh, data)
      const maChuyen = maTrangThaiOrMaChuyen;
      const maHocSinh = dataOrMaHocSinh;
      const data = maybeData;
      const { thuTuDiemDon, trangThai, thoiGianThucTe, ghiChu } = data;
      const [result] = await pool.query(
        `UPDATE TrangThaiHocSinh SET thuTuDiemDon = ?, trangThai = ?, thoiGianThucTe = ?, ghiChu = ?
         WHERE maChuyen = ? AND maHocSinh = ?`,
        [thuTuDiemDon, trangThai, thoiGianThucTe, ghiChu, maChuyen, maHocSinh]
      );
      return result.affectedRows > 0;
    } else {
      // New signature: update(maTrangThai, data)
      const maTrangThai = maTrangThaiOrMaChuyen;
      const data = dataOrMaHocSinh;
      const { trangThai, thoiGianCapNhat, ghiChu } = data;

      // Get current record first
      const [current] = await pool.query(
        `SELECT * FROM TrangThaiHocSinh WHERE maTrangThai = ?`,
        [maTrangThai]
      );

      if (current.length === 0) {
        return false;
      }

      const [result] = await pool.query(
        `UPDATE TrangThaiHocSinh SET trangThai = ?, thoiGianCapNhat = ?, ghiChu = ?
         WHERE maTrangThai = ?`,
        [trangThai, thoiGianCapNhat, ghiChu || current[0].ghiChu, maTrangThai]
      );
      return result.affectedRows > 0;
    }
  },

  // Xóa trạng thái học sinh
  async delete(maChuyen, maHocSinh) {
    const [result] = await pool.query(
      `DELETE FROM TrangThaiHocSinh WHERE maChuyen = ? AND maHocSinh = ?`,
      [maChuyen, maHocSinh]
    );
    return result.affectedRows > 0;
  },

  // Kiểm tra xem có học sinh nào trong danh sách thuộc chuyến đi không
  async hasStudentInTrip(tripId, studentIds) {
    if (!studentIds || studentIds.length === 0) {
      return false;
    }

    const placeholders = studentIds.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT COUNT(*) as count FROM TrangThaiHocSinh 
       WHERE maChuyen = ? AND maHocSinh IN (${placeholders})`,
      [tripId, ...studentIds]
    );
    
    return rows[0].count > 0;
  },
};

export default TrangThaiHocSinhModel;
