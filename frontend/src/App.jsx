import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PublicRoute from './components/auth/PublicRoute';
import Register from './pages/auth/Register';

// Layouts
import CustomerLayout from './layouts/CustomerLayout';
import SecurityLayout from './layouts/SecurityLayout';
import ManagerLayout from './layouts/ManagerLayout';

// Customer pages
import CustomerDashboard from './pages/customer/Dashboard';

// Security pages
import SecurityDashboard from './pages/security/Dashboard';

// Manager pages
import ManagerDashboard from './pages/manager/Dashboard';

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
          <Route path="/register" element={
            <PublicRoute><Register /></PublicRoute>
          } />

          {/* ── Customer routes ─────────────────────────────────── */}
          <Route path="/customer" element={
            <ProtectedRoute role="customer"><CustomerLayout /></ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="parking"   element={<div className="bg-gray-900/20 border border-gray-900/60 rounded-3xl p-6"><ParkingGrid /></div>} />
            <Route path="bookings"  element={<PlaceholderPage title="My Bookings" />} />
            <Route path="history"   element={<PlaceholderPage title="Booking History" />} />
            <Route path="qr"        element={<PlaceholderPage title="QR Pass" />} />
            <Route path="profile"   element={<PlaceholderPage title="Profile Settings" />} />
          </Route>

          {/* ── Security routes ─────────────────────────────────── */}
          <Route path="/security" element={
            <ProtectedRoute role="security"><SecurityLayout /></ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"  element={<SecurityDashboard />} />
            <Route path="entry"      element={<PlaceholderPage title="Vehicle Entry Verification" />} />
            <Route path="exit"       element={<PlaceholderPage title="Vehicle Exit Verification" />} />
            <Route path="scan"       element={<PlaceholderPage title="QR Scanner" />} />
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
            <Route path="slots"     element={<PlaceholderPage title="Slot Management" />} />
            <Route path="users"     element={<PlaceholderPage title="User Management" />} />
            <Route path="staff"     element={<PlaceholderPage title="Staff Management" />} />
            <Route path="reports"   element={<PlaceholderPage title="System Reports" />} />
          </Route>

          {/* ── Root redirect → register ───────────────────────── */}
          <Route path="/" element={<Navigate to="/register" replace />} />
          <Route path="*" element={<Navigate to="/register" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
