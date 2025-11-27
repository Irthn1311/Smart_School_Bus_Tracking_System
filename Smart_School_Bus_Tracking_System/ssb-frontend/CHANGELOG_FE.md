# Changelog - Frontend Migration

## [Unreleased] - Leaflet → Google Maps Migration

### Breaking Changes

- **Removed Leaflet:** Gỡ bỏ hoàn toàn Leaflet và các dependencies liên quan
- **API Client:** Thay đổi từ custom fetch sang Axios với interceptors
- **State Management:** Thêm TanStack Query cho tất cả data fetching

### Added

#### Maps
- **Google Maps Loader** (`lib/maps/googleLoader.ts`)
  - Load Google Maps JavaScript API với `@googlemaps/js-api-loader`
  - Support Places và Geometry libraries
  - Error handling và loading states

- **SSBMap Component** (`components/map/SSBMap.tsx`)
  - Component bản đồ chính với Google Maps
  - Vẽ polyline từ backend (encoded string)
  - Render stops với sequence numbers
  - Render bus markers với status colors
  - Auto-fit bounds
  - Memo hóa polyline và markers

#### API Client
- **Axios Client** (`lib/api-client.ts`)
  - Axios instance với base URL từ `NEXT_PUBLIC_API_BASE`
  - Request/response interceptors
  - Auto token refresh on 401
  - AbortController support
  - Error handling chuẩn

#### TanStack Query Hooks
- **useRoutes** (`lib/hooks/useRoutes.ts`)
  - `useRoutes()` - List routes
  - `useRouteDetail(routeId)` - Route detail với stops sorted
  - `useRouteStops(routeId)` - Route stops
  - `useReorderStops()` - Mutation reorder
  - `useAddStopToRoute()` - Mutation add stop
  - `useRemoveStopFromRoute()` - Mutation remove stop
  - `useRebuildPolyline()` - Mutation rebuild polyline

- **useStops** (`lib/hooks/useStops.ts`)
  - `useStopsList()` - List stops
  - `useCreateStop()` - Create stop
  - `useUpdateStop()` - Update stop
  - `useDeleteStop()` - Delete stop

- **useMaps** (`lib/hooks/useMaps.ts`)
  - `useDistanceMatrix()` - Distance matrix via backend proxy
  - `useDirections()` - Directions via backend proxy
  - `useGeocode()` - Geocode via backend proxy
  - `useReverseGeocode()` - Reverse geocode via backend proxy

#### Route Detail Page
- **Route Detail** (`app/admin/routes/[id]/page.tsx`)
  - Trang chi tiết tuyến đường độc lập
  - Drag-drop reorder stops với `@dnd-kit/core`
  - Add stop dialog (chọn có sẵn / tạo mới)
  - Delete stop với confirm dialog
  - Rebuild polyline button
  - Map với polyline và stops
  - Loading/error states với Skeleton

- **AddStopDialog** (`components/admin/AddStopDialog.tsx`)
  - Tab 1: Chọn stop có sẵn
  - Tab 2: Tạo stop mới
  - Validate với Zod (nếu có)

#### Providers
- **QueryProvider** (`lib/providers/QueryProvider.tsx`)
  - TanStack Query client provider
  - Default options: staleTime 30s, retry 1
  - React Query Devtools (development only)

### Changed

#### Package Dependencies
- **Removed:**
  - `leaflet` (^1.9.4)
  - `@types/leaflet` (^1.9.21)
  - `@react-google-maps/api` (^2.20.7) - thay bằng `@googlemaps/js-api-loader`

- **Added:**
  - `@googlemaps/js-api-loader` (^1.16.2)
  - `axios` (^1.13.2) - đã có sẵn
  - `@tanstack/react-query` (^5.90.7) - đã có sẵn
  - `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` - đã có sẵn

#### Environment Variables
- **Changed:**
  - `NEXT_PUBLIC_API_URL` → `NEXT_PUBLIC_API_BASE` (ưu tiên)
  - Fallback: `NEXT_PUBLIC_API_URL` hoặc `http://localhost:4000/api/v1`

- **Required:**
  - `NEXT_PUBLIC_GMAPS_API_KEY` - Google Maps API key

#### API Calls
- **All Google Maps API calls** (trừ Places) → Backend proxy
  - Directions: `POST /maps/directions`
  - Distance Matrix: `POST /maps/distance-matrix`
  - Geocode: `POST /maps/geocode`
  - Reverse Geocode: `POST /maps/reverse-geocode`
  - Roads Snap: `POST /maps/roads/snap`

- **Places Autocomplete:** Vẫn gọi trực tiếp từ FE (Google Maps JS SDK)

### Fixed

- **Stops sorting:** Đảm bảo stops luôn sort theo `sequence` (cả BE và FE)
- **Polyline rendering:** Decode và render polyline từ backend
- **Cache invalidation:** Invalidate queries sau mọi mutation
- **Error handling:** Toast notifications cho mọi errors
- **Loading states:** Skeleton loaders thay vì spinner đơn giản

### Removed

- **LeafletMap component** (`components/map/leaflet-map.tsx`)
- **MapView component** (nếu dùng Leaflet)
- **All Leaflet imports và CSS**

### Migration Notes

1. **Update `.env.local`:**
   ```env
   NEXT_PUBLIC_API_BASE=http://localhost:4000/api/v1
   NEXT_PUBLIC_GMAPS_API_KEY=your_key_here
   ```

2. **Replace Leaflet imports:**
   ```typescript
   // OLD
   import LeafletMap from '@/components/map/leaflet-map';
   
   // NEW
   import SSBMap from '@/components/map/SSBMap';
   ```

3. **Update API calls:**
   ```typescript
   // OLD
   const res = await apiClient.getRoutes();
   
   // NEW (với TanStack Query)
   const { data, isLoading } = useRoutes();
   ```

4. **Route detail navigation:**
   ```typescript
   // OLD: Dialog
   <RouteDetail routeId={id} />
   
   // NEW: Page
   router.push(`/admin/routes/${id}`);
   ```

### Performance Improvements

- **Dynamic imports:** Map components lazy loaded
- **Memo hóa:** Polyline và markers được memo
- **Query caching:** TanStack Query cache 30s
- **AbortController:** Cancel requests khi unmount

### Testing Checklist

- [x] Routes list loads
- [x] Route detail page loads
- [x] Drag-drop reorder works
- [x] Add stop (existing) works
- [x] Add stop (new) works
- [x] Delete stop works
- [x] Rebuild polyline works
- [x] Map renders polyline
- [x] Map renders stops with sequence
- [x] Distance matrix via backend (cached)
- [x] No direct Google Maps calls (except Places)

### Known Issues

- [ ] Places Autocomplete chưa tích hợp (P2)
- [ ] ETA calculation chưa hoàn chỉnh (P1)
- [ ] Socket.IO realtime updates chưa throttle (P2)

### Next Steps

1. Tích hợp Places Autocomplete cho add stop
2. Hoàn thiện ETA calculation với distance matrix
3. Throttle socket updates (max 1Hz)
4. Code-split map components
5. Add unit tests cho hooks

---

**Date:** 2025-11-09  
**Author:** Frontend Migration Team

