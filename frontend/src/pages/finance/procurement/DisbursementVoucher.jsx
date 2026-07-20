import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { procurementAPI } from '../../../api/apiClient';
import { useToast } from '../../../components/Toast';
import Modal from '../../../components/Modal';
import Badge from '../../../components/Badge';
import { Banknote, Printer, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { BRGY, peso, fmtDate, printDoc, govHeader } from '../financeHelpers';

export default function DisbursementVoucher() {
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoad] = useState(true);
  const [modal, setModal] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [form, setForm] = useState({});
  const [payForm, setPayForm] = useState({ mode_of_payment:'Check', check_no:'' });
  const [editId, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    try { setRows((await procurementAPI.dvGetAll()).data.vouchers || []); }
    catch { toast('Failed to load disbursement vouchers', 'error'); }
    finally { setLoad(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));
  function openEdit(r) { setForm(r); setEdit(r.id); setModal(true); }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try { await procurementAPI.dvUpdate(editId, form); toast('Voucher updated', 'success'); setModal(false); load(); }
    catch (err) { toast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete this disbursement voucher?')) return;
    try { await procurementAPI.dvDelete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  function openPay(r) { setPayForm({ mode_of_payment: r.mode_of_payment||'Check', check_no: r.check_no||'' }); setPayModal(r); }

  async function confirmPay(e) {
    e.preventDefault();
    try {
      await procurementAPI.dvMarkPaid(payModal.id, payForm);
      toast('Voucher paid — RAO disbursement posted', 'success');
      setPayModal(null); load();
    } catch (err) { toast(err.response?.data?.message || 'Failed to mark as paid', 'error'); }
  }

  function print(r) {
    printDoc('Disbursement Voucher', `
      ${govHeader('DISBURSEMENT VOUCHER (DV)')}
      <table>
        <tr><td style="width:38%;"><b>Ref No.</b></td><td>${r.ref_no||''}</td></tr>
        <tr><td><b>Date</b></td><td>${fmtDate(r.dv_date)}</td></tr>
        <tr><td><b>Payee</b></td><td>${r.payee||''}</td></tr>
        <tr><td><b>Particulars</b></td><td>${r.particulars||''}</td></tr>
        <tr><td><b>Fund</b></td><td>${r.fund_key||''}</td></tr>
        <tr><td><b>Charged to ObR</b></td><td>${r.obr_ref_no||''}</td></tr>
        <tr><td><b>Amount</b></td><td>${peso(r.amount)}</td></tr>
        <tr><td><b>Mode of Payment</b></td><td>${r.mode_of_payment||''} ${r.check_no?('— '+r.check_no):''}</td></tr>
        <tr><td><b>Status</b></td><td>${(r.status||'').toUpperCase()}${r.paid_date?(' on '+fmtDate(r.paid_date)):''}</td></tr>
      </table>
      <div class="sig-block">
        <div><div class="sig-name" style="min-width:200px;">${BRGY.treasurer}</div><div class="sig-title">Certified — Barangay Treasurer</div></div>
        <div><div class="sig-name" style="min-width:220px;">${BRGY.captain}</div><div class="sig-title">Approved — Barangay Captain</div></div>
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
            <Banknote size={22} className="text-indigo-600"/> Disbursement Voucher (DV)
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Step 5b — final stage. Marking paid auto-posts the disbursement to RAO</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Ref','Date','Payee','Fund','ObR','Amount','Status','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {loading ? <tr><td colSpan={8} className="py-10 text-center text-gray-400">Loading…</td></tr>
              : rows.length===0 ? <tr><td colSpan={8} className="py-14 text-center text-gray-400">No disbursement vouchers — generate one from an IAR</td></tr>
              : rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td font-mono text-[11px] text-indigo-500">{r.ref_no}</td>
                  <td className="table-td text-gray-400 whitespace-nowrap">{fmtDate(r.dv_date)}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.payee}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400">{r.fund_key}</td>
                  <td className="table-td text-gray-400 text-xs">{r.obr_ref_no}</td>
                  <td className="table-td font-semibold text-gray-900 dark:text-slate-100">{peso(r.amount)}</td>
                  <td className="table-td"><Badge status={r.status==='paid'?'completed':'pending'}/></td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-1">
                      <button onClick={()=>print(r)} className="act-btn act-gray"><Printer size={12}/> Print</button>
                      {(r.mode_of_payment==='Check'||!r.mode_of_payment) && (
                        <button onClick={() => navigate('/cheque-print', { state:{ payee: r.payee, amount: r.amount, date: r.dv_date } })} className="act-btn act-indigo"><Banknote size={12}/> Cheque</button>
                      )}
                      {r.status!=='paid' && <button onClick={()=>openEdit(r)} className="act-btn act-sky"><Pencil size={12}/> Edit</button>}
                      {r.status!=='paid' && <button onClick={()=>openPay(r)} className="act-btn act-green"><CheckCircle2 size={12}/> Mark Paid</button>}
                      <button onClick={()=>del(r.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Edit Disbursement Voucher" size="md">
        <form onSubmit={save} className="space-y-4">
          <div><label className={lbl}>Payee</label><input className={inp} value={form.payee||''} onChange={e=>set('payee',e.target.value)}/></div>
          <div><label className={lbl}>Particulars</label><textarea className={inp} rows={2} value={form.particulars||''} onChange={e=>set('particulars',e.target.value)}/></div>
          <div><label className={lbl}>Amount (₱)</label><input type="number" step="0.01" className={inp} value={form.amount||''} onChange={e=>set('amount',e.target.value)}/></div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Save'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!payModal} onClose={()=>setPayModal(null)} title="Mark Voucher as Paid" size="sm">
        <form onSubmit={confirmPay} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-slate-300">Paying <b>{peso(payModal?.amount)}</b> to <b>{payModal?.payee}</b>. This will post the disbursement against the originating RAO obligation ({payModal?.obr_ref_no}).</p>
          <div>
            <label className={lbl}>Mode of Payment</label>
            <select className={inp} value={payForm.mode_of_payment} onChange={e=>setPayForm(p=>({...p, mode_of_payment:e.target.value}))}>
              <option>Check</option><option>Cash</option><option>Bank Transfer</option>
            </select>
          </div>
          <div><label className={lbl}>Check / Reference No.</label><input className={inp} value={payForm.check_no} onChange={e=>setPayForm(p=>({...p, check_no:e.target.value}))}/></div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button type="button" onClick={()=>setPayModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Confirm Payment</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

