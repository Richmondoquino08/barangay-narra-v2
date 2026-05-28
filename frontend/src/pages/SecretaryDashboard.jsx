import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { residentsAPI, certificatesAPI, requestsAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { Users, FileText, ClipboardList, Plus, ArrowRight } from 'lucide-react';

export default function SecretaryDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ residents: 0, certStats: {}, requests: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [res, cert, req] = await Promise.allSettled([
          residentsAPI.getAll(1,1), certificatesAPI.getStats(), requestsAPI.getAll({ status: 'pending' })
        ]);
        setData({
          residents: res.value?.data?.total || 0,
          certStats: cert.value?.data?.stats || {},
          requests: req.value?.data?.requests?.slice(0,5) || [],
        });
      } catch(_) {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Secretary Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Welcome, {user?.full_name?.split(' ')[0]}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Residents" value={loading?'..':data.residents} icon={Users} color="blue" />
        <StatCard title="Certificates Pending" value={loading?'..':Number(data.certStats.pending)||0} icon={FileText} color="amber" />
        <StatCard title="Certificates Approved" value={loading?'..':Number(data.certStats.approved)||0} icon={FileText} color="emerald" />
        <StatCard title="Total Certificates" value={loading?'..':Number(data.certStats.total)||0} icon={FileText} color="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Pending Requests</h3>
            <button onClick={() => navigate('/requests')} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">View all <ArrowRight size={12}/></button>
          </div>
          {data.requests.length === 0
            ? <p className="text-sm text-gray-400 py-4 text-center">No pending requests</p>
            : <div className="space-y-2">
                {data.requests.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.resident_name}</p>
                      <p className="text-xs text-gray-400">{r.request_type}</p>
                    </div>
                    <Badge status={r.status}/>
                  </div>
                ))}
              </div>
          }
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Add New Resident', path: '/residents', icon: Users, color: 'bg-blue-500' },
              { label: 'Issue Certificate', path: '/certificates', icon: FileText, color: 'bg-emerald-500' },
              { label: 'Process Request', path: '/requests', icon: ClipboardList, color: 'bg-amber-500' },
            ].map(a => {
              const Icon = a.icon;
              return (
                <button key={a.path} onClick={() => navigate(a.path)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition text-left">
                  <div className={`${a.color} p-2 rounded-lg`}><Icon size={15} className="text-white"/></div>
                  <span className="text-sm font-medium text-gray-700">{a.label}</span>
                  <ArrowRight size={14} className="ml-auto text-gray-400"/>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}