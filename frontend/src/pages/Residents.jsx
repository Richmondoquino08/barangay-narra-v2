import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { residentsAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Users, Plus, Search, Download, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const CIVIL = ['single','married','divorced','widowed'];
const GENDER = ['male','female','other'];

function ResidentForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || {
    first_name:'', middle_name:'', last_name:'', gender:'male', birth_date:'',
    address:'', civil_status:'single', contact_number:'', occupation:'',
    voter_status: false, senior_citizen: false
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">First Name *</label>
          <input className="input" value={form.first_name} onChange={e => set('first_name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Middle Name</label>
          <input className="input" value={form.middle_name} onChange={e => set('middle_name', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Last Name *</label>
          <input className="input" value={form.last_name} onChange={e => set('last_name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Gender *</label>
          <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)} required>
            {GENDER.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase()+g.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Birth Date *</label>
          <input type="date" className="input" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} required />
        </div>
        <div>
          <label className="label">Civil Status *</label>
          <select className="input" value={form.civil_status} onChange={e => set('civil_status', e.target.value)} required>
            {CIVIL.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Address *</label>
        <input className="input" value={form.address} onChange={e => set('address', e.target.value)} required placeholder="Purok, Barangay, Municipality" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Contact Number</label>
          <input className="input" value={form.contact_number} onChange={e => set('contact_number', e.target.value)} placeholder="09xxxxxxxxx" />
        </div>
        <div>
          <label className="label">Occupation</label>
          <input className="input" value={form.occupation} onChange={e => set('occupation', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600" checked={!!form.voter_status} onChange={e => set('voter_status', e.target.checked)} />
          <span className="text-sm text-gray-700">Registered Voter</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600" checked={!!form.senior_citizen} onChange={e => set('senior_citizen', e.target.checked)} />
          <span className="text-sm text-gray-700">Senior Citizen (60+)</span>
        </label>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : 'Save Resident'}
        </button>
      </div>
    </form>
  );
}

export default function Residents() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canEdit = hasRole(['admin', 'secretary']);

  const [residents, setResidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterVoter, setFilterVoter] = useState('');
  const [filterSenior, setFilterSenior] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | {resident}
  const [saving, setSaving] = useState(false);

  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (search || filterVoter || filterSenior) {
        res = await residentsAPI.getAll(page, limit);
      } else {
        res = await residentsAPI.getAll(page, limit);
      }
      setResidents(res.data.residents || []);
      setTotal(res.data.total || 0);
    } catch { toast('Failed to load residents', 'error'); }
    finally { setLoading(false); }
  }, [page, search, filterVoter, filterSenior]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(form) {
    setSaving(true);
    try {
      if (modal?.id) {
        await residentsAPI.update(modal.id, form);
        toast('Resident updated successfully', 'success');
      } else {
        await residentsAPI.create(form);
        toast('Resident added successfully', 'success');
      }
      setModal(null);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save', 'error');
    } finally { setSaving(false); }
  }

  async function handleDelete(r) {
    if (!confirm(`Delete ${r.full_name}? This cannot be undone.`)) return;
    try {
      await residentsAPI.delete(r.id);
      toast('Resident deleted', 'success');
      load();
    } catch { toast('Failed to delete resident', 'error'); }
  }

  async function handleExport() {
    try {
      const res = await residentsAPI.export();
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'residents.csv'; a.click();
      toast('Exported successfully', 'success');
    } catch { toast('Export failed', 'error'); }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={22} className="text-indigo-600" /> Residents
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} registered residents</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5"><Download size={15}/> Export CSV</button>
          {canEdit && <button onClick={() => setModal('add')} className="btn-primary flex items-center gap-1.5"><Plus size={15}/> Add Resident</button>}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, address, contact..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select value={filterVoter} onChange={e => { setFilterVoter(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">All Voters</option>
            <option value="true">Registered Voters</option>
            <option value="false">Non-Voters</option>
          </select>
          <select value={filterSenior} onChange={e => { setFilterSenior(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">All Ages</option>
            <option value="true">Senior Citizens</option>
            <option value="false">Non-Senior</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : residents.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 font-medium">No residents found</p>
            <p className="text-gray-300 text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Name', 'Gender', 'Age', 'Address', 'Contact', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {residents.map(r => (
                <tr key={r.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs flex-shrink-0">
                        {r.first_name[0]}{r.last_name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{r.full_name}</p>
                        <p className="text-xs text-gray-400">{r.occupation || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{r.gender}</td>
                  <td className="px-4 py-3 text-gray-600">{r.age}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.address}</td>
                  <td className="px-4 py-3 text-gray-600">{r.contact_number || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.voter_status && <Badge status="active" label="Voter" />}
                      {r.senior_citizen && <Badge status="completed" label="Senior" />}
                      {!r.voter_status && !r.senior_citizen && <span className="text-gray-400 text-xs">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/residents/${r.id}`)} className="icon-btn text-gray-400 hover:text-indigo-600"><Eye size={15}/></button>
                      {canEdit && <button onClick={() => setModal(r)} className="icon-btn text-gray-400 hover:text-amber-600"><Pencil size={15}/></button>}
                      {canEdit && <button onClick={() => handleDelete(r)} className="icon-btn text-gray-400 hover:text-rose-600"><Trash2 size={15}/></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">Showing {(page-1)*limit+1}–{Math.min(page*limit, total)} of {total}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="icon-btn disabled:opacity-30"><ChevronLeft size={16}/></button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const p = Math.max(1, Math.min(page-2, totalPages-4)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition ${p === page ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="icon-btn disabled:opacity-30"><ChevronRight size={16}/></button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? `Edit – ${modal.full_name}` : 'Add New Resident'} size="lg">
        <ResidentForm
          initial={modal?.id ? modal : null}
          onSave={handleSave}
          onCancel={() => setModal(null)}
          loading={saving}
        />
      </Modal>
    </div>
  );
}