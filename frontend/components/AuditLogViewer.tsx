'use client';

import React from 'react';
import { ScrollText, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

export interface AuditLog {
  id: number;
  actor_name: string;
  actor_role: string;
  action: string;
  module: string;
  details: string;
  ip_address: string;
  timestamp: string;
}

interface AuditLogViewerProps {
  logs: AuditLog[];
}

export default function AuditLogViewer({ logs }: AuditLogViewerProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-navy-800 gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy-900 dark:text-white flex items-center space-x-2">
            <span>System Audit & Security Access Trails</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Immutable Log
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Records all administrative interventions, simulated equipment operations, security blocks, and notice publications.
          </p>
        </div>
        <div className="text-xs text-slate-400">
          Showing latest {logs.length} events
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-navy-950 text-slate-500 border-b border-slate-100 dark:border-navy-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Actor</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Module</th>
                <th className="py-3 px-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
              {logs.map((log) => {
                const isViolation = log.action.includes('SECURITY') || log.action.includes('BLOCKED');
                return (
                  <tr key={log.id} className={`hover:bg-slate-50 dark:hover:bg-navy-800/50 ${
                    isViolation ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                  }`}>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 font-bold text-navy-900 dark:text-white">
                      {log.actor_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-300">
                        {log.actor_role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        isViolation 
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' 
                          : 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {log.module}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-md">
                      {log.details}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
