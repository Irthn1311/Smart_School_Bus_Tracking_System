# 🚀 FRONTEND INTEGRATION PLAN - SSB 1.0

## 🎯 MỤC TIÊU
Chuyển đổi từ **MVP1 (UI Mock)** sang **MVP2 (Production Ready)** trong 2-3 tuần với focus vào:
- API Integration (REST + Socket.IO)
- Maps Integration (Google Maps/Leaflet)
- Real-time Data Flow
- Production-ready Authentication

---

## 📅 TIMELINE OVERVIEW

```
Week 1: Foundation & API Integration
├── Day 1-2: API Service Layer
├── Day 3-4: Authentication Integration  
├── Day 5-7: Socket.IO Real-time

Week 2: Maps & Data Integration
├── Day 1-3: Maps Integration
├── Day 4-5: Data Management
├── Day 6-7: Testing & Optimization

Week 3: Production Ready
├── Day 1-2: Security & Performance
├── Day 3-4: Error Handling & UX
├── Day 5-7: Documentation & Deployment
```

---

## 🗓️ WEEK 1: FOUNDATION & API INTEGRATION

### **Day 1-2: API Service Layer**
#### 🎯 Objectives
- Tạo REST API wrapper với interceptors
- Setup environment configuration
- Implement error handling và loading states

#### 📋 Tasks
- [ ] **Tạo `lib/api.ts`**
  ```typescript
  // lib/api.ts
  class ApiClient {
    private baseURL: string
    private token: string | null = null
    
    constructor() {
      this.baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api'
    }
    
    async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      // Implementation với interceptors
    }
  }
  ```

- [ ] **Setup `.env.local`**
  ```bash
  NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
  NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
  NEXT_PUBLIC_APP_ENV=development
  ```

- [ ] **Tạo `services/` directory**
  ```
  services/
  ├── auth.service.ts
  ├── bus.service.ts
  ├── driver.service.ts
  ├── route.service.ts
  ├── schedule.service.ts
  ├── tracking.service.ts
  └── notification.service.ts
  ```

#### 🔧 Implementation
```typescript
// services/auth.service.ts
export const authService = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  getProfile: () => api.get('/auth/profile')
}
```

#### ✅ Success Criteria
- [ ] API client hoạt động với interceptors
- [ ] Environment variables được load đúng
- [ ] Error handling hoạt động
- [ ] Loading states được hiển thị

---

### **Day 3-4: Authentication Integration**
#### 🎯 Objectives
- Replace mock authentication với real JWT handling
- Implement token refresh logic
- Add role-based access control

#### 📋 Tasks
- [ ] **Update `lib/auth-context.tsx`**
  ```typescript
  // lib/auth-context.tsx
  export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    
    const login = async (email: string, password: string, role: UserRole) => {
      try {
        const response = await authService.login(email, password)
        const { user, token } = response.data
        
        // Store token
        localStorage.setItem('ssb_token', token)
        setUser(user)
        
        // Redirect based on role
        router.push(`/${user.role}`)
      } catch (error) {
        throw new Error('Login failed')
      }
    }
  }
  ```

- [ ] **Add JWT handling**
  ```typescript
  // lib/api.ts
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('ssb_token')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
  ```

- [ ] **Add route protection**
  ```typescript
  // components/ProtectedRoute.tsx
  export function ProtectedRoute({ children, requiredRole }: { children: ReactNode, requiredRole?: UserRole }) {
    const { user, isLoading } = useAuth()
    
    if (isLoading) return <LoadingSpinner />
    if (!user) return <Navigate to="/login" />
    if (requiredRole && user.role !== requiredRole) return <Navigate to="/unauthorized" />
    
    return <>{children}</>
  }
  ```

#### ✅ Success Criteria
- [ ] Login hoạt động với real API
- [ ] JWT token được store và sử dụng
- [ ] Route protection hoạt động
- [ ] Token refresh logic hoạt động

---

### **Day 5-7: Socket.IO Real-time**
#### 🎯 Objectives
- Setup Socket.IO client với reconnection
- Implement real-time tracking
- Add notification system

