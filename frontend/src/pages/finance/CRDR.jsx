import React, { useState, useEffect, useCallback } from 'react';
import { cashbookAPI } from '../../api/apiClient';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import { BookText, Plus, Printer, Trash2 } from 'lucide-react';
import { BRGY, peso, fmtDate, printDoc, govHeader } from './financeHelpers';

const EMPTY = { entry_date:'', particulars:'', payee_payor:'', receipt_amount:'', disbursement_amount:'' };

export default function CRDR() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoad] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    try { setRows((await cashbookAPI.crdrGetAll()).data.entries || []); }
    catch { toast('Failed to load CRDR', 'error'); }
    finally { setLoad(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));
  function openNew() { setForm({ ...EMPTY, entry_date: new Date().toISOString().slice(0,10) }); setModal(true); }

  async function save(e) {
    e.preventDefault();
    if (!form.particulars || (!form.receipt_amount && !form.disbursement_amount)) {
      toast('Particulars and a receipt or disbursement amount are required', 'warning'); return;
    }
    setSaving(true);
    try { await cashbookAPI.crdrCreate(form); toast('CRDR entry posted', 'success'); setModal(false); load(); }
    catch (err) { toast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete this CRDR entry?')) return;
    try { await cashbookAPI.crdrDelete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  const totalReceipts = rows.reduce((s,r)=>s+Number(r.receipt_amount||0),0);
  const totalDisb = rows.reduce((s,r)=>s+Number(r.disbursement_amount||0),0);
  const balance = rows.length ? rows[0].running_balance : 0;

  function printLedger() {
    printDoc('Cash Receipts & Disbursements Record', `
      ${govHeader('CASH RECEIPTS AND DISBURSEMENTS RECORD (CRDR)')}
      <table>
        <tr><th>Date</th><th>Ref</th><th>Particulars</th><th>Receipts</th><th>Disbursements</th><th>Balance</th></tr>
        ${[...rows].reverse().map(r=>`<tr><td>${fmtDate(r.entry_date)}</td><td>${r.ref_no}</td><td>${r.particulars}</td><td style="text-align:right;">${r.receipt_amount>0?peso(r.receipt_amount):''}</td><td style="text-align:right;">${r.disbursement_amount>0?peso(r.disbursement_amount):''}</td><td style="text-align:right;">${peso(r.running_balance)}</td></tr>`).join('')}
      </table>
      <div class="sig-block">
        <div><div class="sig-name" style="min-width:220px;">${BRGY.treasurer}</div><div class="sig-title">Barangay Treasurer</div></div>
      </div>
    `);
  }

  const inp = "w-full border border-gray-300 dark:border-[#2e334a] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#1a1d27] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const lbl = "block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1";

  return (
    <div className="w-full space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <BookText size={22} className="text-indigo-600"/> Cash Receipts &amp; Disbursements Record (CRDR)
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Combined cashbook — collections and disbursement vouchers post here automatically</p>
        </div>
        <div className="flex gap-2">
          <button onClick={printLedger} className="btn-secondary flex items-center gap-1.5"><Printer size={15}/> Print</button>
          <button onClick={openNew} className="btn-primary flex items-center gap-1.5"><Plus size={15}/> Manual Entry</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-400 uppercase font-bold">Total Receipts</p><p className="text-xl font-bold text-emerald-600">{peso(totalReceipts)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-400 uppercase font-bold">Total Disbursements</p><p className="text-xl font-bold text-red-500">{peso(totalDisb)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-400 uppercase font-bold">Current Balance</p><p className="text-xl font-bold text-gray-900 dark:text-slate-100">{peso(balance)}</p></div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Date','Ref','Particulars','Receipt','Disbursement','Balance','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {loading ? <tr><td colSpan={7} className="py-10 text-center text-gray-400">Loading…</td></tr>
              : rows.length===0 ? <tr><td colSpan={7} className="py-14 text-center text-gray-400">No entries yet</td></tr>
              : rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td text-gray-400 whitespace-nowrap">{fmtDate(r.entry_date)}</td>
                  <td className="table-td font-mono text-[11px] text-indigo-500">{r.ref_no}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.particulars}</td>
                  <td className="table-td text-right text-emerald-600">{r.receipt_amount>0 ? peso(r.receipt_amount) : ''}</td>
                  <td className="table-td text-right text-red-500">{r.disbursement_amount>0 ? peso(r.disbursement_amount) : ''}</td>
                  <td className="table-td text-right font-semibold text-gray-900 dark:text-slate-100">{peso(r.running_balance)}</td>
                  <td className="table-td">
                    {r.source_module === 'manual' && <button onClick={()=>del(r.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Manual CRDR Entry" size="md">
        <form onSubmit={save} className="space-y-4">
          <div><label className={lbl}>Date</label><input type="date" className={inp} value={form.entry_date} onChange={e=>set('entry_date',e.target.value)}/></div>
          <div><label className={lbl}>Particulars *</label><input className={inp} value={form.particulars} onChange={e=>set('particulars',e.target.value)}/></div>
          <div><label className={lbl}>Payee / Payor</label><input className={inp} value={form.payee_payor} onChange={e=>set('payee_payor',e.target.value)}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Receipt Amount (₱)</label><input type="number" step="0.01" className={inp} value={form.receipt_amount} onChange={e=>set('receipt_amount',e.target.value)}/></div>
            <div><label className={lbl}>Disbursement Amount (₱)</label><input type="number" step="0.01" className={inp} value={form.disbursement_amount} onChange={e=>set('disbursement_amount',e.target.value)}/></div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Posting…':'Post Entry'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

