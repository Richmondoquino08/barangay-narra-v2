import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/apiClient';
import { useToast } from '../components/Toast';
import { useTheme } from '../contexts/ThemeContext';
import { Upload, Image, Palette, Building2, Save, RefreshCw, X } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000';

function UploadZone({ label, icon: Icon, currentUrl, onUploaded, accept = 'image/*', hint }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || '');
  const inputRef = useRef();
  const { toast } = useToast();

  useEffect(() => { setPreview(currentUrl || ''); }, [currentUrl]);

  const doUpload = async (file) => {
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    setUploading(true);
    // local preview
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(file);
    try {
      const type = label.toLowerCase().includes('logo') ? 'logo' : 'background';
      const res = await apiClient.post(`/settings/upload/${type}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast(`${label} uploaded!`, 'success');
      onUploaded(res.data.url);
    } catch { toast('Upload failed', 'error'); }
    finally { setUploading(false); }
  };

  const onDrop = (e) => { e.preventDefault(); setDragging(false); doUpload(e.dataTransfer.files[0]); };

  return (
    <div className="space-y-2">
      <label className="label flex items-center gap-1.5"><Icon size={14}/>{label}</label>
      {hint && <p className="text-xs text-gray-400 -mt-1">{hint}</p>}

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-xl cursor-pointer transition overflow-hidden
          ${dragging ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500'}
          ${preview ? 'h-36' : 'h-24'}`}
      >
        {preview ? (
          <>
            <img src={preview.startsWith('data:') ? preview : `${API}${preview}`} alt={label}
              className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition">
              <Upload size={20} className="text-white mb-1"/>
              <span className="text-white text-xs font-medium">Click to replace</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1.5">
            {uploading
              ? <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
              : <><Upload size={20} className="text-gray-400"/><span className="text-xs text-gray-400">Drag & drop or click to upload</span></>
            }
          </div>
        )}
        {preview && (
          <button type="button" onClick={e => { e.stopPropagation(); setPreview(''); onUploaded(''); }}
            className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition">
            <X size={12}/>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => doUpload(e.target.files[0])} />
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const { refreshSettings } = useTheme();
  const [form, setForm] = useState({
    barangay_name: '', address: '', captain: '', officials: '',
    primary_color: '#4F46E5',
    system_name:   'Barangay Management System',
    login_tagline: 'Official Records & Services Portal',
  });
  const [logoUrl, setLogoUrl] = useState('');
  const [bgUrl, setBgUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    apiClient.get('/settings').then(res => {
      const d = res.data || {};
      setForm({
        barangay_name:  d.barangay_name  || '',
        address:        d.address        || '',
        captain:        d.captain        || '',
        officials:      typeof d.officials === 'string' ? d.officials : JSON.stringify(d.officials || []),
        primary_color:  d.primary_color  || '#4F46E5',
        system_name:    d.system_name    || 'Barangay Management System',
        login_tagline:  d.login_tagline  || 'Official Records & Services Portal',
      });
      setLogoUrl(d.logo_url || '');
      setBgUrl(d.background_url || '');
    }).catch(() => toast('Failed to load settings', 'error'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/settings', form);
      await refreshSettings();
      toast('Settings saved!', 'success');
    } catch { toast('Save failed', 'error'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading settings…</div>;

  const COLORS = ['#4F46E5','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Building2 size={22} className="text-indigo-600"/> Barangay Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Customize how the system looks and what information is displayed</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Appearance ── */}
        <div className="space-y-5">
          {/* Logo */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2"><Image size={16} className="text-indigo-500"/>Logo</h3>
            <UploadZone
              label="Barangay Logo"
              icon={Image}
              currentUrl={logoUrl}
              onUploaded={url => { setLogoUrl(url); refreshSettings(); }}
              hint="Shown in sidebar header. PNG/SVG recommended."
            />
          </div>

          {/* Background */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2"><Image size={16} className="text-indigo-500"/>Background</h3>
            <UploadZone
              label="Page Background"
              icon={Upload}
              currentUrl={bgUrl}
              onUploaded={url => { setBgUrl(url); refreshSettings(); }}
              hint="Applied across all pages. Use a subtle texture or pattern."
            />
          </div>

          {/* Color */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2"><Palette size={16} className="text-indigo-500"/>Accent Color</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => set('primary_color', c)}
                  className={`w-7 h-7 rounded-lg transition border-2 ${form.primary_color === c ? 'scale-110 border-gray-800 dark:border-white' : 'border-transparent hover:scale-105'}`}
                  style={{ background: c }} title={c} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={form.primary_color} onChange={e => set('primary_color', e.target.value)}
                className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer bg-transparent p-0.5" />
              <input className="input flex-1" value={form.primary_color} onChange={e => set('primary_color', e.target.value)}
                placeholder="#4F46E5" maxLength={7} />
            </div>
          </div>
        </div>

        {/* ── Right: Info form ── */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="card p-6 space-y-5">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
              <Building2 size={16} className="text-indigo-500"/> Barangay Information
            </h3>

            <div>
              <label className="label">Barangay Name *</label>
              <input className="input" value={form.barangay_name} onChange={e => set('barangay_name', e.target.value)} required placeholder="e.g. Barangay Narra"/>
            </div>

            <div>
              <label className="label">Complete Address</label>
              <textarea className="input resize-none" rows={2} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Municipality, Province"/>
            </div>

            <div>
              <label className="label">Barangay Captain</label>
              <input className="input" value={form.captain} onChange={e => set('captain', e.target.value)} placeholder="Full name"/>
            </div>

            <div>
              <label className="label">Barangay Officials (JSON array)</label>
              <textarea className="input resize-none font-mono text-xs" rows={3} value={form.officials}
                onChange={e => set('officials', e.target.value)}
                placeholder={'["Kagawad Juan Santos", "Kagawad Maria Reyes"]'}/>
              <p className="text-xs text-gray-400 mt-1">Enter as a JSON array, one name per entry.</p>
            </div>

            {/* ── Login Page Customization ── */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">L</span>
                Login Page Text
              </h4>
              <p className="text-xs text-gray-400 mb-3">These appear on the login screen that users see before signing in.</p>

              <div className="space-y-3">
                <div>
                  <label className="label">System Name <span className="text-gray-400 font-normal">(subtitle under barangay name)</span></label>
                  <input className="input" value={form.system_name}
                    onChange={e => set('system_name', e.target.value)}
                    placeholder="Barangay Management System" />
                </div>

                <div>
                  <label className="label">Login Tagline <span className="text-gray-400 font-normal">(shown inside the card)</span></label>
                  <input className="input" value={form.login_tagline}
                    onChange={e => set('login_tagline', e.target.value)}
                    placeholder="Official Records & Services Portal" />
                </div>
              </div>

              {/* Live preview */}
              <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="bg-indigo-900 px-4 py-3 text-center">
                  <p className="text-white font-bold text-sm">{form.barangay_name || 'Barangay Name'}</p>
                  <p className="text-indigo-300 text-xs mt-0.5">{form.system_name || 'System Name'}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 px-4 py-3">
                  <p className="text-gray-800 dark:text-gray-200 font-bold text-sm">Welcome back</p>
                  <p className="text-gray-400 text-xs mt-0.5">{form.login_tagline || 'Tagline here'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 px-3 py-1.5 text-center">
                  <p className="text-[9px] text-gray-400">Login page preview</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-3 justify-end">
              <button type="button" onClick={() => window.location.reload()} className="btn-secondary flex items-center gap-1.5">
                <RefreshCw size={14}/> Reset
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-1.5">
                <Save size={14}/> {saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
