# 🚀 BACKEND HARDENING PLAN - SSB 1.0

## 🎯 MỤC TIÊU
Chuyển đổi từ **Development Backend** sang **Production Ready Backend** trong 2-3 tuần với focus vào:
- API Standardization (v1 routes)
- Authentication Integration (JWT + RBAC)
- Database Integration (MySQL)
- Socket.IO Enhancement (Real-time events)

---

## 📅 TIMELINE OVERVIEW

```
Week 1: Foundation & API Standardization
├── Day 1-2: API v1 Structure + Authentication
├── Day 3-4: Database Integration
├── Day 5-7: Socket.IO Authentication

Week 2: Missing Endpoints & Features
├── Day 1-3: M2, M5, M7, M8 Endpoints
├── Day 4-5: Socket.IO Events
├── Day 6-7: Testing & Validation

Week 3: Production Ready
├── Day 1-2: Performance & Security
├── Day 3-4: Error Handling & Logging
├── Day 5-7: Documentation & Deployment
```

---

## 🗓️ WEEK 1: FOUNDATION & API STANDARDIZATION

### **Day 1-2: API v1 Structure + Authentication**
#### 🎯 Objectives
- Create `/api/v1/` route structure
- Integrate AuthMiddleware with all routes
- Implement JWT authentication
- Add role-based access control

#### 📋 Tasks
- [ ] **Create v1 route structure**
  ```
  src/routes/api/v1/
  ├── auth.js
  ├── buses.js
  ├── drivers.js
  ├── routes.js
  ├── schedules.js
  ├── trips.js
  ├── reports.js
  └── admin.js
  ```

- [ ] **Update app.js with v1 routes**
  ```javascript
  // app.js
  const v1Routes = require('./routes/api/v1');
  app.use('/api/v1', v1Routes);
  ```

- [ ] **Integrate authentication**
  ```javascript
  // routes/api/v1/buses.js
  const express = require('express');
  const AuthMiddleware = require('../../../middlewares/AuthMiddleware');
  const BusController = require('../../../controllers/BusController');
  
  const router = express.Router();
  
  // All routes require authentication
  router.use(AuthMiddleware.authenticate);
  
  // Admin only routes
  router.get('/', AuthMiddleware.requireAdmin, BusController.getAll);
  router.post('/', AuthMiddleware.requireAdmin, BusController.create);
  router.put('/:id', AuthMiddleware.requireAdmin, BusController.update);
  router.delete('/:id', AuthMiddleware.requireAdmin, BusController.delete);
  
  // Driver accessible routes
  router.get('/:id', AuthMiddleware.requireDriver, BusController.getById);
  router.post('/:id/position', AuthMiddleware.requireDriver, BusController.updatePosition);
  ```

- [ ] **Add refresh token support**
  ```javascript
  // controllers/AuthController.js
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      const user = await NguoiDungModel.getById(decoded.userId);
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      
      const newToken = jwt.sign(
        { userId: user.maNguoiDung, email: user.email, vaiTro: user.vaiTro },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      
      res.json({ success: true, token: newToken });
    } catch (error) {
      res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
  }
  ```

#### ✅ Success Criteria
- [ ] All routes use `/api/v1/` prefix
- [ ] Authentication middleware integrated
- [ ] Role-based access control working
- [ ] Refresh token implemented

---

### **Day 3-4: Database Integration**
#### 🎯 Objectives
- Replace in-memory store with database models
- Connect all routes to MySQL
- Implement data persistence
- Add migration scripts

#### 📋 Tasks
- [ ] **Update route files to use database models**
  ```javascript
  // routes/api/v1/buses.js
  const BusController = require('../../../controllers/BusController');
  
  // Replace in-memory store with database calls
  router.get('/', BusController.getAll);
  router.post('/', BusController.create);
  router.get('/:id', BusController.getById);
  router.put('/:id', BusController.update);
  router.delete('/:id', BusController.delete);
  ```

- [ ] **Create migration scripts**
  ```sql
  -- database/migrations/001_create_tables.sql
  CREATE TABLE IF NOT EXISTS NguoiDung (
    maNguoiDung INT PRIMARY KEY AUTO_INCREMENT,
    hoTen VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    matKhau VARCHAR(255) NOT NULL,
    soDienThoai VARCHAR(20),
    anhDaiDien VARCHAR(500),
    vaiTro ENUM('quan_tri', 'tai_xe', 'phu_huynh') NOT NULL,
    trangThai BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );
  ```

