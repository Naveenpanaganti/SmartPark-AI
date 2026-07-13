import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Redirects unauthenticated users to /login.
 * Optionally restricts access to specific roles.
 *
 * Usage:
 *   <ProtectedRoute>          — any authenticated user
 *   <ProtectedRoute role="manager">  — manager only
 */
export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, role: userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
          <p className="text-gray-400 text-sm">Authenticating…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/register" state={{ from: location }} replace />;
  }

  if (role && userRole !== role) {
    // Redirect to the user's own dashboard instead of a 403 page
    const paths = {
      manager:  '/manager/dashboard',
      security: '/security/dashboard',
      customer: '/customer/dashboard',
    };
    return <Navigate to={paths[userRole] ?? '/customer/dashboard'} replace />;
  }

  return children;
}
