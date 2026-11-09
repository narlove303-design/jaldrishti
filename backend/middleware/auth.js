import 'dotenv/config';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { db } from '../db.js';

// Resolve JWT secret securely
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY CONFIGURATION: JWT_SECRET environment variable is missing in production mode.');
  }
  // Generate a non-predictable cryptographic 256-bit key for dev/test session
  jwtSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[SECURITY] Notice: Using dynamically generated JWT secret for local session. Set JWT_SECRET in .env for persistent sessions.');
}

export const JWT_SECRET = jwtSecret;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Middleware to verify JWT token and attach user to request
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please provide a valid Bearer token.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Refresh user from DB to ensure status/role hasn't changed or been revoked
    const user = db.prepare('SELECT id, name, email_or_mobile, role, village FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session token has expired. Please log in again.' });
    }
    return res.status(403).json({ error: 'Invalid or forged session token.' });
  }
}

/**
 * Helper to verify JWT token synchronously (for WebSocket connections)
 */
export function verifyJwtToken(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email_or_mobile, role, village FROM users WHERE id = ?').get(decoded.id);
    return user || null;
  } catch {
    return null;
  }
}

/**
 * Middleware to enforce strict Role-Based Access Control (RBAC)
 * @param  {...string} allowedRoles Roles permitted to access the route ('Administrator', 'Operating Staff', 'Resident')
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated user' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Security enforcement: log unauthorized privilege escalation attempt to audit log
      try {
        const insertAudit = db.prepare(`
          INSERT INTO audit_logs (actor_name, actor_role, action, module, details, ip_address)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        insertAudit.run(
          req.user.name,
          req.user.role,
          'SECURITY_VIOLATION_BLOCKED',
          'Access Control',
          `Attempted unauthorized access to ${req.originalUrl}. Required roles: [${allowedRoles.join(', ')}].`,
          req.ip || '127.0.0.1'
        );
      } catch (logErr) {
        console.error('Failed to log security violation:', logErr);
      }

      return res.status(403).json({
        error: 'Forbidden: Insufficient privileges. Residents cannot access administrative or operational systems.',
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
}

/**
 * Helper to record actions in the audit trail
 */
export function recordAudit(actorName, actorRole, action, module, details, ipAddress = '127.0.0.1') {
  try {
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (actor_name, actor_role, action, module, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertAudit.run(actorName, actorRole, action, module, details, ipAddress);
  } catch (err) {
    console.error('Audit log write error:', err);
  }
}
