import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'jaldrishti.db');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for high performance & integrity
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email_or_mobile TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Administrator', 'Operating Staff', 'Resident')),
      village TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS villages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      total_households INTEGER NOT NULL,
      tank_capacity_liters INTEGER NOT NULL,
      tank_level_percent REAL NOT NULL,
      daily_target_kl REAL NOT NULL,
      current_delivered_kl REAL NOT NULL,
      authorized_consumption_kl REAL NOT NULL,
      supply_status TEXT NOT NULL CHECK(supply_status IN ('Normal', 'Warning', 'Critical')),
      next_supply_slot TEXT NOT NULL,
      water_quality_summary TEXT NOT NULL,
      affected_households INTEGER DEFAULT 0,
      lat REAL NOT NULL,
      lng REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pump_station (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Running', 'Stopped', 'Maintenance', 'Tripped')),
      voltage_v REAL NOT NULL,
      current_a REAL NOT NULL,
      power_kw REAL NOT NULL,
      motor_temp_c REAL NOT NULL,
      discharge_pressure_bar REAL NOT NULL,
      flow_rate_m3h REAL NOT NULL,
      total_energy_kwh REAL NOT NULL,
      total_water_kl REAL NOT NULL,
      run_hours REAL NOT NULL,
      vfd_frequency_hz REAL NOT NULL,
      interlock_status TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pipelines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      village TEXT NOT NULL,
      diameter_mm INTEGER NOT NULL,
      length_m REAL NOT NULL,
      material TEXT NOT NULL,
      nominal_pressure_bar REAL NOT NULL,
      current_pressure_bar REAL NOT NULL,
      current_flow_m3h REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Normal', 'Warning', 'Critical')),
      last_inspected TEXT NOT NULL,
      coordinates_json TEXT
    );

    CREATE TABLE IF NOT EXISTS tanks (
      id TEXT PRIMARY KEY,
      village_name TEXT UNIQUE NOT NULL,
      capacity_liters INTEGER NOT NULL,
      current_level_percent REAL NOT NULL,
      inlet_flow_m3h REAL NOT NULL,
      outlet_flow_m3h REAL NOT NULL,
      water_height_m REAL NOT NULL,
      max_height_m REAL NOT NULL,
      last_cleaned TEXT NOT NULL,
      cleaning_due TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sensors (
      id TEXT PRIMARY KEY,
      sensor_tag TEXT NOT NULL,
      type TEXT NOT NULL,
      location TEXT NOT NULL,
      village TEXT NOT NULL,
      current_value REAL NOT NULL,
      unit TEXT NOT NULL,
      min_normal REAL NOT NULL,
      max_normal REAL NOT NULL,
      warning_threshold REAL NOT NULL,
      critical_threshold REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Normal', 'Warning', 'Critical', 'Offline')),
      last_calibrated TEXT NOT NULL,
      next_calibration TEXT NOT NULL,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS telemetry_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_tag TEXT NOT NULL,
      metric TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_telemetry_metric_ts ON telemetry_history (metric, timestamp);

    CREATE TABLE IF NOT EXISTS leakage_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      leak_code TEXT UNIQUE NOT NULL,
      village TEXT NOT NULL,
      suspected_location TEXT NOT NULL,
      pipeline_id TEXT NOT NULL,
      estimated_loss_lph REAL NOT NULL,
      anomaly_score REAL NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('Warning', 'Critical')),
      classification TEXT NOT NULL CHECK(classification IN ('Suspected Leak', 'Confirmed Leak', 'Sensor Discrepancy')),
      status TEXT NOT NULL CHECK(status IN ('Active', 'Under Investigation', 'Repaired', 'False Positive')),
      affected_households INTEGER NOT NULL,
      recommended_action TEXT NOT NULL,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS alarms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alarm_code TEXT UNIQUE NOT NULL,
      village TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT NOT NULL CHECK(priority IN ('General', 'Important', 'Critical')),
      status TEXT NOT NULL CHECK(status IN ('Active', 'Acknowledged', 'Resolved')),
      assigned_to TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      acknowledged_at DATETIME,
      resolved_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS maintenance_work_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT UNIQUE NOT NULL,
      village TEXT NOT NULL,
      task_title TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT NOT NULL,
      technician TEXT NOT NULL,
      estimated_cost_inr REAL NOT NULL,
      actual_cost_inr REAL,
      status TEXT NOT NULL CHECK(status IN ('Open', 'In Progress', 'Completed', 'Cancelled')),
      spare_parts_used TEXT,
      photo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      target_villages_json TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL CHECK(priority IN ('General', 'Important', 'Critical')),
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Active', 'Pending Approval', 'Archived', 'Restored')),
      expected_restoration TEXT,
      author_role TEXT NOT NULL,
      author_name TEXT NOT NULL,
      published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_read_notices (
      user_id INTEGER NOT NULL,
      notice_id INTEGER NOT NULL,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, notice_id)
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_code TEXT UNIQUE NOT NULL,
      village TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      resident_name TEXT NOT NULL,
      resident_contact TEXT,
      photo_url TEXT,
      status TEXT NOT NULL CHECK(status IN ('Open', 'Assigned', 'In Progress', 'Resolved')),
      technician_notes TEXT,
      tracking_updates_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      asset_tag TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      village TEXT NOT NULL,
      installation_date TEXT NOT NULL,
      condition TEXT NOT NULL CHECK(condition IN ('Excellent', 'Good', 'Fair', 'Poor')),
      status TEXT NOT NULL CHECK(status IN ('Operational', 'Maintenance Due', 'Under Repair')),
      model_spec TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      details TEXT NOT NULL,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedData();
  seedTelemetryHistoryIfEmpty();
}

