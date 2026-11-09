'use client';

import React, { useState } from 'react';
import { 
  Boxes, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  Layers,
  Edit2
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export interface Asset {
  id: string;
  asset_tag: string;
  category: string;
  name: string;
  village: string;
  installation_date: string;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  status: 'Operational' | 'Maintenance Due' | 'Under Repair';
  model_spec: string;
}

interface AssetRegistryProps {
  assets: Asset[];
  onRefresh: () => void;
}

export default function AssetRegistry({ assets, onRefresh }: AssetRegistryProps) {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [villageFilter, setVillageFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // Form states
  const [assetTag, setAssetTag] = useState('');
  const [category, setCategory] = useState('Pump');
  const [name, setName] = useState('');
  const [village, setVillage] = useState('Village A');
  const [condition, setCondition] = useState<'Excellent' | 'Good' | 'Fair' | 'Poor'>('Good');
  const [status, setStatus] = useState<'Operational' | 'Maintenance Due' | 'Under Repair'>('Operational');
  const [modelSpec, setModelSpec] = useState('');

  const filteredAssets = assets.filter(a => {
    if (categoryFilter !== 'All' && a.category !== categoryFilter) return false;
    if (villageFilter !== 'All' && a.village !== villageFilter && a.village !== 'All') return false;
    if (search) {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.asset_tag.toLowerCase().includes(q) || a.model_spec.toLowerCase().includes(q);
    }
    return true;
  });

  const openAdd = () => {
    setEditingAsset(null);
    setAssetTag(`AST-${Date.now().toString().slice(-4)}`);
    setName('');
    setCategory('Pump');
    setVillage('Village A');
    setCondition('Good');
    setStatus('Operational');
    setModelSpec('');
    setShowModal(true);
  };

  const openEdit = (a: Asset) => {
    setEditingAsset(a);
    setAssetTag(a.asset_tag);
    setName(a.name);
    setCategory(a.category);
    setVillage(a.village);
    setCondition(a.condition);
    setStatus(a.status);
    setModelSpec(a.model_spec);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAsset) {
        await apiRequest(`/assets/${editingAsset.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name, condition, status, model_spec: modelSpec, village })
        });
      } else {
        await apiRequest('/assets', {
          method: 'POST',
          body: JSON.stringify({
            asset_tag: assetTag,
            category,
            name,
            village,
            condition,
            status,
            model_spec: modelSpec
          })
        });
      }

      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      alert(`Asset save error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-navy-800 gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy-900 dark:text-white flex items-center space-x-2">
            <span>Asset & Pipeline Registry</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              Infrastructure Tracking
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pumps, reservoirs, branch transmission pipes, sluice valves, and telemetry transmitters across all 3 villages.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl p-4 border border-slate-200 dark:border-navy-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets by tag, name, or model..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
          >
            <option value="All">All Categories</option>
            <option value="Pump">Pumps</option>
            <option value="Storage Tank">Storage Tanks</option>
            <option value="Transmission Pipe">Transmission Pipes</option>
            <option value="Control Valve">Control Valves</option>
            <option value="Flow Meter">Flow Meters</option>
          </select>

          <select
            value={villageFilter}
            onChange={(e) => setVillageFilter(e.target.value)}
            className="p-2 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
          >
            <option value="All">All Locations</option>
            <option value="Village A">Village A</option>
            <option value="Village B">Village B</option>
            <option value="Village C">Village C</option>
          </select>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-navy-950 text-slate-500 border-b border-slate-100 dark:border-navy-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Tag</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Asset Name & Specs</th>
                <th className="py-3 px-4 font-semibold">Village</th>
                <th className="py-3 px-4 font-semibold">Condition</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                {isAdmin && <th className="py-3 px-4 font-semibold">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
              {filteredAssets.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-navy-800/50">
                  <td className="py-3 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                    {a.asset_tag}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                    {a.category}
                  </td>
                  <td className="py-3 px-4 max-w-sm">
                    <div className="font-semibold text-navy-900 dark:text-white truncate">{a.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{a.model_spec}</div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {a.village}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      a.condition === 'Excellent' || a.condition === 'Good'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : a.condition === 'Fair'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {a.condition}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      a.status === 'Operational'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {a.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openEdit(a)}
                        className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold text-[11px] hover:bg-teal-100 transition"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add / Edit Asset */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-navy-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-navy-700 space-y-4">
            <h3 className="font-extrabold text-base text-navy-900 dark:text-white">
              {editingAsset ? 'Edit Asset' : 'Add New Infrastructure Asset'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Asset Tag *
                  </label>
                  <input
                    type="text"
                    required
                    value={assetTag}
                    disabled={!!editingAsset}
                    onChange={(e) => setAssetTag(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  >
                    <option value="Pump">Pump</option>
                    <option value="Storage Tank">Storage Tank</option>
                    <option value="Transmission Pipe">Transmission Pipe</option>
                    <option value="Control Valve">Control Valve</option>
                    <option value="Flow Meter">Flow Meter</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Asset Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Village B Elevated Storage Reservoir"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Village
                  </label>
                  <select
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  >
                    <option value="All">All / Central Works</option>
                    <option value="Village A">Village A</option>
                    <option value="Village B">Village B</option>
                    <option value="Village C">Village C</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Condition
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  >
                    <option value="Operational">Operational</option>
                    <option value="Maintenance Due">Maintenance Due</option>
                    <option value="Under Repair">Under Repair</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Model Specifications & Notes
                </label>
                <textarea
                  rows={2}
                  value={modelSpec}
                  onChange={(e) => setModelSpec(e.target.value)}
                  placeholder="e.g., 18.5 kW Kirloskar centrifugal pump, 415V 3-phase..."
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
