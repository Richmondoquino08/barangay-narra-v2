import React, { useState, useEffect, useCallback } from 'react';
import { collectionsAPI } from '../../api/apiClient';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { Coins, Plus, Printer, Trash2 } from 'lucide-react';
import { BRGY, peso, fmtDate, printDoc, govHeader } from './financeHelpers';

const REVENUE_SOURCES = [
  'Real Property Tax Share', 'Community Tax (Cedula)', 'Business Permit Fees',
  'Barangay Clearance Fees', 'Market/Stall Fees', 'Rental Income', 'Other Collections',
];
const EMPTY = { collection_date:'', collected_by:'', payor:'', revenue_source:REVENUE_SOURCES[0], or_no:'', amount:'', remarks:'', deposited:false, bank_name:'General Fund Account' };

export default function ItemizedCollections() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoad] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    try { setRows((await collectionsAPI.getAll()).data.collections || []); }
    catch { toast('Failed to load collections', 'error'); }
    finally { setLoad(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));
  function openNew() { setForm({ ...EMPTY, collection_date: new Date().toISOString().slice(0,10) }); setModal(true); }

  async function save(e) {
    e.preventDefault();
    if (!form.payor || !form.amount || !form.revenue_source) { toast('Payor, revenue source and amount required', 'warning'); return; }
    setSaving(true);
    try { await collectionsAPI.create(form); toast('Collection posted to CRDR' + (form.deposited?' and CHBR':''), 'success'); setModal(false); load(); }
    catch (err) { toast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete this collection? CRDR/CHBR postings will be reversed.')) return;
    try { await collectionsAPI.delete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  const total = rows.reduce((s,r)=>s+Number(r.amount||0),0);

  function print(r) {
    printDoc('Official Receipt — Collection', `
      ${govHeader('ITEMIZED COLLECTION RECEIPT')}
      <table>
        <tr><td style="width:38%;"><b>Ref No.</b></td><td>${r.ref_no||''}</td></tr>
        <tr><td><b>O.R. No.</b></td><td>${r.or_no||''}</td></tr>
        <tr><td><b>Date</b></td><td>${fmtDate(r.collection_date)}</td></tr>
        <tr><td><b>Received From</b></td><td>${r.payor||''}</td></tr>
        <tr><td><b>Revenue Source</b></td><td>${r.revenue_source||''}</td></tr>
        <tr><td><b>Amount</b></td><td>${peso(r.amount)}</td></tr>
        <tr><td><b>Collected By</b></td><td>${r.collected_by||''}</td></tr>
        <tr><td><b>Remarks</b></td><td>${r.remarks||''}</td></tr>
      </table>
      <div class="sig-block">
        <div><div class="sig-name" style="min-width:200px;">${r.collected_by||''}</div><div class="sig-title">Collecting Officer</div></div>
        <div><div class="sig-name" style="min-width:220px;">${BRGY.treasurer}</div><div class="sig-title">Barangay Treasurer</div></div>
      </div>
      <p class="meta">Ref: ${r.ref_no||'—'}</p>
    `);
  }

  const inp = "w-full border border-gray-300 dark:border-[#2e334a] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#1a1d27] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const lbl = "block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1";

  return (
    <div className="w-full space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Coins size={22} className="text-indigo-600"/> Itemized Collections
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Each collection auto-posts a receipt to CRDR, and a deposit to CHBR if marked deposited</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-1.5"><Plus size={15}/> New Collection</button>
      </div>

      <div className="card p-4 max-w-xs"><p className="text-xs text-gray-400 uppercase font-bold">Total Collected</p><p className="text-xl font-bold text-emerald-600">{peso(total)}</p></div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Ref','Date','Payor','Revenue Source','O.R. No.','Amount','Deposited','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {loading ? <tr><td colSpan={8} className="py-10 text-center text-gray-400">Loading…</td></tr>
              : rows.length===0 ? <tr><td colSpan={8} className="py-14 text-center text-gray-400">No collections recorded</td></tr>
              : rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td font-mono text-[11px] text-indigo-500">{r.ref_no}</td>
                  <td className="table-td text-gray-400 whitespace-nowrap">{fmtDate(r.collection_date)}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.payor}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400">{r.revenue_source}</td>
                  <td className="table-td text-gray-400 text-xs">{r.or_no}</td>
                  <td className="table-td font-semibold text-gray-900 dark:text-slate-100">{peso(r.amount)}</td>
                  <td className="table-td"><Badge status={r.deposited?'completed':'pending'} label={r.deposited?'Deposited':'Undeposited'}/></td>
                  <td className="table-td">
                    <div className="flex gap-1">
                      <button onClick={()=>print(r)} className="act-btn act-gray"><Printer size={12}/> Print</button>
                      <button onClick={()=>del(r.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="New Collection" size="md">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Date</label><input type="date" className={inp} value={form.collection_date} onChange={e=>set('collection_date',e.target.value)}/></div>
            <div><label className={lbl}>O.R. No.</label><input className={inp} value={form.or_no} onChange={e=>set('or_no',e.target.value)}/></div>
          </div>
          <div><label className={lbl}>Received From (Payor) *</label><input className={inp} value={form.payor} onChange={e=>set('payor',e.target.value)}/></div>
          <div>
            <label className={lbl}>Revenue Source *</label>
            <select className={inp} value={form.revenue_source} onChange={e=>set('revenue_source',e.target.value)}>
              {REVENUE_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Amount (₱) *</label><input type="number" step="0.01" className={inp} value={form.amount} onChange={e=>set('amount',e.target.value)}/></div>
            <div><label className={lbl}>Collected By</label><input className={inp} value={form.collected_by} onChange={e=>set('collected_by',e.target.value)}/></div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="dep" checked={form.deposited} onChange={e=>set('deposited',e.target.checked)} className="w-4 h-4"/>
            <label htmlFor="dep" className="text-sm text-gray-600 dark:text-slate-300">Deposited to bank today</label>
          </div>
          {form.deposited && <div><label className={lbl}>Bank Name</label><input className={inp} value={form.bank_name} onChange={e=>set('bank_name',e.target.value)}/></div>}
          <div><label className={lbl}>Remarks</label><textarea className={inp} rows={2} value={form.remarks} onChange={e=>set('remarks',e.target.value)}/></div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Posting…':'Post Collection'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

