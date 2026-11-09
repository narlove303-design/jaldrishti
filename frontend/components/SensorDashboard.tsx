'use client';

import React, { useState } from 'react';
import { 
  Activity, 
  Droplet, 
  Gauge, 
  Thermometer, 
  ShieldCheck, 
  AlertTriangle, 
  Sliders, 
  Info,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export interface Sensor {
  id: string;
  sensor_tag: string;
  type: string;
  location: string;
  village: string;
  current_value: number;
  unit: string;
  min_normal: number;
  max_normal: number;
  warning_threshold: number;
  critical_threshold: number;
  status: 'Normal' | 'Warning' | 'Critical' | 'Offline';
  last_calibrated: string;
  next_calibration: string;
}

interface SensorDashboardProps {
  sensors: Sensor[];
  onRefresh: () => void;
}

export default function SensorDashboard({ sensors, onRefresh }: SensorDashboardProps) {
  const { isAdmin } = useAuth();
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [typeFilter, setTypeFilter] = useState('All');
  const [villageFilter, setVillageFilter] = useState('All');

  // Threshold form states
  const [minNormal, setMinNormal] = useState(0);
  const [maxNormal, setMaxNormal] = useState(0);
  const [warningThreshold, setWarningThreshold] = useState(0);
  const [criticalThreshold, setCriticalThreshold] = useState(0);
  const [saving, setSaving] = useState(false);

  const openConfig = (sensor: Sensor) => {
    setSelectedSensor(sensor);
    setMinNormal(sensor.min_normal);
    setMaxNormal(sensor.max_normal);
    setWarningThreshold(sensor.warning_threshold);
    setCriticalThreshold(sensor.critical_threshold);
  };

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSensor) return;
    setSaving(true);

    try {
      await apiRequest(`/sensors/${selectedSensor.id}/thresholds`, {
        method: 'PUT',
        body: JSON.stringify({
          min_normal: minNormal,
          max_normal: maxNormal,
          warning_threshold: warningThreshold,
          critical_threshold: criticalThreshold
        })
      });

      setSelectedSensor(null);
      onRefresh();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredSensors = sensors.filter(s => {
    if (typeFilter !== 'All' && s.type !== typeFilter) return false;
    if (villageFilter !== 'All' && s.village !== villageFilter && s.village !== 'All') return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-navy-800 gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy-900 dark:text-white flex items-center space-x-2">
            <span>Sensors & Water Quality Telemetry</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              18 Real-Time Nodes
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Inline pressure transducers, ultrasonic flow meters, residual chlorine analyzers, and pH electrodes.
          </p>
        </div>

        {/* Filter bars */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="p-2 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
          >
            <option value="All">All Sensor Types</option>
            <option value="flow">Flow Meters</option>
            <option value="pressure">Pressure Sensors</option>
            <option value="chlorine">Free Chlorine</option>
            <option value="ph">pH Electrodes</option>
            <option value="turbidity">Turbidity Sensors</option>
            <option value="temperature">Temperature</option>
            <option value="tank_level">Tank Level</option>
          </select>

          <select
            value={villageFilter}
            onChange={(e) => setVillageFilter(e.target.value)}
            className="p-2 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
          >
            <option value="All">All Locations</option>
            <option value="Village A">Village A</option>
            <option value="Village B">Village B</option>
            <option value="Village C">Village C</option>
          </select>
        </div>
      </div>

      {/* Mandatory Drinking Water Safety Disclaimer */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-3">
        <Info className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div>
          <strong className="block font-bold text-sm mb-0.5">
            Health & Potability Disclaimer
          </strong>
          <p className="leading-relaxed text-amber-800 dark:text-amber-300">
            Water quality parameter telemetry (residual chlorine, pH, turbidity) provides real-time operational indicators for process control and chlorination dosing. These sensor readings do <strong>NOT</strong> constitute certified microbiological safety for drinking water without accredited laboratory pathogen clearance.
          </p>
        </div>
      </div>

      {/* Sensor Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSensors.map((sensor) => {
          const isCrit = sensor.status === 'Critical';
          const isWarn = sensor.status === 'Warning';

          return (
            <div
              key={sensor.id}
              className={`bg-white dark:bg-navy-900 rounded-2xl p-4 border shadow-sm transition hover:shadow-md ${
                isCrit
                  ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20'
                  : isWarn
                  ? 'border-amber-300 dark:border-amber-900'
                  : 'border-slate-200 dark:border-navy-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-extrabold text-teal-600 dark:text-teal-400">
                  {sensor.sensor_tag}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  isCrit
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : isWarn
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                  {sensor.status}
                </span>
              </div>

              <div className="font-bold text-sm text-navy-900 dark:text-white truncate">
                {sensor.location}
              </div>
              <div className="text-xs text-slate-400 mb-3">{sensor.village}</div>

              {/* Value display */}
              <div className="flex items-baseline space-x-2 my-2">
                <span className="text-2xl font-extrabold text-navy-900 dark:text-white">
                  {sensor.current_value}
                </span>
                <span className="text-xs font-semibold text-slate-500">{sensor.unit}</span>
              </div>

              {/* Threshold specs */}
              <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-navy-800">
                <div className="flex justify-between">
                  <span>Nominal Band:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {sensor.min_normal} - {sensor.max_normal} {sensor.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Alert Thresholds:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Warn: {sensor.warning_threshold} | Crit: {sensor.critical_threshold}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                  <span>Calibrated: {sensor.last_calibrated}</span>
                  <span>Due: {sensor.next_calibration}</span>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-navy-800 text-right">
                  <button
                    onClick={() => openConfig(sensor)}
                    className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1 ml-auto"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Configure Thresholds</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Threshold Configuration Modal */}
      {selectedSensor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-navy-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-navy-700 space-y-4">
            <h3 className="font-extrabold text-base text-navy-900 dark:text-white">
              Configure Sensor Thresholds: {selectedSensor.sensor_tag}
            </h3>

            <p className="text-xs text-slate-500">
              {selectedSensor.location} ({selectedSensor.village}) · Unit: {selectedSensor.unit}
            </p>

            <form onSubmit={handleSaveThresholds} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Min Normal
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={minNormal}
                    onChange={(e) => setMinNormal(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Normal
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={maxNormal}
                    onChange={(e) => setMaxNormal(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Warning Threshold
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={warningThreshold}
                    onChange={(e) => setWarningThreshold(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Critical Threshold
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={criticalThreshold}
                    onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSensor(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow"
                >
                  {saving ? 'Saving...' : 'Save Thresholds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
