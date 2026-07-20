import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';
import { Megaphone, X, Bell, ChevronLeft, ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'dismissed_announcements';

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function addDismissed(id) {
  const list = getDismissed();
  if (!list.includes(id)) {
    list.push(id);
    // Keep only last 100 to avoid bloat
    if (list.length > 100) list.splice(0, list.length - 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

export default function AnnouncementPopup() {
  const { isAuthenticated } = useAuth();
  const [queue, setQueue] = useState([]);     // undismissed new announcements
  const [index, setIndex] = useState(0);      // which one is showing
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const polledIds = useRef(new Set());        // ids we already evaluated this session

  const fetchAndQueue = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiClient.get('/announcements');
      const all = res.data.announcements || [];
      const dismissed = getDismissed();

      // Find announcements we haven't shown yet this session AND aren't dismissed
      const newOnes = all.filter(a =>
        !dismissed.includes(a.id) && !polledIds.current.has(a.id)
      );

      newOnes.forEach(a => polledIds.current.add(a.id));

      if (newOnes.length > 0) {
        setQueue(prev => {
          const existing = prev.map(a => a.id);
          const toAdd = newOnes.filter(a => !existing.includes(a.id));
          return [...prev, ...toAdd];
        });
        setIndex(0);
        setVisible(true);
        setMinimized(false);
      }
    } catch (_) {}
  }, [isAuthenticated]);

  // On mount — load once then poll every 30 s
  useEffect(() => {
    fetchAndQueue();
    const iv = setInterval(fetchAndQueue, 30000);
    return () => clearInterval(iv);
  }, [fetchAndQueue]);

  const current = queue[index];

  const dismiss = (id) => {
    addDismissed(id);
    const remaining = queue.filter(a => a.id !== id);
    if (remaining.length === 0) { setVisible(false); setQueue([]); }
    else { setQueue(remaining); setIndex(i => Math.min(i, remaining.length - 1)); }
  };

  const dismissAll = () => {
    queue.forEach(a => addDismissed(a.id));
    setVisible(false);
    setQueue([]);
  };

  const prev = () => setIndex(i => (i - 1 + queue.length) % queue.length);
  const next = () => setIndex(i => (i + 1) % queue.length);

  if (!visible || !current) return null;

  /* ── Minimized bell badge ── */
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 transition animate-pop-in"
        title="View announcements"
      >
        <Bell size={22} />
        {queue.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {queue.length}
          </span>
        )}
      </button>
    );
  }

  /* ── Full popup ── */
  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] animate-pop-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <Megaphone size={14} className="text-white" />
            </div>
            <span className="text-white font-semibold text-sm">New Announcement</span>
            {queue.length > 1 && (
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {index + 1}/{queue.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setMinimized(true)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition text-white/80 hover:text-white" title="Minimize">
              <span className="text-xs font-bold">—</span>
            </button>
            <button onClick={dismissAll}
              className="p-1.5 hover:bg-white/20 rounded-lg transition text-white/80 hover:text-white" title="Dismiss all">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-1.5">{current.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
            {current.message}
          </p>
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className="text-xs text-gray-400">{new Date(current.created_at).toLocaleString('en-PH')}</span>
            {current.posted_by_name && (
              <>
                <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">Posted by {current.posted_by_name}</span>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex items-center justify-between gap-2">
          {/* Prev / Next when multiple */}
          {queue.length > 1 ? (
            <div className="flex items-center gap-1">
              <button onClick={prev} className="icon-btn text-gray-400 hover:text-indigo-600"><ChevronLeft size={16}/></button>
              <button onClick={next} className="icon-btn text-gray-400 hover:text-indigo-600"><ChevronRight size={16}/></button>
            </div>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={() => dismiss(current.id)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
              Dismiss
            </button>
            {queue.length > 1 && (
              <button onClick={dismissAll}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/60 transition">
                Dismiss All
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
