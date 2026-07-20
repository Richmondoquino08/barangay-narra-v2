import React, { useState, useEffect, useCallback } from 'react';
import { officialsAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Shield, Plus, Pencil, Trash2, Phone } from 'lucide-react';

const POSITIONS = ['Punong Barangay','Kagawad','SK Chairman','Barangay Secretary','Barangay Treasurer','Barangay Health Worker','BCPC Chairperson'];

function OfficialForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || {
    full_name:'', position:'Kagawad', committee:'', contact_number:'',
    term_start:'', term_end:'', sort_order: 99, is_active: true
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Full Name *</label>
          <input className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Position *</label>
          <select className="input" value={form.position} onChange={e => set('position', e.target.value)}>
            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Committee Assignment(s)</label>
        <input className="input" value={form.committee} onChange={e => set('committee', e.target.value)}
          placeholder="e.g. Peace & Order, Health & Sanitation" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Contact Number</label>
          <input className="input" value={form.contact_number} onChange={e => set('contact_number', e.target.value)} placeholder="09xxxxxxxxx" />
        </div>
        <div>
          <label className="label">Sort Order</label>
          <input type="number" min="1" className="input" value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Term Start</label>
          <input type="date" className="input" value={form.term_start} onChange={e => set('term_start', e.target.value)} />
        </div>
        <div>
          <label className="label">Term End</label>
          <input type="date" className="input" value={form.term_end} onChange={e => set('term_end', e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600" checked={!!form.is_active} onChange={e => set('is_active', e.target.checked)} />
        <span className="text-sm text-gray-700 dark:text-slate-300">Active / In Office</span>
      </label>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function Officials() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const canEdit = hasRole(['admin', 'secretary']);
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setOfficials((await officialsAPI.getAll()).data.officials || []); }
    catch { toast('Failed to load officials', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(form) {
    setSaving(true);
    try {
      if (modal?.id) await officialsAPI.update(modal.id, form);
      else await officialsAPI.create(form);
      toast(modal?.id ? 'Official updated' : 'Official added', 'success');
      setModal(null); load();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this official?')) return;
    try { await officialsAPI.delete(id); toast('Removed', 'success'); load(); }
    catch { toast('Failed to delete', 'error'); }
  }

  const captain = officials.find(o => o.position === 'Punong Barangay');
  const rest = officials.filter(o => o.position !== 'Punong Barangay');

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Shield size={22} className="text-indigo-600"/> Barangay Officials
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{officials.length} officials on record</p>
        </div>
        {canEdit && <button onClick={() => setModal({})} className="btn-primary flex items-center gap-1.5"><Plus size={15}/>Add Official</button>}
      </div>

      {/* Captain highlight */}
      {captain && (
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white flex items-center gap-4 shadow-lg shadow-indigo-900/30">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-2xl">
            {captain.full_name.split(' ').map(n=>n[0]).slice(0,2).join('')}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">Punong Barangay</p>
            <p className="text-xl font-bold mt-0.5">{captain.full_name}</p>
            {captain.contact_number && <p className="text-sm text-indigo-200 mt-0.5 flex items-center gap-1"><Phone size={12}/>{captain.contact_number}</p>}
          </div>
          {canEdit && (
            <button onClick={() => setModal(captain)} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition"><Pencil size={15}/></button>
          )}
        </div>
      )}

      {/* Officials grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rest.map(o => (
          <div key={o.id} className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#2e334a] p-4 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm flex-shrink-0">
              {o.full_name.split(' ').map(n=>n[0]).slice(0,2).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-800 dark:text-slate-100 truncate">{o.full_name}</p>
                {!o.is_active && <Badge status="inactive" label="Inactive" />}
              </div>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">{o.position}</p>
              {o.committee && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">{o.committee}</p>}
              {o.contact_number && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 flex items-center gap-1"><Phone size={11}/>{o.contact_number}</p>}
              {(o.term_start || o.term_end) && (
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                  Term: {o.term_start ? new Date(o.term_start).getFullYear() : '?'} – {o.term_end ? new Date(o.term_end).getFullYear() : 'present'}
                </p>
              )}
            </div>
            {canEdit && (
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setModal(o)} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                <button onClick={() => handleDelete(o.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
              </div>
            )}
          </div>
        ))}

        {loading && [...Array(6)].map((_,i) => (
          <div key={i} className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#2e334a] p-4 h-24 animate-pulse" />
        ))}

        {!loading && officials.length === 0 && (
          <div className="col-span-3 py-16 text-center text-gray-400 dark:text-slate-500">
            <Shield size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No officials on record</p>
            {canEdit && <p className="text-sm">Click "Add Official" to get started</p>}
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Official' : 'Add Official'} size="md">
        <OfficialForm initial={modal?.id ? modal : null} onSave={handleSave} onCancel={() => setModal(null)} loading={saving} />
      </Modal>
    </div>
  );
}
