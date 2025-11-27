import { api } from '../../lib/api'

export type Schedule = {
  id: string
  routeId?: number
  busId?: number
  driverId?: number
  tripType?: 'don_sang' | 'tra_chieu'
  startTime?: string
  date?: string
  status?: string
  raw?: any
}

export type ScheduleListResponse = { items: Schedule[]; pagination?: any; meta?: any }

function mapSchedule(s: any): Schedule {
  return {
    id: String(s.maLichTrinh || s.id || s._id || ''),
    routeId: s.maTuyen || s.routeId,
    busId: s.maXe || s.busId,
    driverId: s.maTaiXe || s.driverId,
    tripType: s.loaiChuyen || s.tripType,
    startTime: s.gioKhoiHanh || s.startTime,
    date: s.ngayChay || s.date,
    status: s.dangApDung ? 'active' : 'inactive',
    raw: s,
  }
}

/**
 * Build query string for pagination/search/sort
 */
function buildQuery(params: {
  page?: number
  pageSize?: number
  q?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  [key: string]: any
}): string {
  const qs: string[] = []
  if (params.page) qs.push(`page=${params.page}`)
  if (params.pageSize) qs.push(`pageSize=${params.pageSize}`)
  if (params.q) qs.push(`q=${encodeURIComponent(params.q)}`)
  if (params.sortBy) qs.push(`sortBy=${encodeURIComponent(params.sortBy)}`)
  if (params.sortOrder) qs.push(`sortOrder=${params.sortOrder}`)
  
  // Additional filters
  Object.keys(params).forEach(key => {
    if (!['page', 'pageSize', 'q', 'sortBy', 'sortOrder'].includes(key) && params[key] !== undefined) {
      qs.push(`${key}=${encodeURIComponent(String(params[key]))}`)
    }
  })
  
  return qs.length ? `?${qs.join('&')}` : ''
}

export async function getSchedules(params: {
  page?: number
  pageSize?: number
  q?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  maTuyen?: number
  maXe?: number
  maTaiXe?: number
  loaiChuyen?: string
  dangApDung?: boolean
} = {}): Promise<Schedule[]> {
  const query = buildQuery(params)
  const res = await api.get(`/schedules${query}`)
  const data = (res as any).data || []
  const items = Array.isArray(data) ? data : data?.data || []
  return items.map(mapSchedule)
}

export async function getSchedulesWithMeta(params: {
  page?: number
  pageSize?: number
  q?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  maTuyen?: number
  maXe?: number
  maTaiXe?: number
  loaiChuyen?: string
  dangApDung?: boolean
} = {}): Promise<ScheduleListResponse> {
  const query = buildQuery(params)
  const res = await api.get(`/schedules${query}`)
  const data = (res as any).data || {}
  const items = Array.isArray(data) ? data : data?.data || []
  const pagination = data?.pagination || null
  const meta = (res as any).meta || null

  return {
    items: items.map(mapSchedule),
    pagination,
    meta,
  }
}

export async function getScheduleById(id: string | number): Promise<Schedule> {
  const res = await api.get(`/schedules/${id}`)
  const data = (res as any).data || {}
  return mapSchedule(data)
}

export async function createSchedule(data: {
  maTuyen: number
  maXe: number
  maTaiXe: number
  loaiChuyen: 'don_sang' | 'tra_chieu'
  gioKhoiHanh: string
  ngayChay: string
  dangApDung?: boolean
  students?: Array<{ maHocSinh: number; thuTuDiem: number; maDiem: number }>
}): Promise<{ schedule: Schedule; conflict?: any }> {
  try {
    const res = await api.post('/schedules', data)
    return { schedule: mapSchedule((res as any).data || {}) }
  } catch (error: any) {
    // Handle 409 conflict
    if (error?.status === 409 || error?.response?.status === 409) {
      const conflictData = error?.response?.data || error?.data || {}
      throw {
        ...error,
        conflict: conflictData.details?.conflicts || conflictData.conflicts || [],
        message: conflictData.message || 'Xung đột lịch trình',
      }
    }
    throw error
  }
}

export async function updateSchedule(
  id: string | number,
  data: Partial<{
    maTuyen: number
    maXe: number
    maTaiXe: number
    loaiChuyen: 'don_sang' | 'tra_chieu'
    gioKhoiHanh: string
    ngayChay: string
    dangApDung: boolean
  }>
): Promise<{ schedule: Schedule; conflict?: any }> {
  try {
    const res = await api.put(`/schedules/${id}`, data)
    return { schedule: mapSchedule((res as any).data || {}) }
  } catch (error: any) {
    // Handle 409 conflict
    if (error?.status === 409 || error?.response?.status === 409) {
      const conflictData = error?.response?.data || error?.data || {}
      throw {
        ...error,
        conflict: conflictData.details?.conflicts || conflictData.conflicts || [],
        message: conflictData.message || 'Xung đột lịch trình',
      }
    }
    throw error
  }
}

export async function deleteSchedule(id: string | number): Promise<void> {
  await api.delete(`/schedules/${id}`)
}

export async function getScheduleStudents(id: string | number): Promise<{
  scheduleId: number
  studentsByStop: Array<{
    thuTuDiem: number
    maDiem: number
    tenDiem: string
    stopAddress?: string
    stopLat?: number
    stopLng?: number
    students: Array<{
      maHocSinh: number
      hoTen: string
      lop?: string
      anhDaiDien?: string
      diaChi?: string
    }>
  }>
  totalStudents: number
}> {
  const res = await api.get(`/schedules/${id}/students`)
  return (res as any).data || { scheduleId: Number(id), studentsByStop: [], totalStudents: 0 }
}

export default {
  getSchedules,
  getSchedulesWithMeta,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getScheduleStudents,
}

