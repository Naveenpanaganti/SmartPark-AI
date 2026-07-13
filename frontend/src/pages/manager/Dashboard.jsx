import React from 'react';
import { BarChart2, TrendingUp, DollarSign, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AnalyticsDashboard from '../../components/analytics/AnalyticsDashboard';

export default function ManagerDashboard() {
  const { profile, user } = useAuth();
  const name = profile?.full_name ?? user?.email?.split('@')[0] ?? 'Manager';

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center space-x-3 mb-1">
          <BarChart2 className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-extrabold text-white">Manager Dashboard</h1>
        </div>
        <p className="text-gray-400 text-sm">Welcome, <span className="text-amber-400">{name}</span> · Full system access</p>
      </div>

      {/* Analytics */}
      <AnalyticsDashboard />
    </div>
  );
}
