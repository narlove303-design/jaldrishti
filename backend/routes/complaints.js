import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole, recordAudit } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/complaints
 * Returns complaints. Residents see their village complaints; Staff/Admin see all.
 */
router.get('/', authenticateToken, (req, res) => {
  let query = 'SELECT * FROM complaints';
  const params = [];

  if (req.user.role === 'Resident') {
    query += ' WHERE village = ?';
    params.push(req.user.village);
  }

  query += ' ORDER BY id DESC';

  const complaints = db.prepare(query).all(...params);

  const enriched = complaints.map(c => ({
    ...c,
    tracking_updates: JSON.parse(c.tracking_updates_json || '[]')
  }));

  res.json({ complaints: enriched });
});

/**
 * GET /api/complaints/track/:code
 * Public / Resident lookup by reference code (e.g., CMP-1042)
 */
router.get('/track/:code', (req, res) => {
  const { code } = req.params;
  const complaint = db.prepare('SELECT * FROM complaints WHERE UPPER(complaint_code) = UPPER(?)').get(code.trim());

  if (!complaint) {
    return res.status(404).json({ error: `Complaint reference '${code}' not found in utility registry.` });
  }

  res.json({
    complaint: {
      ...complaint,
      tracking_updates: JSON.parse(complaint.tracking_updates_json || '[]')
    }
  });
});

/**
 * POST /api/complaints
 * Submit a new water complaint
 */
router.post('/', authenticateToken, (req, res) => {
  const { category, location, description, resident_contact, photo_url } = req.body;

  if (!category || !location || !description) {
    return res.status(400).json({ error: 'Category, location, and description are required.' });
  }

  const village = req.user.role === 'Resident' ? req.user.village : (req.body.village || 'Village A');

  // Generate unique complaint code: CMP-XXXX
  const nextId = (db.prepare('SELECT MAX(id) as maxId FROM complaints').get()?.maxId || 1042) + 1;
  const complaintCode = `CMP-${nextId}`;

  const initialTimeline = [
    {
      time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      note: `Complaint received and logged in ${village} municipal queue.`
    }
  ];

  const insertComplaint = db.prepare(`
    INSERT INTO complaints (complaint_code, village, category, location, description, resident_name, resident_contact, photo_url, status, tracking_updates_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?)
  `);

  insertComplaint.run(
    complaintCode,
    village,
    category,
    location.trim(),
    description.trim(),
    req.user.name,
    resident_contact || req.user.email_or_mobile,
    photo_url || null,
    JSON.stringify(initialTimeline)
  );

  recordAudit(
    req.user.name,
    req.user.role,
    'COMPLAINT_FILED',
    'Complaints',
    `Registered complaint ${complaintCode} (${category}) at ${location} for ${village}.`
  );

  res.status(201).json({
    message: 'Water complaint registered successfully.',
    complaintCode,
    village,
    status: 'Open'
  });
});

/**
 * PATCH /api/complaints/:id/status
 * Update complaint status, assign technician, or log field resolution
 */
router.patch('/:id/status', authenticateToken, requireRole('Administrator', 'Operating Staff'), (req, res) => {
  const { id } = req.params;
  const { status, technician_notes, progress_note } = req.body;

  const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  let timeline = [];
  try {
    timeline = JSON.parse(complaint.tracking_updates_json || '[]');
  } catch {
    timeline = [];
  }

  if (progress_note) {
    timeline.push({
      time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      note: progress_note
    });
  }

  let resolvedAt = complaint.resolved_at;
  if (status === 'Resolved' && !complaint.resolved_at) {
    resolvedAt = new Date().toISOString();
  }

  db.prepare(`
    UPDATE complaints
    SET status = ?, technician_notes = ?, tracking_updates_json = ?, resolved_at = ?
    WHERE id = ?
  `).run(
    status || complaint.status,
    technician_notes || complaint.technician_notes,
    JSON.stringify(timeline),
    resolvedAt,
    id
  );

  recordAudit(
    req.user.name,
    req.user.role,
    'COMPLAINT_UPDATED',
    'Complaints',
    `Updated complaint ${complaint.complaint_code} to status: ${status}. Note: ${progress_note || ''}`
  );

  res.json({ message: 'Complaint updated successfully', complaint_code: complaint.complaint_code });
});

export default router;
