import React, { useState, useEffect, useCallback } from 'react';
import { blotterAPI, residentsAPI, officialsAPI } from '../api/apiClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import StatCard from '../components/StatCard';
import { AlertTriangle, Plus, Search, CheckCircle, XCircle, Pencil, Trash2,
  Scale, AlertCircle, Users, Clock, FileText, Shield, Info } from 'lucide-react';
import ResidentSearch from '../components/ResidentSearch';

// ── Procedure-aligned constants ────────────────────────────────────────────
const INCIDENT_TYPES = [
  // Physical offenses
  'Physical Assault / Battery',
  'Threat or Intimidation',
  'Oral Defamation / Slander',
  'Unjust Vexation',
  // Property
  'Theft / Robbery',
  'Estafa / Swindling',
  'Property Damage / Malicious Mischief',
  'Trespassing',
  // Family / Community
  'Domestic Dispute',
  'Noise Complaint / Disturbance',
  'Neighbor Dispute',
  'Illegal Dumping / Littering',
  // Special categories
  'Violence Against Women & Children (VAWC)',
  'Child Abuse',
  'Sexual Harassment',
  'Drug-Related Incident',
  // Other
  'Illegal Occupation',
  'Unpaid Debt / Credit',
  'Other',
];

const SPECIAL_CASE_TYPES = [
  'Violence Against Women (VAW)',
  'Violence Against Children',
  'Domestic Violence (VAWC)',
  'Child Abuse',
  'Sexual Offense',
  'Gender-Based Violence',
];

const BARANGAY_ACTIONS = [
  'Issued Summons to Respondent',
  'Referred to Lupon Tagapamayapa',
  'Mediation / Conciliation Conducted',
  'Issued Certificate to File Action',
  'Referred to PNP / Police',
  'Referred to Prosecutor\'s Office',
  'Referred to DSWD / Social Worker',
  'Monitoring / Assistance Provided',
  'Complaint Withdrawn',
  'No Action Required',
];

const STATUSES = [
  { value: 'pending',          label: 'Filed / Pending',             dot: 'bg-amber-400' },
  { value: 'summoned',         label: 'Respondent Summoned',         dot: 'bg-sky-500' },
  { value: 'mediation',        label: 'Mediation / Conciliation',    dot: 'bg-blue-500' },
  { value: 'settled',          label: 'Amicably Settled',            dot: 'bg-emerald-500' },
  { value: 'referred_pnp',     label: 'Referred to PNP',             dot: 'bg-rose-500' },
  { value: 'referred_court',   label: 'Referred to Court/Prosecutor',dot: 'bg-purple-500' },
  { value: 'certified_action', label: 'Certificate to File Action',  dot: 'bg-violet-500' },
  { value: 'closed',           label: 'Closed / Dismissed',          dot: 'bg-gray-400' },
];

const EMPTY_FORM = {
  // Filing info
  report_datetime: new Date().toISOString().slice(0, 16),
  // Complainant
  complainant_id: '', complainant_name_manual: '',
  complainant_address: '', complainant_contact: '',
  complainant_signed: false,
  // Respondent
  respondent_id: '', respondent_name_manual: '',
  respondent_address: '', respondent_contact: '',
  // Incident
  incident_type: '', incident_date: '', incident_time: '',
  incident_location: '', narrative: '',
  // Evidence & witnesses
  witnesses: '', injuries_damages: '',
  // Special case
  is_special_case: false, special_case_type: '',
  // Barangay action
  barangay_action: '', hearing_date: '', kagawad_assigned: '',
  lupon_case_number: '',
};

