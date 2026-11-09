'use client';

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Droplet, 
  Activity, 
  Layers, 
  MapPin, 
  Info,
  Maximize2
} from 'lucide-react';

interface PipeData {
  id: string;
  name: string;
  village: string;
  diameter_mm: number;
  length_m: number;
  material: string;
  current_pressure_bar: number;
  current_flow_m3h: number;
  status: 'Normal' | 'Warning' | 'Critical';
}

interface NetworkSchematicProps {
  onSelectLeak?: () => void;
}

export default function NetworkSchematic({ onSelectLeak }: NetworkSchematicProps) {
  const [selectedBranch, setSelectedBranch] = useState<'A' | 'B' | 'C' | 'MAIN'>('C');

  const branches: Record<string, PipeData> = {
    MAIN: {
      id: 'MAIN-01',
      name: 'Primary Junction Feeder Main',
      village: 'Central Works to Junction',
      diameter_mm: 200,
      length_m: 450,
      material: 'Ductile Iron K9',
      current_pressure_bar: 3.62,
      current_flow_m3h: 84.0,
      status: 'Normal'
    },
    A: {
      id: 'PIPE-A01',
      name: 'Village A Transmission Trunk',
      village: 'Village A (Shanti Nagar)',
      diameter_mm: 160,
      length_m: 780,
      material: 'HDPE PE100 PN10',
      current_pressure_bar: 3.34,
      current_flow_m3h: 34.1,
      status: 'Normal'
    },
    B: {
      id: 'PIPE-B01',
      name: 'Village B Transmission Trunk',
      village: 'Village B (Kalyanpur)',
      diameter_mm: 110,
      length_m: 610,
      material: 'uPVC Class 4',
      current_pressure_bar: 2.58,
      current_flow_m3h: 26.9,
      status: 'Warning'
    },
    C: {
      id: 'PIPE-C01',
      name: 'Village C Transmission Trunk (Leak Zone)',
      village: 'Village C (Sundarpur)',
      diameter_mm: 110,
      length_m: 850,
      material: 'HDPE PE100 PN10',
      current_pressure_bar: 1.88,
      current_flow_m3h: 21.7,
      status: 'Critical'
    }
  };

  const currentPipe = branches[selectedBranch];

  return (
    <div className="bg-white dark:bg-navy-900 rounded-2xl p-6 border border-slate-200 dark:border-navy-800 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-navy-800 gap-2">
        <div>
          <h2 className="text-lg font-bold text-navy-900 dark:text-white flex items-center space-x-2">
            <span>Interactive Three-Village Pipeline Schematic</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              Live Topology
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click any pipeline branch to inspect instantaneous hydraulic parameters and sensor telemetry.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 dark:text-slate-400">Normal</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-slate-600 dark:text-slate-400">Warning</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-slate-600 dark:text-slate-400">Critical Leak</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive SVG Schematic Canvas */}
        <div className="lg:col-span-2 relative bg-slate-50 dark:bg-navy-950 rounded-xl p-4 border border-slate-200/80 dark:border-navy-800 overflow-hidden">
          <svg
            viewBox="0 0 760 400"
            className="w-full h-auto select-none"
            role="img"
            aria-label="Water Distribution Network Schematic"
          >
            {/* Grid Pattern */}
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-navy-900" />
              </pattern>
            </defs>
            <rect width="760" height="400" fill="url(#grid)" />

            {/* Central Pump Station to Junction (Main Line) */}
            <path
              d="M 120 200 L 290 200"
              stroke={selectedBranch === 'MAIN' ? '#0891b2' : '#0e7490'}
              strokeWidth={selectedBranch === 'MAIN' ? 14 : 10}
              className="cursor-pointer transition-all hover:opacity-80"
              onClick={() => setSelectedBranch('MAIN')}
            />

            {/* Branch A to Village A (Top) */}
            <path
              d="M 290 200 L 290 90 L 570 90"
              fill="none"
              stroke={selectedBranch === 'A' ? '#10b981' : '#059669'}
              strokeWidth={selectedBranch === 'A' ? 12 : 8}
              strokeLinecap="round"
              className="cursor-pointer transition-all hover:opacity-80"
              onClick={() => setSelectedBranch('A')}
            />

            {/* Branch B to Village B (Middle) */}
            <path
              d="M 290 200 L 570 200"
              fill="none"
              stroke={selectedBranch === 'B' ? '#f59e0b' : '#d97706'}
              strokeWidth={selectedBranch === 'B' ? 12 : 8}
              strokeLinecap="round"
              className="cursor-pointer transition-all hover:opacity-80"
              onClick={() => setSelectedBranch('B')}
            />

            {/* Branch C to Village C (Bottom - Leak Zone) */}
            <path
              d="M 290 200 L 290 310 L 570 310"
              fill="none"
              stroke={selectedBranch === 'C' ? '#ef4444' : '#dc2626'}
              strokeWidth={selectedBranch === 'C' ? 12 : 8}
              strokeLinecap="round"
              className="cursor-pointer transition-all hover:opacity-80"
              onClick={() => setSelectedBranch('C')}
            />

            {/* Suspected Leak Burst Marker on Branch C (Chainage 520m) */}
            <g 
              transform="translate(420, 310)" 
              className="cursor-pointer animate-bounce"
              onClick={() => { setSelectedBranch('C'); onSelectLeak?.(); }}
            >
              <circle r="16" fill="#f43f5e" fillOpacity="0.3" className="animate-ping" />
              <circle r="10" fill="#e11d48" stroke="#ffffff" strokeWidth="2" />
              <text y="4" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">!</text>
            </g>

            {/* In-line Sensors on Branches */}
            <g fill="#0284c7" stroke="#ffffff" strokeWidth="2">
              <circle cx="410" cy="90" r="6" />
              <circle cx="410" cy="200" r="6" />
              <circle cx="360" cy="310" r="6" />
            </g>

            {/* Node 1: Central Water Station & Pump */}
            <g transform="translate(40, 160)" className="cursor-pointer" onClick={() => setSelectedBranch('MAIN')}>
              <rect width="90" height="80" rx="14" fill="#0f2942" stroke="#38bdf8" strokeWidth="2.5" />
              <text x="45" y="36" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">CENTRAL</text>
              <text x="45" y="52" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="extrabold">PUMP P-01</text>
              <text x="45" y="68" textAnchor="middle" fill="#94a3b8" fontSize="9">84 m³/h</text>
            </g>

            {/* Node 2: 3-Way Distribution Junction */}
            <g transform="translate(290, 200)">
              <circle r="20" fill="#0891b2" stroke="#ffffff" strokeWidth="3" />
              <circle r="6" fill="#ffffff" />
              <text x="0" y="34" textAnchor="middle" fill="#475569" className="dark:fill-slate-300" fontSize="10" fontWeight="bold">
                Junction J-01
              </text>
            </g>

            {/* Node 3: Village A Reservoir & Network */}
            <g transform="translate(570, 55)" className="cursor-pointer" onClick={() => setSelectedBranch('A')}>
              <rect width="140" height="70" rx="12" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" className="dark:fill-navy-900" />
              <text x="70" y="26" textAnchor="middle" fill="#0f2942" className="dark:fill-white" fontSize="12" fontWeight="bold">VILLAGE A</text>
              <text x="70" y="44" textAnchor="middle" fill="#059669" fontSize="10" fontWeight="semibold">Tank Level: 74%</text>
              <text x="70" y="58" textAnchor="middle" fill="#64748b" fontSize="9">520 Connections · 3.3 bar</text>
            </g>

            {/* Node 4: Village B Reservoir & Network */}
            <g transform="translate(570, 165)" className="cursor-pointer" onClick={() => setSelectedBranch('B')}>
              <rect width="140" height="70" rx="12" fill="#ffffff" stroke="#f59e0b" strokeWidth="2.5" className="dark:fill-navy-900" />
              <text x="70" y="26" textAnchor="middle" fill="#0f2942" className="dark:fill-white" fontSize="12" fontWeight="bold">VILLAGE B</text>
              <text x="70" y="44" textAnchor="middle" fill="#d97706" fontSize="10" fontWeight="semibold">Tank Level: 48%</text>
              <text x="70" y="58" textAnchor="middle" fill="#64748b" fontSize="9">410 Connections · 2.6 bar</text>
            </g>

            {/* Node 5: Village C Reservoir & Network */}
            <g transform="translate(570, 275)" className="cursor-pointer" onClick={() => setSelectedBranch('C')}>
              <rect width="140" height="70" rx="12" fill="#ffffff" stroke="#ef4444" strokeWidth="2.5" className="dark:fill-navy-900" />
              <text x="70" y="26" textAnchor="middle" fill="#0f2942" className="dark:fill-white" fontSize="12" fontWeight="bold">VILLAGE C</text>
              <text x="70" y="44" textAnchor="middle" fill="#dc2626" fontSize="10" fontWeight="bold">Critical: Leak Zone</text>
              <text x="70" y="58" textAnchor="middle" fill="#64748b" fontSize="9">365 Connections · 1.9 bar</text>
            </g>
          </svg>

          {/* Quick Annotation Footer */}
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between items-center px-1">
            <span>Flow lines simulate physical direction from Central Pump to elevated village tanks.</span>
            <span className="font-semibold text-rose-500">Blinking pin indicates suspected School Road anomaly</span>
          </div>
        </div>

        {/* Selected Pipeline Telemetry Card */}
        <div className="bg-slate-50 dark:bg-navy-950/80 rounded-xl p-5 border border-slate-200/80 dark:border-navy-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                {currentPipe.id}
              </span>
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                currentPipe.status === 'Normal' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                currentPipe.status === 'Warning' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {currentPipe.status} Status
              </span>
            </div>

            <h3 className="font-extrabold text-base text-navy-900 dark:text-white mb-1">
              {currentPipe.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">{currentPipe.village}</p>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-navy-800">
                <span className="text-slate-500">Nominal Diameter</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPipe.diameter_mm} mm</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-navy-800">
                <span className="text-slate-500">Pipeline Length</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPipe.length_m} meters</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-navy-800">
                <span className="text-slate-500">Material Spec</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPipe.material}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-navy-800">
                <span className="text-slate-500">Delivery Pressure</span>
                <span className={`font-bold ${currentPipe.current_pressure_bar < 2.0 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}`}>
                  {currentPipe.current_pressure_bar} bar
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Instantaneous Flow</span>
                <span className="font-bold text-teal-600 dark:text-teal-400">
                  {currentPipe.current_flow_m3h} m³/h
                </span>
              </div>
            </div>

            {selectedBranch === 'C' && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300">
                <div className="font-bold flex items-center space-x-1 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Rule-Based Leakage Flag</span>
                </div>
                <div>Pressure dropped to 1.88 bar with high transmission difference. School Road inspection order is active.</div>
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-slate-200/60 dark:border-navy-800 flex gap-2">
            <button
              onClick={() => setSelectedBranch(selectedBranch === 'C' ? 'A' : selectedBranch === 'A' ? 'B' : 'C')}
              className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-sm transition"
            >
              Switch Branch Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
