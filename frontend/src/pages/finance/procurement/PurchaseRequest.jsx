import React, { useState, useEffect, useCallback } from 'react';
import { procurementAPI } from '../../../api/apiClient';
import { useToast } from '../../../components/Toast';
import Modal from '../../../components/Modal';
import Badge from '../../../components/Badge';
import { ClipboardList, Plus, Printer, Trash2, ArrowRightCircle, X } from 'lucide-react';
import { BRGY, peso, fmtDate, printDoc, govHeader } from '../financeHelpers';

const EMPTY_ITEM = { description:'', qty:1, unit:'pc', unit_cost:'' };
const EMPTY = { obr_id:'', pr_date:'', requested_by:'', office:'', purpose:'', items:[{...EMPTY_ITEM}] };

export default function PurchaseRequest() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [obrs, setObrs] = useState([]);
  const [loading, setLoad] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const [r, o] = await Promise.all([procurementAPI.prGetAll(), procurementAPI.obrGetAll()]);
      setRows(r.data.requests || []);
      setObrs(o.data.requests || []);
    } catch { toast('Failed to load purchase requests', 'error'); }
    finally { setLoad(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));
  const setItem = (i,k,v) => setForm(p => { const items = [...p.items]; items[i] = { ...items[i], [k]: v }; return { ...p, items }; });
  const addItem = () => setForm(p => ({ ...p, items: [...p.items, {...EMPTY_ITEM}] }));
  const rmItem = (i) => setForm(p => ({ ...p, items: p.items.filter((_,idx)=>idx!==i) }));
  const total = form.items.reduce((s,i)=>s+Number(i.qty||0)*Number(i.unit_cost||0), 0);

  function openNew() { setForm({ ...EMPTY, pr_date: new Date().toISOString().slice(0,10), obr_id: obrs[0]?.id || '' }); setModal(true); }

  async function save(e) {
    e.preventDefault();
    if (!form.obr_id || !form.requested_by) { toast('Obligation request and requestor required', 'warning'); return; }
    setSaving(true);
    try { await procurementAPI.prCreate(form); toast('Purchase request saved', 'success'); setModal(false); load(); }
    catch (err) { toast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete this purchase request?')) return;
    try { await procurementAPI.prDelete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  async function genPO(id) {
    try { await procurementAPI.prGeneratePO(id); toast('Purchase Order generated', 'success'); load(); }
    catch (err) { toast(err.response?.data?.message || 'Failed to generate PO', 'error'); }
  }

  function print(r) {
    const items = JSON.parse(r.items || '[]');
    printDoc('Purchase Request', `
      ${govHeader('PURCHASE REQUEST (PR)')}
      <table>
        <tr><td style="width:38%;"><b>Ref No.</b></td><td>${r.ref_no||''}</td></tr>
        <tr><td><b>Date</b></td><td>${fmtDate(r.pr_date)}</td></tr>
        <tr><td><b>Requested By</b></td><td>${r.requested_by||''}</td></tr>
        <tr><td><b>Office</b></td><td>${r.office||''}</td></tr>
        <tr><td><b>Purpose</b></td><td>${r.purpose||''}</td></tr>
        <tr><td><b>Charged to ObR</b></td><td>${r.obr_ref_no||''}</td></tr>
      </table>
      <table>
        <tr><th>Description</th><th>Qty</th><th>Unit</th><th>Unit Cost</th><th>Amount</th></tr>
        ${items.map(i=>`<tr><td>${i.description}</td><td style="text-align:center;">${i.qty}</td><td style="text-align:center;">${i.unit}</td><td style="text-align:right;">${peso(i.unit_cost)}</td><td style="text-align:right;">${peso(Number(i.qty)*Number(i.unit_cost))}</td></tr>`).join('')}
        <tr><td colspan="4" style="text-align:right;"><b>TOTAL</b></td><td style="text-align:right;"><b>${peso(r.total_amount)}</b></td></tr>
      </table>
      <div class="sig-block">
        <div><div class="sig-name" style="min-width:200px;">${r.requested_by||''}</div><div class="sig-title">Requested by</div></div>
        <div><div class="sig-name" style="min-width:220px;">${BRGY.captain}</div><div class="sig-title">Approved by — Barangay Captain</div></div>
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
            <ClipboardList size={22} className="text-indigo-600"/> Purchase Request (PR)
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Step 2 — items requested against an Obligation Request</p>
        </div>
        <button onClick={openNew} disabled={obrs.length===0} className="btn-primary flex items-center gap-1.5"><Plus size={15}/> New Purchase Request</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Ref','Date','Requested By','Office','ObR','Total','Status','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {loading ? <tr><td colSpan={8} className="py-10 text-center text-gray-400">Loading…</td></tr>
              : rows.length===0 ? <tr><td colSpan={8} className="py-14 text-center text-gray-400">No purchase requests</td></tr>
              : rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td font-mono text-[11px] text-indigo-500">{r.ref_no}</td>
                  <td className="table-td text-gray-400 whitespace-nowrap">{fmtDate(r.pr_date)}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.requested_by}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400">{r.office}</td>
                  <td className="table-td text-gray-400 text-xs">{r.obr_ref_no}</td>
                  <td className="table-td font-semibold text-gray-900 dark:text-slate-100">{peso(r.total_amount)}</td>
                  <td className="table-td"><Badge status={r.status==='converted'?'completed':'pending'}/></td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-1">
                      <button onClick={()=>print(r)} className="act-btn act-gray"><Printer size={12}/> Print</button>
                      {r.status!=='converted' && <button onClick={()=>genPO(r.id)} className="act-btn act-indigo"><ArrowRightCircle size={12}/> Gen PO</button>}
                      <button onClick={()=>del(r.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="New Purchase Request" size="lg">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className={lbl}>Charged to Obligation Request *</label>
            <select className={inp} value={form.obr_id} onChange={e=>set('obr_id',e.target.value)}>
              {obrs.map(o => <option key={o.id} value={o.id}>{o.ref_no} — {o.particulars} ({peso(o.amount)})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Date</label><input type="date" className={inp} value={form.pr_date} onChange={e=>set('pr_date',e.target.value)}/></div>
            <div><label className={lbl}>Requested By *</label><input className={inp} value={form.requested_by} onChange={e=>set('requested_by',e.target.value)}/></div>
            <div><label className={lbl}>Office</label><input className={inp} value={form.office} onChange={e=>set('office',e.target.value)}/></div>
          </div>
          <div><label className={lbl}>Purpose</label><textarea className={inp} rows={2} value={form.purpose} onChange={e=>set('purpose',e.target.value)}/></div>

          <div className="border-t border-gray-100 dark:border-[#2e334a] pt-3">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Items</p>
              <button type="button" onClick={addItem} className="btn-secondary text-xs flex items-center gap-1"><Plus size={12}/> Add Item</button>
            </div>
            <div className="space-y-2">
              {form.items.map((it,i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input className={`${inp} col-span-5`} placeholder="Description" value={it.description} onChange={e=>setItem(i,'description',e.target.value)}/>
                  <input type="number" className={`${inp} col-span-2`} placeholder="Qty" value={it.qty} onChange={e=>setItem(i,'qty',e.target.value)}/>
                  <input className={`${inp} col-span-2`} placeholder="Unit" value={it.unit} onChange={e=>setItem(i,'unit',e.target.value)}/>
                  <input type="number" step="0.01" className={`${inp} col-span-2`} placeholder="Unit Cost" value={it.unit_cost} onChange={e=>setItem(i,'unit_cost',e.target.value)}/>
                  <button type="button" onClick={()=>rmItem(i)} className="col-span-1 icon-btn" style={{color:'#ef4444'}}><X size={14}/></button>
                </div>
              ))}
            </div>
            <p className="text-right text-sm font-bold mt-2 text-gray-900 dark:text-slate-100">Total: {peso(total)}</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Save Purchase Request'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

