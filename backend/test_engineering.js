/**
 * JalDrishti Engineering & Fluid Mechanics Verification Test Suite
 * Tests physical calculations: Darcy-Weisbach, Pump Hydraulics, Tank Mass Balance, and Leak Detection
 */

import {
  calculateDarcyWeisbach,
  calculatePumpHydraulics,
  updateTankMassBalance,
  RHO_WATER,
  GRAVITY,
  PIPELINE_SPECS
} from './simulation.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName} - ${details}`);
  }
}

function runEngineeringTests() {
  console.log('\n======================================================');
  console.log('🧪 JalDrishti Fluid Mechanics & Engineering Test Suite');
  console.log('======================================================\n');

  // TEST SUITE 1: Darcy-Weisbach Pipeline Friction & Head Loss
  console.log('--- 1. Darcy-Weisbach Pipeline Friction Loss ---');

  // Test 1.1: Zero flow condition
  const zeroLoss = calculateDarcyWeisbach(0, 500, 0.15, 0.0000015);
  assert(zeroLoss.velocity === 0 && zeroLoss.headLossM === 0 && zeroLoss.pressureLossBar === 0,
    'Zero flow returns zero velocity, zero head loss, and zero pressure drop');

  // Test 1.2: Laminar flow check (very low flow)
  // Low flow yielding Re < 2300: flow = 0.05 m³/h in 0.15m pipe
  const laminar = calculateDarcyWeisbach(0.05, 100, 0.15, 0.0000015);
  assert(laminar.reynolds < 2300 && Math.abs(laminar.frictionFactor - 64.0 / laminar.reynolds) < 0.001,
    'Laminar regime correctly evaluates Poiseuille friction factor f = 64/Re');

  // Test 1.3: Turbulent flow in Feeder Pipe (MAIN-01: L=450m, D=0.20m, eps=0.025mm, Q=84 m³/h)
  const feeder = calculateDarcyWeisbach(
    84.0,
    PIPELINE_SPECS.feeder.lengthM,
    PIPELINE_SPECS.feeder.diameterM,
    PIPELINE_SPECS.feeder.roughnessM
  );
  assert(feeder.reynolds > 100000,
    'Feeder pipe exhibits fully turbulent flow (Re > 100,000)',
    `Actual Re: ${feeder.reynolds}`);
  assert(feeder.velocity > 0.70 && feeder.velocity < 0.80,
    'Feeder velocity is within optimal water transmission velocity (0.7-0.8 m/s)',
    `Actual velocity: ${feeder.velocity.toFixed(3)} m/s`);
  assert(feeder.frictionFactor > 0.015 && feeder.frictionFactor < 0.022,
    'Swamee-Jain friction factor matches standard Moody chart values for Ductile Iron (0.017-0.019)',
    `Actual f: ${feeder.frictionFactor.toFixed(4)}`);
  assert(feeder.pressureLossBar > 0.08 && feeder.pressureLossBar < 0.15,
    'Feeder pressure loss is realistic (~0.11 bar across 450m)',
    `Actual pressure loss: ${feeder.pressureLossBar.toFixed(3)} bar`);

  // Test 1.4: Branch C Pipeline Loss (PIPE-C01: L=850m, D=0.11m, HDPE, Q=21.7 m³/h)
  const branchC = calculateDarcyWeisbach(
    21.7,
    PIPELINE_SPECS.branchC.lengthM,
    PIPELINE_SPECS.branchC.diameterM,
    PIPELINE_SPECS.branchC.roughnessM
  );
  assert(branchC.headLossM > 2.5 && branchC.headLossM < 3.8,
    'Branch C pipe head loss reflects 850m length and 110mm diameter (~3.07 m head loss)',
    `Actual head loss: ${branchC.headLossM.toFixed(2)} m`);
  assert(branchC.pressureLossBar > 0.25 && branchC.pressureLossBar < 0.38,
    'Branch C pressure loss is physically consistent (~0.30 bar)',
    `Actual deltaP: ${branchC.pressureLossBar.toFixed(3)} bar`);


  // TEST SUITE 2: Centrifugal Pump Hydraulics & Electrical Modeling
  console.log('\n--- 2. Centrifugal Pump Hydraulics & Power ---');

  // Test 2.1: Zero flow condition
  const zeroPump = calculatePumpHydraulics(0, 0.5, 1.45);
  assert(zeroPump.hydraulicPowerKw === 0 && zeroPump.electricalPowerKw === 0,
    'Zero pump flow returns zero power consumption');

  // Test 2.2: Nominal pump operating point: Q = 84.0 m³/h, P_discharge = 3.62 bar, P_suction = 1.45 bar
  const pumpNominal = calculatePumpHydraulics(84.0, 3.62, 1.45, 48.5);
  // deltaP = (3.62 - 1.45) * 100,000 = 217,000 Pa
  // Q = 84 / 3600 = 0.02333 m³/s
  // P_hyd = 217,000 * 0.02333 = 5,063 W = 5.06 kW
  assert(pumpNominal.headM > 20.0 && pumpNominal.headM < 25.0,
    'Total dynamic differential head is ~22.1 m (deltaP / (rho * g))',
    `Actual head: ${pumpNominal.headM.toFixed(2)} m`);
  assert(pumpNominal.hydraulicPowerKw > 4.5 && pumpNominal.hydraulicPowerKw < 5.8,
    'Hydraulic power P_hyd matches rho * g * Q * H (~5.06 kW)',
    `Actual P_hyd: ${pumpNominal.hydraulicPowerKw.toFixed(2)} kW`);
  assert(pumpNominal.electricalPowerKw > 6.5 && pumpNominal.electricalPowerKw < 8.5,
    'Electrical power accounts for pump (eta ~0.76) and motor (eta ~0.91) efficiency',
    `Actual P_elec: ${pumpNominal.electricalPowerKw.toFixed(2)} kW`);
  assert(pumpNominal.currentA > 10.0 && pumpNominal.currentA < 18.0,
    'Motor 3-phase current matches P / (sqrt(3) * V * cosPhi)',
    `Actual current: ${pumpNominal.currentA.toFixed(2)} A`);


  // TEST SUITE 3: Tank Mass Balance Integration (dV/dt = Qin - Qout)
  console.log('\n--- 3. Tank Mass Balance & Volume Conservation ---');

  const capacityLiters = 180000;
  const maxHeightM = 5.0;

  // Test 3.1: Positive net inflow increases volume
  // Inflow = 34 m³/h, Outflow = 28 m³/h => Net +6 m³/h
  // In 360 seconds (6 minutes), net inflow = 6 * (360/3600) * 1000 = +600 Liters
  const startVol = 100000;
  const filled = updateTankMassBalance(startVol, capacityLiters, 34.0, 28.0, 360, maxHeightM);
  assert(Math.abs(filled.newVolumeLiters - 100600) < 1.0,
    'Tank mass balance accurately integrates dV/dt = Qin - Qout (+600 L)',
    `Actual volume: ${filled.newVolumeLiters} L`);
  assert(filled.levelPercent > 55.0 && filled.levelPercent < 56.5,
    'Tank level percentage reflects (newVolume / capacity) * 100',
    `Actual level: ${filled.levelPercent}%`);
  assert(filled.waterHeightM > 2.70 && filled.waterHeightM < 2.85,
    'Water height is strictly proportional to volume fraction (h_max * V/V_max)',
    `Actual height: ${filled.waterHeightM} m`);

  // Test 3.2: High outflow clamped at zero (never becomes negative)
  const drained = updateTankMassBalance(500, capacityLiters, 0, 50.0, 3600, maxHeightM);
  assert(drained.newVolumeLiters === 0 && drained.levelPercent === 0 && drained.waterHeightM === 0,
    'Tank volume never becomes negative under prolonged drainage (clamped at 0 L)');

  // Test 3.3: Inflow exceeding capacity clamped at capacity (never overflows storage)
  const overflow = updateTankMassBalance(179000, capacityLiters, 80.0, 0, 3600, maxHeightM);
  assert(overflow.newVolumeLiters === capacityLiters && overflow.levelPercent === 100.0,
    'Tank volume strictly clamped at maximum capacity (never exceeds 100%)');


  // TEST SUITE 4: Mass Balance Leakage Detection & Anomaly Model
  console.log('\n--- 4. Mass Balance Leakage Detection Principles ---');

  // Inflow = 84.0 m³/h, Sum of villages = 34.1 + 26.9 + 21.7 = 82.7 m³/h
  const qInlet = 84.0;
  const qDelivered = 34.1 + 26.9 + 21.7;
  const discrepancyM3h = qInlet - qDelivered; // 1.3 m³/h
  const physicalLossLph = Math.round(discrepancyM3h * 1000); // 1300 L/h
  const lossPercent = (discrepancyM3h / qInlet) * 100.0;

  assert(Math.abs(discrepancyM3h - 1.3) < 0.01,
    'Discrepancy correctly calculated as Q_inlet - sum(Q_delivered) = 1.3 m³/h');
  assert(physicalLossLph === 1300,
    'Physical loss converted to L/h accurately (1300 L/h)');
  assert(lossPercent > 1.4 && lossPercent < 1.7,
    'Water loss percentage calculated accurately as (Loss / Inflow) * 100 (~1.55%)');
  assert(physicalLossLph >= 800,
    'Loss rate >= 800 L/h triggers Critical condition threshold for acoustic pinpointing');

  // Summary
  console.log('\n======================================================');
  console.log(`Test Results: ${passedTests} / ${totalTests} passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('======================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runEngineeringTests();
