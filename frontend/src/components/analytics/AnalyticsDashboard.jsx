import React from 'react';
import { Activity, Clock, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import useAnalytics from '../../hooks/useAnalytics';
import OccupancyChart from './OccupancyChart';
import PredictionChart from './PredictionChart';
import HeatmapGrid from './HeatmapGrid';
import ModelAccuracy from './ModelAccuracy';

function KpiCard({ title, value, sub, icon: Icon, color }) {
  return (
    <div className={`bg-gray-900/40 border rounded-2xl p-5 flex flex-col gap-2 ${color}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</p>
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <p className="text-3xl font-extrabold text-white">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const {
    history,
    stats,
    predictions,
    heatmap,
    loading,
    error,
    dataWarning,
    timeRange,
    setTimeRange,
  } = useAnalytics();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-400">
        <p>Error loading analytics: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Warning Banner */}
      {dataWarning && (
        <div className="flex items-center space-x-3 bg-amber-950/30 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{dataWarning}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Current Occupancy"
          value={stats ? `${parseFloat(stats.current_occupancy_rate || 0).toFixed(1)}%` : '—'}
          icon={Activity}
          color="border-emerald-500/20"
        />
        <KpiCard
          title="Peak Hour Today"
          value={
            stats?.peak_hour_today !== null && stats?.peak_hour_today !== undefined
              ? `${stats.peak_hour_today}:00`
              : '—'
          }
          sub="busiest time"
          icon={Clock}
          color="border-amber-500/20"
        />
        <KpiCard
          title="Avg Occupancy 7d"
          value={stats ? `${parseFloat(stats.avg_occupancy_last_7_days || 0).toFixed(1)}%` : '—'}
          icon={TrendingUp}
          color="border-indigo-500/20"
        />
        <KpiCard
          title="Bookings Today"
          value={stats?.total_bookings_today ?? '—'}
          icon={Calendar}
          color="border-rose-500/20"
        />
      </div>

      {/* Live Occupancy Chart */}
      <OccupancyChart history={history} timeRange={timeRange} setTimeRange={setTimeRange} />

      {/* Prediction + Model Accuracy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PredictionChart predictions={predictions} />
        </div>
        <ModelAccuracy mae={stats?.mae_yesterday} />
      </div>

      {/* Heatmap */}
      <HeatmapGrid heatmap={heatmap} />
    </div>
  );
}
