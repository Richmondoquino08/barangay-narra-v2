import React, { useState, useEffect, useCallback } from 'react';
import { procurementAPI } from '../../../api/apiClient';
import { useToast } from '../../../components/Toast';
import Modal from '../../../components/Modal';
import Badge from '../../../components/Badge';
import { ShoppingCart, Printer, Pencil, Trash2, ArrowRightCircle } from 'lucide-react';
import { BRGY, peso, fmtDate, printDoc, govHeader } from '../financeHelpers';

export default function PurchaseOrder() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoad] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [editId, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    try { setRows((await procurementAPI.poGetAll()).data.orders || []); }
    catch { toast('Failed to load purchase orders', 'error'); }
    finally { setLoad(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));
  function openEdit(r) { setForm(r); setEdit(r.id); setModal(true); }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try { await procurementAPI.poUpdate(editId, form); toast('Purchase order updated', 'success'); setModal(false); load(); }
    catch (err) { toast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete this purchase order?')) return;
    try { await procurementAPI.poDelete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  async function genIAR(id) {
    try { await procurementAPI.poGenerateIAR(id); toast('Inspection & Acceptance Report generated', 'success'); load(); }
    catch (err) { toast(err.response?.data?.message || 'Failed to generate IAR', 'error'); }
  }

  function print(r) {
    const items = JSON.parse(r.items || '[]');
    printDoc('Purchase Order', `
      ${govHeader('PURCHASE ORDER (PO)')}
      <table>
        <tr><td style="width:38%;"><b>Ref No.</b></td><td>${r.ref_no||''}</td></tr>
        <tr><td><b>Date</b></td><td>${fmtDate(r.po_date)}</td></tr>
        <tr><td><b>Supplier</b></td><td>${r.supplier_name||''}</td></tr>
        <tr><td><b>Supplier Address</b></td><td>${r.supplier_address||''}</td></tr>
        <tr><td><b>Mode of Procurement</b></td><td>${r.mode_of_procurement||''}</td></tr>
        <tr><td><b>From PR</b></td><td>${r.pr_ref_no||''}</td></tr>
      </table>
      <table>
        <tr><th>Description</th><th>Qty</th><th>Unit</th><th>Unit Cost</th><th>Amount</th></tr>
        ${items.map(i=>`<tr><td>${i.description}</td><td style="text-align:center;">${i.qty}</td><td style="text-align:center;">${i.unit}</td><td style="text-align:right;">${peso(i.unit_cost)}</td><td style="text-align:right;">${peso(Number(i.qty)*Number(i.unit_cost))}</td></tr>`).join('')}
        <tr><td colspan="4" style="text-align:right;"><b>TOTAL</b></td><td style="text-align:right;"><b>${peso(r.total_amount)}</b></td></tr>
      </table>
      <p style="font-size:11.5px;margin-top:10px;">${r.terms||''}</p>
      <div class="sig-block">
        <div><div class="sig-name" style="min-width:220px;">${BRGY.captain}</div><div class="sig-title">Barangay Captain</div></div>
        <div><div class="sig-name" style="min-width:200px;">${r.supplier_name||''}</div><div class="sig-title">Conforme — Supplier</div></div>
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
            <ShoppingCart size={22} className="text-indigo-600"/> Purchase Order (PO)
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Step 3 — auto-generated from an approved Purchase Request</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Ref','Date','Supplier','From PR','Total','Status','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {loading ? <tr><td colSpan={7} className="py-10 text-center text-gray-400">Loading…</td></tr>
              : rows.length===0 ? <tr><td colSpan={7} className="py-14 text-center text-gray-400">No purchase orders — generate one from a Purchase Request</td></tr>
              : rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td font-mono text-[11px] text-indigo-500">{r.ref_no}</td>
                  <td className="table-td text-gray-400 whitespace-nowrap">{fmtDate(r.po_date)}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.supplier_name || <span className="text-amber-500">Set supplier →</span>}</td>
                  <td className="table-td text-gray-400 text-xs">{r.pr_ref_no}</td>
                  <td className="table-td font-semibold text-gray-900 dark:text-slate-100">{peso(r.total_amount)}</td>
                  <td className="table-td"><Badge status={r.status==='delivered'?'completed':'pending'}/></td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-1">
                      <button onClick={()=>print(r)} className="act-btn act-gray"><Printer size={12}/> Print</button>
                      <button onClick={()=>openEdit(r)} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                      {r.status!=='delivered' && <button onClick={()=>genIAR(r.id)} className="act-btn act-indigo"><ArrowRightCircle size={12}/> Gen IAR</button>}
                      <button onClick={()=>del(r.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Edit Purchase Order" size="md">
        <form onSubmit={save} className="space-y-4">
          <div><label className={lbl}>Supplier Name</label><input className={inp} value={form.supplier_name||''} onChange={e=>set('supplier_name',e.target.value)}/></div>
          <div><label className={lbl}>Supplier Address</label><input className={inp} value={form.supplier_address||''} onChange={e=>set('supplier_address',e.target.value)}/></div>
          <div>
            <label className={lbl}>Mode of Procurement</label>
            <select className={inp} value={form.mode_of_procurement||'Shopping'} onChange={e=>set('mode_of_procurement',e.target.value)}>
              <option>Shopping</option><option>Small Value Procurement</option><option>Public Bidding</option><option>Direct Contracting</option>
            </select>
          </div>
          <div><label className={lbl}>Terms & Conditions</label><textarea className={inp} rows={2} value={form.terms||''} onChange={e=>set('terms',e.target.value)}/></div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

