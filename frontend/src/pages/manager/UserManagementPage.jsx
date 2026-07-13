import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, Search, Edit2, Trash2, Shield, User, ShieldAlert, AlertTriangle } from 'lucide-react';

export default function UserManagementPage() {
  const { getToken, user: currentUser } = useAuth();
  const token = getToken();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error((errData && errData.error) ? errData.error : 'Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update role');
      }
      
      await fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(`WARNING: Are you sure you want to delete the user ${email}?\n\nThis will also cancel any active bookings they have.`)) return;
    
    setIsDeleting(userId);
    try {
      const response = await fetch(`http://localhost:3000/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }
      
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getRoleIcon = (role) => {
    switch (role) {
      case 'manager': return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'security': return <Shield className="w-4 h-4 text-blue-500" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'manager': return 'bg-red-50 text-red-700 border-red-200';
      case 'security': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
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
            <Users className="w-6 h-6 text-indigo-600" />
            User Management
          </h1>
          <p className="text-gray-500 mt-1">Manage customer accounts and roles</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-center">Active Bookings</th>
                <th className="px-6 py-4 text-center">Total Bookings</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{u.full_name || 'N/A'}</span>
                        <span className="text-gray-500">{u.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(u.role)}`}>
                        {getRoleIcon(u.role)}
                        <span className="capitalize">{u.role}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        u.active_bookings > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {u.active_bookings}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 font-medium">
                      {u.total_bookings}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {u.id !== currentUser?.id ? (
                          <>
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="text-xs border border-gray-200 rounded-md bg-white text-gray-700 px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                            >
                              <option value="customer">Customer</option>
                              <option value="security">Security</option>
                              <option value="manager">Manager</option>
                            </select>
                            
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              disabled={isDeleting === u.id}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic px-2 py-1">Current User</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
