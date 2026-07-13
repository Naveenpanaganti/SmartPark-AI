import React from 'react';
import { Car, CalendarCheck, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function CustomerDashboard() {
  const { profile, user } = useAuth();
  const name = profile?.full_name ?? user?.email?.split('@')[0] ?? 'there';

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-extrabold text-white">Welcome back, {name} 👋</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your parking reservations from here.</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Booking', value: '—', icon: Car, color: 'emerald' },
          { label: 'Upcoming', value: '—', icon: CalendarCheck, color: 'indigo' },
          { label: 'Hours Parked', value: '—', icon: Clock, color: 'amber' },
          { label: 'Saved Spots', value: '—', icon: MapPin, color: 'rose' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`bg-gray-900/40 border border-${color}-500/20 rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
              <Icon className={`w-4 h-4 text-${color}-400`} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/customer/parking"
            className="bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 rounded-2xl p-5 flex items-center space-x-4 transition group">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/30 transition">
              <Car className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Find Parking</p>
              <p className="text-xs text-gray-400">Browse available slots</p>
            </div>
          </Link>
          <Link to="/customer/bookings"
            className="bg-gray-900/40 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 flex items-center space-x-4 transition group">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">My Bookings</p>
              <p className="text-xs text-gray-400">View active reservations</p>
            </div>
          </Link>
          <Link to="/customer/qr"
            className="bg-gray-900/40 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 flex items-center space-x-4 transition group">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">QR Pass</p>
              <p className="text-xs text-gray-400">Show at entry gate</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