#### 📋 Tasks
- [ ] **Tạo `lib/socket.ts`**
  ```typescript
  // lib/socket.ts
  import { io, Socket } from 'socket.io-client'
  
  class SocketManager {
    private socket: Socket | null = null
    private reconnectAttempts = 0
    private maxReconnectAttempts = 5
    
    connect() {
      this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
        auth: { token: localStorage.getItem('ssb_token') }
      })
      
      this.socket.on('connect', () => {
        console.log('Socket connected')
        this.reconnectAttempts = 0
      })
      
      this.socket.on('disconnect', () => {
        this.handleReconnect()
      })
    }
    
    private handleReconnect() {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++
          this.connect()
        }, 1000 * this.reconnectAttempts)
      }
    }
  }
  
  export const socketManager = new SocketManager()
  ```

- [ ] **Add Socket hooks**
  ```typescript
  // hooks/useSocket.ts
  export function useSocket() {
    const [isConnected, setIsConnected] = useState(false)
    const [socket, setSocket] = useState<Socket | null>(null)
    
    useEffect(() => {
      socketManager.connect()
      setSocket(socketManager.socket)
      setIsConnected(true)
      
      return () => {
        socketManager.disconnect()
      }
    }, [])
    
    return { socket, isConnected }
  }
  ```

- [ ] **Implement real-time tracking**
  ```typescript
  // components/admin/tracking-map.tsx
  export function TrackingMap({ buses, selectedBus, onSelectBus }: TrackingMapProps) {
    const { socket } = useSocket()
    const [realTimeBuses, setRealTimeBuses] = useState(buses)
    
    useEffect(() => {
      if (socket) {
        socket.on('bus_position_update', (data) => {
          setRealTimeBuses(prev => 
            prev.map(bus => bus.id === data.busId ? { ...bus, ...data } : bus)
          )
        })
        
        socket.on('trip_started', (data) => {
          // Handle trip started event
        })
        
        socket.on('trip_completed', (data) => {
          // Handle trip completed event
        })
      }
    }, [socket])
    
    return (
      // Map component với real-time data
    )
  }
  ```

#### ✅ Success Criteria
- [ ] Socket.IO client kết nối thành công
- [ ] Real-time updates hoạt động
- [ ] Reconnection logic hoạt động
- [ ] Notification system hoạt động

---

## 🗓️ WEEK 2: MAPS & DATA INTEGRATION

### **Day 1-3: Maps Integration**
#### 🎯 Objectives
- Replace mock maps với real Google Maps/Leaflet
- Implement GPS tracking
- Add geofencing capabilities

#### 📋 Tasks
- [ ] **Setup Google Maps API**
  ```typescript
  // lib/maps.ts
  export function loadGoogleMaps(apiKey: string) {
    return new Promise<void>((resolve, reject) => {
      if (typeof window === 'undefined') return reject(new Error('Not in browser'))
      if ((window as any).google?.maps) return resolve()
      
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Maps'))
      document.head.appendChild(script)
    })
  }
  ```

- [ ] **Update TrackingMap component**
  ```typescript
  // components/admin/tracking-map.tsx
  export function TrackingMap({ buses, selectedBus, onSelectBus }: TrackingMapProps) {
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstance = useRef<google.maps.Map | null>(null)
    const markersRef = useRef<google.maps.Marker[]>([])
    
    useEffect(() => {
      const initMap = async () => {
        try {
          await loadGoogleMaps(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!)
          
          if (mapRef.current) {
            mapInstance.current = new google.maps.Map(mapRef.current, {
              center: { lat: 10.762622, lng: 106.660172 },
              zoom: 13,
              mapTypeId: google.maps.MapTypeId.ROADMAP
            })
            
            // Add bus markers
            buses.forEach(bus => {
              const marker = new google.maps.Marker({
                position: { lat: bus.lat, lng: bus.lng },
                map: mapInstance.current,
                title: bus.plateNumber,
                icon: getBusIcon(bus.status)
              })
              
              marker.addListener('click', () => onSelectBus(bus))
              markersRef.current.push(marker)
            })
          }
        } catch (error) {
          console.error('Failed to load Google Maps:', error)
        }
      }
      
      initMap()
    }, [buses])
    
    return <div ref={mapRef} className="w-full h-[600px] rounded-lg" />
  }
  ```

