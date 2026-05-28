import React, { useState, useEffect } from 'react';
import { residentsAPI, requestsAPI, blotterAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function CaptainDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalResidents: 0,
    pendingRequests: 0,
    pendingBlotter: 0,
    resolvedBlotter: 0
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentBlotter, setRecentBlotter] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [residentsRes, requestsRes, blotterRes] = await Promise.all([
          residentsAPI.getAll(1, 1),
          requestsAPI.getAll(),
          blotterAPI.getAll()
        ]);

        const requests = requestsRes.data.requests || [];
        const blotter = blotterRes.data.records || [];

        setStats({
          totalResidents: residentsRes.data.total || 0,
          pendingRequests: requests.filter(r => r.status === 'pending').length,
          pendingBlotter: blotter.filter(b => b.status === 'pending' || b.status === 'ongoing').length,
          resolvedBlotter: blotter.filter(b => b.status === 'resolved').length
        });

        setRecentRequests(requests.slice(0, 5));
        setRecentBlotter(blotter.slice(0, 5));
      } catch (error) {
        console.error('Error fetching captain dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      ongoing: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      dismissed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Welcome, {user?.full_name}!</h1>
        <p className="text-gray-600 mt-2">Captain Dashboard - Community Oversight</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Residents</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.totalResidents}</p>
                </div>
                <div className="text-4xl text-blue-500 opacity-20">👥</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Pending Requests</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.pendingRequests}</p>
                </div>
                <div className="text-4xl text-yellow-500 opacity-20">📋</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Active Blotter Cases</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.pendingBlotter}</p>
                </div>
                <div className="text-4xl text-red-500 opacity-20">⚠️</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Resolved Cases</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.resolvedBlotter}</p>
                </div>
                <div className="text-4xl text-green-500 opacity-20">✓</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Requests */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Recent Requests</h3>
                <button
                  onClick={() => navigate('/requests')}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View All →
                </button>
              </div>
              <div className="space-y-3">
                {recentRequests.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No pending requests</p>
                ) : (
                  recentRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{request.request_type?.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-500">{request.resident_name}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(request.status)}`}>
                        {request.status?.toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Blotter */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Recent Blotter Cases</h3>
                <button
                  onClick={() => navigate('/blotter')}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View All →
                </button>
              </div>
              <div className="space-y-3">
                {recentBlotter.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No active cases</p>
                ) : (
                  recentBlotter.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{record.case_number || `BLT-${record.id}`}</p>
                        <p className="text-sm text-gray-500">{record.incident_type?.replace('_', ' ')}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(record.status)}`}>
                        {record.status?.toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/requests')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-6 rounded-lg transition text-center font-semibold"
            >
              📋 Review Requests
            </button>
            <button
              onClick={() => navigate('/blotter')}
              className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg transition text-center font-semibold"
            >
              ⚠️ Manage Blotter
            </button>
            <button
              onClick={() => navigate('/residents')}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition text-center font-semibold"
            >
              👥 View Residents
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg transition text-center font-semibold"
            >
              📊 Main Dashboard
            </button>
          </div>
        </>
      )}
    </div>
  );
}
