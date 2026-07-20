import React, { useState, useEffect, useCallback } from 'react';
import { procurementAPI } from '../../../api/apiClient';
import { useToast } from '../../../components/Toast';
import Modal from '../../../components/Modal';
import { Boxes, Printer, Pencil, Trash2 } from 'lucide-react';
import { BRGY, fmtDate, printDoc, govHeader } from '../financeHelpers';

export default function RequisitionIssue() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoad] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [editId, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    try { setRows((await procurementAPI.risGetAll()).data.slips || []); }
    catch { toast('Failed to load RIS records', 'error'); }
    finally { setLoad(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));
  function openEdit(r) { setForm(r); setEdit(r.id); setModal(true); }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try { await procurementAPI.risUpdate(editId, form); toast('RIS updated', 'success'); setModal(false); load(); }
    catch (err) { toast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete this RIS?')) return;
    try { await procurementAPI.risDelete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  function print(r) {
    const items = JSON.parse(r.items || '[]');
    printDoc('Requisition & Issue Slip', `
      ${govHeader('REQUISITION AND ISSUE SLIP (RIS)')}
      <table>
        <tr><td style="width:38%;"><b>Ref No.</b></td><td>${r.ref_no||''}</td></tr>
        <tr><td><b>From IAR</b></td><td>${r.iar_ref_no||''}</td></tr>
        <tr><td><b>Date</b></td><td>${fmtDate(r.ris_date)}</td></tr>
        <tr><td><b>Requested By</b></td><td>${r.requested_by||''}</td></tr>
        <tr><td><b>Office</b></td><td>${r.office||''}</td></tr>
        <tr><td><b>Purpose</b></td><td>${r.purpose||''}</td></tr>
      </table>
      <table>
        <tr><th>Description</th><th>Qty</th><th>Unit</th></tr>
        ${items.map(i=>`<tr><td>${i.description}</td><td style="text-align:center;">${i.qty}</td><td style="text-align:center;">${i.unit}</td></tr>`).join('')}
      </table>
      <div class="sig-block">
        <div><div class="sig-name" style="min-width:200px;">${r.requested_by||''}</div><div class="sig-title">Requested by</div></div>
        <div><div class="sig-name" style="min-width:220px;">${BRGY.treasurer}</div><div class="sig-title">Issued by — Barangay Treasurer</div></div>
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
            <Boxes size={22} className="text-indigo-600"/> Requisition &amp; Issue Slip (RIS)
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Step 5a — supply issuance, auto-generated from an IAR</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Ref','From IAR','Date','Requested By','Office','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {loading ? <tr><td colSpan={6} className="py-10 text-center text-gray-400">Loading…</td></tr>
              : rows.length===0 ? <tr><td colSpan={6} className="py-14 text-center text-gray-400">No RIS records — generate one from an IAR</td></tr>
              : rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td font-mono text-[11px] text-indigo-500">{r.ref_no}</td>
                  <td className="table-td text-gray-400 text-xs">{r.iar_ref_no}</td>
                  <td className="table-td text-gray-400 whitespace-nowrap">{fmtDate(r.ris_date)}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.requested_by}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400">{r.office}</td>
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

      <Modal open={modal} onClose={()=>setModal(false)} title="Edit RIS" size="md">
        <form onSubmit={save} className="space-y-4">
          <div><label className={lbl}>Requested By</label><input className={inp} value={form.requested_by||''} onChange={e=>set('requested_by',e.target.value)}/></div>
          <div><label className={lbl}>Office</label><input className={inp} value={form.office||''} onChange={e=>set('office',e.target.value)}/></div>
          <div><label className={lbl}>Purpose</label><textarea className={inp} rows={2} value={form.purpose||''} onChange={e=>set('purpose',e.target.value)}/></div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

