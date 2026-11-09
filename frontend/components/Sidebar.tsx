'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { 
  LayoutDashboard, 
  MapPin, 
  Network, 
  Gauge, 
  Container, 
  AlertOctagon, 
  Activity, 
  BellRing, 
  Wrench, 
  Boxes, 
  Users, 
  Megaphone, 
  BarChart3, 
  ScrollText, 
  Home, 
  MessageSquareWarning, 
  LifeBuoy,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  unreadCount?: number;
}

export default function Sidebar({
  currentRoute,
  onNavigate,
  collapsed,
  onToggleCollapse,
  unreadCount = 0,
}: SidebarProps) {
  const { user, isAdmin, isStaff, isResident } = useAuth();
  const { t } = useLanguage();

  interface NavItem {
    id: string;
    label: string;
    icon: any;
    badge?: string;
    count?: number;
  }

  // Route definitions according to RBAC
  const adminRoutes: NavItem[] = [
    { id: 'overview', label: t('nav_overview'), icon: LayoutDashboard },
    { id: 'villages', label: t('nav_villages'), icon: MapPin },
    { id: 'network', label: t('nav_network'), icon: Network },
    { id: 'pump', label: t('nav_pump'), icon: Gauge },
    { id: 'tanks', label: t('nav_tanks'), icon: Container },
    { id: 'leaks', label: t('nav_leaks'), icon: AlertOctagon, badge: '1 Active' },
    { id: 'sensors', label: t('nav_sensors'), icon: Activity },
    { id: 'alarms', label: t('nav_alarms'), icon: BellRing },
    { id: 'maintenance', label: t('nav_maintenance'), icon: Wrench },
    { id: 'assets', label: t('nav_assets'), icon: Boxes },
    { id: 'users', label: t('nav_users'), icon: Users },
    { id: 'notices', label: t('nav_notices'), icon: Megaphone, count: unreadCount },
    { id: 'analytics', label: t('nav_analytics'), icon: BarChart3 },
    { id: 'audit', label: t('nav_audit'), icon: ScrollText },
    { id: 'complaints', label: t('nav_complaints'), icon: MessageSquareWarning },
    { id: 'advice', label: t('nav_advice'), icon: LifeBuoy },
  ];

  const staffRoutes: NavItem[] = [
    { id: 'overview', label: t('nav_overview'), icon: LayoutDashboard },
    { id: 'villages', label: t('nav_villages'), icon: MapPin },
    { id: 'network', label: t('nav_network'), icon: Network },
    { id: 'pump', label: t('nav_pump'), icon: Gauge },
    { id: 'tanks', label: t('nav_tanks'), icon: Container },
    { id: 'leaks', label: t('nav_leaks'), icon: AlertOctagon, badge: '1 Active' },
    { id: 'sensors', label: t('nav_sensors'), icon: Activity },
    { id: 'alarms', label: t('nav_alarms'), icon: BellRing },
    { id: 'maintenance', label: t('nav_maintenance'), icon: Wrench },
    { id: 'notices', label: t('nav_notices'), icon: Megaphone, count: unreadCount },
    { id: 'complaints', label: t('nav_complaints'), icon: MessageSquareWarning },
    { id: 'advice', label: t('nav_advice'), icon: LifeBuoy },
  ];

  const residentRoutes: NavItem[] = [
    { id: 'home', label: t('nav_home'), icon: Home },
    { id: 'notices', label: t('nav_notices'), icon: Megaphone, count: unreadCount },
    { id: 'complaints', label: t('nav_complaints'), icon: MessageSquareWarning },
    { id: 'advice', label: t('nav_advice'), icon: LifeBuoy },
  ];

  const routes = isAdmin ? adminRoutes : isStaff ? staffRoutes : residentRoutes;

  return (
    <aside
      className={`hidden md:flex flex-col bg-white dark:bg-navy-900 border-r border-slate-200 dark:border-navy-800 transition-all duration-300 relative select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Current User Role Header */}
      <div className="p-4 border-b border-slate-100 dark:border-navy-800 flex items-center justify-between">
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-bold text-sm text-navy-800 dark:text-slate-100 truncate">
              {user?.name || 'Guest User'}
            </div>
            <div className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
              {user?.role} {user?.village !== 'All' ? `(${user?.village})` : ''}
            </div>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-800 transition mx-auto"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {routes.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all px-3 py-2.5 ${
                isActive
                  ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 shadow-sm border border-teal-200/50 dark:border-teal-800/50'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800/60 hover:text-slate-900 dark:hover:text-white'
              } ${collapsed ? 'justify-center' : 'justify-between'}`}
              title={collapsed ? item.label : undefined}
            >
              <div className="flex items-center space-x-3 truncate">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!collapsed && (
                <div className="flex items-center space-x-1">
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && item.count > 0 && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {item.count}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Environmental Mode Tag */}
      {!collapsed && (
        <div className="p-3 m-3 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200/80 dark:border-navy-700 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="font-semibold text-teal-600 dark:text-teal-400 mb-0.5">● Simulated SCADA</div>
          <div>No hardware commands sent. Data persists in browser database.</div>
        </div>
      )}
    </aside>
  );
}
