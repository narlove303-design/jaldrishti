import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/tanks
 * Returns water tank telemetry for all villages
 */
router.get('/', authenticateToken, (req, res) => {
  let query = 'SELECT * FROM tanks';
  let params = [];

  // Residents only see their own tank
  if (req.user.role === 'Resident') {
    query += ' WHERE village_name = ?';
    params.push(req.user.village);
  }

  const tanks = db.prepare(query).all(...params);

  const enrichedTanks = tanks.map(t => {
    const currentVolumeLiters = Math.round((t.capacity_liters * t.current_level_percent) / 100);
    const netFlow = Number((t.inlet_flow_m3h - t.outlet_flow_m3h).toFixed(1));
    const hoursToEmpty = t.outlet_flow_m3h > 0 
      ? Number((currentVolumeLiters / (t.outlet_flow_m3h * 1000)).toFixed(1))
      : 24;

    return {
      ...t,
      current_volume_liters: currentVolumeLiters,
      net_flow_m3h: netFlow,
      hours_to_empty: hoursToEmpty,
      level_status: t.current_level_percent < 25 ? 'Low' : t.current_level_percent > 90 ? 'High' : 'Optimal'
    };
  });

  res.json({ tanks: enrichedTanks });
});

export default router;
