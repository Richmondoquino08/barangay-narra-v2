import React, { useState, useEffect } from 'react';
import { usersAPI, residentsAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ResidentSearch from '../components/ResidentSearch';
import { Users as UsersIcon, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, KeyRound, Eye, EyeOff, Cake, MapPin, Phone, Heart } from 'lucide-react';

const ROLES = ['admin','secretary','captain','treasurer','intern'];

export default function Users() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);       // null | 'create' | {user}
  const [passModal, setPassModal] = useState(null); // null | {id, name}
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ full_name:'', email:'', password:'', role:'secretary', resident_id:'' });
  const [newPass, setNewPass] = useState('');
  const selectedResident = residents.find(r => String(r.id) === String(form.resident_id));

  const load = async () => {
    setLoading(true);
    try {
      const [usersRes, residentsRes] = await Promise.all([
        usersAPI.getAll(),
        residentsAPI.getAll(1, 500),
      ]);
      setUsers(usersRes.data.users || []);
      setResidents(residentsRes.data.residents || []);
    }
    catch { toast('Failed to load users', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  async function handleSave(e) {
    e.preventDefault();
    if (form.role !== 'admin' && !form.resident_id) {
      return toast('Select the resident this account belongs to', 'error');
    }
    setSaving(true);
    try {
      const payload = { full_name: form.full_name, email: form.email, role: form.role, resident_id: form.resident_id || null };
      if (modal?.id) {
        await usersAPI.update(modal.id, payload);
        toast('User updated', 'success');
      } else {
        await usersAPI.create({ ...payload, password: form.password });
        toast('User created', 'success');
      }
      setModal(null); load();
    } catch (err) { toast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete(u) {
    if (!confirm(`Delete ${u.full_name}?`)) return;
    try { await usersAPI.delete(u.id); toast('User deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  async function handleToggle(u) {
    try { await usersAPI.toggleStatus(u.id); toast(`User ${u.is_active ? 'deactivated':'activated'}`, 'success'); load(); }
    catch { toast('Failed to toggle status', 'error'); }
  }

  async function handleResetPass(e) {
    e.preventDefault();
    try { await usersAPI.resetPassword(passModal.id, newPass); toast('Password reset', 'success'); setPassModal(null); setNewPass(''); }
    catch { toast('Reset failed', 'error'); }
  }

  const openCreate = () => { setForm({ full_name:'', email:'', password:'', role:'secretary', resident_id:'' }); setModal('create'); };
  const openEdit   = u => { setForm({ full_name: u.full_name, email: u.email, password:'', role: u.role, resident_id: u.resident_id || '' }); setModal(u); };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2"><UsersIcon size={22} className="text-violet-600"/>Users</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{users.length} system accounts</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5"><Plus size={15}/>New User</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-16 bg-gray-100 dark:bg-[#22263a] rounded-xl animate-pulse"/>)}</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[540px]">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['User','Role','Status','Last Login','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a] transition-colors">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0
                        ${u.role==='admin'?'bg-violet-600':u.role==='captain'?'bg-indigo-600':u.role==='treasurer'?'bg-teal-600':'bg-blue-600'}`}>
                        {u.full_name?.split(' ').map(n=>n[0]).slice(0,2).join('')}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{u.full_name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td"><Badge status={u.role}/></td>
                  <td className="table-td"><Badge status={u.is_active ? 'active' : 'inactive'}/></td>
                  <td className="table-td text-gray-400 dark:text-slate-500 text-xs">{u.last_login ? new Date(u.last_login).toLocaleString('en-PH') : 'Never'}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(u)} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                      <button onClick={() => handleToggle(u)} className={`act-btn ${u.is_active ? 'act-gray' : 'act-green'}`}>
                        {u.is_active ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => setPassModal({ id: u.id, name: u.full_name })} className="act-btn act-indigo"><KeyRound size={12}/> Reset Pwd</button>
                      {u.id !== me?.id && <button onClick={() => handleDelete(u)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? `Edit – ${modal.full_name}` : 'Create New User'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" value={form.full_name} onChange={e => setForm(p=>({...p,full_name:e.target.value}))} required />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} required />
          </div>
          {!modal?.id && (
            <div>
              <label className="label">Password *</label>
              <div className="relative">
                <input type={showPass?'text':'password'} className="input pr-10" value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} required minLength={6} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="label">Role *</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(r => (
                <button key={r} type="button" onClick={() => setForm(p=>({...p,role:r}))}
                  className={`py-2 rounded-xl text-sm font-medium border-2 capitalize transition
                    ${form.role===r ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {form.role !== 'admin' && (
            <>
              <ResidentSearch
                label="Resident *"
                placeholder="Search resident by name or contact…"
                residents={residents}
                value={form.resident_id}
                onChange={id => {
                  const picked = residents.find(r => String(r.id) === String(id));
                  setForm(p => ({ ...p, resident_id: id, full_name: picked ? picked.full_name : p.full_name }));
                }}
                required
              />
              {selectedResident && (
                <div className="rounded-xl border border-gray-200 dark:border-[#2e334a] bg-gray-50 dark:bg-[#1a1d27] p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                    Confirm this is the right person
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                      <Cake size={13} className="text-gray-400 dark:text-slate-500 flex-shrink-0"/>
                      {selectedResident.birth_date ? `${new Date(selectedResident.birth_date).toLocaleDateString('en-PH')} (${selectedResident.age}y)` : '—'}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                      <Heart size={13} className="text-gray-400 dark:text-slate-500 flex-shrink-0"/>
                      <span className="capitalize">{selectedResident.civil_status || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300 col-span-2">
                      <MapPin size={13} className="text-gray-400 dark:text-slate-500 flex-shrink-0"/>
                      <span className="truncate">{selectedResident.address}{selectedResident.purok ? ` · ${selectedResident.purok}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300 col-span-2">
                      <Phone size={13} className="text-gray-400 dark:text-slate-500 flex-shrink-0"/>
                      {selectedResident.contact_number || 'No contact number on file'}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving...':'Save User'}</button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!passModal} onClose={() => setPassModal(null)} title={`Reset Password – ${passModal?.name}`} size="sm">
        <form onSubmit={handleResetPass} className="space-y-4">
          <div>
            <label className="label">New Password *</label>
            <input type="password" className="input" value={newPass} onChange={e => setNewPass(e.target.value)} required minLength={6} placeholder="Minimum 6 characters" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setPassModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-danger">Reset Password</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
