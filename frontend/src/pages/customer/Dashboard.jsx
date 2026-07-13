import React, { useState, useEffect } from 'react';
import { Car, CalendarCheck, Clock, MapPin, Sparkles, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function CustomerDashboard() {
  const { profile, user, getToken } = useAuth();
  const name = profile?.full_name ?? user?.email?.split('@')[0] ?? 'there';

  const [myBookings, setMyBookings] = useState([]);
  const [availableSlotsCount, setAvailableSlotsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        // 1. Fetch user bookings
        const bookingsRes = await fetch(`${API_BASE}/bookings/my`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (bookingsRes.ok) {
          const bookings = await bookingsRes.json();
          setMyBookings(bookings);
        }

        // 2. Fetch all slots to count available ones
        const slotsRes = await fetch(`${API_BASE}/slots`);
        if (slotsRes.ok) {
          const slots = await slotsRes.json();
          const avail = slots.filter(s => !s.is_booked).length;
          setAvailableSlotsCount(avail);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Compute dynamic stats
  const activeBooking = myBookings.find(b => b.status === 'checked-in');
  const upcomingCount = myBookings.filter(b => b.status === 'booked').length;
  
  // Calculate hours parked if currently checked-in
  const getHoursParked = () => {
    if (!activeBooking) return '0h';
    const start = new Date(activeBooking.start_time);
    const diffMs = Math.abs(new Date() - start);
    const hrs = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
  };

  const activeValue = activeBooking ? `Slot ${activeBooking.slot_number}` : 'None';
  const hoursParkedValue = activeBooking ? getHoursParked() : '—';

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-extrabold text-white animate-fadeIn">Welcome back, {name} 👋</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your parking reservations and view passes in real time.</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Booking', value: activeValue, icon: Car, color: 'emerald', subtext: activeBooking ? activeBooking.floor_level : 'No active check-in' },
          { label: 'Upcoming', value: upcomingCount, icon: CalendarCheck, color: 'indigo', subtext: 'Reserved passes' },
          { label: 'Hours Parked', value: hoursParkedValue, icon: Clock, color: 'amber', subtext: activeBooking ? 'Current session' : 'N/A' },
          { label: 'Available Slots', value: loading ? '...' : availableSlotsCount, icon: MapPin, color: 'rose', subtext: 'In the mall' },
        ].map(({ label, value, icon: Icon, color, subtext }) => (
          <div key={label} className="bg-gray-900/40 border border-gray-900 hover:border-gray-800 rounded-2xl p-5 transition duration-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
              <Icon className={`w-4 h-4 text-${color}-400`} />
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
            <p className="text-[10px] text-gray-500 mt-1 font-medium">{subtext}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/customer/parking"
            className="bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-5 flex items-center space-x-4 transition duration-200 group">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition">
              <Car className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Find Parking</p>
              <p className="text-xs text-gray-400">Browse available slots & book</p>
            </div>
          </Link>
          <Link to="/customer/bookings"
            className="bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl p-5 flex items-center space-x-4 transition duration-200 group">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition">
              <CalendarCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">My Bookings</p>
              <p className="text-xs text-gray-400">View active reservations</p>
            </div>
          </Link>
          <Link to="/customer/qr"
            className="bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-5 flex items-center space-x-4 transition duration-200 group">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition">
              <MapPin className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">QR Pass</p>
              <p className="text-xs text-gray-400">Show pass at gate sensors</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
