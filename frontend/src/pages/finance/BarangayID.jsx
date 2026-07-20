import React, { useState, useEffect, useCallback } from 'react';
import { financeFormsAPI } from '../../api/apiClient';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { IdCard, Plus, Printer, Pencil, Trash2 } from 'lucide-react';
import { BRGY, ageFromDOB, fmtDate, printDoc, govHeader } from './financeHelpers';

const EMPTY = {
  first_name:'', middle_name:'', surname:'', house_no:'', street:'',
  barangay:'Narra', city:'San Pedro', province:'Laguna',
  date_of_birth:'', gender:'Male',
  emergency_name:'', emergency_contact:'', emergency_address:'', status:'pending',
};

export default function BarangayID() {
  const { toast } = useToast();
  const [rows, setRows]   = useState([]);
  const [loading, setLoad]= useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState(EMPTY);
  const [editId, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    try { setRows((await financeFormsAPI.idGetAll()).data.applications || []); }
    catch { toast('Failed to load applications', 'error'); }
    finally { setLoad(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));

  function openNew()  { setForm(EMPTY); setEdit(null); setModal(true); }
  function openEdit(r){ setForm({ ...r, date_of_birth: r.date_of_birth?.slice(0,10) || '' }); setEdit(r.id); setModal(true); }

  async function save(e) {
    e.preventDefault();
    if (!form.first_name || !form.surname) { toast('First name and surname required', 'warning'); return; }
    setSaving(true);
    try {
      if (editId) { await financeFormsAPI.idUpdate(editId, form); toast('Application updated', 'success'); }
      else        { await financeFormsAPI.idCreate(form);         toast('Application saved', 'success'); }
      setModal(false); load();
    } catch (err) { toast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete this application?')) return;
    try { await financeFormsAPI.idDelete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  function print(r) {
    const fullName = `${r.first_name} ${r.middle_name||''} ${r.surname}`.replace(/\s+/g,' ').trim();
    const addr1 = [r.house_no, r.street, r.barangay].filter(Boolean).join(' ');
    const addr2 = [r.city, r.province].filter(Boolean).join(', ');
    printDoc('Barangay ID Application', `
      ${govHeader('APPLICATION FOR BARANGAY I.D.')}
      <div class="row"><span class="lbl" style="width:140px;">Name:</span><span class="line" style="flex:1;">${fullName}</span></div>
      <div class="row"><span class="lbl" style="width:140px;">Address:</span><span class="line" style="flex:1;">${addr1}${addr2?', '+addr2:''}</span></div>
      <div class="row">
        <span class="lbl" style="width:140px;">Date of Birth:</span><span class="line" style="min-width:180px;">${fmtDate(r.date_of_birth)}</span>
        <span class="lbl" style="margin-left:20px;">Age:</span><span class="line" style="min-width:50px;">${ageFromDOB(r.date_of_birth)}</span>
        <span class="lbl" style="margin-left:20px;">Gender:</span><span class="line" style="min-width:80px;">${r.gender||''}</span>
      </div>
      <div class="row"><span class="lbl" style="width:140px;">Emergency Contact:</span><span class="line" style="flex:1;">${r.emergency_name||''} ${r.emergency_contact?'· '+r.emergency_contact:''}</span></div>
      <div class="row"><span class="lbl" style="width:140px;">Contact Address:</span><span class="line" style="flex:1;">${r.emergency_address||''}</span></div>

      <p class="cert">I hereby certified that the above information's are true and correct to the best of my knowledge.</p>

      <div class="sig-block">
        <div><div class="sig-name" style="min-width:220px;">&nbsp;</div><div class="sig-title">Applicant's Signature over Printed Name</div></div>
      </div>
      <div class="sig-block" style="margin-top:40px;">
        <div><div class="sig-name" style="min-width:240px;">${BRGY.captain}</div><div class="sig-title">Punong Barangay</div></div>
      </div>
      <p class="meta">Ref: ${r.ref_no||'—'} · Date Applied: ${fmtDate(r.date_applied)}</p>
    `);
  }

  const inp = "w-full border border-gray-300 dark:border-[#2e334a] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#1a1d27] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const lbl = "block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1";

  return (
    <div className="w-full space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <IdCard size={22} className="text-indigo-600"/> Barangay I.D. Application
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{rows.length} applications · {rows.filter(r=>r.status==='pending').length} pending</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-1.5"><Plus size={15}/> New Application</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Ref / Name','Address','DOB / Age','Gender','Emergency Contact','Applied','Status','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {loading ? <tr><td colSpan={8} className="py-10 text-center text-gray-400">Loading…</td></tr>
              : rows.length===0 ? <tr><td colSpan={8} className="py-14 text-center text-gray-400">No applications yet</td></tr>
              : rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td">
                    <p className="font-medium text-gray-900 dark:text-slate-100">{r.first_name} {r.middle_name} {r.surname}</p>
                    <p className="text-[11px] font-mono text-indigo-500">{r.ref_no}</p>
                  </td>
                  <td className="table-td text-gray-500 dark:text-slate-400">{[r.house_no,r.street,r.barangay].filter(Boolean).join(' ')}, {r.city}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{fmtDate(r.date_of_birth)} <span className="text-gray-400">({ageFromDOB(r.date_of_birth)})</span></td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.gender}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.emergency_name}<br/><span className="text-xs text-gray-400">{r.emergency_contact}</span></td>
                  <td className="table-td text-gray-400 whitespace-nowrap">{fmtDate(r.date_applied)}</td>
                  <td className="table-td"><Badge status={r.status==='issued'?'approved':'pending'} label={r.status==='issued'?'Issued':'Pending'}/></td>
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

      <Modal open={modal} onClose={()=>setModal(false)} title={editId?'Edit ID Application':'New Barangay ID Application'} size="lg">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>First Name *</label><input className={inp} value={form.first_name} onChange={e=>set('first_name',e.target.value)}/></div>
            <div><label className={lbl}>Middle Name</label><input className={inp} value={form.middle_name} onChange={e=>set('middle_name',e.target.value)}/></div>
            <div><label className={lbl}>Surname *</label><input className={inp} value={form.surname} onChange={e=>set('surname',e.target.value)}/></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>House No.</label><input className={inp} value={form.house_no} onChange={e=>set('house_no',e.target.value)}/></div>
            <div><label className={lbl}>Street</label><input className={inp} value={form.street} onChange={e=>set('street',e.target.value)}/></div>
            <div><label className={lbl}>Barangay</label><input className={inp} value={form.barangay} onChange={e=>set('barangay',e.target.value)}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>City / Municipality</label><input className={inp} value={form.city} onChange={e=>set('city',e.target.value)}/></div>
            <div><label className={lbl}>Province</label><input className={inp} value={form.province} onChange={e=>set('province',e.target.value)}/></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Date of Birth</label><input type="date" className={inp} value={form.date_of_birth} onChange={e=>set('date_of_birth',e.target.value)}/></div>
            <div><label className={lbl}>Age</label><input className={inp} value={ageFromDOB(form.date_of_birth)} disabled/></div>
            <div><label className={lbl}>Gender</label>
              <select className={inp} value={form.gender} onChange={e=>set('gender',e.target.value)}>
                <option>Male</option><option>Female</option>
              </select></div>
          </div>
          <div className="border-t border-gray-100 dark:border-[#2e334a] pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Emergency Contact</p>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={lbl}>Name</label><input className={inp} value={form.emergency_name} onChange={e=>set('emergency_name',e.target.value)}/></div>
              <div><label className={lbl}>Contact No.</label><input className={inp} value={form.emergency_contact} onChange={e=>set('emergency_contact',e.target.value)}/></div>
              <div><label className={lbl}>Address</label><input className={inp} value={form.emergency_address} onChange={e=>set('emergency_address',e.target.value)}/></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Status</label>
              <select className={inp} value={form.status} onChange={e=>set('status',e.target.value)}>
                <option value="pending">Pending</option><option value="issued">Issued</option>
              </select></div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Save Application'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