- [ ] **Create seed data scripts**
  ```sql
  -- database/seeds/001_sample_data.sql
  INSERT INTO NguoiDung (hoTen, email, matKhau, vaiTro) VALUES
  ('Admin User', 'admin@school.edu.vn', '$2a$10$hash', 'quan_tri'),
  ('Driver User', 'driver@school.edu.vn', '$2a$10$hash', 'tai_xe'),
  ('Parent User', 'parent@school.edu.vn', '$2a$10$hash', 'phu_huynh');
  ```

- [ ] **Add database connection testing**
  ```javascript
  // config/db.config.js
  const testConnection = async () => {
    try {
      const connection = await pool.getConnection();
      console.log('✅ Database connected successfully');
      connection.release();
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
  };
  
  testConnection();
  ```

#### ✅ Success Criteria
- [ ] All routes use database models
- [ ] No in-memory store usage
- [ ] Migration scripts working
- [ ] Seed data loaded

---

### **Day 5-7: Socket.IO Authentication**
#### 🎯 Objectives
- Add JWT authentication to Socket.IO
- Implement room access control
- Add user context to events
- Secure real-time communication

#### 📋 Tasks
- [ ] **Add JWT middleware to Socket.IO**
  ```javascript
  // server.js
  const jwt = require('jsonwebtoken');
  
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.vaiTro;
      socket.userEmail = decoded.email;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });
  ```

- [ ] **Implement room access control**
  ```javascript
  // server.js
  io.on('connection', (socket) => {
    console.log(`✅ User ${socket.userId} connected`);
    
    // Join user-specific room
    socket.join(`user-${socket.userId}`);
    
    // Handle bus room joining with access control
    socket.on('join-bus-room', async (busId) => {
      try {
        // Check if user has access to this bus
        const hasAccess = await checkBusAccess(socket.userId, socket.userRole, busId);
        if (hasAccess) {
          socket.join(`bus-${busId}`);
          socket.emit('joined-bus-room', { busId, status: 'joined' });
        } else {
          socket.emit('error', { message: 'Access denied to bus room' });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to join bus room' });
      }
    });
  });
  ```

- [ ] **Add user context to events**
  ```javascript
  // controllers/BusController.js
  static async updatePosition(req, res) {
    try {
      const { lat, lng, speed } = req.body;
      const busId = req.params.id;
      const userId = req.user.userId;
      
      // Update position in database
      await XeBuytModel.updatePosition(busId, { lat, lng, speed });
      
      // Emit event with user context
      const io = req.app.get('io');
      io.to(`bus-${busId}`).emit('bus_position_update', {
        busId,
        position: { lat, lng, speed },
        timestamp: new Date().toISOString(),
        updatedBy: userId
      });
      
      res.json({ success: true, message: 'Position updated' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  ```

#### ✅ Success Criteria
- [ ] JWT authentication on Socket.IO
- [ ] Room access control working
- [ ] User context in events
- [ ] Secure real-time communication

---

## 🗓️ WEEK 2: MISSING ENDPOINTS & FEATURES

### **Day 1-3: M2, M5, M7, M8 Endpoints**
#### 🎯 Objectives
- Create M2 (Routes) endpoints
- Create M5 (Trips) endpoints
- Create M7 (Reports) endpoints
- Create M8 (Admin) endpoints

#### 📋 Tasks
- [ ] **Create M2 (Routes) endpoints**
  ```javascript
  // routes/api/v1/routes.js
  const express = require('express');
  const AuthMiddleware = require('../../../middlewares/AuthMiddleware');
  const RouteController = require('../../../controllers/RouteController');
  
  const router = express.Router();
  router.use(AuthMiddleware.authenticate);
  
  router.get('/', RouteController.getAll);
  router.post('/', AuthMiddleware.requireAdmin, RouteController.create);
  router.get('/:id', RouteController.getById);
  router.put('/:id', AuthMiddleware.requireAdmin, RouteController.update);
  router.delete('/:id', AuthMiddleware.requireAdmin, RouteController.delete);
  router.get('/:id/stops', RouteController.getStops);
  router.post('/:id/stops', AuthMiddleware.requireAdmin, RouteController.addStop);
  ```

