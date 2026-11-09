import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole, recordAudit } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/notices
 * Returns notices visible to the user.
 * Residents only receive notices targeting their village or 'All'.
 */
router.get('/', authenticateToken, (req, res) => {
  const { category, village } = req.query;

  let query = "SELECT * FROM notices WHERE status != 'Archived'";
  const params = [];

  // Residents only see approved & active/restored notices targeting their village
  if (req.user.role === 'Resident') {
    query += " AND status IN ('Active', 'Restored')";
  }

  query += ' ORDER BY published_at DESC';

  const notices = db.prepare(query).all();

  // Get list of notices read by this user
  const readNoticeIds = new Set(
    db.prepare('SELECT notice_id FROM user_read_notices WHERE user_id = ?')
      .all(req.user.id)
      .map(r => r.notice_id)
  );

  // Filter based on role & target village
  const filtered = notices.filter(n => {
    let targets = [];
    try {
      targets = JSON.parse(n.target_villages_json);
    } catch {
      targets = ['Village A', 'Village B', 'Village C'];
    }

    // Resident filtering: must target their village or 'All'
    if (req.user.role === 'Resident') {
      const appliesToMe = targets.includes(req.user.village) || targets.includes('All');
      if (!appliesToMe) return false;
    } else if (village && village !== 'All') {
      if (!targets.includes(village) && !targets.includes('All')) return false;
    }

    if (category && category !== 'All' && n.category !== category) {
      return false;
    }

    return true;
  });

  const enriched = filtered.map(n => ({
    ...n,
    target_villages: JSON.parse(n.target_villages_json),
    is_read: readNoticeIds.has(n.id)
  }));

  const unreadCount = enriched.filter(n => !n.is_read).length;

  res.json({
    notices: enriched,
    unreadCount
  });
});

/**
 * POST /api/notices/:id/toggle-read
 * Mark notice as read / unread for current user
 */
router.post('/:id/toggle-read', authenticateToken, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM user_read_notices WHERE user_id = ? AND notice_id = ?').get(req.user.id, id);

  if (existing) {
    db.prepare('DELETE FROM user_read_notices WHERE user_id = ? AND notice_id = ?').run(req.user.id, id);
    return res.json({ is_read: false });
  } else {
    db.prepare('INSERT INTO user_read_notices (user_id, notice_id) VALUES (?, ?)').run(req.user.id, id);
    return res.json({ is_read: true });
  }
});

/**
 * POST /api/notices
 * Create a new notice:
 * - Administrator: Publishes immediately (status = 'Active')
 * - Operating Staff: Submits draft for Administrator review (status = 'Pending Approval')
 * - Resident: Forbidden (403)
 */
router.post('/', authenticateToken, requireRole('Administrator', 'Operating Staff'), (req, res) => {
  const { title, target_villages, category, priority, description, expected_restoration } = req.body;

  if (!title || !category || !priority || !description) {
    return res.status(400).json({ error: 'Title, category, priority, and description are required.' });
  }

  const villagesArray = Array.isArray(target_villages) && target_villages.length > 0 
    ? target_villages 
    : ['Village A', 'Village B', 'Village C'];

  const initialStatus = req.user.role === 'Administrator' ? 'Active' : 'Pending Approval';

  const insertNotice = db.prepare(`
    INSERT INTO notices (title, target_villages_json, category, priority, description, status, expected_restoration, author_role, author_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertNotice.run(
    title.trim(),
    JSON.stringify(villagesArray),
    category,
    priority,
    description.trim(),
    initialStatus,
    expected_restoration || 'Not specified',
    req.user.role,
    req.user.name
  );

  recordAudit(
    req.user.name,
    req.user.role,
    req.user.role === 'Administrator' ? 'NOTICE_PUBLISHED' : 'NOTICE_DRAFT_SUBMITTED',
    'Notice Board',
    `Created notice: "${title}" for [${villagesArray.join(', ')}] with priority ${priority}. Status: ${initialStatus}.`
  );

  res.status(201).json({
    message: req.user.role === 'Administrator' 
      ? 'Notice published immediately to village bulletin boards.' 
      : 'Operational notice submitted for Administrator review and approval.',
    noticeId: Number(result.lastInsertRowid),
    status: initialStatus
  });
});

/**
 * POST /api/notices/:id/approve
 * Administrator approves pending operator notice
 */
router.post('/:id/approve', authenticateToken, requireRole('Administrator'), (req, res) => {
  const { id } = req.params;
  const notice = db.prepare('SELECT * FROM notices WHERE id = ?').get(id);

  if (!notice) {
    return res.status(404).json({ error: 'Notice not found' });
  }

  db.prepare("UPDATE notices SET status = 'Active', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);

  recordAudit(
    req.user.name,
    req.user.role,
    'NOTICE_APPROVED',
    'Notice Board',
    `Administrator approved operator notice #${id}: "${notice.title}"`
  );

  res.json({ message: 'Notice approved and published to village boards.' });
});

/**
 * PUT /api/notices/:id
 * Edit notice (Admin only)
 */
router.put('/:id', authenticateToken, requireRole('Administrator'), (req, res) => {
  const { id } = req.params;
  const { title, target_villages, category, priority, description, expected_restoration, status } = req.body;

  const notice = db.prepare('SELECT * FROM notices WHERE id = ?').get(id);
  if (!notice) {
    return res.status(404).json({ error: 'Notice not found' });
  }

  db.prepare(`
    UPDATE notices
    SET title = ?, target_villages_json = ?, category = ?, priority = ?, description = ?,
        expected_restoration = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title,
    JSON.stringify(target_villages),
    category,
    priority,
    description,
    expected_restoration,
    status || notice.status,
    id
  );

  recordAudit(req.user.name, req.user.role, 'NOTICE_EDITED', 'Notice Board', `Updated notice #${id}: "${title}"`);

  res.json({ message: 'Notice updated successfully' });
});

/**
 * DELETE /api/notices/:id
 * Archive notice (Admin only)
 */
router.delete('/:id', authenticateToken, requireRole('Administrator'), (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE notices SET status = 'Archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  recordAudit(req.user.name, req.user.role, 'NOTICE_ARCHIVED', 'Notice Board', `Archived notice #${id}`);
  res.json({ message: 'Notice archived successfully.' });
});

export default router;
