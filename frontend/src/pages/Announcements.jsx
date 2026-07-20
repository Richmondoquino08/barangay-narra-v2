import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Megaphone, Plus, Pencil, Trash2, Bell } from 'lucide-react';

export default function Announcements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: '', message: '' });
  const [saving, setSaving] = useState(false);

  // Admin, Secretary, Captain can create / manage announcements
  const canManage = ['admin', 'secretary', 'captain'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try { const res = await apiClient.get('/announcements'); setAnnouncements(res.data.announcements || []); }
    catch { toast('Failed to load announcements', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ title: '', message: '' }); setModal('new'); };
  const openEdit   = a => { setForm({ title: a.title, message: a.message }); setModal(a); };

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal?.id) await apiClient.put(`/announcements/${modal.id}`, form);
      else await apiClient.post('/announcements', form);
      toast(modal?.id ? 'Announcement updated' : 'Announcement posted!', 'success');
      setModal(null); load();
    } catch { toast('Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this announcement?')) return;
    try { await apiClient.delete(`/announcements/${id}`); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  const relTime = d => {
    const diff = Date.now() - new Date(d);
    const m = Math.floor(diff / 60000); const h = Math.floor(m / 60); const day = Math.floor(h / 24);
    if (day > 0) return `${day}d ago`; if (h > 0) return `${h}h ago`; if (m > 0) return `${m}m ago`; return 'Just now';
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Megaphone size={22} className="text-amber-500"/> Announcements
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {announcements.length} posted — pops up as notification for all users
          </p>
        </div>
        {canManage && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5">
            <Plus size={15}/> Post Announcement
          </button>
        )}
      </div>

      {/* Role info banner for captain */}
      {user?.role === 'captain' && (
        <div className="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl text-sm text-indigo-700 dark:text-indigo-300">
          <Bell size={16} className="flex-shrink-0 mt-0.5"/>
          <p>As <strong>Captain</strong>, your announcements will appear as a notification popup for every logged-in user automatically.</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_,i) => <div key={i} className="h-28 bg-white dark:bg-gray-800 rounded-2xl animate-pulse border border-gray-100 dark:border-gray-700"/>)}
        </div>
      ) : announcements.length === 0 ? (
        <div className="card py-16 text-center text-gray-400 dark:text-gray-500">
          <Megaphone size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-600"/>
          <p className="font-medium">No announcements yet</p>
          {canManage && <p className="text-sm mt-1">Post something to notify all users.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Megaphone size={16} className="text-amber-600 dark:text-amber-400"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">{a.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">{a.message}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                      {relTime(a.created_at)} · {new Date(a.created_at).toLocaleString('en-PH')}
                      {a.posted_by_name && (
                        <span className="ml-2 text-indigo-500 dark:text-indigo-400 font-medium">
                          · Posted by {a.posted_by_name}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(a)} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                    <button onClick={() => handleDelete(a.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Announcement' : 'New Announcement'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} required placeholder="e.g. Barangay Assembly – June 5"/>
          </div>
          <div>
            <label className="label">Message *</label>
            <textarea className="input resize-none" rows={6} value={form.message}
              onChange={e => setForm(p=>({...p,message:e.target.value}))} required
              placeholder="Write your announcement here…&#10;&#10;All logged-in users will see a popup notification when they're online."/>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Posting…' : modal?.id ? 'Update' : 'Post to All Users'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

