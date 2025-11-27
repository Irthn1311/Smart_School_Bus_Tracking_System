import pool from "../config/db.js";

const NguoiDungModel = {
  // Lấy tất cả người dùng
  async getAll(filters = {}) {
    let query = "SELECT * FROM NguoiDung WHERE 1=1";
    const params = [];

    if (filters.vaiTro) {
      query += " AND vaiTro = ?";
      params.push(filters.vaiTro);
    }
    if (filters.trangThai !== undefined) {
      query += " AND trangThai = ?";
      params.push(filters.trangThai);
    }

    query += " ORDER BY ngayTao DESC";

    const [rows] = await pool.query(query, params);
    // Không trả về mật khẩu
    return rows.map(({ matKhau, ...user }) => user);
  },

  // Lấy người dùng theo ID
  async getById(id) {
    const [rows] = await pool.query(
      "SELECT * FROM NguoiDung WHERE maNguoiDung = ?",
      [id]
    );
    if (rows.length === 0) return null;

    const { matKhau, ...user } = rows[0];
    return user;
  },

  // Lấy người dùng theo email (dùng cho login)
  async getByEmail(email) {
    const [rows] = await pool.query("SELECT * FROM NguoiDung WHERE email = ?", [
      email,
    ]);
    return rows[0]; // Trả về cả mật khẩu để verify
  },

  // Lấy người dùng theo số điện thoại
  async getByPhone(soDienThoai) {
    const [rows] = await pool.query(
      "SELECT * FROM NguoiDung WHERE soDienThoai = ?",
      [soDienThoai]
    );
    if (rows.length === 0) return null;

    const { matKhau, ...user } = rows[0];
    return user;
  },

  // Tạo người dùng mới
  async create(data) {
    const { hoTen, email, matKhau, soDienThoai, anhDaiDien, vaiTro } = data;
    const [result] = await pool.query(
      `INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, anhDaiDien, vaiTro)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [hoTen, email, matKhau, soDienThoai, anhDaiDien, vaiTro]
    );
    return result.insertId;
  },

  // Cập nhật người dùng (partial update)
  async update(id, data) {
    const fields = [];
    const values = [];

    if (data.hoTen !== undefined) {
      fields.push("hoTen = ?");
      values.push(data.hoTen);
    }
    if (data.email !== undefined) {
      fields.push("email = ?");
      values.push(data.email);
    }
    if (data.matKhau !== undefined) {
      fields.push("matKhau = ?");
      values.push(data.matKhau);
    }
    if (data.soDienThoai !== undefined) {
      fields.push("soDienThoai = ?");
      values.push(data.soDienThoai);
    }
    if (data.anhDaiDien !== undefined) {
      fields.push("anhDaiDien = ?");
      values.push(data.anhDaiDien);
    }
    if (data.vaiTro !== undefined) {
      fields.push("vaiTro = ?");
      values.push(data.vaiTro);
    }
    if (data.trangThai !== undefined) {
      fields.push("trangThai = ?");
      values.push(data.trangThai);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const query = `UPDATE NguoiDung SET ${fields.join(
      ", "
    )} WHERE maNguoiDung = ?`;

    const [result] = await pool.query(query, values);
    return result.affectedRows > 0;
  },

  // Xóa người dùng (soft delete)
  async delete(id) {
    const [result] = await pool.query(
      "UPDATE NguoiDung SET trangThai = FALSE WHERE maNguoiDung = ?",
      [id]
    );
    return result.affectedRows > 0;
  },

  // Xóa vĩnh viễn
  async hardDelete(id) {
    const [result] = await pool.query(
      "DELETE FROM NguoiDung WHERE maNguoiDung = ?",
      [id]
    );
    return result.affectedRows > 0;
  },

  // Thay đổi mật khẩu
  async changePassword(id, matKhauMoi) {
    const [result] = await pool.query(
      "UPDATE NguoiDung SET matKhau = ? WHERE maNguoiDung = ?",
      [matKhauMoi, id]
    );
    return result.affectedRows > 0;
  },

  // Kiểm tra email đã tồn tại
  async emailExists(email, excludeId = null) {
    let query = "SELECT COUNT(*) as count FROM NguoiDung WHERE email = ?";
    const params = [email];

    if (excludeId) {
      query += " AND maNguoiDung != ?";
      params.push(excludeId);
    }

    const [rows] = await pool.query(query, params);
    return rows[0].count > 0;
  },

  // Kiểm tra SĐT đã tồn tại
  async phoneExists(soDienThoai, excludeId = null) {
    let query = "SELECT COUNT(*) as count FROM NguoiDung WHERE soDienThoai = ?";
    const params = [soDienThoai];

    if (excludeId) {
      query += " AND maNguoiDung != ?";
      params.push(excludeId);
    }

    const [rows] = await pool.query(query, params);
    return rows[0].count > 0;
  },

  // Lấy người dùng theo vai trò
  async getByRole(vaiTro) {
    const [rows] = await pool.query(
      `SELECT * FROM NguoiDung WHERE vaiTro = ? AND trangThai = TRUE`,
      [vaiTro]
    );
    // Không trả về mật khẩu
    return rows.map(({ matKhau, ...user }) => user);
  },

  // Thống kê người dùng
  async getStats() {
    const [byRole] = await pool.query(
      `SELECT vaiTro, COUNT(*) as count 
       FROM NguoiDung 
       WHERE trangThai = TRUE 
       GROUP BY vaiTro`
    );

    const [totalResult] = await pool.query(
      `SELECT COUNT(*) as total FROM NguoiDung WHERE trangThai = TRUE`
    );

    return {
      byRole: byRole || [],
      total: totalResult[0].total || 0,
    };
  },
};

export default NguoiDungModel;
