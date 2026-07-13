import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Car, Shield, BarChart3, QrCode, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function LandingPage() {
  const { isAuthenticated, getDashboardPath } = useAuth();
  const [stats, setStats] = useState({ total: 0, available: 0, loading: true });

  useEffect(() => {
    async function fetchLiveStats() {
      try {
        const res = await fetch(`${API_BASE}/slots`);
        if (res.ok) {
          const slots = await res.json();
          const total = slots.length;
          const available = slots.filter(s => !s.is_booked).length;
          setStats({ total, available, loading: false });
        } else {
          setStats(s => ({ ...s, loading: false }));
        }
      } catch (err) {
        setStats(s => ({ ...s, loading: false }));
      }
    }
    fetchLiveStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 selection:bg-emerald-500 selection:text-gray-950">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10" />

      {/* Header */}
      <header className="border-b border-gray-900 bg-gray-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-center">
              <Car className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">
              Park<span className="text-emerald-500">Smart</span>
            </span>
          </div>

          <nav className="hidden md:flex space-x-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-emerald-400 transition">Features</a>
            <a href="#live-occupancy" className="hover:text-emerald-400 transition">Live Occupancy</a>
            <a href="#about" className="hover:text-emerald-400 transition">About</a>
          </nav>

          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <Link
                to={getDashboardPath()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-semibold rounded-xl text-sm transition shadow-md shadow-emerald-500/10 flex items-center space-x-1"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white px-3 py-2 transition">
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold rounded-xl text-sm transition shadow-md shadow-emerald-500/10"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Real-time Occupancy Active</span>
        </span>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
          Intelligent Mall Parking <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">
            Reimagined with AI
          </span>
        </h1>
        
        <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto">
          ParkSmart simplifies booking slots in real time and utilizes advanced weighted predictions to optimize occupancy management. Check status, reserve slots, and pass security in seconds.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to={isAuthenticated ? getDashboardPath() : "/register"}
            className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold rounded-xl text-base transition shadow-xl shadow-emerald-500/10 flex items-center space-x-2"
          >
            <span>Book a Slot Now</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="#live-occupancy"
            className="px-6 py-3.5 bg-gray-900 border border-gray-800 hover:border-gray-700 text-white font-medium rounded-xl text-base transition"
          >
            View Live Slots
          </a>
        </div>
      </section>

      {/* Live Occupancy Status Card */}
      <section id="live-occupancy" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 scroll-mt-20">
        <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-8 backdrop-blur max-w-3xl mx-auto shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Live Availability Tracker</h2>
              <p className="text-sm text-gray-400">Direct query snapshot from our digital twin parking sensors.</p>
            </div>
            
            <div className="flex items-center space-x-6">
              {stats.loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500" />
                  <span className="text-gray-400 text-sm">Querying sensors...</span>
                </div>
              ) : (
                <>
                  <div className="text-center bg-gray-950 border border-gray-800/80 rounded-2xl px-6 py-4 min-w-[120px]">
                    <p className="text-3xl font-extrabold text-emerald-400">{stats.available}</p>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-1">Available</p>
                  </div>
                  <div className="text-center bg-gray-950 border border-gray-800/80 rounded-2xl px-6 py-4 min-w-[120px]">
                    <p className="text-3xl font-extrabold text-white">{stats.total}</p>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-1">Total Slots</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white">Full-Stack Innovation for Mall Parking</h2>
          <p className="text-sm text-gray-400 mt-2">Engineered to bring transparency, efficiency, and intelligence to drivers and operators alike.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Instant Reservations",
              desc: "Select vehicle specific floor layouts and complete booking with instantaneous dashboard updates.",
              icon: Car,
              color: "emerald"
            },
            {
              title: "Digital QR Pass",
              desc: "Get automated QR validation tickets to present at gates for contactless scan-in and scan-out processing.",
              icon: QrCode,
              color: "indigo"
            },
            {
              title: "Occupancy Heatmaps",
              desc: "Observe historical hourly trends and floor-level occupancy metrics across a 7x24 weekly distribution chart.",
              icon: BarChart3,
              color: "amber"
            },
            {
              title: "Predictive Analytics",
              desc: "Forecasts next 24 hours of parking demand using custom Weighted Moving Average algorithms with 95% Confidence Intervals.",
              icon: Shield,
              color: "rose"
            }
          ].map(({ title, desc, icon: Icon, color }) => (
            <div key={title} className="bg-gray-900/40 border border-gray-900 hover:border-gray-800 p-6 rounded-2xl transition duration-300">
              <div className={`w-10 h-10 bg-${color}-500/10 border border-${color}-500/20 rounded-xl flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 text-${color}-400`} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900 bg-gray-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <Car className="w-5 h-5 text-emerald-500" />
            <span className="font-bold text-white">ParkSmart</span>
          </div>
          <p>© 2026 ParkSmart Hackathon. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
