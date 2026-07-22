import React, { useState, useEffect, useCallback } from 'react';
import { drrmAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import StatCard from '../components/StatCard';
import { AlertOctagon, Plus, Pencil, Trash2, Users, Home, CheckCircle, Activity } from 'lucide-react';

const INCIDENT_TYPES = ['Flood','Fire','Typhoon','Earthquake','Landslide','Storm Surge',
  'Drought','Health Emergency','Vehicular Accident','Industrial Accident','Power Outage','Other'];
const ALERT_LEVELS = [
  { value: 'green',  label: 'Green – Normal',     bg: 'bg-emerald-500' },
  { value: 'yellow', label: 'Yellow – Watch',      bg: 'bg-yellow-400' },
  { value: 'orange', label: 'Orange – Warning',    bg: 'bg-orange-500' },
  { value: 'red',    label: 'Red – Critical',      bg: 'bg-red-600' },
];

function IncidentForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || {
    incident_title:'', incident_type:'', incident_date:'', location:'',
    alert_level:'green', status:'active', affected_families:0, affected_persons:0,
    description:'', response_actions:''
  });
  const set = (k,v) => setForm(p => ({...p,[k]:v}));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div>
        <label className="label">Incident Title *</label>
        <input className="input" value={form.incident_title} onChange={e => set('incident_title', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Incident Type</label>
          <select className="input" value={form.incident_type} onChange={e => set('incident_type', e.target.value)}>
            <option value="">Select...</option>
            {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date & Time</label>
          <input type="datetime-local" className="input" value={form.incident_date} onChange={e => set('incident_date', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Location</label>
        <input className="input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Specific area/purok" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Alert Level</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {ALERT_LEVELS.map(a => (
              <button key={a.value} type="button" onClick={() => set('alert_level', a.value)}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border-2 transition text-left
                  ${form.alert_level === a.value ? `border-transparent text-white ${a.bg}` : 'border-gray-200 dark:border-[#2e334a] text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-[#22263a]'}`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Active / Ongoing</option>
            <option value="monitoring">Under Monitoring</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Affected Families</label>
          <input type="number" min="0" className="input" value={form.affected_families} onChange={e => set('affected_families', parseInt(e.target.value)||0)} />
        </div>
        <div>
          <label className="label">Affected Persons</label>
          <input type="number" min="0" className="input" value={form.affected_persons} onChange={e => set('affected_persons', parseInt(e.target.value)||0)} />
        </div>
      </div>
      <div>
        <label className="label">Description / Situation Report</label>
        <textarea className="input resize-none" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div>
        <label className="label">Response Actions Taken</label>
        <textarea className="input resize-none" rows={3} value={form.response_actions} onChange={e => set('response_actions', e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Incident'}</button>
      </div>
    </form>
  );
}

const alertDot = { green:'bg-emerald-500', yellow:'bg-yellow-400', orange:'bg-orange-500', red:'bg-red-600' };
const alertText = { green:'text-emerald-700', yellow:'text-yellow-700', orange:'text-orange-700', red:'text-red-700' };
const alertBg   = { green:'bg-emerald-50', yellow:'bg-yellow-50', orange:'bg-orange-50', red:'bg-rose-50' };

export default function DRRM() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const canEdit = hasRole(['admin', 'secretary', 'captain']);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAlert, setFilterAlert] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterAlert)  params.alert_level = filterAlert;
      setIncidents((await drrmAPI.getAll(params)).data.incidents || []);
    } catch { toast('Failed to load incidents', 'error'); }
    finally { setLoading(false); }
  }, [filterStatus, filterAlert]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(form) {
    setSaving(true);
    try {
      if (modal?.id) await drrmAPI.update(modal.id, form);
      else await drrmAPI.create(form);
      toast(modal?.id ? 'Incident updated' : 'Incident logged', 'success');
      setModal(null); load();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this incident record?')) return;
    try { await drrmAPI.delete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  const active = incidents.filter(i => i.status === 'active');
  const totalFamilies = active.reduce((s,i) => s + Number(i.affected_families||0), 0);
  const totalPersons  = active.reduce((s,i) => s + Number(i.affected_persons||0), 0);

  return (
    <div className="w-full space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <AlertOctagon size={22} className="text-rose-600"/> BDRRM / Incidents
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Barangay Disaster Risk Reduction Management · {incidents.length} incidents · {active.length} active</p>
        </div>
        {canEdit && <button onClick={() => setModal({})} className="btn-primary flex items-center gap-1.5"><Plus size={15}/>Log Incident</button>}
      </div>

      {/* Alert banner if active red/orange incident */}
      {active.some(i => ['red','orange'].includes(i.alert_level)) && (
        <div className="bg-rose-600 text-white rounded-2xl px-5 py-4 flex items-center gap-3 shadow-lg shadow-rose-900/30">
          <AlertOctagon size={20} className="flex-shrink-0 animate-pulse" />
          <div>
            <p className="font-bold">Active Emergency Alert</p>
            <p className="text-rose-100 text-sm">{active.filter(i=>['red','orange'].includes(i.alert_level)).length} high-level incident(s) currently active</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Incidents" value={active.length} icon={AlertOctagon} color="rose" />
        <StatCard title="Families Affected" value={totalFamilies} icon={Home} color="amber" />
        <StatCard title="Persons Affected" value={totalPersons} icon={Users} color="orange" />
        <StatCard title="Resolved" value={incidents.filter(i=>i.status==='resolved').length} icon={CheckCircle} color="emerald" />
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        {[['','All Status'],['active','Active'],['monitoring','Monitoring'],['resolved','Resolved']].map(([v,l]) => (
          <button key={v} onClick={() => setFilterStatus(v)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition
              ${filterStatus===v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-[#1a1d27] text-gray-600 dark:text-slate-300 border-gray-200 dark:border-[#2e334a] hover:border-indigo-300'}`}>
            {l}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {ALERT_LEVELS.map(a => (
            <button key={a.value} onClick={() => setFilterAlert(prev => prev === a.value ? '' : a.value)}
              className={`w-6 h-6 rounded-full border-2 transition ${a.bg} ${filterAlert === a.value ? 'border-gray-800 scale-110' : 'border-white/50 dark:border-[#22263a]'}`}
              title={a.label} />
          ))}
        </div>
      </div>

      {/* Incident cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_,i) => <div key={i} className="h-44 bg-gray-100 dark:bg-[#22263a] rounded-2xl animate-pulse"/>)}
        </div>
      ) : incidents.length === 0 ? (
        <div className="py-16 text-center text-gray-400 dark:text-slate-500">
          <AlertOctagon size={40} className="mx-auto mb-3 opacity-30"/><p className="font-medium">No incidents recorded</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incidents.map(i => (
            <div key={i.id} className={`rounded-2xl border p-4 shadow-sm hover:shadow-md transition-shadow
              ${i.alert_level === 'red' ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-900/10' :
                i.alert_level === 'orange' ? 'border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-900/10' :
                i.alert_level === 'yellow' ? 'border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-900/10' :
                'bg-white dark:bg-[#1a1d27] border-gray-100 dark:border-[#2e334a]'}`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-start gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${alertDot[i.alert_level] || 'bg-gray-400'}`} />
                  <div>
                    <p className="font-bold text-gray-800 dark:text-slate-100">{i.incident_title}</p>
                    {i.incident_type && <p className="text-xs text-gray-500 dark:text-slate-400">{i.incident_type}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Badge status={i.status}/>
                  {canEdit && <>
                    <button onClick={() => setModal({...i, incident_date: i.incident_date ? i.incident_date.slice(0,16) : ''})} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                    <button onClick={() => handleDelete(i.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                  </>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                {i.location && <div className="col-span-3 text-gray-500 dark:text-slate-400">ðŸ“ {i.location}</div>}
                {i.incident_date && <div className="text-gray-400 dark:text-slate-500 col-span-3">{new Date(i.incident_date).toLocaleString('en-PH')}</div>}
                <div className="bg-white/70 dark:bg-[#22263a] rounded-lg p-2 text-center">
                  <p className="font-bold text-gray-800 dark:text-slate-100 text-base">{i.affected_families || 0}</p>
                  <p className="text-gray-400 dark:text-slate-500">Families</p>
                </div>
                <div className="bg-white/70 dark:bg-[#22263a] rounded-lg p-2 text-center">
                  <p className="font-bold text-gray-800 dark:text-slate-100 text-base">{i.affected_persons || 0}</p>
                  <p className="text-gray-400 dark:text-slate-500">Persons</p>
                </div>
                <div className={`rounded-lg p-2 text-center ${alertBg[i.alert_level] || 'bg-gray-50'} dark:bg-[#22263a]`}>
                  <p className={`font-bold text-base uppercase ${alertText[i.alert_level] || 'text-gray-700'}`}>{i.alert_level}</p>
                  <p className="text-gray-400 dark:text-slate-500">Alert</p>
                </div>
              </div>

              {i.description && <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2">{i.description}</p>}
              {i.response_actions && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 line-clamp-1">↳ {i.response_actions}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Incident' : 'Log New Incident'} size="lg">
        <IncidentForm initial={modal?.id ? modal : null} onSave={handleSave} onCancel={() => setModal(null)} loading={saving} />
      </Modal>
    </div>
  );
}
