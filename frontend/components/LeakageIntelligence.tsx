'use client';

import React, { useState } from 'react';
import { 
  AlertOctagon, 
  Search, 
  MapPin, 
  Users, 
  Wrench, 
  CheckCircle, 
  HelpCircle, 
  Activity,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface LeakAlert {
  id: number;
  leak_code: string;
  village: string;
  suspected_location: string;
  pipeline_id: string;
  estimated_loss_lph: number;
  anomaly_score: number;
  severity: 'Warning' | 'Critical';
  classification: 'Suspected Leak' | 'Confirmed Leak' | 'Sensor Discrepancy';
  status: 'Active' | 'Under Investigation' | 'Repaired' | 'False Positive';
  affected_households: number;
  recommended_action: string;
}

interface LeakageIntelligenceProps {
  alerts: LeakAlert[];
  massBalance: {
    pumpOutletFlowM3h: number;
    branchSumFlowM3h: number;
    instantaneousMismatchM3h: number;
    instantaneousMismatchLph: number;
    methodology: string;
    disclaimer: string;
  };
  onRefresh: () => void;
  onCreateWorkOrder?: (village: string, task: string) => void;
}

export default function LeakageIntelligence({
  alerts,
  massBalance,
  onRefresh,
  onCreateWorkOrder,
}: LeakageIntelligenceProps) {
  const [selectedAlert, setSelectedAlert] = useState<LeakAlert | null>(alerts[0] || null);
  const [statusModal, setStatusModal] = useState<LeakAlert | null>(null);
  const [newStatus, setNewStatus] = useState<string>('Under Investigation');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleUpdateStatus = async () => {
    if (!statusModal) return;
    setSubmitting(true);
    try {
      await apiRequest(`/leaks/${statusModal.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, notes }),
      });
      setStatusModal(null);
      setNotes('');
      onRefresh();
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Methodology & Algorithm Transparency */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-3">
        <Info className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div>
          <div className="font-bold text-sm mb-0.5">
            Transparent Rule-Based Anomaly & Physical Mass-Balance Engine
          </div>
          <p className="leading-relaxed text-amber-800 dark:text-amber-300">
            {massBalance.disclaimer}
          </p>
        </div>
      </div>

      {/* Mass Balance Diagnostic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-navy-900 rounded-2xl p-4 border border-slate-200 dark:border-navy-800 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Main Pump Discharge Header</div>
          <div className="text-2xl font-extrabold text-navy-900 dark:text-white mt-1">
            {massBalance.pumpOutletFlowM3h} <span className="text-xs font-semibold text-slate-500">m³/h</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Ultrasonic Meter FM-01</div>
        </div>

        <div className="bg-white dark:bg-navy-900 rounded-2xl p-4 border border-slate-200 dark:border-navy-800 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Sum of Village Inlets (A+B+C)</div>
          <div className="text-2xl font-extrabold text-navy-900 dark:text-white mt-1">
            {massBalance.branchSumFlowM3h} <span className="text-xs font-semibold text-slate-500">m³/h</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">FM-A (34.1) + FM-B (26.9) + FM-C (21.7)</div>
        </div>

        <div className="bg-white dark:bg-navy-900 rounded-2xl p-4 border border-rose-200 dark:border-rose-900/60 shadow-sm bg-rose-50/30 dark:bg-rose-950/20">
          <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Unaccounted Transmission Gap</div>
          <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-400 mt-1">
            {massBalance.instantaneousMismatchM3h} <span className="text-xs font-semibold">m³/h</span>
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-300 font-medium mt-1">
            ≈ {massBalance.instantaneousMismatchLph.toLocaleString()} Litres / Hour
          </div>
        </div>

        <div className="bg-white dark:bg-navy-900 rounded-2xl p-4 border border-slate-200 dark:border-navy-800 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Anomaly Severity Index</div>
          <div className="text-2xl font-extrabold text-navy-900 dark:text-white mt-1">
            88.5 <span className="text-xs font-semibold text-rose-500">/ 100</span>
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-1">
            High Confidence Suspected Leak
          </div>
        </div>
      </div>

      {/* Active Pipeline Leak Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-bold text-sm text-navy-900 dark:text-white flex items-center justify-between">
            <span>Detected Leakage Incidents</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300">
              {alerts.length} Records
            </span>
          </h3>

          <div className="space-y-2.5">
            {alerts.map((alert) => {
              const isSelected = selectedAlert?.id === alert.id;
              return (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 shadow-sm'
                      : 'border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-extrabold text-navy-900 dark:text-white">
                      {alert.leak_code}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      alert.severity === 'Critical' 
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {alert.village}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {alert.suspected_location}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-navy-800 text-[11px]">
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      ~{alert.estimated_loss_lph.toLocaleString()} L/h
                    </span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {alert.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Incident Detail & Recommended Inspection */}
        {selectedAlert && (
          <div className="lg:col-span-2 bg-white dark:bg-navy-900 rounded-2xl p-6 border border-slate-200 dark:border-navy-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-navy-800 gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">
                    {selectedAlert.leak_code}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-300">
                    {selectedAlert.classification}
                  </span>
                </div>
                <h2 className="text-base font-extrabold text-navy-900 dark:text-white mt-1">
                  {selectedAlert.suspected_location}
                </h2>
              </div>

              <button
                onClick={() => setStatusModal(selectedAlert)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-navy-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-800 transition"
              >
                Update Investigation Status
              </button>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-navy-950 p-3 rounded-xl border border-slate-200/60 dark:border-navy-800">
                <div className="text-[11px] text-slate-400 font-medium">Estimated Loss</div>
                <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                  {selectedAlert.estimated_loss_lph.toLocaleString()} <span className="text-xs">L/h</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-navy-950 p-3 rounded-xl border border-slate-200/60 dark:border-navy-800">
                <div className="text-[11px] text-slate-400 font-medium">Anomaly Score</div>
                <div className="text-lg font-extrabold text-navy-900 dark:text-white mt-0.5">
                  {selectedAlert.anomaly_score} <span className="text-xs text-slate-400">/ 100</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-navy-950 p-3 rounded-xl border border-slate-200/60 dark:border-navy-800">
                <div className="text-[11px] text-slate-400 font-medium">Affected Homes</div>
                <div className="text-lg font-extrabold text-navy-900 dark:text-white mt-0.5">
                  {selectedAlert.affected_households} <span className="text-xs text-slate-400">Households</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-navy-950 p-3 rounded-xl border border-slate-200/60 dark:border-navy-800">
                <div className="text-[11px] text-slate-400 font-medium">Pipeline Branch</div>
                <div className="text-lg font-extrabold text-teal-600 dark:text-teal-400 mt-0.5 font-mono">
                  {selectedAlert.pipeline_id}
                </div>
              </div>
            </div>

            {/* Recommended Inspection Steps */}
            <div className="p-4 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800">
              <div className="flex items-center space-x-2 text-teal-900 dark:text-teal-200 font-bold text-xs mb-2">
                <Wrench className="w-4 h-4 text-teal-600" />
                <span>Recommended Engineering & Field Actions:</span>
              </div>
              <p className="text-xs text-teal-800 dark:text-teal-300 leading-relaxed">
                {selectedAlert.recommended_action}
              </p>
            </div>

            {/* Work Order Dispatch Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-100 dark:border-navy-800 gap-3">
              <div className="text-xs text-slate-500">
                Current State: <strong className="text-slate-800 dark:text-slate-200">{selectedAlert.status}</strong>
              </div>

              <button
                onClick={() => onCreateWorkOrder?.(selectedAlert.village, `Emergency Leakage Repair: ${selectedAlert.suspected_location}`)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-1.5 transition"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Dispatch Maintenance Work Order</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Modal */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-navy-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-navy-700 space-y-4">
            <h3 className="font-bold text-base text-navy-900 dark:text-white">
              Update Investigation Status: {statusModal.leak_code}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Investigation Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                >
                  <option value="Under Investigation">Under Investigation</option>
                  <option value="Repaired">Repaired & Verified</option>
                  <option value="False Positive">False Positive / Meter Error</option>
                  <option value="Active">Active</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Technician Notes & Field Observations
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record acoustic survey results, joint repair details, or meter calibration..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setStatusModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow"
              >
                {submitting ? 'Saving...' : 'Save Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
