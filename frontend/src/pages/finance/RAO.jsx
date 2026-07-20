import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { raoAPI } from '../../api/apiClient';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import { BookOpen, Plus, Printer, Pencil, Trash2 } from 'lucide-react';
import { BRGY, peso, fmtDate, printDoc, govHeader } from './financeHelpers';

const EMPTY = { entry_date:'', particulars:'', account_code:'', payee:'', obligation_amount:'', disbursement_amount:'' };

export default function RAO() {
  const { toast } = useToast();
  const year = new Date().getFullYear();
  const [funds, setFunds]   = useState([]);
  const [hasBudget, setHasBudget] = useState(true);
  const [active, setActive] = useState('general_fund');
  const [entries, setEntries] = useState([]);
  const [loading, setLoad]  = useState(true);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY);
  const [editId, setEdit]   = useState(null);
  const [saving, setSaving] = useState(false);

  const loadFunds = useCallback(async () => {
    try {
      const res = await raoAPI.getFunds(year);
      setFunds(res.data.funds || []);
      setHasBudget(res.data.hasBudget);
    } catch { toast('Failed to load funds', 'error'); }
  }, [year]);

  const loadEntries = useCallback(async () => {
    setLoad(true);
    try { setEntries((await raoAPI.getEntries(active, year)).data.entries || []); }
    catch { toast('Failed to load ledger', 'error'); }
    finally { setLoad(false); }
  }, [active, year]);

  useEffect(() => { loadFunds(); }, [loadFunds]);
  useEffect(() => { loadEntries(); }, [loadEntries]);

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));
  const fund = funds.find(f => f.key === active);

  const totals = useMemo(() => ({
    appropriation: funds.reduce((s,f)=>s+f.appropriation,0),
    obligated:     funds.reduce((s,f)=>s+f.obligated,0),
    disbursed:     funds.reduce((s,f)=>s+f.disbursed,0),
    balance:       funds.reduce((s,f)=>s+f.balance,0),
  }), [funds]);

  function openNew()  { setForm({ ...EMPTY, entry_date: new Date().toISOString().slice(0,10) }); setEdit(null); setModal(true); }
  function openEdit(r){ setForm({ ...r, entry_date: r.entry_date?.slice(0,10)||'' }); setEdit(r.id); setModal(true); }

  async function save(e) {
    e.preventDefault();
    if (!form.particulars) { toast('Particulars required', 'warning'); return; }
    setSaving(true);
    try {
      if (editId) { await raoAPI.updateEntry(editId, form); toast('Entry updated', 'success'); }
      else        { await raoAPI.createEntry({ ...form, fund_key: active, fiscal_year: year }); toast('RAO entry posted', 'success'); }
      setModal(false); loadEntries(); loadFunds();
    } catch (err) { toast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete this RAO entry?')) return;
    try { await raoAPI.deleteEntry(id); toast('Deleted', 'success'); loadEntries(); loadFunds(); }
    catch { toast('Delete failed', 'error'); }
  }

  function printRAO() {
    const list = entries.slice().reverse();
    let running = 0;
    printDoc('Record of Appropriations, Obligations & Disbursements', `
      ${govHeader('RECORD OF APPROPRIATIONS, OBLIGATIONS AND DISBURSEMENTS (RAOD)')}
      <p style="font-size:12px;"><b>Fund:</b> ${fund?.label || ''} &nbsp; <b>FY:</b> ${year} &nbsp; <b>Appropriation:</b> ${peso(fund?.appropriation)}</p>
      <table>
        <tr><th>Ref No.</th><th>Date</th><th>Particulars</th><th>Account</th><th>Payee</th><th>Obligation</th><th>Disbursement</th></tr>
        ${list.map(r => {
          running += Number(r.obligation_amount||0);
          return `<tr>
            <td>${r.ref_no||''}</td><td>${fmtDate(r.entry_date)}</td><td>${r.particulars||''}</td>
            <td>${r.account_code||''}</td><td>${r.payee||''}</td>
            <td style="text-align:right;">${peso(r.obligation_amount)}</td><td style="text-align:right;">${peso(r.disbursement_amount)}</td>
          </tr>`;
        }).join('')}
        <tr><td colspan="5" style="text-align:right;"><b>TOTAL</b></td>
          <td style="text-align:right;"><b>${peso(fund?.obligated)}</b></td>
          <td style="text-align:right;"><b>${peso(fund?.disbursed)}</b></td></tr>
      </table>
      <table>
        <tr><td><b>Unobligated Balance</b></td><td style="text-align:right;">${peso(fund?.balance)}</td></tr>
        <tr><td><b>Unpaid Obligations</b></td><td style="text-align:right;">${peso(fund?.unpaidObligations)}</td></tr>
      </table>
      <div class="sig-block">
        <div><div class="sig-name" style="min-width:220px;">${BRGY.treasurer}</div><div class="sig-title">Barangay Treasurer</div></div>
        <div><div class="sig-name" style="min-width:220px;">${BRGY.budgetOfficer}</div><div class="sig-title">Budget Officer</div></div>
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
            <BookOpen size={22} className="text-indigo-600"/> RAO — Appropriations, Obligations &amp; Disbursements
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">FY {year} · 9 statutory funds · auto-linked to declared Budget</p>
        </div>
      </div>

      {!hasBudget && (
        <div className="card p-4 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
          No budget declared for {year}. Go to <b>Finance → Budget Management</b> to declare appropriations first.
        </div>
      )}

      <div className="card p-4 grid grid-cols-4 gap-4 text-center">
        <div><p className="text-xs text-gray-400 uppercase">Total Appropriation</p><p className="text-lg font-bold text-gray-900 dark:text-slate-100">{peso(totals.appropriation)}</p></div>
        <div><p className="text-xs text-gray-400 uppercase">Total Obligated</p><p className="text-lg font-bold text-amber-600">{peso(totals.obligated)}</p></div>
        <div><p className="text-xs text-gray-400 uppercase">Total Disbursed</p><p className="text-lg font-bold text-emerald-600">{peso(totals.disbursed)}</p></div>
        <div><p className="text-xs text-gray-400 uppercase">Total Balance</p><p className="text-lg font-bold text-indigo-600">{peso(totals.balance)}</p></div>
      </div>

      {/* Fund tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {funds.map(f => (
          <button key={f.key} onClick={()=>setActive(f.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition ${active===f.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-[#1a1d27] text-gray-600 dark:text-slate-300 border-gray-200 dark:border-[#2e334a]'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {fund && (
        <div className="card p-4 grid grid-cols-4 gap-4 text-center">
          <div><p className="text-[11px] text-gray-400 uppercase">Appropriation</p><p className="font-bold text-gray-900 dark:text-slate-100">{peso(fund.appropriation)}</p></div>
          <div><p className="text-[11px] text-gray-400 uppercase">Obligated</p><p className="font-bold text-amber-600">{peso(fund.obligated)}</p></div>
          <div><p className="text-[11px] text-gray-400 uppercase">Disbursed</p><p className="font-bold text-emerald-600">{peso(fund.disbursed)}</p></div>
          <div><p className="text-[11px] text-gray-400 uppercase">Balance</p><p className="font-bold" style={{color: fund.balance < 0 ? '#ef4444' : '#4f46e5'}}>{peso(fund.balance)}</p></div>
        </div>
      )}

      <div className="page-header" style={{marginTop: 0}}>
        <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{fund?.label} Ledger</p>
        <div className="flex gap-2">
          <button onClick={printRAO} className="btn-secondary flex items-center gap-1.5"><Printer size={15}/> Print RAOD</button>
          <button onClick={openNew} className="btn-primary flex items-center gap-1.5"><Plus size={15}/> Post Entry</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Ref','Date','Particulars','Account','Payee','Obligation','Disbursement','Source','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {loading ? <tr><td colSpan={9} className="py-10 text-center text-gray-400">Loading…</td></tr>
              : entries.length===0 ? <tr><td colSpan={9} className="py-14 text-center text-gray-400">No entries for this fund</td></tr>
              : entries.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td font-mono text-[11px] text-indigo-500">{r.ref_no}</td>
                  <td className="table-td text-gray-400 whitespace-nowrap">{fmtDate(r.entry_date)}</td>
                  <td className="table-td text-gray-700 dark:text-slate-300 max-w-xs truncate">{r.particulars}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400">{r.account_code}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400">{r.payee}</td>
                  <td className="table-td text-amber-600">{peso(r.obligation_amount)}</td>
                  <td className="table-td text-emerald-600">{peso(r.disbursement_amount)}</td>
                  <td className="table-td text-gray-400 text-xs">{r.source_module}</td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-1">
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

      <Modal open={modal} onClose={()=>setModal(false)} title={editId?'Edit RAO Entry':`Post Entry — ${fund?.label}`} size="md">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Date</label><input type="date" className={inp} value={form.entry_date} onChange={e=>set('entry_date',e.target.value)}/></div>
            <div><label className={lbl}>Account Code</label><input className={inp} value={form.account_code} onChange={e=>set('account_code',e.target.value)}/></div>
          </div>
          <div><label className={lbl}>Particulars *</label><input className={inp} value={form.particulars} onChange={e=>set('particulars',e.target.value)}/></div>
          <div><label className={lbl}>Payee</label><input className={inp} value={form.payee} onChange={e=>set('payee',e.target.value)}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Obligation Amount (₱)</label><input type="number" step="0.01" className={inp} value={form.obligation_amount} onChange={e=>set('obligation_amount',e.target.value)}/></div>
            <div><label className={lbl}>Disbursement Amount (₱)</label><input type="number" step="0.01" className={inp} value={form.disbursement_amount} onChange={e=>set('disbursement_amount',e.target.value)}/></div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Post Entry'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

