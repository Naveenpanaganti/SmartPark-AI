import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FileText, Download, Users, DollarSign, CalendarCheck, AlertTriangle } from 'lucide-react';

export default function SystemReportsPage() {
  const { getToken } = useAuth();
  const token = getToken();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBookings: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch summary data to display in KPI cards
      const [usersRes, revenueRes, bookingsRes] = await Promise.all([
        fetch('http://localhost:3000/api/admin/users', { headers }),
        fetch('http://localhost:3000/api/analytics/revenue', { headers }),
        fetch('http://localhost:3000/api/admin/reports/bookings', { headers })
      ]);

      if (!usersRes.ok || !revenueRes.ok || !bookingsRes.ok) {
        throw new Error('Failed to load report data');
      }

      const users = await usersRes.json();
      const revenue = await revenueRes.json();
      const bookings = await bookingsRes.json();

      setStats({
        totalUsers: users.length,
        totalBookings: bookings.length,
        totalRevenue: revenue.total_revenue || 0
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (filename, csvData) => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportUsers = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      // Convert JSON to CSV
      const headers = ['ID', 'Email', 'Full Name', 'Role', 'Total Bookings', 'Active Bookings', 'Joined Date'];
      const rows = data.map(u => [
        u.id, 
        u.email, 
        `"${u.full_name || ''}"`, 
        u.role, 
        u.total_bookings, 
        u.active_bookings, 
        new Date(u.created_at).toISOString()
      ]);
      
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(`users_report_${new Date().toISOString().split('T')[0]}.csv`, csv);
    } catch (err) {
      alert('Error exporting users: ' + err.message);
    }
  };

  const handleExportBookings = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/admin/reports/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      const headers = ['Booking ID', 'User Name', 'User Email', 'Slot', 'Floor', 'Premium', 'Start Time', 'End Time', 'Status', 'Duration (Hours)', 'Cost'];
      const rows = data.map(b => [
        b.id,
        `"${b.booked_by_name || ''}"`,
        b.booked_by_email || 'N/A',
        b.slot_number,
        b.floor_level,
        b.is_premium ? 'Yes' : 'No',
        new Date(b.start_time).toISOString(),
        new Date(b.end_time).toISOString(),
        b.status,
        (b.duration_hours || 0).toFixed(2),
        (b.cost || 0).toFixed(2)
      ]);
      
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(`bookings_report_${new Date().toISOString().split('T')[0]}.csv`, csv);
    } catch (err) {
      alert('Error exporting bookings: ' + err.message);
    }
  };

  const handleExportRevenue = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/analytics/revenue', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      const headers = ['Date', 'Daily Revenue'];
      const rows = data.chart_data.map(d => [d.date, d.revenue]);
      
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(`revenue_report_${new Date().toISOString().split('T')[0]}.csv`, csv);
    } catch (err) {
      alert('Error exporting revenue: ' + err.message);
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
            <FileText className="w-6 h-6 text-indigo-600" />
            System Reports
          </h1>
          <p className="text-gray-500 mt-1">Export system data and view high-level summaries</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Registered Users</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total System Bookings</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Revenue Recognized</p>
            <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Reports Export Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Export Data (CSV)</h2>
          <p className="text-gray-500 text-sm mt-1">Download raw system data for offline analysis or accounting.</p>
        </div>
        
        <div className="divide-y divide-gray-100">
          
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-lg text-gray-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Users Registry Report</h3>
                <p className="text-sm text-gray-500">List of all users, their roles, and booking counts.</p>
              </div>
            </div>
            <button 
              onClick={handleExportUsers}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm w-full sm:w-auto justify-center"
            >
              <Download className="w-4 h-4" /> Download CSV
            </button>
          </div>

          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-lg text-gray-600">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">All Bookings Report</h3>
                <p className="text-sm text-gray-500">Historical log of all bookings with cost and duration.</p>
              </div>
            </div>
            <button 
              onClick={handleExportBookings}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm w-full sm:w-auto justify-center"
            >
              <Download className="w-4 h-4" /> Download CSV
            </button>
          </div>

          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-lg text-gray-600">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Daily Revenue Report</h3>
                <p className="text-sm text-gray-500">Aggregated daily revenue over time.</p>
              </div>
            </div>
            <button 
              onClick={handleExportRevenue}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm w-full sm:w-auto justify-center"
            >
              <Download className="w-4 h-4" /> Download CSV
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
