-- ====================================================================
-- JalDrishti Demonstration Data Seed
-- Pre-populates 3-Village Topology, Central Pump Station, Sensors & Users
-- ====================================================================

-- 1. Users (BCrypt Hash corresponds to 'Demo12345!')
INSERT INTO users (name, email_or_mobile, password_hash, role, village) VALUES
('Vikram Sharma (Chief Engineer)', 'admin@demo.local', '$2a$10$iM.o5p5n6h4lF2wD4hG2sOKdZcO8g01fD1oF6h7g8j9k0l1m2n3o4', 'Administrator', 'All'),
('Harpreet Singh (Lead Operator)', 'operator@demo.local', '$2a$10$iM.o5p5n6h4lF2wD4hG2sOKdZcO8g01fD1oF6h7g8j9k0l1m2n3o4', 'Operating Staff', 'All'),
('Rajesh Patel (Village A Resident)', 'resident@demo.local', '$2a$10$iM.o5p5n6h4lF2wD4hG2sOKdZcO8g01fD1oF6h7g8j9k0l1m2n3o4', 'Resident', 'Village A'),
('Suman Verma (Village B Resident)', 'resident.b@demo.local', '$2a$10$iM.o5p5n6h4lF2wD4hG2sOKdZcO8g01fD1oF6h7g8j9k0l1m2n3o4', 'Resident', 'Village B'),
('Anil Kumar (Village C Resident)', 'resident.c@demo.local', '$2a$10$iM.o5p5n6h4lF2wD4hG2sOKdZcO8g01fD1oF6h7g8j9k0l1m2n3o4', 'Resident', 'Village C');

-- 2. Three Villages
INSERT INTO villages (name, code, total_households, tank_capacity_liters, tank_level_percent, daily_target_kl, current_delivered_kl, authorized_consumption_kl, supply_status, next_supply_slot, water_quality_summary, affected_households, lat, lng) VALUES
('Village A', 'VIL-A', 520, 180000, 74.0, 120.0, 112.4, 96.2, 'Normal', 'Tomorrow 06:00 AM - 09:00 AM', 'Chlorine 0.42 mg/L, pH 7.3, Turbidity 0.6 NTU (Optimal)', 0, 30.3421, 76.8124),
('Village B', 'VIL-B', 410, 140000, 48.5, 95.0, 88.1, 70.4, 'Warning', 'Today 05:30 PM - 08:30 PM', 'Chlorine 0.35 mg/L, pH 7.4, Turbidity 0.8 NTU (Normal)', 82, 30.3654, 76.8451),
('Village C', 'VIL-C', 365, 120000, 61.2, 85.0, 76.0, 63.1, 'Critical', 'Pending Leak Inspection', 'Chlorine 0.28 mg/L, pH 7.1, Turbidity 1.4 NTU (Elevated)', 45, 30.3189, 76.8582);

-- 3. Central Main Pump Station
INSERT INTO pump_station (id, name, status, voltage_v, current_a, power_kw, motor_temp_c, discharge_pressure_bar, flow_rate_m3h, total_energy_kwh, total_water_kl, run_hours, vfd_frequency_hz, interlock_status) VALUES
(1, 'Central Main Pump Station (P-01)', 'Running', 415.2, 23.4, 12.8, 58.4, 3.62, 84.0, 99.3, 292.5, 3284.5, 48.5, 'All Interlocks Healthy (Suction OK, Dry-Run Protection OK, Motor Thermal Normal)');

-- 4. Pipelines
INSERT INTO pipelines (id, name, village, diameter_mm, length_m, material, nominal_pressure_bar, current_pressure_bar, current_flow_m3h, status, last_inspected, coordinates_json) VALUES
('MAIN-01', 'Primary Junction Feed', 'All', 200, 450.0, 'Ductile Iron', 4.0, 3.62, 84.0, 'Normal', '2026-10-15', '[[30.3350, 76.7900], [30.3400, 76.8200]]'),
('PIPE-A01', 'Village A Main Transmission', 'Village A', 160, 780.0, 'HDPE PE100', 3.5, 3.34, 34.1, 'Normal', '2026-10-20', '[[30.3400, 76.8200], [30.3421, 76.8124]]'),
('PIPE-B01', 'Village B Main Transmission', 'Village B', 110, 610.0, 'uPVC Class 4', 3.0, 2.58, 26.9, 'Warning', '2026-10-18', '[[30.3400, 76.8200], [30.3654, 76.8451]]'),
('PIPE-C01', 'Village C Main Transmission', 'Village C', 110, 850.0, 'HDPE PE100', 3.0, 1.88, 21.7, 'Critical', '2026-10-05', '[[30.3400, 76.8200], [30.3189, 76.8582]]');

-- 5. Storage Tanks
INSERT INTO tanks (id, village_name, capacity_liters, current_level_percent, inlet_flow_m3h, outlet_flow_m3h, water_height_m, max_height_m, last_cleaned, cleaning_due) VALUES
('TANK-A', 'Village A', 180000, 74.0, 34.1, 28.5, 3.70, 5.0, '2026-08-14', '2027-02-14'),
('TANK-B', 'Village B', 140000, 48.5, 26.9, 22.0, 2.18, 4.5, '2026-07-22', '2027-01-22'),
('TANK-C', 'Village C', 120000, 61.2, 21.7, 18.2, 2.45, 4.0, '2026-09-02', '2027-03-02');

-- 6. Leakage Alerts
INSERT INTO leakage_alerts (leak_code, village, suspected_location, pipeline_id, estimated_loss_lph, anomaly_score, severity, classification, status, affected_households, recommended_action) VALUES
('LEAK-C01', 'Village C', 'School Road, near Community Centre (Chainage 520m)', 'PIPE-C01', 1260.0, 88.5, 'Critical', 'Suspected Leak', 'Active', 45, 'Dispatch field team with acoustic pipe locator; verify PR-C pressure drop; prepare pipe repair saddle.'),
('LEAK-B02', 'Village B', 'Market Square Branch (Chainage 380m)', 'PIPE-B01', 420.0, 64.0, 'Warning', 'Suspected Leak', 'Under Investigation', 18, 'Perform step-test pressure isolation during 14:00-16:00 off-peak window.');
