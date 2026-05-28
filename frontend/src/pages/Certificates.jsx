import React, { useState, useEffect, useCallback } from 'react';
import { certificatesAPI, residentsAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import StatCard from '../components/StatCard';
import { FileText, Plus, Upload, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import ResidentSearch from '../components/ResidentSearch';

const CERT_TYPES = [
  { value: 'barangay_clearance', label: 'Barangay Clearance' },
  { value: 'residency',          label: 'Certificate of Residency' },
  { value: 'indigency',          label: 'Certificate of Indigency' },
  { value: 'business_permit',    label: 'Business Permit' },
];

export default function Certificates() {
  const { hasRole } = useAuth();
  const { toast }   = useToast();
  const canApprove  = hasRole(['admin', 'captain']);

  const [activeTab,    setActiveTab]    = useState('certificates');
  const [certificates, setCertificates] = useState([]);
  const [templates,    setTemplates]    = useState([]);
  const [residents,    setResidents]    = useState([]);
  const [stats,        setStats]        = useState({});
  const [loading,      setLoading]      = useState(true);
  const [genModal,     setGenModal]     = useState(false);
  const [tplModal,     setTplModal]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const [genForm, setGenForm] = useState({ resident_id: '', certificate_type: 'barangay_clearance', template_id: '', purpose: '' });
  const [tplForm, setTplForm] = useState({ template_name: '', certificate_type: 'barangay_clearance' });
  const [tplFile, setTplFile] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const [certs, tpls, res, st] = await Promise.all([
        certificatesAPI.getAll(params),
        certificatesAPI.getTemplates(),
        residentsAPI.getAll(1, 500),
        certificatesAPI.getStats(),
      ]);
      setCertificates(certs.data.certificates || []);
      setTemplates(tpls.data.templates || []);
      setResidents(res.data.residents || []);
      setStats(st.data.stats || {});
    } catch { toast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  async function handleGenerate(e) {
    e.preventDefault();
    if (!genForm.resident_id) { toast('Please select a resident', 'warning'); return; }
    setSaving(true);
    try {
      await certificatesAPI.generate(genForm);
      toast('Certificate generated!', 'success');
      setGenModal(false);
      setGenForm({ resident_id: '', certificate_type: 'barangay_clearance', template_id: '', purpose: '' });
      load();
    } catch (err) { toast(err.response?.data?.message || 'Failed to generate', 'error'); }
    finally { setSaving(false); }
  }

  async function handleUploadTemplate(e) {
    e.preventDefault();
    if (!tplFile) { toast('Please select a file', 'warning'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('template', tplFile);
      fd.append('template_name', tplForm.template_name);
      fd.append('certificate_type', tplForm.certificate_type);
      await certificatesAPI.uploadTemplate(fd);
      toast('Template uploaded!', 'success');
      setTplModal(false); setTplFile(null);
      setTplForm({ template_name: '', certificate_type: 'barangay_clearance' });
      load();
    } catch (err) { toast(err.response?.data?.message || 'Upload failed', 'error'); }
    finally { setSaving(false); }
  }

  const action = async (fn, msg) => {
    try { await fn(); toast(msg, 'success'); load(); }
    catch (err) { toast(err.response?.data?.message || 'Action failed', 'error'); }
  };

  const statusCounts = certificates.reduce((a, c) => { a[c.status] = (a[c.status] || 0) + 1; return a; }, {});

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <FileText size={22} className="text-indigo-600" /> Certificates
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{certificates.length} total certificates</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTplModal(true)} className="btn-secondary flex items-center gap-1.5"><Upload size={14}/> Upload Template</button>
          <button onClick={() => setGenModal(true)} className="btn-primary flex items-center gap-1.5"><Plus size={14}/> Generate Certificate</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total" value={Number(stats.total)||0} icon={FileText} color="indigo" />
        <StatCard title="Pending"  value={Number(stats.pending)||0}  icon={FileText} color="amber" />
        <StatCard title="Approved" value={Number(stats.approved)||0} icon={FileText} color="emerald" />
        <StatCard title="Rejected" value={Number(stats.rejected)||0} icon={FileText} color="rose" />
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-[#2e334a]">
          {['certificates','templates'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-semibold capitalize transition border-b-2 -mb-px
                ${activeTab === tab
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Status filter pills (certificates tab) */}
        {activeTab === 'certificates' && (
          <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2">
            {[['','All'],['pending','Pending'],['approved','Approved'],['rejected','Rejected'],['draft','Draft']].map(([v,l]) => (
              <button key={v} onClick={() => setFilterStatus(v)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition
                  ${filterStatus === v
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-transparent text-gray-500 dark:text-slate-400 border-gray-200 dark:border-[#2e334a] hover:border-indigo-400'}`}>
                {l} {v ? statusCounts[v]||0 : certificates.length}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="h-10 bg-gray-100 dark:bg-[#22263a] rounded-xl animate-pulse"/>)}</div>
        ) : activeTab === 'certificates' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
                {['Resident','Type','Purpose','Status','Date','Actions'].map(h => <th key={h} className="table-th">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
                {certificates.length === 0 ? (
                  <tr><td colSpan={6} className="py-14 text-center text-gray-400 dark:text-slate-500">
                    <FileText size={32} className="mx-auto mb-2 opacity-30"/><p>No certificates found</p>
                  </td></tr>
                ) : certificates.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a] transition-colors">
                    <td className="table-td">
                      <p className="font-medium text-gray-900 dark:text-slate-100">{c.resident_name}</p>
                    </td>
                    <td className="table-td text-gray-500 dark:text-slate-400">
                      {CERT_TYPES.find(t => t.value === c.certificate_type)?.label || c.certificate_type}
                    </td>
                    <td className="table-td text-gray-500 dark:text-slate-400 max-w-xs truncate">{c.purpose || '—'}</td>
                    <td className="table-td"><Badge status={c.status}/></td>
                    <td className="table-td text-gray-400 dark:text-slate-500 whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString('en-PH')}
                    </td>
                    <td className="table-td">
                      <div className="flex gap-1">
                        {c.status === 'pending' && canApprove && <>
                          <button onClick={() => action(() => certificatesAPI.approve(c.id), 'Certificate approved')} title="Approve" className="icon-btn text-gray-400 hover:text-emerald-600"><CheckCircle size={15}/></button>
                          <button onClick={() => action(() => certificatesAPI.reject(c.id), 'Certificate rejected')} title="Reject" className="icon-btn text-gray-400 hover:text-rose-600"><XCircle size={15}/></button>
                        </>}
                        <button onClick={() => action(() => certificatesAPI.delete(c.id), 'Deleted')} title="Delete" className="icon-btn text-gray-400 hover:text-rose-600"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
                {['Template Name','Type','Uploaded','Actions'].map(h => <th key={h} className="table-th">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
                {templates.length === 0 ? (
                  <tr><td colSpan={4} className="py-14 text-center text-gray-400 dark:text-slate-500">
                    <Upload size={32} className="mx-auto mb-2 opacity-30"/><p>No templates uploaded</p>
                  </td></tr>
                ) : templates.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a] transition-colors">
                    <td className="table-td font-medium text-gray-900 dark:text-slate-100">{t.template_name}</td>
                    <td className="table-td"><Badge status="default" label={CERT_TYPES.find(x => x.value === t.certificate_type)?.label || t.certificate_type}/></td>
                    <td className="table-td text-gray-400 dark:text-slate-500">{new Date(t.created_at).toLocaleDateString('en-PH')}</td>
                    <td className="table-td">
                      <button onClick={() => action(() => certificatesAPI.deleteTemplate(t.id), 'Template deleted')} className="icon-btn text-gray-400 hover:text-rose-600"><Trash2 size={14}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Certificate Modal */}
      <Modal open={genModal} onClose={() => setGenModal(false)} title="Generate Certificate" size="md">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="label">Resident * <span className="text-gray-400 font-normal text-xs">(type to search)</span></label>
            <ResidentSearch
              residents={residents}
              value={genForm.resident_id}
              onChange={v => setGenForm(p => ({ ...p, resident_id: v }))}
            />
          </div>
          <div>
            <label className="label">Certificate Type *</label>
            <select className="input" value={genForm.certificate_type} onChange={e => setGenForm(p => ({ ...p, certificate_type: e.target.value }))} required>
              {CERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Template <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
            <select className="input" value={genForm.template_id} onChange={e => setGenForm(p => ({ ...p, template_id: e.target.value }))}>
              <option value="">No template (generate blank)</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.template_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Purpose *</label>
            <input className="input" value={genForm.purpose} onChange={e => setGenForm(p => ({ ...p, purpose: e.target.value }))}
              placeholder="e.g. Employment, Scholarship, Bank Loan…" required />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setGenModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Generating…' : 'Generate Certificate'}</button>
          </div>
        </form>
      </Modal>

      {/* Upload Template Modal */}
      <Modal open={tplModal} onClose={() => setTplModal(false)} title="Upload Certificate Template" size="sm">
        <form onSubmit={handleUploadTemplate} className="space-y-4">
          <div>
            <label className="label">Template Name *</label>
            <input className="input" value={tplForm.template_name} onChange={e => setTplForm(p => ({ ...p, template_name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Certificate Type *</label>
            <select className="input" value={tplForm.certificate_type} onChange={e => setTplForm(p => ({ ...p, certificate_type: e.target.value }))} required>
              {CERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">File (.docx or .pdf) *</label>
            <input type="file" accept=".docx,.pdf"
              onChange={e => setTplFile(e.target.files[0])}
              className="w-full text-sm text-gray-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 dark:file:bg-indigo-900/40 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/60 transition cursor-pointer"
              required />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setTplModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Uploading…' : 'Upload Template'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
