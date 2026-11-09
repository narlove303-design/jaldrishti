-- ====================================================================
-- JalDrishti – Smart Multi-Village Water Intelligence System
-- Relational Database Schema (PostgreSQL & SQLite Compatible)
-- ====================================================================

-- 1. Users & RBAC Identity
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(150) NOT NULL,
  email_or_mobile VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK(role IN ('Administrator', 'Operating Staff', 'Resident')),
  village VARCHAR(100) NOT NULL, -- 'All', 'Village A', 'Village B', 'Village C'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Three Villages Master Record
CREATE TABLE IF NOT EXISTS villages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  total_households INTEGER NOT NULL,
  tank_capacity_liters INTEGER NOT NULL,
  tank_level_percent REAL NOT NULL,
  daily_target_kl REAL NOT NULL,
  current_delivered_kl REAL NOT NULL,
  authorized_consumption_kl REAL NOT NULL,
  supply_status VARCHAR(20) NOT NULL CHECK(supply_status IN ('Normal', 'Warning', 'Critical')),
  next_supply_slot VARCHAR(100) NOT NULL,
  water_quality_summary TEXT NOT NULL,
  affected_households INTEGER DEFAULT 0,
  lat REAL NOT NULL,
  lng REAL NOT NULL
);

-- 3. Central Main Pump Station
CREATE TABLE IF NOT EXISTS pump_station (
  id INTEGER PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK(status IN ('Running', 'Stopped', 'Maintenance', 'Tripped')),
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Pipeline Distribution Network
CREATE TABLE IF NOT EXISTS pipelines (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  village VARCHAR(100) NOT NULL,
  diameter_mm INTEGER NOT NULL,
  length_m REAL NOT NULL,
  material VARCHAR(100) NOT NULL,
  nominal_pressure_bar REAL NOT NULL,
  current_pressure_bar REAL NOT NULL,
  current_flow_m3h REAL NOT NULL,
  status VARCHAR(20) NOT NULL CHECK(status IN ('Normal', 'Warning', 'Critical')),
  last_inspected VARCHAR(50) NOT NULL,
  coordinates_json TEXT
);

-- 5. Elevated Storage Tanks
CREATE TABLE IF NOT EXISTS tanks (
  id VARCHAR(50) PRIMARY KEY,
  village_name VARCHAR(100) UNIQUE NOT NULL,
  capacity_liters INTEGER NOT NULL,
  current_level_percent REAL NOT NULL,
  inlet_flow_m3h REAL NOT NULL,
  outlet_flow_m3h REAL NOT NULL,
  water_height_m REAL NOT NULL,
  max_height_m REAL NOT NULL,
  last_cleaned VARCHAR(50) NOT NULL,
  cleaning_due VARCHAR(50) NOT NULL
);

-- 6. Sensors & Water Quality Nodes
CREATE TABLE IF NOT EXISTS sensors (
  id VARCHAR(50) PRIMARY KEY,
  sensor_tag VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'flow', 'pressure', 'chlorine', 'ph', 'turbidity', 'temperature', 'tank_level'
  location VARCHAR(150) NOT NULL,
  village VARCHAR(100) NOT NULL,
  current_value REAL NOT NULL,
  unit VARCHAR(20) NOT NULL,
  min_normal REAL NOT NULL,
  max_normal REAL NOT NULL,
  warning_threshold REAL NOT NULL,
  critical_threshold REAL NOT NULL,
  status VARCHAR(20) NOT NULL CHECK(status IN ('Normal', 'Warning', 'Critical', 'Offline')),
  last_calibrated VARCHAR(50) NOT NULL,
  next_calibration VARCHAR(50) NOT NULL,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Time-Series Telemetry History
CREATE TABLE IF NOT EXISTS telemetry_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sensor_tag VARCHAR(50) NOT NULL,
  metric VARCHAR(50) NOT NULL,
  value REAL NOT NULL,
  unit VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. AI-Assisted Leakage Alerts
CREATE TABLE IF NOT EXISTS leakage_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  leak_code VARCHAR(50) UNIQUE NOT NULL,
  village VARCHAR(100) NOT NULL,
  suspected_location VARCHAR(200) NOT NULL,
  pipeline_id VARCHAR(50) NOT NULL,
  estimated_loss_lph REAL NOT NULL,
  anomaly_score REAL NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK(severity IN ('Warning', 'Critical')),
  classification VARCHAR(50) NOT NULL CHECK(classification IN ('Suspected Leak', 'Confirmed Leak', 'Sensor Discrepancy')),
  status VARCHAR(30) NOT NULL CHECK(status IN ('Active', 'Under Investigation', 'Repaired', 'False Positive')),
  affected_households INTEGER NOT NULL,
  recommended_action TEXT NOT NULL,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- 9. Alarms & Incident Management
CREATE TABLE IF NOT EXISTS alarms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alarm_code VARCHAR(50) UNIQUE NOT NULL,
  village VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK(priority IN ('General', 'Important', 'Critical')),
  status VARCHAR(20) NOT NULL CHECK(status IN ('Active', 'Acknowledged', 'Resolved')),
  assigned_to VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP
);

-- 10. Maintenance Work Orders
CREATE TABLE IF NOT EXISTS maintenance_work_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code VARCHAR(50) UNIQUE NOT NULL,
  village VARCHAR(100) NOT NULL,
  task_title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL,
  technician VARCHAR(150) NOT NULL,
  estimated_cost_inr REAL NOT NULL,
  actual_cost_inr REAL,
  status VARCHAR(20) NOT NULL CHECK(status IN ('Open', 'In Progress', 'Completed', 'Cancelled')),
  spare_parts_used TEXT,
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- 11. Village Water Notice Board
CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title VARCHAR(250) NOT NULL,
  target_villages_json TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK(priority IN ('General', 'Important', 'Critical')),
  description TEXT NOT NULL,
  status VARCHAR(30) NOT NULL CHECK(status IN ('Active', 'Pending Approval', 'Archived', 'Restored')),
  expected_restoration VARCHAR(100),
  author_role VARCHAR(50) NOT NULL,
  author_name VARCHAR(150) NOT NULL,
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. User Read Notice State
CREATE TABLE IF NOT EXISTS user_read_notices (
  user_id INTEGER NOT NULL,
  notice_id INTEGER NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, notice_id)
);