- [ ] **Add GPS tracking**
  ```typescript
  // hooks/useGPS.ts
  export function useGPS() {
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null)
    const [error, setError] = useState<string | null>(null)
    
    useEffect(() => {
      if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
          },
          (error) => {
            setError(error.message)
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        )
      }
    }, [])
    
    return { location, error }
  }
  ```

- [ ] **Add geofencing**
  ```typescript
  // utils/geofencing.ts
  export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c * 1000 // Distance in meters
  }
  
  export function isNearStop(busLocation: { lat: number, lng: number }, stopLocation: { lat: number, lng: number }, radius: number = 60): boolean {
    return calculateDistance(busLocation.lat, busLocation.lng, stopLocation.lat, stopLocation.lng) <= radius
  }
  ```

#### ✅ Success Criteria
- [ ] Google Maps hiển thị đúng
- [ ] Bus markers hiển thị real-time
- [ ] GPS tracking hoạt động
- [ ] Geofencing hoạt động

---

### **Day 4-5: Data Management**
#### 🎯 Objectives
- Replace mock data với real API calls
- Implement data synchronization
- Add caching strategy

#### 📋 Tasks
- [ ] **Replace mock data trong Admin pages**
  ```typescript
  // app/admin/buses/page.tsx
  export default function BusesPage() {
    const [buses, setBuses] = useState<Bus[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    
    useEffect(() => {
      const fetchBuses = async () => {
        try {
          setLoading(true)
          const response = await busService.getAll()
          setBuses(response.data)
        } catch (error) {
          setError('Failed to fetch buses')
        } finally {
          setLoading(false)
        }
      }
      
      fetchBuses()
    }, [])
    
    if (loading) return <LoadingSpinner />
    if (error) return <ErrorMessage message={error} />
    
    return (
      <div>
        {buses.map(bus => (
          <BusCard key={bus.id} bus={bus} />
        ))}
      </div>
    )
  }
  ```

- [ ] **Add data synchronization**
  ```typescript
  // hooks/useDataSync.ts
  export function useDataSync<T>(endpoint: string, interval: number = 30000) {
    const [data, setData] = useState<T[]>([])
    const [loading, setLoading] = useState(true)
    
    useEffect(() => {
      const fetchData = async () => {
        try {
          const response = await api.get(endpoint)
          setData(response.data)
        } catch (error) {
          console.error('Failed to fetch data:', error)
        } finally {
          setLoading(false)
        }
      }
      
      fetchData()
      const intervalId = setInterval(fetchData, interval)
      
      return () => clearInterval(intervalId)
    }, [endpoint, interval])
    
    return { data, loading }
  }
  ```

- [ ] **Add caching strategy**
  ```typescript
  // lib/cache.ts
  class CacheManager {
    private cache = new Map<string, { data: any, timestamp: number }>()
    private ttl = 5 * 60 * 1000 // 5 minutes
    
    get<T>(key: string): T | null {
      const item = this.cache.get(key)
      if (!item) return null
      
      if (Date.now() - item.timestamp > this.ttl) {
        this.cache.delete(key)
        return null
      }
      
      return item.data
    }
    
    set(key: string, data: any): void {
      this.cache.set(key, { data, timestamp: Date.now() })
    }
  }
  
  export const cacheManager = new CacheManager()
  ```

#### ✅ Success Criteria
- [ ] Mock data được replace hoàn toàn
- [ ] API calls hoạt động đúng
- [ ] Data synchronization hoạt động
- [ ] Caching strategy hoạt động

---

### **Day 6-7: Testing & Optimization**
#### 🎯 Objectives
- Test tất cả integrations
- Optimize performance
- Fix bugs và issues

#### 📋 Tasks
- [ ] **Add unit tests**
  ```typescript
  // __tests__/components/TrackingMap.test.tsx
  import { render, screen } from '@testing-library/react'
  import { TrackingMap } from '@/components/admin/tracking-map'
  
  describe('TrackingMap', () => {
    it('renders map with bus markers', () => {
      const mockBuses = [
        { id: '1', plateNumber: '51A-12345', lat: 10.762622, lng: 106.660172 }
      ]
      
      render(<TrackingMap buses={mockBuses} selectedBus={mockBuses[0]} onSelectBus={jest.fn()} />)
      
      expect(screen.getByText('51A-12345')).toBeInTheDocument()
    })
  })
  ```

