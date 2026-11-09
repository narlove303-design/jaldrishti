import { db } from './db.js';

/**
 * JalDrishti Physical Telemetry, Fluid Mechanics & SCADA Simulation Engine
 * Implements rigorous engineering calculations:
 * - Darcy-Weisbach pipeline friction & head loss (Swamee-Jain explicit equation)
 * - Centrifugal pump hydraulics & motor electrical power: P_hyd = rho * g * Q * H
 * - Motor thermal model (Joule heating vs Newton convective cooling)
 * - Tank mass balance differential conservation: dV/dt = Qin - Qout
 * - IWA transparent mass-balance leakage detection & hydraulic gradient analysis
 */

// Fluid Properties & Physical Constants (SI Units)
export const RHO_WATER = 1000.0;       // Water density: kg/m³
export const GRAVITY = 9.81;           // Acceleration due to gravity: m/s²
export const DYNAMIC_VISCOSITY = 1.002e-3; // Dynamic viscosity at 20°C: Pa·s
export const AMBIENT_TEMP_C = 28.0;    // Standard ambient temperature: °C

// Pipeline Physical Characteristics
export const PIPELINE_SPECS = {
  feeder: {
    id: 'MAIN-01',
    name: 'Primary Junction Feed',
    lengthM: 450.0,
    diameterM: 0.200,      // 200 mm
    roughnessM: 0.000025,  // Ductile Iron: eps = 0.025 mm
    material: 'Ductile Iron'
  },
  branchA: {
    id: 'PIPE-A01',
    village: 'Village A',
    lengthM: 780.0,
    diameterM: 0.160,      // 160 mm
    roughnessM: 0.0000015, // HDPE PE100: eps = 0.0015 mm
    material: 'HDPE PE100'
  },
  branchB: {
    id: 'PIPE-B01',
    village: 'Village B',
    lengthM: 610.0,
    diameterM: 0.110,      // 110 mm
    roughnessM: 0.0000015, // uPVC Class 4: eps = 0.0015 mm
    material: 'uPVC Class 4'
  },
  branchC: {
    id: 'PIPE-C01',
    village: 'Village C',
    lengthM: 850.0,
    diameterM: 0.110,      // 110 mm
    roughnessM: 0.0000015, // HDPE PE100: eps = 0.0015 mm
    material: 'HDPE PE100'
  }
};

let simulationTimer = null;
let broadcastCallback = null;
let tickCount = 0;

export function registerBroadcastCallback(cb) {
  broadcastCallback = cb;
}

/**
 * Calculates pipeline head loss using the Darcy-Weisbach equation and Swamee-Jain friction factor
 * hf = f * (L / D) * (v² / (2g))
 * @param {number} flowM3h Flow rate in m³/h
 * @param {number} lengthM Pipe length in meters
 * @param {number} diameterM Internal pipe diameter in meters
 * @param {number} roughnessM Pipe roughness epsilon in meters
 */
export function calculateDarcyWeisbach(flowM3h, lengthM, diameterM, roughnessM) {
  if (flowM3h <= 0 || diameterM <= 0) {
    return { velocity: 0, reynolds: 0, frictionFactor: 0, headLossM: 0, pressureLossBar: 0 };
  }

  const Q_m3s = flowM3h / 3600.0;
  const A_m2 = (Math.PI * Math.pow(diameterM, 2)) / 4.0;
  const velocity = Q_m3s / A_m2;
  const reynolds = (RHO_WATER * velocity * diameterM) / DYNAMIC_VISCOSITY;
  const relativeRoughness = roughnessM / diameterM;

  let frictionFactor;
  if (reynolds < 2300) {
    // Laminar flow: Poiseuille regime
    frictionFactor = 64.0 / Math.max(1, reynolds);
  } else {
    // Turbulent flow: Swamee-Jain explicit equation approximation to Colebrook-White
    const term = (relativeRoughness / 3.7) + (5.74 / Math.pow(reynolds, 0.9));
    frictionFactor = 0.25 / Math.pow(Math.log10(term), 2);
  }

  // Darcy-Weisbach head loss
  const headLossM = frictionFactor * (lengthM / diameterM) * (Math.pow(velocity, 2) / (2.0 * GRAVITY));
  // Pressure loss: deltaP = rho * g * hf (in Pascals), converted to bar (1 bar = 100,000 Pa)
  const pressureLossBar = (RHO_WATER * GRAVITY * headLossM) / 100000.0;

  return { velocity, reynolds, frictionFactor, headLossM, pressureLossBar };
}

