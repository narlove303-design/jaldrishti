'use client';

import React, { useState } from 'react';
import { 
  Megaphone, 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Archive, 
  Edit3, 
  Check, 
  Filter,
  Eye,
  ShieldCheck,
  Send
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export interface Notice {
  id: number;
  title: string;
  target_villages: string[];
  category: string;
  priority: 'General' | 'Important' | 'Critical';
  description: string;
  status: 'Active' | 'Pending Approval' | 'Archived' | 'Restored';
  expected_restoration: string;
  author_role: string;
  author_name: string;
  published_at: string;
  is_read?: boolean;
}

interface NoticeBoardProps {
  notices: Notice[];
  onRefresh: () => void;
}

export default function NoticeBoard({ notices, onRefresh }: NoticeBoardProps) {
  const { user, isAdmin, isStaff, isResident } = useAuth();
  const { t } = useLanguage();

  const [categoryFilter, setCategoryFilter] = useState('All');
  const [villageFilter, setVillageFilter] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [targetVillages, setTargetVillages] = useState<string[]>(['Village A', 'Village B', 'Village C']);
  const [category, setCategory] = useState('Scheduled water supply');
  const [priority, setPriority] = useState<'General' | 'Important' | 'Critical'>('General');
  const [description, setDescription] = useState('');
  const [expectedRestoration, setExpectedRestoration] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    'All',
    'Scheduled water supply',
    'Emergency water interruption',
    'Pipeline leakage',
    'Pump maintenance',
    'Tank cleaning',
    'Low water pressure',
    'Water quality advisory',
    'Electricity-related pump interruption',
    'Supply restoration'
  ];

  const handleToggleRead = async (noticeId: number) => {
    try {
      await apiRequest(`/notices/${noticeId}/toggle-read`, { method: 'POST' });
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle read state:', err);
    }
  };

  const handleApproveNotice = async (noticeId: number) => {
    try {
      await apiRequest(`/notices/${noticeId}/approve`, { method: 'POST' });
      onRefresh();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleArchiveNotice = async (noticeId: number) => {
    if (!confirm('Are you sure you want to archive this notice? It will no longer be visible on village boards.')) return;
    try {
      await apiRequest(`/notices/${noticeId}`, { method: 'DELETE' });
      onRefresh();
    } catch (err: any) {
      alert(`Archive error: ${err.message}`);
    }
  };

  const handleSubmitNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingNotice) {
        await apiRequest(`/notices/${editingNotice.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title,
            target_villages: targetVillages,
            category,
            priority,
            description,
            expected_restoration: expectedRestoration
          })
        });
      } else {
        await apiRequest('/notices', {
          method: 'POST',
          body: JSON.stringify({
            title,
            target_villages: targetVillages,
            category,
            priority,
            description,
            expected_restoration: expectedRestoration
          })
        });
      }

      setShowCreateModal(false);
      setEditingNotice(null);
      resetForm();
      onRefresh();
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setTargetVillages(['Village A', 'Village B', 'Village C']);
    setCategory('Scheduled water supply');
    setPriority('General');
    setDescription('');
    setExpectedRestoration('');
  };

  const openEditModal = (notice: Notice) => {
    setEditingNotice(notice);
    setTitle(notice.title);
    setTargetVillages(notice.target_villages);
    setCategory(notice.category);
    setPriority(notice.priority);
    setDescription(notice.description);
    setExpectedRestoration(notice.expected_restoration);
    setShowCreateModal(true);
  };

  const filteredNotices = notices.filter(n => {
    if (categoryFilter !== 'All' && n.category !== categoryFilter) return false;
    if (villageFilter !== 'All' && !n.target_villages.includes(villageFilter) && !n.target_villages.includes('All')) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-navy-800 gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy-900 dark:text-white flex items-center space-x-2">
            <span>Village Water Notice Board</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              High-Priority Announcements
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Official municipal water advisories, pipeline maintenance windows, and emergency supply schedules.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => { resetForm(); setEditingNotice(null); setShowCreateModal(true); }}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow flex items-center space-x-1.5 transition"
          >
            {isAdmin ? <Plus className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            <span>{isAdmin ? 'Publish Village Notice' : 'Submit Incident Update'}</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl p-4 border border-slate-200 dark:border-navy-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-slate-500">
            <Filter className="w-3.5 h-3.5 text-teal-500" />
            <span className="font-semibold">Category:</span>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-800 dark:text-white"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {!isResident && (
            <>
              <div className="flex items-center space-x-1.5 text-slate-500 ml-2">
                <MapPin className="w-3.5 h-3.5 text-teal-500" />
                <span className="font-semibold">Village:</span>
              </div>
              <select
                value={villageFilter}
                onChange={(e) => setVillageFilter(e.target.value)}
                className="p-2 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-800 dark:text-white"
              >
                <option value="All">All Villages</option>
                <option value="Village A">Village A</option>
                <option value="Village B">Village B</option>
                <option value="Village C">Village C</option>
              </select>
            </>
          )}
        </div>

        <div className="text-slate-400 text-xs">
          Showing {filteredNotices.length} of {notices.length} announcements
        </div>
      </div>

      {/* Notice Cards List */}
      <div className="space-y-4">
        {filteredNotices.length === 0 ? (
          <div className="bg-white dark:bg-navy-900 rounded-2xl p-8 border border-slate-200 dark:border-navy-800 text-center text-slate-400">
            No public water notices matching the selected filter criteria.
          </div>
        ) : (
          filteredNotices.map((notice) => {
            const isUnread = notice.is_read === false;
            const isCritical = notice.priority === 'Critical';
            const isImportant = notice.priority === 'Important';
            const isPending = notice.status === 'Pending Approval';

            return (
              <article
                key={notice.id}
                className={`bg-white dark:bg-navy-900 rounded-2xl p-5 border shadow-sm transition hover:shadow-md relative overflow-hidden ${
                  isCritical 
                    ? 'border-l-8 border-l-rose-500 border-slate-200 dark:border-navy-800' 
                    : isImportant
                    ? 'border-l-8 border-l-amber-500 border-slate-200 dark:border-navy-800'
                    : 'border-l-8 border-l-teal-600 border-slate-200 dark:border-navy-800'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h3 className="font-extrabold text-base text-navy-900 dark:text-white">
                      {notice.title}
                    </h3>

                    {isUnread && (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500 text-white animate-pulse">
                        NEW UNREAD
                      </span>
                    )}

                    {isPending && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        PENDING ADMIN APPROVAL
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                      isCritical
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : isImportant
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                    }`}>
                      {notice.priority}
                    </span>

                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300">
                      {notice.category}
                    </span>
                  </div>
                </div>

                {/* Subtitle / Metadata */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mb-3">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    <span>Target: <strong>{notice.target_villages.join(', ')}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Published: {notice.published_at}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Expected Restoration: <strong>{notice.expected_restoration}</strong></span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    By: {notice.author_name} ({notice.author_role})
                  </div>
                </div>

                {/* Description Body */}
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-navy-950/40 p-3.5 rounded-xl border border-slate-100 dark:border-navy-800/80 mb-3">
                  {notice.description}
                </p>

                {/* Footer Actions */}
                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 dark:border-navy-800 text-xs gap-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleRead(notice.id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-navy-700 hover:bg-slate-50 dark:hover:bg-navy-800 font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-teal-500" />
                      <span>{notice.is_read ? 'Mark as Unread' : 'Mark as Read'}</span>
                    </button>

                    {isAdmin && isPending && (
                      <button
                        onClick={() => handleApproveNotice(notice.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-1 transition shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Publish</span>
                      </button>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(notice)}
                        className="px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 flex items-center space-x-1 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleArchiveNotice(notice.id)}
                        className="px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center space-x-1 transition"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Archive</span>
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Modal: Publish / Edit Notice */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-navy-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-navy-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-base text-navy-900 dark:text-white flex items-center space-x-2">
              <Megaphone className="w-5 h-5 text-teal-600" />
              <span>{editingNotice ? 'Edit Village Notice' : isAdmin ? 'Publish Public Notice' : 'Submit Operational Notice for Approval'}</span>
            </h3>

            <form onSubmit={handleSubmitNotice} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notice Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Low Water Pressure Advisory for Sector 2"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Villages (Multi-Village Announcement)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Village A', 'Village B', 'Village C'].map((v) => {
                    const isChecked = targetVillages.includes(v);
                    return (
                      <button
                        type="button"
                        key={v}
                        onClick={() => {
                          if (isChecked) {
                            if (targetVillages.length > 1) {
                              setTargetVillages(targetVillages.filter((x) => x !== v));
                            }
                          } else {
                            setTargetVillages([...targetVillages, v]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                          isChecked
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : 'bg-white dark:bg-navy-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-navy-700'
                        }`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  >
                    {categories.filter(c => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority Level *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  >
                    <option value="General">General (Informational)</option>
                    <option value="Important">Important (Advisory)</option>
                    <option value="Critical">Critical (Immediate Interruption)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expected Supply Restoration Time
                </label>
                <input
                  type="text"
                  value={expectedRestoration}
                  onChange={(e) => setExpectedRestoration(e.target.value)}
                  placeholder="e.g., Today by 06:00 PM / Tomorrow morning"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Notice Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain why water supply is affected, which streets or sectors are impacted, and advice for residents..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-navy-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow"
                >
                  {submitting ? 'Submitting...' : editingNotice ? 'Update Notice' : isAdmin ? 'Publish Notice' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
