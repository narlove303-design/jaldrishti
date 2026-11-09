import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole, recordAudit } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/alarms
 * Returns all active and historic alarms
 */
router.get('/', authenticateToken, requireRole('Administrator', 'Operating Staff'), (req, res) => {
  const { status, village, priority } = req.query;

  let query = 'SELECT * FROM alarms WHERE 1=1';
  const params = [];

  if (status && status !== 'All') {
    query += ' AND status = ?';
    params.push(status);
  }
  if (village && village !== 'All') {
    query += " AND (village = ? OR village = 'All')";
    params.push(village);
  }
  if (priority && priority !== 'All') {
    query += ' AND priority = ?';
    params.push(priority);
  }

  query += " ORDER BY CASE status WHEN 'Active' THEN 1 WHEN 'Acknowledged' THEN 2 ELSE 3 END, id DESC";

  const alarms = db.prepare(query).all(...params);

  res.json({ alarms });
});

/**
 * POST /api/alarms/:id/acknowledge
 * Operating staff / Admin acknowledges an active alarm
 */
router.post('/:id/acknowledge', authenticateToken, requireRole('Administrator', 'Operating Staff'), (req, res) => {
  const { id } = req.params;
  const alarm = db.prepare('SELECT * FROM alarms WHERE id = ?').get(id);

  if (!alarm) {
    return res.status(404).json({ error: 'Alarm not found' });
  }

  db.prepare(`
    UPDATE alarms
    SET status = 'Acknowledged', acknowledged_at = CURRENT_TIMESTAMP, assigned_to = COALESCE(assigned_to, ?)
    WHERE id = ?
  `).run(req.user.name, id);

  recordAudit(
    req.user.name,
    req.user.role,
    'ALARM_ACKNOWLEDGED',
    'Alarm Centre',
    `Acknowledged alarm ${alarm.alarm_code}: "${alarm.title}" (${alarm.village}).`
  );

  res.json({ message: 'Alarm acknowledged successfully.' });
});

/**
 * POST /api/alarms/:id/assign
 * Assign technician to alarm
 */
router.post('/:id/assign', authenticateToken, requireRole('Administrator', 'Operating Staff'), (req, res) => {
  const { id } = req.params;
  const { technician } = req.body;

  if (!technician) {
    return res.status(400).json({ error: 'Technician name is required.' });
  }

  db.prepare('UPDATE alarms SET assigned_to = ? WHERE id = ?').run(technician.trim(), id);

  recordAudit(
    req.user.name,
    req.user.role,
    'ALARM_ASSIGNED',
    'Alarm Centre',
    `Assigned technician ${technician} to alarm #${id}.`
  );

  res.json({ message: 'Technician assigned successfully.' });
});

/**
 * POST /api/alarms/:id/resolve
 * Mark alarm as resolved
 */
router.post('/:id/resolve', authenticateToken, requireRole('Administrator', 'Operating Staff'), (req, res) => {
  const { id } = req.params;
  const { resolution_notes } = req.body;

  const alarm = db.prepare('SELECT * FROM alarms WHERE id = ?').get(id);
  if (!alarm) {
    return res.status(404).json({ error: 'Alarm not found' });
  }

  db.prepare(`
    UPDATE alarms
    SET status = 'Resolved', resolved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);

  recordAudit(
    req.user.name,
    req.user.role,
    'ALARM_RESOLVED',
    'Alarm Centre',
    `Resolved alarm ${alarm.alarm_code}. Notes: ${resolution_notes || 'Resolved by operational staff.'}`
  );

  res.json({ message: 'Alarm resolved successfully.' });
});

export default router;
