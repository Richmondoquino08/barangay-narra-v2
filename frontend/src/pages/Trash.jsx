import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { trashAPI } from '../api/apiClient';
import { Trash2, RotateCcw, XCircle, Clock } from 'lucide-react';

const SOURCE_LABELS = {
  certificates: 'Certificate',
  documents: 'Document',
};

export default function Trash() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(['admin']);
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retentionDays, setRetentionDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = isAdmin ? await trashAPI.getAll() : await trashAPI.getMine();
      setItems(res.data.items || []);
      setRetentionDays(res.data.retentionDays || 30);
    } catch { toast('Failed to load trash', 'error'); }
    finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  async function handleRestore(id) {
    if (!confirm('Restore this item?')) return;
    try { await trashAPI.restore(id); toast('Restored', 'success'); load(); }
    catch (err) { toast(err.response?.data?.message || 'Restore failed', 'error'); }
  }

  async function handleHide(id) {
    if (!confirm("Remove this from your trash? An admin will still be able to see and recover it — it isn't permanently deleted.")) return;
    try { await trashAPI.hide(id); toast('Removed from your trash', 'success'); load(); }
    catch { toast('Failed', 'error'); }
  }

  async function handlePermanentDelete(id) {
    if (!confirm('Permanently delete this item? This cannot be undone.')) return;
    try { await trashAPI.permanentDelete(id); toast('Permanently deleted', 'success'); load(); }
    catch { toast('Failed', 'error'); }
  }

  function daysLeft(deletedAt) {
    const expires = new Date(deletedAt).getTime() + retentionDays * 24 * 60 * 60 * 1000;
    return Math.max(Math.ceil((expires - Date.now()) / (24 * 60 * 60 * 1000)), 0);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Trash2 size={22} className="text-indigo-600"/> {isAdmin ? 'Trash — All Deleted Items' : 'My Trash'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {isAdmin
              ? `Items deleted by any user across the system, including ones a user has already removed from their own trash. Kept for ${retentionDays} days before permanent removal.`
              : `Items you've deleted. Restore them here — they'll be permanently removed automatically after ${retentionDays} days.`}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 dark:bg-[#22263a] rounded-xl animate-pulse"/>)}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-slate-500">
            <Trash2 size={40} className="mx-auto mb-3 opacity-30"/>
            <p className="font-medium">Trash is empty</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
                {['Item', 'Type', ...(isAdmin ? ['Deleted By'] : []), 'Deleted', 'Expires', 'Actions'].map(h => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a] transition-colors">
                  <td className="table-td font-medium text-gray-900 dark:text-slate-100">{item.item_label}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400">{SOURCE_LABELS[item.source_table] || item.source_table}</td>
                  {isAdmin && <td className="table-td text-gray-500 dark:text-slate-400">{item.deleted_by_name}</td>}
                  <td className="table-td text-gray-400 dark:text-slate-500 whitespace-nowrap">
                    {new Date(item.deleted_at).toLocaleDateString('en-PH')}
                  </td>
                  <td className="table-td text-xs">
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Clock size={11}/> {daysLeft(item.deleted_at)}d left
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex gap-1">
                      <button onClick={() => handleRestore(item.id)} className="act-btn act-sky">
                        <RotateCcw size={12}/> Restore
                      </button>
                      {isAdmin ? (
                        <button onClick={() => handlePermanentDelete(item.id)} className="act-btn act-red">
                          <XCircle size={12}/> Delete Forever
                        </button>
                      ) : (
                        <button onClick={() => handleHide(item.id)} className="act-btn act-gray">
                          <Trash2 size={12}/> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
