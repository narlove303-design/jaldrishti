import jwt from 'jsonwebtoken';
import { db } from '../db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'jaldrishti_super_secure_telemetry_jwt_secret_key_2026';

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
    
    // Refresh user from DB to ensure status/role hasn't changed
    const user = db.prepare('SELECT id, name, email_or_mobile, role, village FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired session token. Please log in again.' });
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
