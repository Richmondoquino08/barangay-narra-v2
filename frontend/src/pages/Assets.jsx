import React, { useState, useEffect, useCallback } from 'react';
import { assetsAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Package, Plus, Pencil, Trash2, Filter } from 'lucide-react';

const CATEGORIES = ['Equipment','Furniture','Vehicle','Building','Land','Technology','Sports Equipment','Office Supplies','Other'];
const CONDITIONS = ['Good','Fair','Poor','Condemned'];

function AssetForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || {
    item_name:'', description:'', category:'Equipment', quantity:1, unit:'unit',
    condition:'Good', property_number:'', acquisition_date:'', acquisition_cost:'',
    location:'', assigned_to:'', notes:''
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Item Name *</label>
          <input className="input" value={form.item_name} onChange={e => set('item_name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Quantity</label>
          <input type="number" min="1" className="input" value={form.quantity} onChange={e => set('quantity', parseInt(e.target.value))} />
        </div>
        <div>
          <label className="label">Unit</label>
          <input className="input" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="unit, pcs, sets…" />
        </div>
        <div>
          <label className="label">Condition</label>
          <select className="input" value={form.condition} onChange={e => set('condition', e.target.value)}>
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Property Number</label>
          <input className="input" value={form.property_number} onChange={e => set('property_number', e.target.value)} />
        </div>
        <div>
          <label className="label">Acquisition Cost (₱)</label>
          <input type="number" min="0" step="0.01" className="input" value={form.acquisition_cost} onChange={e => set('acquisition_cost', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Acquisition Date</label>
          <input type="date" className="input" value={form.acquisition_date} onChange={e => set('acquisition_date', e.target.value)} />
        </div>
        <div>
          <label className="label">Location / Room</label>
          <input className="input" value={form.location} onChange={e => set('location', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Assigned To</label>
        <input className="input" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} placeholder="Office, person, department…" />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Asset'}</button>
      </div>
    </form>
  );
}

const conditionColor = { Good:'text-emerald-600', Fair:'text-amber-600', Poor:'text-orange-600', Condemned:'text-rose-600' };

export default function Assets() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const canEdit = hasRole(['admin', 'secretary']);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCondition, setFilterCondition] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (filterCondition) params.condition = filterCondition;
      setAssets((await assetsAPI.getAll(params)).data.assets || []);
    } catch { toast('Failed to load assets', 'error'); }
    finally { setLoading(false); }
  }, [filterCategory, filterCondition]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(form) {
    setSaving(true);
    try {
      if (modal?.id) await assetsAPI.update(modal.id, form);
      else await assetsAPI.create(form);
      toast(modal?.id ? 'Asset updated' : 'Asset added', 'success');
      setModal(null); load();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this asset?')) return;
    try { await assetsAPI.delete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  const fmt = n => n ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—';
  const totalValue = assets.reduce((s,a) => s + Number(a.acquisition_cost||0) * Number(a.quantity||1), 0);

  return (
    <div className="w-full space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Package size={22} className="text-indigo-600"/> Assets & Inventory
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{assets.length} items · Total value: ₱{totalValue.toLocaleString('en-PH', {minimumFractionDigits:2})}</p>
        </div>
        {canEdit && <button onClick={() => setModal({})} className="btn-primary flex items-center gap-1.5"><Plus size={15}/>Add Asset</button>}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <Filter size={14} className="text-gray-400" />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="text-sm border border-gray-200 dark:border-[#2e334a] rounded-xl px-3 py-2 bg-gray-50 dark:bg-[#22263a] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)}
          className="text-sm border border-gray-200 dark:border-[#2e334a] rounded-xl px-3 py-2 bg-gray-50 dark:bg-[#22263a] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All Conditions</option>
          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(filterCategory || filterCondition) && (
          <button onClick={() => { setFilterCategory(''); setFilterCondition(''); }} className="text-xs text-rose-600 hover:underline">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(6)].map((_,i) => <div key={i} className="h-10 bg-gray-100 dark:bg-[#22263a] rounded-xl animate-pulse"/>)}</div>
        ) : assets.length === 0 ? (
          <div className="py-14 text-center text-gray-400 dark:text-slate-500">
            <Package size={36} className="mx-auto mb-2 opacity-30"/><p className="font-medium">No assets recorded</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Item','Category','Qty','Condition','Property #','Cost','Location','Assigned To','Actions'].map(h => <th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {assets.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a] transition-colors">
                  <td className="table-td">
                    <p className="font-medium text-gray-800 dark:text-slate-100">{a.item_name}</p>
                    {a.description && <p className="text-xs text-gray-400 dark:text-slate-500 truncate max-w-[200px]">{a.description}</p>}
                  </td>
                  <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{a.category || '—'}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{a.quantity} {a.unit}</td>
                  <td className="table-td">
                    <span className={`text-xs font-semibold ${conditionColor[a.condition] || 'text-gray-600'}`}>{a.condition}</span>
                  </td>
                  <td className="table-td font-mono text-xs text-gray-500 dark:text-slate-400">{a.property_number || '—'}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300 text-xs">{fmt(a.acquisition_cost)}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{a.location || '—'}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{a.assigned_to || '—'}</td>
                  <td className="table-td">
                    <div className="flex gap-1">
                      {canEdit && <button onClick={() => setModal(a)} className="act-btn act-sky"><Pencil size={12}/> Edit</button>}
                      {canEdit && <button onClick={() => handleDelete(a.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Asset' : 'Add Asset'} size="lg">
        <AssetForm initial={modal?.id ? modal : null} onSave={handleSave} onCancel={() => setModal(null)} loading={saving} />
      </Modal>
    </div>
  );
}
