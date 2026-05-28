import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersAPI, residentsAPI, certificatesAPI, financeAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import StatCard from '../components/StatCard';
import { Users, FileText, DollarSign, TrendingUp, ClipboardList, AlertTriangle, ArrowRight, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ residents: 0, users: 0, certificates: {}, finance: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [res, usr, cert, fin] = await Promise.allSettled([
          residentsAPI.getAll(1, 1),
          usersAPI.getAll(),
          certificatesAPI.getStats(),
          financeAPI.getStats(),
        ]);
        setStats({
          residents: res.value?.data?.total || 0,
          users:     usr.value?.data?.count || 0,
          certificates: cert.value?.data?.stats || {},
          finance:   fin.value?.data?.stats || {},
        });
      } catch (_) {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  const certData = [
    { name: 'Approved', value: Number(stats.certificates.approved) || 0, color: '#10B981' },
    { name: 'Pending',  value: Number(stats.certificates.pending)  || 0, color: '#F59E0B' },
    { name: 'Rejected', value: Number(stats.certificates.rejected) || 0, color: '#F43F5E' },
    { name: 'Draft',    value: Number(stats.certificates.draft)    || 0, color: '#94A3B8' },
  ].filter(d => d.value > 0);

  const finBalance = (Number(stats.finance.total_income) || 0) - (Number(stats.finance.total_expense) || 0);

  const quickActions = [
    { label: 'Add Resident',   path: '/residents',    icon: Users,          color: 'bg-blue-500' },
    { label: 'Issue Certificate', path: '/certificates', icon: FileText,     color: 'bg-emerald-500' },
    { label: 'View Requests',  path: '/requests',     icon: ClipboardList,  color: 'bg-amber-500' },
    { label: 'Blotter Record', path: '/blotter',      icon: AlertTriangle,  color: 'bg-rose-500' },
    { label: 'Finance Entry',  path: '/finance',      icon: DollarSign,     color: 'bg-teal-500' },
    { label: 'Manage Users',   path: '/users',        icon: Users,          color: 'bg-violet-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back, {user?.full_name?.split(' ')[0]}</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-500 shadow-sm">
          <Activity size={14} className="text-emerald-500" />
          System Online
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Residents" value={loading ? '...' : stats.residents.toLocaleString()} icon={Users} color="blue" subtitle="Registered in barangay" />
        <StatCard title="System Users" value={loading ? '...' : stats.users} icon={Users} color="violet" subtitle="Active accounts" />
        <StatCard title="Total Income" value={loading ? '...' : `₱${Number(stats.finance.total_income || 0).toLocaleString()}`} icon={TrendingUp} color="emerald" subtitle="All time" />
        <StatCard title="Net Balance" value={loading ? '...' : `₱${finBalance.toLocaleString()}`} icon={DollarSign} color={finBalance >= 0 ? 'teal' : 'rose'} subtitle="Income minus expenses" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Certificate status pie */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-1">Certificate Status</h3>
          <p className="text-xs text-gray-400 mb-4">Total: {Number(stats.certificates.total) || 0}</p>
          {certData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={140}>
                <PieChart>
                  <Pie data={certData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60}>
                    {certData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {certData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-gray-600 flex-1">{d.name}</span>
                    <span className="text-xs font-semibold text-gray-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-300 text-sm">No data yet</div>
          )}
        </div>

        {/* Finance bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-1">Financial Overview</h3>
          <p className="text-xs text-gray-400 mb-4">Income vs Expenses</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={[
              { name: 'Income',  amount: Number(stats.finance.total_income)  || 0 },
              { name: 'Expense', amount: Number(stats.finance.total_expense) || 0 },
              { name: 'Balance', amount: finBalance > 0 ? finBalance : 0 },
            ]} barSize={48}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => `₱${Number(v).toLocaleString()}`} />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {[{ fill: '#10B981' }, { fill: '#F43F5E' }, { fill: '#4F46E5' }].map((c, i) => (
                  <Cell key={i} {...c} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map(a => {
            const Icon = a.icon;
            return (
              <button key={a.path} onClick={() => navigate(a.path)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition group">
                <div className={`${a.color} p-2.5 rounded-xl group-hover:scale-110 transition`}>
                  <Icon size={18} className="text-white" />
                </div>
                <span className="text-xs font-medium text-gray-600 text-center leading-tight">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}