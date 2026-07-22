import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { usersAPI, residentsAPI, certificatesAPI, requestsAPI } from '../api/apiClient';
import { UserCircle, Save, Mail, Shield, Clock, Calendar } from 'lucide-react';

const ROLE_LABELS = { admin: 'Administrator', secretary: 'Secretary', captain: 'Punong Barangay', treasurer: 'Treasurer', intern: 'Intern' };

function calculateAge(birthdate) {
  if (!birthdate) return null;
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800', processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800', issued: 'bg-green-100 text-green-800',
};

function Field({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium text-gray-900 dark:text-slate-100 text-right">{value ?? '-'}</dd>
    </div>
  );
}

function YesNo({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 dark:text-slate-400">{label}</dt>
      <dd className={`font-medium ${value ? 'text-green-600' : 'text-gray-400'}`}>{value ? 'Yes' : 'No'}</dd>
    </div>
  );
}

// ── Resident-linked view: same layout as the staff-facing Resident Profile page ──
function ResidentProfileView({ resident, certificates, requests }) {
  const [tab, setTab] = useState('info');
  const age = calculateAge(resident.birth_date);

  return (
    <div className="space-y-5">
      <div className="card p-5 flex items-center gap-4">
        {resident.profile_image_url ? (
          <img src={resident.profile_image_url} alt="" className="w-16 h-16 rounded-xl object-cover border border-gray-200 dark:border-[#2e334a]" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {resident.first_name?.charAt(0)}{resident.last_name?.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 truncate">
            {resident.first_name} {resident.middle_name} {resident.last_name} {resident.suffix}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{resident.address}</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-[#2e334a]">
        {[
          { key: 'info', label: 'Personal Information' },
          { key: 'certificates', label: `Certificates (${certificates.length})` },
          { key: 'requests', label: `Requests (${requests.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-3">Personal Details</h3>
            <dl className="space-y-2.5 text-sm">
              <Field label="Full Name" value={`${resident.first_name} ${resident.middle_name || ''} ${resident.last_name} ${resident.suffix || ''}`.replace(/\s+/g, ' ').trim()} />
              <Field label="Gender" value={resident.gender && resident.gender.charAt(0).toUpperCase() + resident.gender.slice(1)} />
              <Field label="Birthdate" value={resident.birth_date ? new Date(resident.birth_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'} />
              <Field label="Age" value={age != null ? `${age} years old` : '-'} />
              <Field label="Civil Status" value={resident.civil_status && resident.civil_status.charAt(0).toUpperCase() + resident.civil_status.slice(1)} />
            </dl>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-3">Contact Information</h3>
            <dl className="space-y-2.5 text-sm">
              <Field label="Contact Number" value={resident.contact_number} />
              <Field label="Email" value={resident.email} />
              <Field label="Purok" value={resident.purok} />
              <Field label="Address" value={resident.address} />
            </dl>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-3">Employment & Income</h3>
            <dl className="space-y-2.5 text-sm">
              <Field label="Occupation" value={resident.occupation} />
              <Field label="Monthly Income" value={resident.monthly_income ? `₱${parseFloat(resident.monthly_income).toLocaleString()}` : '-'} />
            </dl>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-3">Special Status</h3>
            <dl className="space-y-2.5 text-sm">
              <YesNo label="Registered Voter" value={resident.voter_status} />
              <YesNo label="4Ps Member" value={resident.is_4ps} />
              <YesNo label="PWD" value={resident.is_pwd} />
              <YesNo label="Senior Citizen" value={resident.senior_citizen} />
            </dl>
          </div>
        </div>
      )}

      {tab === 'certificates' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Cert ID', 'Type', 'Purpose', 'Status', 'Date'].map(h => <th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {certificates.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-gray-400 dark:text-slate-500">No certificates found</td></tr>
              ) : certificates.map(c => (
                <tr key={c.id}>
                  <td className="table-td font-mono text-xs">CERT-{String(c.id).padStart(4, '0')}</td>
                  <td className="table-td capitalize">{c.certificate_type?.replace(/_/g, ' ')}</td>
                  <td className="table-td">{c.purpose}</td>
                  <td className="table-td"><span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-800'}`}>{c.status?.toUpperCase()}</span></td>
                  <td className="table-td text-gray-400 dark:text-slate-500">{new Date(c.created_at).toLocaleDateString('en-PH')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'requests' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Control No.', 'Type', 'Purpose', 'Status', 'Date'].map(h => <th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {requests.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-gray-400 dark:text-slate-500">No requests found</td></tr>
              ) : requests.map(r => (
                <tr key={r.id}>
                  <td className="table-td font-medium">{r.control_number}</td>
                  <td className="table-td capitalize">{r.request_type?.replace(/_/g, ' ')}</td>
                  <td className="table-td">{r.purpose}</td>
                  <td className="table-td"><span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-800'}`}>{r.status?.toUpperCase()}</span></td>
                  <td className="table-td text-gray-400 dark:text-slate-500">{new Date(r.created_at).toLocaleDateString('en-PH')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Account-only view: for accounts with no linked resident (e.g. admin) ──
function AccountOnlyView({ user, getCurrentUser }) {
  const { toast } = useToast();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
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
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
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
            <Save size={15} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-3">Account Info</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-2.5">
            <Shield size={15} className="text-gray-400 dark:text-slate-500 mt-0.5" />
            <div><dt className="text-gray-500 dark:text-slate-400 text-xs">Role</dt><dd className="text-gray-900 dark:text-slate-100 font-medium">{ROLE_LABELS[user?.role] || user?.role}</dd></div>
          </div>
          <div className="flex items-start gap-2.5">
            <Mail size={15} className="text-gray-400 dark:text-slate-500 mt-0.5" />
            <div><dt className="text-gray-500 dark:text-slate-400 text-xs">Email</dt><dd className="text-gray-900 dark:text-slate-100 font-medium">{user?.email}</dd></div>
          </div>
          {user?.last_login && (
            <div className="flex items-start gap-2.5">
              <Clock size={15} className="text-gray-400 dark:text-slate-500 mt-0.5" />
              <div><dt className="text-gray-500 dark:text-slate-400 text-xs">Last Login</dt><dd className="text-gray-900 dark:text-slate-100 font-medium">{new Date(user.last_login).toLocaleString('en-PH')}</dd></div>
            </div>
          )}
          {user?.created_at && (
            <div className="flex items-start gap-2.5">
              <Calendar size={15} className="text-gray-400 dark:text-slate-500 mt-0.5" />
              <div><dt className="text-gray-500 dark:text-slate-400 text-xs">Member Since</dt><dd className="text-gray-900 dark:text-slate-100 font-medium">{new Date(user.created_at).toLocaleDateString('en-PH')}</dd></div>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, getCurrentUser } = useAuth();
  const { toast } = useToast();
  const [resident, setResident] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    await getCurrentUser();
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user?.resident_id) return;
    (async () => {
      try {
        const [residentRes, certsRes, reqsRes] = await Promise.all([
          residentsAPI.getById(user.resident_id),
          certificatesAPI.getAll({ resident_id: user.resident_id }).catch(() => ({ data: {} })),
          requestsAPI.getAll({ resident_id: user.resident_id }).catch(() => ({ data: {} })),
        ]);
        setResident(residentRes.data.resident || residentRes.data);
        setCertificates(certsRes.data.certificates || []);
        setRequests(reqsRes.data.requests || []);
      } catch {
        toast('Failed to load resident profile', 'error');
      }
    })();
  }, [user?.resident_id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <UserCircle size={22} className="text-indigo-600" /> My Profile
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {user?.resident_id ? 'Your resident record on file with this office.' : 'View and update your account details.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-[#22263a] rounded-xl animate-pulse" />)}</div>
      ) : user?.resident_id ? (
        resident ? <ResidentProfileView resident={resident} certificates={certificates} requests={requests} />
          : <div className="card p-6 text-center text-gray-400 dark:text-slate-500">Loading resident record…</div>
      ) : (
        <AccountOnlyView user={user} getCurrentUser={getCurrentUser} />
      )}
    </div>
  );
}