- [ ] **Create M5 (Trips) endpoints**
  ```javascript
  // routes/api/v1/trips.js
  const express = require('express');
  const AuthMiddleware = require('../../../middlewares/AuthMiddleware');
  const TripController = require('../../../controllers/TripController');
  
  const router = express.Router();
  router.use(AuthMiddleware.authenticate);
  
  router.get('/', TripController.getAll);
  router.post('/:id/start', AuthMiddleware.requireDriver, TripController.startTrip);
  router.post('/:id/end', AuthMiddleware.requireDriver, TripController.endTrip);
  router.post('/:id/students/:studentId/status', TripController.updateStudentStatus);
  ```

- [ ] **Create M7 (Reports) endpoints**
  ```javascript
  // routes/api/v1/reports.js
  const express = require('express');
  const AuthMiddleware = require('../../../middlewares/AuthMiddleware');
  const ReportController = require('../../../controllers/ReportController');
  
  const router = express.Router();
  router.use(AuthMiddleware.authenticate);
  router.use(AuthMiddleware.requireAdmin);
  
  router.get('/buses/stats', ReportController.getBusStats);
  router.get('/trips/stats', ReportController.getTripStats);
  router.get('/students/stats', ReportController.getStudentStats);
  ```

- [ ] **Create M8 (Admin) endpoints**
  ```javascript
  // routes/api/v1/admin.js
  const express = require('express');
  const AuthMiddleware = require('../../../middlewares/AuthMiddleware');
  const AdminController = require('../../../controllers/AdminController');
  
  const router = express.Router();
  router.use(AuthMiddleware.authenticate);
  router.use(AuthMiddleware.requireAdmin);
  
  router.get('/dashboard', AdminController.getDashboard);
  router.put('/settings/thresholds', AdminController.updateThresholds);
  router.get('/system/health', AdminController.getSystemHealth);
  ```

#### ✅ Success Criteria
- [ ] M2 endpoints working
- [ ] M5 endpoints working
- [ ] M7 endpoints working
- [ ] M8 endpoints working

---

### **Day 4-5: Socket.IO Events**
#### 🎯 Objectives
- Implement missing Socket.IO events
- Add real-time notifications
- Implement delay alerts
- Add stop approach detection

#### 📋 Tasks
- [ ] **Implement trip events**
  ```javascript
  // controllers/TripController.js
  static async startTrip(req, res) {
    try {
      const tripId = req.params.id;
      const userId = req.user.userId;
      
      // Start trip in database
      await ChuyenDiModel.startTrip(tripId, userId);
      
      // Emit trip started event
      const io = req.app.get('io');
      io.to(`trip-${tripId}`).emit('trip_started', {
        tripId,
        startTime: new Date().toISOString(),
        driverId: userId
      });
      
      res.json({ success: true, message: 'Trip started' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  ```

- [ ] **Implement delay alerts**
  ```javascript
  // services/AlertService.js
  class AlertService {
    static async checkDelay(tripId, scheduledTime) {
      const currentTime = new Date();
      const delay = currentTime - new Date(scheduledTime);
      
      if (delay > 5 * 60 * 1000) { // 5 minutes delay
        const io = req.app.get('io');
        io.to(`trip-${tripId}`).emit('delay_alert', {
          tripId,
          delayMinutes: Math.floor(delay / 60000),
          message: `Trip is ${Math.floor(delay / 60000)} minutes late`
        });
      }
    }
  }
  ```

- [ ] **Implement stop approach detection**
  ```javascript
  // services/GeofencingService.js
  class GeofencingService {
    static async checkApproachStop(busId, currentPosition, stops) {
      for (const stop of stops) {
        const distance = this.calculateDistance(currentPosition, stop.position);
        if (distance <= 60) { // 60 meters
          const io = req.app.get('io');
          io.to(`bus-${busId}`).emit('approach_stop', {
            busId,
            stopId: stop.id,
            stopName: stop.name,
            distance,
            etaMinutes: Math.floor(distance / 1000 * 2) // Rough ETA
          });
        }
      }
    }
  }
  ```

