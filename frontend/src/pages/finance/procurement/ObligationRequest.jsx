import React, { useState, useEffect, useCallback } from 'react';
import { procurementAPI, raoAPI } from '../../../api/apiClient';
import { useToast } from '../../../components/Toast';
import Modal from '../../../components/Modal';
import Badge from '../../../components/Badge';
import { FileSignature, Plus, Printer, Trash2 } from 'lucide-react';
import { BRGY, peso, fmtDate, printDoc, govHeader } from '../financeHelpers';

const EMPTY = { fund_key:'', entry_date:'', office:'', payee:'', particulars:'', amount:'' };

export default function ObligationRequest() {
  const { toast } = useToast();
  const [rows, setRows]   = useState([]);
  const [funds, setFunds] = useState([]);
  const [loading, setLoad]= useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const [r, f] = await Promise.all([procurementAPI.obrGetAll(), raoAPI.getFunds()]);
      setRows(r.data.requests || []);
      setFunds(f.data.funds || []);
    } catch { toast('Failed to load obligation requests', 'error'); }
    finally { setLoad(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));
  const selectedFund = funds.find(f => f.key === form.fund_key);

  function openNew() { setForm({ ...EMPTY, entry_date: new Date().toISOString().slice(0,10), fund_key: funds[0]?.key || '' }); setModal(true); }

  async function save(e) {
    e.preventDefault();
    if (!form.fund_key || !form.amount || !form.particulars) { toast('Fund, amount and particulars required', 'warning'); return; }
    setSaving(true);
    try {
      await procurementAPI.obrCreate(form);
      toast('Obligation posted — RAO balance updated', 'success');
      setModal(false); load();
    } catch (err) { toast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete this obligation request? The RAO obligation will be reversed.')) return;
    try { await procurementAPI.obrDelete(id); toast('Deleted — obligation reversed', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  function print(r) {
    printDoc('Obligation Request', `
      ${govHeader('OBLIGATION REQUEST AND STATUS (ObR)')}
      <table>
        <tr><td style="width:38%;"><b>Ref No.</b></td><td>${r.ref_no||''}</td></tr>
        <tr><td><b>Date</b></td><td>${fmtDate(r.entry_date)}</td></tr>
        <tr><td><b>Office</b></td><td>${r.office||''}</td></tr>
        <tr><td><b>Payee</b></td><td>${r.payee||''}</td></tr>
        <tr><td><b>Particulars</b></td><td>${r.particulars||''}</td></tr>
        <tr><td><b>Fund</b></td><td>${r.fund_key||''}</td></tr>
        <tr><td><b>Amount Obligated</b></td><td>${peso(r.amount)}</td></tr>
        <tr><td><b>Status</b></td><td>${(r.status||'').toUpperCase()}</td></tr>
      </table>
      <div class="sig-block">
        <div><div class="sig-name" style="min-width:220px;">${BRGY.treasurer}</div><div class="sig-title">Barangay Treasurer</div></div>
        <div><div class="sig-name" style="min-width:220px;">${BRGY.budgetOfficer}</div><div class="sig-title">Budget Officer</div></div>
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
            <FileSignature size={22} className="text-indigo-600"/> Obligation Request (ObR)
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Step 1 of the procurement chain — commits the RAO budget</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-1.5"><Plus size={15}/> New Obligation</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Ref','Date','Fund','Payee','Particulars','Amount','Status','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {loading ? <tr><td colSpan={8} className="py-10 text-center text-gray-400">Loading…</td></tr>
              : rows.length===0 ? <tr><td colSpan={8} className="py-14 text-center text-gray-400">No obligation requests</td></tr>
              : rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td font-mono text-[11px] text-indigo-500">{r.ref_no}</td>
                  <td className="table-td text-gray-400 whitespace-nowrap">{fmtDate(r.entry_date)}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.fund_key}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.payee}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400 max-w-xs truncate">{r.particulars}</td>
                  <td className="table-td font-semibold text-gray-900 dark:text-slate-100">{peso(r.amount)}</td>
                  <td className="table-td"><Badge status="active" label={r.status}/></td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-1">
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

      <Modal open={modal} onClose={()=>setModal(false)} title="New Obligation Request" size="md">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className={lbl}>Fund *</label>
            <select className={inp} value={form.fund_key} onChange={e=>set('fund_key',e.target.value)}>
              {funds.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            {selectedFund && <p className="text-[11px] text-gray-400 mt-1">Available balance: {peso(selectedFund.balance)}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Date</label><input type="date" className={inp} value={form.entry_date} onChange={e=>set('entry_date',e.target.value)}/></div>
            <div><label className={lbl}>Office</label><input className={inp} value={form.office} onChange={e=>set('office',e.target.value)}/></div>
          </div>
          <div><label className={lbl}>Payee</label><input className={inp} value={form.payee} onChange={e=>set('payee',e.target.value)}/></div>
          <div><label className={lbl}>Particulars *</label><textarea className={inp} rows={2} value={form.particulars} onChange={e=>set('particulars',e.target.value)}/></div>
          <div><label className={lbl}>Amount to Obligate (₱) *</label><input type="number" step="0.01" className={inp} value={form.amount} onChange={e=>set('amount',e.target.value)}/></div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Posting…':'Post Obligation'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

