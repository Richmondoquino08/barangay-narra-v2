import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { financeFormsAPI } from '../../api/apiClient';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import { ShieldCheck, Plus, Printer, Pencil, Trash2 } from 'lucide-react';
import { BRGY, fmtDate, printDoc, govHeader } from './financeHelpers';

const EMPTY = {
  given_name:'', last_name:'', middle_name:'', address:'',
  date_of_birth:'', place_of_birth:'', phone:'', email:'',
  marital_status:'Single', gender:'Male', nationality:'Filipino',
  emergency_name:'', emergency_address:'', emergency_contact:'', emergency_relationship:'',
  date_registered:'',
};

export default function Kidlat() {
  const { toast } = useToast();
  const [rows, setRows]   = useState([]);
  const [loading, setLoad]= useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState(EMPTY);
  const [editId, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fGender, setFG]  = useState('');
  const [fStatus, setFS]  = useState('');
  const [fFrom, setFrom]  = useState('');
  const [fTo, setTo]      = useState('');

  const load = useCallback(async () => {
    setLoad(true);
    try { setRows((await financeFormsAPI.kidlatGetAll()).data.members || []); }
    catch { toast('Failed to load members', 'error'); }
    finally { setLoad(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));

  const filtered = useMemo(() => rows.filter(r => {
    if (fGender && r.gender !== fGender) return false;
    if (fStatus && r.marital_status !== fStatus) return false;
    if (fFrom && (!r.date_registered || r.date_registered.slice(0,10) < fFrom)) return false;
    if (fTo   && (!r.date_registered || r.date_registered.slice(0,10) > fTo)) return false;
    return true;
  }), [rows, fGender, fStatus, fFrom, fTo]);

  function openNew()  { setForm({ ...EMPTY, date_registered: new Date().toISOString().slice(0,10) }); setEdit(null); setModal(true); }
  function openEdit(r){ setForm({ ...r, date_of_birth: r.date_of_birth?.slice(0,10)||'', date_registered: r.date_registered?.slice(0,10)||'' }); setEdit(r.id); setModal(true); }

  async function save(e) {
    e.preventDefault();
    if (!form.given_name || !form.last_name) { toast('Name required', 'warning'); return; }
    setSaving(true);
    try {
      if (editId) { await financeFormsAPI.kidlatUpdate(editId, form); toast('Member updated', 'success'); }
      else        { await financeFormsAPI.kidlatCreate(form);         toast('Member registered', 'success'); }
      setModal(false); load();
    } catch (err) { toast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete this member?')) return;
    try { await financeFormsAPI.kidlatDelete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  function print(r) {
    const fullName = `${r.given_name} ${r.middle_name||''} ${r.last_name}`.replace(/\s+/g,' ').trim();
    printDoc('KIDLAT Membership', `
      ${govHeader('KIDLAT MEMBERSHIP')}
      <p style="text-align:center;font-size:12px;font-style:italic;margin:-8px 0 16px;">Kabataan Iwas Droga Laban Sa Alak at Tabaco</p>
      <div class="row"><span class="lbl" style="width:150px;">Name:</span><span class="line" style="flex:1;">${fullName}</span></div>
      <div class="row"><span class="lbl" style="width:150px;">Address:</span><span class="line" style="flex:1;">${r.address||''}</span></div>
      <div class="row">
        <span class="lbl" style="width:150px;">Date of Birth:</span><span class="line" style="min-width:160px;">${fmtDate(r.date_of_birth)}</span>
        <span class="lbl" style="margin-left:18px;">Place:</span><span class="line" style="flex:1;">${r.place_of_birth||''}</span>
      </div>
      <div class="row">
        <span class="lbl" style="width:150px;">Phone:</span><span class="line" style="min-width:140px;">${r.phone||''}</span>
        <span class="lbl" style="margin-left:18px;">Email:</span><span class="line" style="flex:1;">${r.email||''}</span>
      </div>
      <div class="row">
        <span class="lbl" style="width:150px;">Marital Status:</span><span class="line" style="min-width:120px;">${r.marital_status||''}</span>
        <span class="lbl" style="margin-left:18px;">Gender:</span><span class="line" style="min-width:90px;">${r.gender||''}</span>
        <span class="lbl" style="margin-left:18px;">Nationality:</span><span class="line" style="min-width:100px;">${r.nationality||''}</span>
      </div>
      <div class="row"><span class="lbl" style="width:150px;">Emergency Contact:</span><span class="line" style="flex:1;">${r.emergency_name||''} ${r.emergency_relationship?'('+r.emergency_relationship+')':''} ${r.emergency_contact?'· '+r.emergency_contact:''}</span></div>

      <p class="cert">I hereby certify that the information provided in this application is accurate and complete.</p>
      <div class="sig-block">
        <div><div class="sig-name" style="min-width:220px;">${fullName.toUpperCase()}</div><div class="sig-title">Print Name & Signature</div></div>
        <div><div class="sig-name" style="min-width:160px;">${fmtDate(r.date_registered)}</div><div class="sig-title">Date of Registration</div></div>
      </div>
      <p class="meta">Ref: ${r.ref_no||'—'}</p>
    `);
  }

  const inp = "w-full border border-gray-300 dark:border-[#2e334a] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#1a1d27] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const lbl = "block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1";
  const radio = (field, val) => (
    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
      <input type="radio" checked={form[field]===val} onChange={()=>set(field,val)} className="accent-indigo-600"/>{val}
    </label>
  );

  return (
    <div className="w-full space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck size={22} className="text-indigo-600"/> KIDLAT Membership
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Kabataan Iwas Droga Laban Sa Alak at Tabaco · {rows.length} members</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-1.5"><Plus size={15}/> Register Member</button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div><label className={lbl}>Gender</label><select className={inp} value={fGender} onChange={e=>setFG(e.target.value)}><option value="">All</option><option>Male</option><option>Female</option></select></div>
        <div><label className={lbl}>Marital Status</label><select className={inp} value={fStatus} onChange={e=>setFS(e.target.value)}><option value="">All</option><option>Single</option><option>Married</option><option>Widowed</option></select></div>
        <div><label className={lbl}>From</label><input type="date" className={inp} value={fFrom} onChange={e=>setFrom(e.target.value)}/></div>
        <div><label className={lbl}>To</label><input type="date" className={inp} value={fTo} onChange={e=>setTo(e.target.value)}/></div>
        <button onClick={()=>{setFG('');setFS('');setFrom('');setTo('');}} className="btn-secondary text-sm">Clear</button>
        <span className="ml-auto text-sm text-gray-400">{filtered.length} shown</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Ref / Name','Address','Gender','Marital','Phone','Registered','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {loading ? <tr><td colSpan={7} className="py-10 text-center text-gray-400">Loading…</td></tr>
              : filtered.length===0 ? <tr><td colSpan={7} className="py-14 text-center text-gray-400">No members</td></tr>
              : filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td"><p className="font-medium text-gray-900 dark:text-slate-100">{r.given_name} {r.middle_name} {r.last_name}</p><p className="text-[11px] font-mono text-indigo-500">{r.ref_no}</p></td>
                  <td className="table-td text-gray-500 dark:text-slate-400">{r.address}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.gender}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.marital_status}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.phone}</td>
                  <td className="table-td text-gray-400 whitespace-nowrap">{fmtDate(r.date_registered)}</td>
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

      <Modal open={modal} onClose={()=>setModal(false)} title={editId?'Edit Member':'Register KIDLAT Member'} size="lg">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Given Name *</label><input className={inp} value={form.given_name} onChange={e=>set('given_name',e.target.value)}/></div>
            <div><label className={lbl}>Middle Name</label><input className={inp} value={form.middle_name} onChange={e=>set('middle_name',e.target.value)}/></div>
            <div><label className={lbl}>Last Name *</label><input className={inp} value={form.last_name} onChange={e=>set('last_name',e.target.value)}/></div>
          </div>
          <div><label className={lbl}>Address</label><input className={inp} value={form.address} onChange={e=>set('address',e.target.value)}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Date of Birth</label><input type="date" className={inp} value={form.date_of_birth} onChange={e=>set('date_of_birth',e.target.value)}/></div>
            <div><label className={lbl}>Place of Birth</label><input className={inp} value={form.place_of_birth} onChange={e=>set('place_of_birth',e.target.value)}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Phone / CP No.</label><input className={inp} value={form.phone} onChange={e=>set('phone',e.target.value)}/></div>
            <div><label className={lbl}>Email</label><input className={inp} value={form.email} onChange={e=>set('email',e.target.value)}/></div>
          </div>
          <div className="grid grid-cols-3 gap-3 items-end">
            <div><label className={lbl}>Marital Status</label><div className="flex gap-3 mt-1">{radio('marital_status','Single')}{radio('marital_status','Married')}{radio('marital_status','Widowed')}</div></div>
            <div><label className={lbl}>Gender</label><div className="flex gap-3 mt-1">{radio('gender','Male')}{radio('gender','Female')}</div></div>
            <div><label className={lbl}>Nationality</label><input className={inp} value={form.nationality} onChange={e=>set('nationality',e.target.value)}/></div>
          </div>
          <div className="border-t border-gray-100 dark:border-[#2e334a] pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Emergency Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Name</label><input className={inp} value={form.emergency_name} onChange={e=>set('emergency_name',e.target.value)}/></div>
              <div><label className={lbl}>Relationship</label><input className={inp} value={form.emergency_relationship} onChange={e=>set('emergency_relationship',e.target.value)}/></div>
              <div><label className={lbl}>Contact Number</label><input className={inp} value={form.emergency_contact} onChange={e=>set('emergency_contact',e.target.value)}/></div>
              <div><label className={lbl}>Address</label><input className={inp} value={form.emergency_address} onChange={e=>set('emergency_address',e.target.value)}/></div>
            </div>
          </div>
          <div><label className={lbl}>Date of Registration</label><input type="date" className={inp} value={form.date_registered} onChange={e=>set('date_registered',e.target.value)}/></div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Save Member'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

