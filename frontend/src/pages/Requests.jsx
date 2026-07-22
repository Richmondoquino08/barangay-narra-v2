import React, { useState, useEffect, useCallback } from 'react';
import { requestsAPI, residentsAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ResidentSearch from '../components/ResidentSearch';
import { ClipboardList, Plus, Search, CheckCircle, XCircle, Loader, CheckSquare, Trash2, QrCode } from 'lucide-react';

const REQUEST_TYPES = [
  'Business Clearance',
  'Building Permit',
  'Fencing Permit',
  'Financial Assistance',
  'Medical Assistance',
  'Infrastructure Request',
  'Barangay ID',
  'Other',
];

export default function Requests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canApprove = ['admin','captain'].includes(user?.role);

  const [requests, setRequests] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({ resident_id: '', request_type: '', purpose: '', remarks: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await requestsAPI.getAll(params);
      let list = res.data.requests || [];
      if (search) list = list.filter(r => r.resident_name?.toLowerCase().includes(search.toLowerCase()) || r.control_number?.includes(search));
      setRequests(list);
    } catch { toast('Failed to load requests', 'error'); }
    finally { setLoading(false); }
  }, [filterStatus, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    residentsAPI.getAll(1, 5000).then(r => setResidents(r.data.residents || [])).catch(() => {});
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await requestsAPI.create(form);
      toast('Request created successfully', 'success');
      setModal(false);
      setForm({ resident_id: '', request_type: '', purpose: '', remarks: '' });
      load();
    } catch { toast('Failed to create request', 'error'); }
    finally { setSaving(false); }
  }

  const action = async (fn, label) => {
    try { await fn(); toast(label, 'success'); load(); }
    catch { toast(`Failed: ${label}`, 'error'); }
  };

  const statusCounts = requests.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});

  return (
    <div className="w-full space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><ClipboardList size={22} className="text-amber-600"/>Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">{requests.length} total requests</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-1.5"><Plus size={15}/>New Request</button>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {[['','All',requests.length],['pending','Pending',statusCounts.pending||0],['approved','Approved',statusCounts.approved||0],
          ['processing','Processing',statusCounts.processing||0],['completed','Completed',statusCounts.completed||0],['rejected','Rejected',statusCounts.rejected||0]
        ].map(([v,l,n]) => (
          <button key={v} onClick={() => setFilterStatus(v)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition
              ${filterStatus === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
            {l} <span className="ml-1 opacity-70">{n}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="card p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by resident name or control number..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"/>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(6)].map((_,i)=><div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
        ) : requests.length === 0 ? (
          <div className="py-14 text-center text-gray-400">
            <ClipboardList size={36} className="mx-auto mb-2 text-gray-200"/>
            <p className="font-medium">No requests found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              {['Control #','Resident','Type','Purpose','Status','Date','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td font-mono text-xs text-indigo-700 font-semibold">{r.control_number}</td>
                  <td className="table-td font-medium text-gray-800">{r.resident_name || '—'}</td>
                  <td className="table-td text-gray-600">{r.request_type}</td>
                  <td className="table-td text-gray-500 max-w-xs truncate">{r.purpose || '—'}</td>
                  <td className="table-td"><Badge status={r.status}/></td>
                  <td className="table-td text-gray-500 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('en-PH')}</td>
                  <td className="table-td">
                    <div className="flex gap-1">
                      {canApprove && r.status === 'pending' && <>
                        <button onClick={() => action(() => requestsAPI.approve(r.id), 'Approved')} className="act-btn act-green"><CheckCircle size={12}/> Approve</button>
                        <button onClick={() => action(() => requestsAPI.reject(r.id), 'Rejected')} className="act-btn act-red"><XCircle size={12}/> Reject</button>
                      </>}
                      {r.status === 'approved' &&
                        <button onClick={() => action(() => requestsAPI.process(r.id), 'Processing')} className="act-btn act-sky"><Loader size={12}/> Process</button>}
                      {r.status === 'processing' &&
                        <button onClick={() => action(() => requestsAPI.complete(r.id), 'Completed')} className="act-btn act-green"><CheckSquare size={12}/> Complete</button>}
                      <button onClick={() => action(() => requestsAPI.delete(r.id), 'Deleted')} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="New Service Request">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <ResidentSearch
              label="Resident *"
              residents={residents}
              value={form.resident_id}
              onChange={v => setForm(p => ({ ...p, resident_id: v }))}
              required
            />
          </div>
          <div>
            <label className="label">Request Type *</label>
            <select className="input" value={form.request_type} onChange={e => setForm(p=>({...p,request_type:e.target.value}))} required>
              <option value="">Select type...</option>
              {REQUEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Purpose</label>
            <input className="input" value={form.purpose} onChange={e => setForm(p=>({...p,purpose:e.target.value}))} placeholder="e.g. Employment, Scholarship, Loan..." />
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea className="input resize-none" rows={2} value={form.remarks} onChange={e => setForm(p=>({...p,remarks:e.target.value}))} />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create Request'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