#### ✅ Success Criteria
- [ ] Trip events working
- [ ] Delay alerts working
- [ ] Stop approach detection
- [ ] Real-time notifications

---

### **Day 6-7: Testing & Validation**
#### 🎯 Objectives
- Add input validation
- Implement error handling
- Add business logic validation
- Test all endpoints

#### 📋 Tasks
- [ ] **Add Joi validation**
  ```javascript
  // validators/busValidator.js
  const Joi = require('joi');
  
  const busSchema = Joi.object({
    bienSoXe: Joi.string().required(),
    dongXe: Joi.string().required(),
    sucChua: Joi.number().integer().min(1).max(100).required(),
    trangThai: Joi.string().valid('hoat_dong', 'bao_tri', 'ngung_hoat_dong')
  });
  
  const validateBus = (req, res, next) => {
    const { error } = busSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details
      });
    }
    next();
  };
  ```

- [ ] **Add global error handler**
  ```javascript
  // middlewares/errorHandler.js
  const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: err.details
      });
    }
    
    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  };
  ```

- [ ] **Add business logic validation**
  ```javascript
  // controllers/ScheduleController.js
  static async create(req, res) {
    try {
      const { maTuyen, maXe, maTaiXe, gioKhoiHanh } = req.body;
      
      // Check for conflicts
      const conflicts = await LichTrinhModel.checkConflicts(maXe, maTaiXe, gioKhoiHanh);
      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Schedule conflict detected',
          conflicts
        });
      }
      
      // Create schedule
      const schedule = await LichTrinhModel.create(req.body);
      res.status(201).json({ success: true, data: schedule });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  ```

#### ✅ Success Criteria
- [ ] Input validation working
- [ ] Error handling implemented
- [ ] Business logic validation
- [ ] All endpoints tested

---

## 🗓️ WEEK 3: PRODUCTION READY

### **Day 1-2: Performance & Security**
#### 🎯 Objectives
- Optimize database queries
- Implement caching
- Add security measures
- Performance monitoring