- [ ] **Add integration tests**
  ```typescript
  // __tests__/integration/auth.test.tsx
  import { render, screen, fireEvent, waitFor } from '@testing-library/react'
  import { LoginPage } from '@/app/login/page'
  
  describe('Authentication Integration', () => {
    it('should login successfully', async () => {
      render(<LoginPage />)
      
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@test.com' } })
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } })
      fireEvent.click(screen.getByText('Đăng nhập'))
      
      await waitFor(() => {
        expect(screen.getByText('Đăng nhập thành công')).toBeInTheDocument()
      })
    })
  })
  ```

- [ ] **Performance optimization**
  ```typescript
  // components/admin/tracking-map.tsx
  export const TrackingMap = memo(({ buses, selectedBus, onSelectBus }: TrackingMapProps) => {
    // Memoized component để tránh re-render không cần thiết
  })
  
  // Add React.memo cho expensive components
  export const BusCard = memo(({ bus }: { bus: Bus }) => {
    // Memoized bus card
  })
  ```

#### ✅ Success Criteria
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Performance metrics đạt yêu cầu
- [ ] No critical bugs

---

## 🗓️ WEEK 3: PRODUCTION READY

### **Day 1-2: Security & Performance**
#### 🎯 Objectives
- Implement security measures
- Optimize performance
- Add monitoring

#### 📋 Tasks
- [ ] **Add security headers**
  ```typescript
  // next.config.mjs
  const nextConfig = {
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'X-Frame-Options',
              value: 'DENY'
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff'
            },
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin'
            }
          ]
        }
      ]
    }
  }
  ```

- [ ] **Add input sanitization**
  ```typescript
  // utils/sanitize.ts
  import DOMPurify from 'dompurify'
  
  export function sanitizeInput(input: string): string {
    return DOMPurify.sanitize(input)
  }
  
  export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  ```

- [ ] **Add rate limiting**
  ```typescript
  // lib/rateLimit.ts
  class RateLimiter {
    private requests = new Map<string, number[]>()
    private maxRequests = 100
    private windowMs = 15 * 60 * 1000 // 15 minutes
    
    isAllowed(ip: string): boolean {
      const now = Date.now()
      const requests = this.requests.get(ip) || []
      
      // Remove old requests
      const validRequests = requests.filter(time => now - time < this.windowMs)
      
      if (validRequests.length >= this.maxRequests) {
        return false
      }
      
      validRequests.push(now)
      this.requests.set(ip, validRequests)
      return true
    }
  }
  ```

#### ✅ Success Criteria
- [ ] Security headers được implement
- [ ] Input sanitization hoạt động
- [ ] Rate limiting hoạt động
- [ ] Performance metrics đạt yêu cầu

---

### **Day 3-4: Error Handling & UX**
#### 🎯 Objectives
- Implement comprehensive error handling
- Add user feedback
- Improve UX

#### 📋 Tasks
- [ ] **Add error boundaries**
  ```typescript
  // components/ErrorBoundary.tsx
  export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
      super(props)
      this.state = { hasError: false, error: null }
    }
    
    static getDerivedStateFromError(error: Error): State {
      return { hasError: true, error }
    }
    
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
      console.error('Error caught by boundary:', error, errorInfo)
      // Log to monitoring service
    }
    
    render() {
      if (this.state.hasError) {
        return <ErrorFallback error={this.state.error} />
      }
      
      return this.props.children
    }
  }
  ```

- [ ] **Add loading states**
  ```typescript
  // components/LoadingSpinner.tsx
  export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    return (
      <div className={`animate-spin rounded-full border-2 border-primary border-t-transparent ${
        size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8'
      }`} />
    )
  }
  ```

- [ ] **Add toast notifications**
  ```typescript
  // hooks/useToast.ts
  export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([])
    
    const toast = useCallback(({ title, description, type = 'info' }: ToastProps) => {
      const id = Math.random().toString(36).substr(2, 9)
      setToasts(prev => [...prev, { id, title, description, type }])
      
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 5000)
    }, [])
    
    return { toast, toasts }
  }
  ```

#### ✅ Success Criteria
- [ ] Error boundaries hoạt động
- [ ] Loading states được hiển thị
- [ ] Toast notifications hoạt động
- [ ] UX được cải thiện

---

