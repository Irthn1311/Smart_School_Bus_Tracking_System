# Changelog

## Backend v1.1 (2025-01-XX) - Normalized Stops + Route Stops + OpenAPI + RateLimit + Cache + Tests

### 🎯 Overview
Refactored backend to match new database schema (ver2) with normalized stops and route_stops junction table.

### ✅ Added
- **RouteStopModel**: New model for route_stops junction table
- **StopService**: Service for managing stops independently
- **MapsService**: Service for Google Maps API integration with Redis caching
- **StopController**: Controller for stops CRUD operations
- **MapsController**: Controller for Maps API proxy endpoints
- **Redis Cache**: Cache configuration and helpers for Maps API responses
- **Rebuild Polyline Script**: Script to rebuild polylines for routes
- **New Endpoints**:
  - `GET /api/v1/stops` - List stops
  - `POST /api/v1/stops` - Create stop
  - `PUT /api/v1/stops/:id` - Update stop
  - `DELETE /api/v1/stops/:id` - Delete stop
  - `PATCH /api/v1/routes/:id/stops/reorder` - Reorder stops in route
  - `POST /api/v1/routes/:id/rebuild-polyline` - Rebuild polyline for route
  - `POST /api/v1/maps/directions` - Get directions
  - `POST /api/v1/maps/distance-matrix` - Get distance matrix
  - `POST /api/v1/maps/geocode` - Geocode address
  - `POST /api/v1/maps/reverse-geocode` - Reverse geocode coordinates
  - `POST /api/v1/maps/roads/snap` - Snap to roads

### 🔄 Changed
- **TuyenDuongModel**: Removed query to DiemDung with maTuyen, added support for origin/dest/polyline fields
- **DiemDungModel**: Removed maTuyen and thuTu fields, added address and scheduled_time fields
- **RouteService**: Refactored to use RouteStopModel for route-stop relationships
- **RouteController**: Refactored to use new service methods
- **telemetryService**: Updated to use RouteStopModel instead of DiemDungModel.getByRouteId()

### 🔧 Configuration
- Added `MAPS_API_KEY` to `.env.example`
- Added `REDIS_URL` to `.env.example`
- Added `RATE_LIMIT_*` configurations to `.env.example`
- Added `CACHE_TTL_*` configurations to `.env.example`
- Updated `package.json` scripts for database initialization

### 📚 Documentation
- Added `docs/backend_audit_v1_1.md` - Audit report of current backend state
- Updated README with Redis setup instructions
- Added rebuild-polyline script documentation

### 🐛 Fixed
- Fixed route stops query to use route_stops junction table
- Fixed stop creation to be independent of routes
- Fixed stop deletion to check for usage in routes

### ⚠️ Breaking Changes
- **API Changes**: 
  - `POST /api/v1/routes/:id/stops` now requires `stop_id` OR `tenDiem, viDo, kinhDo` (not `maTuyen, thuTu`)
  - `PUT /api/v1/routes/:id/stops/:stopId` removed (use `PATCH /api/v1/routes/:id/stops/reorder` instead)
- **Database Schema**: 
  - DiemDung table no longer has `maTuyen` and `thuTu` columns
  - New `route_stops` table for route-stop relationships
  - TuyenDuong table added `origin_lat`, `origin_lng`, `dest_lat`, `dest_lng`, `polyline` columns

### 📦 Dependencies
- Added `ioredis` for Redis client

### ✅ Completed in this PR
- [x] Added rate limiting middleware for Maps API (mapsLimiter.js)
- [x] Added OpenAPI specification v1.1 (docs/openapi.yaml)
- [x] Added Postman collection export script (scripts/export-postman.js)
- [x] Added cache provider abstraction (Redis + Memory fallback)
- [x] Added integration tests (tests/routes.test.js)
- [x] Added CI/CD workflow (.github/workflows/ci.yml)
- [x] Added Docker Compose setup (docker-compose.dev.yml)
- [x] Updated README with Redis setup and OpenAPI documentation

### 🔜 TODO (Future)
- [ ] Add more comprehensive unit tests
- [ ] Add error handling improvements
- [ ] Add logging improvements
- [ ] Add API versioning strategy
- [ ] Add request/response validation middleware

