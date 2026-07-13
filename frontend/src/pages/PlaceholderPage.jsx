import React from 'react';
import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
      <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center">
        <Construction className="w-8 h-8 text-amber-400" />
      </div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="text-gray-400 text-sm max-w-sm">This page is under construction and will be available soon.</p>
    </div>
  );
}
