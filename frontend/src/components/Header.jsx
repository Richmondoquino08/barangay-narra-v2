import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bell, Megaphone, X } from 'lucide-react';
import apiClient from '../api/apiClient';

const READ_KEY = 'notif_read_ids';

function getReadIds() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')); }
  catch { return new Set(); }
}

function persistRead(ids) {
  const s = getReadIds();
  ids.forEach(id => s.add(id));
  localStorage.setItem(READ_KEY, JSON.stringify([...s].slice(-300)));
}

function relTime(d) {
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff / 60000); const h = Math.floor(m / 60); const day = Math.floor(h / 24);
  if (day > 0) return `${day}d ago`; if (h > 0) return `${h}h ago`; if (m > 0) return `${m}m ago`; return 'Just now';
}

export default function Header({ onSidebarToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifs, setShowNotifs]     = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [unread, setUnread]             = useState(0);
  const notifRef = useRef(null);
  const dropRef  = useRef(null);

  const fetchAnnouncements = async () => {
    try {
      const res = await apiClient.get('/announcements');
      const all = res.data.announcements || [];
      setAnnouncements(all);
      const read = getReadIds();
      setUnread(all.filter(a => !read.has(a.id)).length);
    } catch {}
  };

  useEffect(() => {
    fetchAnnouncements();
    const iv = setInterval(fetchAnnouncements, 30000);
    return () => clearInterval(iv);
  }, []);

  // Close panels on outside click
  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (dropRef.current  && !dropRef.current.contains(e.target))  setShowDropdown(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleNotifs = () => {
    const next = !showNotifs;
    setShowNotifs(next);
    if (next) {
      persistRead(announcements.map(a => a.id));
      setUnread(0);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const getRoleLabel = role => ({
    admin: 'Administrator', secretary: 'Secretary',
    captain: 'Captain', treasurer: 'Treasurer'
  }[role] || role);

  return (
    <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
      <div className="flex items-center justify-between px-6 py-4">

        {/* Left */}
        <div className="flex items-center gap-4">
          <button onClick={onSidebarToggle} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg lg:hidden">
            ☰
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Barangay Management System</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Welcome back, {user?.full_name}</p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={toggleNotifs}
              className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              title="Announcements"
            >
              <Bell size={20} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-600 to-indigo-500">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                      <Megaphone size={14} className="text-white" />
                    </div>
                    <span className="text-white font-semibold text-sm">Announcements</span>
                    {announcements.length > 0 && (
                      <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {announcements.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => { setShowNotifs(false); navigate('/announcements'); }}
                    className="text-white/80 hover:text-white text-xs font-medium hover:underline transition"
                  >
                    View all
                  </button>
                </div>

                {/* List */}
                <div className="max-h-[420px] overflow-y-auto">
                  {announcements.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 dark:text-gray-500">
                      <Bell size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No announcements yet</p>
                    </div>
                  ) : (
                    announcements.map((a, idx) => (
                      <div
                        key={a.id}
                        className={`px-4 py-3.5 border-b border-gray-50 dark:border-gray-700/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition ${idx === 0 ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Megaphone size={14} className="text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight">{a.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">{a.message}</p>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <span className="text-[11px] text-gray-400 dark:text-gray-500">{relTime(a.created_at)}</span>
                              {a.posted_by_name && (
                                <>
                                  <span className="text-[11px] text-gray-300 dark:text-gray-600">·</span>
                                  <span className="text-[11px] text-indigo-500 dark:text-indigo-400 font-medium">
                                    {a.posted_by_name}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User info */}
          <div className="text-right hidden sm:block">
            <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{user?.full_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{getRoleLabel(user?.role)}</p>
          </div>

          {/* Avatar Dropdown */}
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold flex items-center justify-center hover:shadow-lg transition"
            >
              {user?.full_name?.charAt(0).toUpperCase()}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{user?.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>
                </div>
                <div className="p-2">
                  <button onClick={() => { navigate('/profile'); setShowDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                    👤 Profile
                  </button>
                  <button onClick={() => { navigate('/change-password'); setShowDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                    🔑 Change Password
                  </button>
                  <button onClick={() => { navigate('/settings'); setShowDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                    ⚙️ Settings
                  </button>
                </div>
                <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                  <button onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition font-semibold">
                    🚪 Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
