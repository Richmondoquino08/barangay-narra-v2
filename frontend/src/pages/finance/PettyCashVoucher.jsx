import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { financeFormsAPI } from '../../api/apiClient';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import { Receipt, Plus, Printer, Pencil, Trash2 } from 'lucide-react';
import { BRGY, peso, fmtDate, printDoc, govHeader } from './financeHelpers';

const EMPTY = { pcf_id:'', pcv_date:'', payee:'', particulars:'', account_code:'', amount:'' };

export default function PettyCashVoucher() {
  const { toast } = useToast();
  const [funds, setFunds] = useState([]);
  const [rows, setRows]   = useState([]);
  const [loading, setLoad]= useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState(EMPTY);
  const [editId, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fFund, setFFund] = useState('');

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const [fundsRes, vouchersRes] = await Promise.all([
        financeFormsAPI.pcfGetAll(),
        financeFormsAPI.sppcvGetAll(),
      ]);
      setFunds(fundsRes.data.funds || []);
      setRows(vouchersRes.data.vouchers || []);
    } catch { toast('Failed to load vouchers', 'error'); }
    finally { setLoad(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));

  const activeFunds = useMemo(() => funds.filter(f => f.status === 'active'), [funds]);
  const selectedFund = funds.find(f => f.id === Number(form.pcf_id));
  const filtered = useMemo(() => fFund ? rows.filter(r => r.pcf_id === Number(fFund)) : rows, [rows, fFund]);
  const totalFiltered = filtered.reduce((s,r)=>s+Number(r.amount||0),0);

  function openNew()  { setForm({ ...EMPTY, pcv_date: new Date().toISOString().slice(0,10), pcf_id: activeFunds[0]?.id || '' }); setEdit(null); setModal(true); }
  function openEdit(r){ setForm({ ...r, pcv_date: r.pcv_date?.slice(0,10)||'' }); setEdit(r.id); setModal(true); }

  async function save(e) {
    e.preventDefault();
    if (!form.pcf_id || !form.payee || !form.amount) { toast('Fund, payee and amount required', 'warning'); return; }
    setSaving(true);
    try {
      if (editId) { await financeFormsAPI.sppcvUpdate(editId, form); toast('Voucher updated', 'success'); }
      else        { await financeFormsAPI.sppcvCreate(form);         toast('Voucher posted — PCF balance auto-deducted', 'success'); }
      setModal(false); load();
    } catch (err) { toast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete this voucher? The amount will be restored to the PCF balance.')) return;
    try { await financeFormsAPI.sppcvDelete(id); toast('Deleted — balance restored', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  function print(r) {
    printDoc('Petty Cash Voucher', `
      ${govHeader('PETTY CASH VOUCHER')}
      <table>
        <tr><td style="width:38%;"><b>PCV No.</b></td><td>${r.ref_no||''}</td></tr>
        <tr><td><b>Date</b></td><td>${fmtDate(r.pcv_date)}</td></tr>
        <tr><td><b>Charged to PCF</b></td><td>${r.pcf_ref_no||''} — ${r.custodian_name||''}</td></tr>
        <tr><td><b>Payee</b></td><td>${r.payee||''}</td></tr>
        <tr><td><b>Particulars</b></td><td>${r.particulars||''}</td></tr>
        <tr><td><b>Account Code</b></td><td>${r.account_code||''}</td></tr>
        <tr><td><b>Amount</b></td><td>${peso(r.amount)}</td></tr>
        <tr><td><b>Balance After</b></td><td>${peso(r.balance_after)}</td></tr>
      </table>
      <div class="sig-block">
        <div><div class="sig-name" style="min-width:200px;">${r.payee||''}</div><div class="sig-title">Received Payment</div></div>
        <div><div class="sig-name" style="min-width:220px;">${BRGY.treasurer}</div><div class="sig-title">Barangay Treasurer</div></div>
      </div>
      <p class="meta">Ref: ${r.ref_no||'—'}</p>
    `);
  }

  function printSummary() {
    const fundLabel = fFund ? funds.find(f=>f.id===Number(fFund)) : null;
    const list = filtered.slice().reverse(); // chronological
    printDoc('Summary of Paid Petty Cash Vouchers', `
      ${govHeader('SUMMARY OF PAID PETTY CASH VOUCHERS (SPPCV)')}
      <p style="font-size:12px;">${fundLabel ? `Fund: ${fundLabel.ref_no} — ${fundLabel.custodian_name}` : 'All Funds'}</p>
      <table>
        <tr><th>PCV No.</th><th>Date</th><th>Payee</th><th>Particulars</th><th>Account</th><th>Amount</th><th>Balance</th></tr>
        ${list.map(r => `
          <tr>
            <td>${r.ref_no||''}</td><td>${fmtDate(r.pcv_date)}</td><td>${r.payee||''}</td>
            <td>${r.particulars||''}</td><td>${r.account_code||''}</td>
            <td style="text-align:right;">${peso(r.amount)}</td><td style="text-align:right;">${peso(r.balance_after)}</td>
          </tr>`).join('')}
        <tr><td colspan="5" style="text-align:right;"><b>TOTAL</b></td><td style="text-align:right;"><b>${peso(totalFiltered)}</b></td><td></td></tr>
      </table>
      <div class="sig-block">
        <div><div class="sig-name" style="min-width:220px;">${BRGY.treasurer}</div><div class="sig-title">Prepared by — Barangay Treasurer</div></div>
        <div><div class="sig-name" style="min-width:220px;">${BRGY.captain}</div><div class="sig-title">Approved by — Barangay Captain</div></div>
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
            <Receipt size={22} className="text-indigo-600"/> SPPCV — Petty Cash Vouchers
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Auto-linked to Petty Cash Fund balances · {rows.length} vouchers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={printSummary} className="btn-secondary flex items-center gap-1.5"><Printer size={15}/> Print Summary</button>
          <button onClick={openNew} disabled={activeFunds.length===0} className="btn-primary flex items-center gap-1.5"><Plus size={15}/> Post Voucher</button>
        </div>
      </div>

      {activeFunds.length===0 && (
        <div className="card p-4 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
          No active Petty Cash Fund found. Establish one in the PCF module first.
        </div>
      )}

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className={lbl}>Fund</label>
          <select className={inp} value={fFund} onChange={e=>setFFund(e.target.value)}>
            <option value="">All Funds</option>
            {funds.map(f => <option key={f.id} value={f.id}>{f.ref_no} — {f.custodian_name}</option>)}
          </select>
        </div>
        <span className="ml-auto text-sm text-gray-400">{filtered.length} shown · Total {peso(totalFiltered)}</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['PCV No.','Date','Fund','Payee','Particulars','Amount','Balance After','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {loading ? <tr><td colSpan={8} className="py-10 text-center text-gray-400">Loading…</td></tr>
              : filtered.length===0 ? <tr><td colSpan={8} className="py-14 text-center text-gray-400">No vouchers</td></tr>
              : filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td font-mono text-[11px] text-indigo-500">{r.ref_no}</td>
                  <td className="table-td text-gray-400 whitespace-nowrap">{fmtDate(r.pcv_date)}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400">{r.pcf_ref_no}</td>
                  <td className="table-td font-medium text-gray-900 dark:text-slate-100">{r.payee}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400 max-w-xs truncate">{r.particulars}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{peso(r.amount)}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{peso(r.balance_after)}</td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-1">
                      <button onClick={()=>print(r)} className="act-btn act-gray"><Printer size={12}/> Print</button>
                      <button onClick={()=>openEdit(r)} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                      <button onClick={()=>del(r.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title={editId?'Edit Voucher':'Post Petty Cash Voucher'} size="md">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className={lbl}>Petty Cash Fund *</label>
            <select className={inp} value={form.pcf_id} onChange={e=>set('pcf_id', e.target.value)}>
              <option value="">— Select Fund —</option>
              {activeFunds.map(f => <option key={f.id} value={f.id}>{f.ref_no} — {f.custodian_name} (Bal: {peso(f.current_balance)}){f.remarks ? ` · ${f.remarks}` : ''}</option>)}
            </select>
            {selectedFund && <p className="text-[11px] text-gray-400 mt-1">Available balance: {peso(selectedFund.current_balance)}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Date</label><input type="date" className={inp} value={form.pcv_date} onChange={e=>set('pcv_date',e.target.value)}/></div>
            <div><label className={lbl}>Payee *</label><input className={inp} value={form.payee} onChange={e=>set('payee',e.target.value)}/></div>
          </div>
          <div><label className={lbl}>Particulars</label><textarea className={inp} rows={2} value={form.particulars} onChange={e=>set('particulars',e.target.value)}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Account Code</label><input className={inp} value={form.account_code} onChange={e=>set('account_code',e.target.value)}/></div>
            <div><label className={lbl}>Amount (₱) *</label><input type="number" step="0.01" className={inp} value={form.amount} onChange={e=>set('amount',e.target.value)}/></div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Post Voucher'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

