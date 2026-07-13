import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PublicRoute from './components/auth/PublicRoute';
import Register from './pages/auth/Register';
import Login from './pages/auth/Login';

// Layouts
import CustomerLayout from './layouts/CustomerLayout';
import SecurityLayout from './layouts/SecurityLayout';
import ManagerLayout from './layouts/ManagerLayout';

// Public pages
import LandingPage from './pages/LandingPage';

// Customer pages
import CustomerDashboard from './pages/customer/Dashboard';
import BookingsPage from './pages/customer/BookingsPage';
import QRPage from './pages/customer/QRPage';

// Security pages
import SecurityDashboard from './pages/security/Dashboard';
import EntryVerificationPage from './pages/security/EntryVerificationPage';
import ExitVerificationPage from './pages/security/ExitVerificationPage';

// Manager pages
import ManagerDashboard from './pages/manager/Dashboard';
import AdminSlotsPage from './pages/manager/AdminSlotsPage';
import UserManagementPage from './pages/manager/UserManagementPage';
import StaffManagementPage from './pages/manager/StaffManagementPage';

// Shared placeholder
import PlaceholderPage from './pages/PlaceholderPage';

// Existing components (preserved)
import ParkingGrid from './components/ParkingGrid';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public routes ──────────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={
            <PublicRoute><Register /></PublicRoute>
          } />
          <Route path="/login" element={
            <PublicRoute><Login /></PublicRoute>
          } />

          {/* ── Customer routes ─────────────────────────────────── */}
          <Route path="/customer" element={
            <ProtectedRoute role="customer"><CustomerLayout /></ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="parking"   element={<div className="bg-gray-900/20 border border-gray-900/60 rounded-3xl p-6"><ParkingGrid /></div>} />
            <Route path="bookings"  element={<BookingsPage />} />
            <Route path="history"   element={<BookingsPage />} />
            <Route path="qr"        element={<QRPage />} />
            <Route path="profile"   element={<PlaceholderPage title="Profile Settings" />} />
          </Route>

          {/* ── Security routes ─────────────────────────────────── */}
          <Route path="/security" element={
            <ProtectedRoute role="security"><SecurityLayout /></ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"  element={<SecurityDashboard />} />
            <Route path="entry"      element={<EntryVerificationPage />} />
            <Route path="exit"       element={<ExitVerificationPage />} />
            <Route path="scan"       element={<EntryVerificationPage />} />
            <Route path="logs"       element={<PlaceholderPage title="Activity Logs" />} />
            <Route path="occupancy"  element={<PlaceholderPage title="Occupancy Overview" />} />
          </Route>

          {/* ── Manager routes ──────────────────────────────────── */}
          <Route path="/manager" element={
            <ProtectedRoute role="manager"><ManagerLayout /></ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ManagerDashboard />} />
            <Route path="revenue"   element={<PlaceholderPage title="Revenue Reports" />} />
            <Route path="slots"     element={<AdminSlotsPage />} />
            <Route path="users"     element={<UserManagementPage />} />
            <Route path="staff"     element={<StaffManagementPage />} />
            <Route path="reports"   element={<PlaceholderPage title="System Reports" />} />
          </Route>

          {/* ── Fallback redirect → Landing Page ────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
