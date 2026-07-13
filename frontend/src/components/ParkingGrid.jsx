import React, { useState, useEffect } from 'react';
import { Car, Bike, Sparkles, User, Layers, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:3000/api';

export default function ParkingGrid() {
  const { role, getToken, user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for the booking form modal
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [userName, setUserName] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMessage, setBookingMessage] = useState(null);
  const [bookingError, setBookingError] = useState(null);

  useEffect(() => {
    if (user) setUserName(user.full_name || user.email || '');
  }, [user]);

  // Handle cancellation/deletion of a active booking (Manager only)
  const handleDeleteBooking = async (slotId, slotNumber) => {
    if (!window.confirm(`Are you sure you want to cancel the booking for Slot ${slotNumber}?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/slots/${slotId}/booking`, {
        method: 'DELETE',
        headers: {
          'x-user-role': role === 'manager' ? 'manager' : role
        }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel booking');
      }
      
      await fetchSlots();
    } catch (err) {
      alert(`Error cancelling booking: ${err.message}`);
    }
  };

  // Filter state (All floors, Floor 1, Floor 2, etc.)
  const [selectedFloor, setSelectedFloor] = useState('All');

  // Fetch slots from backend
  const fetchSlots = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/slots`);
      if (!res.ok) throw new Error('Failed to fetch parking slots');
      const data = await res.json();
      setSlots(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
    // Auto-refresh every 10 seconds to keep occupancy status in sync
    const interval = setInterval(fetchSlots, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle booking form submission
  const handleBookSlot = async (e) => {
    e.preventDefault();
    const bookingName = userName.trim() || user?.full_name || user?.email || 'Customer';

    try {
      setBookingLoading(true);
      setBookingError(null);
      setBookingMessage(null);

      const res = await fetch(`${API_BASE}/book`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': 'user'
        },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          user_name: bookingName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to book slot');
      }

      setBookingMessage(`Successfully booked Slot ${selectedSlot.slot_number}!`);
      setUserName('');
      // Refresh the grid immediately
      await fetchSlots();
      
      // Close modal after 1.5 seconds
      setTimeout(() => {
        setSelectedSlot(null);
        setBookingMessage(null);
      }, 1500);

    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  // Get unique list of floors
  const floors = ['All', ...new Set(slots.map(slot => slot.floor_level))].sort();

  // Filtered slots to display
  const filteredSlots = selectedFloor === 'All'
    ? slots
    : slots.filter(slot => slot.floor_level === selectedFloor);

  if (loading && slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
        <p className="text-lg">Loading parking slots...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-red-950/20 border border-red-800/30 rounded-2xl p-6 text-center max-w-xl mx-auto my-8">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-red-200 mb-2">Backend Connection Error</h3>
        <p className="text-red-400 mb-6">{error}</p>
        <button 
          onClick={fetchSlots}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition duration-150 shadow-lg shadow-red-900/30"
        >
          Try Reconnecting
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Floor Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-800 pb-5">
        <div className="flex items-center space-x-2">
          <Layers className="text-emerald-500 w-5 h-5" />
          <h2 className="text-lg font-semibold text-gray-200">Floor Filter</h2>
        </div>
        <div className="flex space-x-2 bg-gray-900/60 p-1.5 rounded-xl border border-gray-800">
          {floors.map(floor => (
            <button
              key={floor}
              onClick={() => setSelectedFloor(floor)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition duration-200 ${
                selectedFloor === floor
                  ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {floor === 'All' ? 'All Floors' : floor}
            </button>
          ))}
        </div>
      </div>

      {/* Slots Summary Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Total Slots</p>
          <p className="text-2xl font-bold text-white">{slots.length}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider mb-1">Available</p>
          <p className="text-2xl font-bold text-emerald-400">{slots.filter(s => !s.is_booked).length}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
          <p className="text-xs text-red-400 font-medium uppercase tracking-wider mb-1">Booked</p>
          <p className="text-2xl font-bold text-red-400">{slots.filter(s => s.is_booked).length}</p>
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-center">
          <p className="text-xs text-indigo-400 font-medium uppercase tracking-wider mb-1">Premium</p>
          <p className="text-2xl font-bold text-indigo-400">{slots.filter(s => s.is_premium).length}</p>
        </div>
      </div>

      {/* Grid of Slots */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {filteredSlots.map(slot => (
          <div
            key={slot.id}
            className={`relative rounded-2xl p-5 border transition duration-300 flex flex-col justify-between h-44 shadow-lg ${
              slot.vehicle_type === 'bike' ? 'w-1/2' : 'w-full'
            } ${
              slot.is_booked
                ? 'bg-red-950/15 border-red-500/30 hover:border-red-500/50 shadow-red-950/5'
                : 'bg-emerald-950/15 border-emerald-500/30 hover:border-emerald-500/50 shadow-emerald-950/5'
            }`}
          >
            {/* Slot Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold px-2 py-0.5 bg-gray-900 border border-gray-800 rounded text-gray-400">
                    {slot.floor_level}
                  </span>
                  <span className={`text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border ${
                    slot.vehicle_type === 'bike'
                      ? 'bg-indigo-950/30 text-indigo-400 border-indigo-500/20'
                      : 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {slot.vehicle_type}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mt-2">Slot {slot.slot_number}</h3>
              </div>
              <div className="flex items-center space-x-1">
                {slot.is_premium && (
                  <span className="flex items-center text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded">
                    <Sparkles className="w-3 h-3 mr-0.5" />
                    VIP
                  </span>
                )}
                {slot.vehicle_type === 'bike' ? (
                  <Bike className={`w-6 h-6 ${slot.is_booked ? 'text-red-500' : 'text-emerald-500'}`} />
                ) : (
                  <Car className={`w-6 h-6 ${slot.is_booked ? 'text-red-500' : 'text-emerald-500'}`} />
                )}
              </div>
            </div>

            {/* Slot Info / Action */}
            <div className="mt-4 pt-4 border-t border-gray-800/40">
              {slot.is_booked ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-sm font-semibold">Booked / Occupied</span>
                  </div>
                  {role === 'manager' && (
                    <button
                      onClick={() => handleDeleteBooking(slot.id, slot.slot_number)}
                      className="w-full py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-semibold rounded-xl text-xs transition duration-200 border border-red-500/20 flex items-center justify-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Booking</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    setSelectedSlot(slot);
                    setBookingError(null);
                    setBookingMessage(null);
                  }}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-semibold rounded-xl text-sm transition duration-200 shadow-md shadow-emerald-500/10"
                >
                  Book Slot
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Booking Form Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center">
              {selectedSlot.vehicle_type === 'bike' ? (
                <Bike className="w-6 h-6 text-emerald-500 mr-2" />
              ) : (
                <Car className="w-6 h-6 text-emerald-500 mr-2" />
              )}
              Book Slot {selectedSlot.slot_number}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Confirm booking for a <span className="text-emerald-400 font-semibold uppercase">{selectedSlot.vehicle_type}</span> slot on floor <span className="text-emerald-400 font-semibold">{selectedSlot.floor_level}</span>
              {selectedSlot.is_premium && <span className="text-amber-400 font-semibold"> (Premium)</span>}.
            </p>

            <form onSubmit={handleBookSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center">
                  <User className="w-4 h-4 mr-1 text-gray-400" />
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition duration-150"
                  disabled={bookingLoading}
                />
              </div>

              {bookingError && (
                <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {bookingError}
                </div>
              )}

              {bookingMessage && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
                  {bookingMessage}
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition duration-150"
                  disabled={bookingLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold rounded-xl transition duration-150 flex items-center justify-center shadow-lg shadow-emerald-500/10"
                  disabled={bookingLoading || !!bookingMessage}
                >
                  {bookingLoading ? (
                    <span className="w-5 h-5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    'Confirm Booking'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
