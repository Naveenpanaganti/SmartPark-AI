import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Redirects already-authenticated users away from /login and /register
 * to their role-specific dashboard.
 */
export default function PublicRoute({ children }) {
  const { isAuthenticated, getDashboardPath, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getDashboardPath()} replace />;
  }

  return children;
}