#### 📋 Tasks
- [ ] **Optimize database queries**
  ```javascript
  // models/XeBuytModel.js
  static async getAllWithPagination(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(`
      SELECT x.*, t.hoTen as taiXeTen 
      FROM XeBuyt x 
      LEFT JOIN LichTrinh l ON x.maXe = l.maXe 
      LEFT JOIN TaiXe t ON l.maTaiXe = t.maTaiXe 
      ORDER BY x.maXe 
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    return rows;
  }
  ```

- [ ] **Implement Redis caching**
  ```javascript
  // services/CacheService.js
  const redis = require('redis');
  const client = redis.createClient();
  
  class CacheService {
    static async get(key) {
      const cached = await client.get(key);
      return cached ? JSON.parse(cached) : null;
    }
    
    static async set(key, data, ttl = 300) {
      await client.setex(key, ttl, JSON.stringify(data));
    }
  }
  ```

- [ ] **Add security measures**
  ```javascript
  // app.js
  const rateLimit = require('express-rate-limit');
  const helmet = require('helmet');
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  
  app.use(limiter);
  app.use(helmet());
  ```

#### ✅ Success Criteria
- [ ] Database queries optimized
- [ ] Caching implemented
- [ ] Security measures added
- [ ] Performance monitoring

---

### **Day 3-4: Error Handling & Logging**
#### 🎯 Objectives
- Implement structured logging
- Add error monitoring
- Add request tracking
- Add health checks

#### 📋 Tasks
- [ ] **Add structured logging**
  ```javascript
  // utils/logger.js
  const winston = require('winston');
  
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new winston.transports.File({ filename: 'combined.log' })
    ]
  });
  ```

- [ ] **Add health checks**
  ```javascript
  // routes/health.js
  const healthCheck = async (req, res) => {
    try {
      // Check database connection
      await pool.query('SELECT 1');
      
      // Check Redis connection
      await client.ping();
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'up',
          redis: 'up',
          socketio: 'up'
        }
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  };
  ```

#### ✅ Success Criteria
- [ ] Structured logging working
- [ ] Error monitoring implemented
- [ ] Request tracking added
- [ ] Health checks working

---

### **Day 5-7: Documentation & Deployment**
#### 🎯 Objectives
- Create OpenAPI specification
- Add API documentation
- Create deployment guide
- Add monitoring setup

#### 📋 Tasks
- [ ] **Create OpenAPI specification**
  ```yaml
  # docs/openapi.yaml
  openapi: 3.0.0
  info:
    title: SSB 1.0 API
    version: 1.0.0
    description: Smart School Bus Tracking System API
  
  servers:
    - url: http://localhost:3001/api/v1
      description: Development server
  
  paths:
    /auth/login:
      post:
        summary: User login
        requestBody:
          required: true
          content:
            application/json:
              schema:
                type: object
                properties:
                  email:
                    type: string
                    format: email
                  password:
                    type: string
        responses:
          '200':
            description: Login successful
            content:
              application/json:
                schema:
                  type: object
                  properties:
                    success:
                      type: boolean
                    data:
                      type: object
                      properties:
                        token:
                          type: string
                        user:
                          $ref: '#/components/schemas/User'
  ```

- [ ] **Create deployment guide**
  ```markdown
  # DEPLOYMENT.md
  ## Prerequisites
  - Node.js 18+
  - MySQL 8.0+
  - Redis 6.0+
  
  ## Installation
  1. Clone repository
  2. Install dependencies: `npm install`
  3. Setup environment variables
  4. Run database migrations
  5. Start server: `npm start`
  ```

#### ✅ Success Criteria
- [ ] OpenAPI spec created
- [ ] API documentation complete
- [ ] Deployment guide ready
- [ ] Monitoring setup

---

## 🎯 SUCCESS METRICS

### **Technical Metrics**
- [ ] 100% API endpoints with authentication
- [ ] 100% database integration
- [ ] 100% Socket.IO events implemented
- [ ] 0% in-memory store usage
- [ ] < 100ms API response time
- [ ] < 3s Socket.IO event latency

### **Security Metrics**
- [ ] 100% JWT protection
- [ ] 100% role-based access control
- [ ] 100% input validation
- [ ] 0% security vulnerabilities

### **Quality Metrics**
- [ ] 90%+ test coverage
- [ ] 0 ESLint errors
- [ ] 100% API documentation
- [ ] 100% deployment ready

---

## 🚨 RISK MITIGATION

### **Technical Risks**
| Risk | Impact | Mitigation |
|------|--------|------------|
| Database connection issues | 🔴 High | Add connection pooling, retry logic |
| Socket.IO authentication | 🔴 High | Test thoroughly, add fallbacks |
| Performance issues | 🟡 Medium | Add caching, optimize queries |
| Security vulnerabilities | 🔴 High | Security audit, penetration testing |

### **Timeline Risks**
| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep | 🔴 High | Stick to MVP features, defer nice-to-haves |
| Integration complexity | 🟡 Medium | Test incrementally, add monitoring |
| Testing time | 🟡 Medium | Start testing early, automate where possible |

---

## 📋 CHECKLIST

### **Week 1 Checklist**
- [ ] API v1 structure created
- [ ] Authentication integrated
- [ ] Database integration complete
- [ ] Socket.IO authentication working

### **Week 2 Checklist**
- [ ] Missing endpoints created
- [ ] Socket.IO events implemented
- [ ] Validation added
- [ ] Error handling implemented

### **Week 3 Checklist**
- [ ] Performance optimized
- [ ] Security measures added
- [ ] Documentation complete
- [ ] Deployment ready

---

## 🎉 CONCLUSION

**Kết quả mong đợi**: Sau 3 tuần, backend sẽ chuyển từ development sang production-ready với:
- ✅ Full API v1 structure
- ✅ Complete authentication
- ✅ Database integration
- ✅ Socket.IO enhancement
- ✅ Production-ready features
- ✅ Comprehensive documentation

**Timeline**: 2-3 tuần (có thể extend thêm 1 tuần nếu cần)
**Team size**: 1-2 developers
**Budget**: Minimal (chỉ cần hosting và monitoring)

---

*Hardening Plan được tạo tự động bởi SSB Backend Analysis Tool*
