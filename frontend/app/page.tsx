'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { apiRequest } from '@/lib/api';

// Components
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import DemoBanner from '@/components/DemoBanner';
import AuthModal from '@/components/AuthModal';

import TankVisualizer from '@/components/TankVisualizer';
import NetworkSchematic from '@/components/NetworkSchematic';
import VillageComparison from '@/components/VillageComparison';
import PumpMonitor from '@/components/PumpMonitor';
import LeakageIntelligence from '@/components/LeakageIntelligence';
import SensorDashboard from '@/components/SensorDashboard';
import NoticeBoard, { Notice } from '@/components/NoticeBoard';
import ResidentPortal from '@/components/ResidentPortal';
import ComplaintManager, { Complaint } from '@/components/ComplaintManager';
import MaintenanceTracker, { WorkOrder } from '@/components/MaintenanceTracker';
import WaterAnalytics from '@/components/WaterAnalytics';
import AssetRegistry, { Asset } from '@/components/AssetRegistry';
import UserManagement from '@/components/UserManagement';
import AuditLogViewer, { AuditLog } from '@/components/AuditLogViewer';
import TechnicalGlossary from '@/components/TechnicalGlossary';

import { 
  ShieldAlert, 
  Droplet, 
  Gauge, 
  Activity, 
  AlertTriangle, 
  ArrowRight,
  TrendingUp,
  Layers,
  Wrench,
  Radio,
  FileText
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isAdmin, isStaff, isResident, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [currentRoute, setCurrentRoute] = useState<string>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Application Data States
  const [villages, setVillages] = useState<any[]>([]);
  const [pumpData, setPumpData] = useState<any>(null);
  const [leaksData, setLeaksData] = useState<any>(null);
  const [sensors, setSensors] = useState<any[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('daily');
  const [unreadNoticesCount, setUnreadNoticesCount] = useState(0);

  // Quick action states
  const [initialWorkOrder, setInitialWorkOrder] = useState<{ village: string; task: string } | null>(null);

  // Handle route switching based on role
  useEffect(() => {
    if (!authLoading && user) {
      if (isResident) {
        if (!['home', 'notices', 'complaints', 'advice'].includes(currentRoute)) {
          setCurrentRoute('home');
        }
      } else {
        if (currentRoute === 'home') {
          setCurrentRoute('overview');
        }
      }
    }
  }, [user, isResident, authLoading]);

  // Fetch all core data
  const fetchData = async () => {
    try {
      // 1. Notices (accessible to all authenticated)
      const noticesRes = await apiRequest<{ notices: Notice[]; unreadCount: number }>('/notices');
      setNotices(noticesRes.notices || []);
      setUnreadNoticesCount(noticesRes.unreadCount || 0);

      // 2. Villages
      const villagesRes = await apiRequest<{ villages: any[] }>('/villages');
      setVillages(villagesRes.villages || []);

      // 3. Complaints
      const complaintsRes = await apiRequest<{ complaints: Complaint[] }>('/complaints');
      setComplaints(complaintsRes.complaints || []);

      // 4. Operational & Admin Endpoints (Only if Staff or Admin)
      if (isStaff) {
        const pumpRes = await apiRequest<{ pump: any }>('/pump');
        setPumpData(pumpRes.pump);

        const leaksRes = await apiRequest<any>('/leaks');
        setLeaksData(leaksRes);

        const sensorsRes = await apiRequest<{ sensors: any[] }>('/sensors');
        setSensors(sensorsRes.sensors || []);

        const ordersRes = await apiRequest<{ orders: WorkOrder[] }>('/maintenance');
        setOrders(ordersRes.orders || []);

        const assetsRes = await apiRequest<{ assets: Asset[] }>('/assets');
        setAssets(assetsRes.assets || []);

        const analyticsRes = await apiRequest<any>(`/analytics/water-balance?period=${analyticsPeriod}`);
        setAnalyticsData(analyticsRes);
      }

      // 5. Admin-only endpoints
      if (isAdmin) {
        const usersRes = await apiRequest<{ users: any[] }>('/users');
        setUsersList(usersRes.users || []);

        const auditRes = await apiRequest<{ logs: AuditLog[] }>('/audit');
        setAuditLogs(auditRes.logs || []);
      }
    } catch (err) {
      console.warn('Data fetch error (handled gracefully):', err);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, user, analyticsPeriod]);

  // Real-Time Telemetry Stream via WebSockets
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let socket: WebSocket | null = null;
    let fallbackInterval: any = null;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Connect to port 4000 where our backend server is listening
        const wsUrl = `${protocol}//${window.location.hostname}:4000/ws/telemetry`;
        socket = new WebSocket(wsUrl);

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'TELEMETRY_UPDATE') {
              // Update live pump state
              setPumpData((prev: any) => prev ? {
                ...prev,
                flow_rate_m3h: data.pump.flowRate,
                discharge_pressure_bar: data.pump.pressure,
                current_a: data.pump.current,
                power_kw: data.pump.power,
                motor_temp_c: data.pump.motorTemp,
                total_water_kl: data.pump.totalWater,
                total_energy_kwh: data.pump.totalEnergy,
                run_hours: data.pump.runHours,
                status: data.pump.status
              } : null);

              // Update village tank levels dynamically
              setVillages((prevVillages) =>
                prevVillages.map((v) => ({
                  ...v,
                  tank_level_percent: data.tanks[v.name] !== undefined ? data.tanks[v.name] : v.tank_level_percent
                }))
              );
            }
          } catch (e) {
            console.error('Error processing telemetry socket message:', e);
          }
        };

        socket.onerror = () => {
          // If WS connection fails, fall back to smooth polling
          if (!fallbackInterval) {
            fallbackInterval = setInterval(fetchData, 4000);
          }
        };

        socket.onclose = () => {
          if (!fallbackInterval) {
            fallbackInterval = setInterval(fetchData, 4000);
          }
        };
      } catch (err) {
        fallbackInterval = setInterval(fetchData, 4000);
      }
    };

    connectWebSocket();

    return () => {
      if (socket) socket.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, []);

  const handleCreateWorkOrderFromLeak = (targetVillage: string, task: string) => {
    setInitialWorkOrder({ village: targetVillage, task });
    setCurrentRoute('maintenance');
  };

  // Route security boundary verification
  const isRouteAllowed = (route: string) => {
    if (isAdmin) return true;
    if (isStaff) {
      return !['users', 'audit'].includes(route);
    }
    // Resident role
    return ['home', 'notices', 'complaints', 'advice'].includes(route);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#edf5f7] dark:bg-[#0a1724]">
      {/* Top Banner: Synthetic Telemetry Active */}
      <DemoBanner />

      {/* Main Brand Navbar */}
      <Navbar
        onOpenAuth={() => setShowAuthModal(true)}
        onNavigate={(r) => {
          if (isRouteAllowed(r)) setCurrentRoute(r);
        }}
        unreadNoticesCount={unreadNoticesCount}
      />

      {/* App Body Layout: Sidebar + Main Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-16 md:pb-6">
        <Sidebar
          currentRoute={currentRoute}
          onNavigate={(r) => {
            if (isRouteAllowed(r)) setCurrentRoute(r);
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          unreadCount={unreadNoticesCount}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {/* Security Access Denied Guard if route is blocked */}
          {!isRouteAllowed(currentRoute) ? (
            <div className="bg-white dark:bg-navy-900 rounded-3xl p-8 border border-rose-200 dark:border-rose-900 text-center max-w-md mx-auto space-y-4 shadow-md">
              <div className="inline-flex p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-navy-900 dark:text-white">
                Access Denied: Role Boundary
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Your account is authenticated with role <strong>{user?.role}</strong>. Residents are restricted to the public water portal, notice board, and complaint tracker, and cannot access operational or administrative modules.
              </p>
              <button
                onClick={() => setCurrentRoute('home')}
                className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs shadow hover:bg-teal-500 transition"
              >
                Return to My Water Supply
              </button>
            </div>
          ) : (
            <>
              {/* ROUTE: Overview */}
              {currentRoute === 'overview' && isStaff && (
                <div className="space-y-6">
                  {/* Central Overview Title */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-navy-800 gap-2">
                    <div>
                      <h1 className="text-xl font-extrabold text-navy-900 dark:text-white flex items-center space-x-2">
                        <span>Central Water Intelligence Command</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                          Live Supervisory Telemetry
                        </span>
                      </h1>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        1 Central Main Pump Station supplying 3 independent village pipeline networks.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-500 flex items-center space-x-1 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Stream Online (3s cycle)</span>
                      </span>
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    <div className="bg-white dark:bg-navy-900 p-3 rounded-2xl border border-slate-200 dark:border-navy-800 shadow-sm">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Pump Discharge</div>
                      <div className="text-lg font-extrabold text-navy-900 dark:text-teal-400 mt-0.5">
                        {pumpData?.flow_rate_m3h || 84.0} <span className="text-[10px] text-slate-500">m³/h</span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Master Meter FM-01</div>
                    </div>

                    <div className="bg-white dark:bg-navy-900 p-3 rounded-2xl border border-slate-200 dark:border-navy-800 shadow-sm">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Junction Head</div>
                      <div className="text-lg font-extrabold text-navy-900 dark:text-white mt-0.5">
                        {pumpData?.discharge_pressure_bar || 3.62} <span className="text-[10px] text-slate-500">bar</span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Normal: 3.2 - 4.0 bar</div>
                    </div>

                    <div className="bg-white dark:bg-navy-900 p-3 rounded-2xl border border-slate-200 dark:border-navy-800 shadow-sm">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Delivered</div>
                      <div className="text-lg font-extrabold text-navy-900 dark:text-white mt-0.5">
                        276.5 <span className="text-[10px] text-slate-500">kL</span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">A:112 · B:88 · C:76</div>
                    </div>

                    <div className="bg-white dark:bg-navy-900 p-3 rounded-2xl border border-slate-200 dark:border-navy-800 shadow-sm">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Motor Temp</div>
                      <div className="text-lg font-extrabold text-navy-900 dark:text-white mt-0.5">
                        {pumpData?.motor_temp_c || 58.4} <span className="text-[10px] text-slate-500">°C</span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Trip limit &gt;75°C</div>
                    </div>

                    <div className="bg-white dark:bg-navy-900 p-3 rounded-2xl border border-slate-200 dark:border-navy-800 shadow-sm">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Electrical Load</div>
                      <div className="text-lg font-extrabold text-navy-900 dark:text-white mt-0.5">
                        {pumpData?.power_kw || 12.8} <span className="text-[10px] text-slate-500">kW</span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">415V · 23.4A (68%)</div>
                    </div>

                    <div className="bg-white dark:bg-navy-900 p-3 rounded-2xl border border-amber-200 dark:border-amber-900/60 shadow-sm bg-amber-50/20">
                      <div className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-semibold">Balance Diff</div>
                      <div className="text-lg font-extrabold text-amber-800 dark:text-amber-300 mt-0.5">
                        14.6%
                      </div>
                      <div className="text-[9px] text-amber-600 mt-0.5">Not pure leakage</div>
                    </div>

                    <div className="bg-white dark:bg-navy-900 p-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-sm bg-rose-50/20">
                      <div className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-semibold">Affected Homes</div>
                      <div className="text-lg font-extrabold text-rose-700 dark:text-rose-400 mt-0.5">
                        45
                      </div>
                      <div className="text-[9px] text-rose-600 mt-0.5">Village C School Rd</div>
                    </div>

                    <div className="bg-white dark:bg-navy-900 p-3 rounded-2xl border border-slate-200 dark:border-navy-800 shadow-sm">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Work Orders</div>
                      <div className="text-lg font-extrabold text-navy-900 dark:text-white mt-0.5">
                        {orders.filter(o => o.status !== 'Completed').length} Open
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">1 Emergency order</div>
                    </div>
                  </div>

                  {/* Pipeline GIS Schematic */}
                  <NetworkSchematic onSelectLeak={() => setCurrentRoute('leaks')} />

                  {/* Three Village Comparison */}
                  <VillageComparison 
                    villages={villages} 
                    onSelectVillage={(v) => setCurrentRoute('villages')} 
                  />
                </div>
              )}

              {/* ROUTE: Resident Portal (Home) */}
              {currentRoute === 'home' && (
                <ResidentPortal
                  villageData={villages.find((v) => v.name === user?.village) || null}
                  notices={notices}
                  onNavigate={(r) => setCurrentRoute(r)}
                  onOpenReportModal={() => setCurrentRoute('complaints')}
                />
              )}

              {/* ROUTE: Three Villages Detail */}
              {currentRoute === 'villages' && isStaff && (
                <VillageComparison villages={villages} />
              )}

              {/* ROUTE: Distribution Network */}
              {currentRoute === 'network' && isStaff && (
                <NetworkSchematic onSelectLeak={() => setCurrentRoute('leaks')} />
              )}

              {/* ROUTE: Central Main Pump */}
              {currentRoute === 'pump' && isStaff && pumpData && (
                <PumpMonitor pumpData={pumpData} onRefresh={fetchData} />
              )}

              {/* ROUTE: Storage Tanks */}
              {currentRoute === 'tanks' && isStaff && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-200 dark:border-navy-800">
                    <h2 className="text-lg font-bold text-navy-900 dark:text-white">
                      Elevated Storage Tank Reservoirs
                    </h2>
                    <p className="text-xs text-slate-500">
                      Live liquid levels, inlet filling rates from central pump, and gravity discharge rates.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {villages.map((v) => (
                      <TankVisualizer
                        key={v.id}
                        villageName={v.name}
                        capacityLiters={v.tank_capacity_liters}
                        currentLevelPercent={v.tank_level_percent}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ROUTE: AI Leakage Intelligence */}
              {currentRoute === 'leaks' && isStaff && leaksData && (
                <LeakageIntelligence
                  alerts={leaksData.activeAlerts || []}
                  massBalance={leaksData.massBalanceTelemetry || {}}
                  onRefresh={fetchData}
                  onCreateWorkOrder={handleCreateWorkOrderFromLeak}
                />
              )}

              {/* ROUTE: Sensors & Telemetry */}
              {currentRoute === 'sensors' && isStaff && (
                <SensorDashboard sensors={sensors} onRefresh={fetchData} />
              )}

              {/* ROUTE: Alarms */}
              {currentRoute === 'alarms' && isStaff && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-200 dark:border-navy-800">
                    <h2 className="text-lg font-bold text-navy-900 dark:text-white">
                      Alarm & Incident Response Centre
                    </h2>
                    <p className="text-xs text-slate-500">
                      Supervisory alarms, pressure breaches, and mass-balance flow alerts.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 flex justify-between items-center text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-rose-700 dark:text-rose-300">ALM-101</span>
                          <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200 font-bold">
                            Critical Priority
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-navy-900 dark:text-white mt-1">
                          Critical Pressure Drop at Village C Inlet
                        </h4>
                        <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                          PR-C reported 1.88 bar (critical threshold 1.90 bar). Probable burst or heavy draw along School Road.
                        </p>
                      </div>
                      <button
                        onClick={() => alert('Alarm ALM-101 acknowledged in simulation')}
                        className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition shadow-sm"
                      >
                        Acknowledge
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 flex justify-between items-center text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-amber-700 dark:text-amber-300">ALM-102</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200 font-bold">
                            Important Priority
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-navy-900 dark:text-white mt-1">
                          Low Delivery Pressure on Branch B
                        </h4>
                        <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                          PR-B steady at 2.58 bar (warning band 2.5-2.8 bar). Assigned to Operator Harpreet Singh.
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-navy-800 text-slate-700 dark:text-slate-300 font-semibold">
                        Acknowledged
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ROUTE: Maintenance Work Orders */}
              {currentRoute === 'maintenance' && isStaff && (
                <MaintenanceTracker 
                  orders={orders} 
                  onRefresh={fetchData} 
                  initialCreateData={initialWorkOrder} 
                />
              )}

              {/* ROUTE: Village Water Notice Board */}
              {currentRoute === 'notices' && (
                <NoticeBoard notices={notices} onRefresh={fetchData} />
              )}

              {/* ROUTE: Water Complaints */}
              {currentRoute === 'complaints' && (
                <ComplaintManager complaints={complaints} onRefresh={fetchData} />
              )}

              {/* ROUTE: Water Conservation & Advice */}
              {currentRoute === 'advice' && (
                <div className="space-y-6">
                  <TechnicalGlossary />
                </div>
              )}

              {/* ROUTE: Water Analytics (IWA Water Balance) */}
              {currentRoute === 'analytics' && isStaff && (
                <WaterAnalytics
                  analyticsData={analyticsData}
                  period={analyticsPeriod}
                  onPeriodChange={(p) => setAnalyticsPeriod(p)}
                />
              )}

              {/* ROUTE: Asset Registry */}
              {currentRoute === 'assets' && isStaff && (
                <AssetRegistry assets={assets} onRefresh={fetchData} />
              )}

              {/* ROUTE: Users & Roles (Admin Only) */}
              {currentRoute === 'users' && isAdmin && (
                <UserManagement users={usersList} onRefresh={fetchData} />
              )}

              {/* ROUTE: Audit Log Viewer (Admin Only) */}
              {currentRoute === 'audit' && isAdmin && (
                <AuditLogViewer logs={auditLogs} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation for Residents & Mobile Users */}
      <MobileNav
        currentRoute={currentRoute}
        onNavigate={(r) => {
          if (isRouteAllowed(r)) setCurrentRoute(r);
        }}
        unreadCount={unreadNoticesCount}
      />

      {/* Login / Registration Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
