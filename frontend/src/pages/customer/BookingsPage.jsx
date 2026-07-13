import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { CalendarCheck, QrCode, XCircle, Clock, CheckCircle2, ChevronRight, AlertCircle, Car, Bike } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function BookingsPage() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(location.pathname.includes('history') ? 'history' : 'upcoming'); // 'upcoming' | 'history'

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/bookings/my`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const data = await res.json();
      setBookings(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const handleCancelBooking = async (bookingId, slotNumber) => {
    if (!window.confirm(`Are you sure you want to cancel your reservation for Slot ${slotNumber}?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status: 'cancelled' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel booking');
      await fetchMyBookings();
    } catch (err) {
      alert(`Error cancelling booking: ${err.message}`);
    }
  };

  // Filter bookings
  const upcomingBookings = bookings.filter(b => b.status === 'booked' || b.status === 'checked-in');
  const pastBookings = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

  const displayedBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4" />
        <p className="text-lg">Loading your bookings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-5">
        <div className="flex items-center space-x-3">
          <CalendarCheck className="text-emerald-500 w-6 h-6" />
          <h1 className="text-2xl font-extrabold text-white">My Bookings</h1>
        </div>
        <Link
          to="/customer/parking"
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold rounded-xl text-sm transition"
        >
          Book New Slot
        </Link>
      </div>

      {error && (
        <div className="flex items-center space-x-3 bg-red-950/30 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition duration-200 ${
            activeTab === 'upcoming'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Active & Upcoming ({upcomingBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition duration-200 ${
            activeTab === 'history'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Past Reservations ({pastBookings.length})
        </button>
      </div>

      {/* List */}
      {displayedBookings.length === 0 ? (
        <div className="text-center py-16 bg-gray-900/20 border border-gray-900 border-dashed rounded-3xl p-8 max-w-xl mx-auto">
          <CalendarCheck className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">No bookings found</h3>
          <p className="text-sm text-gray-400 mb-6">
            {activeTab === 'upcoming'
              ? "You don't have any active or upcoming parking reservations."
              : "No historical reservation logs found."}
          </p>
          {activeTab === 'upcoming' && (
            <Link
              to="/customer/parking"
              className="px-5 py-2.5 bg-gray-900 border border-gray-800 hover:border-gray-700 text-white font-medium rounded-xl transition inline-block text-sm"
            >
              Browse Available Slots
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedBookings.map(booking => {
            const isCar = booking.vehicle_type === 'car';
            const statusColors = {
              'booked': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
              'checked-in': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              'completed': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
              'cancelled': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            };

            return (
              <div
                key={booking.id}
                className="bg-gray-900/40 border border-gray-900 hover:border-gray-800/80 rounded-2xl p-5 transition duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${statusColors[booking.status] || ''}`}>
                        {booking.status || 'booked'}
                      </span>
                      {booking.is_premium && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
                          VIP
                        </span>
                      )}
                    </div>
                    {isCar ? <Car className="w-5 h-5 text-gray-500" /> : <Bike className="w-5 h-5 text-gray-500" />}
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">Slot {booking.slot_number}</h3>
                  <p className="text-sm text-gray-400 mb-4">Floor: <span className="text-gray-200 font-semibold">{booking.floor_level}</span></p>

                  <div className="space-y-2 text-xs text-gray-400 border-t border-gray-800/60 pt-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1.5 text-gray-500" /> Start</span>
                      <span className="text-gray-300 font-medium">{new Date(booking.start_time).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1.5 text-gray-500" /> End</span>
                      <span className="text-gray-300 font-medium">{new Date(booking.end_time).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {activeTab === 'upcoming' && (
                  <div className="flex space-x-3 pt-3 border-t border-gray-800/60">
                    {booking.status === 'booked' && (
                      <button
                        onClick={() => handleCancelBooking(booking.id, booking.slot_number)}
                        className="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/customer/qr?id=${booking.id}`)}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 shadow-md shadow-emerald-500/5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR Pass</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
