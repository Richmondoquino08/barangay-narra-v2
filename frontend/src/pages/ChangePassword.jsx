import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { KeyRound, Save } from 'lucide-react';

export default function ChangePassword() {
  const { changePassword } = useAuth();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword.length < 6) return toast('New password must be at least 6 characters', 'error');
    if (newPassword !== confirmPassword) return toast('New passwords do not match', 'error');

    setSaving(true);
    const res = await changePassword(currentPassword, newPassword);
    setSaving(false);
    if (res.success) {
      toast('Password changed successfully', 'success');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } else {
      toast(res.error || 'Failed to change password', 'error');
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <KeyRound size={22} className="text-indigo-600"/> Change Password
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Update the password for your own account.
          </p>
        </div>
      </div>

      <div className="card p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input" value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" required/>
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" value={newPassword}
              onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" minLength={6} required/>
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" className="input" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" minLength={6} required/>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-1.5">
            <Save size={15}/> {saving ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
