# M1-M3 Progress Report

**Date:** 2025-11-11  
**Status:** In Progress  
**Scope:** M1 (Buses/Drivers/Students), M2 (Routes/Stops), M3 (Schedules)

## ✅ Completed

### Backend - Response Envelope & Standardization
- ✅ **BusController**: Chuẩn hóa dùng response helper, pagination với meta format chuẩn
- ✅ **LichTrinhModel.checkConflict()**: Cải thiện trả về chi tiết conflict (bus/driver/schedule) thay vì chỉ boolean
- ✅ **ScheduleService**: Thêm conflict details vào error object
- ✅ **LichTrinhModel.getAll()**: Thêm filter support (maTuyen, maXe, maTaiXe, loaiChuyen, dangApDung)
- ✅ **ScheduleService.list()**: Cải thiện với filters và pagination

### Conflict Detection (M3)
- ✅ Conflict detection trả về chi tiết: scheduleId, conflictType (bus/driver/both), bus info, driver info, time, date
- ✅ ScheduleService.create() và update() throw conflict với details
- ⚠️ ScheduleController.create() và update() đã được sửa một phần nhưng vẫn còn code duplicate cần cleanup

## ⚠️ In Progress

### Backend Controllers
- ⚠️ **ScheduleController**: Đã import ScheduleService và response helper, nhưng vẫn còn code duplicate (create/update vẫn gọi LichTrinhModel trực tiếp)
- ⏳ **DriverController**: Chưa chuẩn hóa
- ⏳ **StudentController**: Chưa chuẩn hóa
- ⏳ **RouteController**: Chưa chuẩn hóa
- ⏳ **StopController**: Chưa chuẩn hóa

### Stops Reorder
- ✅ Endpoint đã có: `POST /api/v1/routes/:id/stops/reorder`
- ⏳ Cần kiểm tra transaction atomic

### Database Indexes
- ⏳ Chưa thêm indexes:
  - `schedules(bus_id, start_time, end_time)`
  - `schedules(driver_id, start_time, end_time)`
  - `stops(route_id, order)`

## ❌ Pending

### Frontend
- ❌ Services: Chuẩn hóa query builder cho tất cả entities
- ❌ Conflict UI: Banner hiển thị 409 conflict với details
- ❌ Stops reorder: Gọi API reorder từ frontend

### Documentation
- ❌ OpenAPI: Cập nhật schemas và paths cho M1-M3
- ❌ Postman: Đồng bộ với OpenAPI

### Tests
- ❌ E2E test script: `test_crud_scheduler.js`

### README
- ❌ Hướng dẫn seed data
- ❌ Hướng dẫn test M1-M3

## Next Steps (Priority Order)

1. **Hoàn thiện ScheduleController** - Xóa code duplicate, chỉ dùng ScheduleService
2. **Chuẩn hóa các controller còn lại** - Driver, Student, Route, Stop
3. **Thêm database indexes** - Tạo migration script
4. **Frontend services** - Chuẩn hóa query builder
5. **Frontend conflict UI** - Banner 409
6. **OpenAPI + Postman** - Cập nhật đầy đủ
7. **E2E tests** - Script test CRUD & Scheduler
8. **README** - Documentation

## Files Modified

### Backend
- `ssb-backend/src/controllers/BusController.js` - Chuẩn hóa response helper
- `ssb-backend/src/models/LichTrinhModel.js` - Cải thiện checkConflict() và getAll()
- `ssb-backend/src/services/ScheduleService.js` - Conflict details, filters
- `ssb-backend/src/controllers/ScheduleController.js` - Partial refactor (cần hoàn thiện)

### Documentation
- `docs/reports/M1-M3_survey.md` - Survey hiện trạng
- `docs/reports/M1-M3_progress.md` - This file

## Notes

- Conflict detection hiện tại chỉ check exact match (gioKhoiHanh, loaiChuyen, ngayChay). Có thể cần cải thiện để check time-window overlap trong tương lai.
- Stops reorder endpoint đã có nhưng cần verify transaction atomic.
- Pagination format đã chuẩn hóa: `meta: { page, pageSize, total, sortBy, sortOrder, q }`

