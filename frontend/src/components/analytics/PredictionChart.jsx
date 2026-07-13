import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ErrorBar,
  Legend,
  Cell,
} from 'recharts';

export default function PredictionChart({ predictions }) {
  const data = predictions.map(p => ({
    hour: `${p.hour}:00`,
    predicted: p.predicted_occupancy_rate,
    errorVal: [
      p.predicted_occupancy_rate - p.confidence_lower,
      p.confidence_upper - p.predicted_occupancy_rate,
    ],
    is_peak: p.is_peak,
  }));

  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
      <h3 className="text-base font-bold text-white mb-4">24-Hour Demand Forecast</h3>
      <p className="text-xs text-gray-400 mb-4">
        Orange bars = peak hours (≥70% occupancy). Error bars show 95% confidence interval.
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="hour" stroke="#6b7280" tick={{ fontSize: 10 }} />
          <YAxis domain={[0, 100]} stroke="#6b7280" tick={{ fontSize: 11 }} unit="%" />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#d1d5db' }}
            formatter={v => [`${v}%`, 'Predicted']}
          />
          <Bar dataKey="predicted" name="Predicted Occupancy" radius={[4, 4, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.is_peak ? '#f59e0b' : '#3b82f6'} />
            ))}
            <ErrorBar dataKey="errorVal" width={4} strokeWidth={2} stroke="#9ca3af" direction="y" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
