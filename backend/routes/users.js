import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { authenticateToken, requireRole, recordAudit } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/users
 * Returns list of users (Admin only)
 */
router.get('/', authenticateToken, requireRole('Administrator'), (req, res) => {
  const users = db.prepare('SELECT id, name, email_or_mobile, role, village, created_at FROM users ORDER BY id ASC').all();
  res.json({ users });
});

/**
 * POST /api/users
 * Create user / operator (Admin only)
 */
router.post('/', authenticateToken, requireRole('Administrator'), (req, res) => {
  const { name, email_or_mobile, password, role, village } = req.body;

  if (!name || !email_or_mobile || !password || !role) {
    return res.status(400).json({ error: 'Name, email/mobile, password, and role are required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email_or_mobile) = LOWER(?)').get(email_or_mobile.trim());
  if (existing) {
    return res.status(400).json({ error: 'User with this email/mobile already exists.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const insertUser = db.prepare(`
    INSERT INTO users (name, email_or_mobile, password_hash, role, village)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = insertUser.run(name.trim(), email_or_mobile.trim(), hash, role, village || 'All');

  recordAudit(
    req.user.name,
    req.user.role,
    'USER_CREATED',
    'User Management',
    `Administrator provisioned new user "${name}" with role [${role}] assigned to [${village || 'All'}].`
  );

  res.status(201).json({
    message: 'User created successfully',
    userId: Number(result.lastInsertRowid)
  });
});

/**
 * DELETE /api/users/:id
 * Delete user (Admin only)
 */
router.delete('/:id', authenticateToken, requireRole('Administrator'), (req, res) => {
  const { id } = req.params;
  
  if (Number(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own administrator account.' });
  }

  const user = db.prepare('SELECT name, role FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  recordAudit(req.user.name, req.user.role, 'USER_DELETED', 'User Management', `Deleted account for ${user.name} (${user.role}).`);

  res.json({ message: 'User deleted successfully' });
});

export default router;
