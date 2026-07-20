import React, { useState, useEffect, useCallback } from 'react';
import { socialAPI, residentsAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ResidentSearch from '../components/ResidentSearch';
import { Heart, Plus, Pencil, Trash2, Users, Shield, Star, Activity, Award } from 'lucide-react';

const TABS = [
  { id: '4ps',   label: '4Ps / Indigency', icon: Heart },
  { id: 'senior',label: 'Senior Citizens', icon: Star },
  { id: 'pwd',   label: 'PWD Registry',    icon: Shield },
  { id: 'bhw',   label: 'Health / BHW',    icon: Activity },
  { id: 'sk',    label: 'Youth / SK',      icon: Award },
];

const DISABILITY_TYPES = ['Visual Impairment','Hearing Impairment','Orthopedic / Physical','Mental / Psychiatric','Intellectual','Speech / Language','Cancer','Rare Disease / Chronic Illness','Multiple Disability','Other'];
const SK_POSITIONS = ['SK Chairman','SK Kagawad','SK Secretary','SK Treasurer','SK Auditor'];

// ── 4Ps ──────────────────────────────────────────────────────────────────
function FourPsTab({ residents, canEdit }) {
  const { toast } = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ resident_id:'', beneficiary_number:'', date_registered:'', compliance_status:'compliant', last_benefit_date:'', dswd_referral:false, notes:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try { setList((await socialAPI.get4Ps()).data.beneficiaries || []); }
    catch { toast('Failed to load 4Ps beneficiaries', 'error'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (modal?.id) await socialAPI.update4Ps(modal.id, form);
      else await socialAPI.create4Ps(form);
      toast('Saved', 'success'); setModal(null); load();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const dswd = list.filter(b => b.dswd_referral).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-400">{list.length} beneficiaries · {dswd} DSWD referrals</p>
        {canEdit && <button onClick={() => { setForm({ resident_id:'', beneficiary_number:'', date_registered:'', compliance_status:'compliant', last_benefit_date:'', dswd_referral:false, notes:'' }); setModal({}); }} className="btn-primary flex items-center gap-1.5 text-sm"><Plus size={14}/>Add Beneficiary</button>}
      </div>
      <div className="card overflow-hidden">
        {loading ? <div className="p-6 space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-gray-100 dark:bg-[#22263a] rounded-xl animate-pulse"/>)}</div>
        : list.length === 0 ? <div className="py-12 text-center text-gray-400 dark:text-slate-500"><Heart size={32} className="mx-auto mb-2 opacity-30"/><p>No 4Ps beneficiaries</p></div>
        : <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
            {['Resident','Purok','Beneficiary #','Compliance','Last Benefit','DSWD Referral','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
            {list.map(b => (
              <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                <td className="table-td font-medium text-gray-800 dark:text-slate-100">{b.resident_name}</td>
                <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{b.purok || '—'}</td>
                <td className="table-td font-mono text-xs text-indigo-700 dark:text-indigo-300">{b.beneficiary_number || '—'}</td>
                <td className="table-td"><Badge status={b.compliance_status} label={b.compliance_status?.replace(/_/g,' ')}/></td>
                <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{b.last_benefit_date ? new Date(b.last_benefit_date).toLocaleDateString('en-PH') : '—'}</td>
                <td className="table-td">{b.dswd_referral ? <Badge status="active" label="Referred"/> : <span className="text-gray-400 text-xs">No</span>}</td>
                <td className="table-td">
                  {canEdit && <>
                    <button onClick={() => { setForm({...b, date_registered: b.date_registered?.split('T')[0]||'', last_benefit_date: b.last_benefit_date?.split('T')[0]||''}); setModal(b); }} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                    <button onClick={async()=>{ if(!confirm('Remove?')) return; await socialAPI.delete4Ps(b.id); toast('Removed','success'); load(); }} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit 4Ps Record' : 'Add 4Ps Beneficiary'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          {!modal?.id && <div><label className="label">Resident *</label><ResidentSearch residents={residents} value={form.resident_id} onChange={v => setF('resident_id', v)}/></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Beneficiary Number</label><input className="input" value={form.beneficiary_number} onChange={e => setF('beneficiary_number', e.target.value)}/></div>
            <div><label className="label">Date Registered</label><input type="date" className="input" value={form.date_registered} onChange={e => setF('date_registered', e.target.value)}/></div>
          </div>
          <div><label className="label">Compliance Status</label>
            <select className="input" value={form.compliance_status} onChange={e => setF('compliance_status', e.target.value)}>
              <option value="compliant">Compliant</option>
              <option value="non_compliant">Non-Compliant</option>
              <option value="conditionally_compliant">Conditionally Compliant</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Last Benefit Date</label><input type="date" className="input" value={form.last_benefit_date} onChange={e => setF('last_benefit_date', e.target.value)}/></div>
            <div className="flex items-end pb-1"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded accent-indigo-600" checked={!!form.dswd_referral} onChange={e => setF('dswd_referral', e.target.checked)}/><span className="text-sm text-gray-700 dark:text-slate-300">DSWD Referred</span></label></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setF('notes', e.target.value)}/></div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving?'Saving...':'Save'}</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ── Senior Citizens (OSCA) ────────────────────────────────────────────────
function SeniorTab({ residents, canEdit }) {
  const { toast } = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ resident_id:'', osca_number:'', date_registered:'', monthly_stipend:'', last_stipend_date:'', discount_card_status:'active', notes:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try { setList((await socialAPI.getOsca()).data.records || []); }
    catch { toast('Failed to load senior records', 'error'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (modal?.id) await socialAPI.updateOsca(modal.id, form);
      else await socialAPI.createOsca(form);
      toast('Saved', 'success'); setModal(null); load();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  const setF = (k,v) => setForm(p => ({...p,[k]:v}));
  const totalStipend = list.reduce((s,r) => s + Number(r.monthly_stipend||0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-400">{list.length} senior citizens · Monthly stipend total: ₱{totalStipend.toLocaleString('en-PH', {minimumFractionDigits:2})}</p>
        {canEdit && <button onClick={() => { setForm({ resident_id:'', osca_number:'', date_registered:'', monthly_stipend:'', last_stipend_date:'', discount_card_status:'active', notes:'' }); setModal({}); }} className="btn-primary flex items-center gap-1.5 text-sm"><Plus size={14}/>Register Senior</button>}
      </div>
      <div className="card overflow-hidden">
        {loading ? <div className="p-6 space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-gray-100 dark:bg-[#22263a] rounded-xl animate-pulse"/>)}</div>
        : list.length === 0 ? <div className="py-12 text-center text-gray-400 dark:text-slate-500"><Star size={32} className="mx-auto mb-2 opacity-30"/><p>No senior citizens registered</p></div>
        : <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
            {['Name','Age','Purok','OSCA #','Stipend','Last Stipend','Discount Card','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
            {list.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                <td className="table-td font-medium text-gray-800 dark:text-slate-100">{r.resident_name}</td>
                <td className="table-td text-gray-600 dark:text-slate-300">{r.age || '—'}</td>
                <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{r.purok || '—'}</td>
                <td className="table-td font-mono text-xs text-indigo-700 dark:text-indigo-300">{r.osca_number || '—'}</td>
                <td className="table-td text-gray-600 dark:text-slate-300">{r.monthly_stipend > 0 ? `₱${Number(r.monthly_stipend).toLocaleString('en-PH')}` : '—'}</td>
                <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{r.last_stipend_date ? new Date(r.last_stipend_date).toLocaleDateString('en-PH') : '—'}</td>
                <td className="table-td"><Badge status={r.discount_card_status} label={r.discount_card_status}/></td>
                <td className="table-td">
                  {canEdit && <>
                    <button onClick={() => { setForm({...r, date_registered: r.date_registered?.split('T')[0]||'', last_stipend_date: r.last_stipend_date?.split('T')[0]||''}); setModal(r); }} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                    <button onClick={async()=>{ if(!confirm('Remove?')) return; await socialAPI.deleteOsca(r.id); toast('Removed','success'); load(); }} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Senior Record' : 'Register Senior Citizen'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          {!modal?.id && <div><label className="label">Resident *</label><ResidentSearch residents={residents.filter(r => r.senior_citizen)} value={form.resident_id} onChange={v => setF('resident_id', v)}/><p className="text-xs text-gray-400 mt-1">Showing senior citizens only</p></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">OSCA Number</label><input className="input" value={form.osca_number} onChange={e => setF('osca_number', e.target.value)}/></div>
            <div><label className="label">Date Registered</label><input type="date" className="input" value={form.date_registered} onChange={e => setF('date_registered', e.target.value)}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Monthly Stipend (₱)</label><input type="number" min="0" step="0.01" className="input" value={form.monthly_stipend} onChange={e => setF('monthly_stipend', e.target.value)}/></div>
            <div><label className="label">Last Stipend Date</label><input type="date" className="input" value={form.last_stipend_date} onChange={e => setF('last_stipend_date', e.target.value)}/></div>
          </div>
          <div><label className="label">Discount Card Status</label>
            <select className="input" value={form.discount_card_status} onChange={e => setF('discount_card_status', e.target.value)}>
              <option value="active">Active</option><option value="expired">Expired</option><option value="pending">Pending</option>
            </select>
          </div>
          <div><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setF('notes', e.target.value)}/></div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving?'Saving...':'Save'}</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ── PWD ──────────────────────────────────────────────────────────────────
function PwdTab({ residents, canEdit }) {
  const { toast } = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ resident_id:'', disability_type:'', pwd_id_number:'', pwd_id_status:'active', date_registered:'', id_expiry_date:'', notes:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try { setList((await socialAPI.getPwd()).data.records || []); }
    catch { toast('Failed to load PWD records', 'error'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (modal?.id) await socialAPI.updatePwd(modal.id, form);
      else await socialAPI.createPwd(form);
      toast('Saved', 'success'); setModal(null); load();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  const setF = (k,v) => setForm(p => ({...p,[k]:v}));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-400">{list.length} PWD registrants</p>
        {canEdit && <button onClick={() => { setForm({ resident_id:'', disability_type:'', pwd_id_number:'', pwd_id_status:'active', date_registered:'', id_expiry_date:'', notes:'' }); setModal({}); }} className="btn-primary flex items-center gap-1.5 text-sm"><Plus size={14}/>Register PWD</button>}
      </div>
      <div className="card overflow-hidden">
        {loading ? <div className="p-6 space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-gray-100 dark:bg-[#22263a] rounded-xl animate-pulse"/>)}</div>
        : list.length === 0 ? <div className="py-12 text-center text-gray-400 dark:text-slate-500"><Shield size={32} className="mx-auto mb-2 opacity-30"/><p>No PWD records</p></div>
        : <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
            {['Name','Purok','Disability Type','PWD ID #','ID Status','Expiry','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
            {list.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                <td className="table-td font-medium text-gray-800 dark:text-slate-100">{r.resident_name}</td>
                <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{r.purok || '—'}</td>
                <td className="table-td text-gray-600 dark:text-slate-300">{r.disability_type || '—'}</td>
                <td className="table-td font-mono text-xs text-indigo-700 dark:text-indigo-300">{r.pwd_id_number || '—'}</td>
                <td className="table-td"><Badge status={r.pwd_id_status} label={r.pwd_id_status?.replace(/_/g,' ')}/></td>
                <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{r.id_expiry_date ? new Date(r.id_expiry_date).toLocaleDateString('en-PH') : '—'}</td>
                <td className="table-td">
                  {canEdit && <>
                    <button onClick={() => { setForm({...r, date_registered: r.date_registered?.split('T')[0]||'', id_expiry_date: r.id_expiry_date?.split('T')[0]||''}); setModal(r); }} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                    <button onClick={async()=>{ if(!confirm('Remove?')) return; await socialAPI.deletePwd(r.id); toast('Removed','success'); load(); }} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit PWD Record' : 'Register PWD'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          {!modal?.id && <div><label className="label">Resident *</label><ResidentSearch residents={residents} value={form.resident_id} onChange={v => setF('resident_id', v)}/></div>}
          <div><label className="label">Disability Type</label>
            <select className="input" value={form.disability_type} onChange={e => setF('disability_type', e.target.value)}>
              <option value="">Select...</option>{DISABILITY_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">PWD ID Number</label><input className="input" value={form.pwd_id_number} onChange={e => setF('pwd_id_number', e.target.value)}/></div>
            <div><label className="label">ID Status</label>
              <select className="input" value={form.pwd_id_status} onChange={e => setF('pwd_id_status', e.target.value)}>
                <option value="active">Active</option><option value="expired">Expired</option><option value="pending">Pending</option><option value="no_id">No ID</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date Registered</label><input type="date" className="input" value={form.date_registered} onChange={e => setF('date_registered', e.target.value)}/></div>
            <div><label className="label">ID Expiry Date</label><input type="date" className="input" value={form.id_expiry_date} onChange={e => setF('id_expiry_date', e.target.value)}/></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setF('notes', e.target.value)}/></div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving?'Saving...':'Save'}</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ── BHW ──────────────────────────────────────────────────────────────────
function BhwTab({ canEdit }) {
  const { toast } = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name:'', purok:'', contact_number:'', date_assigned:'', training_date:'', area_covered:'', specialization:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try { setList((await socialAPI.getBhw()).data.bhws || []); }
    catch { toast('Failed to load BHW roster', 'error'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (modal?.id) await socialAPI.updateBhw(modal.id, form);
      else await socialAPI.createBhw(form);
      toast('Saved', 'success'); setModal(null); load();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  const setF = (k,v) => setForm(p => ({...p,[k]:v}));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-400">{list.filter(b=>b.status==='active').length} active BHWs</p>
        {canEdit && <button onClick={() => { setForm({ full_name:'', purok:'', contact_number:'', date_assigned:'', training_date:'', area_covered:'', specialization:'' }); setModal({}); }} className="btn-primary flex items-center gap-1.5 text-sm"><Plus size={14}/>Add BHW</button>}
      </div>
      <div className="card overflow-hidden">
        {loading ? <div className="p-6 space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-gray-100 dark:bg-[#22263a] rounded-xl animate-pulse"/>)}</div>
        : list.length === 0 ? <div className="py-12 text-center text-gray-400 dark:text-slate-500"><Activity size={32} className="mx-auto mb-2 opacity-30"/><p>No BHW records</p></div>
        : <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
            {['Name','Purok','Contact','Area Covered','Specialization','Trained','Status','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
            {list.map(b => (
              <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                <td className="table-td font-medium text-gray-800 dark:text-slate-100">{b.full_name}</td>
                <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{b.purok || '—'}</td>
                <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{b.contact_number || '—'}</td>
                <td className="table-td text-gray-500 dark:text-slate-400 text-xs max-w-[160px] truncate">{b.area_covered || '—'}</td>
                <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{b.specialization || '—'}</td>
                <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{b.training_date ? new Date(b.training_date).toLocaleDateString('en-PH') : '—'}</td>
                <td className="table-td"><Badge status={b.status}/></td>
                <td className="table-td">
                  {canEdit && <>
                    <button onClick={() => { setForm({...b, date_assigned: b.date_assigned?.split('T')[0]||'', training_date: b.training_date?.split('T')[0]||''}); setModal(b); }} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                    <button onClick={async()=>{ if(!confirm('Remove?')) return; await socialAPI.deleteBhw(b.id); toast('Removed','success'); load(); }} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit BHW Record' : 'Add BHW'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Full Name *</label><input className="input" value={form.full_name} onChange={e => setF('full_name', e.target.value)} required/></div>
            <div><label className="label">Purok</label><input className="input" value={form.purok} onChange={e => setF('purok', e.target.value)}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Contact Number</label><input className="input" value={form.contact_number} onChange={e => setF('contact_number', e.target.value)}/></div>
            <div><label className="label">Specialization</label><input className="input" value={form.specialization} onChange={e => setF('specialization', e.target.value)} placeholder="e.g. MCH, Nutrition…"/></div>
          </div>
          <div><label className="label">Area Covered</label><input className="input" value={form.area_covered} onChange={e => setF('area_covered', e.target.value)}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date Assigned</label><input type="date" className="input" value={form.date_assigned} onChange={e => setF('date_assigned', e.target.value)}/></div>
            <div><label className="label">Last Training Date</label><input type="date" className="input" value={form.training_date} onChange={e => setF('training_date', e.target.value)}/></div>
          </div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving?'Saving...':'Save'}</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ── SK Officials ──────────────────────────────────────────────────────────
function SkTab({ canEdit }) {
  const { toast } = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name:'', position:'SK Chairman', age:'', contact_number:'', term_start:'', term_end:'', is_oesy:false });

  const load = useCallback(async () => {
    setLoading(true);
    try { setList((await socialAPI.getSk()).data.officials || []); }
    catch { toast('Failed to load SK records', 'error'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (modal?.id) await socialAPI.updateSk(modal.id, form);
      else await socialAPI.createSk(form);
      toast('Saved', 'success'); setModal(null); load();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  const setF = (k,v) => setForm(p => ({...p,[k]:v}));
  const oesy = list.filter(s => s.is_oesy).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-400">{list.length} SK officials · {oesy} OESY</p>
        {canEdit && <button onClick={() => { setForm({ full_name:'', position:'SK Chairman', age:'', contact_number:'', term_start:'', term_end:'', is_oesy:false }); setModal({}); }} className="btn-primary flex items-center gap-1.5 text-sm"><Plus size={14}/>Add SK Official</button>}
      </div>
      <div className="card overflow-hidden">
        {loading ? <div className="p-6 space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-gray-100 dark:bg-[#22263a] rounded-xl animate-pulse"/>)}</div>
        : list.length === 0 ? <div className="py-12 text-center text-gray-400 dark:text-slate-500"><Award size={32} className="mx-auto mb-2 opacity-30"/><p>No SK officials recorded</p></div>
        : <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
            {['Name','Position','Age','Contact','Term','OESY','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
            {list.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                <td className="table-td font-medium text-gray-800 dark:text-slate-100">{s.full_name}</td>
                <td className="table-td text-gray-600 dark:text-slate-300">{s.position}</td>
                <td className="table-td text-gray-500 dark:text-slate-400">{s.age || '—'}</td>
                <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{s.contact_number || '—'}</td>
                <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{s.term_start ? new Date(s.term_start).getFullYear() : '?'}–{s.term_end ? new Date(s.term_end).getFullYear() : '?'}</td>
                <td className="table-td">{s.is_oesy ? <Badge status="active" label="OESY"/> : <span className="text-gray-400 text-xs">No</span>}</td>
                <td className="table-td">
                  {canEdit && <>
                    <button onClick={() => { setForm({...s, term_start: s.term_start?.split('T')[0]||'', term_end: s.term_end?.split('T')[0]||''}); setModal(s); }} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                    <button onClick={async()=>{ if(!confirm('Remove?')) return; await socialAPI.deleteSk(s.id); toast('Removed','success'); load(); }} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit SK Official' : 'Add SK Official'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Full Name *</label><input className="input" value={form.full_name} onChange={e => setF('full_name', e.target.value)} required/></div>
            <div><label className="label">Position</label>
              <select className="input" value={form.position} onChange={e => setF('position', e.target.value)}>
                {SK_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Age</label><input type="number" min="15" max="30" className="input" value={form.age} onChange={e => setF('age', e.target.value)}/></div>
            <div><label className="label">Contact Number</label><input className="input" value={form.contact_number} onChange={e => setF('contact_number', e.target.value)}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Term Start</label><input type="date" className="input" value={form.term_start} onChange={e => setF('term_start', e.target.value)}/></div>
            <div><label className="label">Term End</label><input type="date" className="input" value={form.term_end} onChange={e => setF('term_end', e.target.value)}/></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded accent-indigo-600" checked={!!form.is_oesy} onChange={e => setF('is_oesy', e.target.checked)}/><span className="text-sm text-gray-700 dark:text-slate-300">Out-of-School Youth (OESY)</span></label>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving?'Saving...':'Save'}</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function SocialPrograms() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(['admin', 'secretary']);
  const [activeTab, setActiveTab] = useState('4ps');
  const [residents, setResidents] = useState([]);

  useEffect(() => {
    residentsAPI.getAll(1, 1000).then(r => setResidents(r.data.residents || [])).catch(() => {});
  }, []);

  const tabContent = {
    '4ps':   <FourPsTab residents={residents} canEdit={canEdit} />,
    senior:  <SeniorTab residents={residents} canEdit={canEdit} />,
    pwd:     <PwdTab    residents={residents} canEdit={canEdit} />,
    bhw:     <BhwTab    canEdit={canEdit} />,
    sk:      <SkTab     canEdit={canEdit} />,
  };

  return (
    <div className="w-full space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <Heart size={22} className="text-rose-500"/> Social Programs
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">4Ps, Senior Citizens, PWD, BHW, and SK records</p>
      </div>

      {/* Tab bar */}
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#2e334a] shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100 dark:border-[#2e334a]">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition
                  ${activeTab === t.id
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
                <Icon size={15}/>{t.label}
              </button>
            );
          })}
        </div>
        <div className="p-5">{tabContent[activeTab]}</div>
      </div>
    </div>
  );
}
