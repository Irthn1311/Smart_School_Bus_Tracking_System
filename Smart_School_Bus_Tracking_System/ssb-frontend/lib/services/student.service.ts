import { api } from '../../../lib/api'

export type Student = {
  id: string
  name: string
  grade?: string
  parentName?: string
  parentPhone?: string
  pickupPoint?: string
  dropoffPoint?: string
  status?: string
  raw?: any
}

export type StudentListResponse = { items: Student[]; pagination?: any }

function mapStudent(s: any): Student {
  return {
    id: String(s.maHocSinh || s.id || s._id || ''),
    name: s.hoTen || s.ten || s.name || '',
    grade: s.lop || s.grade,
    parentName: s.phuHuynh?.hoTen || s.tenPhuHuynh || s.parentName,
    parentPhone: s.phuHuynh?.soDienThoai || s.sdtPhuHuynh || s.parentPhone,
    pickupPoint: s.diemDon || s.pickupPoint,
    dropoffPoint: s.diemTra || s.dropoffPoint,
    status: s.trangThai || s.status,
    raw: s,
  }
}

export async function getStudents(params: { page?: number; limit?: number; search?: string; status?: string } = {}): Promise<Student[]> {
  const qs: string[] = []
  if (params.page) qs.push(`page=${params.page}`)
  if (params.limit) qs.push(`limit=${params.limit}`)
  if (params.search) qs.push(`search=${encodeURIComponent(params.search)}`)
  if (params.status) qs.push(`status=${encodeURIComponent(params.status)}`)
  const query = qs.length ? `?${qs.join('&')}` : ''

  const res = await api.get(`/students${query}`)
  const data = (res as any).data || []
  const items = Array.isArray(data) ? data : data?.data || []
  return items.map(mapStudent)
}

export async function getStudentsWithMeta(params: { page?: number; limit?: number; search?: string; status?: string } = {}): Promise<StudentListResponse> {
  const qs: string[] = []
  if (params.page) qs.push(`page=${params.page}`)
  if (params.limit) qs.push(`limit=${params.limit}`)
  if (params.search) qs.push(`search=${encodeURIComponent(params.search)}`)
  if (params.status) qs.push(`status=${encodeURIComponent(params.status)}`)
  const query = qs.length ? `?${qs.join('&')}` : ''

  const res = await api.get(`/students${query}`)
  const data = (res as any).data || {}
  const items = Array.isArray(data) ? data : data?.data || []
  const pagination = data?.pagination || null
  return { items: items.map(mapStudent), pagination }
}

export async function createStudent(payload: {
  maHocSinh: string
  hoTen: string
  lop: string
  tenPhuHuynh?: string
  sdtPhuHuynh?: string
  diemDon?: string
  diemTra?: string
  trangThai?: string
}) {
  const res = await api.post('/students', payload)
  return (res as any).data ? mapStudent((res as any).data) : mapStudent(res)
}

export default { getStudents, getStudentsWithMeta, createStudent }
