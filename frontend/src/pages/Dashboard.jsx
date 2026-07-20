import { useEffect, useState } from 'react';
import api from '../api/apiClient';
import Card from '../components/Card';

export default function Dashboard() {
  const [stats, setStats] = useState({ residents: 0, households: 0, activeRequests: 0, dailyCollections: 0 });

  useEffect(() => {
    api.get('/residents').then((res) => setStats((prev) => ({ ...prev, residents: res.data.length })));
    api.get('/requests').then((res) => setStats((prev) => ({ ...prev, activeRequests: res.data.filter((request) => request.status === 'pending').length })));
    api.get('/finance/summary').then((res) => setStats((prev) => ({ ...prev, dailyCollections: res.data.summary.total_collected })));
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-4 lg:grid-cols-2">
        <Card title="Total residents" value={stats.residents} />
        <Card title="Total households" value={stats.households} />
        <Card title="Active requests" value={stats.activeRequests} />
        <Card title="Total collected" value={`₱${stats.dailyCollections}`} />
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-semibold">Population analytics</h2>
        <p className="mt-3 text-slate-500">Charts and analytics are ready for the production build. Use the API endpoints to source monthly and daily analytics.</p>
      </div>
    </div>
  );
}

