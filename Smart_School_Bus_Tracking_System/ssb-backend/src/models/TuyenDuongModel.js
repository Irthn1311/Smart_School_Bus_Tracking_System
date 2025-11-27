import pool from "../config/db.js";

const TuyenDuongModel = {
  // Lấy tất cả tuyến đường (bao gồm số điểm dừng)
  async getAll(options = {}) {
    const { search, trangThai, routeType } = options;
    let query = `
      SELECT 
        t.*,
        COUNT(DISTINCT rs.stop_id) as soDiemDung
      FROM TuyenDuong t
      LEFT JOIN route_stops rs ON t.maTuyen = rs.route_id
    `;
    const conditions = [];
    const params = [];

    if (trangThai !== undefined) {
      conditions.push('t.trangThai = ?');
      params.push(trangThai === 'true' || trangThai === true || trangThai === '1' || trangThai === 1);
    }
    // Nếu không có filter trangThai, lấy tất cả (không filter theo trangThai)

    if (routeType) {
      conditions.push('t.routeType = ?');
      params.push(routeType);
    }

    if (search) {
      conditions.push('(t.tenTuyen LIKE ? OR t.diemBatDau LIKE ? OR t.diemKetThuc LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` GROUP BY t.maTuyen ORDER BY t.tenTuyen`;

    const [rows] = await pool.query(query, params);
    // Convert MySQL TINYINT (0/1) to boolean
    return rows.map(row => ({
      ...row,
      trangThai: row.trangThai === 1 || row.trangThai === true
    }));
  },

  // Lấy tuyến đường theo ID (không bao gồm stops - stops sẽ lấy riêng qua RouteStopModel)
  async getById(id) {
    const [tuyen] = await pool.query(
      `SELECT * FROM TuyenDuong WHERE maTuyen = ?`,
      [id]
    );

    if (tuyen.length === 0) {
      return null;
    }

    // Convert MySQL TINYINT (0/1) to boolean
    return {
      ...tuyen[0],
      trangThai: tuyen[0].trangThai === 1 || tuyen[0].trangThai === true
    };
  },

  // Lấy tuyến đường theo tên
  async getByName(tenTuyen) {
    const [tuyen] = await pool.query(
      `SELECT * FROM TuyenDuong WHERE tenTuyen = ?`,
      [tenTuyen]
    );
    if (tuyen.length === 0) {
      return null;
    }
    // Convert MySQL TINYINT (0/1) to boolean
    return {
      ...tuyen[0],
      trangThai: tuyen[0].trangThai === 1 || tuyen[0].trangThai === true
    };
  },

  // Tạo tuyến đường mới
  async create(data) {
    const {
      tenTuyen,
      diemBatDau,
      diemKetThuc,
      thoiGianUocTinh,
      origin_lat,
      origin_lng,
      dest_lat,
      dest_lng,
      polyline,
      trangThai,
      routeType, // 'di' hoặc 've'
      pairedRouteId, // ID của tuyến đối ứng
    } = data;
    
    // Đảm bảo trangThai mặc định là true (hoạt động) nếu không được cung cấp
    // trangThai có thể là boolean true/false, hoặc undefined
    const finalTrangThai = trangThai !== undefined ? (trangThai === true || trangThai === 1 || trangThai === 'true' || trangThai === '1') : true;
    
    const [result] = await pool.query(
      `INSERT INTO TuyenDuong 
       (tenTuyen, diemBatDau, diemKetThuc, thoiGianUocTinh, 
        origin_lat, origin_lng, dest_lat, dest_lng, polyline, trangThai, routeType, pairedRouteId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenTuyen,
        diemBatDau,
        diemKetThuc,
        thoiGianUocTinh,
        origin_lat || null,
        origin_lng || null,
        dest_lat || null,
        dest_lng || null,
        polyline || null,
        finalTrangThai,
        routeType || null,
        pairedRouteId || null,
      ]
    );
    return result.insertId;
  },

  // Cập nhật tuyến đường (partial update)
  async update(id, data) {
    const fields = [];
    const values = [];

    if (data.tenTuyen !== undefined) {
      fields.push("tenTuyen = ?");
      values.push(data.tenTuyen);
    }
    if (data.diemBatDau !== undefined) {
      fields.push("diemBatDau = ?");
      values.push(data.diemBatDau);
    }
    if (data.diemKetThuc !== undefined) {
      fields.push("diemKetThuc = ?");
      values.push(data.diemKetThuc);
    }
    if (data.thoiGianUocTinh !== undefined) {
      fields.push("thoiGianUocTinh = ?");
      values.push(data.thoiGianUocTinh);
    }
    if (data.origin_lat !== undefined) {
      fields.push("origin_lat = ?");
      values.push(data.origin_lat);
    }
    if (data.origin_lng !== undefined) {
      fields.push("origin_lng = ?");
      values.push(data.origin_lng);
    }
    if (data.dest_lat !== undefined) {
      fields.push("dest_lat = ?");
      values.push(data.dest_lat);
    }
    if (data.dest_lng !== undefined) {
      fields.push("dest_lng = ?");
      values.push(data.dest_lng);
    }
    if (data.polyline !== undefined) {
      fields.push("polyline = ?");
      values.push(data.polyline);
    }
    if (data.trangThai !== undefined) {
      fields.push("trangThai = ?");
      values.push(data.trangThai);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const query = `UPDATE TuyenDuong SET ${fields.join(
      ", "
    )} WHERE maTuyen = ?`;

    const [result] = await pool.query(query, values);
    return result.affectedRows > 0;
  },

  // Xóa tuyến đường (soft delete)
  async delete(id) {
    const [result] = await pool.query(
      "UPDATE TuyenDuong SET trangThai = FALSE WHERE maTuyen = ?",
      [id]
    );
    return result.affectedRows > 0;
  },

  // Xóa vĩnh viễn
  async hardDelete(id) {
    const [result] = await pool.query(
      "DELETE FROM TuyenDuong WHERE maTuyen = ?",
      [id]
    );
    return result.affectedRows > 0;
  },

  // Thống kê tuyến đường
  async getStats() {
    const [totalResult] = await pool.query(
      `SELECT COUNT(*) as total FROM TuyenDuong WHERE trangThai = TRUE`
    );

    const [avgTime] = await pool.query(
      `SELECT AVG(thoiGianUocTinh) as avgTime FROM TuyenDuong WHERE trangThai = TRUE`
    );

    return {
      total: totalResult[0].total || 0,
      avgTime: Math.round(avgTime[0].avgTime || 0),
    };
  },
};

export default TuyenDuongModel;
