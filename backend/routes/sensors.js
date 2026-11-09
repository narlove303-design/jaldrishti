import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole, recordAudit } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/sensors
 * Returns multi-parameter sensor readings with thresholds & calibration data
 */
router.get('/', authenticateToken, (req, res) => {
  const { village, type } = req.query;

  let query = 'SELECT * FROM sensors WHERE 1=1';
  const params = [];

  if (req.user.role === 'Resident') {
    // Residents only see sensors for their village
    query += ' AND village = ?';
    params.push(req.user.village);
  } else if (village && village !== 'All') {
    query += ' AND village = ?';
    params.push(village);
  }

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY sensor_tag ASC';

  const sensors = db.prepare(query).all(...params);

  res.json({
    sensors,
    meta: {
      totalOnline: sensors.filter(s => s.status !== 'Offline').length,
      totalWarning: sensors.filter(s => s.status === 'Warning').length,
      totalCritical: sensors.filter(s => s.status === 'Critical').length,
      disclaimer: 'CRITICAL HEALTH NOTICE: Water quality parameters (chlorine, pH, turbidity) provide real-time indicative sensor telemetry. These readings do NOT certify microbiological potable safety. Drinking water safety requires statutory laboratory pathogen testing.'
    }
  });
});

/**
 * PUT /api/sensors/:id/thresholds
 * Configure sensor warning & critical thresholds (Admin only)
 */
router.put('/:id/thresholds', authenticateToken, requireRole('Administrator'), (req, res) => {
  const { id } = req.params;
  const { min_normal, max_normal, warning_threshold, critical_threshold } = req.body;

  const sensor = db.prepare('SELECT * FROM sensors WHERE id = ?').get(id);
  if (!sensor) {
    return res.status(404).json({ error: 'Sensor not found' });
  }

  db.prepare(`
    UPDATE sensors
    SET min_normal = ?, max_normal = ?, warning_threshold = ?, critical_threshold = ?
    WHERE id = ?
  `).run(Number(min_normal), Number(max_normal), Number(warning_threshold), Number(critical_threshold), id);

  recordAudit(
    req.user.name,
    req.user.role,
    'SENSOR_THRESHOLDS_UPDATED',
    'Sensors',
    `Updated thresholds for ${sensor.sensor_tag} (${sensor.type}) in ${sensor.village}.`
  );

  res.json({ message: 'Sensor thresholds updated successfully' });
});

export default router;
