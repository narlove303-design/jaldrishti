'use client';

import React, { useState } from 'react';
import { 
  BarChart3, 
  Download, 
  Printer, 
  Droplets, 
  Zap, 
  Wrench, 
  ShieldCheck, 
  AlertCircle,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { apiRequest } from '@/lib/api';

interface WaterAnalyticsProps {
  analyticsData: any;
  onPeriodChange: (period: string) => void;
  period: string;
}

export default function WaterAnalytics({ analyticsData, onPeriodChange, period }: WaterAnalyticsProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadCSV = async () => {
    setDownloading(true);
    try {
      const csvText = await apiRequest<string>(`/analytics/export-csv?period=${period}`);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `jaldrishti_water_intelligence_${period}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const data = analyticsData || {
    waterSuppliedTotalKl: 292.5,
    authorizedConsumptionKl: 249.7,
    waterBalanceDifference: { volumeKl: 42.8, percent: 14.6 },
    villageDeliveries: { villageAKl: 112.4, villageBKl: 88.1, villageCKl: 76.0, totalDeliveredKl: 276.5 },
    lossDecomposition: { transmissionDifferenceKl: 16.0, estimatedPhysicalLossesKl: 19.2, apparentAndUnmeteredLossesKl: 23.6 },
    sustainability: { totalEnergyKwh: 99.3, energyIntensityKwhPerKl: 0.34, waterSavedAfterRepairsKl: 4.2, maintenanceExpenditureInr: 18450 },
    historicalTrend: [
      { label: '00:00', supplied: 10.2, authorized: 8.1, difference: 2.1 },
      { label: '04:00', supplied: 18.5, authorized: 14.8, difference: 3.7 },
      { label: '08:00', supplied: 44.2, authorized: 38.6, difference: 5.6 },
      { label: '12:00', supplied: 32.1, authorized: 27.4, difference: 4.7 },
      { label: '16:00', supplied: 28.4, authorized: 24.0, difference: 4.4 },
      { label: '20:00', supplied: 48.6, authorized: 41.5, difference: 7.1 },
      { label: '23:59', supplied: 16.0, authorized: 13.2, difference: 2.8 }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-navy-800 gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy-900 dark:text-white flex items-center space-x-2">
            <span>Water Balance & System Efficiency Analytics</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              IWA Standard Methodology
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Decomposition of water input volumes, authorized billed consumption, apparent meter error, and physical losses.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Timeframe Selector */}
          <div className="flex bg-slate-100 dark:bg-navy-800 p-1 rounded-xl text-xs font-semibold">
            {['daily', 'weekly', 'monthly'].map((p) => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`px-3 py-1.5 rounded-lg capitalize transition ${
                  period === p
                    ? 'bg-white dark:bg-navy-900 text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-navy-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={handleDownloadCSV}
            disabled={downloading}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-800 flex items-center space-x-1.5 transition shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
            <span>{downloading ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-800 flex items-center space-x-1.5 transition shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* Primary Water Balance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-navy-900 rounded-2xl p-5 border border-slate-200 dark:border-navy-800 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">System Input Volume (Pump Discharge)</div>
          <div className="text-2xl font-extrabold text-navy-900 dark:text-white mt-1">
            {data.waterSuppliedTotalKl} <span className="text-xs font-semibold text-slate-500">kL</span>
          </div>
          <div className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold mt-1">
            100% of Water Extracted
          </div>
        </div>

        <div className="bg-white dark:bg-navy-900 rounded-2xl p-5 border border-slate-200 dark:border-navy-800 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Authorized Consumption (Metered & Est.)</div>
          <div className="text-2xl font-extrabold text-navy-900 dark:text-white mt-1">
            {data.authorizedConsumptionKl} <span className="text-xs font-semibold text-slate-500">kL</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {((data.authorizedConsumptionKl / data.waterSuppliedTotalKl) * 100).toFixed(1)}% Reached End Users
          </div>
        </div>

        <div className="bg-white dark:bg-navy-900 rounded-2xl p-5 border border-amber-200 dark:border-amber-900/60 shadow-sm bg-amber-50/20 dark:bg-amber-950/10">
          <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Water Balance Difference (%)</div>
          <div className="text-2xl font-extrabold text-amber-800 dark:text-amber-300 mt-1">
            {data.waterBalanceDifference?.percent}%
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-1">
            {data.waterBalanceDifference?.volumeKl} kL Total Difference Volume
          </div>
        </div>

        <div className="bg-white dark:bg-navy-900 rounded-2xl p-5 border border-slate-200 dark:border-navy-800 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Estimated Physical Losses</div>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {data.lossDecomposition?.estimatedPhysicalLossesKl} <span className="text-xs font-semibold">kL</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Physical Leakage & Joint Weeps
          </div>
        </div>
      </div>

      {/* Interactive Trend Chart */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl p-6 border border-slate-200 dark:border-navy-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h3 className="font-extrabold text-base text-navy-900 dark:text-white flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            <span>Water Extraction vs Billed Consumption Trends ({period})</span>
          </h3>
          <span className="text-xs text-slate-400">Values represented in Kilolitres (kL)</span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.historicalTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSupplied" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0891b2" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#0891b2" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorAuthorized" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }} 
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="supplied" name="System Supplied (kL)" stroke="#0891b2" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSupplied)" />
              <Area type="monotone" dataKey="authorized" name="Authorized Consumption (kL)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAuthorized)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Water Balance Breakdown & IWA Standard Formula Explanation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-navy-900 rounded-2xl p-6 border border-slate-200 dark:border-navy-800 shadow-sm space-y-4">
          <h3 className="font-extrabold text-base text-navy-900 dark:text-white">
            Water Balance Decomposition
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200/80 dark:border-navy-800 flex justify-between items-center">
              <div>
                <strong className="text-navy-900 dark:text-white">System Input (Pump Discharge)</strong>
                <div className="text-[11px] text-slate-400">Total volume pumped into master junction</div>
              </div>
              <span className="font-extrabold text-sm text-teal-600 dark:text-teal-400">{data.waterSuppliedTotalKl} kL</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200/80 dark:border-navy-800 flex justify-between items-center">
              <div>
                <strong className="text-navy-900 dark:text-white">Delivered to Villages (A+B+C)</strong>
                <div className="text-[11px] text-slate-400">Sum of branch flow meters at village boundaries</div>
              </div>
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{data.villageDeliveries?.totalDeliveredKl} kL</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200/80 dark:border-navy-800 flex justify-between items-center">
              <div>
                <strong className="text-navy-900 dark:text-white">Estimated Physical Pipeline Losses</strong>
                <div className="text-[11px] text-slate-400">Underground leaks, joint seepage, burst volume</div>
              </div>
              <span className="font-bold text-sm text-rose-600 dark:text-rose-400">{data.lossDecomposition?.estimatedPhysicalLossesKl} kL</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200/80 dark:border-navy-800 flex justify-between items-center">
              <div>
                <strong className="text-navy-900 dark:text-white">Apparent Losses & Meter Tolerances</strong>
                <div className="text-[11px] text-slate-400">Customer meter under-registration, illegal tap-offs</div>
              </div>
              <span className="font-bold text-sm text-amber-600 dark:text-amber-400">{data.lossDecomposition?.apparentAndUnmeteredLossesKl} kL</span>
            </div>
          </div>
        </div>

        {/* Formula Card & Sustainability Metrics */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl p-6 border border-slate-200 dark:border-navy-800 shadow-sm space-y-4">
          <h3 className="font-extrabold text-base text-navy-900 dark:text-white">
            Water-Balance Formula & Sustainability KPIs
          </h3>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-800 text-xs space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">IWA Formula</span>
            <div className="font-mono text-xs sm:text-sm bg-white dark:bg-navy-900 p-2.5 rounded-lg border border-slate-200 dark:border-navy-700 text-teal-700 dark:text-teal-300">
              Difference (%) = ((Supplied − Authorized) / Supplied) × 100
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>Methodological Note:</strong> It is standard water utility engineering practice not to label the entire water-balance difference as confirmed pipeline leakage. The gap includes apparent losses (meter inaccuracy, data errors, unauthorized draws) alongside physical transmission losses.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200/80 dark:border-navy-800">
              <div className="text-slate-400 text-[11px] flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Pump Energy Intensity</span>
              </div>
              <div className="font-extrabold text-base text-navy-900 dark:text-white mt-1">
                {data.sustainability?.energyIntensityKwhPerKl} <span className="text-xs font-normal">kWh/kL</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Total: {data.sustainability?.totalEnergyKwh} kWh</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200/80 dark:border-navy-800">
              <div className="text-slate-400 text-[11px] flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Water Saved Post-Repairs</span>
              </div>
              <div className="font-extrabold text-base text-emerald-600 dark:text-emerald-400 mt-1">
                {data.sustainability?.waterSavedAfterRepairsKl} <span className="text-xs font-normal">kL/day</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Coupler replacement on Branch A</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200/80 dark:border-navy-800 col-span-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-[11px]">Monthly Maintenance Expenditure</span>
                  <div className="font-extrabold text-base text-navy-900 dark:text-white mt-0.5">
                    ₹{data.sustainability?.maintenanceExpenditureInr?.toLocaleString()}
                  </div>
                </div>
                <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                  On Budget
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
