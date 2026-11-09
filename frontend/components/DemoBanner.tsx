'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Info, ShieldCheck, Wrench, Home } from 'lucide-react';

export default function DemoBanner() {
  const { user, switchPersona } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="bg-gradient-to-r from-teal-900 via-navy-800 to-navy-900 text-white px-4 py-2 border-b border-teal-500/30 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          <span className="text-teal-200 font-semibold tracking-wide uppercase text-[10px] bg-teal-950/80 px-2 py-0.5 rounded border border-teal-700/50">
            DEMO ENVIRONMENT
          </span>
          <span className="text-slate-300 hidden sm:inline">
            {t('demo_mode_banner')}
          </span>
        </div>

        {/* 1-Click Persona Bar */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <span className="text-[11px] text-slate-400 font-medium hidden lg:inline">Evaluate as:</span>
          
          <button
            onClick={() => switchPersona('Administrator')}
            className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center space-x-1 transition ${
              user?.role === 'Administrator'
                ? 'bg-amber-500 text-navy-950 shadow'
                : 'bg-navy-700/80 hover:bg-navy-600 text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Admin</span>
          </button>

          <button
            onClick={() => switchPersona('Operating Staff')}
            className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center space-x-1 transition ${
              user?.role === 'Operating Staff'
                ? 'bg-cyan-500 text-navy-950 shadow'
                : 'bg-navy-700/80 hover:bg-navy-600 text-slate-200'
            }`}
          >
            <Wrench className="w-3 h-3" />
            <span>Operator</span>
          </button>

          <button
            onClick={() => switchPersona('Resident', 'Village A')}
            className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center space-x-1 transition ${
              user?.role === 'Resident' && user?.village === 'Village A'
                ? 'bg-emerald-500 text-navy-950 shadow'
                : 'bg-navy-700/80 hover:bg-navy-600 text-slate-200'
            }`}
          >
            <Home className="w-3 h-3" />
            <span>Resident A</span>
          </button>

          <button
            onClick={() => switchPersona('Resident', 'Village C')}
            className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center space-x-1 transition ${
              user?.role === 'Resident' && user?.village === 'Village C'
                ? 'bg-rose-500 text-white shadow'
                : 'bg-navy-700/80 hover:bg-navy-600 text-slate-200'
            }`}
          >
            <Home className="w-3 h-3" />
            <span>Resident C (Affected)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
