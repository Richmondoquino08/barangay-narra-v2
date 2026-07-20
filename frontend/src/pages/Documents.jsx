import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { FolderOpen, Plus, Trash2, Search, Filter } from 'lucide-react';
import ResidentSearch from '../components/ResidentSearch';

const DOCUMENT_TYPES = [
  'Birth Certificate', 'Marriage Certificate', 'Land Title',
  'Business Permit', 'Government ID', 'Barangay Certificate', 'Other'
];

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function Documents() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(['admin', 'secretary']);
  const { toast } = useToast();
  const [documents,  setDocuments]  = useState([]);
  const [residents,  setResidents]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [search,     setSearch]     = useState('');
  const [filterRes,  setFilterRes]  = useState('');
  const [uploading,  setUploading]  = useState(false);
  const [form, setForm] = useState({ resident_id: '', document_type: '', description: '' });
  const [file, setFile] = useState(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterRes ? { resident_id: filterRes } : {};
      const res = await apiClient.get('/documents', { params });
      setDocuments(res.data.documents || []);
    } catch { toast('Failed to load documents', 'error'); }
    finally { setLoading(false); }
  }, [filterRes]);

  useEffect(() => { loadDocs(); }, [loadDocs]);
  useEffect(() => {
    apiClient.get('/residents', { params: { limit: 500 } })
      .then(r => setResidents(r.data.residents || []))
      .catch(() => {});
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) { toast('Please select a file', 'warning'); return; }
    setUploading(true);
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('document_type', form.document_type);
      if (form.resident_id) data.append('resident_id', form.resident_id);
      if (form.description) data.append('description', form.description);
      await apiClient.post('/documents', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast('Document uploaded!', 'success');
      setShowForm(false);
      setForm({ resident_id: '', document_type: '', description: '' });
      setFile(null);
      loadDocs();
    } catch (err) { toast(err.response?.data?.error || 'Upload failed', 'error'); }
    finally { setUploading(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this document?')) return;
    try { await apiClient.delete(`/documents/${id}`); toast('Deleted', 'success'); loadDocs(); }
    catch { toast('Delete failed', 'error'); }
  }

  const visible = documents.filter(d =>
    !search || d.file_name?.toLowerCase().includes(search.toLowerCase()) ||
               d.document_type?.toLowerCase().includes(search.toLowerCase()) ||
               d.resident_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <FolderOpen size={22} className="text-indigo-600"/> Documents
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{documents.length} files stored</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-1.5">
          <Plus size={15}/> Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by filename, type or resident…"
            className="input pl-9"/>
        </div>
        <div className="flex items-center gap-2 w-60">
          <Filter size={14} className="text-gray-400 dark:text-slate-500 flex-shrink-0"/>
          <div className="flex-1">
            <ResidentSearch
              residents={residents}
              value={filterRes}
              onChange={v => setFilterRes(v)}
              placeholder="Filter by resident…"
            />
          </div>
        </div>
        {(search || filterRes) && (
          <button onClick={() => { setSearch(''); setFilterRes(''); }}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_,i) => <div key={i} className="h-10 bg-gray-100 dark:bg-[#22263a] rounded-xl animate-pulse"/>)}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-slate-500">
            <FolderOpen size={40} className="mx-auto mb-3 opacity-30"/>
            <p className="font-medium">{search || filterRes ? 'No documents match your filter' : 'No documents uploaded yet'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
                {['File Name','Type','Resident','Size','Uploaded','Actions'].map(h => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {visible.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a] transition-colors">
                  <td className="table-td">
                    <span className="font-medium text-gray-900 dark:text-slate-100">{doc.file_name}</span>
                  </td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{doc.document_type}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400">{doc.resident_name || '—'}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400">{formatSize(doc.file_size)}</td>
                  <td className="table-td text-gray-400 dark:text-slate-500 whitespace-nowrap">
                    {new Date(doc.created_at).toLocaleDateString('en-PH')}
                  </td>
                  <td className="table-td">
                    {canEdit && <button onClick={() => handleDelete(doc.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Upload Document">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="label">Document Type *</label>
            <select className="input" value={form.document_type}
              onChange={e => setForm(p => ({ ...p, document_type: e.target.value }))} required>
              <option value="">Select type…</option>
              {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <ResidentSearch
              label={<>Resident <span className="text-gray-400 font-normal text-xs">(optional)</span></>}
              residents={residents}
              value={form.resident_id}
              onChange={v => setForm(p => ({ ...p, resident_id: v }))}
              placeholder="Search to link a resident…"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Optional notes about this document…"/>
          </div>
          <div>
            <label className="label">File *</label>
            <input type="file"
              onChange={e => setFile(e.target.files[0])}
              className="w-full text-sm text-gray-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 dark:file:bg-indigo-900/40 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer"
              required/>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={uploading} className="btn-primary">
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

