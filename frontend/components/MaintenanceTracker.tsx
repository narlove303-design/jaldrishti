'use client';

import React, { useState } from 'react';
import { 
  Wrench, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  DollarSign, 
  Package,
  Camera
} from 'lucide-react';
import { apiRequest } from '@/lib/api';

export interface WorkOrder {
  id: number;
  order_code: string;
  village: string;
  task_title: string;
  description: string;
  priority: string;
  technician: string;
  estimated_cost_inr: number;
  actual_cost_inr?: number;
  status: 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
  spare_parts_used?: string;
  photo_url?: string;
  created_at: string;
}

interface MaintenanceTrackerProps {
  orders: WorkOrder[];
  onRefresh: () => void;
  initialCreateData?: { village: string; task: string } | null;
}

export default function MaintenanceTracker({ orders, onRefresh, initialCreateData }: MaintenanceTrackerProps) {
  const [showModal, setShowModal] = useState(!!initialCreateData);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);

  // Form states for new order
  const [village, setVillage] = useState(initialCreateData?.village || 'Village C');
  const [taskTitle, setTaskTitle] = useState(initialCreateData?.task || '');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Important');
  const [technician, setTechnician] = useState('Rajinder Kumar');
  const [estimatedCost, setEstimatedCost] = useState(4200);
  const [spareParts, setSpareParts] = useState('110mm Pipe Coupler, Saddle Clamp');
  const [submitting, setSubmitting] = useState(false);

  // Edit states
  const [editStatus, setEditStatus] = useState<string>('In Progress');
  const [actualCost, setActualCost] = useState<number>(0);
  const [editParts, setEditParts] = useState<string>('');

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiRequest('/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          village,
          task_title: taskTitle,
          description,
          priority,
          technician,
          estimated_cost_inr: estimatedCost,
          spare_parts_used: spareParts
        })
      });

      setShowModal(false);
      setTaskTitle('');
      setDescription('');
      onRefresh();
    } catch (err: any) {
      alert(`Work order creation error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    setSubmitting(true);

    try {
      await apiRequest(`/maintenance/${editingOrder.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: editStatus,
          actual_cost_inr: actualCost,
          spare_parts_used: editParts
        })
      });

      setEditingOrder(null);
      onRefresh();
    } catch (err: any) {
      alert(`Work order update error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (order: WorkOrder) => {
    setEditingOrder(order);
    setEditStatus(order.status);
    setActualCost(order.actual_cost_inr || order.estimated_cost_inr);
    setEditParts(order.spare_parts_used || '');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-navy-800 gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy-900 dark:text-white flex items-center space-x-2">
            <span>Maintenance Work Orders & Repair Logs</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              Field Operations
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dispatch technicians, allocate spare parts inventory, and record actual repair expenditures.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow flex items-center space-x-1.5 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create Work Order</span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-navy-950 text-slate-500 border-b border-slate-100 dark:border-navy-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Order ID</th>
                <th className="py-3 px-4 font-semibold">Village</th>
                <th className="py-3 px-4 font-semibold">Task Description</th>
                <th className="py-3 px-4 font-semibold">Technician</th>
                <th className="py-3 px-4 font-semibold">Estimated / Actual</th>
                <th className="py-3 px-4 font-semibold">Spare Parts</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-navy-800/50">
                  <td className="py-3 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                    {o.order_code}
                  </td>
                  <td className="py-3 px-4 font-semibold text-navy-900 dark:text-white">
                    {o.village}
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{o.task_title}</div>
                    <div className="text-[11px] text-slate-400 truncate">{o.description}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {o.technician}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                    ₹{o.estimated_cost_inr.toLocaleString()}
                    {o.actual_cost_inr ? (
                      <span className="text-[11px] text-slate-400 block font-normal">
                        Act: ₹{o.actual_cost_inr.toLocaleString()}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 px-4 text-slate-500 truncate max-w-xs text-[11px]">
                    {o.spare_parts_used || 'None'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      o.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : o.status === 'In Progress'
                        ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => openEdit(o)}
                      className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold text-[11px] hover:bg-teal-100 transition"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Work Order */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-navy-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-navy-700 space-y-4">
            <h3 className="font-extrabold text-base text-navy-900 dark:text-white">
              Create Maintenance Work Order
            </h3>

            <form onSubmit={handleCreateOrder} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Village
                  </label>
                  <select
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  >
                    <option value="Village A">Village A</option>
                    <option value="Village B">Village B</option>
                    <option value="Village C">Village C</option>
                    <option value="All">Central Water Works</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  >
                    <option value="Critical">Critical (Immediate Leak)</option>
                    <option value="Important">Important (Scheduled Repair)</option>
                    <option value="General">General (Routine Check)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Acoustic leak pinpointing & saddle clamp"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Scope of Work
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Specific pipeline chainage, excavation requirements..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Technician
                  </label>
                  <input
                    type="text"
                    required
                    value={technician}
                    onChange={(e) => setTechnician(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Cost (₹ INR)
                  </label>
                  <input
                    type="number"
                    required
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Spare Parts Required
                </label>
                <input
                  type="text"
                  value={spareParts}
                  onChange={(e) => setSpareParts(e.target.value)}
                  placeholder="e.g., 110mm HDPE Coupler, Rubber Gasket"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                />
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
                  {submitting ? 'Creating...' : 'Dispatch Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Work Order */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-navy-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-navy-700 space-y-4">
            <h3 className="font-extrabold text-base text-navy-900 dark:text-white">
              Update Order: {editingOrder.order_code}
            </h3>

            <form onSubmit={handleUpdateOrder} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Order Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed & Tested</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Actual Cost (₹ INR)
                </label>
                <input
                  type="number"
                  value={actualCost}
                  onChange={(e) => setActualCost(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Spare Parts Consumed
                </label>
                <input
                  type="text"
                  value={editParts}
                  onChange={(e) => setEditParts(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow"
                >
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
