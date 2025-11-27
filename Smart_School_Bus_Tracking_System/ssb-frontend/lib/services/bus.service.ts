import { api } from '../../../lib/api'

export type Bus = {
	id: string
	plateNumber: string
	model?: string
	capacity?: number
	status?: string
	createdAt?: string
	[k: string]: any
}

/**
 * Fetch list of buses from backend: GET /buses
 * Returns array of mapped Bus objects
 */
export async function getBuses(params: { page?: number; limit?: number; search?: string; sortBy?: string; sortDir?: 'ASC'|'DESC'|'asc'|'desc' } = {}): Promise<Bus[]> {
	const qs: string[] = []
	if (params.page) qs.push(`page=${params.page}`)
	if (params.limit) qs.push(`limit=${params.limit}`)
	if (params.search) qs.push(`search=${encodeURIComponent(params.search)}`)
  if (params.sortBy) qs.push(`sortBy=${encodeURIComponent(params.sortBy)}`)
  if (params.sortDir) qs.push(`sortDir=${encodeURIComponent(params.sortDir)}`)
	const query = qs.length ? `?${qs.join('&')}` : ''

	const res = await api.get(`/buses${query}`)
	// backend responds with { success: true, data: [...], pagination?, message }
	const data = (res as any).data || []
	const items = Array.isArray(data) ? data : data?.data || []

	// map backend fields to frontend-friendly shape
	return items.map((b: any) => ({
		id: String(b.maXe || b.id || b._id || ''),
		plateNumber: b.bienSoXe || b.plateNumber || b.bien_so || '',
		model: b.dongXe || b.model,
		capacity: b.sucChua || b.capacity,
		status: b.trangThai || b.status,
		createdAt: b.ngayTao || b.createdAt,
		raw: b,
	}))
}

/**
 * Fetch buses and return items + pagination metadata
 */
export async function getBusesWithMeta(params: { page?: number; limit?: number; search?: string; sortBy?: string; sortDir?: 'ASC'|'DESC'|'asc'|'desc' } = {}) {
	const qs: string[] = []
	if (params.page) qs.push(`page=${params.page}`)
	if (params.limit) qs.push(`limit=${params.limit}`)
	if (params.search) qs.push(`search=${encodeURIComponent(params.search)}`)
  if (params.sortBy) qs.push(`sortBy=${encodeURIComponent(params.sortBy)}`)
  if (params.sortDir) qs.push(`sortDir=${encodeURIComponent(params.sortDir)}`)
	const query = qs.length ? `?${qs.join('&')}` : ''

	const res = await api.get(`/buses${query}`)
	const data = (res as any).data || {}
	const items = Array.isArray(data) ? data : data?.data || []
	const pagination = data?.pagination || null

	const mapped = items.map((b: any) => ({
		id: String(b.maXe || b.id || b._id || ''),
		plateNumber: b.bienSoXe || b.plateNumber || b.bien_so || '',
		model: b.dongXe || b.model,
		capacity: b.sucChua || b.capacity,
		status: b.trangThai || b.status,
		createdAt: b.ngayTao || b.createdAt,
		raw: b,
	}))

	return { items: mapped, pagination }
}

export default { getBuses }
