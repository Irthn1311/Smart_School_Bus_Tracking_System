import { api } from '../../../lib/api'

export type Driver = {
  id: string
  name: string
  email?: string
  phone?: string
  license?: string
  experienceYears?: number
  licenseExpiry?: string
  status?: string
  raw?: any
}

export type DriverListResponse = { items: Driver[]; pagination?: any }

function mapDriver(d: any): Driver {
  return {
    id: String(d.maTaiXe || d.id || d._id || ''),
    name: d.hoTen || d.userInfo?.hoTen || d.ten || '',
    email: d.email || d.userInfo?.email,
    phone: d.soDienThoai || d.userInfo?.soDienThoai,
    license: d.soBangLai,
    experienceYears: d.soNamKinhNghiem,
    licenseExpiry: d.ngayHetHanBangLai,
    status: d.trangThai,
    raw: d,
  }
}

export async function getDrivers(params: { page?: number; limit?: number; search?: string; status?: string } = {}): Promise<Driver[]> {
  const qs: string[] = []
  if (params.page) qs.push(`page=${params.page}`)
  if (params.limit) qs.push(`limit=${params.limit}`)
  if (params.search) qs.push(`search=${encodeURIComponent(params.search)}`)
  if (params.status) qs.push(`status=${encodeURIComponent(params.status)}`)
  const query = qs.length ? `?${qs.join('&')}` : ''

  const res = await api.get(`/drivers${query}`)
  const data = (res as any).data || []
  const items = Array.isArray(data) ? data : data?.data || []
  return items.map(mapDriver)
}

export async function getDriversWithMeta(params: { page?: number; limit?: number; search?: string; status?: string } = {}): Promise<DriverListResponse> {
  const qs: string[] = []
  if (params.page) qs.push(`page=${params.page}`)
  if (params.limit) qs.push(`limit=${params.limit}`)
  if (params.search) qs.push(`search=${encodeURIComponent(params.search)}`)
  if (params.status) qs.push(`status=${encodeURIComponent(params.status)}`)
  const query = qs.length ? `?${qs.join('&')}` : ''

  const res = await api.get(`/drivers${query}`)
  const data = (res as any).data || {}
  const items = Array.isArray(data) ? data : data?.data || []
  const pagination = data?.pagination || (res as any).pagination || null
  return { items: items.map(mapDriver), pagination }
}

export async function createDriver(payload: {
  maTaiXe: string
  hoTen: string
  email: string
  soDienThoai: string
  soBangLai: string
  ngayHetHanBangLai?: string
  soNamKinhNghiem?: number
  trangThai?: string
}) {
  const res = await api.post('/drivers', payload)
  return (res as any).data ? mapDriver((res as any).data) : mapDriver(res)
}

export default { getDrivers, getDriversWithMeta, createDriver }
