import HocSinhModel from "../models/HocSinhModel.js";
import NguoiDungModel from "../models/NguoiDungModel.js";

class StudentService {
  static async list(options = {}) {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      lop, 
      sortBy = "maHocSinh", 
      sortDir = "DESC" 
    } = options;
    
    // Get all students (model doesn't support filtering yet)
    let students = await HocSinhModel.getWithParentInfo();
    let totalCount = students.length;

    // Filter by search
    if (search) {
      students = students.filter(
        (s) =>
          s.hoTen?.toLowerCase().includes(search.toLowerCase()) ||
          s.maHocSinh?.toString().includes(search.toLowerCase())
      );
      totalCount = students.length;
    }

    // Filter by class
    if (lop) {
      students = students.filter((s) => s.lop === lop);
      totalCount = students.length;
    }

    // Sort
    if (sortBy === "hoTen") {
      students.sort((a, b) => {
        const aVal = a.hoTen || "";
        const bVal = b.hoTen || "";
        return sortDir === "ASC" 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      });
    } else if (sortBy === "maHocSinh") {
      students.sort((a, b) => {
        const aVal = a.maHocSinh || 0;
        const bVal = b.maHocSinh || 0;
        return sortDir === "ASC" ? aVal - bVal : bVal - aVal;
      });
    }

    // Paginate
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitValue = Math.max(1, Math.min(200, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitValue;
    const paginatedStudents = students.slice(offset, offset + limitValue);

    return {
      data: paginatedStudents,
      pagination: {
        page: pageNum,
        limit: limitValue,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitValue),
      },
    };
  }

  static async getById(id) {
    const s = await HocSinhModel.getById(id);
    if (!s) throw new Error("STUDENT_NOT_FOUND");
    return s;
  }

  static async create(payload) {
    const { hoTen, ngaySinh, lop, maPhuHuynh } = payload;
    if (!hoTen || !ngaySinh || !lop) throw new Error("MISSING_REQUIRED_FIELDS");

    const age = new Date().getFullYear() - new Date(ngaySinh).getFullYear();
    if (age < 6 || age > 18) throw new Error("INVALID_AGE");

    if (maPhuHuynh) {
      const parent = await NguoiDungModel.getById(maPhuHuynh);
      if (!parent || parent.vaiTro !== "phu_huynh")
        throw new Error("PARENT_NOT_FOUND");
    }

    const id = await HocSinhModel.create(payload);
    return await HocSinhModel.getById(id);
  }

  static async update(id, data) {
    const student = await HocSinhModel.getById(id);
    if (!student) throw new Error("STUDENT_NOT_FOUND");

    if (data.ngaySinh) {
      const age =
        new Date().getFullYear() - new Date(data.ngaySinh).getFullYear();
      if (age < 6 || age > 18) throw new Error("INVALID_AGE");
    }

    if (data.maPhuHuynh) {
      const parent = await NguoiDungModel.getById(data.maPhuHuynh);
      if (!parent || parent.vaiTro !== "phu_huynh")
        throw new Error("PARENT_NOT_FOUND");
    }

    await HocSinhModel.update(id, data);
    return await HocSinhModel.getById(id);
  }

  static async delete(id) {
    const s = await HocSinhModel.getById(id);
    if (!s) throw new Error("STUDENT_NOT_FOUND");
    await HocSinhModel.delete(id);
    return true;
  }

  static async assignParent(studentId, parentId) {
    const s = await HocSinhModel.getById(studentId);
    if (!s) throw new Error("STUDENT_NOT_FOUND");
    const p = await NguoiDungModel.getById(parentId);
    if (!p || p.vaiTro !== "phu_huynh") throw new Error("PARENT_NOT_FOUND");
    await HocSinhModel.update(studentId, { maPhuHuynh: parentId });
    return await HocSinhModel.getById(studentId);
  }
}

export default StudentService;
