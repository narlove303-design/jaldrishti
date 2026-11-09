import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole, recordAudit } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/assets
 * Returns asset registry
 */
router.get('/', authenticateToken, requireRole('Administrator', 'Operating Staff'), (req, res) => {
  const { category, village, search } = req.query;

  let query = 'SELECT * FROM assets WHERE 1=1';
  const params = [];

  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }
  if (village && village !== 'All') {
    query += " AND (village = ? OR village = 'All')";
    params.push(village);
  }
  if (search) {
    query += ' AND (name LIKE ? OR asset_tag LIKE ? OR model_spec LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY id ASC';

  const assets = db.prepare(query).all(...params);
  res.json({ assets });
});

/**
 * POST /api/assets
 * Add new asset (Admin only)
 */
router.post('/', authenticateToken, requireRole('Administrator'), (req, res) => {
  const { id, asset_tag, category, name, village, installation_date, condition, status, model_spec } = req.body;

  if (!asset_tag || !category || !name || !village) {
    return res.status(400).json({ error: 'Asset tag, category, name, and village are required.' });
  }

  const assetId = id || `AST-${Date.now().toString().slice(-4)}`;

  const insertAsset = db.prepare(`
    INSERT INTO assets (id, asset_tag, category, name, village, installation_date, condition, status, model_spec)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAsset.run(
    assetId,
    asset_tag.trim(),
    category,
    name.trim(),
    village,
    installation_date || '2026-11-01',
    condition || 'Good',
    status || 'Operational',
    model_spec || 'Standard specification'
  );

  recordAudit(req.user.name, req.user.role, 'ASSET_CREATED', 'Asset Registry', `Registered new asset ${asset_tag}: ${name} in ${village}.`);

  res.status(201).json({ message: 'Asset created successfully', id: assetId });
});

/**
 * PUT /api/assets/:id
 * Update asset details (Admin only)
 */
router.put('/:id', authenticateToken, requireRole('Administrator'), (req, res) => {
  const { id } = req.params;
  const { name, condition, status, model_spec, village } = req.body;

  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  db.prepare(`
    UPDATE assets
    SET name = ?, condition = ?, status = ?, model_spec = ?, village = ?
    WHERE id = ?
  `).run(
    name || asset.name,
    condition || asset.condition,
    status || asset.status,
    model_spec || asset.model_spec,
    village || asset.village,
    id
  );

  recordAudit(req.user.name, req.user.role, 'ASSET_UPDATED', 'Asset Registry', `Updated asset ${asset.asset_tag} (${name || asset.name}).`);

  res.json({ message: 'Asset updated successfully' });
});

export default router;
