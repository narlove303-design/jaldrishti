import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole, recordAudit } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/leaks
 * AI Leakage Intelligence and Anomaly Detection dashboard
 * Restricted to Administrator and Operating Staff.
 */
router.get('/', authenticateToken, requireRole('Administrator', 'Operating Staff'), (req, res) => {
  const leaks = db.prepare('SELECT * FROM leakage_alerts ORDER BY id DESC').all();
  
  // Real-time mass balance calculation across pump and branch lines
  const pump = db.prepare('SELECT flow_rate_m3h, discharge_pressure_bar FROM pump_station WHERE id = 1').get();
  const pipeA = db.prepare("SELECT current_flow_m3h, current_pressure_bar FROM pipelines WHERE id = 'PIPE-A01'").get();
  const pipeB = db.prepare("SELECT current_flow_m3h, current_pressure_bar FROM pipelines WHERE id = 'PIPE-B01'").get();
  const pipeC = db.prepare("SELECT current_flow_m3h, current_pressure_bar FROM pipelines WHERE id = 'PIPE-C01'").get();

  const pumpOutletFlow = pump ? pump.flow_rate_m3h : 84.0;
  const branchSumFlow = (pipeA?.current_flow_m3h || 0) + (pipeB?.current_flow_m3h || 0) + (pipeC?.current_flow_m3h || 0);
  const unaccountedFlow = Math.max(0, Number((pumpOutletFlow - branchSumFlow).toFixed(1)));
  const unaccountedLossLph = Math.round(unaccountedFlow * 1000);

  res.json({
    activeAlerts: leaks,
    massBalanceTelemetry: {
      pumpOutletFlowM3h: pumpOutletFlow,
      branchSumFlowM3h: Number(branchSumFlow.toFixed(1)),
      instantaneousMismatchM3h: unaccountedFlow,
      instantaneousMismatchLph: unaccountedLossLph,
      methodology: 'Transparent Rule-Based Mass-Balance & Hydraulic Gradient Analysis',
      disclaimer: 'ALGORITHM TRANSPARENCY: Discrepancies reflect sensor hydraulic differences, meter calibration drift, and unbilled draws. Readings are classified as Suspected Leaks until acoustic or physical field verification is completed by maintenance personnel.'
    },
    breakdownByClassification: {
      confirmedLeaks: leaks.filter(l => l.classification === 'Confirmed Leak').length,
      suspectedLeaks: leaks.filter(l => l.classification === 'Suspected Leak').length,
      sensorDiscrepancies: leaks.filter(l => l.classification === 'Sensor Discrepancy').length
    }
  });
});

/**
 * PATCH /api/leaks/:id/status
 * Update leak investigation status
 */
router.patch('/:id/status', authenticateToken, requireRole('Administrator', 'Operating Staff'), (req, res) => {
  const { id } = req.params;
  const { status, classification, notes } = req.body;

  const leak = db.prepare('SELECT * FROM leakage_alerts WHERE id = ?').get(id);
  if (!leak) {
    return res.status(404).json({ error: 'Leak alert not found' });
  }

  const updates = [];
  const params = [];

  if (status) {
    updates.push('status = ?');
    params.push(status);
  }
  if (classification) {
    updates.push('classification = ?');
    params.push(classification);
  }
  if (status === 'Repaired') {
    updates.push('resolved_at = CURRENT_TIMESTAMP');
  }

  if (updates.length > 0) {
    params.push(id);
    db.prepare(`UPDATE leakage_alerts SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  recordAudit(
    req.user.name,
    req.user.role,
    'LEAK_STATUS_UPDATE',
    'AI Leakage Intelligence',
    `Updated ${leak.leak_code} (${leak.village}) to ${status || leak.status} [${classification || leak.classification}]. ${notes || ''}`
  );

  res.json({ message: 'Leak status updated successfully', leak_code: leak.leak_code });
});

export default router;
