'use client';

import React, { useState } from 'react';
import { 
  Gauge, 
  Zap, 
  Thermometer, 
  Clock, 
  RotateCcw, 
  Power, 
  Sliders, 
  ShieldCheck, 
  AlertTriangle,
  Droplets,
  Radio
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface PumpData {
  status: 'Running' | 'Stopped' | 'Maintenance' | 'Tripped';
  voltage_v: number;
  current_a: number;
  power_kw: number;
  motor_temp_c: number;
  discharge_pressure_bar: number;
  flow_rate_m3h: number;
  total_energy_kwh: number;
  total_water_kl: number;
  run_hours: number;
  vfd_frequency_hz: number;
  interlock_status: string;
}

interface PumpMonitorProps {
  pumpData: PumpData;
  onRefresh: () => void;
}

export default function PumpMonitor({ pumpData, onRefresh }: PumpMonitorProps) {
  const { user, isStaff } = useAuth();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'START' | 'STOP' | null>(null);
  const [frequency, setFrequency] = useState(pumpData.vfd_frequency_hz || 48.5);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const isRunning = pumpData.status === 'Running';

  const handleTriggerCommand = (cmd: 'START' | 'STOP') => {
    setPendingAction(cmd);
    setShowConfirmModal(true);
  };

  const handleExecuteCommand = async () => {
    if (!pendingAction) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await apiRequest<{ message: string }>('/pump/control', {
        method: 'POST',
        body: JSON.stringify({ command: pendingAction })
      });
      setActionMessage(res.message);
      setShowConfirmModal(false);
      setPendingAction(null);
      onRefresh();
    } catch (err: any) {
      alert(`Command Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFrequencyChange = async (newFreq: number) => {
    setFrequency(newFreq);
    try {
      await apiRequest('/pump/control', {
        method: 'POST',
        body: JSON.stringify({ command: 'SET_FREQUENCY', frequency_hz: newFreq })
      });
      onRefresh();
    } catch (err: any) {
      console.error('Failed to adjust frequency:', err);
    }
  };

  const handleResetInterlocks = async () => {
    try {
      await apiRequest('/pump/control', {
        method: 'POST',
        body: JSON.stringify({ command: 'RESET_INTERLOCKS' })
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="bg-white dark:bg-navy-900 rounded-2xl p-6 border border-slate-200 dark:border-navy-800 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-navy-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy-900 dark:text-white flex items-center space-x-2">
              <span>Central Main Pump Station (P-01)</span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                isRunning 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {isRunning ? '● RUNNING' : '○ STOPPED'}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Primary Intake Station · Supplies Village A, Village B, and Village C networks
            </p>
          </div>
        </div>

        {/* Operating Hours and Cumulative Output */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="text-right">
            <div className="text-slate-400">Lifetime Supplied</div>
            <div className="font-extrabold text-navy-900 dark:text-white text-sm">
              {pumpData.total_water_kl.toLocaleString()} kL
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-navy-700"></div>
          <div className="text-right">
            <div className="text-slate-400">Operating Hours</div>
            <div className="font-extrabold text-navy-900 dark:text-white text-sm">
              {pumpData.run_hours.toLocaleString()} hrs
            </div>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-semibold">
          {actionMessage}
        </div>
      )}

      {/* Primary Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-50 dark:bg-navy-950/70 p-3.5 rounded-xl border border-slate-200/60 dark:border-navy-800">
          <div className="text-xs text-slate-400 mb-1 flex items-center space-x-1">
            <Droplets className="w-3.5 h-3.5 text-teal-500" />
            <span>Discharge Flow</span>
          </div>
          <div className="text-xl font-extrabold text-navy-900 dark:text-teal-400">
            {pumpData.flow_rate_m3h} <span className="text-xs font-semibold text-slate-500">m³/h</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Target: 80 - 90 m³/h</div>
        </div>

        <div className="bg-slate-50 dark:bg-navy-950/70 p-3.5 rounded-xl border border-slate-200/60 dark:border-navy-800">
          <div className="text-xs text-slate-400 mb-1 flex items-center space-x-1">
            <Gauge className="w-3.5 h-3.5 text-cyan-500" />
            <span>Discharge Pressure</span>
          </div>
          <div className="text-xl font-extrabold text-navy-900 dark:text-white">
            {pumpData.discharge_pressure_bar} <span className="text-xs font-semibold text-slate-500">bar</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Normal: 3.2 - 4.0 bar</div>
        </div>

        <div className="bg-slate-50 dark:bg-navy-950/70 p-3.5 rounded-xl border border-slate-200/60 dark:border-navy-800">
          <div className="text-xs text-slate-400 mb-1 flex items-center space-x-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Power & Voltage</span>
          </div>
          <div className="text-xl font-extrabold text-navy-900 dark:text-white">
            {pumpData.power_kw} <span className="text-xs font-semibold text-slate-500">kW</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">{pumpData.voltage_v} V · {pumpData.current_a} A</div>
        </div>

        <div className="bg-slate-50 dark:bg-navy-950/70 p-3.5 rounded-xl border border-slate-200/60 dark:border-navy-800">
          <div className="text-xs text-slate-400 mb-1 flex items-center space-x-1">
            <Thermometer className="w-3.5 h-3.5 text-rose-500" />
            <span>Motor Temperature</span>
          </div>
          <div className="text-xl font-extrabold text-navy-900 dark:text-white">
            {pumpData.motor_temp_c} <span className="text-xs font-semibold text-slate-500">°C</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Trip limit: &gt;75 °C</div>
        </div>

        <div className="bg-slate-50 dark:bg-navy-950/70 p-3.5 rounded-xl border border-slate-200/60 dark:border-navy-800">
          <div className="text-xs text-slate-400 mb-1 flex items-center space-x-1">
            <Sliders className="w-3.5 h-3.5 text-indigo-500" />
            <span>VFD Frequency</span>
          </div>
          <div className="text-xl font-extrabold text-navy-900 dark:text-white">
            {pumpData.vfd_frequency_hz} <span className="text-xs font-semibold text-slate-500">Hz</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Range: 25 - 50 Hz</div>
        </div>

        <div className="bg-slate-50 dark:bg-navy-950/70 p-3.5 rounded-xl border border-slate-200/60 dark:border-navy-800">
          <div className="text-xs text-slate-400 mb-1 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-teal-500" />
            <span>Energy Intensity</span>
          </div>
          <div className="text-xl font-extrabold text-teal-600 dark:text-teal-400">
            0.340 <span className="text-xs font-semibold text-slate-500">kWh/kL</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">High Efficiency Class</div>
        </div>
      </div>

      {/* Simulated SCADA Controls & Interlocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
        {/* Safety Interlocks Status */}
        <div className="bg-slate-50 dark:bg-navy-950/60 rounded-xl p-4 border border-slate-200/80 dark:border-navy-800">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Safety Interlocks & Protective Relays</span>
            </h4>
            <button
              onClick={handleResetInterlocks}
              className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold hover:underline"
            >
              Reset Faults
            </button>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 font-medium bg-white dark:bg-navy-900 p-2.5 rounded-lg border border-slate-200 dark:border-navy-700">
            {pumpData.interlock_status}
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            Monitors: Suction flooded head, motor thermal winding sensor, phase symmetry, vibration limits.
          </div>
        </div>

        {/* Operator Controls */}
        <div className="bg-slate-50 dark:bg-navy-950/60 rounded-xl p-4 border border-slate-200/80 dark:border-navy-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center space-x-1.5">
              <Radio className="w-4 h-4 text-cyan-500" />
              <span>Safe Simulated Pump Controls</span>
            </h4>
            <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded font-semibold">
              SIMULATED ONLY
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {isRunning ? (
              <button
                onClick={() => handleTriggerCommand('STOP')}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-2 transition"
              >
                <Power className="w-4 h-4" />
                <span>Stop Main Pump P-01 (Simulation)</span>
              </button>
            ) : (
              <button
                onClick={() => handleTriggerCommand('START')}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-2 transition"
              >
                <Power className="w-4 h-4" />
                <span>Start Main Pump P-01 (Simulation)</span>
              </button>
            )}
          </div>

          {/* VFD Speed Slider */}
          <div className="pt-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>VFD Operating Frequency</span>
              <span className="font-bold text-navy-900 dark:text-white">{frequency} Hz</span>
            </div>
            <input
              type="range"
              min="25"
              max="50"
              step="0.5"
              value={frequency}
              onChange={(e) => handleFrequencyChange(Number(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Equipment Control */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-navy-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-navy-700 space-y-4">
            <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-navy-900 dark:text-white">
                Confirm Simulated Equipment Action
              </h3>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-xs text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
              <strong>SAFETY DISCLAIMER:</strong> This is a simulation test. This action changes mathematical telemetry state inside the application database. No actual PLC, motor starter, or high-voltage switchgear is triggered.
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to <strong>{pendingAction === 'START' ? 'START' : 'STOP'}</strong> Central Main Pump Station P-01 supplying Village A, Village B, and Village C?
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteCommand}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow"
              >
                {actionLoading ? 'Executing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
