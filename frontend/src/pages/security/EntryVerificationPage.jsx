import React, { useState, useEffect } from 'react';
import { Shield, QrCode, CheckCircle, AlertCircle, Clock, User, Car, Bike, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function EntryVerificationPage() {
  const { getToken } = useAuth();
  const [pendingBookings, setPendingBookings] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [bookingDetail, setBookingDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Fetch pending reservations
  const fetchPending = async () => {
    try {
      const res = await fetch(`${API_BASE}/all-bookings`, {
        headers: { 'Authorization': `Bearer ${getToken()}`, 'x-user-role': 'manager' }
      });
      if (res.ok) {
        const list = await res.json();
        // Filters where status is 'booked' (not checked-in/completed/cancelled)
        const booked = list.filter(b => b.status === 'booked' || !b.status);
        setPendingBookings(booked);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  // Fetch specific booking detail when selected
  useEffect(() => {
    if (!selectedId) {
      setBookingDetail(null);
      return;
    }

    async function loadDetail() {
      try {
        setLoading(true);
        setError(null);
        setMessage(null);
        const res = await fetch(`${API_BASE}/bookings/${selectedId}`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Failed to load booking');
        const data = await res.json();
        setBookingDetail(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [selectedId]);

  const handleApproveEntry = async () => {
    if (!bookingDetail) return;
    try {
      setActionLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/bookings/${bookingDetail.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status: 'checked-in' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to check-in booking');
      
      setMessage(`Entry Approved! Vehicle has been checked in to Slot ${bookingDetail.slot_number}.`);
      setBookingDetail(data);
      setSelectedId('');
      await fetchPending();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3 border-b border-gray-800 pb-5">
        <Shield className="text-emerald-500 w-6 h-6" />
        <div>
          <h1 className="text-2xl font-extrabold text-white">Vehicle Entry Portal</h1>
          <p className="text-gray-400 text-xs mt-0.5">Verify booking passes and check vehicles in at entry gates.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left side: Simulated QR Scanner */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center">
              <QrCode className="w-4 h-4 mr-1.5 text-emerald-400" />
              Simulated Webcam Scanner
            </h3>
            
            {/* Viewport Frame */}
            <div className="relative aspect-square bg-gray-950 rounded-2xl border border-gray-800 flex items-center justify-center overflow-hidden">
              {/* Scan grid animation */}
              <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
              <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-md shadow-emerald-500/80 animate-scan z-10" />
              
              {bookingDetail ? (
                <div className="text-center p-4 z-20 animate-fadeIn">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-8 h-8 text-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-sm font-bold text-white">QR Code Scan Successful</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-1">ID: #{bookingDetail.id}</p>
                </div>
              ) : (
                <div className="text-center p-6 text-gray-500 z-20">
                  <QrCode className="w-12 h-12 mx-auto mb-3 text-gray-700 animate-pulse" />
                  <p className="text-xs">Align customer QR code pass within viewport to begin auto-verification</p>
                </div>
              )}
            </div>

            {/* Select simulator dropdown */}
            <div className="mt-5 space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Simulate Scan (Select Pass)</label>
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="">-- Click here to select a customer's pass --</option>
                {pendingBookings.map(b => (
                  <option key={b.id} value={b.id}>
                    Slot {b.slot_number} (Floor: {b.floor_level}) - {b.user_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right side: Verification Results */}
        <div className="lg:col-span-7">
          {error && (
            <div className="flex items-center space-x-3 bg-red-950/30 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm mb-4">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="flex items-center space-x-3 bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-4 text-emerald-400 text-sm mb-4">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {loading ? (
            <div className="bg-gray-900/40 border border-gray-900 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3" />
              <p className="text-gray-400 text-sm">Querying booking logs...</p>
            </div>
          ) : bookingDetail ? (
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
              {bookingDetail.is_premium && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl" />
              )}
              
              <div>
                <h3 className="text-lg font-bold text-white flex items-center mb-1">
                  Reservation Validated
                  {bookingDetail.is_premium && (
                    <span className="flex items-center text-[9px] font-extrabold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded ml-2">
                      <Sparkles className="w-3 h-3 mr-0.5" />
                      VIP
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-400">Match the details below with the physical vehicle entering the gate.</p>
              </div>

              {/* Grid detail */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-gray-800/60 pt-5">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Driver / Customer</span>
                  <p className="text-sm font-bold text-white flex items-center">
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    {bookingDetail.user_name}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Parking Slot Allocation</span>
                  <p className="text-sm font-bold text-emerald-400 flex items-center">
                    {bookingDetail.vehicle_type === 'car' ? <Car className="w-4 h-4 mr-2" /> : <Bike className="w-4 h-4 mr-2" />}
                    Slot {bookingDetail.slot_number} (Floor: {bookingDetail.floor_level})
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Reserved Start Window</span>
                  <p className="text-sm font-bold text-white flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                    {new Date(bookingDetail.start_time).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Reserved End Window</span>
                  <p className="text-sm font-bold text-white flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                    {new Date(bookingDetail.end_time).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Status details */}
              <div className="border-t border-gray-800/60 pt-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Current State</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      bookingDetail.status === 'checked-in'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {bookingDetail.status || 'booked'}
                    </span>
                  </div>
                </div>

                {/* Approve Button */}
                {bookingDetail.status === 'checked-in' ? (
                  <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400 text-xs font-semibold flex items-center space-x-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span>Checked In & Active</span>
                  </div>
                ) : (
                  <button
                    onClick={handleApproveEntry}
                    disabled={actionLoading}
                    className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold rounded-xl text-xs transition flex items-center justify-center shadow-lg shadow-emerald-500/10"
                  >
                    {actionLoading ? (
                      <span className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Approve Entry & Check-In'
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-900/20 border border-gray-900 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center min-h-[300px] text-center max-w-lg mx-auto">
              <QrCode className="w-12 h-12 text-gray-700 mb-3" />
              <h3 className="text-base font-bold text-white mb-1">Awaiting Scanner Input</h3>
              <p className="text-xs text-gray-400 max-w-sm">
                No pass selected. Use the simulation controls on the left to trigger a booking verification scan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