/**
 * Calculates pump hydraulic power, electrical consumption, and motor current based on pump affinity laws
 * P_hyd = rho * g * Q * H
 * P_elec = P_hyd / (eta_pump * eta_motor)
 */
export function calculatePumpHydraulics(flowM3h, dischargePressureBar, suctionPressureBar = 1.45, vfdFrequencyHz = 48.5) {
  if (flowM3h <= 0) {
    return {
      headM: 0,
      hydraulicPowerKw: 0,
      electricalPowerKw: 0,
      currentA: 0,
      pumpEfficiencyPercent: 0
    };
  }

  const Q_m3s = flowM3h / 3600.0;
  // Total Dynamic Head in meters: H = (P_discharge - P_suction) / (rho * g)
  const deltaP_Pa = Math.max(0, (dischargePressureBar - suctionPressureBar) * 100000.0);
  const headM = deltaP_Pa / (RHO_WATER * GRAVITY);

  // Hydraulic power in Watts: P_hyd = rho * g * Q * H = deltaP * Q
  const hydraulicPowerW = deltaP_Pa * Q_m3s;
  const hydraulicPowerKw = hydraulicPowerW / 1000.0;

  // Pump efficiency adjusted for VFD speed
  const freqRatio = Math.max(0.5, Math.min(1.1, vfdFrequencyHz / 50.0));
  const pumpEfficiency = Math.max(0.65, Math.min(0.82, 0.76 * (1.0 - 0.2 * Math.pow(1.0 - freqRatio, 2))));
  const motorEfficiency = 0.91; // IE3 High-efficiency industrial motor

  const electricalPowerKw = hydraulicPowerKw / (pumpEfficiency * motorEfficiency);

  // 3-Phase Electrical Current: I = P_elec / (sqrt(3) * V * cosPhi)
  const voltageV = 415.0;
  const powerFactor = 0.86;
  const currentA = (electricalPowerKw * 1000.0) / (Math.sqrt(3) * voltageV * powerFactor);

  return {
    headM,
    hydraulicPowerKw,
    electricalPowerKw,
    currentA,
    pumpEfficiencyPercent: pumpEfficiency * 100.0
  };
}

/**
 * Updates tank level by integrating mass balance: dV/dt = Qin - Qout
 */
export function updateTankMassBalance(currentVolumeLiters, capacityLiters, inletFlowM3h, outletFlowM3h, deltaSeconds, maxHeightM) {
  // Volume change: deltaV (m³) = (Qin - Qout) * (deltaSeconds / 3600)
  const netFlowM3h = inletFlowM3h - outletFlowM3h;
  const deltaVolumeLiters = netFlowM3h * (deltaSeconds / 3600.0) * 1000.0;

  // Enforce physical constraints: 0 <= V <= capacity
  const newVolumeLiters = Math.max(0.0, Math.min(capacityLiters, currentVolumeLiters + deltaVolumeLiters));
  const levelPercent = (newVolumeLiters / capacityLiters) * 100.0;
  const waterHeightM = maxHeightM * (newVolumeLiters / capacityLiters);

  return {
    newVolumeLiters,
    levelPercent: Number(levelPercent.toFixed(1)),
    waterHeightM: Number(waterHeightM.toFixed(2)),
    deltaVolumeLiters
  };
}

