import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole, recordAudit } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/pump
 * Returns central main pump station telemetry and health status
 * Accessible to Staff and Admin.
 */
router.get('/', authenticateToken, requireRole('Administrator', 'Operating Staff'), (req, res) => {
  const pump = db.prepare('SELECT * FROM pump_station WHERE id = 1').get();
  if (!pump) {
    return res.status(404).json({ error: 'Pump station telemetry not found' });
  }

  // Energy consumption intensity in kWh per kiloliter
  const kwhPerKl = pump.total_water_kl > 0 
    ? Number((pump.total_energy_kwh / pump.total_water_kl).toFixed(3)) 
    : 0.340;

  res.json({
    pump: {
      ...pump,
      energy_intensity_kwh_per_kl: kwhPerKl,
      operating_load_percent: Math.min(100, Math.round((pump.current_a / 34.0) * 100)), // 34A is rated full load
      cooling_fan_status: pump.motor_temp_c > 60 ? 'Active High Speed' : 'Normal',
      source_reservoir_level_meters: 6.8, // 10m full depth
      suction_pressure_bar: 1.45 // Positively flooded suction
    }
  });
});

/**
 * POST /api/pump/control
 * Safe simulated equipment controls.
 * MUST be protected: Only Administrator or Operating Staff.
 * Residents are strictly forbidden.
 */
router.post('/control', authenticateToken, requireRole('Administrator', 'Operating Staff'), (req, res) => {
  const { command, frequency_hz, confirmation_override } = req.body;

  if (!['START', 'STOP', 'SET_FREQUENCY', 'RESET_INTERLOCKS'].includes(command)) {
    return res.status(400).json({ error: 'Invalid pump command. Allowed: START, STOP, SET_FREQUENCY, RESET_INTERLOCKS' });
  }

  const pump = db.prepare('SELECT * FROM pump_station WHERE id = 1').get();

  if (command === 'START') {
    if (pump.status === 'Running') {
      return res.status(400).json({ error: 'Central pump is already running.' });
    }
    // Safety Interlock Verification
    if (pump.status === 'Tripped' && !confirmation_override) {
      return res.status(400).json({ 
        error: 'Safety interlock trip active. Please review electrical faults before starting pump.',
        interlock_status: pump.interlock_status
      });
    }

    db.prepare(`
      UPDATE pump_station
      SET status = 'Running', discharge_pressure_bar = 3.62, flow_rate_m3h = 84.0,
          current_a = 23.4, power_kw = 12.8, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run();

    recordAudit(
      req.user.name,
      req.user.role,
      'SIMULATED_PUMP_START',
      'Central Pump Station',
      'Operator initiated simulated start command for Central Main Pump P-01.'
    );

    return res.json({
      message: 'SIMULATED: Main pump P-01 started successfully.',
      status: 'Running',
      note: 'Simulation mode active: No electrical relay or physical motor was engaged.'
    });
  }

  if (command === 'STOP') {
    if (pump.status === 'Stopped') {
      return res.status(400).json({ error: 'Central pump is already stopped.' });
    }

    db.prepare(`
      UPDATE pump_station
      SET status = 'Stopped', discharge_pressure_bar = 0.50, flow_rate_m3h = 0.0,
          current_a = 0.0, power_kw = 0.0, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run();

    recordAudit(
      req.user.name,
      req.user.role,
      'SIMULATED_PUMP_STOP',
      'Central Pump Station',
      'Operator initiated simulated stop command for Central Main Pump P-01.'
    );

    return res.json({
      message: 'SIMULATED: Main pump P-01 stopped safely.',
      status: 'Stopped',
      note: 'Simulation mode active: Pipeline pressure is decaying to residual static head.'
    });
  }

  if (command === 'SET_FREQUENCY') {
    const freq = Number(frequency_hz);
    if (isNaN(freq) || freq < 25 || freq > 50) {
      return res.status(400).json({ error: 'VFD frequency must be between 25.0 Hz and 50.0 Hz.' });
    }

    db.prepare('UPDATE pump_station SET vfd_frequency_hz = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(freq);
    recordAudit(req.user.name, req.user.role, 'SIMULATED_VFD_ADJUST', 'Central Pump Station', `VFD frequency adjusted to ${freq} Hz.`);

    return res.json({
      message: `SIMULATED: VFD frequency set to ${freq} Hz.`,
      vfd_frequency_hz: freq
    });
  }

  if (command === 'RESET_INTERLOCKS') {
    db.prepare(`
      UPDATE pump_station
      SET status = 'Stopped', interlock_status = 'All Interlocks Healthy (Reset by Operator)', updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run();

    recordAudit(req.user.name, req.user.role, 'PUMP_INTERLOCK_RESET', 'Central Pump Station', 'Safety interlocks cleared manually.');

    return res.json({
      message: 'Safety interlocks cleared. Pump ready for simulated start.',
      status: 'Stopped'
    });
  }
});

export default router;
