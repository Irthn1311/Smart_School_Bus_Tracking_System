import TaiXeModel from "../models/TaiXeModel.js";
import NguoiDungModel from "../models/NguoiDungModel.js";
import bcrypt from "bcryptjs";

class DriverService {
  static async list(options = {}) {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status, 
      sortBy = "maTaiXe", 
      sortDir = "DESC" 
    } = options;
    
    // Get all drivers (model doesn't support filtering yet)
    let drivers = await TaiXeModel.getAll();
    let totalCount = drivers.length;

    // Filter by status
    if (status) {
      drivers = drivers.filter((d) => d.trangThai === status);
      totalCount = drivers.length;
    }

    // Filter by search
    if (search) {
      drivers = drivers.filter(
        (d) =>
          d.hoTen?.toLowerCase().includes(search.toLowerCase()) ||
          d.email?.toLowerCase().includes(search.toLowerCase()) ||
          d.soDienThoai?.includes(search)
      );
      totalCount = drivers.length;
    }

    // Sort
    if (sortBy === "hoTen") {
      drivers.sort((a, b) => {
        const aVal = a.hoTen || "";
        const bVal = b.hoTen || "";
        return sortDir === "ASC" 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      });
    } else if (sortBy === "maTaiXe") {
      drivers.sort((a, b) => {
        const aVal = a.maTaiXe || 0;
        const bVal = b.maTaiXe || 0;
        return sortDir === "ASC" ? aVal - bVal : bVal - aVal;
      });
    }

    // Paginate
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitValue = Math.max(1, Math.min(200, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitValue;
    const paginatedDrivers = drivers.slice(offset, offset + limitValue);

    return {
      data: paginatedDrivers,
      pagination: {
        page: pageNum,
        limit: limitValue,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitValue),
      },
    };
  }

  static async getById(id) {
    const d = await TaiXeModel.getById(id);
    if (!d) throw new Error("DRIVER_NOT_FOUND");
    return d;
  }

  static async create(payload) {
    const { hoTen, email, matKhau, soBangLai, soDienThoai } = payload;
    if (!hoTen || !email || !matKhau || !soBangLai)
      throw new Error("MISSING_REQUIRED_FIELDS");

    if (await NguoiDungModel.emailExists(email))
      throw new Error("EMAIL_EXISTS");
    if (soDienThoai && (await NguoiDungModel.phoneExists(soDienThoai)))
      throw new Error("PHONE_EXISTS");
    if (await TaiXeModel.getByLicense(soBangLai))
      throw new Error("LICENSE_EXISTS");

    const hashed = await bcrypt.hash(matKhau, 10);
    const userId = await NguoiDungModel.create({
      hoTen,
      email,
      matKhau: hashed,
      soDienThoai,
      vaiTro: "tai_xe",
    });
    await TaiXeModel.create({
      maTaiXe: userId,
      soBangLai,
      ngayHetHanBangLai: payload.ngayHetHanBangLai,
      soNamKinhNghiem: payload.soNamKinhNghiem || 0,
      trangThai: "hoat_dong",
    });
    return await TaiXeModel.getById(userId);
  }

  static async update(id, data) {
    const driver = await TaiXeModel.getById(id);
    if (!driver) throw new Error("DRIVER_NOT_FOUND");

    if (data.soBangLai && data.soBangLai !== driver.soBangLai) {
      if (await TaiXeModel.getByLicense(data.soBangLai))
        throw new Error("LICENSE_EXISTS");
    }
    if (data.soDienThoai && data.soDienThoai !== driver.soDienThoai) {
      if (await NguoiDungModel.phoneExists(data.soDienThoai))
        throw new Error("PHONE_EXISTS");
    }

    // update user fields
    const userChanges = {};
    if (data.hoTen !== undefined) userChanges.hoTen = data.hoTen;
    if (data.soDienThoai !== undefined)
      userChanges.soDienThoai = data.soDienThoai;
    if (Object.keys(userChanges).length)
      await NguoiDungModel.update(id, userChanges);

    // update driver fields
    const driverChanges = {};
    if (data.soBangLai !== undefined) driverChanges.soBangLai = data.soBangLai;
    if (data.ngayHetHanBangLai !== undefined)
      driverChanges.ngayHetHanBangLai = data.ngayHetHanBangLai;
    if (data.soNamKinhNghiem !== undefined)
      driverChanges.soNamKinhNghiem = data.soNamKinhNghiem;
    if (data.trangThai !== undefined) driverChanges.trangThai = data.trangThai;
    if (Object.keys(driverChanges).length)
      await TaiXeModel.update(id, driverChanges);

    return await TaiXeModel.getById(id);
  }

  static async delete(id) {
    const driver = await TaiXeModel.getById(id);
    if (!driver) throw new Error("DRIVER_NOT_FOUND");
    await TaiXeModel.delete(id);
    await NguoiDungModel.delete(id);
    return true;
  }
}

export default DriverService;