export function seedTelemetryHistoryIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as count FROM telemetry_history').get()?.count || 0;
  if (count > 0) return;

  console.log('Seeding 30 days of realistic SCADA telemetry history for analytics...');
  
  const insertStmt = db.prepare(`
    INSERT INTO telemetry_history (sensor_tag, metric, value, unit, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN TRANSACTION;');
  try {
    const now = new Date();
    // 30 days back = 30 * 24 = 720 hours
    for (let hoursBack = 720; hoursBack >= 0; hoursBack--) {
      const dt = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
      const isoTimestamp = dt.toISOString().slice(0, 19).replace('T', ' ');
      const hour = dt.getHours();

      // Diurnal municipal demand curve
      let demandFactor = 0.95;
      if (hour >= 6 && hour <= 9) demandFactor = 1.35; // morning peak
      else if (hour >= 17 && hour <= 21) demandFactor = 1.30; // evening peak
      else if (hour >= 0 && hour <= 4) demandFactor = 0.40; // minimum night flow

      // Day-of-week minor variance
      const dayFactor = dt.getDay() === 0 || dt.getDay() === 6 ? 1.08 : 1.0;
      const combinedFactor = demandFactor * dayFactor;

      const suppliedKl = Number((12.2 * combinedFactor + (Math.random() - 0.5) * 0.6).toFixed(2));
      const deliveredAKl = Number((4.68 * combinedFactor + (Math.random() - 0.5) * 0.3).toFixed(2));
      const deliveredBKl = Number((3.67 * combinedFactor + (Math.random() - 0.5) * 0.2).toFixed(2));
      const deliveredCKl = Number((3.16 * combinedFactor + (Math.random() - 0.5) * 0.2).toFixed(2));
      const totalDelivered = deliveredAKl + deliveredBKl + deliveredCKl;
      const authorizedKl = Number((totalDelivered * 0.903).toFixed(2));
      const diffPercent = Number((((suppliedKl - authorizedKl) / suppliedKl) * 100).toFixed(1));
      const energyKwh = Number((4.14 * combinedFactor + (Math.random() - 0.5) * 0.2).toFixed(2));
      const pressureBar = Number((3.62 - (combinedFactor - 1.0) * 0.25 + (Math.random() - 0.5) * 0.04).toFixed(2));
      const flowM3h = Number((suppliedKl * 2.87).toFixed(1));

      insertStmt.run('PUMP-01', 'WATER_SUPPLIED_KL', suppliedKl, 'kL', isoTimestamp);
      insertStmt.run('PUMP-01', 'WATER_AUTHORIZED_KL', authorizedKl, 'kL', isoTimestamp);
      insertStmt.run('VIL-A', 'DELIVERED_KL', deliveredAKl, 'kL', isoTimestamp);
      insertStmt.run('VIL-B', 'DELIVERED_KL', deliveredBKl, 'kL', isoTimestamp);
      insertStmt.run('VIL-C', 'DELIVERED_KL', deliveredCKl, 'kL', isoTimestamp);
      insertStmt.run('PUMP-01', 'ENERGY_KWH', energyKwh, 'kWh', isoTimestamp);
      insertStmt.run('SYSTEM', 'WATER_BALANCE_DIFF_PERCENT', diffPercent, '%', isoTimestamp);
      insertStmt.run('PUMP-01', 'DISCHARGE_PRESSURE_BAR', pressureBar, 'bar', isoTimestamp);
      insertStmt.run('PUMP-01', 'FLOW_RATE_M3H', flowM3h, 'm³/h', isoTimestamp);
    }
    db.exec('COMMIT;');
    console.log('Seeded 30-day telemetry history successfully.');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Failed to seed telemetry history:', err);
  }
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return; // Already seeded

  console.log('Seeding JalDrishti demonstration database...');

  // Default hashed password for demo accounts: Demo12345!
  const defaultHash = bcrypt.hashSync('Demo12345!', 10);

  // 1. Users
  const insertUser = db.prepare(`
    INSERT INTO users (name, email_or_mobile, password_hash, role, village)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertUser.run('Vikram Sharma (Chief Engineer)', 'admin@demo.local', defaultHash, 'Administrator', 'All');
  insertUser.run('Harpreet Singh (Lead Operator)', 'operator@demo.local', defaultHash, 'Operating Staff', 'All');
  insertUser.run('Rajesh Patel (Village A Resident)', 'resident@demo.local', defaultHash, 'Resident', 'Village A');
  insertUser.run('Suman Verma (Village B Resident)', 'resident.b@demo.local', defaultHash, 'Resident', 'Village B');
  insertUser.run('Anil Kumar (Village C Resident)', 'resident.c@demo.local', defaultHash, 'Resident', 'Village C');

  // 2. Villages
  const insertVillage = db.prepare(`
    INSERT INTO villages (name, code, total_households, tank_capacity_liters, tank_level_percent, daily_target_kl, current_delivered_kl, authorized_consumption_kl, supply_status, next_supply_slot, water_quality_summary, affected_households, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertVillage.run(
    'Village A', 'VIL-A', 520, 180000, 74.0, 120.0, 112.4, 96.2, 'Normal',
    'Tomorrow 06:00 AM - 09:00 AM', 'Chlorine 0.42 mg/L, pH 7.3, Turbidity 0.6 NTU (Optimal)', 0,
    30.3421, 76.8124
  );

  insertVillage.run(
    'Village B', 'VIL-B', 410, 140000, 48.5, 95.0, 88.1, 70.4, 'Warning',
    'Today 05:30 PM - 08:30 PM', 'Chlorine 0.35 mg/L, pH 7.4, Turbidity 0.8 NTU (Normal)', 82,
    30.3654, 76.8451
  );

  insertVillage.run(
    'Village C', 'VIL-C', 365, 120000, 61.2, 85.0, 76.0, 63.1, 'Critical',
    'Pending Leak Inspection', 'Chlorine 0.28 mg/L, pH 7.1, Turbidity 1.4 NTU (Elevated)', 45,
    30.3189, 76.8582
  );

  // 3. Central Main Pump Station
  const insertPump = db.prepare(`
    INSERT INTO pump_station (id, name, status, voltage_v, current_a, power_kw, motor_temp_c, discharge_pressure_bar, flow_rate_m3h, total_energy_kwh, total_water_kl, run_hours, vfd_frequency_hz, interlock_status)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPump.run(
    'Central Main Pump Station (P-01)',
    'Running',
    415.2,
    23.4,
    12.8,
    58.4,
    3.62,
    84.0,
    99.3,
    292.5,
    3284.5,
    48.5,
    'All Interlocks Healthy (Suction OK, Dry-Run Protection OK, Motor Thermal Normal)'
  );

  // 4. Pipelines
  const insertPipe = db.prepare(`
    INSERT INTO pipelines (id, name, village, diameter_mm, length_m, material, nominal_pressure_bar, current_pressure_bar, current_flow_m3h, status, last_inspected, coordinates_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPipe.run('MAIN-01', 'Primary Junction Feed', 'All', 200, 450.0, 'Ductile Iron', 4.0, 3.62, 84.0, 'Normal', '2026-10-15', JSON.stringify([[30.3350, 76.7900], [30.3400, 76.8200]]));
  insertPipe.run('PIPE-A01', 'Village A Main Transmission', 'Village A', 160, 780.0, 'HDPE PE100', 3.5, 3.34, 34.1, 'Normal', '2026-10-20', JSON.stringify([[30.3400, 76.8200], [30.3421, 76.8124]]));
  insertPipe.run('PIPE-B01', 'Village B Main Transmission', 'Village B', 110, 610.0, 'uPVC Class 4', 3.0, 2.58, 26.9, 'Warning', '2026-10-18', JSON.stringify([[30.3400, 76.8200], [30.3654, 76.8451]]));
  insertPipe.run('PIPE-C01', 'Village C Main Transmission', 'Village C', 110, 850.0, 'HDPE PE100', 3.0, 1.88, 21.7, 'Critical', '2026-10-05', JSON.stringify([[30.3400, 76.8200], [30.3189, 76.8582]]));

  // 5. Tanks
  const insertTank = db.prepare(`
    INSERT INTO tanks (id, village_name, capacity_liters, current_level_percent, inlet_flow_m3h, outlet_flow_m3h, water_height_m, max_height_m, last_cleaned, cleaning_due)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTank.run('TANK-A', 'Village A', 180000, 74.0, 34.1, 28.5, 3.70, 5.0, '2026-08-14', '2027-02-14');
  insertTank.run('TANK-B', 'Village B', 140000, 48.5, 26.9, 22.0, 2.18, 4.5, '2026-07-22', '2027-01-22');
  insertTank.run('TANK-C', 'Village C', 120000, 61.2, 21.7, 18.2, 2.45, 4.0, '2026-09-02', '2027-03-02');

  // 6. Sensors
  const insertSensor = db.prepare(`
    INSERT INTO sensors (id, sensor_tag, type, location, village, current_value, unit, min_normal, max_normal, warning_threshold, critical_threshold, status, last_calibrated, next_calibration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Main station sensors
  insertSensor.run('SEN-FM01', 'FM-01', 'flow', 'Main Pump Discharge Header', 'All', 84.0, 'm³/h', 60.0, 100.0, 105.0, 115.0, 'Normal', '2026-09-10', '2027-03-10');
  insertSensor.run('SEN-PR01', 'PR-01', 'pressure', 'Main Discharge Manifold', 'All', 3.62, 'bar', 3.0, 4.5, 2.5, 2.0, 'Normal', '2026-09-10', '2027-03-10');
  insertSensor.run('SEN-TE01', 'TE-01', 'temperature', 'Pump Motor Bearing 1', 'All', 58.4, '°C', 35.0, 65.0, 70.0, 75.0, 'Normal', '2026-09-10', '2027-03-10');
  insertSensor.run('SEN-EN01', 'EM-01', 'energy', 'Central VFD Feeder Panel', 'All', 12.8, 'kW', 5.0, 20.0, 22.0, 25.0, 'Normal', '2026-09-10', '2027-03-10');

  // Village A sensors
  insertSensor.run('SEN-FMA', 'FM-A', 'flow', 'Village A Distribution Inlet', 'Village A', 34.1, 'm³/h', 25.0, 45.0, 20.0, 15.0, 'Normal', '2026-10-01', '2027-04-01');
  insertSensor.run('SEN-PRA', 'PR-A', 'pressure', 'Village A Inlet Junction', 'Village A', 3.34, 'bar', 2.8, 3.8, 2.2, 1.8, 'Normal', '2026-10-01', '2027-04-01');
  insertSensor.run('SEN-CLA', 'CL-A', 'chlorine', 'Village A Tank Outlet', 'Village A', 0.42, 'mg/L', 0.20, 0.80, 0.15, 0.10, 'Normal', '2026-10-01', '2026-11-01');
  insertSensor.run('SEN-PHA', 'PH-A', 'ph', 'Village A Tank Outlet', 'Village A', 7.32, 'pH', 6.5, 8.5, 6.2, 6.0, 'Normal', '2026-10-01', '2026-11-01');
  insertSensor.run('SEN-TUA', 'TU-A', 'turbidity', 'Village A Tank Outlet', 'Village A', 0.62, 'NTU', 0.1, 1.0, 1.5, 3.0, 'Normal', '2026-10-01', '2026-11-01');
  insertSensor.run('SEN-LVA', 'LV-A', 'tank_level', 'Village A Reservoir', 'Village A', 74.0, '%', 25.0, 95.0, 20.0, 15.0, 'Normal', '2026-08-14', '2027-02-14');

  // Village B sensors
  insertSensor.run('SEN-FMB', 'FM-B', 'flow', 'Village B Distribution Inlet', 'Village B', 26.9, 'm³/h', 20.0, 40.0, 15.0, 10.0, 'Normal', '2026-10-01', '2027-04-01');
  insertSensor.run('SEN-PRB', 'PR-B', 'pressure', 'Village B Branch Entry', 'Village B', 2.58, 'bar', 2.8, 3.8, 2.5, 2.0, 'Warning', '2026-10-01', '2027-04-01');
  insertSensor.run('SEN-CLB', 'CL-B', 'chlorine', 'Village B Tank Outlet', 'Village B', 0.35, 'mg/L', 0.20, 0.80, 0.15, 0.10, 'Normal', '2026-10-01', '2026-11-01');
  insertSensor.run('SEN-PHB', 'PH-B', 'ph', 'Village B Tank Outlet', 'Village B', 7.41, 'pH', 6.5, 8.5, 6.2, 6.0, 'Normal', '2026-10-01', '2026-11-01');
  insertSensor.run('SEN-TUB', 'TU-B', 'turbidity', 'Village B Tank Outlet', 'Village B', 0.84, 'NTU', 0.1, 1.0, 1.5, 3.0, 'Normal', '2026-10-01', '2026-11-01');
  insertSensor.run('SEN-LVB', 'LV-B', 'tank_level', 'Village B Reservoir', 'Village B', 48.5, '%', 25.0, 95.0, 20.0, 15.0, 'Normal', '2026-07-22', '2027-01-22');

  // Village C sensors (Elevated anomaly / Critical pressure drop)
  insertSensor.run('SEN-FMC', 'FM-C', 'flow', 'Village C Distribution Inlet', 'Village C', 21.7, 'm³/h', 20.0, 35.0, 16.0, 12.0, 'Warning', '2026-10-01', '2027-04-01');
  insertSensor.run('SEN-PRC', 'PR-C', 'pressure', 'Village C Branch Entry', 'Village C', 1.88, 'bar', 2.8, 3.8, 2.2, 1.9, 'Critical', '2026-10-01', '2027-04-01');
  insertSensor.run('SEN-CLC', 'CL-C', 'chlorine', 'Village C Tank Outlet', 'Village C', 0.28, 'mg/L', 0.20, 0.80, 0.15, 0.10, 'Normal', '2026-10-01', '2026-11-01');
  insertSensor.run('SEN-PHC', 'PH-C', 'ph', 'Village C Tank Outlet', 'Village C', 7.12, 'pH', 6.5, 8.5, 6.2, 6.0, 'Normal', '2026-10-01', '2026-11-01');
  insertSensor.run('SEN-TUC', 'TU-C', 'turbidity', 'Village C Tank Outlet', 'Village C', 1.42, 'NTU', 0.1, 1.0, 1.2, 2.0, 'Warning', '2026-10-01', '2026-11-01');
  insertSensor.run('SEN-LVC', 'LV-C', 'tank_level', 'Village C Reservoir', 'Village C', 61.2, '%', 25.0, 95.0, 20.0, 15.0, 'Normal', '2026-09-02', '2027-03-02');

  // 7. Leakage Alerts (Intelligent Anomaly Detection Engine)
  const insertLeak = db.prepare(`
    INSERT INTO leakage_alerts (leak_code, village, suspected_location, pipeline_id, estimated_loss_lph, anomaly_score, severity, classification, status, affected_households, recommended_action)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLeak.run(
    'LEAK-C01',
    'Village C',
    'School Road, near Community Centre (Chainage 520m)',
    'PIPE-C01',
    1260.0,
    88.5,
    'Critical',
    'Suspected Leak',
    'Active',
    45,
    'Dispatch field team with acoustic pipe locator; verify PR-C pressure drop; prepare pipe repair saddle.'
  );

  insertLeak.run(
    'LEAK-B02',
    'Village B',
    'Market Square Branch (Chainage 380m)',
    'PIPE-B01',
    420.0,
    64.0,
    'Warning',
    'Suspected Leak',
    'Under Investigation',
    18,
    'Perform step-test pressure isolation during 14:00-16:00 off-peak window.'
  );

  // 8. Alarms
  const insertAlarm = db.prepare(`
    INSERT INTO alarms (alarm_code, village, title, description, priority, status, assigned_to)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertAlarm.run('ALM-101', 'Village C', 'Critical Pressure Drop at Village C Inlet', 'PR-C reported 1.88 bar (critical threshold 1.90 bar). Probable burst or heavy draw.', 'Critical', 'Active', 'Unassigned');
  insertAlarm.run('ALM-102', 'Village B', 'Low Delivery Pressure on Branch B', 'PR-B steady at 2.58 bar (warning band 2.5-2.8 bar). Flow fluctuation detected.', 'Important', 'Acknowledged', 'Harpreet Singh');
  insertAlarm.run('ALM-103', 'All', 'Instantaneous Mass-Balance Discrepancy', 'Central pump discharge (84.0 m³/h) exceeds sum of village inlets (82.7 m³/h) by 1.3 m³/h.', 'Important', 'Active', 'Unassigned');

  // 9. Maintenance Work Orders
  const insertWorkOrder = db.prepare(`
    INSERT INTO maintenance_work_orders (order_code, village, task_title, description, priority, technician, estimated_cost_inr, actual_cost_inr, status, spare_parts_used)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertWorkOrder.run(
    'WO-2026-089',
    'Village C',
    'Emergency Inspection: School Road Leakage',
    'Acoustic pinpointing and ground excavation on PIPE-C01 chainage 520m.',
    'Critical',
    'Rajinder Kumar',
    4800.0,
    null,
    'In Progress',
    '110mm HDPE Electrofusion Coupler, Repair Clamp'
  );

  insertWorkOrder.run(
    'WO-2026-088',
    'Village B',
    'Isolation Valve Inspection: Market Junction',
    'Check gate valve MV-B2 for gate seating defect causing head loss.',
    'Important',
    'Sunil Sharma',
    2200.0,
    2150.0,
    'Completed',
    'Gland packing ring, grease seal'
  );

  insertWorkOrder.run(
    'WO-2026-087',
    'Village A',
    'Quarterly Water Quality Sensor Calibration',
    'Calibrate pH buffer, free chlorine zero-cell, and optical turbidity lens on Q-A.',
    'General',
    'Anita Roy',
    1500.0,
    1450.0,
    'Completed',
    'Reagent kit, standard buffer solutions'
  );

  // 10. Notices (Village Water Notice Board)
  const insertNotice = db.prepare(`
    INSERT INTO notices (title, target_villages_json, category, priority, description, status, expected_restoration, author_role, author_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotice.run(
    'Urgent: Low Water Pressure in Sector 2 due to Pipeline Inspection',
    JSON.stringify(['Village C']),
    'Pipeline leakage',
    'Critical',
    'Our maintenance crew is actively investigating a suspected underground pipeline leak on School Road. Residents in Sector 2 may experience significantly reduced pressure or temporary interruptions while isolation valves are tested.',
    'Active',
    'Today by 06:00 PM',
    'Administrator',
    'Vikram Sharma'
  );

  insertNotice.run(
    'Scheduled Water Supply Timing for Evening Distribution',
    JSON.stringify(['Village A', 'Village B', 'Village C']),
    'Scheduled water supply',
    'General',
    'Regular evening supply will operate as follows: Village A: 06:00 PM - 09:00 PM; Village B: 05:30 PM - 08:30 PM; Village C: 07:00 PM - 09:30 PM (subject to field repair completion). Please store necessary water responsibly.',
    'Active',
    'As scheduled',
    'Administrator',
    'Vikram Sharma'
  );

  insertNotice.run(
    'Precautionary Boiling Advisory for Ward 3',
    JSON.stringify(['Village C']),
    'Water quality advisory',
    'Important',
    'Due to soil disturbance near the School Road pipeline works, turbidity in Ward 3 has temporarily increased. As a precautionary measure, residents are advised to boil tap water for at least 1 minute before drinking until lab clearance.',
    'Active',
    'Tomorrow 12:00 PM',
    'Administrator',
    'Vikram Sharma'
  );

  insertNotice.run(
    'Main Feeder Line Gate Valve Servicing Completed',
    JSON.stringify(['Village A']),
    'Supply restoration',
    'General',
    'Routine mechanical servicing on Branch A main sluice valve was concluded at 02:30 PM. Nominal supply pressure of 3.3 bar has been completely restored across all Village A sectors.',
    'Restored',
    'Restored',
    'Operating Staff',
    'Harpreet Singh'
  );

  // 11. Complaints
  const insertComplaint = db.prepare(`
    INSERT INTO complaints (complaint_code, village, category, location, description, resident_name, resident_contact, status, tracking_updates_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertComplaint.run(
    'CMP-1042',
    'Village C',
    'Low pressure',
    'House 42, School Road, near Govt Middle School',
    'Water pressure dropped drastically since 08:00 AM. Tap is barely trickling on the ground floor.',
    'Anil Kumar',
    '+91 98765 43210',
    'In Progress',
    JSON.stringify([
      { time: '2026-11-03 08:45 AM', note: 'Complaint registered by resident.' },
      { time: '2026-11-03 09:15 AM', note: 'Assigned to Technician Rajinder Kumar (WO-2026-089).' },
      { time: '2026-11-03 10:10 AM', note: 'Field acoustic correlator localized leak to chainage 520m.' }
    ])
  );

  insertComplaint.run(
    'CMP-1041',
    'Village B',
    'Leakage',
    'Near Panchayat Bhawan gate, Market Road',
    'Clean water bubbling through cobblestone pavement for the last two days.',
    'Suman Verma',
    '+91 98123 45678',
    'Assigned',
    JSON.stringify([
      { time: '2026-11-02 04:30 PM', note: 'Complaint registered by resident.' },
      { time: '2026-11-02 05:00 PM', note: 'Verified by Village B operator. Minor joint weep identified.' }
    ])
  );

  insertComplaint.run(
    'CMP-1039',
    'Village A',
    'No supply',
    'Ward 2, House 18, Temple Lane',
    'Did not receive morning water supply between 6 AM and 8 AM.',
    'Rajesh Patel',
    '+91 98989 12345',
    'Resolved',
    JSON.stringify([
      { time: '2026-11-01 08:30 AM', note: 'Complaint registered.' },
      { time: '2026-11-01 09:40 AM', note: 'Local ferruling valve unjammed by staff.' },
      { time: '2026-11-01 10:30 AM', note: 'Resolved and confirmed by resident.' }
    ])
  );

  // 12. Assets
  const insertAsset = db.prepare(`
    INSERT INTO assets (id, asset_tag, category, name, village, installation_date, condition, status, model_spec)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAsset.run('AST-P01', 'PUMP-01', 'Pump', 'Central Dual-Stage Centrifugal Pump', 'All', '2024-03-15', 'Good', 'Operational', 'Kirloskar 18.5 kW 3-Phase 415V, 90 m³/h @ 45m head');
  insertAsset.run('AST-TKA', 'TANK-A', 'Storage Tank', 'Village A Elevated Service Reservoir (ESR)', 'Village A', '2023-11-10', 'Excellent', 'Operational', 'RCC Staging 15m, 180 kL Capacity');
  insertAsset.run('AST-TKB', 'TANK-B', 'Storage Tank', 'Village B Elevated Service Reservoir (ESR)', 'Village B', '2023-11-20', 'Good', 'Operational', 'RCC Staging 12m, 140 kL Capacity');
  insertAsset.run('AST-TKC', 'TANK-C', 'Storage Tank', 'Village C Elevated Service Reservoir (ESR)', 'Village C', '2024-01-05', 'Fair', 'Operational', 'RCC Staging 12m, 120 kL Capacity');
  insertAsset.run('AST-PPA', 'PIPE-A', 'Transmission Pipe', 'Village A 160mm HDPE Main Trunk', 'Village A', '2024-02-12', 'Excellent', 'Operational', 'HDPE PE100 PN10, 780m');
  insertAsset.run('AST-PPB', 'PIPE-B', 'Transmission Pipe', 'Village B 110mm PVC Main Trunk', 'Village B', '2023-12-04', 'Good', 'Operational', 'Rigid PVC Class 4, 610m');
  insertAsset.run('AST-PPC', 'PIPE-C', 'Transmission Pipe', 'Village C 110mm HDPE Main Trunk', 'Village C', '2024-01-28', 'Fair', 'Under Repair', 'HDPE PE100 PN10, 850m');
  insertAsset.run('AST-VFD', 'CTRL-01', 'Control Valve', 'Danfoss VLT Aqua Drive FC 202', 'All', '2024-03-15', 'Excellent', 'Operational', 'Variable Frequency Inverter 22 kW with Modbus RTU/TCP');

  // 13. Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (actor_name, actor_role, action, module, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run('System Initialization', 'System', 'SYSTEM_BOOT', 'Core', 'JalDrishti database seeded with 3-village architecture and baseline telemetry.', '127.0.0.1');
  insertAudit.run('AI Leakage Engine', 'System', 'ANOMALY_TRIGGERED', 'Leak Detection', 'Mass-balance discrepancy exceeding 1.2 m³/h flagged on Branch C.', '127.0.0.1');
  insertAudit.run('Vikram Sharma', 'Administrator', 'NOTICE_PUBLISHED', 'Notice Board', 'Published critical advisory for Village C regarding School Road inspection.', '127.0.0.1');

  console.log('JalDrishti database initialization and seed complete.');
}