// ── Outcome modal ──────────────────────────────────────────────────────────
function OutcomeModal({ open, onClose, onSave }) {
  const [resolveStatus, setResolveStatus] = useState('settled');
  const [resolution, setResolution] = useState('');
  const [action, setAction] = useState('');

  function handleSave() {
    onSave({ status: resolveStatus, resolution, barangay_action: action });
    setResolution(''); setAction(''); setResolveStatus('settled');
    onClose();
  }

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Update Case Outcome" size="md">
      <div className="space-y-4">
        <div>
          <label className="label">New Status *</label>
          <select className="input" value={resolveStatus} onChange={e => setResolveStatus(e.target.value)}>
            {STATUSES.slice(1).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Barangay Action Taken</label>
          <select className="input" value={action} onChange={e => setAction(e.target.value)}>
            <option value="">Select action...</option>
            {BARANGAY_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Resolution / Remarks</label>
          <textarea className="input resize-none" rows={4} value={resolution}
            onChange={e => setResolution(e.target.value)}
            placeholder="Describe the outcome, settlement terms, or reason for referral..."/>
        </div>
        {['settled'].includes(resolveStatus) && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-sm text-emerald-700 dark:text-emerald-300">
            An amicable settlement should be documented in writing and signed by both parties per Katarungang Pambarangay Law.
          </div>
        )}
        {['referred_pnp','referred_court','certified_action'].includes(resolveStatus) && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-300">
            A Certificate to File Action / referral document must be issued to the complainant before they can proceed to the next authority.
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary">Save Outcome</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function BlotterManagement() {
  const { toast } = useToast();
  const [records, setRecords]     = useState([]);
  const [residents, setResidents] = useState([]);
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [viewModal, setViewModal] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm]           = useState(EMPTY_FORM);
  const [outcomeModal, setOutcomeModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await blotterAPI.getAll(params);
      let list = res.data.records || [];
      if (search) list = list.filter(r =>
        r.case_number?.toLowerCase().includes(search.toLowerCase()) ||
        r.incident_type?.toLowerCase().includes(search.toLowerCase()) ||
        (r.complainant_name || r.complainant_name_manual || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.respondent_name  || r.respondent_name_manual  || '').toLowerCase().includes(search.toLowerCase())
      );
      setRecords(list);
    } catch { toast('Failed to load records', 'error'); }
    finally { setLoading(false); }
  }, [filterStatus, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    residentsAPI.getAll(1, 500).then(r => setResidents(r.data.residents || [])).catch(() => {});
    officialsAPI.getAll().then(r => setOfficials(r.data.officials || [])).catch(() => {});
  }, []);

  // Auto-fill address/contact when resident is selected
  function handleComplainantSelect(id) {
    setForm(p => ({ ...p, complainant_id: id }));
    const r = residents.find(x => x.id == id);
    if (r) setForm(p => ({
      ...p, complainant_id: id,
      complainant_address: r.address || '',
      complainant_contact: r.contact_number || '',
    }));
  }

  function handleRespondentSelect(id) {
    setForm(p => ({ ...p, respondent_id: id }));
    const r = residents.find(x => x.id == id);
    if (r) setForm(p => ({
      ...p, respondent_id: id,
      respondent_address: r.address || '',
      respondent_contact: r.contact_number || '',
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.incident_type) { toast('Incident type is required', 'warning'); return; }
    setSaving(true);
    try {
      if (modal?.id) await blotterAPI.update(modal.id, form);
      else await blotterAPI.create(form);
      toast(modal?.id ? 'Record updated' : 'Blotter filed successfully', 'success');
      setModal(null); load();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  async function handleOutcome({ status, resolution, barangay_action }) {
    try {
      await blotterAPI.updateStatus(outcomeModal, { status, resolution, barangay_action });
      toast('Case outcome updated', 'success');
      setOutcomeModal(null); load();
    } catch { toast('Failed to update', 'error'); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this blotter record?')) return;
    try { await blotterAPI.delete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  const openForm = (record = null) => {
    if (record?.id) {
      setForm({
        report_datetime: record.report_datetime?.slice(0,16) || new Date().toISOString().slice(0,16),
        complainant_id: record.complainant_id || '',
        complainant_name_manual: record.complainant_name_manual || '',
        complainant_address: record.complainant_address || '',
        complainant_contact: record.complainant_contact || '',
        complainant_signed: record.complainant_signed || false,
        respondent_id: record.respondent_id || '',
        respondent_name_manual: record.respondent_name_manual || '',
        respondent_address: record.respondent_address || '',
        respondent_contact: record.respondent_contact || '',
        incident_type: record.incident_type || '',
        incident_date: record.incident_date?.split('T')[0] || '',
        incident_time: record.incident_time || '',
        incident_location: record.incident_location || '',
        narrative: record.narrative || '',
        witnesses: record.witnesses || '',
        injuries_damages: record.injuries_damages || '',
        is_special_case: record.is_special_case || false,
        special_case_type: record.special_case_type || '',
        barangay_action: record.barangay_action || '',
        hearing_date: record.hearing_date?.split('T')[0] || '',
        kagawad_assigned: record.kagawad_assigned || '',
        lupon_case_number: record.lupon_case_number || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setModal(record || {});
  };

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const statusCounts = records.reduce((a, r) => { a[r.status] = (a[r.status]||0)+1; return a; }, {});
  const pending = statusCounts.pending || 0;
  const active  = records.filter(r => !['settled','closed'].includes(r.status)).length;

  const kagawadOptions = officials.filter(o =>
    o.position?.toLowerCase().includes('kagawad') ||
    o.position?.toLowerCase().includes('captain') ||
    o.position?.toLowerCase().includes('lupon')
  );

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <AlertTriangle size={22} className="text-rose-600"/> Blotter Records
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Katarungang Pambarangay — Community Dispute Resolution
          </p>
        </div>
        <button onClick={() => openForm()} className="btn-primary flex items-center gap-1.5">
          <Plus size={15}/> File Blotter
        </button>
      </div>

      {/* Pending alert */}
      {pending > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 text-amber-800 dark:text-amber-300">
          <AlertCircle size={17} className="flex-shrink-0"/>
          <span className="text-sm font-medium">
            {pending} new blotter{pending !== 1 ? 's' : ''} pending action — summons or referral to Lupon Tagapamayapa required.
          </span>
        </div>
      )}

      {/* Status summary cards */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {STATUSES.map(s => (
          <button key={s.value} onClick={() => setFilterStatus(prev => prev === s.value ? '' : s.value)}
            className={`rounded-xl p-2.5 text-left border transition
              ${filterStatus === s.value
                ? 'border-transparent text-white shadow-lg'
                : 'bg-white dark:bg-[#1a1d27] border-gray-100 dark:border-[#2e334a] hover:border-indigo-300'}`}
            style={filterStatus === s.value ? { backgroundColor: 'var(--primary)' } : {}}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`}/>
              <p className={`text-xl font-bold leading-none ${filterStatus === s.value ? 'text-white' : 'text-gray-800 dark:text-slate-100'}`}>{statusCounts[s.value]||0}</p>
            </div>
            <p className={`text-[10px] leading-tight ${filterStatus === s.value ? 'text-white/80' : 'text-gray-500 dark:text-slate-400'}`}>{s.label}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by case number, incident type, complainant or respondent name..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#2e334a] rounded-xl focus:outline-none bg-gray-50 dark:bg-[#22263a] dark:text-slate-200"
            style={{ boxShadow: search ? '0 0 0 2px var(--primary-ring)' : 'none' }}/>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="h-14 bg-gray-100 dark:bg-[#22263a] rounded-xl animate-pulse"/>)}</div>
        ) : records.length === 0 ? (
          <div className="py-14 text-center text-gray-400 dark:text-slate-500">
            <AlertTriangle size={36} className="mx-auto mb-2 text-gray-200 dark:text-slate-700"/>
            <p className="font-medium">No blotter records found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Case #','Incident','Complainant','Respondent','Filed','Hearing','Status','Actions'].map(h => <th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {records.map(r => {
                const statusLabel = STATUSES.find(s => s.value === r.status)?.label || r.status;
                const isSpecial = r.is_special_case;
                return (
                  <tr key={r.id} className={`hover:bg-gray-50 dark:hover:bg-[#22263a] transition-colors ${isSpecial ? 'bg-rose-50/30 dark:bg-rose-900/5' : ''}`}>
                    <td className="table-td">
                      <p className="font-mono text-xs font-semibold text-indigo-700 dark:text-indigo-300">{r.case_number}</p>
                      {isSpecial && <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-0.5"><Shield size={10}/> Special</span>}
                    </td>
                    <td className="table-td text-gray-700 dark:text-slate-200 font-medium max-w-[140px] truncate" title={r.incident_type}>{r.incident_type}</td>
                    <td className="table-td text-gray-600 dark:text-slate-300">{r.complainant_name || r.complainant_name_manual || '—'}</td>
                    <td className="table-td text-gray-600 dark:text-slate-300">{r.respondent_name || r.respondent_name_manual || '—'}</td>
                    <td className="table-td text-gray-400 dark:text-slate-500 whitespace-nowrap text-xs">
                      {r.report_datetime ? new Date(r.report_datetime).toLocaleDateString('en-PH') : new Date(r.created_at).toLocaleDateString('en-PH')}
                    </td>
                    <td className="table-td text-gray-400 dark:text-slate-500 text-xs whitespace-nowrap">
                      {r.hearing_date ? new Date(r.hearing_date).toLocaleDateString('en-PH') : '—'}
                    </td>
                    <td className="table-td"><Badge status={r.status} label={statusLabel}/></td>
                    <td className="table-td">
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => setViewModal(r)} className="act-btn act-indigo"><FileText size={12}/> View</button>
                        <button onClick={() => openForm(r)} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                        {!['settled','closed','certified_action'].includes(r.status) && (
                          <button onClick={() => setOutcomeModal(r.id)} className="act-btn act-green"><Scale size={12}/> Outcome</button>
                        )}
                        <button onClick={() => handleDelete(r.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* File / Edit Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal?.id ? `Edit — ${modal.case_number}` : 'File New Blotter Record'}
        size="xl">
        <form onSubmit={handleSave} className="space-y-5">

          {/* Section 1: Filing Info */}
          <div className="bg-gray-50 dark:bg-[#22263a] rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Clock size={12}/> Filing Information
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date & Time Filed *</label>
                <input type="datetime-local" className="input" value={form.report_datetime}
                  onChange={e => setF('report_datetime', e.target.value)} required/>
              </div>
              <div>
                <label className="label">Lupon / Case Reference #</label>
                <input className="input" value={form.lupon_case_number}
                  onChange={e => setF('lupon_case_number', e.target.value)} placeholder="Optional Lupon case no."/>
              </div>
            </div>
          </div>

          {/* Section 2: Complainant */}
          <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
              <Users size={12}/> Complainant
            </p>
            <ResidentSearch label="Search Resident (optional)" residents={residents}
              value={form.complainant_id} onChange={handleComplainantSelect}
              placeholder="Search resident in registry…"/>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Name (if not in registry)</label>
                <input className="input" value={form.complainant_name_manual}
                  onChange={e => setF('complainant_name_manual', e.target.value)} placeholder="Full name"/>
              </div>
              <div>
                <label className="label text-xs">Contact Number</label>
                <input className="input" value={form.complainant_contact}
                  onChange={e => setF('complainant_contact', e.target.value)} placeholder="09xxxxxxxxx"/>
              </div>
            </div>
            <div>
              <label className="label text-xs">Address</label>
              <input className="input" value={form.complainant_address}
                onChange={e => setF('complainant_address', e.target.value)} placeholder="Street / Purok"/>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600"
                checked={!!form.complainant_signed} onChange={e => setF('complainant_signed', e.target.checked)}/>
              <span className="text-xs text-gray-600 dark:text-slate-300">Complainant has signed / thumbmarked the blotter entry</span>
            </label>
          </div>

          {/* Section 3: Respondent */}
          <div className="bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
              <Users size={12}/> Respondent
            </p>
            <ResidentSearch label="Search Resident (optional)" residents={residents}
              value={form.respondent_id} onChange={handleRespondentSelect}
              placeholder="Search resident in registry…"/>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Name (if not in registry)</label>
                <input className="input" value={form.respondent_name_manual}
                  onChange={e => setF('respondent_name_manual', e.target.value)} placeholder="Full name"/>
              </div>
              <div>
                <label className="label text-xs">Contact Number</label>
                <input className="input" value={form.respondent_contact}
                  onChange={e => setF('respondent_contact', e.target.value)} placeholder="09xxxxxxxxx"/>
              </div>
            </div>
            <div>
              <label className="label text-xs">Address</label>
              <input className="input" value={form.respondent_address}
                onChange={e => setF('respondent_address', e.target.value)} placeholder="Street / Purok"/>
            </div>
          </div>

          {/* Section 4: Incident Details */}
          <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <AlertTriangle size={12}/> Incident Details
            </p>
            <div>
              <label className="label">Incident Type *</label>
              <select className="input" value={form.incident_type}
                onChange={e => setF('incident_type', e.target.value)} required>
                <option value="">Select type...</option>
                {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Date of Incident</label>
                <input type="date" className="input" value={form.incident_date}
                  onChange={e => setF('incident_date', e.target.value)}/>
              </div>
              <div>
                <label className="label">Time</label>
                <input type="time" className="input" value={form.incident_time}
                  onChange={e => setF('incident_time', e.target.value)}/>
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input" value={form.incident_location}
                  onChange={e => setF('incident_location', e.target.value)} placeholder="Purok / Street"/>
              </div>
            </div>
            <div>
              <label className="label">Narrative * <span className="text-gray-400 font-normal text-xs">(Who, What, When, Where, How)</span></label>
              <textarea className="input resize-none" rows={5} value={form.narrative}
                onChange={e => setF('narrative', e.target.value)}
                placeholder="Describe the incident chronologically — who was involved, what happened, when, where, and how..." required/>
            </div>

            {/* Special case flag */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-rose-600"
                  checked={!!form.is_special_case} onChange={e => setF('is_special_case', e.target.checked)}/>
                <span className="text-sm font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                  <Shield size={14}/> Mark as Special Case (VAWC / Child Abuse / Sexual Offense)
                </span>
              </label>
              {form.is_special_case && (
                <div className="ml-6 space-y-2">
                  <select className="input" value={form.special_case_type}
                    onChange={e => setF('special_case_type', e.target.value)}>
                    <option value="">Select category...</option>
                    {SPECIAL_CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3 text-xs text-rose-700 dark:text-rose-300">
                    Special cases require immediate safety referrals to PNP Women & Children Protection Desk or DSWD. Mediation is generally NOT appropriate for VAWC cases.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Evidence & Witnesses */}
          <div className="bg-gray-50 dark:bg-[#22263a] rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Info size={12}/> Evidence, Witnesses & Claims
            </p>
            <div>
              <label className="label">Injuries, Damages, or Losses Claimed</label>
              <textarea className="input resize-none" rows={2} value={form.injuries_damages}
                onChange={e => setF('injuries_damages', e.target.value)}
                placeholder="Describe any physical injuries, property damage, financial losses claimed by complainant..."/>
            </div>
            <div>
              <label className="label">Witnesses</label>
              <textarea className="input resize-none" rows={2} value={form.witnesses}
                onChange={e => setF('witnesses', e.target.value)}
                placeholder="Names and contact numbers of witnesses, one per line..."/>
            </div>
          </div>

          {/* Section 6: Barangay Action */}
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
              <Scale size={12}/> Barangay Action & Assignment
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Hearing Date</label>
                <input type="date" className="input" value={form.hearing_date}
                  onChange={e => setF('hearing_date', e.target.value)}/>
              </div>
              <div>
                <label className="label">Assigned Kagawad / Lupon Member</label>
                <select className="input" value={form.kagawad_assigned}
                  onChange={e => setF('kagawad_assigned', e.target.value)}>
                  <option value="">Select from officials...</option>
                  {kagawadOptions.map(o => <option key={o.id} value={o.full_name}>{o.full_name} ({o.position})</option>)}
                </select>
                <input className="input mt-1.5 text-xs" value={form.kagawad_assigned}
                  onChange={e => setF('kagawad_assigned', e.target.value)} placeholder="Or type name manually…"/>
              </div>
            </div>
            <div>
              <label className="label">Initial Action Taken</label>
              <select className="input" value={form.barangay_action}
                onChange={e => setF('barangay_action', e.target.value)}>
                <option value="">Select action...</option>
                {BARANGAY_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : modal?.id ? 'Update Record' : 'File Blotter Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Detail Modal */}
      {viewModal && (
        <Modal open={!!viewModal} onClose={() => setViewModal(null)} title={`Case ${viewModal.case_number}`} size="lg">
          <div className="space-y-4 text-sm">
            {/* Status + special flag */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge status={viewModal.status} label={STATUSES.find(s=>s.value===viewModal.status)?.label || viewModal.status}/>
              {viewModal.is_special_case && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-800">
                  <Shield size={11}/> {viewModal.special_case_type || 'Special Case'}
                </span>
              )}
              <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto">
                Filed: {viewModal.report_datetime ? new Date(viewModal.report_datetime).toLocaleString('en-PH') : '—'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Complainant */}
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-2">Complainant</p>
                <p className="font-semibold">{viewModal.complainant_name || viewModal.complainant_name_manual || '—'}</p>
                {viewModal.complainant_address && <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">{viewModal.complainant_address}</p>}
                {viewModal.complainant_contact && <p className="text-gray-500 dark:text-slate-400 text-xs">{viewModal.complainant_contact}</p>}
                {viewModal.complainant_signed && <p className="text-emerald-600 text-xs mt-1 font-semibold">✓ Signed / Thumbmarked</p>}
              </div>
              {/* Respondent */}
              <div className="bg-rose-50 dark:bg-rose-900/10 rounded-xl p-3">
                <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide mb-2">Respondent</p>
                <p className="font-semibold">{viewModal.respondent_name || viewModal.respondent_name_manual || '—'}</p>
                {viewModal.respondent_address && <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">{viewModal.respondent_address}</p>}
                {viewModal.respondent_contact && <p className="text-gray-500 dark:text-slate-400 text-xs">{viewModal.respondent_contact}</p>}
              </div>
            </div>

            {/* Incident */}
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Incident</p>
              <p className="font-semibold">{viewModal.incident_type}</p>
              {(viewModal.incident_date || viewModal.incident_time) && (
                <p className="text-gray-500 dark:text-slate-400 text-xs">
                  {viewModal.incident_date ? new Date(viewModal.incident_date).toLocaleDateString('en-PH') : ''} {viewModal.incident_time || ''}
                  {viewModal.incident_location ? ` · ${viewModal.incident_location}` : ''}
                </p>
              )}
              {viewModal.narrative && <p className="text-gray-700 dark:text-slate-200 text-xs mt-2 whitespace-pre-line">{viewModal.narrative}</p>}
            </div>

            {/* Injuries / Witnesses */}
            {(viewModal.injuries_damages || viewModal.witnesses) && (
              <div className="grid grid-cols-2 gap-3">
                {viewModal.injuries_damages && (
                  <div className="bg-gray-50 dark:bg-[#22263a] rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Injuries / Damages</p>
                    <p className="text-xs text-gray-700 dark:text-slate-200 whitespace-pre-line">{viewModal.injuries_damages}</p>
                  </div>
                )}
                {viewModal.witnesses && (
                  <div className="bg-gray-50 dark:bg-[#22263a] rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Witnesses</p>
                    <p className="text-xs text-gray-700 dark:text-slate-200 whitespace-pre-line">{viewModal.witnesses}</p>
                  </div>
                )}
              </div>
            )}

            {/* Action & Resolution */}
            <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-3 space-y-1">
              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">Barangay Action</p>
              {viewModal.kagawad_assigned && <p className="text-xs">Assigned to: <strong>{viewModal.kagawad_assigned}</strong></p>}
              {viewModal.hearing_date && <p className="text-xs">Hearing: {new Date(viewModal.hearing_date).toLocaleDateString('en-PH')}</p>}
              {viewModal.barangay_action && <p className="text-xs">Action: <strong>{viewModal.barangay_action}</strong></p>}
              {viewModal.resolution && (
                <div className="mt-2 pt-2 border-t border-indigo-200 dark:border-indigo-800">
                  <p className="text-xs font-semibold">Resolution:</p>
                  <p className="text-xs text-gray-700 dark:text-slate-200 whitespace-pre-line mt-1">{viewModal.resolution}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-gray-100 dark:border-[#2e334a]">
              {!['settled','closed','certified_action'].includes(viewModal.status) && (
                <button onClick={() => { setOutcomeModal(viewModal.id); setViewModal(null); }}
                  className="btn-secondary flex items-center gap-1.5 text-sm"><Scale size={13}/> Update Outcome</button>
              )}
              <button onClick={() => { openForm(viewModal); setViewModal(null); }}
                className="btn-secondary flex items-center gap-1.5 text-sm"><Pencil size={13}/> Edit</button>
              <button onClick={() => setViewModal(null)} className="btn-primary text-sm">Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Outcome Modal */}
      <OutcomeModal
        open={!!outcomeModal}
        onClose={() => setOutcomeModal(null)}
        onSave={handleOutcome}
      />
    </div>
  );
}

