/**
 * Test Script cho Bus Stop Optimization (Phase 5)
 * 
 * Chạy: node scripts/test_bus_stop_optimization.js
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "school_bus_system",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Test 1: Kiểm tra dữ liệu học sinh
 */
async function testStudentData() {
  console.log("\n=== TEST 1: Kiểm tra dữ liệu học sinh ===");
  
  try {
    // Tổng số học sinh
    const [totalRows] = await pool.query("SELECT COUNT(*) as total FROM HocSinh");
    const total = totalRows[0].total;
    console.log(`✓ Tổng số học sinh: ${total}`);

    // Học sinh có tọa độ
    const [withCoordsRows] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM HocSinh 
      WHERE viDo IS NOT NULL 
        AND kinhDo IS NOT NULL 
        AND !ISNULL(viDo) 
        AND !ISNULL(kinhDo)
        AND trangThai = TRUE
    `);
    const withCoords = withCoordsRows[0].count;
    console.log(`✓ Học sinh có tọa độ hợp lệ: ${withCoords}`);

    // Học sinh không có tọa độ
    const [withoutCoordsRows] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM HocSinh 
      WHERE viDo IS NULL 
        OR kinhDo IS NULL 
        OR ISNULL(viDo) 
        OR ISNULL(kinhDo)
    `);
    const withoutCoords = withoutCoordsRows[0].count;
    console.log(`⚠ Học sinh không có tọa độ: ${withoutCoords}`);

    // Học sinh inactive
    const [inactiveRows] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM HocSinh 
      WHERE trangThai = FALSE OR trangThai IS NULL
    `);
    const inactive = inactiveRows[0].count;
    console.log(`⚠ Học sinh inactive: ${inactive}`);

    // Phân bố theo quận
    const [districtRows] = await pool.query(`
      SELECT 
        CASE 
          WHEN diaChi LIKE '%Quận 7%' THEN 'Quận 7'
          WHEN diaChi LIKE '%Quận 4%' THEN 'Quận 4'
          WHEN diaChi LIKE '%Quận 1%' THEN 'Quận 1'
          WHEN diaChi LIKE '%Quận 2%' THEN 'Quận 2'
          WHEN diaChi LIKE '%Quận 3%' THEN 'Quận 3'
          WHEN diaChi LIKE '%Quận 8%' THEN 'Quận 8'
          WHEN diaChi LIKE '%Quận 10%' THEN 'Quận 10'
          WHEN diaChi LIKE '%Quận 11%' THEN 'Quận 11'
          WHEN diaChi LIKE '%Nhà Bè%' THEN 'Nhà Bè'
          WHEN diaChi LIKE '%Bình Thạnh%' THEN 'Bình Thạnh'
          ELSE 'Khác'
        END AS quan,
        COUNT(*) AS soLuong
      FROM HocSinh
      WHERE viDo IS NOT NULL AND kinhDo IS NOT NULL AND trangThai = TRUE
      GROUP BY quan
      ORDER BY soLuong DESC
    `);
    console.log("\n✓ Phân bố học sinh theo quận:");
    districtRows.forEach((row) => {
      console.log(`  - ${row.quan}: ${row.soLuong} học sinh`);
    });

    // Sample tọa độ
    const [sampleRows] = await pool.query(`
      SELECT maHocSinh, hoTen, viDo, kinhDo, diaChi
      FROM HocSinh
      WHERE viDo IS NOT NULL AND kinhDo IS NOT NULL AND trangThai = TRUE
      LIMIT 5
    `);
    console.log("\n✓ Sample học sinh (5 đầu tiên):");
    sampleRows.forEach((row) => {
      console.log(`  - ${row.hoTen}: (${row.viDo}, ${row.kinhDo}) - ${row.diaChi}`);
    });

    return {
      success: true,
      total,
      withCoords,
      withoutCoords,
      inactive,
      districts: districtRows,
    };
  } catch (error) {
    console.error("✗ Lỗi:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Kiểm tra kết quả Tầng 1 (Greedy Maximum Coverage)
 */
async function testTier1Results() {
  console.log("\n=== TEST 2: Kiểm tra kết quả Tầng 1 ===");

  try {
    // Kiểm tra số điểm dừng được tạo
    const [stopRows] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM DiemDung
    `);
    const totalStops = stopRows[0].total;
    console.log(`✓ Tổng số điểm dừng: ${totalStops}`);

    // Kiểm tra assignments
    const [assignRows] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM HocSinh_DiemDung
    `);
    const totalAssignments = assignRows[0].total;
    console.log(`✓ Tổng số assignments: ${totalAssignments}`);

    // Thống kê học sinh/điểm dừng
    const [statsRows] = await pool.query(`
      SELECT 
        dd.maDiem,
        dd.tenDiem,
        COUNT(hsd.maHocSinh) as studentCount,
        AVG(hsd.khoangCachMet) as avgDistance,
        MAX(hsd.khoangCachMet) as maxDistance,
        MIN(hsd.khoangCachMet) as minDistance
      FROM DiemDung dd
      LEFT JOIN HocSinh_DiemDung hsd ON dd.maDiem = hsd.maDiemDung
      GROUP BY dd.maDiem, dd.tenDiem
      HAVING studentCount > 0
      ORDER BY studentCount DESC
      LIMIT 10
    `);
    console.log("\n✓ Top 10 điểm dừng có nhiều học sinh nhất:");
    statsRows.forEach((row) => {
      console.log(
        `  - ${row.tenDiem}: ${row.studentCount} học sinh, ` +
        `khoảng cách TB: ${parseFloat(row.avgDistance).toFixed(2)}m ` +
        `(min: ${row.minDistance}m, max: ${row.maxDistance}m)`
      );
    });

    // Kiểm tra học sinh chưa được gán
    const [unassignedRows] = await pool.query(`
      SELECT COUNT(*) as total
      FROM HocSinh hs
      WHERE hs.viDo IS NOT NULL 
        AND hs.kinhDo IS NOT NULL 
        AND hs.trangThai = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM HocSinh_DiemDung hsd 
          WHERE hsd.maHocSinh = hs.maHocSinh
        )
    `);
    const unassigned = unassignedRows[0].total;
    console.log(`\n⚠ Học sinh chưa được gán điểm dừng: ${unassigned}`);

    // Validation: Khoảng cách đi bộ
    const [distanceRows] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        AVG(khoangCachMet) as avgDistance,
        MAX(khoangCachMet) as maxDistance,
        MIN(khoangCachMet) as minDistance
      FROM HocSinh_DiemDung
      WHERE khoangCachMet IS NOT NULL
    `);
    if (distanceRows[0].total > 0) {
      console.log("\n✓ Thống kê khoảng cách đi bộ:");
      console.log(
        `  - TB: ${parseFloat(distanceRows[0].avgDistance).toFixed(2)}m, ` +
        `Min: ${distanceRows[0].minDistance}m, ` +
        `Max: ${distanceRows[0].maxDistance}m`
      );
      
      // Cảnh báo nếu khoảng cách quá xa
      if (distanceRows[0].maxDistance > 1000) {
        console.log(`  ⚠ CẢNH BÁO: Có học sinh phải đi bộ > 1km!`);
      }
    }

    return {
      success: true,
      totalStops,
      totalAssignments,
      unassigned,
      stats: statsRows,
      distanceStats: distanceRows[0],
    };
  } catch (error) {
    console.error("✗ Lỗi:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 3: Kiểm tra kết quả Tầng 2 (VRP)
 */
async function testTier2Results() {
  console.log("\n=== TEST 3: Kiểm tra kết quả Tầng 2 ===");

  try {
    // Kiểm tra điểm dừng có demand
    const [demandRows] = await pool.query(`
      SELECT 
        dd.maDiem,
        dd.tenDiem,
        COUNT(hsd.maHocSinh) as demand
      FROM DiemDung dd
      LEFT JOIN HocSinh_DiemDung hsd ON dd.maDiem = hsd.maDiemDung
      GROUP BY dd.maDiem, dd.tenDiem
      HAVING demand > 0
      ORDER BY demand DESC
    `);
    console.log(`✓ Số điểm dừng có học sinh: ${demandRows.length}`);
    
    if (demandRows.length > 0) {
      console.log("\n✓ Top 10 điểm dừng có demand cao nhất:");
      demandRows.slice(0, 10).forEach((row) => {
        console.log(`  - ${row.tenDiem}: ${row.demand} học sinh`);
      });

      // Kiểm tra điểm dừng quá đông (> 40 học sinh)
      const overcrowded = demandRows.filter((r) => r.demand > 40);
      if (overcrowded.length > 0) {
        console.log(`\n⚠ CẢNH BÁO: ${overcrowded.length} điểm dừng có > 40 học sinh:`);
        overcrowded.forEach((row) => {
          console.log(`  - ${row.tenDiem}: ${row.demand} học sinh`);
        });
      }
    }

    return {
      success: true,
      stopsWithDemand: demandRows.length,
      demandStats: demandRows,
      overcrowded: demandRows.filter((r) => r.demand > 40),
    };
  } catch (error) {
    console.error("✗ Lỗi:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 4: Performance Testing
 */
async function testPerformance() {
  console.log("\n=== TEST 4: Performance Testing ===");

  try {
    // Đếm số lượng học sinh
    const [countRows] = await pool.query(`
      SELECT COUNT(*) as total
      FROM HocSinh
      WHERE viDo IS NOT NULL AND kinhDo IS NOT NULL AND trangThai = TRUE
    `);
    const studentCount = countRows[0].total;

    // Đếm số lượng assignments
    const [assignRows] = await pool.query(`
      SELECT COUNT(*) as total FROM HocSinh_DiemDung
    `);
    const assignmentCount = assignRows[0].total;

    // Đếm số điểm dừng
    const [stopRows] = await pool.query(`
      SELECT COUNT(*) as total FROM DiemDung
    `);
    const stopCount = stopRows[0].total;

    console.log(`✓ Số lượng học sinh: ${studentCount}`);
    console.log(`✓ Số lượng assignments: ${assignmentCount}`);
    console.log(`✓ Số điểm dừng: ${stopCount}`);

    // Tính tỷ lệ
    if (studentCount > 0) {
      const coverageRate = ((assignmentCount / studentCount) * 100).toFixed(2);
      console.log(`✓ Tỷ lệ coverage: ${coverageRate}%`);
      
      if (stopCount > 0) {
        const avgStudentsPerStop = (assignmentCount / stopCount).toFixed(2);
        console.log(`✓ TB học sinh/điểm dừng: ${avgStudentsPerStop}`);
      }
    }

    // Đánh giá performance
    console.log("\n✓ Đánh giá Performance:");
    if (studentCount < 50) {
      console.log("  - Quy mô nhỏ (< 50 học sinh): Tốt");
    } else if (studentCount < 200) {
      console.log("  - Quy mô trung bình (50-200 học sinh): Tốt");
    } else if (studentCount < 500) {
      console.log("  - Quy mô lớn (200-500 học sinh): Cần tối ưu");
    } else {
      console.log("  - Quy mô rất lớn (> 500 học sinh): Cần tối ưu nhiều");
    }

    return {
      success: true,
      studentCount,
      assignmentCount,
      stopCount,
      coverageRate: studentCount > 0 ? ((assignmentCount / studentCount) * 100).toFixed(2) : 0,
    };
  } catch (error) {
    console.error("✗ Lỗi:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 5: Validation Rules
 */
async function testValidationRules() {
  console.log("\n=== TEST 5: Validation Rules ===");

  const issues = [];

  try {
    // Rule 1: Mỗi học sinh chỉ được gán 1 điểm dừng
    const [duplicateRows] = await pool.query(`
      SELECT maHocSinh, COUNT(*) as count
      FROM HocSinh_DiemDung
      GROUP BY maHocSinh
      HAVING count > 1
    `);
    if (duplicateRows.length > 0) {
      issues.push(`⚠ Có ${duplicateRows.length} học sinh được gán nhiều điểm dừng`);
      console.log(`⚠ Rule 1 VIOLATION: ${duplicateRows.length} học sinh có > 1 assignment`);
    } else {
      console.log("✓ Rule 1 PASSED: Mỗi học sinh chỉ có 1 assignment");
    }

    // Rule 2: Khoảng cách đi bộ không được quá xa (giả sử max 1km)
    const [farRows] = await pool.query(`
      SELECT COUNT(*) as total
      FROM HocSinh_DiemDung
      WHERE khoangCachMet > 1000
    `);
    if (farRows[0].total > 0) {
      issues.push(`⚠ Có ${farRows[0].total} học sinh phải đi bộ > 1km`);
      console.log(`⚠ Rule 2 VIOLATION: ${farRows[0].total} học sinh đi bộ > 1km`);
    } else {
      console.log("✓ Rule 2 PASSED: Tất cả khoảng cách đi bộ <= 1km");
    }

    // Rule 3: Điểm dừng phải có tọa độ hợp lệ
    const [invalidCoordsRows] = await pool.query(`
      SELECT COUNT(*) as total
      FROM DiemDung
      WHERE viDo IS NULL OR kinhDo IS NULL 
        OR ISNULL(viDo) OR ISNULL(kinhDo)
    `);
    if (invalidCoordsRows[0].total > 0) {
      issues.push(`⚠ Có ${invalidCoordsRows[0].total} điểm dừng không có tọa độ`);
      console.log(`⚠ Rule 3 VIOLATION: ${invalidCoordsRows[0].total} điểm dừng không có tọa độ`);
    } else {
      console.log("✓ Rule 3 PASSED: Tất cả điểm dừng có tọa độ hợp lệ");
    }

    // Rule 4: Không có điểm dừng trùng lặp (cùng tọa độ)
    const [duplicateStopsRows] = await pool.query(`
      SELECT viDo, kinhDo, COUNT(*) as count
      FROM DiemDung
      GROUP BY viDo, kinhDo
      HAVING count > 1
    `);
    if (duplicateStopsRows.length > 0) {
      issues.push(`⚠ Có ${duplicateStopsRows.length} cặp điểm dừng trùng tọa độ`);
      console.log(`⚠ Rule 4 VIOLATION: ${duplicateStopsRows.length} cặp điểm dừng trùng tọa độ`);
    } else {
      console.log("✓ Rule 4 PASSED: Không có điểm dừng trùng lặp");
    }

    return {
      success: issues.length === 0,
      issues,
    };
  } catch (error) {
    console.error("✗ Lỗi:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log("=".repeat(60));
  console.log("BUS STOP OPTIMIZATION TEST SUITE (Phase 5)");
  console.log("=".repeat(60));

  const results = {
    test1: await testStudentData(),
    test2: await testTier1Results(),
    test3: await testTier2Results(),
    test4: await testPerformance(),
    test5: await testValidationRules(),
  };

  console.log("\n" + "=".repeat(60));
  console.log("TỔNG KẾT");
  console.log("=".repeat(60));

  const allPassed = Object.values(results).every((r) => r.success);
  if (allPassed) {
    console.log("✓ TẤT CẢ TESTS ĐỀU PASSED!");
  } else {
    console.log("⚠ MỘT SỐ TESTS CÓ VẤN ĐỀ:");
    Object.entries(results).forEach(([testName, result]) => {
      if (!result.success) {
        console.log(`  - ${testName}: ${result.error || "Failed"}`);
      }
    });
  }

  // Đóng connection
  await pool.end();
  process.exit(allPassed ? 0 : 1);
}

// Chạy tests
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

