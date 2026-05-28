import React, { useState, useEffect } from 'react';
import { usersAPI, residentsAPI, certificatesAPI, financeAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalResidents: 0,
    totalUsers: 0,
    totalCertificates: 0,
    totalIncome: 0,
    totalExpense: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [residents, users, certs, finance] = await Promise.all([
          residentsAPI.getAll(1, 1),
          usersAPI.getAll(),
          certificatesAPI.getAll({ limit: 1 }),
          financeAPI.getStats()
        ]);

        setStats({
          totalResidents: residents.data.total || 0,
          totalUsers: users.data.count || 0,
          totalCertificates: certs.data.certificates?.length || 0,
          totalIncome: finance.data.stats?.total_income || 0,
          totalExpense: finance.data.stats?.total_expense || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Welcome, {user?.full_name}!</h1>
        <p className="text-gray-600 mt-2">Admin Dashboard</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Total Residents Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Residents</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalResidents}</p>
              </div>
              <div className="text-4xl text-blue-500 opacity-20">👥</div>
            </div>
          </div>

          {/* Total Users Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalUsers}</p>
              </div>
              <div className="text-4xl text-green-500 opacity-20">🔐</div>
            </div>
          </div>

          {/* Total Certificates Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Certificates Issued</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalCertificates}</p>
              </div>
              <div className="text-4xl text-purple-500 opacity-20">📄</div>
            </div>
          </div>

          {/* Total Income Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Income</p>
                <p className="text-3xl font-bold text-gray-800">₱{stats.totalIncome?.toFixed(2)}</p>
              </div>
              <div className="text-4xl text-yellow-500 opacity-20">💰</div>
            </div>
          </div>

          {/* Total Expense Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Expense</p>
                <p className="text-3xl font-bold text-gray-800">₱{stats.totalExpense?.toFixed(2)}</p>
              </div>
              <div className="text-4xl text-red-500 opacity-20">📉</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <a href="/residents" className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition text-center font-semibold">
          Manage Residents
        </a>
        <a href="/users" className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg transition text-center font-semibold">
          Manage Users
        </a>
        <a href="/certificates" className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg transition text-center font-semibold">
          Certificates
        </a>
        <a href="/finance" className="bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-6 rounded-lg transition text-center font-semibold">
          Finance
        </a>
      </div>
    </div>
  );
}
