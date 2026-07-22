import React, { useState, useEffect, useCallback, useRef } from 'react';
import { projectsAPI, budgetAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import StatCard from '../components/StatCard';
import { HardHat, Plus, Pencil, Trash2, TrendingUp, CheckCircle, Clock, Pause,
  ChevronDown, CalendarCheck, CalendarX, AlertCircle } from 'lucide-react';

const PROJ_TYPES  = ['Infrastructure','Social Services','Environmental','Health','Education','Livelihood','Other'];
const FUND_SOURCES = ['General Fund','20% Development Fund','DRRM Fund','DILG Grant','Other National Fund','LGU Supplemental','Private/Donation'];
const STATUSES = [
  { value: 'planning',  label: 'Planning',  color: 'text-gray-600  dark:text-slate-300', dot: 'bg-gray-400' },
  { value: 'ongoing',   label: 'Ongoing',   color: 'text-blue-600  dark:text-blue-400',  dot: 'bg-blue-500' },
  { value: 'completed', label: 'Completed', color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  { value: 'suspended', label: 'Suspended', color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-400' },
];

// ── Days diff helper ──────────────────────────────────────────────────────
function daysDiff(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.round((b - a) / 86400000);
}

// ── Completion indicator ──────────────────────────────────────────────────
function CompletionTag({ p }) {
  if (p.status !== 'completed' || !p.completion_date) return null;

  const fmt = d => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

  if (!p.end_date) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
        <CalendarCheck size={13}/>
        <span>Completed {fmt(p.completion_date)}</span>
      </div>
    );
  }

  const diff = daysDiff(p.completion_date, p.end_date); // positive = early, negative = overdue

  if (diff > 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
        <CalendarCheck size={13}/>
        <span>Finished <strong>{diff} day{diff !== 1 ? 's' : ''} early</strong> · {fmt(p.completion_date)}</span>
      </div>
    );
  }
  if (diff === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
        <CalendarCheck size={13}/>
        <span>Finished <strong>on time</strong> · {fmt(p.completion_date)}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
      <CalendarX size={13}/>
      <span>Overdue by <strong>{Math.abs(diff)} day{Math.abs(diff) !== 1 ? 's' : ''}</strong> · {fmt(p.completion_date)}</span>
    </div>
  );
}

