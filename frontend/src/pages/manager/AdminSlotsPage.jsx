import React, { useState, useEffect, useCallback } from 'react';
import {
  ParkingSquare, Plus, Pencil, Trash2, Save, X, Settings2,
  Car, Bike, Sparkles, ShieldAlert, Layers, CheckCircle2, AlertCircle,
  ToggleLeft, ToggleRight, SlidersHorizontal, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const EMPTY_SLOT = { slot_number: '', floor_level: 'L1', vehicle_type: 'car', is_premium: false };
const FLOORS = ['L1', 'L2', 'L3', 'L4', 'B1'];

// ─── Helper: Toast Notification ──────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center space-x-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-medium animate-slideUp ${
      type === 'success'
        ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
        : 'bg-red-950/90 border-red-500/40 text-red-300'
    }`}>
      {type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      <span>{msg}</span>
    </div>
  );
}

// ─── Slot Form Modal ──────────────────────────────────────────────────────────
function SlotModal({ slot, onClose, onSave }) {
  const { getToken } = useAuth();
  const [form, setForm] = useState(slot || EMPTY_SLOT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = !!slot?.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const url = isEdit ? `${API_BASE}/slots/${slot.id}` : `${API_BASE}/slots`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed.');
      onSave(data, isEdit ? 'edit' : 'add');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <ParkingSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white">{isEdit ? 'Edit Slot' : 'Add New Slot'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-xl transition"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Slot Number */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Slot Number <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              value={form.slot_number}
              onChange={e => setForm(f => ({ ...f, slot_number: e.target.value }))}
              placeholder="e.g. A1, B3, VIP-01"
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition text-sm"
            />
          </div>

          {/* Floor Level */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Floor Level <span className="text-red-400">*</span></label>
            <div className="relative">
              <select
                value={form.floor_level}
                onChange={e => setForm(f => ({ ...f, floor_level: e.target.value }))}
                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition text-sm appearance-none"
              >
                {FLOORS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Vehicle Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Vehicle Type <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              {['car', 'bike'].map(vt => (
                <button
                  key={vt}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, vehicle_type: vt }))}
                  className={`flex items-center justify-center space-x-2 py-3 rounded-xl border transition text-sm font-medium ${
                    form.vehicle_type === vt
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                      : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {vt === 'car' ? <Car className="w-4 h-4" /> : <Bike className="w-4 h-4" />}
                  <span className="capitalize">{vt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Premium Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-gray-300">VIP / Premium Slot</span>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_premium: !f.is_premium }))}
              className="transition"
            >
              {form.is_premium
                ? <ToggleRight className="w-7 h-7 text-amber-400" />
                : <ToggleLeft className="w-7 h-7 text-gray-600" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-950/30 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition text-sm">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-gray-950 font-bold rounded-xl transition text-sm flex items-center justify-center space-x-2">
              {loading ? <span className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isEdit ? 'Save Changes' : 'Add Slot'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function AppSettingsPanel({ toast }) {
  const { getToken } = useAuth();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      toast('Failed to load settings.', 'error');
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSetting = async (key, value) => {
    setSaving(key);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ key, value })
      });
      if (!res.ok) throw new Error('Save failed.');
      setSettings(s => ({ ...s, [key]: value }));
      toast('Setting saved!', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(null);
    }
  };

  if (!settings) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const maintenance = settings.maintenance_mode?.enabled ?? false;
  const cleaning = settings.cleaning_threshold?.sigma ?? 3;
  const peaks = settings.peak_windows ?? [];

  return (
    <div className="space-y-6">
      {/* Maintenance Mode */}
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-start space-x-4">
            <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20 mt-0.5">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Maintenance Mode</h3>
              <p className="text-sm text-gray-500 mt-0.5">When enabled, new bookings will be blocked system-wide.</p>
            </div>
          </div>
          <button
            onClick={() => saveSetting('maintenance_mode', { enabled: !maintenance })}
            disabled={saving === 'maintenance_mode'}
            className="ml-4 flex-shrink-0"
          >
            {maintenance
              ? <ToggleRight className="w-9 h-9 text-red-500 transition" />
              : <ToggleLeft className="w-9 h-9 text-gray-600 hover:text-gray-400 transition" />}
          </button>
        </div>
        {maintenance && (
          <div className="mt-4 px-4 py-2.5 bg-red-950/30 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>Maintenance mode is <strong>ACTIVE</strong>. Bookings are currently blocked.</span>
          </div>
        )}
      </div>

      {/* Outlier Cleaning Threshold */}
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-5">
        <div className="flex items-center space-x-4 mb-4">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Outlier Cleaning Threshold (σ)</h3>
            <p className="text-sm text-gray-500 mt-0.5">Controls the sigma multiplier for the data pipeline's outlier removal.</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="range" min="1" max="5" step="0.5"
            value={cleaning}
            onChange={e => setSettings(s => ({ ...s, cleaning_threshold: { sigma: parseFloat(e.target.value) } }))}
            className="flex-1 accent-indigo-500"
          />
          <span className="text-indigo-300 font-bold text-lg w-10 text-center">{cleaning}σ</span>
          <button
            onClick={() => saveSetting('cleaning_threshold', { sigma: cleaning })}
            disabled={saving === 'cleaning_threshold'}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition flex items-center space-x-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Peak Hour Windows */}
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-5">
        <div className="flex items-center space-x-4 mb-5">
          <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <SlidersHorizontal className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Peak Hour Multipliers</h3>
            <p className="text-sm text-gray-500 mt-0.5">Configure surge pricing windows and rate multipliers.</p>
          </div>
        </div>
        <div className="space-y-3">
          {peaks.map((peak, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-gray-800/40 border border-gray-700/40 rounded-xl p-3">
              <div className="col-span-4">
                <p className="text-xs text-gray-500 mb-1">Window Name</p>
                <p className="text-sm font-semibold text-gray-200">{peak.label}</p>
              </div>
              <div className="col-span-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Hours</p>
                <p className="text-sm text-gray-300">{peak.start}:00 – {peak.end}:00</p>
              </div>
              <div className="col-span-3">
                <p className="text-xs text-gray-500 mb-1">Multiplier</p>
                <input
                  type="number" min="1" max="3" step="0.1"
                  value={peak.multiplier}
                  onChange={e => {
                    const updated = [...peaks];
                    updated[idx] = { ...updated[idx], multiplier: parseFloat(e.target.value) };
                    setSettings(s => ({ ...s, peak_windows: updated }));
                  }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-amber-300 text-sm font-semibold focus:outline-none focus:border-amber-500 transition text-center"
                />
              </div>
              <div className="col-span-2 flex justify-center">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${peak.multiplier >= 1.4 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  ×{peak.multiplier}
                </span>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => saveSetting('peak_windows', peaks)}
          disabled={saving === 'peak_windows'}
          className="mt-4 w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-gray-950 font-bold rounded-xl text-sm transition flex items-center justify-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Peak Settings</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminSlotsPage() {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState('slots');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | slotObj (edit)
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const fetchSlots = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/slots`);
      const data = await res.json();
      setSlots(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load slots.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const handleModalSave = (savedSlot, action) => {
    if (action === 'edit') {
      setSlots(prev => prev.map(s => s.id === savedSlot.id ? savedSlot : s));
      showToast(`Slot ${savedSlot.slot_number} updated!`);
    } else {
      setSlots(prev => [...prev, savedSlot]);
      showToast(`Slot ${savedSlot.slot_number} added!`);
    }
    setModal(null);
  };

  const handleDelete = async (slot) => {
    if (!window.confirm(`Delete Slot ${slot.slot_number}? This will also cancel all associated bookings.`)) return;
    try {
      const res = await fetch(`${API_BASE}/slots/${slot.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSlots(prev => prev.filter(s => s.id !== slot.id));
      showToast(`Slot ${slot.slot_number} deleted.`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredSlots = slots.filter(s =>
    s.slot_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.floor_level?.toLowerCase().includes(search.toLowerCase()) ||
    s.vehicle_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Control Panel</h1>
          <p className="text-sm text-gray-500 mt-1">Manage parking slots and system configuration</p>
        </div>
        {activeTab === 'slots' && (
          <button
            onClick={() => setModal('add')}
            className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Slot</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-900/60 border border-gray-800 p-1.5 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('slots')}
          className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'slots' ? 'bg-emerald-500 text-gray-950' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <Layers className="w-4 h-4" />
          <span>Slot Management</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'settings' ? 'bg-emerald-500 text-gray-950' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <Settings2 className="w-4 h-4" />
          <span>App Settings</span>
        </button>
      </div>

      {/* Tab: Slot Management */}
      {activeTab === 'slots' && (
        <div className="space-y-5">
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Slots', value: slots.length, color: 'text-white', bg: 'bg-gray-900/40 border-gray-800/80' },
              { label: 'Available', value: slots.filter(s => !s.is_booked).length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Booked', value: slots.filter(s => s.is_booked).length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
              { label: 'VIP Slots', value: slots.filter(s => s.is_premium).length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            ].map(stat => (
              <div key={stat.label} className={`rounded-2xl border p-4 text-center ${stat.bg}`}>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by slot number, floor, or vehicle type..."
              className="w-full bg-gray-900/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition text-sm pl-10"
            />
            <ParkingSquare className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
          </div>

          {/* Slots Table */}
          <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Slot</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Floor</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">VIP</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-500">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <span>Loading slots...</span>
                      </div>
                    </td></tr>
                  ) : filteredSlots.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-500">No slots found.</td></tr>
                  ) : filteredSlots.map((slot, i) => (
                    <tr
                      key={slot.id}
                      className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition ${i % 2 === 0 ? 'bg-transparent' : 'bg-gray-900/20'}`}
                    >
                      <td className="px-5 py-3.5 font-bold text-white">{slot.slot_number}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">{slot.floor_level}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`flex items-center w-fit space-x-1 text-xs font-bold px-2 py-0.5 rounded border ${slot.vehicle_type === 'bike' ? 'bg-indigo-950/30 text-indigo-400 border-indigo-500/20' : 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20'}`}>
                          {slot.vehicle_type === 'bike' ? <Bike className="w-3 h-3" /> : <Car className="w-3 h-3" />}
                          <span>{slot.vehicle_type}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {slot.is_premium ? (
                          <span className="flex items-center w-fit space-x-1 text-xs font-bold px-2 py-0.5 rounded border bg-amber-950/30 text-amber-400 border-amber-500/20">
                            <Sparkles className="w-3 h-3" /><span>VIP</span>
                          </span>
                        ) : (
                          <span className="text-gray-600 text-xs">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`flex items-center w-fit space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${slot.is_booked ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${slot.is_booked ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                          <span>{slot.is_booked ? 'Occupied' : 'Available'}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setModal(slot)}
                            className="p-2 hover:bg-indigo-500/10 text-gray-400 hover:text-indigo-400 border border-transparent hover:border-indigo-500/20 rounded-lg transition"
                            title="Edit slot"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(slot)}
                            className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-transparent hover:border-red-500/20 rounded-lg transition"
                            title="Delete slot"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: App Settings */}
      {activeTab === 'settings' && <AppSettingsPanel toast={showToast} />}

      {/* Modals */}
      {modal && modal !== 'add' && (
        <SlotModal slot={modal} onClose={() => setModal(null)} onSave={handleModalSave} />
      )}
      {modal === 'add' && (
        <SlotModal slot={null} onClose={() => setModal(null)} onSave={handleModalSave} />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-slideUp { animation: slideUp 0.25s ease-out; }
      `}</style>
    </div>
  );
}
