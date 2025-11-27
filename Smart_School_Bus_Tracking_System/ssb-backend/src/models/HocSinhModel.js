import pool from "../config/db.js";

const HocSinhModel = {
  // Lấy tất cả học sinh
  async getAll() {
    const [rows] = await pool.query(
      `SELECT 
        hs.*,
        nd.hoTen as tenPhuHuynh,
        nd.soDienThoai as sdtPhuHuynh,
        nd.email as emailPhuHuynh
       FROM HocSinh hs
       LEFT JOIN NguoiDung nd ON hs.maPhuHuynh = nd.maNguoiDung
       WHERE hs.trangThai = TRUE
       ORDER BY hs.hoTen`
    );
    // MySQL trả về BOOLEAN dưới dạng TINYINT (1 hoặc 0)
    // Chuyển đổi để đảm bảo tương thích
    return rows.map(row => ({
      ...row,
      trangThai: row.trangThai === 1 || row.trangThai === true || row.trangThai === '1',
      viDo: row.viDo != null ? parseFloat(row.viDo) : null,
      kinhDo: row.kinhDo != null ? parseFloat(row.kinhDo) : null,
    }));
  },

  // Lấy học sinh theo ID
  async getById(id) {
    const [rows] = await pool.query(
      `SELECT 
        hs.*,
        nd.hoTen as tenPhuHuynh,
        nd.soDienThoai as sdtPhuHuynh,
        nd.email as emailPhuHuynh
       FROM HocSinh hs
       LEFT JOIN NguoiDung nd ON hs.maPhuHuynh = nd.maNguoiDung
       WHERE hs.maHocSinh = ?`,
      [id]
    );
    return rows[0];
  },

  // Lấy học sinh theo phụ huynh
  async getByParent(maPhuHuynh) {
    // M5 FIX: Join với TrangThaiHocSinh để lấy trạng thái thực tế trong chuyến đi hôm nay
    // 🔥 FIX: Also join với schedule để lấy thông tin ngay cả khi chưa có trip
    const [rows] = await pool.query(
      `SELECT 
        hs.*,
        tts.trangThai as trangThaiHocSinh,
        tts.ngayCapNhat as thoiGianCapNhatTrangThai,
        tts.maChuyen,
        cd.trangThai as trangThaiChuyen,
        cd.ngayChay,
        cd.maChuyen as trip_maChuyen,
        -- Thông tin từ trip (nếu có)
        lt_trip.gioKhoiHanh as trip_gioKhoiHanh,
        lt_trip.loaiChuyen as trip_loaiChuyen,
        lt_trip.maTuyen as trip_maTuyen,
        lt_trip.maXe as trip_maXe,
        lt_trip.maTaiXe as trip_maTaiXe,
        td_trip.tenTuyen as trip_tenTuyen,
        xb_trip.bienSoXe as trip_bienSoXe,
        tx_trip.tenTaiXe as trip_tenTaiXe,
        nd_tx_trip.soDienThoai as trip_sdtTaiXe,
        -- Thông tin từ schedule hôm nay (nếu chưa có trip)
        lt_sched.maLichTrinh as sched_maLichTrinh,
        lt_sched.gioKhoiHanh as sched_gioKhoiHanh,
        lt_sched.loaiChuyen as sched_loaiChuyen,
        lt_sched.maTuyen as sched_maTuyen,
        lt_sched.maXe as sched_maXe,
        lt_sched.maTaiXe as sched_maTaiXe,
        lt_sched.ngayChay as sched_ngayChay,
        td_sched.tenTuyen as sched_tenTuyen,
        xb_sched.bienSoXe as sched_bienSoXe,
        tx_sched.tenTaiXe as sched_tenTaiXe,
        nd_tx_sched.soDienThoai as sched_sdtTaiXe
       FROM HocSinh hs
       -- Join với trip (nếu có)
       LEFT JOIN TrangThaiHocSinh tts ON hs.maHocSinh = tts.maHocSinh
       LEFT JOIN ChuyenDi cd ON tts.maChuyen = cd.maChuyen AND cd.ngayChay = CURDATE()
       LEFT JOIN LichTrinh lt_trip ON cd.maLichTrinh = lt_trip.maLichTrinh
       LEFT JOIN TuyenDuong td_trip ON lt_trip.maTuyen = td_trip.maTuyen
       LEFT JOIN XeBuyt xb_trip ON lt_trip.maXe = xb_trip.maXe
       LEFT JOIN TaiXe tx_trip ON lt_trip.maTaiXe = tx_trip.maTaiXe
       LEFT JOIN NguoiDung nd_tx_trip ON tx_trip.maTaiXe = nd_tx_trip.maNguoiDung
       -- 🔥 Join với schedule hôm nay (nếu chưa có trip) - tìm schedule cho route mà học sinh được phân công
       -- Strategy: 
       -- 1. Tìm route từ trip hôm nay (nếu có) - từ TrangThaiHocSinh với ChuyenDi ngayChay = CURDATE()
       -- 2. Nếu không có, tìm route từ trip gần nhất của học sinh
       -- 3. Sau đó tìm schedule cho route đó (ưu tiên hôm nay)
       LEFT JOIN (
         -- Tìm route từ trip hôm nay (nếu có) hoặc trip gần nhất
         SELECT DISTINCT 
           tts2.maHocSinh,
           COALESCE(
             -- Ưu tiên: route từ trip hôm nay
             (SELECT lt_today.maTuyen 
              FROM TrangThaiHocSinh tts_today
              JOIN ChuyenDi cd_today ON tts_today.maChuyen = cd_today.maChuyen AND cd_today.ngayChay = CURDATE()
              JOIN LichTrinh lt_today ON cd_today.maLichTrinh = lt_today.maLichTrinh
              WHERE tts_today.maHocSinh = tts2.maHocSinh
              LIMIT 1),
             -- Fallback: route từ trip gần nhất
             (SELECT lt2.maTuyen 
              FROM TrangThaiHocSinh tts3
              JOIN ChuyenDi cd3 ON tts3.maChuyen = cd3.maChuyen
              JOIN LichTrinh lt2 ON cd3.maLichTrinh = lt2.maLichTrinh
              WHERE tts3.maHocSinh = tts2.maHocSinh
                AND cd3.ngayChay <= CURDATE()
              ORDER BY cd3.ngayChay DESC, cd3.gioBatDauThucTe DESC
              LIMIT 1)
           ) as recent_maTuyen
         FROM TrangThaiHocSinh tts2
         GROUP BY tts2.maHocSinh
       ) recent_route ON hs.maHocSinh = recent_route.maHocSinh
       LEFT JOIN (
         -- Tìm schedule gần nhất cho route (ưu tiên hôm nay, nếu không có thì lấy gần nhất)
         SELECT 
           lt1.maLichTrinh,
           lt1.maTuyen,
           lt1.maXe,
           lt1.maTaiXe,
           lt1.loaiChuyen,
           lt1.gioKhoiHanh,
           lt1.ngayChay,
           lt1.dangApDung
         FROM LichTrinh lt1
         WHERE lt1.dangApDung = TRUE
           AND lt1.ngayChay >= CURDATE() - INTERVAL 7 DAY
           AND lt1.maLichTrinh = (
             SELECT lt2.maLichTrinh
             FROM LichTrinh lt2
             WHERE lt2.maTuyen = lt1.maTuyen
               AND lt2.dangApDung = TRUE
               AND lt2.ngayChay >= CURDATE() - INTERVAL 7 DAY
             ORDER BY 
               CASE WHEN lt2.ngayChay = CURDATE() THEN 0 ELSE 1 END,
               lt2.ngayChay DESC
             LIMIT 1
           )
       ) lt_sched ON lt_sched.maTuyen = recent_route.recent_maTuyen
       LEFT JOIN TuyenDuong td_sched ON lt_sched.maTuyen = td_sched.maTuyen
       LEFT JOIN XeBuyt xb_sched ON lt_sched.maXe = xb_sched.maXe
       LEFT JOIN TaiXe tx_sched ON lt_sched.maTaiXe = tx_sched.maTaiXe
       LEFT JOIN NguoiDung nd_tx_sched ON tx_sched.maTaiXe = nd_tx_sched.maNguoiDung
       WHERE hs.maPhuHuynh = ? AND hs.trangThai = TRUE
       ORDER BY hs.hoTen, tts.ngayCapNhat DESC`,
      [maPhuHuynh]
    );

    // Transform to match frontend expectation
    return rows.map((row) => {
      // Ưu tiên thông tin từ trip, nếu không có thì dùng từ schedule
      const tripInfo = row.trip_maChuyen
        ? {
            // Có trip (đã start hoặc chưa start)
            maChuyen: row.trip_maChuyen,
            trangThai: row.trangThaiChuyen,
            ngayChay: row.ngayChay,
            gioKhoiHanh: row.trip_gioKhoiHanh,
            loaiChuyen: row.trip_loaiChuyen,
            maTuyen: row.trip_maTuyen,
            tenTuyen: row.trip_tenTuyen,
            maXe: row.trip_maXe,
            bienSoXe: row.trip_bienSoXe,
            maTaiXe: row.trip_maTaiXe,
            tenTaiXe: row.trip_tenTaiXe,
            sdtTaiXe: row.trip_sdtTaiXe,
            trangThaiHocSinh: row.trangThaiHocSinh,
          }
        : row.sched_maLichTrinh
        ? {
            // Chưa có trip nhưng có schedule
            maChuyen: null,
            trangThai: "chua_khoi_hanh",
            ngayChay: row.sched_ngayChay ? new Date(row.sched_ngayChay).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
            gioKhoiHanh: row.sched_gioKhoiHanh,
            loaiChuyen: row.sched_loaiChuyen,
            maTuyen: row.sched_maTuyen,
            tenTuyen: row.sched_tenTuyen,
            maXe: row.sched_maXe,
            bienSoXe: row.sched_bienSoXe,
            maTaiXe: row.sched_maTaiXe,
            tenTaiXe: row.sched_tenTaiXe,
            sdtTaiXe: row.sched_sdtTaiXe,
            trangThaiHocSinh: null,
          }
        : null;

      return {
        ...row,
        tripInfo,
      };
    });
  },

  // Lấy học sinh theo lớp
  async getByClass(lop) {
    const [rows] = await pool.query(
      `SELECT 
        hs.*,
        nd.hoTen as tenPhuHuynh,
        nd.soDienThoai as sdtPhuHuynh
       FROM HocSinh hs
       LEFT JOIN NguoiDung nd ON hs.maPhuHuynh = nd.maNguoiDung
       WHERE hs.lop = ? AND hs.trangThai = TRUE
       ORDER BY hs.hoTen`,
      [lop]
    );
    return rows;
  },

  // Lấy học sinh theo chuyến đi (cùng với thông tin phụ huynh)
  async getByTripId(maChuyen) {
    const [rows] = await pool.query(
      `SELECT DISTINCT
        hs.*,
        nd.hoTen as tenPhuHuynh,
        nd.soDienThoai as sdtPhuHuynh,
        nd.email as emailPhuHuynh,
        nd.maNguoiDung as maPhuHuynh,
        ts.trangThai as trangThaiTrenChuyen
       FROM TrangThaiHocSinh ts
       JOIN HocSinh hs ON ts.maHocSinh = hs.maHocSinh
       LEFT JOIN NguoiDung nd ON hs.maPhuHuynh = nd.maNguoiDung
       WHERE ts.maChuyen = ? AND hs.trangThai = TRUE
       ORDER BY ts.thuTuDiemDon`,
      [maChuyen]
    );
    return rows;
  },

  // Tạo học sinh mới
  async create(data) {
    const { hoTen, ngaySinh, lop, maPhuHuynh, diaChi, anhDaiDien } = data;
    const [result] = await pool.query(
      `INSERT INTO HocSinh (hoTen, ngaySinh, lop, maPhuHuynh, diaChi, anhDaiDien)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [hoTen, ngaySinh, lop, maPhuHuynh, diaChi, anhDaiDien]
    );
    return result.insertId;
  },

  // Cập nhật thông tin học sinh (partial update)
  async update(id, data) {
    const fields = [];
    const values = [];

    if (data.hoTen !== undefined) {
      fields.push("hoTen = ?");
      values.push(data.hoTen);
    }
    if (data.ngaySinh !== undefined) {
      fields.push("ngaySinh = ?");
      values.push(data.ngaySinh);
    }
    if (data.lop !== undefined) {
      fields.push("lop = ?");
      values.push(data.lop);
    }
    if (data.maPhuHuynh !== undefined) {
      fields.push("maPhuHuynh = ?");
      values.push(data.maPhuHuynh);
    }
    if (data.diaChi !== undefined) {
      fields.push("diaChi = ?");
      values.push(data.diaChi);
    }
    if (data.anhDaiDien !== undefined) {
      fields.push("anhDaiDien = ?");
      values.push(data.anhDaiDien);
    }
    if (data.viDo !== undefined) {
      fields.push("viDo = ?");
      values.push(data.viDo);
    }
    if (data.kinhDo !== undefined) {
      fields.push("kinhDo = ?");
      values.push(data.kinhDo);
    }
    if (data.trangThai !== undefined) {
      fields.push("trangThai = ?");
      values.push(data.trangThai);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const query = `UPDATE HocSinh SET ${fields.join(", ")} WHERE maHocSinh = ?`;

    const [result] = await pool.query(query, values);
    return result.affectedRows > 0;
  },

  // Xóa học sinh (soft delete)
  async delete(id) {
    const [result] = await pool.query(
      "UPDATE HocSinh SET trangThai = FALSE WHERE maHocSinh = ?",
      [id]
    );
    return result.affectedRows > 0;
  },

  // Xóa vĩnh viễn
  async hardDelete(id) {
    const [result] = await pool.query(
      "DELETE FROM HocSinh WHERE maHocSinh = ?",
      [id]
    );
    return result.affectedRows > 0;
  },

  // Gán phụ huynh cho học sinh
  async assignParent(maHocSinh, maPhuHuynh) {
    const [result] = await pool.query(
      "UPDATE HocSinh SET maPhuHuynh = ? WHERE maHocSinh = ?",
      [maPhuHuynh, maHocSinh]
    );
    return result.affectedRows > 0;
  },

  // Thống kê học sinh
  async getStats() {
    const [totalResult] = await pool.query(
      `SELECT COUNT(*) as total FROM HocSinh WHERE trangThai = TRUE`
    );

    const [classCounts] = await pool.query(
      `SELECT lop, COUNT(*) as count 
       FROM HocSinh 
       WHERE trangThai = TRUE 
       GROUP BY lop 
       ORDER BY lop`
    );

    const [withParent] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM HocSinh 
       WHERE maPhuHuynh IS NOT NULL AND trangThai = TRUE`
    );

    return {
      total: totalResult[0].total || 0,
      byClass: classCounts || [],
      withParent: withParent[0].count || 0,
    };
  },

  // Alias for getAll (which already includes parent info)
  async getWithParentInfo() {
    return this.getAll();
  },
};

export default HocSinhModel;
