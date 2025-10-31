import { api } from '../../../lib/api'

export type Stop = {
  id: string
  name: string
  address?: string
  estimatedTime?: string
  raw?: any
}

export type Route = {
  id: string
  name: string
  status?: string
  stopsCount?: number
  distance?: string | number
  duration?: string | number
  assignedBus?: string
  raw?: any
}

export type RouteListResponse = { items: Route[]; pagination?: any }

function mapStop(s: any): Stop {
  return {
    id: String(s.maDiemDung || s.id || s._id || ''),
    name: s.tenDiemDung || s.ten || s.name || '',
    address: s.diaChi || s.address,
    estimatedTime: s.thoiGianDuKien || s.estimatedTime,
    raw: s,
  }
}

function mapRoute(r: any): Route {
  return {
    id: String(r.maTuyen || r.id || r._id || ''),
    name: r.tenTuyen || r.ten || r.name || '',
    status: r.trangThai || r.status,
    stopsCount: r.soDiemDung || r.stops?.length,
    distance: r.quangDuong || r.distance,
    duration: r.thoiLuong || r.duration,
    assignedBus: r.xeDuocGan || r.assignedBus,
    raw: r,
  }
}

export async function getRoutes(params: { page?: number; limit?: number; search?: string; status?: string } = {}): Promise<Route[]> {
  const qs: string[] = []
  if (params.page) qs.push(`page=${params.page}`)
  if (params.limit) qs.push(`limit=${params.limit}`)
  if (params.search) qs.push(`search=${encodeURIComponent(params.search)}`)
  if (params.status) qs.push(`status=${encodeURIComponent(params.status)}`)
  const query = qs.length ? `?${qs.join('&')}` : ''

  const res = await api.get(`/routes${query}`)
  const data = (res as any).data || []
  const items = Array.isArray(data) ? data : data?.data || []
  return items.map(mapRoute)
}

export async function getRoutesWithMeta(params: { page?: number; limit?: number; search?: string; status?: string } = {}): Promise<RouteListResponse> {
  const qs: string[] = []
  if (params.page) qs.push(`page=${params.page}`)
  if (params.limit) qs.push(`limit=${params.limit}`)
  if (params.search) qs.push(`search=${encodeURIComponent(params.search)}`)
  if (params.status) qs.push(`status=${encodeURIComponent(params.status)}`)
  const query = qs.length ? `?${qs.join('&')}` : ''

  const res = await api.get(`/routes${query}`)
  const data = (res as any).data || {}
  const items = Array.isArray(data) ? data : data?.data || []
  const pagination = data?.pagination || null
  return { items: items.map(mapRoute), pagination }
}

export async function getRouteStops(routeId: string): Promise<Stop[]> {
  const res = await api.get(`/routes/${routeId}/stops`)
  const data = (res as any).data || []
  const items = Array.isArray(data) ? data : data?.data || []
  return items.map(mapStop)
}

export async function createRoute(payload: {
  maTuyen: string
  tenTuyen: string
  trangThai?: string
  diemDung?: Array<{ tenDiemDung: string; diaChi?: string; thoiGianDuKien?: string }>
}) {
  const res = await api.post('/routes', payload)
  return (res as any).data ? mapRoute((res as any).data) : mapRoute(res)
}

export default { getRoutes, getRoutesWithMeta, getRouteStops, createRoute }