export function startSimulationEngine() {
  if (simulationTimer) return;
  const intervalMs = Number(process.env.SIMULATION_INTERVAL_MS) || 3000;
  console.log(`Starting JalDrishti Physical Fluid Mechanics Simulation Engine (${intervalMs}ms interval)...`);

  simulationTimer = setInterval(() => {
    try {
      tickSimulation(intervalMs / 1000.0);
    } catch (err) {
      console.error('Simulation tick error:', err);
    }
  }, intervalMs);
}

export function stopSimulationEngine() {
  if (simulationTimer) {
    clearInterval(simulationTimer);
    simulationTimer = null;
  }
}

/**
 * Main simulation step executed each tick
 */
function tickSimulation(deltaSeconds = 3.0) {
  tickCount += 1;

  // 1. Fetch current pump state from database
  const pump = db.prepare('SELECT * FROM pump_station WHERE id = 1').get();
  if (!pump) return;

  const isRunning = pump.status === 'Running';
  const jitter = (range) => (Math.random() - 0.5) * range;

  // 2. Main Centrifugal Pump Hydraulics
  let pumpFlowM3h = 0.0;
  let pumpDischargeBar = 0.50; // Residual static head when idle
  let suctionBar = 1.45;
  let vfdHz = pump.vfd_frequency_hz || 48.5;
  let motorTemp = pump.motor_temp_c;
  let totalEnergy = pump.total_energy_kwh;
  let totalWater = pump.total_water_kl;
  let runHours = pump.run_hours;

  let hydraulicMetrics = {
    headM: 0,
    hydraulicPowerKw: 0,
    electricalPowerKw: 0,
    currentA: 0,
    pumpEfficiencyPercent: 0
  };

  if (isRunning) {
    // Operating at VFD setpoint: nominal discharge flow 84.0 m³/h with micro-fluctuations
    pumpFlowM3h = Math.max(75.0, Math.min(92.0, 84.0 + jitter(0.8)));
    pumpDischargeBar = Math.max(3.40, Math.min(3.85, 3.62 + jitter(0.04)));

    hydraulicMetrics = calculatePumpHydraulics(pumpFlowM3h, pumpDischargeBar, suctionBar, vfdHz);

    // Motor thermal model: Joule heating I²R vs Newton convective cooling
    // dT/dt = k_heat * (I / I_rated)² - k_cool * (T - T_amb)
    const ratedCurrentA = 34.0;
    const loadRatio = hydraulicMetrics.currentA / ratedCurrentA;
    const heatRate = 0.04 * Math.pow(loadRatio, 2);
    const coolRate = 0.02 * (motorTemp - AMBIENT_TEMP_C);
    motorTemp = Math.max(AMBIENT_TEMP_C, Math.min(78.0, motorTemp + (heatRate - coolRate) * deltaSeconds));

    // Accumulate total metrics
    const hoursElapsed = deltaSeconds / 3600.0;
    totalEnergy += hydraulicMetrics.electricalPowerKw * hoursElapsed;
    totalWater += pumpFlowM3h * hoursElapsed;
    runHours += hoursElapsed;
  } else {
    // Pump stopped: convective cooling toward ambient
    const coolRate = 0.03 * (motorTemp - AMBIENT_TEMP_C);
    motorTemp = Math.max(AMBIENT_TEMP_C, motorTemp - coolRate * deltaSeconds);
  }

  // Update pump station record in DB
  db.prepare(`
    UPDATE pump_station
    SET discharge_pressure_bar = ?, flow_rate_m3h = ?, current_a = ?, power_kw = ?,
        motor_temp_c = ?, total_energy_kwh = ?, total_water_kl = ?, run_hours = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(
    Number(pumpDischargeBar.toFixed(2)),
    Number(pumpFlowM3h.toFixed(1)),
    Number(hydraulicMetrics.currentA.toFixed(1)),
    Number(hydraulicMetrics.electricalPowerKw.toFixed(1)),
    Number(motorTemp.toFixed(1)),
    Number(totalEnergy.toFixed(2)),
    Number(totalWater.toFixed(1)),
    Number(runHours.toFixed(2))
  );

  // 3. Feeder Pipeline Loss: Darcy-Weisbach from Pump to Central Distribution Junction
  const feederLoss = calculateDarcyWeisbach(
    pumpFlowM3h,
    PIPELINE_SPECS.feeder.lengthM,
    PIPELINE_SPECS.feeder.diameterM,
    PIPELINE_SPECS.feeder.roughnessM
  );
  const junctionPressureBar = isRunning ? Math.max(0.5, pumpDischargeBar - feederLoss.pressureLossBar) : 0.40;

  // 4. Branch Pipeline Hydraulics to Villages A, B, and C
  let flowA = 0.0, flowB = 0.0, flowC = 0.0;
  let pressA = 0.5, pressB = 0.4, pressC = 0.3;

  if (isRunning) {
    // Nominal branch distribution flows
    flowA = Math.max(25.0, Math.min(42.0, 34.1 + jitter(0.4)));
    flowB = Math.max(20.0, Math.min(35.0, 26.9 + jitter(0.3)));
    // Branch C flow (affected by physical orifice leakage draw)
    flowC = Math.max(16.0, Math.min(28.0, 21.7 + jitter(0.3)));

    // Calculate branch friction head losses via Darcy-Weisbach
    const lossA = calculateDarcyWeisbach(flowA, PIPELINE_SPECS.branchA.lengthM, PIPELINE_SPECS.branchA.diameterM, PIPELINE_SPECS.branchA.roughnessM);
    const lossB = calculateDarcyWeisbach(flowB, PIPELINE_SPECS.branchB.lengthM, PIPELINE_SPECS.branchB.diameterM, PIPELINE_SPECS.branchB.roughnessM);
    const lossC = calculateDarcyWeisbach(flowC, PIPELINE_SPECS.branchC.lengthM, PIPELINE_SPECS.branchC.diameterM, PIPELINE_SPECS.branchC.roughnessM);

    // Terminal pressures at village entry points
    pressA = Math.max(0.5, junctionPressureBar - lossA.pressureLossBar);
    pressB = Math.max(0.5, junctionPressureBar - lossB.pressureLossBar - 0.6); // Extra throttling valve head loss
    // Branch C has active leak: additional local hydraulic draw drops delivery pressure significantly
    const leakPressureDrop = 1.32;
    pressC = Math.max(0.4, junctionPressureBar - lossC.pressureLossBar - leakPressureDrop);
  }

  // Update pipeline records in DB
  db.prepare('UPDATE pipelines SET current_flow_m3h = ?, current_pressure_bar = ? WHERE id = ?')
    .run(Number(flowA.toFixed(1)), Number(pressA.toFixed(2)), 'PIPE-A01');
  db.prepare('UPDATE pipelines SET current_flow_m3h = ?, current_pressure_bar = ? WHERE id = ?')
    .run(Number(flowB.toFixed(1)), Number(pressB.toFixed(2)), 'PIPE-B01');
  db.prepare('UPDATE pipelines SET current_flow_m3h = ?, current_pressure_bar = ? WHERE id = ?')
    .run(Number(flowC.toFixed(1)), Number(pressC.toFixed(2)), 'PIPE-C01');

  // 5. Tank Dynamics: Mass Balance Integration dV/dt = Qin - Qout
  const tankRecords = db.prepare('SELECT * FROM tanks').all();
  const tankLevels = {};

  for (const t of tankRecords) {
    let qIn = 0.0;
    let qOut = t.outlet_flow_m3h || 20.0;

    if (isRunning) {
      if (t.village_name === 'Village A') qIn = flowA;
      else if (t.village_name === 'Village B') qIn = flowB;
      else if (t.village_name === 'Village C') qIn = flowC;
    } else {
      qIn = 0.0;
      // Gravity outflow slows down when reservoir heads decrease
      qOut = Math.max(5.0, qOut * 0.4);
    }

    const currentVolLiters = (t.current_level_percent / 100.0) * t.capacity_liters;
    const balance = updateTankMassBalance(currentVolLiters, t.capacity_liters, qIn, qOut, deltaSeconds, t.max_height_m);

    tankLevels[t.village_name] = balance.levelPercent;

    db.prepare('UPDATE tanks SET current_level_percent = ?, water_height_m = ? WHERE id = ?')
      .run(balance.levelPercent, balance.waterHeightM, t.id);
    db.prepare('UPDATE villages SET tank_level_percent = ? WHERE name = ?')
      .run(balance.levelPercent, t.village_name);
  }

  // 6. Sensor Readings Updates
  const updateSensor = (id, val, status) => {
    db.prepare('UPDATE sensors SET current_value = ?, status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?')
      .run(val, status, id);
  };

  updateSensor('SEN-FM01', Number(pumpFlowM3h.toFixed(1)), pumpFlowM3h > 105 ? 'Warning' : 'Normal');
  updateSensor('SEN-PR01', Number(pumpDischargeBar.toFixed(2)), pumpDischargeBar < 2.5 ? 'Warning' : 'Normal');
  updateSensor('SEN-TE01', Number(motorTemp.toFixed(1)), motorTemp > 72.0 ? 'Critical' : motorTemp > 65.0 ? 'Warning' : 'Normal');
  updateSensor('SEN-EN01', Number(hydraulicMetrics.electricalPowerKw.toFixed(1)), 'Normal');

  updateSensor('SEN-FMA', Number(flowA.toFixed(1)), 'Normal');
  updateSensor('SEN-PRA', Number(pressA.toFixed(2)), 'Normal');
  updateSensor('SEN-FMB', Number(flowB.toFixed(1)), 'Normal');
  updateSensor('SEN-PRB', Number(pressB.toFixed(2)), pressB < 2.5 ? 'Warning' : 'Normal');
  updateSensor('SEN-FMC', Number(flowC.toFixed(1)), flowC < 16.0 ? 'Warning' : 'Normal');
  updateSensor('SEN-PRC', Number(pressC.toFixed(2)), pressC < 1.9 ? 'Critical' : 'Warning');

  // Water Quality Sensor Readings
  const clA = Number((0.42 + jitter(0.01)).toFixed(2));
  const phA = Number((7.32 + jitter(0.02)).toFixed(2));
  const tuA = Number((0.62 + jitter(0.02)).toFixed(2));
  updateSensor('SEN-CLA', clA, 'Normal');
  updateSensor('SEN-PHA', phA, 'Normal');
  updateSensor('SEN-TUA', tuA, 'Normal');

  const clC = Number((0.28 + jitter(0.02)).toFixed(2));
  const phC = Number((7.12 + jitter(0.02)).toFixed(2));
  const tuC = Number((1.42 + jitter(0.04)).toFixed(2));
  updateSensor('SEN-CLC', clC, 'Normal');
  updateSensor('SEN-PHC', phC, 'Normal');
  updateSensor('SEN-TUC', tuC, 'Warning');

  // 7. Mass-Balance Leakage Detection & Anomaly Model
  // Water Balance Conservation: Total Pump Inflow vs Sum of Delivered Village Branch Flows
  const sumDeliveredBranches = flowA + flowB + flowC;
  const flowDiscrepancyM3h = isRunning ? Math.max(0, pumpFlowM3h - sumDeliveredBranches) : 0.0;
  const estimatedPhysicalLossLph = Math.round(flowDiscrepancyM3h * 1000);
  const waterLossPercent = pumpFlowM3h > 0 ? (flowDiscrepancyM3h / pumpFlowM3h) * 100.0 : 0.0;

  // Anomaly score combines volume loss rate and Branch C pressure deficit
  const nominalBranchCPressure = 3.20;
  const pressureDeficitC = Math.max(0, nominalBranchCPressure - pressC);
  const anomalyScore = Math.min(99.0, Math.round(45.0 * (flowDiscrepancyM3h / 1.5) + 55.0 * (pressureDeficitC / 1.3)));

  let leakageSeverity = 'Normal';
  if (estimatedPhysicalLossLph >= 800 || anomalyScore >= 75) {
    leakageSeverity = 'Critical';
  } else if (estimatedPhysicalLossLph >= 250 || anomalyScore >= 45) {
    leakageSeverity = 'Warning';
  }

  // Update Leak Alert Record in Database
  if (isRunning && estimatedPhysicalLossLph > 200) {
    db.prepare(`
      UPDATE leakage_alerts
      SET estimated_loss_lph = ?, anomaly_score = ?, severity = ?
      WHERE leak_code = 'LEAK-C01'
    `).run(estimatedPhysicalLossLph, anomalyScore, leakageSeverity);
  }

  // 8. Periodic SCADA Telemetry Recording to telemetry_history (every 10 ticks = 30 seconds)
  if (tickCount % 10 === 0 && isRunning) {
    try {
      const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const insertHist = db.prepare(`
        INSERT INTO telemetry_history (sensor_tag, metric, value, unit, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertHist.run('PUMP-01', 'WATER_SUPPLIED_KL', Number((pumpFlowM3h / 3600.0 * 30.0).toFixed(2)), 'kL', ts);
      insertHist.run('PUMP-01', 'FLOW_RATE_M3H', Number(pumpFlowM3h.toFixed(1)), 'm³/h', ts);
      insertHist.run('PUMP-01', 'DISCHARGE_PRESSURE_BAR', Number(pumpDischargeBar.toFixed(2)), 'bar', ts);
      insertHist.run('PUMP-01', 'POWER_KW', Number(hydraulicMetrics.electricalPowerKw.toFixed(1)), 'kW', ts);
      insertHist.run('SYSTEM', 'WATER_LOSS_LPH', estimatedPhysicalLossLph, 'L/h', ts);
      insertHist.run('SYSTEM', 'WATER_BALANCE_DIFF_PERCENT', Number(waterLossPercent.toFixed(1)), '%', ts);
    } catch (histErr) {
      console.error('Failed to log telemetry history snapshot:', histErr);
    }
  }

  // 9. Real-Time Telemetry Broadcast via WebSocket
  if (broadcastCallback) {
    const payload = {
      type: 'TELEMETRY_UPDATE',
      timestamp: new Date().toISOString(),
      pump: {
        status: pump.status,
        flowRate: Number(pumpFlowM3h.toFixed(1)),
        pressure: Number(pumpDischargeBar.toFixed(2)),
        current: Number(hydraulicMetrics.currentA.toFixed(1)),
        power: Number(hydraulicMetrics.electricalPowerKw.toFixed(1)),
        motorTemp: Number(motorTemp.toFixed(1)),
        totalEnergy: Number(totalEnergy.toFixed(2)),
        totalWater: Number(totalWater.toFixed(1)),
        runHours: Number(runHours.toFixed(2)),
        headM: Number(hydraulicMetrics.headM.toFixed(1)),
        pumpEfficiencyPercent: Number(hydraulicMetrics.pumpEfficiencyPercent.toFixed(1))
      },
      branches: {
        villageA: { flow: Number(flowA.toFixed(1)), pressure: Number(pressA.toFixed(2)) },
        villageB: { flow: Number(flowB.toFixed(1)), pressure: Number(pressB.toFixed(2)) },
        villageC: { flow: Number(flowC.toFixed(1)), pressure: Number(pressC.toFixed(2)) }
      },
      massBalance: {
        pumpOutlet: Number(pumpFlowM3h.toFixed(1)),
        sumOfInlets: Number(sumDeliveredBranches.toFixed(1)),
        instantaneousDiscrepancy: Number(flowDiscrepancyM3h.toFixed(2)),
        estimatedPhysicalLossLph,
        waterLossPercent: Number(waterLossPercent.toFixed(1)),
        severity: leakageSeverity,
        anomalyScore
      },
      tanks: tankLevels
    };

    broadcastCallback(payload);
  }
}
