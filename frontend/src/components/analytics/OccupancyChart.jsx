import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function OccupancyChart({ history, timeRange, setTimeRange }) {
  const ranges = ['1h', '6h', '24h', '7d'];
  const data = history.map(s => ({
    time: new Date(s.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    occupancy: parseFloat(s.occupancy_rate),
    floor: s.floor_level,
  }));

  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white">Live Occupancy Trend</h3>
        <div className="flex space-x-1 bg-gray-900 p-1 rounded-lg border border-gray-800">
          {ranges.map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                timeRange === r
                  ? 'bg-emerald-500 text-gray-950'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} stroke="#6b7280" tick={{ fontSize: 11 }} unit="%" />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#d1d5db' }}
            itemStyle={{ color: '#10b981' }}
            formatter={v => [`${v}%`, 'Occupancy']}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="occupancy"
            name="Occupancy %"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
