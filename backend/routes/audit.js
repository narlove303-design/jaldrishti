import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/audit
 * Returns system audit logs (Admin only)
 */
router.get('/', authenticateToken, requireRole('Administrator'), (req, res) => {
  const { module, limit = 100 } = req.query;

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (module && module !== 'All') {
    query += ' AND module = ?';
    params.push(module);
  }

  query += ' ORDER BY id DESC LIMIT ?';
  params.push(Number(limit));

  const logs = db.prepare(query).all(...params);

  res.json({ logs });
});

export default router;
