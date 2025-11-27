import ChuyenDiModel from "../models/ChuyenDiModel.js";
import LichTrinhModel from "../models/LichTrinhModel.js";

class TripService {
  static async list(options = {}) {
    const { page = 1, limit = 10 } = options;
    const data = await ChuyenDiModel.getAll(options);
    const total = await ChuyenDiModel.count(options);
    return {
      data,
      pagination: {
        page: +page,
        limit: +limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id) {
    const t = await ChuyenDiModel.getById(id);
    if (!t) throw new Error("TRIP_NOT_FOUND");
    return t;
  }

  static async create(payload) {
    const { maLichTrinh, ngayChay } = payload;
    if (!maLichTrinh || !ngayChay) throw new Error("MISSING_REQUIRED_FIELDS");

    const schedule = await LichTrinhModel.getById(maLichTrinh);
    if (!schedule) throw new Error("SCHEDULE_NOT_FOUND");

    const id = await ChuyenDiModel.create(payload);
    return await ChuyenDiModel.getById(id);
  }

  static async update(id, data) {
    const existing = await ChuyenDiModel.getById(id);
    if (!existing) throw new Error("TRIP_NOT_FOUND");
    await ChuyenDiModel.update(id, data);
    return await ChuyenDiModel.getById(id);
  }

  static async delete(id) {
    const t = await ChuyenDiModel.getById(id);
    if (!t) throw new Error("TRIP_NOT_FOUND");
    await ChuyenDiModel.delete(id);
    return true;
  }

  static async start(id, userId) {
    const t = await ChuyenDiModel.getById(id);
    if (!t) throw new Error("TRIP_NOT_FOUND");
    await ChuyenDiModel.update(id, {
      trangThai: "dang_thuc_hien",
      batDauLuc: new Date(),
    });
    return await ChuyenDiModel.getById(id);
  }

  static async complete(id, userId) {
    const t = await ChuyenDiModel.getById(id);
    if (!t) throw new Error("TRIP_NOT_FOUND");
    await ChuyenDiModel.update(id, {
      trangThai: "da_hoan_thanh",
      ketThucLuc: new Date(),
    });
    return await ChuyenDiModel.getById(id);
  }
}

export default TripService;