// ── Inline status dropdown ────────────────────────────────────────────────
function StatusDropdown({ project, onChanged }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = STATUSES.find(s => s.value === project.status) || STATUSES[0];

  async function choose(newStatus) {
    if (newStatus === project.status) { setOpen(false); return; }
    setLoading(true);
    setOpen(false);
    try {
      await projectsAPI.updateStatus(project.id, newStatus);
      toast(`Status updated to ${newStatus}`, 'success');
      onChanged();
    } catch {
      toast('Failed to update status', 'error');
    } finally { setLoading(false); }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        disabled={loading}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition
          ${open ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-[#2e334a] bg-white dark:bg-[#22263a] hover:border-indigo-300'}
          ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${current.dot}`}/>
        <span className={current.color}>{current.label}</span>
        <ChevronDown size={11} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}/>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-[#1a1d27] rounded-xl shadow-xl border border-gray-100 dark:border-[#2e334a] z-50 overflow-hidden py-1">
          {STATUSES.map(s => (
            <button key={s.value} onClick={() => choose(s.value)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition
                ${s.value === project.status
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 font-semibold'
                  : 'hover:bg-gray-50 dark:hover:bg-[#22263a]'}`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`}/>
              <span className={s.color}>{s.label}</span>
              {s.value === 'completed' && s.value !== project.status && (
                <span className="ml-auto text-[10px] text-gray-400">auto-date</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Project form ──────────────────────────────────────────────────────────
function ProjectForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || {
    project_name:'', description:'', project_type:'Infrastructure', budget:'',
    amount_spent:'', contractor:'', start_date:'', end_date:'',
    status:'planning', progress_percentage:0, fund_source:'General Fund', location:''
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div>
        <label className="label">Project Name *</label>
        <input className="input" value={form.project_name} onChange={e => set('project_name', e.target.value)} required />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.project_type} onChange={e => set('project_type', e.target.value)}>
            {PROJ_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Fund Source</label>
          <select className="input" value={form.fund_source} onChange={e => set('fund_source', e.target.value)}>
            {FUND_SOURCES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Budget (₱)</label>
          <input type="number" min="0" step="0.01" className="input" value={form.budget} onChange={e => set('budget', e.target.value)} />
        </div>
        <div>
          <label className="label">Amount Spent (₱)</label>
          <input type="number" min="0" step="0.01" className="input" value={form.amount_spent} onChange={e => set('amount_spent', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Contractor</label>
        <input className="input" value={form.contractor} onChange={e => set('contractor', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start Date</label>
          <input type="date" className="input" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </div>
        <div>
          <label className="label">Target End Date</label>
          <input type="date" className="input" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Progress ({form.progress_percentage}%)</label>
          <input type="range" min="0" max="100" className="w-full mt-1.5 accent-indigo-600"
            value={form.progress_percentage} onChange={e => set('progress_percentage', parseInt(e.target.value))} />
        </div>
      </div>
      <div>
        <label className="label">Location</label>
        <input className="input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Purok, street, etc." />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Project'}</button>
      </div>
    </form>
  );
}

const fmt = n => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

// ── Main page ─────────────────────────────────────────────────────────────
export default function Projects() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const canEdit = hasRole(['admin', 'secretary']);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      setProjects((await projectsAPI.getAll(params)).data.projects || []);
    } catch { toast('Failed to load projects', 'error'); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(form) {
    // Budget check before creating a new project
    if (!modal?.id && parseFloat(form.budget) > 0 && form.fund_source) {
      try {
        const chk = await budgetAPI.checkBudget({ fund_source: form.fund_source, amount: form.budget });
        const { ok, hasBudget, remaining, allocated, requested } = chk.data;
        if (hasBudget && !ok) {
          const proceed = window.confirm(
            `⚠️ Insufficient Budget\n\n` +
            `Fund Source: ${form.fund_source}\n` +
            `Allocated : ₱${Number(allocated).toLocaleString('en-PH',{minimumFractionDigits:2})}\n` +
            `Remaining : ₱${Number(remaining).toLocaleString('en-PH',{minimumFractionDigits:2})}\n` +
            `Requested : ₱${Number(requested).toLocaleString('en-PH',{minimumFractionDigits:2})}\n\n` +
            `The barangay does not have enough budget for this fund source.\n` +
            `Proceed anyway? (Admin override)`
          );
          if (!proceed) return;
        }
      } catch { /* skip check if endpoint unavailable */ }
    }

    setSaving(true);
    try {
      if (modal?.id) await projectsAPI.update(modal.id, form);
      else await projectsAPI.create(form);
      toast(modal?.id ? 'Project updated' : 'Project added', 'success');
      setModal(null); load();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this project?')) return;
    try { await projectsAPI.delete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  const statusCount = projects.reduce((a, p) => { a[p.status] = (a[p.status] || 0) + 1; return a; }, {});
  const totalBudget = projects.reduce((s, p) => s + Number(p.budget || 0), 0);
  const totalSpent  = projects.reduce((s, p) => s + Number(p.amount_spent || 0), 0);

  // Overdue: ongoing/planning past target date
  const today = new Date().toISOString().split('T')[0];
  const overdueCount = projects.filter(p =>
    ['ongoing','planning'].includes(p.status) && p.end_date && p.end_date < today
  ).length;

  return (
    <div className="w-full space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <HardHat size={22} className="text-indigo-600"/> Projects & Programs
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{projects.length} projects</p>
        </div>
        {canEdit && <button onClick={() => setModal({})} className="btn-primary flex items-center gap-1.5"><Plus size={15}/>Add Project</button>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Budget"  value={fmt(totalBudget)} icon={HardHat}     color="indigo" />
        <StatCard title="Total Spent"   value={fmt(totalSpent)}  icon={TrendingUp}   color="rose" />
        <StatCard title="Ongoing"       value={statusCount.ongoing || 0}   icon={TrendingUp}  color="blue" />
        <StatCard title="Completed"     value={statusCount.completed || 0} icon={CheckCircle} color="emerald" />
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 text-amber-800 dark:text-amber-300">
          <AlertCircle size={17} className="flex-shrink-0"/>
          <span className="text-sm font-medium">
            {overdueCount} project{overdueCount !== 1 ? 's are' : ' is'} past the target date and not yet completed.
          </span>
        </div>
      )}

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {[['', 'All Projects'], ...STATUSES.map(s => [s.value, s.label])].map(([v, l]) => (
          <button key={v} onClick={() => setFilterStatus(v)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition
              ${filterStatus === v
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-[#1a1d27] text-gray-600 dark:text-slate-300 border-gray-200 dark:border-[#2e334a] hover:border-indigo-300'}`}>
            {l}
            {v && <span className="opacity-70 ml-1">{statusCount[v] || 0}</span>}
          </button>
        ))}
      </div>

      {/* Project cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-56 bg-gray-100 dark:bg-[#22263a] rounded-2xl animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="py-16 text-center text-gray-400 dark:text-slate-500">
          <HardHat size={40} className="mx-auto mb-3 opacity-30" /><p className="font-medium">No projects found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(p => {
            const pct = p.progress_percentage || 0;
            const isOverdue = ['ongoing','planning'].includes(p.status) && p.end_date && p.end_date < today;
            return (
              <div key={p.id} className={`bg-white dark:bg-[#1a1d27] rounded-2xl border shadow-sm hover:shadow-md transition-shadow p-5
                ${isOverdue ? 'border-amber-200 dark:border-amber-800/60' : 'border-gray-100 dark:border-[#2e334a]'}`}>

                {/* Card header: name + actions */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 dark:text-slate-100 truncate">{p.project_name}</p>
                    {p.project_type && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">{p.project_type}</p>}
                    {p.description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">{p.description}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setModal(p)} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                      <button onClick={() => handleDelete(p.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                    </div>
                  )}
                </div>

                {/* Inline status changer */}
                <div className="mb-3">
                  {canEdit
                    ? <StatusDropdown project={p} onChanged={load}/>
                    : <Badge status={p.status} label={STATUSES.find(s => s.value === p.status)?.label || p.status}/>
                  }
                </div>

                {/* Completion / Overdue tag */}
                {p.status === 'completed'
                  ? <div className="mb-3"><CompletionTag p={p}/></div>
                  : isOverdue && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium mb-3">
                      <AlertCircle size={12}/>
                      <span>Past target date by <strong>{Math.abs(daysDiff(today, p.end_date))} day{Math.abs(daysDiff(today, p.end_date)) !== 1 ? 's' : ''}</strong></span>
                    </div>
                  )
                }

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
                    <span>Progress</span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-[#22263a] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>

                {/* Meta info */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400 dark:text-slate-500">Budget</p>
                    <p className="font-semibold text-gray-800 dark:text-slate-200">{fmt(p.budget)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-slate-500">Spent</p>
                    <p className={`font-semibold ${Number(p.amount_spent) > Number(p.budget) ? 'text-rose-600' : 'text-gray-800 dark:text-slate-200'}`}>
                      {fmt(p.amount_spent)}
                    </p>
                  </div>
                  {p.fund_source && <div className="col-span-2 text-gray-400 dark:text-slate-500">Fund: <span className="text-gray-700 dark:text-slate-300">{p.fund_source}</span></div>}
                  {p.contractor && <div className="col-span-2 text-gray-400 dark:text-slate-500">Contractor: <span className="text-gray-700 dark:text-slate-300">{p.contractor}</span></div>}
                  {p.end_date && (
                    <div className="col-span-2 text-gray-400 dark:text-slate-500">
                      Target: <span className={`${isOverdue ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-gray-700 dark:text-slate-300'}`}>
                        {new Date(p.end_date).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' })}
                      </span>
                    </div>
                  )}
                  {p.location && <div className="col-span-2 text-gray-400 dark:text-slate-500">Location: <span className="text-gray-700 dark:text-slate-300">{p.location}</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Project' : 'Add Project'} size="lg">
        <ProjectForm initial={modal?.id ? modal : null} onSave={handleSave} onCancel={() => setModal(null)} loading={saving} />
      </Modal>
    </div>
  );
}
