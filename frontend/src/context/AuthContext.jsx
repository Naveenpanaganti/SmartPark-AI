import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'parksmart_token';

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [role, setRole]     = useState(null);
  const [loading, setLoading] = useState(true);

  const loadFromToken = useCallback(async (token) => {
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) { localStorage.removeItem(TOKEN_KEY); setLoading(false); return; }
      const userData = await res.json();
      setUser(userData);
      setRole(userData.role);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    loadFromToken(token);
  }, [loadFromToken]);

  const signIn = async (email, password) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setRole(data.user.role);
    return data;
  };

  const signUp = async (email, password, fullName, roleValue = 'customer') => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName, role: roleValue })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setRole(data.user.role);
    return data;
  };

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setRole(null);
  };

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  const getDashboardPath = (r = role) => {
    switch (r) {
      case 'manager':  return '/manager/dashboard';
      case 'security': return '/security/dashboard';
      default:         return '/customer/dashboard';
    }
  };

  return (
    <AuthContext.Provider value={{
      user, role, loading,
      signIn, signUp, signOut, getToken, getDashboardPath,
      isAuthenticated: !!user,
      profile: user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
