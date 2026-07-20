import React, { useState, useEffect, useCallback } from 'react';
import { cashbookAPI } from '../../api/apiClient';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import { Landmark, Plus, Printer, Trash2 } from 'lucide-react';
import { BRGY, peso, fmtDate, printDoc, govHeader } from './financeHelpers';

const EMPTY = { entry_date:'', bank_name:'General Fund Account', account_no:'', particulars:'', deposit_amount:'', withdrawal_amount:'' };

export default function CHBR() {
  const { toast } = useToast();
  const [banks, setBanks] = useState([]);
  const [activeBank, setActiveBank] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoad] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const loadBanks = useCallback(async () => {
    try {
      const b = (await cashbookAPI.chbrBanks()).data.banks || [];
      setBanks(b);
      if (!activeBank && b.length) setActiveBank(b[0].bank_name);
    } catch { toast('Failed to load bank list', 'error'); }
  }, [activeBank]);

  const loadEntries = useCallback(async (bank) => {
    setLoad(true);
    try { setRows((await cashbookAPI.chbrGetAll(bank)).data.entries || []); }
    catch { toast('Failed to load CHBR entries', 'error'); }
    finally { setLoad(false); }
  }, []);

  useEffect(() => { loadBanks(); }, []);
  useEffect(() => { loadEntries(activeBank || undefined); }, [activeBank, loadEntries]);

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));
  function openNew() { setForm({ ...EMPTY, entry_date: new Date().toISOString().slice(0,10), bank_name: activeBank || 'General Fund Account' }); setModal(true); }

  async function save(e) {
    e.preventDefault();
    if (!form.bank_name || !form.particulars || (!form.deposit_amount && !form.withdrawal_amount)) {
      toast('Bank, particulars and a deposit or withdrawal amount are required', 'warning'); return;
    }
    setSaving(true);
    try { await cashbookAPI.chbrCreate(form); toast('CHBR entry posted', 'success'); setModal(false); loadBanks(); loadEntries(activeBank); }
    catch (err) { toast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete this CHBR entry?')) return;
    try { await cashbookAPI.chbrDelete(id); toast('Deleted', 'success'); loadBanks(); loadEntries(activeBank); }
    catch { toast('Delete failed', 'error'); }
  }

  function printLedger() {
    printDoc('Cash in Bank Register', `
      ${govHeader(`CASH IN BANK REGISTER (CHBR) — ${activeBank||''}`)}
      <table>
        <tr><th>Date</th><th>Ref</th><th>Particulars</th><th>Deposit</th><th>Withdrawal</th><th>Balance</th></tr>
        ${[...rows].reverse().map(r=>`<tr><td>${fmtDate(r.entry_date)}</td><td>${r.ref_no}</td><td>${r.particulars}</td><td style="text-align:right;">${r.deposit_amount>0?peso(r.deposit_amount):''}</td><td style="text-align:right;">${r.withdrawal_amount>0?peso(r.withdrawal_amount):''}</td><td style="text-align:right;">${peso(r.running_balance)}</td></tr>`).join('')}
      </table>
      <div class="sig-block">
        <div><div class="sig-name" style="min-width:220px;">${BRGY.treasurer}</div><div class="sig-title">Barangay Treasurer</div></div>
      </div>
    `);
  }

  const inp = "w-full border border-gray-300 dark:border-[#2e334a] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#1a1d27] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const lbl = "block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1";
  const balance = rows.length ? rows[0].running_balance : 0;

  return (
    <div className="w-full space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Landmark size={22} className="text-indigo-600"/> Cash in Bank Register (CHBR)
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Per-bank ledger — deposited collections and check/transfer disbursements post automatically</p>
        </div>
        <div className="flex gap-2">
          <button onClick={printLedger} className="btn-secondary flex items-center gap-1.5"><Printer size={15}/> Print</button>
          <button onClick={openNew} className="btn-primary flex items-center gap-1.5"><Plus size={15}/> Manual Entry</button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {banks.map(b => (
          <button key={b.bank_name} onClick={()=>setActiveBank(b.bank_name)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border ${activeBank===b.bank_name ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-[#1a1d27] text-gray-600 dark:text-slate-300 border-gray-200 dark:border-[#2e334a]'}`}>
            {b.bank_name} · {peso(b.balance)}
          </button>
        ))}
        {banks.length===0 && <p className="text-sm text-gray-400">No bank accounts yet — post a manual entry to create one.</p>}
      </div>

      <div className="card p-4 max-w-xs"><p className="text-xs text-gray-400 uppercase font-bold">Current Balance — {activeBank}</p><p className="text-xl font-bold text-gray-900 dark:text-slate-100">{peso(balance)}</p></div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Date','Ref','Particulars','Deposit','Withdrawal','Balance','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {loading ? <tr><td colSpan={7} className="py-10 text-center text-gray-400">Loading…</td></tr>
              : rows.length===0 ? <tr><td colSpan={7} className="py-14 text-center text-gray-400">No entries yet</td></tr>
              : rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td text-gray-400 whitespace-nowrap">{fmtDate(r.entry_date)}</td>
                  <td className="table-td font-mono text-[11px] text-indigo-500">{r.ref_no}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.particulars}</td>
                  <td className="table-td text-right text-emerald-600">{r.deposit_amount>0 ? peso(r.deposit_amount) : ''}</td>
                  <td className="table-td text-right text-red-500">{r.withdrawal_amount>0 ? peso(r.withdrawal_amount) : ''}</td>
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

      <Modal open={modal} onClose={()=>setModal(false)} title="Manual CHBR Entry" size="md">
        <form onSubmit={save} className="space-y-4">
          <div><label className={lbl}>Date</label><input type="date" className={inp} value={form.entry_date} onChange={e=>set('entry_date',e.target.value)}/></div>
          <div><label className={lbl}>Bank Name *</label><input className={inp} value={form.bank_name} onChange={e=>set('bank_name',e.target.value)}/></div>
          <div><label className={lbl}>Account No.</label><input className={inp} value={form.account_no} onChange={e=>set('account_no',e.target.value)}/></div>
          <div><label className={lbl}>Particulars *</label><input className={inp} value={form.particulars} onChange={e=>set('particulars',e.target.value)}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Deposit Amount (₱)</label><input type="number" step="0.01" className={inp} value={form.deposit_amount} onChange={e=>set('deposit_amount',e.target.value)}/></div>
            <div><label className={lbl}>Withdrawal Amount (₱)</label><input type="number" step="0.01" className={inp} value={form.withdrawal_amount} onChange={e=>set('withdrawal_amount',e.target.value)}/></div>
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

