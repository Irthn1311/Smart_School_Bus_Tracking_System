# Smart School Bus Frontend

Frontend cho hệ thống Smart School Bus Tracking System, sử dụng Next.js 15, React 19, TypeScript, và Google Maps JavaScript API.

## Công nghệ

- **Framework:** Next.js 15.2.4 (App Router)
- **React:** 19
- **TypeScript:** 5
- **Maps:** Google Maps JavaScript API (via `@googlemaps/js-api-loader`)
- **State Management:** TanStack Query (React Query)
- **HTTP Client:** Axios
- **UI:** Radix UI + Tailwind CSS
- **Realtime:** Socket.IO Client

## Cài đặt

```bash
npm install
```

## Cấu hình môi trường

Copy file `env.example` thành `.env.local` và điền giá trị:

```bash
cp env.example .env.local
```

Sau đó chỉnh sửa `.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:4000/api/v1
NEXT_PUBLIC_GMAPS_API_KEY=your_google_maps_api_key_here
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### Biến môi trường

- `NEXT_PUBLIC_API_BASE`: Backend API base URL (bắt buộc)
- `NEXT_PUBLIC_GMAPS_API_KEY`: Google Maps API key (bắt buộc)
- `NEXT_PUBLIC_SOCKET_URL`: Socket.IO server URL (tùy chọn, mặc định: `http://localhost:4000`)

### Google Maps API Setup

1. Tạo project tại [Google Cloud Console](https://console.cloud.google.com/)
2. Enable các APIs sau:
   - **Maps JavaScript API** ✅
   - **Places API** ✅ (frontend direct)
   - **Directions API** ✅ (backend proxy)
   - **Distance Matrix API** ✅ (backend proxy)
   - **Geocoding API** ✅ (backend proxy)
   - **Roads API** ✅ (backend proxy)
3. Tạo API key và thêm restrictions:
   - **HTTP referrers:** `http://localhost:3000/*`, `https://yourdomain.com/*`
   - **API restrictions:** Chọn tất cả APIs đã enable ở trên

## Chạy ứng dụng

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

## Kiến trúc Maps API

### Backend Proxy (bắt buộc)

Các API sau **phải** gọi qua backend proxy để có caching và rate limiting:

- **Directions:** `POST /maps/directions`
- **Distance Matrix:** `POST /maps/distance-matrix`
- **Geocode:** `POST /maps/geocode`
- **Reverse Geocode:** `POST /maps/reverse-geocode`
- **Roads Snap:** `POST /maps/roads/snap`

**Lý do:** Backend có caching, rate limiting, và quản lý API key tập trung.

### Frontend Direct (chỉ Places)

Chỉ **Places Autocomplete** và **Place Details** được gọi trực tiếp từ frontend qua Google Maps JavaScript SDK:

```typescript
import { loadGoogleMaps, getGoogle } from '@/lib/maps/googleLoader';

await loadGoogleMaps();
const g = getGoogle();
const autocomplete = new g.maps.places.Autocomplete(input);
```

**Lý do:** Places Autocomplete cần tương tác trực tiếp với user input, không cần caching.

## Cấu trúc thư mục

```
ssb-frontend/
├── app/                    # Next.js App Router pages
│   ├── admin/
│   │   └── routes/
│   │       └── [id]/       # Route detail page với reorder/add/remove/rebuild
│   └── layout.tsx          # Root layout với QueryProvider
├── components/
│   ├── map/
│   │   └── SSBMap.tsx      # Google Maps component chính
│   └── admin/
│       └── AddStopDialog.tsx
├── lib/
│   ├── api-client.ts       # Axios client với interceptors
│   ├── maps/
│   │   └── googleLoader.ts # Google Maps loader
│   ├── hooks/
│   │   ├── useRoutes.ts    # TanStack Query hooks cho routes
│   │   ├── useStops.ts     # TanStack Query hooks cho stops
│   │   └── useMaps.ts      # TanStack Query hooks cho maps
│   └── providers/
│       └── QueryProvider.tsx # TanStack Query provider
└── types/                  # TypeScript types
```

## Tính năng chính

### Route Management

- **List Routes:** `/admin/routes`
- **Route Detail:** `/admin/routes/[id]`
  - Xem thông tin tuyến
  - Drag-drop reorder stops
  - Thêm/xóa stops
  - Rebuild polyline
  - Hiển thị map với polyline và stops

### Maps Integration

- **SSBMap Component:** Component bản đồ chính
  - Vẽ polyline từ backend
  - Hiển thị stops với sequence numbers
  - Hiển thị bus markers (realtime)
  - Auto-fit bounds

### Data Fetching

- **TanStack Query:** Tất cả data fetching qua React Query
  - Automatic caching
  - Invalidation sau mutations
  - Loading/error states
  - Retry logic

## API Integration

### Routes

- `GET /routes` - List routes
- `GET /routes/{id}` - Route detail (với stops ORDER BY sequence)
- `POST /routes` - Create route
- `PUT /routes/{id}` - Update route
- `DELETE /routes/{id}` - Delete route
- `GET /routes/{id}/stops` - Get route stops
- `POST /routes/{id}/stops` - Add stop to route
- `PATCH /routes/{id}/stops/reorder` - Reorder stops
- `DELETE /routes/{id}/stops/{stopId}` - Remove stop from route
- `POST /routes/{id}/rebuild-polyline` - Rebuild polyline

### Stops

- `GET /stops` - List stops
- `POST /stops` - Create stop
- `PUT /stops/{id}` - Update stop
- `DELETE /stops/{id}` - Delete stop

### Maps (Backend Proxy)

- `POST /maps/directions` - Get directions
- `POST /maps/distance-matrix` - Get distance matrix (cached)
- `POST /maps/geocode` - Geocode address
- `POST /maps/reverse-geocode` - Reverse geocode
- `POST /maps/roads/snap` - Snap to roads

## Database Schema (v2)

Frontend tương thích với DB schema v2:

- **DiemDung:** Standalone stops (không có `maTuyen`, `thuTu`)
- **route_stops:** Junction table với `route_id`, `stop_id`, `sequence`, `dwell_seconds`
- **TuyenDuong:** Routes với `polyline` (encoded string)

## Development Notes

### Không gọi Google Maps trực tiếp

❌ **SAI:**
```typescript
// Không làm thế này
const directionsService = new google.maps.DirectionsService();
```

✅ **ĐÚNG:**
```typescript
// Gọi qua backend
const response = await apiClient.getDirections({ origin, destination });
```

### Query Invalidation

Sau mọi mutation, invalidate queries liên quan:

```typescript
queryClient.invalidateQueries({ queryKey: routeKeys.detail(routeId) });
```

### Polyline Rendering

Polyline từ backend là encoded string, decode bằng Google Maps Geometry library:

```typescript
const path = google.maps.geometry.encoding.decodePath(polyline);
```

## Troubleshooting

### Google Maps không load

1. Kiểm tra `NEXT_PUBLIC_GMAPS_API_KEY` trong `.env.local`
2. Kiểm tra API key có bật đúng APIs: Maps JavaScript API, Places API, Geometry Library
3. Kiểm tra console errors

### API calls fail

1. Kiểm tra `NEXT_PUBLIC_API_BASE` trong `.env.local`
2. Kiểm tra backend đang chạy
3. Kiểm tra CORS settings trên backend

### Stops không sort đúng

Backend trả về stops đã ORDER BY sequence, nhưng FE vẫn sort an toàn:

```typescript
const sorted = stops.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
```

## License

Private - Smart School Bus Tracking System

