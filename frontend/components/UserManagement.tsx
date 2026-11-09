'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  ShieldCheck, 
  Wrench, 
  Home, 
  Trash2,
  Mail,
  MapPin
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useAuth, UserRole } from '@/context/AuthContext';

interface UserRecord {
  id: number;
  name: string;
  email_or_mobile: string;
  role: UserRole;
  village: string;
  created_at: string;
}

interface UserManagementProps {
  users: UserRecord[];
  onRefresh: () => void;
}

export default function UserManagement({ users, onRefresh }: UserManagementProps) {
  const { user: currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('Demo12345!');
  const [role, setRole] = useState<UserRole>('Operating Staff');
  const [village, setVillage] = useState('All');
  const [submitting, setSubmitting] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email_or_mobile: contact,
          password,
          role,
          village
        })
      });

      setShowModal(false);
      setName('');
      setContact('');
      onRefresh();
    } catch (err: any) {
      alert(`User creation error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: number, userName: string) => {
    if (!confirm(`Are you sure you want to remove user "${userName}"?`)) return;

    try {
      await apiRequest(`/users/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err: any) {
      alert(`Deletion error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-navy-800 gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy-900 dark:text-white flex items-center space-x-2">
            <span>User & Operator Access Management</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Administrator Only
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enforce role boundaries across Chief Engineers, Pump Operators, and Registered Village Residents.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow flex items-center space-x-1.5 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Register User / Operator</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-navy-950 text-slate-500 border-b border-slate-100 dark:border-navy-800">
              <tr>
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Contact / Email</th>
                <th className="py-3 px-4 font-semibold">Assigned Role</th>
                <th className="py-3 px-4 font-semibold">Assigned Village</th>
                <th className="py-3 px-4 font-semibold">Created Date</th>
                <th className="py-3 px-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
              {users.map((u) => {
                const isCurrent = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-navy-800/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-navy-900 dark:text-white flex items-center space-x-1.5">
                        <span>{u.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold bg-teal-50 dark:bg-teal-950 px-1.5 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {u.email_or_mobile}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center space-x-1 w-max ${
                        u.role === 'Administrator'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : u.role === 'Operating Staff'
                          ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {u.role === 'Administrator' ? <ShieldCheck className="w-3 h-3" /> :
                         u.role === 'Operating Staff' ? <Wrench className="w-3 h-3" /> :
                         <Home className="w-3 h-3" />}
                        <span>{u.role}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {u.village}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {u.created_at}
                    </td>
                    <td className="py-3 px-4">
                      {!isCurrent ? (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="Remove user account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Active Session</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create User */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-navy-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-navy-700 space-y-4">
            <h3 className="font-extrabold text-base text-navy-900 dark:text-white">
              Provision New User / Operator Account
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Balwinder Singh (Pump Technician)"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email or Mobile (Username) *
                </label>
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g., balwinder@waterworks.local"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    System Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const r = e.target.value as UserRole;
                      setRole(r);
                      if (r === 'Operating Staff' || r === 'Administrator') setVillage('All');
                      else setVillage('Village A');
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  >
                    <option value="Operating Staff">Operating Staff</option>
                    <option value="Administrator">Administrator</option>
                    <option value="Resident">Resident</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Village Assignment *
                  </label>
                  <select
                    value={village}
                    disabled={role !== 'Resident'}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-navy-950"
                  >
                    <option value="All">All Villages (Staff)</option>
                    <option value="Village A">Village A</option>
                    <option value="Village B">Village B</option>
                    <option value="Village C">Village C</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow"
                >
                  {submitting ? 'Creating...' : 'Register Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
