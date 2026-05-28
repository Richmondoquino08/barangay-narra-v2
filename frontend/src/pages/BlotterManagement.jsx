import React, { useState, useEffect, useCallback } from 'react';
import { blotterAPI, residentsAPI } from '../api/apiClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { AlertTriangle, Plus, Search, CheckCircle, XCircle, Pencil, Trash2 } from 'lucide-react';
import ResidentSearch from '../components/ResidentSearch';

const INCIDENT_TYPES = ['Physical Assault','Noise Complaint','Theft','Trespassing','Domestic Dispute',
  'Property Damage','Verbal Abuse','Harassment','Illegal Dumping','Drug-Related','Other'];

export default function BlotterManagement() {
  const { toast } = useToast();
  const [records, setRecords] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({
    complainant_id:'', respondent_id:'', incident_type:'', incident_date:'',
    incident_time:'', incident_location:'', narrative:''
  });
  const [resolveModal, setResolveModal] = useState(null);
  const [resolution, setResolution] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await blotterAPI.getAll(params);
      let list = res.data.records || [];
      if (search) list = list.filter(r =>
        r.case_number?.includes(search) || r.incident_type?.toLowerCase().includes(search.toLowerCase()) ||
        r.complainant_name?.toLowerCase().includes(search.toLowerCase()));
      setRecords(list);
    } catch { toast('Failed to load records', 'error'); }
    finally { setLoading(false); }
  }, [filterStatus, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    residentsAPI.getAll(1, 500).then(r => setResidents(r.data.residents || [])).catch(() => {});
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal?.id) await blotterAPI.update(modal.id, form);
      else await blotterAPI.create(form);
      toast(modal?.id ? 'Record updated' : 'Blotter filed successfully', 'success');
      setModal(null); load();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  async function handleResolve() {
    try {
      await blotterAPI.updateStatus(resolveModal, { status: 'resolved', resolution });
      toast('Case resolved', 'success');
      setResolveModal(null); setResolution(''); load();
    } catch { toast('Failed to resolve', 'error'); }
  }

  async function updateStatus(id, status) {
    try { await blotterAPI.updateStatus(id, { status }); toast(`Status updated to ${status}`, 'success'); load(); }
    catch { toast('Failed to update status', 'error'); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this blotter record?')) return;
    try { await blotterAPI.delete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  const openForm = (record = null) => {
    setForm(record ? {
      complainant_id: record.complainant_id || '',
      respondent_id: record.respondent_id || '',
      incident_type: record.incident_type || '',
      incident_date: record.incident_date?.split('T')[0] || '',
      incident_time: record.incident_time || '',
      incident_location: record.incident_location || '',
      narrative: record.narrative || ''
    } : { complainant_id:'', respondent_id:'', incident_type:'', incident_date:'', incident_time:'', incident_location:'', narrative:'' });
    setModal(record || {});
  };

  const statusCounts = records.reduce((a, r) => { a[r.status] = (a[r.status]||0)+1; return a; }, {});

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><AlertTriangle size={22} className="text-rose-600"/>Blotter Records</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} total cases</p>
        </div>
        <button onClick={() => openForm()} className="btn-primary flex items-center gap-1.5"><Plus size={15}/>File Blotter</button>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {[['','All',records.length],['pending','Pending',statusCounts.pending||0],
          ['investigating','Investigating',statusCounts.investigating||0],
          ['resolved','Resolved',statusCounts.resolved||0],['closed','Closed',statusCounts.closed||0]
        ].map(([v,l,n]) => (
          <button key={v} onClick={() => setFilterStatus(v)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition
              ${filterStatus===v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
            {l} <span className="opacity-70">{n}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by case number, incident type, or complainant..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"/>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
        ) : records.length === 0 ? (
          <div className="py-14 text-center text-gray-400">
            <AlertTriangle size={36} className="mx-auto mb-2 text-gray-200"/>
            <p className="font-medium">No blotter records</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              {['Case #','Type','Complainant','Respondent','Date','Location','Status','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td font-mono text-xs text-indigo-700 font-semibold">{r.case_number}</td>
                  <td className="table-td text-gray-700 font-medium">{r.incident_type}</td>
                  <td className="table-td text-gray-600">{r.complainant_name || '—'}</td>
                  <td className="table-td text-gray-600">{r.respondent_name || '—'}</td>
                  <td className="table-td text-gray-500 whitespace-nowrap">{r.incident_date ? new Date(r.incident_date).toLocaleDateString('en-PH') : '—'}</td>
                  <td className="table-td text-gray-500 max-w-xs truncate">{r.incident_location || '—'}</td>
                  <td className="table-td"><Badge status={r.status}/></td>
                  <td className="table-td">
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => openForm(r)} className="icon-btn text-gray-400 hover:text-amber-600" title="Edit"><Pencil size={14}/></button>
                      {r.status === 'pending' && <button onClick={() => updateStatus(r.id,'investigating')} className="icon-btn text-gray-400 hover:text-blue-600 text-[10px] font-semibold px-1.5">Investigate</button>}
                      {r.status === 'investigating' && <button onClick={() => { setResolveModal(r.id); }} className="icon-btn text-gray-400 hover:text-emerald-600" title="Resolve"><CheckCircle size={14}/></button>}
                      {r.status === 'resolved' && <button onClick={() => updateStatus(r.id,'closed')} className="icon-btn text-gray-400 hover:text-gray-600" title="Close"><XCircle size={14}/></button>}
                      <button onClick={() => handleDelete(r.id)} className="icon-btn text-gray-400 hover:text-rose-600" title="Delete"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* File / Edit Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? `Edit Case ${modal.case_number}` : 'File New Blotter Record'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <ResidentSearch
                label="Complainant"
                residents={residents}
                value={form.complainant_id}
                onChange={v => setForm(p => ({ ...p, complainant_id: v }))}
                placeholder="Search complainant…"
              />
            </div>
            <div>
              <ResidentSearch
                label="Respondent"
                residents={residents}
                value={form.respondent_id}
                onChange={v => setForm(p => ({ ...p, respondent_id: v }))}
                placeholder="Search respondent…"
              />
            </div>
          </div>
          <div>
            <label className="label">Incident Type *</label>
            <select className="input" value={form.incident_type} onChange={e => setForm(p=>({...p,incident_type:e.target.value}))} required>
              <option value="">Select type...</option>
              {INCIDENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.incident_date} onChange={e => setForm(p=>({...p,incident_date:e.target.value}))}/>
            </div>
            <div>
              <label className="label">Time</label>
              <input type="time" className="input" value={form.incident_time} onChange={e => setForm(p=>({...p,incident_time:e.target.value}))}/>
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" value={form.incident_location} onChange={e => setForm(p=>({...p,incident_location:e.target.value}))} placeholder="Purok / Street"/>
            </div>
          </div>
          <div>
            <label className="label">Narrative *</label>
            <textarea className="input resize-none" rows={4} value={form.narrative} onChange={e => setForm(p=>({...p,narrative:e.target.value}))} placeholder="Describe what happened..." required/>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'File Record'}</button>
          </div>
        </form>
      </Modal>

      {/* Resolve Modal */}
      <Modal open={!!resolveModal} onClose={() => setResolveModal(null)} title="Resolve Case" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Resolution Notes *</label>
            <textarea className="input resize-none" rows={4} value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Describe how the case was resolved..." required/>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setResolveModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleResolve} disabled={!resolution.trim()} className="btn-primary">Mark as Resolved</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}