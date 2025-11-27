import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import config from '../config/env.js';

// Helper function to check if origin is allowed
function isOriginAllowed(origin: string | undefined, allowedOrigins: string | string[]): boolean {
  if (!origin) return false;
  
  const origins = Array.isArray(allowedOrigins) ? allowedOrigins : [allowedOrigins];
  
  // Check exact match
  if (origins.includes(origin)) return true;
  
  // Check if origin matches any pattern in allowedOrigins
  return origins.some(allowed => {
    if (typeof allowed === 'string') {
      // Support wildcard patterns like http://192.168.*.*
      const pattern = allowed.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    return false;
  });
}

// CORS configuration - supports multiple origins including LAN IPs
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (isOriginAllowed(origin, config.frontend.origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false, // Disable credentials for security
  optionsSuccessStatus: 200,
};

// CORS middleware
export const corsMiddleware = cors(corsOptions);

// Custom CORS handler for preflight requests
export const corsHandler = (req: Request, res: Response, next: NextFunction) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    const allowedOrigins = Array.isArray(config.frontend.origin) 
      ? config.frontend.origin 
      : [config.frontend.origin];
    
    // Find matching origin
    const matchingOrigin = allowedOrigins.find(allowed => {
      if (!origin) return false;
      if (typeof allowed === 'string') {
        const pattern = allowed.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin) || allowed === origin;
      }
      return false;
    }) || origin;
    
    if (origin && isOriginAllowed(origin, config.frontend.origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else if (matchingOrigin) {
      res.header('Access-Control-Allow-Origin', matchingOrigin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'false');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    return res.status(200).end();
  }
  
  return next();
};

// Security headers middleware
export const securityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  next();
};

// Rate limiting headers
export const rateLimitHeaders = (_req: Request, res: Response, next: NextFunction) => {
  const remaining = res.get('X-RateLimit-Remaining');
  const reset = res.get('X-RateLimit-Reset');
  
  if (remaining !== undefined) {
    res.setHeader('X-RateLimit-Remaining', remaining);
  }
  
  if (reset !== undefined) {
    res.setHeader('X-RateLimit-Reset', reset);
  }
  
  next();
};
