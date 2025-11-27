const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const BusController = require("../../src/controllers/BusController.js");
const XeBuytModel = require("../../src/models/XeBuytModel.js");

// Mock dependencies
jest.mock("../../src/models/XeBuytModel.js");
jest.mock("../../src/models/LichTrinhModel.js");
jest.mock("../../src/models/TaiXeModel.js");
jest.mock("../../src/models/ChuyenDiModel.js");

describe("BusController", () => {
  let app;
  let mockToken;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock JWT token
    mockToken = jwt.sign(
      { userId: 1, email: "test@test.com", vaiTro: "quan_tri" },
      process.env.JWT_SECRET || "test_secret"
    );

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe("getAll", () => {
    it("should return all buses with pagination", async () => {
      const mockBuses = [
        {
          maXe: 1,
          bienSoXe: "29A-12345",
          dongXe: "Hyundai",
          sucChua: 29,
          trangThai: "hoat_dong",
        },
        {
          maXe: 2,
          bienSoXe: "29B-67890",
          dongXe: "Ford",
          sucChua: 16,
          trangThai: "hoat_dong",
        },
      ];

      XeBuytModel.getAll.mockResolvedValue(mockBuses);

      app.get("/buses", (req, res) => {
        req.user = { userId: 1, vaiTro: "quan_tri" };
        BusController.getAll(req, res);
      });

      const response = await request(app)
        .get("/buses")
        .set("Authorization", `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockBuses);
      expect(response.body.pagination).toBeDefined();
      expect(XeBuytModel.getAll).toHaveBeenCalled();
    });

    it("should handle search and status filters", async () => {
      const mockBuses = [
        {
          maXe: 1,
          bienSoXe: "29A-12345",
          dongXe: "Hyundai",
          sucChua: 29,
          trangThai: "hoat_dong",
        },
      ];

      XeBuytModel.search.mockResolvedValue(mockBuses);

      app.get("/buses", (req, res) => {
        req.user = { userId: 1, vaiTro: "quan_tri" };
        BusController.getAll(req, res);
      });

      const response = await request(app)
        .get("/buses?search=29A&trangThai=hoat_dong")
        .set("Authorization", `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(XeBuytModel.search).toHaveBeenCalledWith("29A");
    });

    it("should validate pagination parameters", async () => {
      app.get("/buses", (req, res) => {
        req.user = { userId: 1, vaiTro: "quan_tri" };
        BusController.getAll(req, res);
      });

      const response = await request(app)
        .get("/buses?page=0&limit=101")
        .set("Authorization", `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.itemsPerPage).toBe(100);
    });
  });

  describe("getById", () => {
    it("should return bus by id", async () => {
      const mockBus = {
        maXe: 1,
        bienSoXe: "29A-12345",
        dongXe: "Hyundai",
        sucChua: 29,
        trangThai: "hoat_dong",
      };

      XeBuytModel.getById.mockResolvedValue(mockBus);

      app.get("/buses/:id", (req, res) => {
        req.user = { userId: 1, vaiTro: "quan_tri" };
        BusController.getById(req, res);
      });

      const response = await request(app)
        .get("/buses/1")
        .set("Authorization", `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockBus);
      expect(XeBuytModel.getById).toHaveBeenCalledWith(1);
    });

    it("should return 404 when bus not found", async () => {
      XeBuytModel.getById.mockResolvedValue(null);

      app.get("/buses/:id", (req, res) => {
        req.user = { userId: 1, vaiTro: "quan_tri" };
        BusController.getById(req, res);
      });

      const response = await request(app)
        .get("/buses/999")
        .set("Authorization", `Bearer ${mockToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Không tìm thấy xe buýt");
    });
  });

  describe("create", () => {
    it("should create new bus successfully", async () => {
      const busData = {
        bienSoXe: "29A-12345",
        dongXe: "Hyundai",
        sucChua: 29,
        trangThai: "hoat_dong",
      };

      const createdBus = { maXe: 1, ...busData };

      XeBuytModel.getByPlate.mockResolvedValue(null);
      XeBuytModel.create.mockResolvedValue(1);
      XeBuytModel.getById.mockResolvedValue(createdBus);

      app.post("/buses", (req, res) => {
        req.user = { userId: 1, vaiTro: "quan_tri" };
        BusController.create(req, res);
      });

      const response = await request(app)
        .post("/buses")
        .set("Authorization", `Bearer ${mockToken}`)
        .send(busData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(createdBus);
      expect(XeBuytModel.create).toHaveBeenCalledWith(busData);
    });

    it("should return error for invalid license plate", async () => {
      const busData = {
        bienSoXe: "invalid-plate",
        dongXe: "Hyundai",
        sucChua: 29,
      };

      app.post("/buses", (req, res) => {
        req.user = { userId: 1, vaiTro: "quan_tri" };
        BusController.create(req, res);
      });

      const response = await request(app)
        .post("/buses")
        .set("Authorization", `Bearer ${mockToken}`)
        .send(busData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Biển số xe không hợp lệ");
    });

    it("should return error for invalid capacity", async () => {
      const busData = {
        bienSoXe: "29A-12345",
        dongXe: "Hyundai",
        sucChua: 5,
      };

      app.post("/buses", (req, res) => {
        req.user = { userId: 1, vaiTro: "quan_tri" };
        BusController.create(req, res);
      });

      const response = await request(app)
        .post("/buses")
        .set("Authorization", `Bearer ${mockToken}`)
        .send(busData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        "Sức chứa phải từ 10 đến 100 người"
      );
    });

    it("should return error for duplicate license plate", async () => {
      const busData = {
        bienSoXe: "29A-12345",
        dongXe: "Hyundai",
        sucChua: 29,
      };

      XeBuytModel.getByPlate.mockResolvedValue({ maXe: 1, ...busData });

      app.post("/buses", (req, res) => {
        req.user = { userId: 1, vaiTro: "quan_tri" };
        BusController.create(req, res);
      });

      const response = await request(app)
        .post("/buses")
        .set("Authorization", `Bearer ${mockToken}`)
        .send(busData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Biển số xe đã tồn tại trong hệ thống"
      );
    });
  });

  describe("update", () => {
    it("should update bus successfully", async () => {
      const existingBus = {
        maXe: 1,
        bienSoXe: "29A-12345",
        dongXe: "Hyundai",
        sucChua: 29,
        trangThai: "hoat_dong",
      };

      const updateData = {
        dongXe: "Hyundai Updated",
        sucChua: 30,
      };

      const updatedBus = { ...existingBus, ...updateData };

      XeBuytModel.getById.mockResolvedValue(existingBus);
      XeBuytModel.update.mockResolvedValue(true);
      XeBuytModel.getById
        .mockResolvedValueOnce(existingBus)
        .mockResolvedValueOnce(updatedBus);

      app.put("/buses/:id", (req, res) => {
        req.user = { userId: 1, vaiTro: "quan_tri" };
        BusController.update(req, res);
      });

      const response = await request(app)
        .put("/buses/1")
        .set("Authorization", `Bearer ${mockToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedBus);
      expect(XeBuytModel.update).toHaveBeenCalledWith(1, updateData);
    });

    it("should return 404 when bus not found", async () => {
      XeBuytModel.getById.mockResolvedValue(null);

      app.put("/buses/:id", (req, res) => {
        req.user = { userId: 1, vaiTro: "quan_tri" };
        BusController.update(req, res);
      });

      const response = await request(app)
        .put("/buses/999")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ dongXe: "Updated" })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Không tìm thấy xe buýt");
    });
  });

  describe("delete", () => {
    it("should delete bus successfully", async () => {
      const existingBus = {
        maXe: 1,
        bienSoXe: "29A-12345",
        dongXe: "Hyundai",
        sucChua: 29,
        trangThai: "hoat_dong",
      };

      XeBuytModel.getById.mockResolvedValue(existingBus);
      XeBuytModel.delete.mockResolvedValue(true);

      app.delete("/buses/:id", (req, res) => {
        req.user = { userId: 1, vaiTro: "quan_tri" };
        BusController.delete(req, res);
      });

      const response = await request(app)
        .delete("/buses/1")
        .set("Authorization", `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Xóa xe buýt thành công");
      expect(XeBuytModel.delete).toHaveBeenCalledWith(1);
    });

    it("should return 404 when bus not found", async () => {
      XeBuytModel.getById.mockResolvedValue(null);

      app.delete("/buses/:id", (req, res) => {
        req.user = { userId: 1, vaiTro: "quan_tri" };
        BusController.delete(req, res);
      });

      const response = await request(app)
        .delete("/buses/999")
        .set("Authorization", `Bearer ${mockToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Không tìm thấy xe buýt");
    });
  });

  describe("updateLocation", () => {
    it("should update bus location successfully", async () => {
      const existingBus = {
        maXe: 1,
        bienSoXe: "29A-12345",
        trangThai: "hoat_dong",
      };

      const locationData = {
        viDo: 10.7409,
        kinhDo: 106.7208,
        tocDo: 50,
        huongDi: 180,
      };

      XeBuytModel.getById.mockResolvedValue(existingBus);
      XeBuytModel.updateLocation.mockResolvedValue(true);

      app.post("/buses/:id/position", (req, res) => {
        req.user = { userId: 1, vaiTro: "tai_xe" };
        BusController.updateLocation(req, res);
      });

      const response = await request(app)
        .post("/buses/1/position")
        .set("Authorization", `Bearer ${mockToken}`)
        .send(locationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.messageMutation).toBe(
        "Cập nhật vị trí xe buýt thành công"
      );
      expect(XeBuytModel.updateLocation).toHaveBeenCalledWith(
        1,
        expect.objectContaining(locationData)
      );
    });

    it("should return error for invalid coordinates", async () => {
      const locationData = {
        viDo: 91, // Invalid latitude
        kinhDo: 106.7208,
        tocDo: 50,
        huongDi: 180,
      };

      app.post("/buses/:id/position", (req, res) => {
        req.user = { userId: 1, vaiTro: "tai_xe" };
        BusController.updateLocation(req, res);
      });

      const response = await request(app)
        .post("/buses/1/position")
        .set("Authorization", `Bearer ${mockToken}`)
        .send(locationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Vĩ độ phải từ -90 đến 90");
    });
  });

  describe("getStats", () => {
    it("should return bus statistics", async () => {
      const mockBuses = [
        { maXe: 1, sucChua: 29, trangThai: "hoat_dong" },
        { maXe: 2, sucChua: 16, trangThai: "hoat_dong" },
        { maXe: 3, sucChua: 15, trangThai: "bao_tri" },
      ];

      XeBuytModel.getAll.mockResolvedValue(mockBuses);

      app.get("/buses/stats", (req, res) => {
        req.user = { userId: 1, vaiTro: "quan_tri" };
        BusController.getStats(req, res);
      });

      const response = await request(app)
        .get("/buses/stats")
        .set("Authorization", `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.byStatus.hoat_dong).toBe(2);
      expect(response.body.data.byStatus.bao_tri).toBe(1);
      expect(response.body.data.averageCapacity).toBe(20);
    });
  });
});
