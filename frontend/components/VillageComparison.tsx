'use client';

import React from 'react';
import { 
  MapPin, 
  Users, 
  Droplet, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface Village {
  id: number;
  name: string;
  code: string;
  total_households: number;
  tank_capacity_liters: number;
  tank_level_percent: number;
  daily_target_kl: number;
  current_delivered_kl: number;
  authorized_consumption_kl: number;
  supply_status: 'Normal' | 'Warning' | 'Critical';
  next_supply_slot: string;
  water_quality_summary: string;
  affected_households: number;
  current_storage_liters: number;
  estimated_reserve_hours: number;
  per_household_daily_liters: number;
}

interface VillageComparisonProps {
  villages: Village[];
  onSelectVillage?: (name: string) => void;
}

export default function VillageComparison({ villages, onSelectVillage }: VillageComparisonProps) {
  const totalDelivered = villages.reduce((acc, v) => acc + v.current_delivered_kl, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-navy-900 dark:text-white flex items-center space-x-2">
            <span>Three-Village Distribution & Performance Comparison</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              Shared Main Pump Network
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Evaluating supply equity, tank storage buffers, and operational health across Village A, Village B, and Village C.
          </p>
        </div>
      </div>

      {/* 3 Village Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {villages.map((v) => {
          const sharePercent = totalDelivered > 0 
            ? ((v.current_delivered_kl / totalDelivered) * 100).toFixed(1) 
            : '33.3';

          return (
            <div
              key={v.id}
              className={`bg-white dark:bg-navy-900 rounded-2xl p-5 border shadow-sm transition hover:shadow-md flex flex-col justify-between ${
                v.supply_status === 'Critical'
                  ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/10'
                  : v.supply_status === 'Warning'
                  ? 'border-amber-300 dark:border-amber-900/80'
                  : 'border-slate-200 dark:border-navy-800'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-navy-900 dark:text-white">
                        {v.name}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400">{v.code}</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    v.supply_status === 'Normal' 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                      : v.supply_status === 'Warning'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                  }`}>
                    {v.supply_status}
                  </span>
                </div>

                {/* Tank Level Bar */}
                <div className="my-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 dark:text-slate-400">Storage Tank Buffer</span>
                    <span className="font-bold text-navy-900 dark:text-white">
                      {Math.round(v.tank_level_percent)}% ({Math.round(v.current_storage_liters).toLocaleString()} L)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-navy-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 ${
                        v.tank_level_percent < 25 
                          ? 'bg-rose-500' 
                          : v.tank_level_percent < 50 
                          ? 'bg-amber-500' 
                          : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, v.tank_level_percent))}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>Capacity: {(v.tank_capacity_liters / 1000).toLocaleString()} kL</span>
                    <span>~{v.estimated_reserve_hours}h reserve</span>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="space-y-2 text-xs border-t border-slate-100 dark:border-navy-800 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500 flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>Connections:</span>
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{v.total_households} homes</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500 flex items-center space-x-1">
                      <Droplet className="w-3.5 h-3.5 text-teal-500" />
                      <span>Delivered Today:</span>
                    </span>
                    <span className="font-bold text-navy-900 dark:text-teal-400">
                      {v.current_delivered_kl} kL ({sharePercent}% of total)
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Allocation Per Connection:</span>
                    <span className="font-extrabold text-navy-900 dark:text-white">
                      {v.per_household_daily_liters} L / day
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Authorized Consumption:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{v.authorized_consumption_kl} kL</span>
                  </div>

                  {v.affected_households > 0 && (
                    <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                      <span>Affected by Anomalies:</span>
                      <span>{v.affected_households} homes</span>
                    </div>
                  )}
                </div>

                {/* Next Supply Slot */}
                <div className="mt-4 p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-navy-800">
                  <div className="font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Supply Window:</div>
                  <div>{v.next_supply_slot}</div>
                </div>
              </div>

              {/* Water Quality Footnote */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-navy-800 text-[10px] text-slate-400 dark:text-slate-500 truncate">
                Quality: {v.water_quality_summary}
              </div>
            </div>
          );
        })}
      </div>

      {/* Equity Explanatory Note */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-800 text-xs text-slate-500 dark:text-slate-400">
        <strong className="text-navy-900 dark:text-white">Equity & Distribution Note:</strong> Variations in per-household delivery across villages occur due to scheduled filling intervals, varying branch elevations, pipe diameter friction, and active pipeline maintenance. Discrepancies are continuously monitored by the central control system to ensure equitable supply across the shared network.
      </div>
    </div>
  );
}
