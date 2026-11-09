import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/network/schematic
 * Returns pipelines, central junction, and village branch connectivity
 */
router.get('/schematic', authenticateToken, requireRole('Administrator', 'Operating Staff'), (req, res) => {
  const pipelines = db.prepare('SELECT * FROM pipelines ORDER BY id ASC').all();
  const pump = db.prepare('SELECT status, discharge_pressure_bar, flow_rate_m3h FROM pump_station WHERE id = 1').get();

  // Schematic layout nodes & edges
  const networkTopology = {
    centralStation: {
      id: 'NODE-PUMP',
      name: 'Central Water Works & Pump Station P-01',
      coords: [30.3350, 76.7900],
      status: pump.status,
      dischargePressureBar: pump.discharge_pressure_bar,
      flowRateM3h: pump.flow_rate_m3h
    },
    distributionJunction: {
      id: 'NODE-JUNCTION',
      name: 'Main 3-Way Distribution Junction (J-01)',
      coords: [30.3400, 76.8200],
      incomingLine: 'MAIN-01',
      divergentLines: ['PIPE-A01', 'PIPE-B01', 'PIPE-C01'],
      isolationValves: [
        { id: 'VALVE-A', target: 'Village A', status: '100% Open' },
        { id: 'VALVE-B', target: 'Village B', status: '100% Open' },
        { id: 'VALVE-C', target: 'Village C', status: '100% Open (Throttled for leak test)' }
      ]
    },
    villageNodes: [
      { id: 'NODE-VIL-A', name: 'Village A Reservoir', coords: [30.3421, 76.8124], line: 'PIPE-A01' },
      { id: 'NODE-VIL-B', name: 'Village B Reservoir', coords: [30.3654, 76.8451], line: 'PIPE-B01' },
      { id: 'NODE-VIL-C', name: 'Village C Reservoir', coords: [30.3189, 76.8582], line: 'PIPE-C01' }
    ],
    pipelines: pipelines.map(p => ({
      ...p,
      coordinates: p.coordinates_json ? JSON.parse(p.coordinates_json) : []
    }))
  };

  res.json(networkTopology);
});

export default router;
