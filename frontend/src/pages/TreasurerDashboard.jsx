import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { financeAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { DollarSign, TrendingUp, TrendingDown, Plus, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function TreasurerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [st, list] = await Promise.allSettled([financeAPI.getStats(), financeAPI.getAll({ limit: 6 })]);
        setStats(st.value?.data?.stats || {});
        setRecent(list.value?.data?.finances || []);
      } catch(_) {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  const fmt = n => `₱${Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2})}`;
  const balance = (Number(stats.total_income)||0) - (Number(stats.total_expense)||0);

  const chartData = [
    { name: 'Income',  amount: Number(stats.total_income)||0 },
    { name: 'Expense', amount: Number(stats.total_expense)||0 },
    { name: 'Balance', amount: balance > 0 ? balance : 0 },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Treasurer Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Welcome, {user?.full_name?.split(' ')[0]}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Income" value={loading?'..':fmt(stats.total_income)} icon={TrendingUp} color="emerald" />
        <StatCard title="Total Expenses" value={loading?'..':fmt(stats.total_expense)} icon={TrendingDown} color="rose" />
        <StatCard title="Net Balance" value={loading?'..':fmt(balance)} icon={DollarSign} color={balance>=0?'teal':'rose'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Financial Overview</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={40}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v=>`₱${(v/1000).toFixed(0)}k`}/>
              <Tooltip formatter={v => `₱${Number(v).toLocaleString()}`}/>
              <Bar dataKey="amount" radius={[6,6,0,0]}>
                {[{fill:'#10B981'},{fill:'#F43F5E'},{fill:'#4F46E5'}].map((c,i) => <Cell key={i} {...c}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Recent Transactions</h3>
            <button onClick={() => navigate('/finance')} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">View all <ArrowRight size={12}/></button>
          </div>
          {recent.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">No transactions yet</p>
            : <div className="space-y-2">
                {recent.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.description}</p>
                      <p className="text-xs text-gray-400">{new Date(r.transaction_date).toLocaleDateString('en-PH')}</p>
                    </div>
                    <span className={`text-sm font-semibold ${r.transaction_type==='income'?'text-emerald-600':'text-rose-600'}`}>
                      {r.transaction_type==='income'?'+':'-'}{fmt(r.amount)}
                    </span>
                  </div>
                ))}
              </div>
          }
          <button onClick={() => navigate('/finance')} className="w-full mt-3 btn-primary flex items-center justify-center gap-1.5 text-xs">
            <Plus size={14}/> Add Transaction
          </button>
        </div>
      </div>
    </div>
  );
}