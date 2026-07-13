import React from 'react';
import { Shield, Car, CheckCircle, XCircle, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SecurityDashboard() {
  const { profile, user } = useAuth();
  const name = profile?.full_name ?? user?.email?.split('@')[0] ?? 'Officer';

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center space-x-3 mb-1">
          <Shield className="w-6 h-6 text-blue-400" />
          <h1 className="text-2xl font-extrabold text-white">Security Control</h1>
        </div>
        <p className="text-gray-400 text-sm">Logged in as <span className="text-blue-400">{name}</span> · Live monitoring active</p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Vehicles', value: '—', icon: Car, color: 'blue' },
          { label: 'Entries Today', value: '—', icon: CheckCircle, color: 'emerald' },
          { label: 'Exits Today', value: '—', icon: XCircle, color: 'rose' },
          { label: 'Occupancy', value: '—%', icon: Activity, color: 'amber' },
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
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Operations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/security/entry"
            className="bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-5 flex items-center space-x-4 transition">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Vehicle Entry</p>
              <p className="text-xs text-gray-400">Verify and allow entry</p>
            </div>
          </Link>
          <Link to="/security/exit"
            className="bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 rounded-2xl p-5 flex items-center space-x-4 transition">
            <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Vehicle Exit</p>
              <p className="text-xs text-gray-400">Process exit and payment</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
