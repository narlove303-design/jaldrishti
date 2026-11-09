import { db } from './db.js';

/**
 * Real-time simulation and rule-based anomaly detection engine
 * Simulates physical dynamics: pump rotation, hydraulic head, pipeline branch friction,
 * tank volume conservation, water quality variance, and mass-balance flow discrepancies.
 */

let simulationTimer = null;
let broadcastCallback = null;

export function registerBroadcastCallback(cb) {
  broadcastCallback = cb;
}

export function startSimulationEngine() {
  if (simulationTimer) return;
  console.log('Starting JalDrishti Physical Telemetry & Anomaly Simulation Engine (3s interval)...');

  simulationTimer = setInterval(() => {
    try {
      tickSimulation();
    } catch (err) {
      console.error('Simulation tick error:', err);
    }
  }, 3000);
}

export function stopSimulationEngine() {
  if (simulationTimer) {
    clearInterval(simulationTimer);
    simulationTimer = null;
  }
}

function tickSimulation() {
  // 1. Fetch current pump state
  const pump = db.prepare('SELECT * FROM pump_station WHERE id = 1').get();
  if (!pump) return;

  const isRunning = pump.status === 'Running';

  // Small realistic stochastic jitter
  const jitter = (range) => (Math.random() - 0.5) * range;

  let newFlowRate = 0;
  let newPressure = 0;
  let newCurrent = 0;
  let newPower = 0;
  let newTemp = pump.motor_temp_c;
  let newEnergy = pump.total_energy_kwh;
  let newWater = pump.total_water_kl;
  let newHours = pump.run_hours;

  if (isRunning) {
    // Nominal pump parameters with physical variation
    newFlowRate = Math.max(78, Math.min(88, 84.0 + jitter(1.5)));
    newPressure = Math.max(3.4, Math.min(3.8, 3.62 + jitter(0.08)));
    newCurrent = Math.max(22, Math.min(25, 23.4 + jitter(0.4)));
    newPower = Math.max(12.2, Math.min(13.4, (newCurrent * 415 * Math.sqrt(3) * 0.85) / 1000));
    newTemp = Math.min(68, Math.max(52, pump.motor_temp_c + (Math.random() > 0.5 ? 0.05 : -0.05)));
    
    // Accumulate incremental totals (3 seconds = 3/3600 hour)
    const hoursElapsed = 3 / 3600;
    newEnergy += newPower * hoursElapsed;
    newWater += newFlowRate * hoursElapsed;
    newHours += hoursElapsed;
  } else {
    // Pump stopped
    newFlowRate = 0;
    newPressure = Math.max(0.5, pump.discharge_pressure_bar - 0.2); // Residual static head
    newCurrent = 0;
    newPower = 0;
    newTemp = Math.max(30, pump.motor_temp_c - 0.15); // Cooling down
  }

  // Update pump in DB
  db.prepare(`
    UPDATE pump_station
    SET discharge_pressure_bar = ?, flow_rate_m3h = ?, current_a = ?, power_kw = ?,
        motor_temp_c = ?, total_energy_kwh = ?, total_water_kl = ?, run_hours = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(
    Number(newPressure.toFixed(2)),
    Number(newFlowRate.toFixed(1)),
    Number(newCurrent.toFixed(1)),
    Number(newPower.toFixed(1)),
    Number(newTemp.toFixed(1)),
    Number(newEnergy.toFixed(2)),
    Number(newWater.toFixed(1)),
    Number(newHours.toFixed(2))
  );

  // 2. Branch pipelines & distribution junction
  // When pump is running, flow divides into Village A, B, and C
  let flowA = 0;
  let flowB = 0;
  let flowC = 0;
  let pressA = 0.8;
  let pressB = 0.6;
  let pressC = 0.4;

  if (isRunning) {
    flowA = Number((34.1 + jitter(0.8)).toFixed(1));
    flowB = Number((26.9 + jitter(0.6)).toFixed(1));
    // Village C is experiencing leakage draw: flow measured is 21.7 m³/h
    flowC = Number((21.7 + jitter(0.5)).toFixed(1));

    pressA = Number((3.34 + jitter(0.04)).toFixed(2));
    pressB = Number((2.58 + jitter(0.05)).toFixed(2));
    pressC = Number((1.88 + jitter(0.06)).toFixed(2)); // Critical low pressure
  }

  // Update pipeline records
  db.prepare('UPDATE pipelines SET current_flow_m3h = ?, current_pressure_bar = ? WHERE id = ?')
    .run(flowA, pressA, 'PIPE-A01');
  db.prepare('UPDATE pipelines SET current_flow_m3h = ?, current_pressure_bar = ? WHERE id = ?')
    .run(flowB, pressB, 'PIPE-B01');
  db.prepare('UPDATE pipelines SET current_flow_m3h = ?, current_pressure_bar = ? WHERE id = ?')
    .run(flowC, pressC, 'PIPE-C01');

  // 3. Tank Dynamics: Level changes based on net balance (Inlet - Outlet)
  const tanks = db.prepare('SELECT * FROM tanks').all();
  for (const tank of tanks) {
    let currentLevel = tank.current_level_percent;
    if (isRunning) {
      // Inflow slightly exceeds outflow during pumping
      currentLevel = Math.min(96, Math.max(15, currentLevel + (tank.village_name === 'Village C' ? 0.01 : 0.04)));
    } else {
      // Gravity outflow drains tank slowly
      currentLevel = Math.max(12, currentLevel - 0.03);
    }
    db.prepare('UPDATE tanks SET current_level_percent = ? WHERE id = ?')
      .run(Number(currentLevel.toFixed(1)), tank.id);
    db.prepare('UPDATE villages SET tank_level_percent = ? WHERE name = ?')
      .run(Number(currentLevel.toFixed(1)), tank.village_name);
  }

  // 4. Update Sensors
  const updateSensorVal = (id, val, status) => {
    db.prepare('UPDATE sensors SET current_value = ?, status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?')
      .run(val, status, id);
  };

  updateSensorVal('SEN-FM01', newFlowRate, newFlowRate > 105 ? 'Warning' : 'Normal');
  updateSensorVal('SEN-PR01', newPressure, newPressure < 2.5 ? 'Warning' : 'Normal');
  updateSensorVal('SEN-TE01', newTemp, newTemp > 70 ? 'Critical' : 'Normal');
  updateSensorVal('SEN-EN01', newPower, 'Normal');

  updateSensorVal('SEN-FMA', flowA, 'Normal');
  updateSensorVal('SEN-PRA', pressA, 'Normal');
  updateSensorVal('SEN-FMB', flowB, 'Normal');
  updateSensorVal('SEN-PRB', pressB, pressB < 2.6 ? 'Warning' : 'Normal');
  updateSensorVal('SEN-FMC', flowC, flowC < 16 ? 'Warning' : 'Normal');
  updateSensorVal('SEN-PRC', pressC, pressC < 1.9 ? 'Critical' : 'Warning');

  // Subtle water quality variations
  const clA = Number((0.42 + jitter(0.02)).toFixed(2));
  const phA = Number((7.32 + jitter(0.03)).toFixed(2));
  const tuA = Number((0.62 + jitter(0.04)).toFixed(2));
  updateSensorVal('SEN-CLA', clA, 'Normal');
  updateSensorVal('SEN-PHA', phA, 'Normal');
  updateSensorVal('SEN-TUA', tuA, 'Normal');

  const clC = Number((0.28 + jitter(0.03)).toFixed(2));
  const phC = Number((7.12 + jitter(0.04)).toFixed(2));
  const tuC = Number((1.42 + jitter(0.08)).toFixed(2));
  updateSensorVal('SEN-CLC', clC, 'Normal');
  updateSensorVal('SEN-PHC', phC, 'Normal');
  updateSensorVal('SEN-TUC', tuC, 'Warning');

  // 5. Intelligent Rule-Based Leakage Engine Analysis
  // Mass balance comparison: Discharge Flow vs Sum of Branch Flows
  const sumBranches = flowA + flowB + flowC;
  const flowDiscrepancy = isRunning ? Math.max(0, newFlowRate - sumBranches) : 0;
  const estimatedPhysicalLossLph = Math.round(flowDiscrepancy * 1000); // convert m³/h to L/h

  // Update leakage alert record with updated rule-based evaluation
  if (estimatedPhysicalLossLph > 800) {
    db.prepare(`
      UPDATE leakage_alerts
      SET estimated_loss_lph = ?, anomaly_score = ?, severity = 'Critical'
      WHERE leak_code = 'LEAK-C01'
    `).run(estimatedPhysicalLossLph, Math.min(98, 85 + (estimatedPhysicalLossLph - 1000) * 0.02));
  }

  // 6. Push real-time payload via WebSocket to connected clients
  if (broadcastCallback) {
    const payload = {
      type: 'TELEMETRY_UPDATE',
      timestamp: new Date().toISOString(),
      pump: {
        status: pump.status,
        flowRate: newFlowRate,
        pressure: newPressure,
        current: newCurrent,
        power: newPower,
        motorTemp: newTemp,
        totalEnergy: newEnergy,
        totalWater: newWater,
        runHours: newHours
      },
      branches: {
        villageA: { flow: flowA, pressure: pressA },
        villageB: { flow: flowB, pressure: pressB },
        villageC: { flow: flowC, pressure: pressC }
      },
      massBalance: {
        pumpOutlet: newFlowRate,
        sumOfInlets: Number(sumBranches.toFixed(1)),
        instantaneousDiscrepancy: Number(flowDiscrepancy.toFixed(1)),
        estimatedPhysicalLossLph
      },
      tanks: {
        'Village A': (db.prepare("SELECT current_level_percent FROM tanks WHERE id = 'TANK-A'").get()?.current_level_percent) || 74,
        'Village B': (db.prepare("SELECT current_level_percent FROM tanks WHERE id = 'TANK-B'").get()?.current_level_percent) || 48,
        'Village C': (db.prepare("SELECT current_level_percent FROM tanks WHERE id = 'TANK-C'").get()?.current_level_percent) || 61
      }
    };

    broadcastCallback(payload);
  }
}
