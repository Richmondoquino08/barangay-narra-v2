import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { residentsAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Users, Plus, Search, Download, Upload, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, Filter, X, FileText, CheckCircle, AlertTriangle, Loader2,
  Camera, UserCircle } from 'lucide-react';

// ── Simple CSV parser (handles quoted fields) ─────────────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  function splitLine(line) {
    const vals = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    vals.push(cur.trim());
    return vals;
  }

  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const vals = splitLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  }).filter(r => Object.values(r).some(v => v !== ''));

  return { headers, rows };
}

// ── Import Modal ───────────────────────────────────────────────────────────
function ImportModal({ open, onClose, onDone }) {
  const { toast } = useToast();
  const fileRef = useRef();
  const [step, setStep]         = useState('upload'); // upload | preview | result
  const [parsed, setParsed]     = useState({ headers: [], rows: [] });
  const [importing, setImporting] = useState(false);
  const [result, setResult]     = useState(null);
  const [dragOver, setDragOver] = useState(false);

  function reset() { setStep('upload'); setParsed({ headers:[], rows:[] }); setResult(null); }

  function handleClose() { reset(); onClose(); }

  function readFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv','txt'].includes(ext)) {
      toast('Please upload a CSV file (.csv)', 'error'); return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const { headers, rows } = parseCSV(e.target.result);
      if (rows.length === 0) { toast('No data rows found in file', 'error'); return; }
      setParsed({ headers, rows });
      setStep('preview');
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setImporting(true);
    try {
      const res = await residentsAPI.importResidents(parsed.rows);
      setResult(res.data);
      setStep('result');
      if (res.data.imported > 0) onDone();
    } catch (err) {
      toast(err.response?.data?.message || 'Import failed', 'error');
    } finally { setImporting(false); }
  }

  async function downloadTemplate() {
    try {
      const res = await residentsAPI.downloadTemplate();
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'residents_import_template.csv'; a.click();
    } catch { toast('Failed to download template', 'error'); }
  }

  const PREVIEW_COLS = ['first_name','last_name','gender','birth_date','address','purok','civil_status'];

  return (
    <Modal open={open} onClose={handleClose} title="Import Residents" size="xl">
      {/* Step tabs */}
      <div className="flex gap-1 mb-5">
        {[['upload','1. Upload'],['preview','2. Preview'],['result','3. Result']].map(([id,label],idx) => (
          <div key={id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            ${step === id ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-[#22263a] text-gray-400 dark:text-slate-500'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
              ${step === id ? 'bg-white/30 text-white' : 'bg-gray-200 dark:bg-[#2e334a] text-gray-500 dark:text-slate-400'}`}>
              {idx+1}
            </span>
            {label.split('. ')[1]}
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload ─────────────────────────────────────────── */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Download CSV Template</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                Get the correct column format before uploading
              </p>
            </div>
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition">
              <Download size={13}/> Template
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); readFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl h-44 flex flex-col items-center justify-center gap-3 cursor-pointer transition
              ${dragOver
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-200 dark:border-[#2e334a] hover:border-indigo-300 dark:hover:border-indigo-700 bg-gray-50 dark:bg-[#22263a]'}`}>
            <Upload size={28} className="text-gray-400 dark:text-slate-500"/>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200">Click or drag & drop a CSV file</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Supports .csv format · Max 5MB</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
              onChange={e => readFile(e.target.files[0])}/>
          </div>

          {/* Required columns */}
          <div className="bg-gray-50 dark:bg-[#22263a] rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-slate-300 mb-2">Required columns</p>
            <div className="flex flex-wrap gap-1.5">
              {['first_name','last_name','gender','birth_date','address','civil_status'].map(c => (
                <span key={c} className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-[10px] font-mono rounded">{c}</span>
              ))}
            </div>
            <p className="text-xs font-semibold text-gray-600 dark:text-slate-300 mt-2.5 mb-2">Optional columns</p>
            <div className="flex flex-wrap gap-1.5">
              {['middle_name','purok','contact_number','occupation','email','nationality','religion','educational_attainment','philhealth_number','voter_status','senior_citizen','is_pwd','is_4ps'].map(c => (
                <span key={c} className="px-2 py-0.5 bg-gray-200 dark:bg-[#2e334a] text-gray-600 dark:text-slate-400 text-[10px] font-mono rounded">{c}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Preview ────────────────────────────────────────── */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              <span className="font-bold text-gray-900 dark:text-slate-100">{parsed.rows.length}</span> rows detected
              · Showing first 10
            </p>
            <button onClick={reset} className="text-xs text-rose-600 hover:underline flex items-center gap-1">
              <X size={12}/> Choose different file
            </button>
          </div>

          {/* Preview table */}
          <div className="overflow-auto rounded-xl border border-gray-100 dark:border-[#2e334a] max-h-64">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a] sticky top-0">
                  <th className="table-th">#</th>
                  {PREVIEW_COLS.map(h => <th key={h} className="table-th font-mono">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
                {parsed.rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                    <td className="table-td text-gray-400">{i+1}</td>
                    {PREVIEW_COLS.map(h => (
                      <td key={h} className="table-td max-w-[120px] truncate" title={row[h]}>
                        {row[h] || <span className="text-gray-300 dark:text-slate-600 italic">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsed.rows.length > 10 && (
            <p className="text-xs text-gray-400 text-center">
              +{parsed.rows.length - 10} more rows not shown
            </p>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button onClick={reset} className="btn-secondary">Back</button>
            <button onClick={handleImport} disabled={importing}
              className="btn-primary flex items-center gap-2 min-w-[140px] justify-center">
              {importing
                ? <><Loader2 size={14} className="animate-spin"/> Importing…</>
                : <><Upload size={14}/> Import {parsed.rows.length} Residents</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Result ─────────────────────────────────────────── */}
      {step === 'result' && result && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 dark:bg-[#22263a] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-800 dark:text-slate-100">{result.total}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Total Rows</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{result.imported}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Imported</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{result.errors?.length || 0}</p>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">Errors</p>
            </div>
          </div>

          {result.imported > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 text-emerald-700 dark:text-emerald-300 text-sm">
              <CheckCircle size={16} className="flex-shrink-0"/>
              <span>{result.imported} resident{result.imported !== 1 ? 's' : ''} successfully imported to the registry.</span>
            </div>
          )}

          {/* Errors list */}
          {result.errors?.length > 0 && (
            <div className="border border-rose-200 dark:border-rose-800 rounded-xl overflow-hidden">
              <div className="bg-rose-50 dark:bg-rose-900/20 px-4 py-2 flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-600 dark:text-rose-400"/>
                <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                  {result.errors.length} row{result.errors.length !== 1 ? 's' : ''} skipped
                </p>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-rose-100 dark:divide-rose-900/30">
                {result.errors.map((e, i) => (
                  <p key={i} className="px-4 py-2 text-xs text-rose-700 dark:text-rose-300">{e.message}</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button onClick={reset} className="btn-secondary">Import Another File</button>
            <button onClick={handleClose} className="btn-primary">Done</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

const CIVIL = ['single','married','divorced','widowed'];
const GENDER = ['male','female','other'];
const EDUC = ['Elementary','High School','Vocational','College','Post-Graduate','None'];

// ── Camera Capture Popup ────────────────────────────────────────────────────
function CameraModal({ open, onCapture, onClose }) {
  const videoRef  = useRef();
  const canvasRef = useRef();
  const streamRef = useRef(null);
  const [ready,    setReady]    = useState(false);
  const [camError, setCamError] = useState('');
  const [preview,  setPreview]  = useState(null); // dataUrl after capture, before confirm

  function stopStream() {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }

  async function startStream() {
    setReady(false);
    setCamError('');
    setPreview(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError('Camera access requires HTTPS. Please use "Upload Photo" instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
    } catch (err) {
      setCamError('Could not access camera: ' + err.message);
    }
  }

  useEffect(() => {
    if (open) { startStream(); }
    return () => { stopStream(); };
  }, [open]);

  function handleClose() {
    stopStream();
    setReady(false); setCamError(''); setPreview(null);
    onClose();
  }

  function capture() {
    const v = videoRef.current;
    if (!v) return;
    const max = 600;
    const scale = Math.min(1, max / Math.max(v.videoWidth || 1, v.videoHeight || 1));
    const cv = canvasRef.current;
    cv.width  = Math.round((v.videoWidth  || 640) * scale);
    cv.height = Math.round((v.videoHeight || 480) * scale);
    cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
    setPreview(cv.toDataURL('image/jpeg', 0.88));
    stopStream(); // pause stream while reviewing
  }

  function retake() {
    setPreview(null);
    startStream();
  }

  function confirm() {
    onCapture(preview);
    setPreview(null);
  }

  return (
    <Modal open={open} onClose={handleClose} title="Take a Photo" size="md">
      <div className="flex flex-col items-center gap-4">

        {/* ── Error state ── */}
        {camError && (
          <div className="w-full rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-6 text-center">
            <Camera size={32} className="mx-auto mb-2 text-rose-300"/>
            <p className="text-sm text-rose-600 dark:text-rose-400">{camError}</p>
          </div>
        )}

        {/* ── Preview (after capture) ── */}
        {!camError && preview && (
          <>
            <div className="w-full rounded-xl overflow-hidden border-4 border-indigo-200 dark:border-indigo-700 shadow-lg" style={{ aspectRatio: '1/1' }}>
              <img src={preview} alt="Preview" className="w-full h-full object-cover"/>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">Does this photo look good?</p>
          </>
        )}

        {/* ── Live viewfinder ── */}
        {!camError && !preview && (
          <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef} autoPlay playsInline
              className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            {!ready && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2">
                <Loader2 size={28} className="animate-spin text-white"/>
                <p className="text-sm text-white/80">Starting camera…</p>
              </div>
            )}
            {ready && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-36 h-44 rounded-full border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"/>
              </div>
            )}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden"/>

        {/* ── Buttons ── */}
        <div className="flex gap-3">
          {preview ? (
            <>
              <button type="button" onClick={retake} className="act-btn act-gray"><Camera size={13}/> Retake</button>
              <button type="button" onClick={confirm} className="act-btn act-green px-5 py-2 text-sm">
                <CheckCircle size={14}/> Use This Photo
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={handleClose} className="act-btn act-gray"><X size={13}/> Cancel</button>
              {!camError && (
                <button type="button" onClick={capture} disabled={!ready}
                  className={`act-btn act-indigo px-5 py-2 text-sm ${!ready ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  <Camera size={14}/> Capture Photo
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ResidentForm({ initial, onSave, onCancel, loading, isNew }) {
  const [form, setForm] = useState(() => initial ? {
    ...initial,
    birth_date: initial.birth_date ? initial.birth_date.slice(0, 10) : '',
    profile_image_url: initial.profile_image_url || ''
  } : {
    first_name:'', middle_name:'', last_name:'', gender:'male', birth_date:'',
    address:'', purok:'', civil_status:'single', contact_number:'', email:'',
    occupation:'', nationality:'Filipino', religion:'', educational_attainment:'',
    philhealth_number:'', profile_image_url:'',
    voter_status: false, senior_citizen: false, is_pwd: false, is_4ps: false
  });
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const fileInputRef = useRef();

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width  = Math.round(img.width  * scale);
        cv.height = Math.round(img.height * scale);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        set('profile_image_url', cv.toDataURL('image/jpeg', 0.88));
        setPhotoError(false);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleCapture(dataUrl) {
    set('profile_image_url', dataUrl);
    setPhotoError(false);
    setCameraOpen(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (isNew && !form.profile_image_url) { setPhotoError(true); return; }
    onSave(form);
  }

  return (
    <>
      <CameraModal open={cameraOpen} onCapture={handleCapture} onClose={() => setCameraOpen(false)} />
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo Upload */}
        <div className="flex flex-col items-center gap-3 pb-4 border-b border-gray-100 dark:border-[#2e334a]">
          <div className="relative">
            {form.profile_image_url ? (
              <img src={form.profile_image_url} alt="Resident Photo"
                className="w-24 h-24 rounded-full object-cover border-4 border-indigo-200 dark:border-indigo-700 shadow-md" />
            ) : (
              <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${photoError ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-700' : 'border-gray-200 dark:border-[#2e334a] bg-gray-100 dark:bg-[#22263a]'}`}>
                <UserCircle size={52} className="text-gray-300 dark:text-slate-600"/>
              </div>
            )}
            {form.profile_image_url && !confirmRemove && (
              <button type="button" onClick={() => setConfirmRemove(true)}
                className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow">
                <X size={12}/>
              </button>
            )}
          </div>
          {confirmRemove && (
            <div className="flex flex-col items-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">Remove this photo?</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmRemove(false)} className="act-btn act-gray">Keep</button>
                <button type="button" onClick={() => { set('profile_image_url', ''); setConfirmRemove(false); }} className="act-btn act-red"><X size={12}/> Remove</button>
              </div>
            </div>
          )}
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            Resident Photo {isNew && <span className="text-rose-500 ml-0.5">*</span>}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="act-btn act-sky">
              <Upload size={12}/> Upload Photo
            </button>
            <button type="button" onClick={() => setCameraOpen(true)} className="act-btn act-indigo">
              <Camera size={12}/> Take a Photo
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload}/>
          </div>
          {photoError && <p className="text-xs text-rose-500">Resident photo is required when adding manually</p>}
        </div>
      {/* Name */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">First Name *</label>
          <input className="input" value={form.first_name} onChange={e => set('first_name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Middle Name</label>
          <input className="input" value={form.middle_name} onChange={e => set('middle_name', e.target.value)} />
        </div>
        <div>
          <label className="label">Last Name *</label>
          <input className="input" value={form.last_name} onChange={e => set('last_name', e.target.value)} required />
        </div>
      </div>

      {/* Gender / DOB / Civil Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Gender *</label>
          <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)} required>
            {GENDER.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase()+g.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date of Birth *</label>
          <input type="date" className="input" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} required />
        </div>
        <div>
          <label className="label">Civil Status *</label>
          <select className="input" value={form.civil_status} onChange={e => set('civil_status', e.target.value)} required>
            {CIVIL.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Address / Purok */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="label">Address *</label>
          <input className="input" value={form.address} onChange={e => set('address', e.target.value)} required placeholder="Street, Barangay, Municipality" />
        </div>
        <div>
          <label className="label">Purok / Sitio</label>
          <input className="input" value={form.purok} onChange={e => set('purok', e.target.value)} placeholder="e.g. Purok 1" />
        </div>
      </div>

      {/* Contact / Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Contact Number</label>
          <input className="input" value={form.contact_number} onChange={e => set('contact_number', e.target.value)} placeholder="09xxxxxxxxx" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
      </div>

      {/* Occupation / Educational Attainment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Occupation</label>
          <input className="input" value={form.occupation} onChange={e => set('occupation', e.target.value)} />
        </div>
        <div>
          <label className="label">Educational Attainment</label>
          <select className="input" value={form.educational_attainment} onChange={e => set('educational_attainment', e.target.value)}>
            <option value="">Select...</option>
            {EDUC.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {/* Nationality / Religion */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Nationality</label>
          <input className="input" value={form.nationality} onChange={e => set('nationality', e.target.value)} />
        </div>
        <div>
          <label className="label">Religion</label>
          <input className="input" value={form.religion} onChange={e => set('religion', e.target.value)} />
        </div>
      </div>

      {/* PhilHealth */}
      <div>
        <label className="label">PhilHealth Number</label>
        <input className="input" value={form.philhealth_number} onChange={e => set('philhealth_number', e.target.value)} placeholder="XX-XXXXXXXXX-X" />
      </div>

      {/* Tags */}
      <div className="bg-gray-50 rounded-xl p-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Tags & Classifications</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {[
            ['voter_status',  'Registered Voter'],
            ['senior_citizen','Senior Citizen (60+)'],
            ['is_pwd',        'PWD (Person with Disability)'],
            ['is_4ps',        '4Ps Beneficiary'],
          ].map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600"
                checked={!!form[k]} onChange={e => set(k, e.target.checked)} />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : 'Save Resident'}
        </button>
      </div>
    </form>
    </>
  );
}

export default function Residents() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const canEdit = hasRole(['admin', 'secretary']);

  const [residents, setResidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterPurok, setFilterPurok] = useState('');
  const [filterVoter, setFilterVoter] = useState('');
  const [filterSenior, setFilterSenior] = useState('');
  const [filterPwd, setFilterPwd] = useState('');
  const [filter4Ps, setFilter4Ps] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterPurok) params.purok = filterPurok;
      if (filterVoter) params.voter_status = filterVoter;
      if (filterSenior) params.senior_citizen = filterSenior;
      if (filterPwd) params.is_pwd = filterPwd;
      if (filter4Ps) params.is_4ps = filter4Ps;
      const res = await residentsAPI.getAll(page, limit, params);
      setResidents(res.data.residents || []);
      setTotal(res.data.total || 0);
    } catch { toast('Failed to load residents', 'error'); }
    finally { setLoading(false); }
  }, [page, search, filterPurok, filterVoter, filterSenior, filterPwd, filter4Ps]);

  useEffect(() => { load(); }, [load]);

  // Open edit modal when navigated from ResidentProfile with editId state
  useEffect(() => {
    const editId = location.state?.editId;
    if (!editId || residents.length === 0) return;
    const target = residents.find(r => r.id == editId);
    if (target) { setModal(target); window.history.replaceState({}, ''); }
  }, [location.state, residents]);

  async function handleSave(form) {
    setSaving(true);
    try {
      if (modal?.id) {
        await residentsAPI.update(modal.id, form);
        toast('Resident updated successfully', 'success');
      } else {
        await residentsAPI.create(form);
        toast('Resident added successfully', 'success');
      }
      setModal(null);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save', 'error');
    } finally { setSaving(false); }
  }

  async function handleDelete(r) {
    if (!confirm(`Delete ${r.full_name}? This cannot be undone.`)) return;
    try {
      await residentsAPI.delete(r.id);
      toast('Resident deleted', 'success');
      load();
    } catch { toast('Failed to delete resident', 'error'); }
  }

  async function handleExport() {
    try {
      const res = await residentsAPI.export();
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'residents.csv'; a.click();
      toast('Exported successfully', 'success');
    } catch { toast('Export failed', 'error'); }
  }

  const clearFilters = () => {
    setFilterPurok(''); setFilterVoter(''); setFilterSenior(''); setFilterPwd(''); setFilter4Ps('');
    setPage(1);
  };
  const hasActiveFilters = filterPurok || filterVoter || filterSenior || filterPwd || filter4Ps;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Users size={22} className="text-indigo-600" /> Residents
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{total.toLocaleString()} registered residents</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5"><Download size={15}/> Export CSV</button>
          {canEdit && <button onClick={() => setImportOpen(true)} className="btn-secondary flex items-center gap-1.5"><Upload size={15}/> Import CSV</button>}
          {canEdit && <button onClick={() => setModal('add')} className="btn-primary flex items-center gap-1.5"><Plus size={15}/> Add Resident</button>}
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#2e334a] shadow-sm p-4 space-y-3">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, address, contact..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#2e334a] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 dark:bg-[#22263a] dark:text-slate-200" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition
              ${showFilters || hasActiveFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300' : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-[#22263a] dark:border-[#2e334a] dark:text-slate-300 hover:border-indigo-300'}`}>
            <Filter size={14}/> Filters {hasActiveFilters && <span className="bg-indigo-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{[filterPurok,filterVoter,filterSenior,filterPwd,filter4Ps].filter(Boolean).length}</span>}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 items-center pt-1 border-t border-gray-100 dark:border-[#2e334a]">
            <input value={filterPurok} onChange={e => { setFilterPurok(e.target.value); setPage(1); }}
              placeholder="Purok / Sitio..."
              className="text-sm border border-gray-200 dark:border-[#2e334a] rounded-xl px-3 py-1.5 bg-gray-50 dark:bg-[#22263a] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36" />
            {[
              { label: 'Voter Status', value: filterVoter, set: setFilterVoter, opts: [['','All Voters'],['true','Registered'],['false','Non-Voter']] },
              { label: 'Age Group',    value: filterSenior, set: setFilterSenior, opts: [['','All Ages'],['true','Senior (60+)'],['false','Non-Senior']] },
              { label: 'PWD',          value: filterPwd,    set: setFilterPwd,    opts: [['','All'],['true','PWD'],['false','Non-PWD']] },
              { label: '4Ps',          value: filter4Ps,    set: setFilter4Ps,    opts: [['','All'],['true','4Ps Beneficiary'],['false','Non-4Ps']] },
            ].map(f => (
              <select key={f.label} value={f.value} onChange={e => { f.set(e.target.value); setPage(1); }}
                className="text-sm border border-gray-200 dark:border-[#2e334a] rounded-xl px-3 py-1.5 bg-gray-50 dark:bg-[#22263a] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-rose-600 hover:underline">
                <X size={12}/> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#2e334a] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-gray-100 dark:bg-[#22263a] rounded-xl animate-pulse" />)}
          </div>
        ) : residents.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 font-medium">No residents found</p>
            <p className="text-gray-300 text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
                {['Name','Purok','Gender','Age','Contact','Tags','Actions'].map(h => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {residents.map(r => (
                <tr key={r.id} className="hover:bg-indigo-50/30 dark:hover:bg-[#22263a] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {r.profile_image_url ? (
                        <img src={r.profile_image_url} alt={r.full_name}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-indigo-100 dark:border-indigo-900" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex-shrink-0">
                          {r.first_name?.[0]}{r.last_name?.[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-800 dark:text-slate-100">{r.full_name}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{r.occupation || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs">{r.purok || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300 capitalize">{r.gender}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{r.age}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{r.contact_number || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.voter_status  && <Badge status="active"    label="Voter" />}
                      {r.senior_citizen && <Badge status="completed" label="Senior" />}
                      {r.is_pwd        && <Badge status="processing" label="PWD" />}
                      {r.is_4ps        && <Badge status="pending"    label="4Ps" />}
                      {!r.voter_status && !r.senior_citizen && !r.is_pwd && !r.is_4ps && <span className="text-gray-400 text-xs">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/residents/${r.id}`)} className="act-btn act-indigo"><Eye size={12}/> View</button>
                      {canEdit && <button onClick={() => setModal(r)} className="act-btn act-sky"><Pencil size={12}/> Edit</button>}
                      {canEdit && <button onClick={() => handleDelete(r)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-[#2e334a] flex items-center justify-between">
            <p className="text-xs text-gray-400">{(page-1)*limit+1}–{Math.min(page*limit, total)} of {total.toLocaleString()}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="icon-btn disabled:opacity-30"><ChevronLeft size={16}/></button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const p = Math.max(1, Math.min(page-2, totalPages-4)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition ${p === page ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-[#22263a]'}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="icon-btn disabled:opacity-30"><ChevronRight size={16}/></button>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? `Edit – ${modal.full_name}` : 'Add New Resident'} size="xl">
        <ResidentForm
          initial={modal?.id ? modal : null}
          isNew={!modal?.id}
          onSave={handleSave}
          onCancel={() => setModal(null)}
          loading={saving}
        />
      </Modal>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => { load(); }}
      />
    </div>
  );
}
