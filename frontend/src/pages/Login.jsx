import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Mail, Lock, LogIn, Eye, EyeOff, Shield } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';

export default function Login() {
  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const { login }               = useAuth();
  const { logo, barangayName, systemName, loginTagline } = useTheme();
  const navigate                = useNavigate();

  const logoSrc = logo
    ? (logo.startsWith('http') ? logo : `${API_BASE}${logo}`)
    : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(form.email, form.password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || result.message || 'Invalid email or password.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Cannot connect to server. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    /*
     * The login page is ALWAYS light-themed — we never let dark: classes
     * affect this page. Every color is set explicitly.
     */
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-800 to-blue-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* ── Header ── */}
        <div className="text-center mb-8">
          {logoSrc ? (
            <img src={logoSrc} alt={barangayName} className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 shadow-lg ring-4 ring-white/20" />
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl mb-4 shadow-lg ring-1 ring-white/20">
              <Shield size={30} className="text-white" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-white tracking-tight">{barangayName}</h1>
          <p className="text-indigo-200 mt-1 text-sm">{systemName}</p>
        </div>

        {/* ── Card ── */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Card top accent */}
          <div className="h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />

          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-sm text-gray-500 mt-0.5">{loginTagline}</p>
            </div>

            {/* Error alert */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">!</span>
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="you@barangay.gov.ph"
                    required
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 mt-2"
              >
                {loading
                  ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><LogIn size={16} /> Sign In</>
                }
              </button>
            </form>

            {/* Quick access */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 text-center mb-3 font-bold uppercase tracking-widest">Quick Access</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { role: 'Admin',     email: 'admin@barangay.gov.ph',    pass: 'Admin@2024',     color: 'bg-violet-100 text-violet-800' },
                  { role: 'Secretary', email: 'secretary@barangay.gov.ph', pass: 'Secretary@2024', color: 'bg-blue-100 text-blue-800' },
                  { role: 'Captain',   email: 'captain@barangay.gov.ph',   pass: 'Captain@2024',   color: 'bg-indigo-100 text-indigo-800' },
                  { role: 'Treasurer', email: 'treasurer@barangay.gov.ph', pass: 'Treasurer@2024', color: 'bg-teal-100 text-teal-800' },
                ].map(u => (
                  <button
                    key={u.role}
                    type="button"
                    onClick={() => setForm({ email: u.email, password: u.pass })}
                    className="text-left px-3 py-2.5 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition group"
                  >
                    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mb-1 ${u.color}`}>{u.role}</span>
                    <span className="text-[10px] text-gray-400 block leading-none">{u.pass}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-indigo-300/60 text-xs mt-5">
          {barangayName} &copy; {new Date().getFullYear()} — {loginTagline}
        </p>
      </div>
    </div>
  );
}
