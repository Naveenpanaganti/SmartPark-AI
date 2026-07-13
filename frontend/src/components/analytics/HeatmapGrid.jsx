import React from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getColor(value) {
  // 0 = green, 50 = yellow-orange, 100 = red
  const r = Math.round(Math.min(255, value * 5.1));
  const g = Math.round(Math.max(0, 255 - value * 3.5));
  return `rgb(${r},${g},40)`;
}

export default function HeatmapGrid({ heatmap }) {
  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
      <h3 className="text-base font-bold text-white mb-1">Weekly Occupancy Heatmap</h3>
      <p className="text-xs text-gray-400 mb-4">Average occupancy by day &amp; hour. Green = low, red = high.</p>
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Hour header */}
          <div className="flex ml-10 mb-1">
            {HOURS.map(h => (
              <div key={h} className="flex-1 text-center text-[9px] text-gray-500">{h}</div>
            ))}
          </div>
          {DAYS.map((day, d) => (
            <div key={d} className="flex items-center mb-0.5">
              <div className="w-10 text-xs text-gray-400 text-right pr-2 shrink-0">{day}</div>
              {HOURS.map(h => {
                const val = heatmap?.[d]?.[h] ?? 0;
                return (
                  <div
                    key={h}
                    className="flex-1 h-6 rounded-sm mx-px cursor-default"
                    style={{ backgroundColor: getColor(val) }}
                    title={`${day} ${h}:00 — ${val.toFixed(1)}%`}
                  />
                );
              })}
            </div>
          ))}
          {/* Color scale legend */}
          <div className="flex items-center mt-3 space-x-2">
            <span className="text-xs text-gray-400">0%</span>
            <div
              className="flex-1 h-2 rounded"
              style={{ background: 'linear-gradient(to right, rgb(0,255,40), rgb(255,128,40), rgb(255,0,40))' }}
            />
            <span className="text-xs text-gray-400">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
