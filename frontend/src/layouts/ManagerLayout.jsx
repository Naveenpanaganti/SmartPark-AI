import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Car, BarChart2, DollarSign, ParkingCircle,
  Users, UserCog, FileText, LogOut, Menu, X, User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/manager/dashboard',  icon: BarChart2,     label: 'Analytics' },
  { to: '/manager/revenue',    icon: DollarSign,    label: 'Revenue' },
  { to: '/manager/slots',      icon: ParkingCircle, label: 'Slot Management' },
  { to: '/manager/users',      icon: Users,         label: 'User Management' },
  { to: '/manager/staff',      icon: UserCog,       label: 'Staff Management' },
  { to: '/manager/reports',    icon: FileText,      label: 'System Reports' },
];

export default function ManagerLayout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>

        <div className="h-16 flex items-center px-6 border-b border-gray-800 shrink-0">
          <Car className="w-6 h-6 text-amber-400 mr-2.5" />
          <span className="text-lg font-extrabold text-white">
            Park<span className="text-amber-400">Smart</span>
          </span>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <User className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{profile?.full_name ?? user?.email?.split('@')[0]}</p>
              <p className="text-[11px] text-amber-400 font-medium uppercase tracking-wide">Manager</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150
                 ${isActive ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`
              }>
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <button onClick={handleSignOut}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-150">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-gray-900/80 backdrop-blur border-b border-gray-800 flex items-center px-4 lg:hidden shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white mr-4">
            <Menu className="w-5 h-5" />
          </button>
          <Car className="w-5 h-5 text-amber-400 mr-2" />
          <span className="font-bold text-white">Manager<span className="text-amber-400"> Portal</span></span>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
