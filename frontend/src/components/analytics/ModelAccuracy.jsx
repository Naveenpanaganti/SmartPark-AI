import React from 'react';
import { Target } from 'lucide-react';

export default function ModelAccuracy({ mae }) {
  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center space-x-3 mb-3">
        <Target className="w-5 h-5 text-indigo-400" />
        <h3 className="text-base font-bold text-white">Model Accuracy</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Mean Absolute Error (MAE) of yesterday&apos;s predictions vs actual occupancy.
      </p>
      {mae !== null && mae !== undefined ? (
        <div className="text-center">
          <p className="text-4xl font-extrabold text-indigo-400">
            {mae.toFixed(2)}
            <span className="text-lg text-gray-400">%</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">Lower is better — ±5% is excellent</p>
        </div>
      ) : (
        <p className="text-center text-sm text-gray-500 italic">
          Not enough data yet.<br />Run the app for 2+ days.
        </p>
      )}
    </div>
  );
}
