import React, { useState, useEffect } from 'react';
import { Shield, Car, CheckCircle, XCircle, Activity, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function SecurityDashboard() {
  const { profile, user, getToken } = useAuth();
  const name = profile?.full_name ?? user?.email?.split('@')[0] ?? 'Officer';

  const [stats, setStats] = useState({
    activeVehicles: 0,
    entriesToday: 0,
    exitsToday: 0,
    occupancyRate: 0,
    loading: true
  });

  useEffect(() => {
    async function loadSecurityStats() {
      try {
        // 1. Fetch all bookings
        const bookingsRes = await fetch(`${API_BASE}/all-bookings`, {
          headers: { 'Authorization': `Bearer ${getToken()}`, 'x-user-role': 'manager' }
        });
        
        let activeVehicles = 0;
        let entriesToday = 0;
        let exitsToday = 0;

        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);

        if (bookingsRes.ok) {
          const bookings = await bookingsRes.json();
          activeVehicles = bookings.filter(b => b.status === 'checked-in').length;
          
          bookings.forEach(b => {
            const startTime = new Date(b.start_time);
            const endTime = b.end_time ? new Date(b.end_time) : null;
            
            // Check-in processed today
            if (b.status === 'checked-in' && startTime >= todayStart) {
              entriesToday++;
            }
            // Checkout processed today
            if (b.status === 'completed' && endTime && endTime >= todayStart) {
              exitsToday++;
              entriesToday++; // It entered today as well, or at least completed today
            }
          });
        }

        // 2. Fetch slot statuses to compute live occupancy rate
        const slotsRes = await fetch(`${API_BASE}/slots`);
        let occupancyRate = 0;
        if (slotsRes.ok) {
          const slots = await slotsRes.json();
          const total = slots.length;
          const booked = slots.filter(s => s.is_booked).length;
          occupancyRate = total > 0 ? Math.round((booked / total) * 100) : 0;
        }

        setStats({
          activeVehicles,
          entriesToday,
          exitsToday,
          occupancyRate,
          loading: false
        });

      } catch (err) {
        console.error('Error loading security stats:', err);
        setStats(s => ({ ...s, loading: false }));
      }
    }

    loadSecurityStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center space-x-3 mb-1 animate-fadeIn">
          <Shield className="w-6 h-6 text-blue-400" />
          <h1 className="text-2xl font-extrabold text-white">Security Control</h1>
        </div>
        <p className="text-gray-400 text-sm font-medium">Logged in as <span className="text-blue-400 font-semibold">{name}</span> · Live digital twin sensor feed active</p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Vehicles', value: stats.loading ? '...' : stats.activeVehicles, icon: Car, color: 'blue', subtext: 'Currently inside' },
          { label: 'Entries Today', value: stats.loading ? '...' : stats.entriesToday, icon: CheckCircle, color: 'emerald', subtext: 'Total check-ins' },
          { label: 'Exits Today', value: stats.loading ? '...' : stats.exitsToday, icon: XCircle, color: 'rose', subtext: 'Total check-outs' },
          { label: 'Occupancy Rate', value: stats.loading ? '...%' : `${stats.occupancyRate}%`, icon: Activity, color: 'amber', subtext: 'Live lot fullness' },
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

      {/* Operations */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Operations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/security/entry"
            className="bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-5 flex items-center justify-between transition group duration-200">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Vehicle Entry</p>
                <p className="text-xs text-gray-400">Validate booking & allow entry check-in</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition duration-200" />
          </Link>
          
          <Link to="/security/exit"
            className="bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 rounded-2xl p-5 flex items-center justify-between transition group duration-200">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition">
                <XCircle className="w-5 h-5 text-rose-455 text-rose-400" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Vehicle Exit</p>
                <p className="text-xs text-gray-400">Process exit check-out & vacant slot</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-rose-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition duration-200" />
          </Link>
        </div>
      </div>
    </div>
  );
}
