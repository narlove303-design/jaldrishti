'use client';

import React from 'react';
import { Droplet, ArrowDown, ArrowUp, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

interface TankProps {
  villageName: string;
  capacityLiters: number;
  currentLevelPercent: number;
  inletFlowM3h?: number;
  outletFlowM3h?: number;
  lastCleaned?: string;
  cleaningDue?: string;
}

export default function TankVisualizer({
  villageName,
  capacityLiters,
  currentLevelPercent,
  inletFlowM3h = 34.1,
  outletFlowM3h = 28.5,
  lastCleaned = '2026-08-14',
  cleaningDue = '2027-02-14',
}: TankProps) {
  const currentVolume = Math.round((capacityLiters * currentLevelPercent) / 100);
  const netFlow = Number((inletFlowM3h - outletFlowM3h).toFixed(1));
  const reserveHours = outletFlowM3h > 0 
    ? Number((currentVolume / (outletFlowM3h * 1000)).toFixed(1)) 
    : 24;

  const isLow = currentLevelPercent < 25;
  const isHigh = currentLevelPercent > 90;

  return (
    <div className="bg-white dark:bg-navy-900 rounded-2xl p-5 border border-slate-200 dark:border-navy-800 shadow-sm hover:shadow-md transition">
      {/* Title & Status */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-base text-navy-900 dark:text-white flex items-center space-x-1.5">
            <span>{villageName}</span>
            <span className="text-xs font-normal text-slate-500">Elevated Storage Tank</span>
          </h3>
          <p className="text-xs text-slate-400">Total Capacity: {(capacityLiters / 1000).toLocaleString()} kL</p>
        </div>
        <div>
          {isLow ? (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Low Storage</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Normal Reserve</span>
            </span>
          )}
        </div>
      </div>

      {/* Tank Animation & Graphic */}
      <div className="flex items-center space-x-6 my-2">
        <div className="w-32 h-44 water-tank-container flex-shrink-0 relative">
          {/* Internal level markings */}
          <div className="absolute inset-y-0 right-1 flex flex-col justify-between py-2 text-[8px] font-mono text-slate-400 pointer-events-none z-10">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          {/* Liquid water layer */}
          <div
            className="water-wave-layer"
            style={{ height: `${Math.min(100, Math.max(10, currentLevelPercent))}%` }}
          />

          {/* Percentage overlay text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white font-extrabold z-10 drop-shadow-md">
            <span className="text-2xl tracking-tight">{Math.round(currentLevelPercent)}%</span>
            <span className="text-[10px] uppercase font-semibold text-cyan-100">Reserve</span>
          </div>
        </div>

        {/* Telemetry Stats */}
        <div className="flex-1 space-y-3">
          <div>
            <div className="text-xs text-slate-400 font-medium">Stored Water Volume</div>
            <div className="text-xl font-extrabold text-navy-800 dark:text-teal-400">
              {currentVolume.toLocaleString()} <span className="text-xs font-medium text-slate-500">Litres</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-navy-800">
            <div>
              <div className="text-slate-400 flex items-center space-x-1">
                <ArrowDown className="w-3 h-3 text-teal-500" />
                <span>Inlet Rate</span>
              </div>
              <div className="font-bold text-slate-700 dark:text-slate-200">{inletFlowM3h} m³/h</div>
            </div>
            <div>
              <div className="text-slate-400 flex items-center space-x-1">
                <ArrowUp className="w-3 h-3 text-amber-500" />
                <span>Outlet Rate</span>
              </div>
              <div className="font-bold text-slate-700 dark:text-slate-200">{outletFlowM3h} m³/h</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-navy-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-cyan-600" />
              <span>Autonomy Reserve:</span>
            </div>
            <div className="font-bold text-navy-900 dark:text-white">
              ~{reserveHours} Hours
            </div>
          </div>
        </div>
      </div>

      {/* Hygiene and Cleaning Footer */}
      <div className="mt-3 pt-2 text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-navy-800 flex justify-between">
        <span>Last Disinfected: {lastCleaned}</span>
        <span>Next Due: {cleaningDue}</span>
      </div>
    </div>
  );
}
