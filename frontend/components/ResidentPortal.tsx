'use client';

import React from 'react';
import { 
  Droplet, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  LifeBuoy, 
  Search, 
  PlusCircle, 
  Megaphone,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import TankVisualizer from './TankVisualizer';
import { Notice } from './NoticeBoard';

interface VillageData {
  name: string;
  total_households: number;
  tank_capacity_liters: number;
  tank_level_percent: number;
  supply_status: 'Normal' | 'Warning' | 'Critical';
  next_supply_slot: string;
  water_quality_summary: string;
}

interface ResidentPortalProps {
  villageData: VillageData | null;
  notices: Notice[];
  onNavigate: (route: string) => void;
  onOpenReportModal: () => void;
}

export default function ResidentPortal({
  villageData,
  notices,
  onNavigate,
  onOpenReportModal,
}: ResidentPortalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const villageName = user?.village || 'Village A';
  const v = villageData || {
    name: villageName,
    total_households: 520,
    tank_capacity_liters: 180000,
    tank_level_percent: 74,
    supply_status: 'Normal',
    next_supply_slot: 'Tomorrow 06:00 AM - 09:00 AM',
    water_quality_summary: 'Chlorine 0.42 mg/L, pH 7.3 (Optimal)',
  };

  const isNormal = v.supply_status === 'Normal';
  const isWarning = v.supply_status === 'Warning';
  const isCritical = v.supply_status === 'Critical';

  const unreadNotices = notices.filter(n => !n.is_read);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-navy-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5 text-teal-400" />
            <span>{v.name} Municipal Water Service</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('resident_welcome')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Live pipeline delivery schedules, storage tank status, and emergency water supply bulletins for your registered village.
          </p>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-teal-500/10 pointer-events-none blur-2xl" />
      </div>

      {/* Primary Supply Status Card */}
      <div className={`rounded-2xl p-6 border shadow-sm transition ${
        isCritical
          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
          : isWarning
          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
          : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-2xl ${
              isCritical
                ? 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300'
                : isWarning
                ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
            }`}>
              {isCritical ? <AlertTriangle className="w-7 h-7 animate-bounce" /> :
               isWarning ? <AlertTriangle className="w-7 h-7" /> :
               <ShieldCheck className="w-7 h-7" />}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('water_status')}
              </div>
              <h2 className="text-xl font-extrabold text-navy-900 dark:text-white mt-0.5">
                {isCritical ? t('status_critical') : isWarning ? t('status_warning') : t('status_normal')}
              </h2>
            </div>
          </div>

          <div className="bg-white dark:bg-navy-900 px-4 py-3 rounded-xl border border-slate-200 dark:border-navy-800 text-xs shadow-sm">
            <div className="text-slate-400 flex items-center space-x-1 mb-0.5">
              <Clock className="w-3.5 h-3.5 text-teal-500" />
              <span>{t('next_supply_time')}</span>
            </div>
            <div className="font-extrabold text-navy-900 dark:text-teal-300 text-sm">
              {v.next_supply_slot}
            </div>
          </div>
        </div>
      </div>

      {/* Village Tank Reserve Visualizer */}
      <div>
        <h3 className="font-bold text-sm text-navy-900 dark:text-white mb-3">
          {t('tank_storage')}
        </h3>
        <TankVisualizer
          villageName={v.name}
          capacityLiters={v.tank_capacity_liters}
          currentLevelPercent={v.tank_level_percent}
        />
      </div>

      {/* Quick Resident Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onOpenReportModal}
          className="bg-white dark:bg-navy-900 p-5 rounded-2xl border border-slate-200 dark:border-navy-800 shadow-sm hover:shadow-md hover:border-teal-500 transition text-left flex items-center space-x-4 group"
        >
          <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="font-extrabold text-sm text-navy-900 dark:text-white">
              {t('report_issue')}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit a report for pipeline leaks, weak tap pressure, or contaminated supply.
            </p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('complaints')}
          className="bg-white dark:bg-navy-900 p-5 rounded-2xl border border-slate-200 dark:border-navy-800 shadow-sm hover:shadow-md hover:border-teal-500 transition text-left flex items-center space-x-4 group"
        >
          <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <div className="font-extrabold text-sm text-navy-900 dark:text-white">
              {t('track_complaint')}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Look up your reference ticket (e.g., CMP-1042) to see technician assignment.
            </p>
          </div>
        </button>
      </div>

      {/* Prominent Village Notice Board Preview */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl p-6 border border-slate-200 dark:border-navy-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-navy-800">
          <div className="flex items-center space-x-2">
            <Megaphone className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-base text-navy-900 dark:text-white">
              {t('latest_notices')}
            </h3>
            {unreadNotices.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white animate-pulse">
                {unreadNotices.length} Unread
              </span>
            )}
          </div>
          <button
            onClick={() => onNavigate('notices')}
            className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1"
          >
            <span>View All Notices</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {notices.slice(0, 3).map((notice) => (
            <div
              key={notice.id}
              className={`p-4 rounded-xl border text-xs space-y-1.5 transition ${
                notice.priority === 'Critical'
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                  : notice.priority === 'Important'
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
                  : 'bg-slate-50 dark:bg-navy-950 border-slate-200 dark:border-navy-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-navy-900 dark:text-white text-sm">
                  {notice.title}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 dark:bg-navy-800 text-slate-700 dark:text-slate-300">
                  {notice.priority}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 line-clamp-2">
                {notice.description}
              </p>
              <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                <span>Restoration: <strong>{notice.expected_restoration}</strong></span>
                <span>{notice.published_at}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
