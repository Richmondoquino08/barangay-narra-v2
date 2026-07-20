import React, { useState, useEffect, useCallback } from 'react';
import { financeFormsAPI } from '../../api/apiClient';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { Wallet, Plus, Printer, Pencil, Trash2 } from 'lucide-react';
import { BRGY, peso, fmtDate, printDoc, govHeader } from './financeHelpers';

const EMPTY = { custodian_name:'', date_established:'', fund_amount:'', status:'active', remarks:'' };

export default function PettyCashFund() {
  const { toast } = useToast();
  const [rows, setRows]   = useState([]);
  const [loading, setLoad]= useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState(EMPTY);
  const [editId, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    try { setRows((await financeFormsAPI.pcfGetAll()).data.funds || []); }
    catch { toast('Failed to load petty cash funds', 'error'); }
    finally { setLoad(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));

  function openNew()  { setForm({ ...EMPTY, date_established: new Date().toISOString().slice(0,10) }); setEdit(null); setModal(true); }
  function openEdit(r){ setForm({ ...r, date_established: r.date_established?.slice(0,10)||'' }); setEdit(r.id); setModal(true); }

  async function save(e) {
    e.preventDefault();
    if (!form.custodian_name || !form.fund_amount) { toast('Custodian and fund amount required', 'warning'); return; }
    setSaving(true);
    try {
      if (editId) { await financeFormsAPI.pcfUpdate(editId, form); toast('Fund updated', 'success'); }
      else        { await financeFormsAPI.pcfCreate(form);         toast('Petty cash fund established', 'success'); }
      setModal(false); load();
    } catch (err) { toast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete this fund? Linked vouchers will also be removed.')) return;
    try { await financeFormsAPI.pcfDelete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  function print(r) {
    printDoc('Petty Cash Fund', `
      ${govHeader('PETTY CASH FUND ESTABLISHMENT')}
      <table>
        <tr><td style="width:38%;"><b>Reference No.</b></td><td>${r.ref_no||''}</td></tr>
        <tr><td><b>Custodian</b></td><td>${r.custodian_name||''}</td></tr>
        <tr><td><b>Date Established</b></td><td>${fmtDate(r.date_established)}</td></tr>
        <tr><td><b>Fund Amount</b></td><td>${peso(r.fund_amount)}</td></tr>
        <tr><td><b>Current Balance</b></td><td>${peso(r.current_balance)}</td></tr>
        <tr><td><b>Status</b></td><td>${(r.status||'').toUpperCase()}</td></tr>
        <tr><td><b>Remarks</b></td><td>${r.remarks||''}</td></tr>
      </table>
      <div class="sig-block">
        <div><div class="sig-name" style="min-width:220px;">${r.custodian_name||''}</div><div class="sig-title">Petty Cash Custodian</div></div>
        <div><div class="sig-name" style="min-width:220px;">${BRGY.treasurer}</div><div class="sig-title">Barangay Treasurer</div></div>
      </div>
      <p class="meta">Ref: ${r.ref_no||'—'}</p>
    `);
  }

  const inp = "w-full border border-gray-300 dark:border-[#2e334a] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#1a1d27] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const lbl = "block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1";

  const totalActive = rows.filter(r=>r.status==='active').reduce((s,r)=>s+Number(r.current_balance||0),0);

  return (
    <div className="w-full space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Wallet size={22} className="text-indigo-600"/> Petty Cash Fund (PCF)
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{rows.length} funds · {peso(totalActive)} active balance</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-1.5"><Plus size={15}/> Establish Fund</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Ref / Custodian','Established','Fund Amount','Balance','Status','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {loading ? <tr><td colSpan={6} className="py-10 text-center text-gray-400">Loading…</td></tr>
              : rows.length===0 ? <tr><td colSpan={6} className="py-14 text-center text-gray-400">No petty cash funds</td></tr>
              : rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td"><p className="font-medium text-gray-900 dark:text-slate-100">{r.custodian_name}</p><p className="text-[11px] font-mono text-indigo-500">{r.ref_no}</p></td>
                  <td className="table-td text-gray-400 whitespace-nowrap">{fmtDate(r.date_established)}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{peso(r.fund_amount)}</td>
                  <td className="table-td font-semibold" style={{color: Number(r.current_balance) < Number(r.fund_amount)*0.25 ? '#ef4444' : 'inherit'}}>{peso(r.current_balance)}</td>
                  <td className="table-td"><Badge status={r.status==='active'?'active':'inactive'}/></td>
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

      <Modal open={modal} onClose={()=>setModal(false)} title={editId?'Edit Fund':'Establish Petty Cash Fund'} size="md">
        <form onSubmit={save} className="space-y-4">
          <div><label className={lbl}>Custodian Name *</label><input className={inp} value={form.custodian_name} onChange={e=>set('custodian_name',e.target.value)}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Date Established</label><input type="date" className={inp} value={form.date_established} onChange={e=>set('date_established',e.target.value)}/></div>
            <div><label className={lbl}>Fund Amount (₱) *</label><input type="number" step="0.01" className={inp} value={form.fund_amount} onChange={e=>set('fund_amount',e.target.value)} disabled={!!editId}/></div>
          </div>
          {editId && <p className="text-[11px] text-amber-500">Fund amount is fixed after establishment — balance changes automatically via SPPCV vouchers.</p>}
          <div><label className={lbl}>Status</label>
            <select className={inp} value={form.status} onChange={e=>set('status',e.target.value)}>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div><label className={lbl}>Remarks</label><textarea className={inp} rows={2} value={form.remarks} onChange={e=>set('remarks',e.target.value)}/></div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Save Fund'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

