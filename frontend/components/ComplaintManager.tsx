'use client';

import React, { useState } from 'react';
import { 
  MessageSquareWarning, 
  Search, 
  PlusCircle, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Camera, 
  Send,
  MapPin,
  User,
  Wrench,
  Check
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export interface Complaint {
  id: number;
  complaint_code: string;
  village: string;
  category: string;
  location: string;
  description: string;
  resident_name: string;
  resident_contact?: string;
  photo_url?: string;
  status: 'Open' | 'Assigned' | 'In Progress' | 'Resolved';
  technician_notes?: string;
  tracking_updates: { time: string; note: string }[];
  created_at: string;
}

interface ComplaintManagerProps {
  complaints: Complaint[];
  onRefresh: () => void;
  defaultTab?: 'submit' | 'track' | 'register';
}

export default function ComplaintManager({ complaints, onRefresh, defaultTab }: ComplaintManagerProps) {
  const { user, isStaff } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'submit' | 'track' | 'register'>(
    defaultTab || (isStaff ? 'register' : 'submit')
  );

  // Form states
  const [category, setCategory] = useState('Leakage');
  const [village, setVillage] = useState(user?.village === 'All' ? 'Village A' : user?.village || 'Village A');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  // Tracking search states
  const [searchCode, setSearchCode] = useState('');
  const [trackedComplaint, setTrackedComplaint] = useState<Complaint | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // Staff update modal states
  const [updatingComplaint, setUpdatingComplaint] = useState<Complaint | null>(null);
  const [newStatus, setNewStatus] = useState<string>('In Progress');
  const [progressNote, setProgressNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setCreatedCode(null);

    try {
      const res = await apiRequest<{ complaintCode: string }>('/complaints', {
        method: 'POST',
        body: JSON.stringify({
          category,
          village,
          location,
          description,
          resident_contact: contact,
          photo_url: photoName ? `https://demo.local/uploads/${photoName}` : null
        })
      });

      setCreatedCode(res.complaintCode);
      setLocation('');
      setDescription('');
      setPhotoName(null);
      onRefresh();
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    setSearching(true);
    setSearchError(null);
    setTrackedComplaint(null);

    try {
      const res = await apiRequest<{ complaint: Complaint }>(`/complaints/track/${searchCode.trim().toUpperCase()}`);
      setTrackedComplaint(res.complaint);
    } catch (err: any) {
      setSearchError(err.message || 'Reference ticket not found.');
    } finally {
      setSearching(false);
    }
  };

  const handleStaffUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingComplaint) return;

    try {
      await apiRequest(`/complaints/${updatingComplaint.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          progress_note: progressNote
        })
      });

      setUpdatingComplaint(null);
      setProgressNote('');
      onRefresh();
    } catch (err: any) {
      alert(`Update error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-navy-800 gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy-900 dark:text-white flex items-center space-x-2">
            <span>Water Complaints & Incident Grievance Desk</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              Reference Tracker
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Report pipeline leaks, low tap pressure, or service outages. Track tickets in real time through resolution.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-navy-800 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'submit'
                ? 'bg-white dark:bg-navy-900 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-navy-900'
            }`}
          >
            Submit Complaint
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'track'
                ? 'bg-white dark:bg-navy-900 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-navy-900'
            }`}
          >
            Track by Code
          </button>
          {isStaff && (
            <button
              onClick={() => setActiveTab('register')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'register'
                  ? 'bg-white dark:bg-navy-900 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-navy-900'
              }`}
            >
              Registry ({complaints.length})
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Submit Form */}
      {activeTab === 'submit' && (
        <div className="bg-white dark:bg-navy-900 rounded-2xl p-6 border border-slate-200 dark:border-navy-800 shadow-sm max-w-2xl mx-auto space-y-4">
          <h3 className="font-extrabold text-base text-navy-900 dark:text-white flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-teal-600" />
            <span>File a Water Grievance</span>
          </h3>

          {createdCode && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
              <div className="font-bold flex items-center space-x-1.5 text-sm">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Complaint Successfully Logged!</span>
              </div>
              <p>
                Your reference number is <strong className="font-mono text-base text-emerald-900 dark:text-emerald-100">{createdCode}</strong>.
                Save this code to check the technician inspection progress on the tracker.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Issue Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                >
                  <option value="Leakage">Pipeline Leakage / Burst</option>
                  <option value="Low pressure">Low Tap Water Pressure</option>
                  <option value="No supply">No Supply During Scheduled Hours</option>
                  <option value="Water quality">Turbid / Discolored / Foul Water</option>
                  <option value="Other">Meter / Valve Defect</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Village *
                </label>
                <input
                  type="text"
                  disabled={user?.role === 'Resident'}
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-slate-50 dark:bg-navy-950 text-slate-700 dark:text-slate-300 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Specific Location / Nearest Landmark *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., House 42, School Road near Middle School gate"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description of Problem *
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe how long the leak has persisted, approximate water loss, or pressure drops..."
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Number (Optional)
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Mobile for SMS updates"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Photo Attachment (Optional)
                </label>
                <div className="flex items-center space-x-2">
                  <label className="flex-1 flex items-center justify-center p-2.5 rounded-xl border border-dashed border-slate-300 dark:border-navy-700 bg-slate-50 dark:bg-navy-950 cursor-pointer hover:bg-slate-100 dark:hover:bg-navy-900">
                    <Camera className="w-4 h-4 text-slate-400 mr-2" />
                    <span className="text-slate-500 truncate">{photoName || 'Choose image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setPhotoName(e.target.files?.[0]?.name || null)}
                    />
                  </label>
                  {photoName && (
                    <button
                      type="button"
                      onClick={() => setPhotoName(null)}
                      className="text-rose-500 font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow flex items-center justify-center space-x-2 transition"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Registering...' : 'Submit Water Complaint'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Track by Code */}
      {activeTab === 'track' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white dark:bg-navy-900 rounded-2xl p-6 border border-slate-200 dark:border-navy-800 shadow-sm">
            <h3 className="font-extrabold text-base text-navy-900 dark:text-white mb-3 flex items-center space-x-2">
              <Search className="w-5 h-5 text-teal-600" />
              <span>Track Complaint Status</span>
            </h3>

            <form onSubmit={handleTrackSearch} className="flex gap-2">
              <input
                type="text"
                required
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Enter reference code (e.g., CMP-1042)"
                className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white text-xs font-mono"
              />
              <button
                type="submit"
                disabled={searching}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow transition"
              >
                {searching ? 'Checking...' : 'Check Status'}
              </button>
            </form>

            {searchError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900">
                {searchError}
              </div>
            )}
          </div>

          {/* Tracked Card Output */}
          {trackedComplaint && (
            <div className="bg-white dark:bg-navy-900 rounded-2xl p-6 border border-slate-200 dark:border-navy-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-navy-800">
                <div>
                  <span className="font-mono text-sm font-extrabold text-teal-600 dark:text-teal-400">
                    {trackedComplaint.complaint_code}
                  </span>
                  <div className="text-xs font-bold text-navy-900 dark:text-white mt-0.5">
                    {trackedComplaint.category} · {trackedComplaint.village}
                  </div>
                </div>

                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                  trackedComplaint.status === 'Resolved'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : trackedComplaint.status === 'In Progress'
                    ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {trackedComplaint.status}
                </span>
              </div>

              <div className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <div>
                  <span className="text-slate-400 font-medium">Location:</span> {trackedComplaint.location}
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Description:</span> {trackedComplaint.description}
                </div>
              </div>

              {/* Step-by-Step Progress Timeline */}
              <div className="pt-3 border-t border-slate-100 dark:border-navy-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Progress Timeline & Technician Notes
                </h4>

                <div className="space-y-3 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-slate-200 dark:before:bg-navy-700">
                  {trackedComplaint.tracking_updates.map((step, idx) => (
                    <div key={idx} className="relative flex items-start space-x-3 pl-6 text-xs">
                      <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-teal-600 border-2 border-white dark:border-navy-900 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-navy-900 dark:text-white">
                          {step.note}
                        </div>
                        <div className="text-[10px] text-slate-400">{step.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Staff Registry */}
      {activeTab === 'register' && isStaff && (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-navy-800 font-bold text-sm text-navy-900 dark:text-white">
            Operational Grievance Registry
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-navy-950 text-slate-500 border-b border-slate-100 dark:border-navy-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Code</th>
                  <th className="py-3 px-4 font-semibold">Village</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold">Resident</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-navy-800/50">
                    <td className="py-3 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                      {c.complaint_code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-navy-900 dark:text-white">
                      {c.village}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {c.category}
                    </td>
                    <td className="py-3 px-4 text-slate-500 truncate max-w-xs">
                      {c.location}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {c.resident_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        c.status === 'Resolved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : c.status === 'In Progress'
                          ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setUpdatingComplaint(c);
                          setNewStatus(c.status);
                        }}
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
      )}

      {/* Staff Update Modal */}
      {updatingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-navy-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-navy-700 space-y-4">
            <h3 className="font-extrabold text-base text-navy-900 dark:text-white">
              Update Complaint: {updatingComplaint.complaint_code}
            </h3>

            <form onSubmit={handleStaffUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                >
                  <option value="Open">Open</option>
                  <option value="Assigned">Assigned to Field Crew</option>
                  <option value="In Progress">In Progress (Active Work)</option>
                  <option value="Resolved">Resolved & Verified</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Progress Note for Resident Tracker
                </label>
                <textarea
                  rows={3}
                  required
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  placeholder="e.g., Plumber dispatched to inspect valve leakage..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUpdatingComplaint(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow"
                >
                  Save Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
