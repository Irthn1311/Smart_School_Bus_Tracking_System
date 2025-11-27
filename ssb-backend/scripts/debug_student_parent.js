import pool from "../src/config/db.js";

async function checkStudent() {
  try {
    console.log("Checking student 'Nguyễn Gia Bảo'...");
    const [students] = await pool.query(
      "SELECT * FROM HocSinh WHERE hoTen LIKE ?",
      ["%Nguyễn Gia Bảo%"]
    );

    if (students.length === 0) {
      console.log("Student not found!");
      return;
    }

    for (const student of students) {
      console.log("Student found:", student);
      if (student.maPhuHuynh) {
        const [parents] = await pool.query(
          "SELECT * FROM NguoiDung WHERE maNguoiDung = ?",
          [student.maPhuHuynh]
        );
        console.log("Parent info:", parents[0]);
      } else {
        console.log("Student has no parent assigned!");
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit();
  }
}

checkStudent();
