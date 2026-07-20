import React, { useState, useEffect, useCallback } from 'react';
import { procurementAPI } from '../../../api/apiClient';
import { useToast } from '../../../components/Toast';
import Modal from '../../../components/Modal';
import Badge from '../../../components/Badge';
import { PackageCheck, Printer, Pencil, Trash2, ArrowRightCircle, Receipt } from 'lucide-react';
import { BRGY, peso, fmtDate, printDoc, govHeader } from '../financeHelpers';

export default function InspectionAcceptance() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoad] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [editId, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    try { setRows((await procurementAPI.iarGetAll()).data.reports || []); }
    catch { toast('Failed to load IAR records', 'error'); }
    finally { setLoad(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));
  function openEdit(r) { setForm(r); setEdit(r.id); setModal(true); }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try { await procurementAPI.iarUpdate(editId, form); toast('IAR updated', 'success'); setModal(false); load(); }
    catch (err) { toast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete this IAR?')) return;
    try { await procurementAPI.iarDelete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  async function genRIS(id) {
    try { await procurementAPI.iarGenerateRIS(id); toast('Requisition & Issue Slip generated', 'success'); load(); }
    catch (err) { toast(err.response?.data?.message || 'Failed to generate RIS', 'error'); }
  }

  async function genDV(id) {
    try { await procurementAPI.iarGenerateDV(id); toast('Disbursement Voucher generated', 'success'); load(); }
    catch (err) { toast(err.response?.data?.message || 'Failed to generate DV', 'error'); }
  }

  function print(r) {
    const items = JSON.parse(r.items || '[]');
    printDoc('Inspection & Acceptance Report', `
      ${govHeader('INSPECTION AND ACCEPTANCE REPORT (IAR)')}
      <table>
        <tr><td style="width:38%;"><b>Ref No.</b></td><td>${r.ref_no||''}</td></tr>
        <tr><td><b>From PO</b></td><td>${r.po_ref_no||''}</td></tr>
        <tr><td><b>Supplier</b></td><td>${r.supplier_name||''}</td></tr>
        <tr><td><b>Date Inspected</b></td><td>${fmtDate(r.date_inspected)}</td></tr>
        <tr><td><b>Date Received</b></td><td>${fmtDate(r.date_received)}</td></tr>
        <tr><td><b>Inspected By</b></td><td>${r.inspected_by||''}</td></tr>
        <tr><td><b>Complete Delivery</b></td><td>${r.complete ? 'YES' : 'NO — Partial'}</td></tr>
        <tr><td><b>Remarks</b></td><td>${r.remarks||''}</td></tr>
      </table>
      <table>
        <tr><th>Description</th><th>Qty</th><th>Unit</th></tr>
        ${items.map(i=>`<tr><td>${i.description}</td><td style="text-align:center;">${i.qty}</td><td style="text-align:center;">${i.unit}</td></tr>`).join('')}
      </table>
      <p style="font-style:italic;font-size:12px;margin-top:14px;">I hereby certify that the above items have been inspected and accepted in accordance with the Purchase Order.</p>
      <div class="sig-block">
        <div><div class="sig-name" style="min-width:200px;">${r.inspected_by||''}</div><div class="sig-title">Inspection Officer</div></div>
        <div><div class="sig-name" style="min-width:220px;">${BRGY.captain}</div><div class="sig-title">Barangay Captain</div></div>
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
            <PackageCheck size={22} className="text-indigo-600"/> Inspection &amp; Acceptance Report (IAR)
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Step 4 — auto-generated on PO delivery · branches to RIS and/or DV</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Ref','From PO','Supplier','Inspected','Complete','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {loading ? <tr><td colSpan={6} className="py-10 text-center text-gray-400">Loading…</td></tr>
              : rows.length===0 ? <tr><td colSpan={6} className="py-14 text-center text-gray-400">No IAR records — generate one from a Purchase Order</td></tr>
              : rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td font-mono text-[11px] text-indigo-500">{r.ref_no}</td>
                  <td className="table-td text-gray-400 text-xs">{r.po_ref_no}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.supplier_name}</td>
                  <td className="table-td text-gray-400 whitespace-nowrap">{fmtDate(r.date_inspected)}</td>
                  <td className="table-td"><Badge status={r.complete?'completed':'pending'} label={r.complete?'Complete':'Partial'}/></td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-1">
                      <button onClick={()=>print(r)} className="act-btn act-gray"><Printer size={12}/> Print</button>
                      <button onClick={()=>openEdit(r)} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                      <button onClick={()=>genRIS(r.id)} className="act-btn act-indigo"><ArrowRightCircle size={12}/> Gen RIS</button>
                      <button onClick={()=>genDV(r.id)} className="act-btn act-green"><Receipt size={12}/> Gen DV</button>
                      <button onClick={()=>del(r.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Edit IAR" size="md">
        <form onSubmit={save} className="space-y-4">
          <div><label className={lbl}>Inspected By</label><input className={inp} value={form.inspected_by||''} onChange={e=>set('inspected_by',e.target.value)}/></div>
          <div>
            <label className={lbl}>Delivery Status</label>
            <select className={inp} value={form.complete ? '1':'0'} onChange={e=>set('complete', e.target.value==='1')}>
              <option value="1">Complete</option>
              <option value="0">Partial</option>
            </select>
          </div>
          <div><label className={lbl}>Remarks</label><textarea className={inp} rows={2} value={form.remarks||''} onChange={e=>set('remarks',e.target.value)}/></div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

