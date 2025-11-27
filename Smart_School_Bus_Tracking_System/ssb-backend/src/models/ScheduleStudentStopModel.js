import pool from "../config/db.js";

const ScheduleStudentStopModel = {
  // Lấy tất cả students của một schedule
  async getByScheduleId(maLichTrinh) {
    const [rows] = await pool.query(
      `SELECT 
        sss.*,
        hs.hoTen,
        hs.lop,
        hs.anhDaiDien,
        hs.diaChi,
        d.tenDiem,
        d.address as stopAddress,
        d.viDo as stopLat,
        d.kinhDo as stopLng,
        rs.sequence
       FROM schedule_student_stops sss
       LEFT JOIN HocSinh hs ON sss.maHocSinh = hs.maHocSinh
       LEFT JOIN DiemDung d ON sss.maDiem = d.maDiem
       LEFT JOIN LichTrinh lt ON sss.maLichTrinh = lt.maLichTrinh
       LEFT JOIN route_stops rs ON rs.route_id = lt.maTuyen AND rs.stop_id = sss.maDiem
       WHERE sss.maLichTrinh = ?
       ORDER BY sss.thuTuDiem, hs.hoTen`,
      [maLichTrinh]
    );
    return rows;
  },

  // Lấy students tại một điểm dừng cụ thể của schedule
  async getByScheduleAndStop(maLichTrinh, thuTuDiem) {
    const [rows] = await pool.query(
      `SELECT 
        sss.*,
        hs.hoTen,
        hs.lop,
        hs.anhDaiDien,
        hs.diaChi,
        d.tenDiem,
        d.address as stopAddress
       FROM schedule_student_stops sss
       LEFT JOIN HocSinh hs ON sss.maHocSinh = hs.maHocSinh
       LEFT JOIN DiemDung d ON sss.maDiem = d.maDiem
       WHERE sss.maLichTrinh = ? AND sss.thuTuDiem = ?
       ORDER BY hs.hoTen`,
      [maLichTrinh, thuTuDiem]
    );
    return rows;
  },

  // Tạo mapping mới
  async create(data) {
    const { maLichTrinh, maHocSinh, thuTuDiem, maDiem } = data;
    const [result] = await pool.query(
      `INSERT INTO schedule_student_stops (maLichTrinh, maHocSinh, thuTuDiem, maDiem)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         thuTuDiem = VALUES(thuTuDiem),
         maDiem = VALUES(maDiem),
         ngayCapNhat = CURRENT_TIMESTAMP`,
      [maLichTrinh, maHocSinh, thuTuDiem, maDiem]
    );
    return result.insertId;
  },

  // Tạo nhiều mapping cùng lúc
  async bulkCreate(maLichTrinh, students) {
    if (!students || students.length === 0) {
      console.log(`[ScheduleStudentStopModel] bulkCreate: No students provided for schedule ${maLichTrinh}`);
      return 0;
    }

    console.log(`[ScheduleStudentStopModel] bulkCreate: Attempting to create ${students.length} student-stop mappings for schedule ${maLichTrinh}`);

    // Validate data
    const validStudents = students.filter(
      (s) => s.maHocSinh && s.thuTuDiem && s.maDiem
    );

    if (validStudents.length === 0) {
      console.warn(`[ScheduleStudentStopModel] bulkCreate: No valid students after filtering. Input:`, students);
      return 0;
    }

    console.log(`[ScheduleStudentStopModel] bulkCreate: ${validStudents.length} valid students after filtering`);

    // Build values for bulk insert
    const values = validStudents.map(
      (s) => `(${maLichTrinh}, ${s.maHocSinh}, ${s.thuTuDiem}, ${s.maDiem})`
    );

    const query = `
      INSERT INTO schedule_student_stops (maLichTrinh, maHocSinh, thuTuDiem, maDiem)
      VALUES ${values.join(", ")}
      ON DUPLICATE KEY UPDATE
        thuTuDiem = VALUES(thuTuDiem),
        maDiem = VALUES(maDiem),
        ngayCapNhat = CURRENT_TIMESTAMP
    `;

    try {
      const [result] = await pool.query(query);
      console.log(`[ScheduleStudentStopModel] bulkCreate: ✅ Inserted ${result.affectedRows} rows (inserted: ${result.insertId ? 'yes' : 'no'}, affected: ${result.affectedRows})`);
      return result.affectedRows;
    } catch (error) {
      console.error(`[ScheduleStudentStopModel] bulkCreate: ❌ SQL Error:`, error.message);
      console.error(`[ScheduleStudentStopModel] bulkCreate: Query:`, query);
      console.error(`[ScheduleStudentStopModel] bulkCreate: Values sample:`, values.slice(0, 3));
      throw error;
    }
  },

  // Xóa tất cả mapping của một schedule
  async deleteBySchedule(maLichTrinh) {
    const [result] = await pool.query(
      `DELETE FROM schedule_student_stops WHERE maLichTrinh = ?`,
      [maLichTrinh]
    );
    return result.affectedRows;
  },

  // Copy mapping từ schedule sang TrangThaiHocSinh khi tạo Trip
  async copyToTrip(maLichTrinh, maChuyen) {
    // Lấy tất cả students từ schedule_student_stops
    const scheduleStudents = await this.getByScheduleId(maLichTrinh);

    if (scheduleStudents.length === 0) {
      console.log(`[ScheduleStudentStopModel] No students found in schedule ${maLichTrinh}`);
      return 0;
    }

    console.log(`[ScheduleStudentStopModel] Copying ${scheduleStudents.length} students from schedule ${maLichTrinh} to trip ${maChuyen}`);

    // 🔥 FIX: Đảm bảo thuTuDiem khớp với sequence của route stops
    // Nếu scheduleStudents có sequence từ route_stops, dùng nó; nếu không, dùng thuTuDiem
    const values = scheduleStudents.map((s) => {
      // Ưu tiên dùng sequence từ route_stops nếu có, nếu không dùng thuTuDiem
      const thuTuDiemDon = s.sequence !== null && s.sequence !== undefined ? s.sequence : s.thuTuDiem;
      return `(${maChuyen}, ${s.maHocSinh}, ${thuTuDiemDon}, 'cho_don', NULL, NULL)`;
    });

    const query = `
      INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai, thoiGianThucTe, ghiChu)
      VALUES ${values.join(", ")}
      ON DUPLICATE KEY UPDATE
        thuTuDiemDon = VALUES(thuTuDiemDon),
        ngayCapNhat = CURRENT_TIMESTAMP
    `;

    const [result] = await pool.query(query);
    console.log(`[ScheduleStudentStopModel] ✅ Copied ${result.affectedRows} students to trip ${maChuyen}`);
    return result.affectedRows;
  },

  // Xóa một mapping cụ thể
  async delete(maLichTrinh, maHocSinh) {
    const [result] = await pool.query(
      `DELETE FROM schedule_student_stops 
       WHERE maLichTrinh = ? AND maHocSinh = ?`,
      [maLichTrinh, maHocSinh]
    );
    return result.affectedRows > 0;
  },
};

export default ScheduleStudentStopModel;