### **Day 5-7: Documentation & Deployment**
#### 🎯 Objectives
- Add comprehensive documentation
- Setup deployment pipeline
- Add monitoring

#### 📋 Tasks
- [ ] **Add component documentation**
  ```typescript
  // components/admin/tracking-map.tsx
  /**
   * TrackingMap component for real-time bus tracking
   * @param buses - Array of bus objects with position data
   * @param selectedBus - Currently selected bus
   * @param onSelectBus - Callback when bus is selected
   */
  export function TrackingMap({ buses, selectedBus, onSelectBus }: TrackingMapProps) {
    // Component implementation
  }
  ```

- [ ] **Add API documentation**
  ```typescript
  // services/auth.service.ts
  /**
   * Authentication service for user login/logout
   */
  export const authService = {
    /**
     * Login user with email and password
     * @param email - User email
     * @param password - User password
     * @returns Promise with user data and token
     */
    login: (email: string, password: string) => api.post('/auth/login', { email, password }),
    
    /**
     * Logout current user
     * @returns Promise
     */
    logout: () => api.post('/auth/logout'),
  }
  ```

- [ ] **Setup deployment**
  ```yaml
  # .github/workflows/deploy.yml
  name: Deploy to Production
  
  on:
    push:
      branches: [main]
  
  jobs:
    deploy:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v2
        - uses: actions/setup-node@v2
          with:
            node-version: '18'
        - run: npm ci
        - run: npm run build
        - run: npm run deploy
  ```

#### ✅ Success Criteria
- [ ] Documentation hoàn chỉnh
- [ ] Deployment pipeline hoạt động
- [ ] Monitoring được setup
- [ ] Production ready

---

## 🎯 SUCCESS METRICS

### **Technical Metrics**
- [ ] 100% API integration coverage
- [ ] 100% real-time data flow
- [ ] 100% map functionality
- [ ] 0% mock data remaining
- [ ] < 2s page load time
- [ ] < 100ms API response time

### **User Experience Metrics**
- [ ] 100% offline functionality
- [ ] 100% accessibility compliance
- [ ] 0 critical bugs
- [ ] 90%+ user satisfaction

### **Code Quality Metrics**
- [ ] 100% TypeScript coverage
- [ ] 90%+ test coverage
- [ ] 0 ESLint errors
- [ ] 100% component documentation

---

## 🚨 RISK MITIGATION

### **Technical Risks**
| Risk | Impact | Mitigation |
|------|--------|------------|
| API không hoạt động | 🔴 High | Test API endpoints trước khi integrate |
| Socket.IO connection issues | 🔴 High | Implement fallback mechanisms |
| Maps API quota exceeded | 🟡 Medium | Monitor usage, implement caching |
| Performance issues | 🟡 Medium | Implement code splitting, lazy loading |

### **Timeline Risks**
| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep | 🔴 High | Stick to MVP features, defer nice-to-haves |
| Integration complexity | 🟡 Medium | Break down tasks, test incrementally |
| Testing time | 🟡 Medium | Start testing early, automate where possible |

---

## 📋 CHECKLIST

### **Week 1 Checklist**
- [ ] API service layer created
- [ ] Environment configuration setup
- [ ] Authentication integration complete
- [ ] Socket.IO client working
- [ ] Error handling implemented

### **Week 2 Checklist**
- [ ] Maps integration complete
- [ ] GPS tracking working
- [ ] Mock data replaced
- [ ] Data synchronization working
- [ ] Testing complete

### **Week 3 Checklist**
- [ ] Security measures implemented
- [ ] Performance optimized
- [ ] Error handling comprehensive
- [ ] Documentation complete
- [ ] Deployment ready

---

## 🎉 CONCLUSION

**Kết quả mong đợi**: Sau 3 tuần, frontend sẽ chuyển từ MVP1 (UI Mock) sang MVP2 (Production Ready) với:
- ✅ Full API integration
- ✅ Real-time communication
- ✅ Maps functionality
- ✅ Production-ready authentication
- ✅ Comprehensive error handling
- ✅ Performance optimization

**Timeline**: 2-3 tuần (có thể extend thêm 1 tuần nếu cần)
**Team size**: 1-2 developers
**Budget**: Minimal (chỉ cần API keys và hosting)

---

*Integration Plan được tạo tự động bởi SSB Frontend Analysis Tool*
