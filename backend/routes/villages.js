import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/villages
 * Returns all 3 villages. Available to all authenticated users.
 * For residents, highlights their own village.
 */
router.get('/', authenticateToken, (req, res) => {
  const villages = db.prepare('SELECT * FROM villages ORDER BY id ASC').all();
  
  // Calculate dynamic storage hours remaining
  const enriched = villages.map(v => {
    const hourlyConsumption = (v.authorized_consumption_kl * 1000) / 24;
    const currentStorageLiters = (v.tank_capacity_liters * v.tank_level_percent) / 100;
    const reserveHours = hourlyConsumption > 0 
      ? Number((currentStorageLiters / hourlyConsumption).toFixed(1)) 
      : 24.0;

    return {
      ...v,
      current_storage_liters: Math.round(currentStorageLiters),
      estimated_reserve_hours: reserveHours,
      per_household_daily_liters: Math.round((v.current_delivered_kl * 1000) / v.total_households)
    };
  });

  res.json({ villages: enriched });
});

/**
 * GET /api/villages/comparison
 * Administrative and Operational multi-village comparison matrix.
 * Blocked for residents!
 */
router.get('/comparison', authenticateToken, requireRole('Administrator', 'Operating Staff'), (req, res) => {
  const villages = db.prepare('SELECT * FROM villages ORDER BY id ASC').all();
  const pump = db.prepare('SELECT total_water_kl FROM pump_station WHERE id = 1').get();

  const totalDelivered = villages.reduce((sum, v) => sum + v.current_delivered_kl, 0);
  const totalAuthorized = villages.reduce((sum, v) => sum + v.authorized_consumption_kl, 0);
  const totalHouseholds = villages.reduce((sum, v) => sum + v.total_households, 0);

  const comparison = {
    summary: {
      totalPumpSuppliedKl: pump ? pump.total_water_kl : 292.5,
      totalDeliveredToVillagesKl: Number(totalDelivered.toFixed(1)),
      totalAuthorizedUseKl: Number(totalAuthorized.toFixed(1)),
      unaccountedTransmissionDifferenceKl: Number((292.5 - totalDelivered).toFixed(1)),
      totalHouseholdsServed: totalHouseholds,
      averageLitersPerCapita: Math.round((totalDelivered * 1000) / totalHouseholds)
    },
    villageMatrix: villages.map(v => ({
      villageName: v.name,
      code: v.code,
      households: v.total_households,
      shareOfWaterPercent: Number(((v.current_delivered_kl / totalDelivered) * 100).toFixed(1)),
      deliveredKl: v.current_delivered_kl,
      authorizedKl: v.authorized_consumption_kl,
      unbilledApparentLossKl: Number((v.current_delivered_kl - v.authorized_consumption_kl).toFixed(1)),
      litersPerHousehold: Math.round((v.current_delivered_kl * 1000) / v.total_households),
      tankCapacityKl: Math.round(v.tank_capacity_liters / 1000),
      currentTankLevelPercent: v.tank_level_percent,
      affectedHouseholds: v.affected_households,
      supplyStatus: v.supply_status,
      qualitySummary: v.water_quality_summary
    }))
  };

  res.json(comparison);
});

/**
 * GET /api/villages/:name
 * Details for a specific village.
 */
router.get('/:name', authenticateToken, (req, res) => {
  const { name } = req.params;

  // Residents can only view their own registered village
  if (req.user.role === 'Resident' && req.user.village !== name) {
    return res.status(403).json({
      error: `Access Denied: You are registered in ${req.user.village}. You cannot view internal telemetry for ${name}.`
    });
  }

  const village = db.prepare('SELECT * FROM villages WHERE name = ?').get(name);
  if (!village) {
    return res.status(404).json({ error: 'Village not found' });
  }

  const tank = db.prepare('SELECT * FROM tanks WHERE village_name = ?').get(name);
  const sensors = db.prepare('SELECT * FROM sensors WHERE village = ?').all();
  const pipelines = db.prepare('SELECT * FROM pipelines WHERE village = ?').all();

  res.json({
    village,
    tank,
    sensors,
    pipelines
  });
});

export default router;
