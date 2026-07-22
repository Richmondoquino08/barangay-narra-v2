import React, { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '../api/apiClient';
import { refDocsAPI } from '../api/apiClient';
import { useToast } from '../components/Toast';
import { useTheme, resolveAssetUrl } from '../contexts/ThemeContext';
import { Upload, Image, Palette, Building2, Save, RefreshCw, X, FileText, PenLine, Loader2, Download, Trash2, Plus, FolderOpen, ShieldCheck, Check } from 'lucide-react';
import { DEFAULT_ROLE_PERMISSIONS } from '../contexts/ThemeContext';

const FONT_SIZE_PX = { small:'13px', medium:'15px', large:'16px', xlarge:'18px' };
function applyFontPreview(size) {
  document.documentElement.style.fontSize = FONT_SIZE_PX[size] || '15px';
}

// ── Upload Zone ────────────────────────────────────────────────────────────
// uploadType: 'logo' | 'background' | 'login-bg'
// objectFit:  'contain' (logos) | 'cover' (backgrounds) — default 'cover'
function UploadZone({ label, icon: Icon, uploadType, currentUrl, onUploaded, onCleared,
  accept = 'image/*', hint, objectFit = 'cover' }) {
  const [dragging,     setDragging]     = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [clearing,     setClearing]     = useState(false);
  const [localPreview, setLocalPreview] = useState('');
  const [imgBroken,    setImgBroken]    = useState(false); // true when server URL returns 404/error
  const inputRef = useRef();
  const { toast } = useToast();

  // Reset broken state whenever currentUrl changes (new upload clears it)
  React.useEffect(() => { setImgBroken(false); }, [currentUrl]);

  const previewSrc = localPreview || resolveAssetUrl(currentUrl) || '';

  const type = uploadType || (label.toLowerCase().includes('logo') ? 'logo' : 'background');

  const doUpload = async (file) => {
    if (!file) return;
    // Instant local preview before the upload completes
    const reader = new FileReader();
    reader.onload = e => setLocalPreview(e.target.result);
    reader.readAsDataURL(file);

    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      const res = await apiClient.post(`/settings/upload/${type}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLocalPreview(''); // drop data URL — parent will provide server URL via currentUrl
      onUploaded(res.data.url);
      toast(`${label} updated!`, 'success');
    } catch {
      setLocalPreview('');
      toast('Upload failed — check file type/size.', 'error');
    } finally { setUploading(false); }
  };

  const doClear = async (e) => {
    e.stopPropagation();
    setClearing(true);
    try {
      await apiClient.post(`/settings/clear/${type}`);
      setLocalPreview('');
      onCleared();
      toast(`${label} removed`, 'success');
    } catch {
      toast('Failed to remove image', 'error');
    } finally { setClearing(false); }
  };

  const onDrop = e => { e.preventDefault(); setDragging(false); doUpload(e.dataTransfer.files[0]); };

  const fitClass = objectFit === 'contain' ? 'object-contain' : 'object-cover';

  return (
    <div className="space-y-2">
      {hint && <p className="text-xs text-gray-400 dark:text-slate-500">{hint}</p>}

      <div
        onClick={() => !uploading && !clearing && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-xl cursor-pointer transition overflow-hidden
          ${dragging
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500'}
          ${(previewSrc || imgBroken) ? 'h-44' : 'h-28'}`}
      >
        {previewSrc && !imgBroken ? (
          <>
            {/* checkerboard bg makes transparent logos visible */}
            <div className="absolute inset-0"
              style={{ backgroundImage: 'linear-gradient(45deg,#e5e7eb 25%,transparent 25%,transparent 75%,#e5e7eb 75%,#e5e7eb),linear-gradient(45deg,#e5e7eb 25%,white 25%,white 75%,#e5e7eb 75%,#e5e7eb)', backgroundSize:'16px 16px', backgroundPosition:'0 0, 8px 8px' }} />
            <img
              src={previewSrc}
              alt={label}
              className={`absolute inset-0 w-full h-full ${fitClass}`}
              onLoad={() => setImgBroken(false)}
              onError={() => { setLocalPreview(''); setImgBroken(true); }}
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition gap-1.5">
              {uploading
                ? <Loader2 size={22} className="text-white animate-spin"/>
                : <><Upload size={20} className="text-white drop-shadow"/><span className="text-white text-xs font-semibold drop-shadow">Click to replace</span></>
              }
            </div>
          </>
        ) : imgBroken ? (
          /* Image URL in DB but file missing/inaccessible — show clear error */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-rose-50 dark:bg-rose-900/20 select-none">
            <span className="text-2xl">⚠️</span>
            <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">Image file not found</p>
            <p className="text-[10px] text-rose-500 dark:text-rose-400 text-center px-4">
              The saved image no longer exists on the server.<br/>Click to upload a new one, or use the × to clear.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 select-none text-gray-400 dark:text-slate-500">
            {uploading
              ? <Loader2 size={24} className="text-indigo-500 animate-spin"/>
              : <>
                  <Upload size={22}/>
                  <span className="text-xs">Drag & drop or click to upload</span>
                  <span className="text-[10px] opacity-60">PNG, JPG, SVG, WebP</span>
                </>
            }
          </div>
        )}

        {/* Remove button — shown when image is set (even if broken) */}
        {(previewSrc || imgBroken) && (
          <button
            type="button"
            disabled={clearing}
            onClick={doClear}
            className="absolute top-2 right-2 w-7 h-7 bg-rose-600 hover:bg-rose-700 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-40 z-10 shadow"
            title="Remove image"
          >
            {clearing ? <Loader2 size={12} className="animate-spin"/> : <X size={13}/>}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={e => { if (e.target.files[0]) doUpload(e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
}

// ── Downloadable Reference Documents ──────────────────────────────────────
function RefDocSection() {
  const { toast } = useToast();
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [docName, setDocName]   = useState('');
  const [description, setDesc]  = useState('');
  const fileRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    try { setDocs((await refDocsAPI.getAll()).data.documents || []); }
    catch { toast('Failed to load documents', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(file) {
    if (!docName.trim()) { toast('Document name is required', 'warning'); return; }
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('doc_name', docName.trim());
    fd.append('description', description.trim());
    setUploading(true);
    try {
      await refDocsAPI.upload(fd);
      toast('Document uploaded', 'success');
      setDocName(''); setDesc(''); setShowForm(false);
      load();
    } catch { toast('Upload failed', 'error'); }
    finally { setUploading(false); }
  }

  async function handleDownload(doc) {
    try {
      const res = await refDocsAPI.download(doc.id);
      const ext = doc.file_path.split('.').pop();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `${doc.doc_name}.${ext}`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast('Download failed', 'error'); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this document?')) return;
    try { await refDocsAPI.delete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  const fmt = bytes => bytes ? (bytes < 1024*1024 ? `${(bytes/1024).toFixed(0)} KB` : `${(bytes/1024/1024).toFixed(1)} MB`) : '';

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <FolderOpen size={16} className="text-indigo-500"/> Downloadable Reference Documents
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Upload blank certificate forms, official templates, and reference files that staff can download anytime.
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={13}/> Upload Document
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="bg-gray-50 dark:bg-[#22263a] rounded-xl p-4 space-y-3 border border-gray-200 dark:border-[#2e334a]">
          <p className="text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">New Document</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Document Name *</label>
              <input className="input" value={docName} onChange={e => setDocName(e.target.value)}
                placeholder="e.g. Blank Residency Certificate Form"/>
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <input className="input" value={description} onChange={e => setDesc(e.target.value)}
                placeholder="e.g. Official fillable form"/>
            </div>
          </div>
          <div>
            <label className="label">File (PDF, DOCX, XLSX, image)</label>
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 dark:border-[#2e334a] rounded-xl h-20 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-indigo-300 transition">
              {uploading
                ? <Loader2 size={20} className="text-indigo-500 animate-spin"/>
                : <><Upload size={18} className="text-gray-400"/><span className="text-xs text-gray-400">Click to select file · max 20 MB</span></>}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg" className="hidden"
              onChange={e => { if (e.target.files[0]) handleUpload(e.target.files[0]); e.target.value = ''; }}/>
          </div>
          <div className="flex justify-end">
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="space-y-2">{[...Array(2)].map((_,i)=><div key={i} className="h-12 bg-gray-100 dark:bg-[#22263a] rounded-xl animate-pulse"/>)}</div>
      ) : docs.length === 0 ? (
        <div className="py-10 text-center text-gray-400 dark:text-slate-500">
          <FolderOpen size={32} className="mx-auto mb-2 opacity-30"/>
          <p className="text-sm">No reference documents yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id}
              className="flex items-center gap-3 bg-gray-50 dark:bg-[#22263a] rounded-xl px-4 py-3 border border-gray-100 dark:border-[#2e334a]">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                <FileText size={16} className="text-indigo-600 dark:text-indigo-400"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-slate-100 truncate">{doc.doc_name}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  {doc.description && <>{doc.description} · </>}
                  {fmt(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString('en-PH')}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => handleDownload(doc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition">
                  <Download size={12}/> Download
                </button>
                <button onClick={() => handleDelete(doc.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition">
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Settings page ─────────────────────────────────────────────────────
export default function Settings() {
  const { toast } = useToast();
  const { refreshSettings } = useTheme();

  const EMPTY = {
    barangay_name: '', address: '', captain: '', officials: '[]',
    primary_color: '#4F46E5',
    system_name:   'Barangay Management System',
    login_tagline: 'Official Records & Services Portal',
    signatory_name:  '',
    signatory_title: 'Punong Barangay',
    monthly_collection_target: '',
    province: '',
    city_municipality: '',
    secretary_name: '',
    secretary_title: 'Barangay Secretary',
    cert_validity: 'Valid for three (3) months only',
    treasurer_name: '',
    treasurer_title: 'Barangay Treasurer',
  };

  const [form,         setForm]         = useState(EMPTY);
  const [logoUrl,      setLogoUrl]      = useState('');
  const [bgUrl,        setBgUrl]        = useState('');
  const [loginBgUrl,   setLoginBgUrl]   = useState('');
  const [rightLogoUrl, setRightLogoUrl] = useState('');
  const [fontSize,     setFontSize]     = useState('medium');
  const [permissions,  setPermissions]  = useState(DEFAULT_ROLE_PERMISSIONS);
  const [internWriteAccess, setInternWriteAccess] = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [activeTab,    setActiveTab]    = useState('general');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    apiClient.get('/settings').then(res => {
      const d = res.data || {};
      setForm({
        barangay_name: d.barangay_name || '',
        address:       d.address       || '',
        captain:       d.captain       || '',
        officials:     typeof d.officials === 'string' ? d.officials : JSON.stringify(d.officials || []),
        primary_color: d.primary_color || '#4F46E5',
        system_name:   d.system_name   || 'Barangay Management System',
        login_tagline: d.login_tagline || 'Official Records & Services Portal',
        signatory_name:  d.signatory_name  || '',
        signatory_title: d.signatory_title || 'Punong Barangay',
        monthly_collection_target: d.monthly_collection_target || '',
        province:         d.province          || '',
        city_municipality:d.city_municipality || '',
        secretary_name:   d.secretary_name    || '',
        secretary_title:  d.secretary_title   || 'Barangay Secretary',
        cert_validity:    d.cert_validity     || 'Valid for three (3) months only',
        treasurer_name:   d.treasurer_name    || '',
        treasurer_title:  d.treasurer_title   || 'Barangay Treasurer',
      });
      if (d.role_permissions) {
        try {
          const perms = typeof d.role_permissions === 'string' ? JSON.parse(d.role_permissions) : d.role_permissions;
          setPermissions({ ...DEFAULT_ROLE_PERMISSIONS, ...perms });
        } catch (_) {}
      }
      setLogoUrl(d.logo_url           || '');
      setBgUrl(d.background_url       || '');
      setLoginBgUrl(d.login_bg_url    || '');
      setRightLogoUrl(d.right_logo_url || '');
      setFontSize(d.font_size      || 'medium');
      setInternWriteAccess(!!d.intern_write_access);
    })
    .catch(() => toast('Failed to load settings', 'error'))
    .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    // Validate officials JSON before saving
    try { JSON.parse(form.officials); } catch {
      toast('Officials field is not valid JSON. Fix it before saving.', 'error');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/settings', {
        ...form,
        logo_url:         logoUrl,
        background_url:   bgUrl,
        login_bg_url:     loginBgUrl,
        right_logo_url:   rightLogoUrl,
        font_size:        fontSize,
        role_permissions: JSON.stringify(permissions),
        intern_write_access: internWriteAccess,
      });
      await refreshSettings();
      toast('Settings saved successfully!', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="text-indigo-500 animate-spin"/>
    </div>
  );

  const COLORS = ['#4F46E5','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6'];
  const TABS = [
    { id: 'general',    label: 'General' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'reports',    label: 'Reports & Certificates' },
    { id: 'access',     label: 'Access Control' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Building2 size={22} className="text-indigo-600"/> Barangay Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Configure barangay information, branding, and document settings
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-[#2e334a] gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition
              ${activeTab === t.id
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── GENERAL TAB ───────────────────────────────────────────── */}
        {activeTab === 'general' && (
          <div className="card p-6 space-y-5">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Building2 size={16} className="text-indigo-500"/> Barangay Information
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Province</label>
                <input className="input" value={form.province}
                  onChange={e => set('province', e.target.value)} placeholder="e.g. Laguna"/>
              </div>
              <div>
                <label className="label">City / Municipality</label>
                <input className="input" value={form.city_municipality}
                  onChange={e => set('city_municipality', e.target.value)} placeholder="e.g. San Pedro City"/>
              </div>
            </div>

            <div>
              <label className="label">Barangay Name *</label>
              <input className="input" value={form.barangay_name}
                onChange={e => set('barangay_name', e.target.value)} required
                placeholder="e.g. Barangay Narra"/>
            </div>

            <div>
              <label className="label">Complete Address</label>
              <textarea className="input resize-none" rows={2} value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="Street, Municipality, Province"/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Punong Barangay</label>
                <input className="input" value={form.captain}
                  onChange={e => set('captain', e.target.value)} placeholder="Full name"/>
              </div>
              <div>
                <label className="label">Monthly Collection Target (₱)</label>
                <input type="number" min="0" step="0.01" className="input"
                  value={form.monthly_collection_target}
                  onChange={e => set('monthly_collection_target', e.target.value)}
                  placeholder="0.00"/>
              </div>
            </div>

            <div>
              <label className="label">Barangay Officials <span className="text-gray-400 font-normal">(JSON array)</span></label>
              <textarea className="input resize-none font-mono text-xs" rows={3}
                value={form.officials} onChange={e => set('officials', e.target.value)}
                placeholder='["Kagawad Juan Santos", "Kagawad Maria Reyes"]'/>
              <p className="text-xs text-gray-400 mt-1">JSON array of official names. Must be valid JSON.</p>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Login Page Text</h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="label">System Name</label>
                  <input className="input" value={form.system_name}
                    onChange={e => set('system_name', e.target.value)}
                    placeholder="Barangay Management System"/>
                </div>
                <div>
                  <label className="label">Login Tagline</label>
                  <input className="input" value={form.login_tagline}
                    onChange={e => set('login_tagline', e.target.value)}
                    placeholder="Official Records & Services Portal"/>
                </div>
              </div>

              {/* Live login preview */}
              <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="bg-indigo-900 px-4 py-3 text-center">
                  <p className="text-white font-bold text-sm">{form.barangay_name || 'Barangay Name'}</p>
                  <p className="text-indigo-300 text-xs mt-0.5">{form.system_name || 'System Name'}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 px-4 py-3">
                  <p className="text-gray-800 dark:text-gray-200 font-bold text-sm">Welcome back</p>
                  <p className="text-gray-400 text-xs mt-0.5">{form.login_tagline || 'Tagline here'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 px-3 py-1 text-center">
                  <p className="text-[9px] text-gray-400">Login page preview</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── APPEARANCE TAB ────────────────────────────────────────── */}
        {activeTab === 'appearance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Logo */}
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Image size={16} className="text-indigo-500"/> Logo
              </h3>
              <UploadZone
                label="Barangay Logo"
                icon={Image}
                uploadType="logo"
                objectFit="contain"
                currentUrl={logoUrl}
                onUploaded={url => { setLogoUrl(url); refreshSettings(); }}
                onCleared={() => { setLogoUrl(''); refreshSettings(); }}
                hint="PNG or SVG recommended. Transparent background works best."
              />
            </div>

            {/* App Background */}
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Image size={16} className="text-indigo-500"/> App Background
              </h3>
              <UploadZone
                label="App Background"
                icon={Upload}
                uploadType="background"
                currentUrl={bgUrl}
                onUploaded={url => { setBgUrl(url); refreshSettings(); }}
                onCleared={() => { setBgUrl(''); refreshSettings(); }}
                hint="Applies to all pages after login. Use a subtle texture."
              />
            </div>

            {/* Right Seal */}
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Image size={16} className="text-emerald-500"/> City / Municipality Seal (Right)
              </h3>
              <UploadZone
                label="Right Seal / Logo"
                icon={Image}
                uploadType="right-logo"
                objectFit="contain"
                currentUrl={rightLogoUrl}
                onUploaded={url => { setRightLogoUrl(url); refreshSettings(); }}
                onCleared={() => { setRightLogoUrl(''); refreshSettings(); }}
                hint="Appears on the right side of certificate headers (e.g. City/Municipality seal). PNG recommended."
              />
            </div>

            {/* Login Background */}
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Image size={16} className="text-rose-500"/> Login Page Background
              </h3>
              <UploadZone
                label="Login Page Background"
                icon={Upload}
                uploadType="login-bg"
                currentUrl={loginBgUrl}
                onUploaded={url => { setLoginBgUrl(url); refreshSettings(); }}
                onCleared={() => { setLoginBgUrl(''); refreshSettings(); }}
                hint="Replaces the default dark gradient on the login screen."
              />
              {loginBgUrl && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>
                  Login background is active
                </p>
              )}
            </div>

            {/* Font Size */}
            <div className="card p-5 lg:col-span-2">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
                <span className="text-indigo-500 font-bold text-base w-4 h-4 flex items-center justify-center">Aa</span> Font Size
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { value:'small',  label:'Small',       px:'13px' },
                  { value:'medium', label:'Medium',      px:'15px' },
                  { value:'large',  label:'Large',       px:'16px' },
                  { value:'xlarge', label:'Extra Large', px:'18px' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => { setFontSize(opt.value); applyFontPreview(opt.value); }}
                    style={{ fontSize: opt.px }}
                    className={`rounded-xl border-2 p-3 text-center transition
                      ${fontSize === opt.value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-[#2e334a] hover:border-indigo-300'}`}>
                    <p className={`font-semibold ${fontSize === opt.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-slate-200'}`}>
                      Aa
                    </p>
                    <p style={{ fontSize:'11px' }} className="text-gray-500 dark:text-slate-400 mt-1">{opt.label}</p>
                    <p style={{ fontSize:'10px' }} className="text-gray-400 dark:text-slate-500">{opt.px}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                Scales all text in the system. Takes effect immediately — save to persist.
              </p>
            </div>

            {/* Accent color */}
            <div className="card p-5 lg:col-span-2">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
                <Palette size={16} className="text-indigo-500"/> Accent Color
              </h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('primary_color', c)}
                    className={`w-8 h-8 rounded-xl transition border-2 ${form.primary_color === c ? 'scale-110 border-gray-800 dark:border-white shadow-md' : 'border-transparent hover:scale-105'}`}
                    style={{ background: c }} title={c}/>
                ))}
              </div>
              <div className="flex items-center gap-3 max-w-xs">
                <input type="color" value={form.primary_color} onChange={e => set('primary_color', e.target.value)}
                  className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-600 cursor-pointer bg-transparent p-0.5"/>
                <input className="input" value={form.primary_color} onChange={e => set('primary_color', e.target.value)}
                  placeholder="#4F46E5" maxLength={7}/>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Note: accent color changes require a page refresh to take full effect.
              </p>
            </div>

            {/* Uploaded Images Library */}
            <div className="card p-5 lg:col-span-2">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-1">
                <Image size={16} className="text-indigo-500"/> Uploaded Images Library
              </h3>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
                All images currently in use across the system. Click any to preview in full. Upload or replace using the slots above.
              </p>
              {(() => {
                const imgs = [
                  { label: 'Barangay Logo',           url: logoUrl        },
                  { label: 'App Background',           url: bgUrl          },
                  { label: 'City / Municipality Seal', url: rightLogoUrl   },
                  { label: 'Login Page Background',    url: loginBgUrl     },
                ].filter(img => img.url);
                if (imgs.length === 0) return (
                  <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">
                    No images uploaded yet. Use the slots above to upload.
                  </p>
                );
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {imgs.map(img => (
                      <a key={img.label} href={resolveAssetUrl(img.url)} target="_blank" rel="noopener noreferrer"
                        title={`Preview: ${img.label}`}
                        className="group rounded-xl border border-gray-200 dark:border-[#2e334a] overflow-hidden bg-gray-50 dark:bg-[#22263a] hover:border-indigo-400 hover:shadow-md transition cursor-pointer">
                        {/* Checkerboard so transparent logos are visible */}
                        <div className="relative h-24"
                          style={{ backgroundImage: 'linear-gradient(45deg,#e5e7eb 25%,transparent 25%,transparent 75%,#e5e7eb 75%,#e5e7eb),linear-gradient(45deg,#e5e7eb 25%,white 25%,white 75%,#e5e7eb 75%,#e5e7eb)', backgroundSize:'12px 12px', backgroundPosition:'0 0,6px 6px' }}>
                          <img src={resolveAssetUrl(img.url)} alt={img.label}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"/>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition"/>
                        </div>
                        <p className="text-xs text-center py-2 text-gray-600 dark:text-slate-300 font-medium truncate px-2">{img.label}</p>
                      </a>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── REPORTS & CERTIFICATES TAB ────────────────────────────── */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Signatory */}
            <div className="card p-6 space-y-5">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <PenLine size={16} className="text-indigo-500"/> Document Signatory
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 -mt-3">
                This name and title appear at the bottom of all printed certificates and reports.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Signatory Full Name</label>
                  <input className="input" value={form.signatory_name}
                    onChange={e => set('signatory_name', e.target.value)}
                    placeholder="e.g. Juan Dela Cruz"/>
                  <p className="text-xs text-gray-400 mt-1">Leave blank to use the Punong Barangay field.</p>
                </div>
                <div>
                  <label className="label">Signatory Title / Position</label>
                  <input className="input" value={form.signatory_title}
                    onChange={e => set('signatory_title', e.target.value)}
                    placeholder="Punong Barangay"/>
                </div>
              </div>
            </div>

            {/* Second Signatory (Secretary) */}
            <div className="card p-6 space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <PenLine size={16} className="text-emerald-500"/> Second Signatory (By Authority)
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 -mt-3">
                Appears below the Punong Barangay — typically the Barangay Secretary signing "By Authority."
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Secretary / By Authority Name</label>
                  <input className="input" value={form.secretary_name}
                    onChange={e => set('secretary_name', e.target.value)}
                    placeholder="e.g. Maria Santos"/>
                </div>
                <div>
                  <label className="label">Title</label>
                  <input className="input" value={form.secretary_title}
                    onChange={e => set('secretary_title', e.target.value)}
                    placeholder="Barangay Secretary / By Authority"/>
                </div>
              </div>
              <div>
                <label className="label">Certificate Validity Note</label>
                <input className="input" value={form.cert_validity}
                  onChange={e => set('cert_validity', e.target.value)}
                  placeholder="Valid for three (3) months only"/>
                <p className="text-xs text-gray-400 mt-1">Shown at the bottom of all certificates (e.g. "Valid for three (3) months only").</p>
              </div>
            </div>

            {/* Treasurer — used as cheque signatory */}
            <div className="card p-6 space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <PenLine size={16} className="text-amber-500"/> Barangay Treasurer (Cheque Signatory)
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 -mt-3">
                Used as a quick-fill suggestion in the Cheque Printing module.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Treasurer Full Name</label>
                  <input className="input" value={form.treasurer_name}
                    onChange={e => set('treasurer_name', e.target.value)}
                    placeholder="e.g.  T. Juan Dela Cruz"/>
                </div>
                <div>
                  <label className="label">Title</label>
                  <input className="input" value={form.treasurer_title}
                    onChange={e => set('treasurer_title', e.target.value)}
                    placeholder="Barangay Treasurer"/>
                </div>
              </div>
            </div>

            {/* Report Header Preview */}
            <div className="card p-6 space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <FileText size={16} className="text-indigo-500"/> Report / Certificate Header Preview
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 -mt-3">
                This is how your header will look on printed reports and certificates.
              </p>

              {/* Live print preview */}
              <div className="border-2 border-dashed border-gray-200 dark:border-[#2e334a] rounded-xl overflow-hidden">
                <div className="bg-white p-6 font-sans" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {/* Header */}
                  <div className="flex items-center gap-4 border-b-2 border-gray-800 pb-3 mb-3">
                    {logoUrl && (
                      <img src={resolveAssetUrl(logoUrl)}
                        alt="Logo" className="w-16 h-16 object-contain flex-shrink-0"/>
                    )}
                    <div className="text-center flex-1">
                      <p className="text-xs text-gray-600">Republic of the Philippines</p>
                      <p className="font-bold text-base text-gray-900">{form.barangay_name || 'BARANGAY NAME'}</p>
                      <p className="text-xs text-gray-600">{form.address || 'Address, Municipality, Province'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Office of the Punong Barangay</p>
                    </div>
                    {logoUrl && <div className="w-16 h-16 flex-shrink-0"/>}
                  </div>

                  {/* Certificate title placeholder */}
                  <div className="text-center py-2">
                    <p className="font-bold text-sm tracking-widest text-gray-700 uppercase">[ CERTIFICATE TYPE ]</p>
                  </div>

                  {/* Body placeholder */}
                  <div className="my-4 space-y-1.5">
                    <div className="h-2 bg-gray-100 rounded w-full"/>
                    <div className="h-2 bg-gray-100 rounded w-5/6"/>
                    <div className="h-2 bg-gray-100 rounded w-4/6"/>
                  </div>

                  {/* Signature */}
                  <div className="mt-8 text-right text-xs">
                    <p className="inline-block text-center">
                      <span className="block font-bold text-sm border-t border-gray-800 pt-1 min-w-[180px]">
                        {form.signatory_name || form.captain || 'SIGNATORY NAME'}
                      </span>
                      <span className="block text-gray-600 uppercase text-[10px] tracking-wide">
                        {form.signatory_title || 'Punong Barangay'}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-[#22263a] px-4 py-1.5 text-center">
                  <p className="text-[10px] text-gray-400">Print preview — actual output may vary slightly</p>
                </div>
              </div>
            </div>

            {/* Downloadable Reference Documents */}
            <RefDocSection/>
          </div>
        )}

        {/* ── ACCESS CONTROL TAB ───────────────────────────────────── */}
        {activeTab === 'access' && (() => {
          const MODULES = [
            { section: 'Records', items: [
              { key: 'residents',     label: 'Residents' },
              { key: 'certificates',  label: 'Certificates' },
              { key: 'verify_certificate', label: 'Verify Certificate' },
              { key: 'blotter',       label: 'Blotter' },
            ]},
            { section: 'Finance — Overview', items: [
              { key: 'finance',       label: 'Finance Overview' },
              { key: 'cheque_print',  label: 'Cheque Print' },
              { key: 'reports',       label: 'Reports' },
            ]},
            { section: 'Finance — Forms (Secretary + Treasurer)', items: [
              { key: 'fin_brgy_id',   label: 'Barangay ID' },
              { key: 'fin_kidlat',    label: 'KIDLAT Members' },
              { key: 'fin_trip',      label: 'Trip Ticket' },
              { key: 'fin_pr',        label: 'Purchase Request' },
              { key: 'fin_ris',       label: 'Requisition & Issue' },
              { key: 'fin_transmittal', label: 'Transmittal Letter' },
            ]},
            { section: 'Finance — Treasurer Only', items: [
              { key: 'fin_pcf',       label: 'Petty Cash Fund' },
              { key: 'fin_sppcv',     label: 'Petty Cash Vouchers' },
              { key: 'fin_rao',       label: 'RAO (Obligations)' },
              { key: 'fin_obr',       label: 'Obligation Request' },
              { key: 'fin_po',        label: 'Purchase Order' },
              { key: 'fin_iar',       label: 'Inspection & Acceptance' },
              { key: 'fin_dv',        label: 'Disbursement Voucher' },
              { key: 'fin_crdr',      label: 'CRDR (Cashbook)' },
              { key: 'fin_chbr',      label: 'Cash in Bank (CHBR)' },
              { key: 'fin_checks',    label: 'Checks Issued (SCkI)' },
              { key: 'fin_collections', label: 'Itemized Collections' },
            ]},
            { section: 'Infrastructure', items: [
              { key: 'officials',     label: 'Officials' },
              { key: 'projects',      label: 'Projects' },
              { key: 'assets',        label: 'Assets' },
            ]},
            { section: 'Social Services', items: [
              { key: 'social',        label: 'Social Programs' },
              { key: 'bdrrm',         label: 'BDRRM' },
            ]},
            { section: 'Communication', items: [
              { key: 'announcements', label: 'Announcements' },
              { key: 'documents',     label: 'Documents' },
              { key: 'trash',         label: 'Trash' },
            ]},
          ];
          const ROLES = [
            { key: 'captain',   label: 'Captain',   color: 'indigo' },
            { key: 'secretary', label: 'Secretary', color: 'emerald' },
            { key: 'treasurer', label: 'Treasurer', color: 'amber' },
            { key: 'intern',    label: 'Intern',    color: 'rose' },
          ];

          const toggle = (role, moduleKey) => {
            setPermissions(prev => {
              const cur = prev[role] || [];
              const next = cur.includes(moduleKey)
                ? cur.filter(k => k !== moduleKey)
                : [...cur, moduleKey];
              return { ...prev, [role]: next };
            });
          };

          const allChecked = (role, items) => items.every(m => (permissions[role]||[]).includes(m.key));
          const toggleAll  = (role, items) => {
            const all = allChecked(role, items);
            setPermissions(prev => {
              const cur = prev[role] || [];
              const keys = items.map(m => m.key);
              const next = all ? cur.filter(k => !keys.includes(k)) : [...new Set([...cur, ...keys])];
              return { ...prev, [role]: next };
            });
          };

          return (
            <div className="space-y-5">
              <div className="card p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-rose-500"/>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">Intern Write Access</h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        Interns can always view the modules below. When <strong>off</strong> (default), they cannot create, edit, approve, or delete anything. Turn <strong>on</strong> to let them edit data too, same as a regular user of that module.
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setInternWriteAccess(v => !v)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${internWriteAccess ? 'bg-rose-500' : 'bg-gray-300 dark:bg-[#2e334a]'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${internWriteAccess ? 'translate-x-6' : 'translate-x-1'}`}/>
                  </button>
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck size={16} className="text-indigo-500"/>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">Module Access per Role</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
                  Control which modules each role can access. Admin always has full access.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-[#2e334a]">
                        <th className="text-left py-2 pr-4 text-gray-500 dark:text-slate-400 font-medium w-48">Module</th>
                        {/* Admin column — always locked */}
                        <th className="text-center py-2 px-4">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-semibold text-gray-400 dark:text-slate-500">Admin</span>
                            <span className="text-[10px] text-gray-300 dark:text-slate-600">Always ✓</span>
                          </div>
                        </th>
                        {ROLES.map(r => (
                          <th key={r.key} className="text-center py-2 px-4">
                            <span className={`font-semibold text-${r.color}-600 dark:text-${r.color}-400`}>{r.label}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map(group => (
                        <React.Fragment key={group.section}>
                          {/* Section header row */}
                          <tr>
                            <td colSpan={6} className="pt-4 pb-1">
                              <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">
                                {group.section}
                              </span>
                            </td>
                          </tr>
                          {/* Toggle-all row */}
                          <tr className="border-b border-gray-50 dark:border-[#2e334a]/50 bg-gray-50/50 dark:bg-[#1e2233]/30">
                            <td className="py-1.5 pr-4 pl-2 text-xs text-gray-400 dark:text-slate-500 italic">Toggle all</td>
                            <td className="text-center py-1.5"/>
                            {ROLES.map(r => (
                              <td key={r.key} className="text-center py-1.5 px-4">
                                <button type="button" onClick={() => toggleAll(r.key, group.items)}
                                  className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-[#2e334a] hover:border-indigo-400 text-gray-400 dark:text-slate-500 hover:text-indigo-600 transition">
                                  {allChecked(r.key, group.items) ? 'Uncheck all' : 'Check all'}
                                </button>
                              </td>
                            ))}
                          </tr>
                          {/* Module rows */}
                          {group.items.map(mod => (
                            <tr key={mod.key} className="border-b border-gray-50 dark:border-[#2e334a]/40 hover:bg-gray-50 dark:hover:bg-[#22263a] transition-colors">
                              <td className="py-2.5 pr-4 pl-2 font-medium text-gray-700 dark:text-slate-200">{mod.label}</td>
                              {/* Admin — locked checked */}
                              <td className="text-center py-2.5 px-4">
                                <div className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 dark:bg-[#2e334a] opacity-50" title="Admin always has access">
                                  <Check size={12} className="text-gray-400"/>
                                </div>
                              </td>
                              {ROLES.map(r => {
                                const checked = (permissions[r.key] || []).includes(mod.key);
                                return (
                                  <td key={r.key} className="text-center py-2.5 px-4">
                                    <button type="button"
                                      onClick={() => toggle(r.key, mod.key)}
                                      className={`inline-flex items-center justify-center w-5 h-5 rounded transition
                                        ${checked
                                          ? `bg-${r.color}-100 dark:bg-${r.color}-900/30 border-2 border-${r.color}-500`
                                          : 'border-2 border-gray-200 dark:border-[#2e334a] hover:border-gray-400'}`}>
                                      {checked && <Check size={11} className={`text-${r.color}-600 dark:text-${r.color}-400`}/>}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-gray-400 dark:text-slate-500 mt-4">
                  Dashboard is always accessible to all roles. Changes take effect after saving and the user's next page load.
                </p>
              </div>
            </div>
          );
        })()}

        {/* ── Save bar (always visible) ─────────────────────────────── */}
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-[#2e334a]">
          <button type="button" onClick={() => window.location.reload()}
            className="btn-secondary flex items-center gap-1.5">
            <RefreshCw size={14}/> Reset
          </button>
          <button type="submit" disabled={saving}
            className="btn-primary flex items-center gap-1.5 min-w-[130px] justify-center">
            {saving
              ? <><Loader2 size={14} className="animate-spin"/> Saving…</>
              : <><Save size={14}/> Save Settings</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
