import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole, recordAudit } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/maintenance
 * Returns maintenance work orders
 */
router.get('/', authenticateToken, requireRole('Administrator', 'Operating Staff'), (req, res) => {
  const { status, village } = req.query;

  let query = 'SELECT * FROM maintenance_work_orders WHERE 1=1';
  const params = [];

  if (status && status !== 'All') {
    query += ' AND status = ?';
    params.push(status);
  }
  if (village && village !== 'All') {
    query += ' AND village = ?';
    params.push(village);
  }

  query += ' ORDER BY id DESC';

  const orders = db.prepare(query).all(...params);

  const totalCost = orders.reduce((sum, o) => sum + (o.actual_cost_inr || o.estimated_cost_inr || 0), 0);

  res.json({
    orders,
    summary: {
      totalWorkOrders: orders.length,
      openCount: orders.filter(o => o.status === 'Open').length,
      inProgressCount: orders.filter(o => o.status === 'In Progress').length,
      completedCount: orders.filter(o => o.status === 'Completed').length,
      totalExpenditureInr: Math.round(totalCost)
    }
  });
});

/**
 * POST /api/maintenance
 * Create a new maintenance work order
 */
router.post('/', authenticateToken, requireRole('Administrator', 'Operating Staff'), (req, res) => {
  const { village, task_title, description, priority, technician, estimated_cost_inr, spare_parts_used } = req.body;

  if (!village || !task_title || !description || !technician) {
    return res.status(400).json({ error: 'Village, task title, description, and technician are required.' });
  }

  const nextId = (db.prepare('SELECT MAX(id) as maxId FROM maintenance_work_orders').get()?.maxId || 89) + 1;
  const orderCode = `WO-2026-${String(nextId).padStart(3, '0')}`;

  const insertWO = db.prepare(`
    INSERT INTO maintenance_work_orders (order_code, village, task_title, description, priority, technician, estimated_cost_inr, status, spare_parts_used)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?)
  `);

  insertWO.run(
    orderCode,
    village,
    task_title.trim(),
    description.trim(),
    priority || 'Important',
    technician.trim(),
    Number(estimated_cost_inr || 2000),
    spare_parts_used || 'Standard consumables'
  );

  recordAudit(
    req.user.name,
    req.user.role,
    'WORK_ORDER_CREATED',
    'Maintenance',
    `Created work order ${orderCode}: "${task_title}" in ${village} assigned to ${technician}.`
  );

  res.status(201).json({
    message: 'Maintenance work order created successfully.',
    orderCode
  });
});

/**
 * PUT /api/maintenance/:id
 * Update work order status, technician, actual costs, parts used
 */
router.put('/:id', authenticateToken, requireRole('Administrator', 'Operating Staff'), (req, res) => {
  const { id } = req.params;
  const { status, actual_cost_inr, spare_parts_used, technician, photo_url } = req.body;

  const order = db.prepare('SELECT * FROM maintenance_work_orders WHERE id = ?').get(id);
  if (!order) {
    return res.status(404).json({ error: 'Work order not found' });
  }

  let completedAt = order.completed_at;
  if (status === 'Completed' && !order.completed_at) {
    completedAt = new Date().toISOString();
  }

  db.prepare(`
    UPDATE maintenance_work_orders
    SET status = ?, actual_cost_inr = ?, spare_parts_used = ?, technician = ?, photo_url = COALESCE(?, photo_url), completed_at = ?
    WHERE id = ?
  `).run(
    status || order.status,
    actual_cost_inr !== undefined ? Number(actual_cost_inr) : order.actual_cost_inr,
    spare_parts_used || order.spare_parts_used,
    technician || order.technician,
    photo_url || null,
    completedAt,
    id
  );

  recordAudit(
    req.user.name,
    req.user.role,
    'WORK_ORDER_UPDATED',
    'Maintenance',
    `Updated work order ${order.order_code} to status ${status}. Actual cost: ₹${actual_cost_inr || order.actual_cost_inr}.`
  );

  res.json({ message: 'Work order updated successfully.' });
});

export default router;
