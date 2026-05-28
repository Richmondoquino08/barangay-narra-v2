import React, { useState, useEffect, useCallback } from 'react';
import { financeAPI } from '../api/apiClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import StatCard from '../components/StatCard';
import { DollarSign, TrendingUp, TrendingDown, Plus, Download, Pencil, Trash2, Filter } from 'lucide-react';

const CATEGORIES_INCOME  = ['Tax Collection', 'Permits & Licenses', 'Fines & Penalties', 'Grants', 'Donations', 'Other Income'];
const CATEGORIES_EXPENSE = ['Office Supplies', 'Utilities', 'Salaries', 'Infrastructure', 'Events', 'Maintenance', 'Other Expense'];
const PAYMENT_METHODS    = ['Cash', 'Check', 'Bank Transfer', 'GCash', 'Maya'];

function FinanceForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || {
    transaction_type: 'income', description: '', amount: '',
    category: '', payment_method: 'Cash', receipt_number: '',
    transaction_date: new Date().toISOString().split('T')[0], notes: ''
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const cats = form.transaction_type === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type *</label>
          <div className="grid grid-cols-2 gap-2">
            {['income', 'expense'].map(t => (
              <button key={t} type="button" onClick={() => set('transaction_type', t)}
                className={`py-2 rounded-xl text-sm font-semibold border-2 transition capitalize
                  ${form.transaction_type === t
                    ? t === 'income' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Amount (₱) *</label>
          <input type="number" min="0" step="0.01" className="input" value={form.amount} onChange={e => set('amount', e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="label">Description *</label>
        <input className="input" value={form.description} onChange={e => set('description', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">Select category...</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Payment Method</label>
          <select className="input" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Transaction Date *</label>
          <input type="date" className="input" value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)} required />
        </div>
        <div>
          <label className="label">Receipt / OR Number</label>
          <input className="input" value={form.receipt_number} onChange={e => set('receipt_number', e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function Finance() {
  const { toast } = useToast();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ total_income: 0, total_expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState({ type: '', category: '', startDate: '', endDate: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.type) params.transaction_type = filter.type;
      if (filter.category) params.category = filter.category;
      if (filter.startDate) params.startDate = filter.startDate;
      if (filter.endDate) params.endDate = filter.endDate;
      const res = await financeAPI.getAll(params);
      setRecords(res.data.finances || []);
      setSummary(res.data.summary || {});
    } catch { toast('Failed to load finances', 'error'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(form) {
    setSaving(true);
    try {
      if (modal?.id) await financeAPI.update(modal.id, form);
      else await financeAPI.create(form);
      toast(modal?.id ? 'Record updated' : 'Record added', 'success');
      setModal(null); load();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this record?')) return;
    try { await financeAPI.delete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  async function handleExport() {
    try {
      const res = await financeAPI.export();
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'finances.csv'; a.click();
      toast('Exported', 'success');
    } catch { toast('Export failed', 'error'); }
  }

  const fmt = n => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><DollarSign size={22} className="text-emerald-600"/>Finance</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} transactions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5"><Download size={15}/>Export</button>
          <button onClick={() => setModal({})} className="btn-primary flex items-center gap-1.5"><Plus size={15}/>Add Transaction</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Income" value={fmt(summary.total_income)} icon={TrendingUp} color="emerald" />
        <StatCard title="Total Expenses" value={fmt(summary.total_expense)} icon={TrendingDown} color="rose" />
        <StatCard title="Net Balance" value={fmt(summary.balance)} icon={DollarSign} color={summary.balance >= 0 ? 'teal' : 'rose'} />
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <Filter size={14} className="text-gray-400" />
        {[
          { value: filter.type, onChange: v => setFilter(p => ({ ...p, type: v })),
            opts: [['','All Types'],['income','Income'],['expense','Expense']] },
        ].map((f, i) => (
          <select key={i} value={f.value} onChange={e => f.onChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400">
            {f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <input type="date" value={filter.startDate} onChange={e => setFilter(p => ({ ...p, startDate: e.target.value }))}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        <span className="text-gray-400 text-xs">to</span>
        <input type="date" value={filter.endDate} onChange={e => setFilter(p => ({ ...p, endDate: e.target.value }))}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        {(filter.type || filter.startDate || filter.endDate) && (
          <button onClick={() => setFilter({ type: '', category: '', startDate: '', endDate: '' })}
            className="text-xs text-indigo-600 hover:underline">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(6)].map((_,i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
        ) : records.length === 0 ? (
          <div className="py-14 text-center text-gray-400">
            <DollarSign size={36} className="mx-auto mb-2 text-gray-200"/>
            <p className="font-medium">No transactions found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              {['Date','Type','Description','Category','Payment','Amount','Actions'].map(h => <th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td text-gray-500 whitespace-nowrap">{new Date(r.transaction_date).toLocaleDateString('en-PH')}</td>
                  <td className="table-td"><Badge status={r.transaction_type} /></td>
                  <td className="table-td font-medium text-gray-800">{r.description}</td>
                  <td className="table-td text-gray-500">{r.category || '—'}</td>
                  <td className="table-td text-gray-500">{r.payment_method || '—'}</td>
                  <td className={`table-td font-semibold ${r.transaction_type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {r.transaction_type === 'expense' ? '−' : '+'}{fmt(r.amount)}
                  </td>
                  <td className="table-td">
                    <div className="flex gap-1">
                      <button onClick={() => setModal(r)} className="icon-btn text-gray-400 hover:text-amber-600"><Pencil size={14}/></button>
                      <button onClick={() => handleDelete(r.id)} className="icon-btn text-gray-400 hover:text-rose-600"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Transaction' : 'New Transaction'}>
        <FinanceForm initial={modal?.id ? modal : null} onSave={handleSave} onCancel={() => setModal(null)} loading={saving} />
      </Modal>
    </div>
  );
}