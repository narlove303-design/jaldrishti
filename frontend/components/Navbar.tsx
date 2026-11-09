'use client';

import React, { useState } from 'react';
import { useAuth, UserRole } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { 
  Droplets, 
  Globe, 
  Moon, 
  Sun, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  LogIn, 
  ShieldCheck, 
  Wrench, 
  Home,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface NavbarProps {
  onOpenAuth: () => void;
  onNavigate: (route: string) => void;
  unreadNoticesCount: number;
}

export default function Navbar({ onOpenAuth, onNavigate, unreadNoticesCount }: NavbarProps) {
  const { user, logout, switchPersona, isAdmin, isStaff, isResident } = useAuth();
  const { lang, toggleLang, t } = useLanguage();
  const [darkMode, setDarkMode] = useState(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  const toggleDarkMode = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-navy-800 text-white shadow-md border-b border-navy-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Architecture Subtitle */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate(isResident ? 'home' : 'overview')}>
            <div className="bg-teal-700 p-2 rounded-xl text-white shadow-inner flex items-center justify-center">
              <Droplets className="w-6 h-6 animate-pulse text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white">
                  Jal<span className="text-teal-400">Drishti</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-900/80 text-teal-300 border border-teal-600/50">
                  {t('simulated_badge')}
                </span>
              </div>
              <p className="text-xs text-slate-300 hidden md:block">
                {t('three_villages_one_pump')}
              </p>
            </div>
          </div>

          {/* Controls: Persona Switcher, Language, Theme, Notifications, User */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Quick Demo Persona Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-navy-700/80 hover:bg-navy-600 border border-navy-600 text-xs text-slate-200 transition"
                title="Switch Demonstration Role"
              >
                {isAdmin ? <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> :
                 isStaff ? <Wrench className="w-3.5 h-3.5 text-cyan-400" /> :
                 <Home className="w-3.5 h-3.5 text-emerald-400" />}
                <span className="font-medium hidden sm:inline">
                  {user ? user.role : 'Select Role'}
                </span>
                <span className="text-[10px] text-teal-400 font-semibold bg-navy-900/60 px-1.5 py-0.5 rounded">
                  {user?.village === 'All' ? '3 Villages' : user?.village}
                </span>
              </button>

              {showPersonaMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-navy-900 rounded-xl shadow-2xl border border-slate-200 dark:border-navy-700 py-2 z-50 text-slate-800 dark:text-slate-100">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-navy-800">
                    Switch Demo Persona
                  </div>
                  <button
                    onClick={() => { switchPersona('Administrator'); setShowPersonaMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-navy-800 flex items-center space-x-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <div>
                      <div className="font-semibold">Administrator</div>
                      <div className="text-[10px] text-slate-500">Chief Engineer · All Villages</div>
                    </div>
                  </button>
                  <button
                    onClick={() => { switchPersona('Operating Staff'); setShowPersonaMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-navy-800 flex items-center space-x-2"
                  >
                    <Wrench className="w-4 h-4 text-cyan-500" />
                    <div>
                      <div className="font-semibold">Operating Staff</div>
                      <div className="text-[10px] text-slate-500">Lead Operator · Monitoring & Maintenance</div>
                    </div>
                  </button>
                  <div className="border-t border-slate-100 dark:border-navy-800 my-1"></div>
                  <button
                    onClick={() => { switchPersona('Resident', 'Village A'); setShowPersonaMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-navy-800 flex items-center space-x-2"
                  >
                    <Home className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="font-semibold">Resident: Village A</div>
                      <div className="text-[10px] text-slate-500">Normal supply zone</div>
                    </div>
                  </button>
                  <button
                    onClick={() => { switchPersona('Resident', 'Village B'); setShowPersonaMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-navy-800 flex items-center space-x-2"
                  >
                    <Home className="w-4 h-4 text-amber-500" />
                    <div>
                      <div className="font-semibold">Resident: Village B</div>
                      <div className="text-[10px] text-slate-500">Low pressure warning zone</div>
                    </div>
                  </button>
                  <button
                    onClick={() => { switchPersona('Resident', 'Village C'); setShowPersonaMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-navy-800 flex items-center space-x-2"
                  >
                    <Home className="w-4 h-4 text-rose-500" />
                    <div>
                      <div className="font-semibold">Resident: Village C</div>
                      <div className="text-[10px] text-slate-500">Active leak & advisory zone</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-navy-700/80 hover:bg-navy-600 border border-navy-600 text-xs font-semibold text-slate-200 transition"
              title="Toggle English / हिन्दी"
            >
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-navy-700/80 hover:bg-navy-600 border border-navy-600 text-slate-200 transition"
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-300" />}
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => onNavigate('notices')}
              className="relative p-2 rounded-lg bg-navy-700/80 hover:bg-navy-600 border border-navy-600 text-slate-200 transition"
              title="Village Notice Board"
              aria-label="Village Notices"
            >
              <Bell className="w-4 h-4" />
              {unreadNoticesCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-bounce">
                  {unreadNoticesCount}
                </span>
              )}
            </button>

            {/* User Profile / Logout */}
            {user ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={logout}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700/50 text-xs text-rose-300 transition"
                  title="Sign out of current account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t('log_out')}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white shadow-sm transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('log_in')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
