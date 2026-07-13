import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, Shield, Plus, Edit2, Trash2, ShieldAlert, UserPlus, AlertTriangle } from 'lucide-react';

export default function StaffManagementPage() {
  const { getToken, user: currentUser } = useAuth();
  const token = getToken();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', full_name: '', password: '', role: 'security' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/admin/staff', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error((errData && errData.error) ? errData.error : 'Failed to fetch staff');
      }
      const data = await response.json();
      setStaff(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create staff account');
      }
      
      await fetchStaff();
      setIsModalOpen(false);
      setFormData({ email: '', full_name: '', password: '', role: 'security' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Change this staff member's role to ${newRole}?`)) return;
    try {
      const response = await fetch(`http://localhost:3000/api/admin/staff/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (!response.ok) throw new Error('Failed to update role');
      await fetchStaff();
    } catch (err) {
      alert(err.message);
    }
  };

  const getRoleIcon = (role) => {
    return role === 'manager' 
      ? <ShieldAlert className="w-5 h-5 text-red-500" />
      : <Shield className="w-5 h-5 text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            Staff Management
          </h1>
          <p className="text-gray-500 mt-1">Manage security guards and manager accounts</p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Staff
        </button>
      </div>

      {error && !isModalOpen && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map(s => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${s.role === 'manager' ? 'bg-red-50' : 'bg-blue-50'}`}>
                {getRoleIcon(s.role)}
              </div>
              
              {s.id !== currentUser?.id && (
                <select
                  value={s.role}
                  onChange={(e) => handleRoleChange(s.id, e.target.value)}
                  className="text-xs border border-gray-200 rounded-md bg-white text-gray-700 px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="security">Security</option>
                  <option value="manager">Manager</option>
                </select>
              )}
            </div>
            
            <h3 className="text-lg font-bold text-gray-900">{s.full_name}</h3>
            <p className="text-gray-500 text-sm mb-4">{s.email}</p>
            
            <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
              <span className="text-gray-400 flex items-center gap-1.5">
                Joined {new Date(s.created_at).toLocaleDateString()}
              </span>
              <span className={`capitalize font-medium ${s.role === 'manager' ? 'text-red-600' : 'text-blue-600'}`}>
                {s.role}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Create Staff Account</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="e.g. John Security"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="guard@parksmart.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="security">Security Guard</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
