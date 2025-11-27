import { api } from '../api'

type BackendUser = {
  maNguoiDung?: string
  hoTen?: string
  email?: string
  vaiTro?: string
  [k: string]: any
}

type User = {
  id: string
  name: string
  email: string
  role?: string
  raw?: BackendUser
}

const USER_KEY = 'ssb_user'
const TOKEN_KEY = 'ssb_token'

// Map backend role to frontend role
function normalizeRole(backendRole?: string): string | undefined {
  if (!backendRole) return undefined
  const normalized = backendRole.toLowerCase().trim()
  
  // Map backend roles to frontend roles
  if (normalized === 'quan_tri') return 'admin'
  if (normalized === 'tai_xe') return 'driver'
  if (normalized === 'phu_huynh') return 'parent'
  
  // If already in frontend format, return as is
  if (normalized === 'admin' || normalized === 'driver' || normalized === 'parent') {
    return normalized
  }
  
  return backendRole
}

function mapBackendUser(bu?: BackendUser | null): User | null {
  if (!bu) return null
  const backendRole = bu.vaiTro || bu.role
  return {
    id: (bu.maNguoiDung || bu.id || '') + '',
    name: bu.hoTen || bu.name || '',
    email: bu.email || '',
    role: normalizeRole(backendRole),
    raw: bu,
  }
}

/**
 * Call backend POST /auth/login
 * Expected backend response: { success:true, data: { token, refreshToken, user } }
 */
export async function login(email: string, password: string): Promise<User> {
  // call backend
  const payload = { email, matKhau: password }
  const res = await api.post('/auth/login', payload)

  // res is ApiResponse; backend wraps actual in res.data.data
  const data = (res as any).data?.data || (res as any).data

  const token = data?.token || data?.accessToken || null
  const refreshToken = data?.refreshToken || null
  const user = mapBackendUser(data?.user || null)

  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    if (refreshToken) localStorage.setItem('ssb_refresh_token', refreshToken)
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  }

  // set token into api client
  api.setToken(token)

  if (!user) throw { message: 'Không nhận được thông tin user từ server' }
  return user
}

export async function fetchProfile(): Promise<User> {
  const res = await api.get('/auth/profile')
  const data = (res as any).data?.data || (res as any).data
  const user = mapBackendUser(data?.user || null)
  if (typeof window !== 'undefined' && user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
  if (!user) throw { message: 'Không lấy được profile' }
  return user
}

export async function logout(): Promise<void> {
  try {
    // Call backend logout API if token exists
    const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_token') : null
    if (token) {
      try {
        await api.post('/auth/logout')
      } catch (error) {
        // Ignore logout API errors - still proceed with local cleanup
        console.warn('Logout API call failed:', error)
      }
    }
  } finally {
    // Always clear local storage and token
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('ssb_refresh_token')
    }
    api.setToken(null)
  }
}

export function getCurrentUserFromStorage(): User | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export default { login, logout, fetchProfile, getCurrentUserFromStorage }

