import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { residentsAPI, requestsAPI, blotterAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { Users, ClipboardList, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

export default function CaptainDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ residents: 0, requests: [], blotters: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [res, req, blt] = await Promise.allSettled([
          residentsAPI.getAll(1,1),
          requestsAPI.getAll({ status: 'pending' }),
          blotterAPI.getAll({ status: 'pending' }),
        ]);
        setData({
          residents: res.value?.data?.total || 0,
          requests:  req.value?.data?.requests?.slice(0,5) || [],
          blotters:  blt.value?.data?.records?.slice(0,5) || [],
        });
      } catch(_) {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Captain Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Welcome, {user?.full_name?.split(' ')[0]}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Residents" value={loading?'..':data.residents} icon={Users} color="blue" />
        <StatCard title="Pending Requests" value={loading?'..':data.requests.length} icon={ClipboardList} color="amber" />
        <StatCard title="Active Blotter Cases" value={loading?'..':data.blotters.length} icon={AlertTriangle} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Pending Requests</h3>
            <button onClick={() => navigate('/requests')} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">View all <ArrowRight size={12}/></button>
          </div>
          {data.requests.length === 0
            ? <p className="text-sm text-gray-400 text-center py-6">All caught up! No pending requests.</p>
            : <div className="space-y-2">
                {data.requests.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Active Blotter Cases</h3>
            <button onClick={() => navigate('/blotter')} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">View all <ArrowRight size={12}/></button>
          </div>
          {data.blotters.length === 0
            ? <div className="text-center py-6">
                <CheckCircle size={28} className="mx-auto text-emerald-300 mb-2"/>
                <p className="text-sm text-gray-400">No active blotter cases</p>
              </div>
            : <div className="space-y-2">
                {data.blotters.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{b.incident_type}</p>
                      <p className="text-xs text-gray-400 font-mono">{b.case_number}</p>
                    </div>
                    <Badge status={b.status}/>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  );
}