-- 13. Resident Complaints & Tracker
CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  complaint_code VARCHAR(50) UNIQUE NOT NULL,
  village VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  location VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  resident_name VARCHAR(150) NOT NULL,
  resident_contact VARCHAR(100),
  photo_url TEXT,
  status VARCHAR(30) NOT NULL CHECK(status IN ('Open', 'Assigned', 'In Progress', 'Resolved')),
  technician_notes TEXT,
  tracking_updates_json TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- 14. Asset Registry
CREATE TABLE IF NOT EXISTS assets (
  id VARCHAR(50) PRIMARY KEY,
  asset_tag VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  village VARCHAR(100) NOT NULL,
  installation_date VARCHAR(50) NOT NULL,
  condition VARCHAR(20) NOT NULL CHECK(condition IN ('Excellent', 'Good', 'Fair', 'Poor')),
  status VARCHAR(30) NOT NULL CHECK(status IN ('Operational', 'Maintenance Due', 'Under Repair')),
  model_spec TEXT NOT NULL
);

-- 15. Security & System Audit Trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_name VARCHAR(150) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(100) NOT NULL,
  details TEXT NOT NULL,
  ip_address VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email_or_mobile);
CREATE INDEX IF NOT EXISTS idx_sensors_village ON sensors(village);
CREATE INDEX IF NOT EXISTS idx_notices_status ON notices(status);
CREATE INDEX IF NOT EXISTS idx_complaints_code ON complaints(complaint_code);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
