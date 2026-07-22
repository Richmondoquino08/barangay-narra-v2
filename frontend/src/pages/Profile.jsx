import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { usersAPI } from '../api/apiClient';
import { UserCircle, Save, Mail, Shield, Clock, Calendar } from 'lucide-react';

const ROLE_LABELS = { admin: 'Administrator', secretary: 'Secretary', captain: 'Punong Barangay', treasurer: 'Treasurer' };

export default function Profile() {
  const { user, getCurrentUser } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { getCurrentUser(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = fullName.trim() !== (user?.full_name || '') || email.trim() !== (user?.email || '');

  async function handleSave(e) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return toast('Name and email are required', 'error');
    setSaving(true);
    try {
      await usersAPI.update(user.id, { full_name: fullName.trim(), email: email.trim() });
      await getCurrentUser();
      toast('Profile updated', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <UserCircle size={22} className="text-indigo-600"/> My Profile
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            View and update your account details.
          </p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input type="text" className="input" value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button type="submit" disabled={!dirty || saving} className="btn-primary flex items-center gap-1.5">
            <Save size={15}/> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-3">Account Info</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-2.5">
            <Shield size={15} className="text-gray-400 dark:text-slate-500 mt-0.5"/>
            <div>
              <dt className="text-gray-500 dark:text-slate-400 text-xs">Role</dt>
              <dd className="text-gray-900 dark:text-slate-100 font-medium">{ROLE_LABELS[user?.role] || user?.role}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Mail size={15} className="text-gray-400 dark:text-slate-500 mt-0.5"/>
            <div>
              <dt className="text-gray-500 dark:text-slate-400 text-xs">Email</dt>
              <dd className="text-gray-900 dark:text-slate-100 font-medium">{user?.email}</dd>
            </div>
          </div>
          {user?.last_login && (
            <div className="flex items-start gap-2.5">
              <Clock size={15} className="text-gray-400 dark:text-slate-500 mt-0.5"/>
              <div>
                <dt className="text-gray-500 dark:text-slate-400 text-xs">Last Login</dt>
                <dd className="text-gray-900 dark:text-slate-100 font-medium">{new Date(user.last_login).toLocaleString('en-PH')}</dd>
              </div>
            </div>
          )}
          {user?.created_at && (
            <div className="flex items-start gap-2.5">
              <Calendar size={15} className="text-gray-400 dark:text-slate-500 mt-0.5"/>
              <div>
                <dt className="text-gray-500 dark:text-slate-400 text-xs">Member Since</dt>
                <dd className="text-gray-900 dark:text-slate-100 font-medium">{new Date(user.created_at).toLocaleDateString('en-PH')}</dd>
              </div>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
