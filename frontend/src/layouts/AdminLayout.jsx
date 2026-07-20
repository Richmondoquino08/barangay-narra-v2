import React, { useState, useRef, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import AnnouncementPopup from '../components/AnnouncementPopup';
import { Bell, Search, Menu, Moon, Sun, Users, FileText, AlertTriangle, X,
         ChevronRight, LogOut, Settings, Megaphone, DollarSign,
         BarChart2, Shield, HardHat } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/apiClient';

const NOTIF_READ_KEY = 'notif_read_ids';
function getReadIds() {
  try { return new Set(JSON.parse(localStorage.getItem(NOTIF_READ_KEY) || '[]')); }
  catch { return new Set(); }
}
function markRead(ids) {
  const s = getReadIds();
  ids.forEach(id => s.add(id));
  localStorage.setItem(NOTIF_READ_KEY, JSON.stringify([...s].slice(-300)));
}
function relTime(d) {
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff/60000), h = Math.floor(m/60), day = Math.floor(h/24);
  return day>0?`${day}d ago`:h>0?`${h}h ago`:m>0?`${m}m ago`:'Just now';
}

const PAGE_TITLES = {
  // Role dashboards (must precede generic /dashboard)
  '/captain-dashboard':   'Dashboard',
  '/secretary-dashboard': 'Dashboard',
  '/treasurer-dashboard': 'Dashboard',
  '/dashboard':           'Dashboard',
  // Records
  '/residents':    'Residents',
  '/certificates': 'Certificates',
  '/blotter':      'Blotter',
  // Finance sub-pages (must precede generic /finance)
  '/finance/brgy-id':      'Barangay ID',
  '/finance/kidlat':       'KIDLAT Members',
  '/finance/trip':         'Trip Ticket',
  '/finance/pcf':          'Petty Cash Fund',
  '/finance/sppcv':        'Petty Cash Vouchers',
  '/finance/rao':          'RAO (Obligations)',
  '/finance/obr':          'Obligation Request',
  '/finance/pr':           'Purchase Request',
  '/finance/po':           'Purchase Order',
  '/finance/iar':          'Inspection & Acceptance',
  '/finance/ris':          'Requisition & Issue',
  '/finance/dv':           'Disbursement Voucher',
  '/finance/crdr':         'CRDR (Cashbook)',
  '/finance/chbr':         'Cash in Bank (CHBR)',
  '/finance/checks':       'Checks Issued',
  '/finance/collections':  'Itemized Collections',
  '/finance/transmittal':  'Transmittal Letter',
  '/finance':              'Finance',
  '/cheque-print': 'Cheque Print',
  '/reports':      'Reports',
  '/officials':    'Officials',
  '/projects':     'Projects',
  '/assets':       'Assets',
  '/social':       'Social Programs',
  '/drrm':         'BDRRM',
  '/announcements':'Announcements',
  '/documents':    'Documents',
  '/users':        'User Management',
  '/settings':     'Settings',
};

// ── Quick Search ──────────────────────────────────────────────────────────
const QUICK_LINKS = [
  { label: 'Residents',     path: '/residents',     icon: Users,         color: '#3B82F6' },
  { label: 'Certificates',  path: '/certificates',  icon: FileText,      color: '#8B5CF6' },
  { label: 'Blotter',       path: '/blotter',       icon: AlertTriangle, color: '#EF4444' },
  { label: 'Finance',       path: '/finance',       icon: DollarSign,    color: '#10B981' },
  { label: 'Officials',     path: '/officials',     icon: Shield,        color: '#F97316' },
  { label: 'Projects',      path: '/projects',      icon: HardHat,       color: '#EAB308' },
  { label: 'Reports',       path: '/reports',       icon: BarChart2,     color: '#6366F1' },
  { label: 'Announcements', path: '/announcements', icon: Megaphone,     color: '#F59E0B' },
];

const TYPE_META = {
  residents:    { icon: Users,         color: '#3B82F6', label: 'Resident',    path: r => `/residents/${r.id}` },
  certificates: { icon: FileText,      color: '#8B5CF6', label: 'Certificate', path: () => '/certificates' },
  blotters:     { icon: AlertTriangle, color: '#EF4444', label: 'Blotter',     path: () => '/blotter' },
};

function Hl({ text, q }) {
  if (!q || !text) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark style={{ background:'rgba(99,102,241,0.22)', color:'inherit', borderRadius:2, padding:'0 1px' }}>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

function StatusDot({ status }) {
  const c = { approved:'#10b981', completed:'#10b981', active:'#f59e0b', pending:'#f59e0b', rejected:'#ef4444', closed:'#94a3b8' }[status] || '#94a3b8';
  return <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 inline-block" style={{ background: c }} />;
}

function QuickSearch() {
  const { darkMode: D } = useTheme();
  const navigate     = useNavigate();
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState(null);   // null = not searched yet
  const [loading,   setLoading]   = useState(false);
  const [open,      setOpen]      = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef    = useRef(null);
  const containerRef= useRef(null);
  const debounceRef = useRef(null);
  const abortRef    = useRef(null);
  const listRef     = useRef(null);

  // Flatten results for keyboard nav — order must match render order
  const groups = results
    ? Object.entries(TYPE_META)
        .map(([key, meta]) => ({ key, meta, items: results[key] || [] }))
        .filter(g => g.items.length > 0)
    : [];
  const flatItems = groups.flatMap(g => g.items.map(item => ({ item, meta: g.meta })));

  // ── Global keyboard shortcuts
  useEffect(() => {
    function h(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        setQuery('');
        setActiveIdx(-1);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open]);

  // ── Click outside
  useEffect(() => {
    function h(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  // ── Search with debounce + abort
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults(null);
      setActiveIdx(-1);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await apiClient.get('/search', { params: { q: query }, signal: ctrl.signal });
        setResults(res.data.results);
        setActiveIdx(-1);
      } catch (err) {
        if (err.code !== 'ERR_CANCELED') setResults({ residents:[], certificates:[], blotters:[] });
      } finally {
        setLoading(false);
      }
    }, 240);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function go(path) { navigate(path); setQuery(''); setOpen(false); setActiveIdx(-1); }

  function handleKeyDown(e) {
    if (!open) return;
    const showingLinks = query.length < 2;
    const maxIdx = showingLinks ? QUICK_LINKS.length - 1 : flatItems.length - 1;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, maxIdx)); }
    else if (e.key === 'ArrowUp')  { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      if (showingLinks) {
        go(QUICK_LINKS[activeIdx].path);
      } else if (flatItems[activeIdx]) {
        const { item, meta } = flatItems[activeIdx];
        go(meta.path(item));
      }
    }
  }

  // Color tokens
  const inputBg  = D ? 'rgba(18,21,31,0.90)'   : 'rgba(241,245,249,0.88)';
  const inputBdr = D ? 'rgba(255,255,255,0.08)' : 'rgba(226,232,240,0.80)';
  const inputClr = D ? '#dde3f0'                : '#0f172a';
  const dropBg   = D ? 'rgba(14,17,27,0.98)'   : '#ffffff';
  const dropBdr  = D ? 'rgba(255,255,255,0.08)' : 'rgba(226,232,240,0.80)';
  const labelClr = D ? '#c4ccdf'                : '#1e293b';
  const subClr   = D ? 'rgba(140,150,180,0.75)' : 'rgba(100,116,139,0.75)';
  const divClr   = D ? 'rgba(255,255,255,0.06)' : 'rgba(226,232,240,0.60)';
  const faintClr = D ? 'rgba(100,110,140,0.60)' : 'rgba(148,163,184,0.70)';
  const hdrClr   = D ? 'rgba(120,130,160,0.70)' : 'rgba(100,116,139,0.60)';
  const hovBg    = D ? 'rgba(99,102,241,0.10)'  : 'rgba(99,102,241,0.06)';
  const actBg    = D ? 'rgba(99,102,241,0.18)'  : 'rgba(99,102,241,0.10)';

  const totalFound = flatItems.length;

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">

      {/* Input */}
      <div className="relative flex items-center">
        {loading
          ? <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin pointer-events-none" />
          : <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: D ? 'rgba(100,116,139,0.70)' : 'rgba(148,163,184,0.80)' }} />
        }
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search residents, certificates, blotter…"
          autoComplete="off"
          spellCheck={false}
          className="w-full pl-11 pr-20 py-2.5 text-sm rounded-2xl transition-all duration-150"
          style={{ background: inputBg, border: `1.5px solid ${open ? 'rgba(99,102,241,0.40)' : inputBdr}`,
            color: inputClr, backdropFilter: 'blur(8px)',
            boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.12)' : undefined, outline: 'none' }}
        />
        <div className="absolute right-3 flex items-center gap-1.5">
          {query ? (
            <button onClick={() => { setQuery(''); setResults(null); setActiveIdx(-1); inputRef.current?.focus(); }}
              className="p-1 rounded-lg transition" style={{ color: D ? 'rgba(100,116,139,0.8)' : 'rgba(148,163,184,0.8)' }}>
              <X size={13} />
            </button>
          ) : (
            <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ background: D ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                color: D ? 'rgba(150,160,190,0.7)' : 'rgba(100,116,139,0.8)',
                border: D ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)' }}>
              Ctrl K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl z-50 overflow-hidden"
          style={{ background: dropBg, border: `1.5px solid ${dropBdr}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10)',
            backdropFilter: 'blur(20px)', maxHeight: '75vh', overflowY: 'auto' }}
          ref={listRef}>

          {/* Quick links — shown when input is empty or < 2 chars */}
          {query.length < 2 && (
            <>
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: hdrClr }}>Jump to</p>
              </div>
              <div className="px-2 pb-2 grid grid-cols-2 gap-0.5">
                {QUICK_LINKS.map((lnk, i) => {
                  const Icon = lnk.icon;
                  const active = activeIdx === i;
                  return (
                    <button key={lnk.path} data-idx={i} onClick={() => go(lnk.path)}
                      onMouseEnter={() => setActiveIdx(i)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors duration-75 w-full"
                      style={{ background: active ? actBg : undefined }}>
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${lnk.color}18` }}>
                        <Icon size={13} style={{ color: lnk.color }} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: labelClr }}>{lnk.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="px-4 py-2" style={{ borderTop: `1px solid ${divClr}` }}>
                <p className="text-[10px]" style={{ color: faintClr }}>Type to search · <kbd style={{ fontFamily:'monospace' }}>↑↓</kbd> navigate · <kbd style={{ fontFamily:'monospace' }}>↵</kbd> open · <kbd style={{ fontFamily:'monospace' }}>Esc</kbd> close</p>
              </div>
            </>
          )}

          {/* Search results */}
          {query.length >= 2 && !loading && results && (
            totalFound === 0 ? (
              <div className="px-5 py-6 text-center">
                <Search size={22} className="mx-auto mb-2" style={{ color: faintClr, opacity: 0.4 }} />
                <p className="text-sm font-medium" style={{ color: subClr }}>No results for <strong style={{ color: labelClr }}>"{query}"</strong></p>
                <p className="text-xs mt-1" style={{ color: faintClr }}>Try a resident name, case number, or document type</p>
              </div>
            ) : (
              <div className="py-1">
                {(() => {
                  let flatIdx = 0;
                  return groups.map(({ key, meta, items }) => {
                    const Icon = meta.icon;
                    const groupStart = flatIdx;
                    flatIdx += items.length;
                    return (
                      <div key={key}>
                        {/* Group header */}
                        <div className="flex items-center gap-2 px-4 pt-2.5 pb-1">
                          <Icon size={11} style={{ color: meta.color }} />
                          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: hdrClr }}>
                            {meta.label}s
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background: `${meta.color}18`, color: meta.color }}>{items.length}</span>
                        </div>
                        {/* Items */}
                        {items.map((item, ii) => {
                          const idx = groupStart + ii;
                          const active = activeIdx === idx;
                          return (
                            <button key={item.id} data-idx={idx}
                              onClick={() => go(meta.path(item))}
                              onMouseEnter={() => setActiveIdx(idx)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-75"
                              style={{ background: active ? actBg : undefined }}>
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: `${meta.color}15` }}>
                                <Icon size={13} style={{ color: meta.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: labelClr }}>
                                  <Hl text={item.name} q={query} />
                                </p>
                                {item.sub && (
                                  <p className="text-xs truncate capitalize mt-0.5" style={{ color: subClr }}>
                                    <Hl text={item.sub} q={query} />
                                    {item.complainant && item.complainant !== item.name && (
                                      <> · <span style={{ color: faintClr }}>{item.complainant}</span></>
                                    )}
                                  </p>
                                )}
                              </div>
                              {item.status && (
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <StatusDot status={item.status} />
                                  <span className="text-[10px] capitalize" style={{ color: subClr }}>{item.status}</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
                <div className="px-4 py-2 flex items-center justify-between" style={{ borderTop: `1px solid ${divClr}` }}>
                  <span className="text-[10px]" style={{ color: faintClr }}>{totalFound} result{totalFound !== 1 ? 's' : ''} · <kbd style={{ fontFamily:'monospace' }}>↑↓</kbd> navigate · <kbd style={{ fontFamily:'monospace' }}>↵</kbd> open</span>
                  <button className="text-[10px] font-medium" style={{ color: 'var(--primary)' }}
                    onClick={() => { go('/residents'); }}>
                    Search residents →
                  </button>
                </div>
              </div>
            )
          )}

          {/* Loading */}
          {query.length >= 2 && loading && (
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin flex-shrink-0" />
              <span className="text-sm" style={{ color: subClr }}>Searching…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main layout ───────────────────────────────────────────────────────────
export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const { user, logout }    = useAuth();
  const { darkMode, toggleDark, barangayName, logo, primaryColor } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [notifOpen, setNotifOpen]         = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [unread, setUnread]               = useState(0);
  const notifRef = useRef(null);

  const D        = darkMode;
  const initials = user?.full_name?.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()||'U';
  const pageTitle= Object.entries(PAGE_TITLES).find(([p])=>location.pathname.startsWith(p))?.[1]||'Dashboard';
  const roleLbl  = { admin:'Administrator', secretary:'Secretary', captain:'Punong Barangay', treasurer:'Treasurer' };

  useEffect(() => {
    function h(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await apiClient.get('/announcements');
        const all = res.data.announcements || [];
        setAnnouncements(all);
        setUnread(all.filter(a => !getReadIds().has(a.id)).length);
      } catch {}
    };
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 30000);
    return () => clearInterval(iv);
  }, []);

  // Dark/light tokens
  const headerBg  = D ? 'rgba(8,11,18,0.90)'        : 'rgba(240,242,248,0.90)';
  const headerBdr = D ? 'rgba(255,255,255,0.06)'     : 'rgba(226,232,240,0.65)';
  const headerShd = D ? '0 4px 24px rgba(0,0,0,0.40)' : '0 4px 16px rgba(0,0,0,0.04)';
  const titleClr  = D ? '#e8ecf4'  : '#0f172a';
  const subClr    = D ? 'rgba(140,150,180,0.60)' : 'rgba(100,116,139,0.65)';
  const btnClr    = D ? 'rgba(140,150,180,0.65)' : '#64748b';
  const btnHovBg  = D ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const chipBg    = D ? 'rgba(18,21,31,0.90)'    : 'rgba(255,255,255,0.85)';
  const chipBdr   = D ? 'rgba(255,255,255,0.08)' : 'rgba(226,232,240,0.90)';
  const chipHovBg = D ? 'rgba(26,30,46,0.95)'    : 'rgba(255,255,255,0.95)';
  const chipNm    = D ? '#e8ecf4'  : '#0f172a';
  const chipRole  = D ? 'rgba(140,150,180,0.70)' : 'rgba(100,116,139,0.80)';
  const dropBg    = D ? 'rgba(12,15,25,0.98)'    : 'rgba(255,255,255,0.98)';
  const dropBdr   = D ? 'rgba(255,255,255,0.08)' : 'rgba(226,232,240,0.80)';
  const dropNm    = D ? '#e8ecf4'  : '#0f172a';
  const dropEmail = D ? 'rgba(140,150,180,0.70)' : '#64748b';
  const dropDivBdr= D ? 'rgba(255,255,255,0.06)' : 'rgba(226,232,240,0.60)';
  const dropItmC  = D ? '#c4ccdf'  : '#374151';
  const dropItmHov= D ? 'rgba(99,102,241,0.10)'  : 'rgba(99,102,241,0.05)';
  const footBg    = D ? 'rgba(8,11,18,0.70)'     : 'rgba(248,250,252,0.80)';
  const footBdr   = D ? 'rgba(255,255,255,0.05)' : 'rgba(226,232,240,0.70)';
  const footClr   = D ? 'rgba(100,110,140,0.55)' : 'rgba(148,163,184,0.70)';

  return (
    <div className="min-h-screen flex font-sans">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(p=>!p)} isMobile={isMobile} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Top bar ───────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 px-4 sm:px-6"
          style={{ background:headerBg, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
            borderBottom:`1px solid ${headerBdr}`, boxShadow:headerShd }}>
          <div className="flex items-center h-16 gap-4">

            {/* Left — menu + page title */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-xl transition-all duration-150"
                style={{ color: btnClr }}
                onMouseEnter={e => { e.currentTarget.style.background=btnHovBg; }}
                onMouseLeave={e => { e.currentTarget.style.background=''; }}>
                <Menu size={19}/>
              </button>
              <div>
                <h1 className="text-sm font-bold leading-none" style={{ color: titleClr }}>{pageTitle}</h1>
                <p className="text-[10px] mt-0.5 hidden sm:block" style={{ color: subClr }}>{barangayName}</p>
              </div>
            </div>

            {/* Center — Quick Search (hidden on mobile) */}
            <div className="flex-1 hidden sm:flex justify-center px-2">
              <QuickSearch/>
            </div>

            {/* Right — dark mode + user */}
            <div className="flex items-center gap-2 flex-shrink-0">

              {/* Dark / Light pill toggle */}
              <button onClick={() => {
                const next = !darkMode;
                localStorage.setItem('darkMode', next);

                // Inject keyframe CSS once
                if (!document.getElementById('__theme-spin')) {
                  const s = document.createElement('style');
                  s.id = '__theme-spin';
                  s.textContent = `
                    @keyframes __tspin { to { transform: rotate(360deg); } }
                    @keyframes __tfade { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
                    @keyframes __tpulse { 0%,100%{opacity:0.4;transform:scale(0.85);} 50%{opacity:1;transform:scale(1.1);} }
                  `;
                  document.head.appendChild(s);
                }

                // Build overlay
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                  position:fixed;inset:0;z-index:99999;
                  background:${next ? '#0b0e1a' : '#eef0f7'};
                  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;
                  opacity:0;transition:opacity 0.18s ease;font-family:inherit;
                `;

                // Spinner ring
                const ring = document.createElement('div');
                ring.style.cssText = `
                  position:relative;width:56px;height:56px;
                `;
                const track = document.createElement('div');
                track.style.cssText = `
                  position:absolute;inset:0;border-radius:50%;
                  border:3px solid ${primaryColor}22;
                `;
                const spin = document.createElement('div');
                spin.style.cssText = `
                  position:absolute;inset:0;border-radius:50%;
                  border:3px solid transparent;
                  border-top-color:${primaryColor};
                  animation:__tspin 0.75s linear infinite;
                `;
                const dot = document.createElement('div');
                dot.style.cssText = `
                  position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
                `;
                const dotInner = document.createElement('div');
                dotInner.style.cssText = `
                  width:10px;height:10px;border-radius:50%;background:${primaryColor};
                  animation:__tpulse 1s ease-in-out infinite;
                `;
                dot.appendChild(dotInner);
                ring.appendChild(track);
                ring.appendChild(spin);
                ring.appendChild(dot);

                // Label
                const label = document.createElement('div');
                label.style.cssText = `
                  display:flex;flex-direction:column;align-items:center;gap:4px;
                  animation:__tfade 0.25s ease forwards;
                `;
                const title = document.createElement('p');
                title.textContent = next ? 'Switching to Dark Mode' : 'Switching to Light Mode';
                title.style.cssText = `
                  margin:0;font-size:14px;font-weight:700;letter-spacing:0.01em;
                  color:${next ? '#e2e8f0' : '#1e293b'};
                `;
                const sub = document.createElement('p');
                sub.textContent = 'Please wait…';
                sub.style.cssText = `margin:0;font-size:12px;color:${next?'#64748b':'#94a3b8'};`;
                label.appendChild(title);
                label.appendChild(sub);

                overlay.appendChild(ring);
                overlay.appendChild(label);
                document.body.appendChild(overlay);
                requestAnimationFrame(() => { overlay.style.opacity = '1'; });

                toggleDark();
                setTimeout(() => window.location.reload(), 500);
              }} title={darkMode ? 'Switch to Light mode' : 'Switch to Dark mode'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 select-none"
                style={{
                  background: darkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)',
                  border: darkMode ? '1.5px solid rgba(255,255,255,0.14)' : '1.5px solid rgba(0,0,0,0.10)',
                  color: darkMode ? '#e2e8f0' : '#475569',
                  boxShadow: darkMode ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'inset 0 1px 0 rgba(255,255,255,0.80)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.11)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)'; }}>
                {/* Track */}
                <div className="relative w-8 h-4 rounded-full transition-all duration-300 flex-shrink-0"
                  style={{ background: darkMode ? primaryColor : '#cbd5e1' }}>
                  <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all duration-300"
                    style={{ left: darkMode ? 'calc(100% - 14px)' : '2px' }}/>
                </div>
                {darkMode ? <Moon size={13}/> : <Sun size={13}/>}
                <span className="text-xs font-semibold hidden sm:block">{darkMode ? 'Dark' : 'Light'}</span>
              </button>

              {/* Notification Bell */}
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => { const next=!notifOpen; setNotifOpen(next); if(next){markRead(announcements.map(a=>a.id));setUnread(0);} }}
                  title="Notifications"
                  className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150"
                  style={{
                    color: primaryColor,
                    background: notifOpen ? `${primaryColor}22` : `${primaryColor}14`,
                    border: notifOpen ? `1.5px solid ${primaryColor}55` : `1.5px solid ${primaryColor}28`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background=`${primaryColor}28`; e.currentTarget.style.borderColor=`${primaryColor}60`; }}
                  onMouseLeave={e => { if(!notifOpen){ e.currentTarget.style.background=`${primaryColor}14`; e.currentTarget.style.borderColor=`${primaryColor}28`; } }}>
                  <Bell size={18}/>
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-2xl z-50 overflow-hidden"
                    style={{ background:dropBg, border:`1.5px solid ${dropBdr}`,
                      boxShadow:'0 20px 60px rgba(0,0,0,0.20), 0 4px 16px rgba(0,0,0,0.10)',
                      backdropFilter:'blur(20px)' }}>

                    {/* Panel header */}
                    <div className="flex items-center justify-between px-4 py-3"
                      style={{ background:'linear-gradient(90deg,#6366f1,#4f46e5)', borderBottom:`1px solid ${dropDivBdr}` }}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                          <Bell size={13} className="text-white"/>
                        </div>
                        <span className="text-white font-semibold text-sm">Notifications</span>
                        {announcements.length > 0 && (
                          <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {announcements.length}
                          </span>
                        )}
                      </div>
                      <button onClick={()=>{ setNotifOpen(false); navigate('/announcements'); }}
                        className="text-white/70 hover:text-white text-xs font-medium hover:underline transition">
                        View all
                      </button>
                    </div>

                    {/* List */}
                    <div className="max-h-[420px] overflow-y-auto">
                      {announcements.length === 0 ? (
                        <div className="py-12 text-center" style={{ color: D?'rgba(255,255,255,0.3)':'#9ca3af' }}>
                          <Bell size={30} className="mx-auto mb-2 opacity-20"/>
                          <p className="text-sm">No notifications yet</p>
                        </div>
                      ) : announcements.map((a, idx) => (
                        <div key={a.id}
                          className="px-4 py-3.5 border-b last:border-0 transition-colors"
                          style={{
                            borderColor: D?'rgba(255,255,255,0.06)':'#f3f4f6',
                            background: idx===0 ? (D?'rgba(99,102,241,0.08)':'rgba(99,102,241,0.04)') : 'transparent',
                          }}>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ background: D?'rgba(245,158,11,0.15)':'rgba(245,158,11,0.12)' }}>
                              <Megaphone size={13} style={{ color:'#f59e0b' }}/>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm leading-tight" style={{ color: dropNm }}>{a.title}</p>
                              <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: dropEmail }}>{a.message}</p>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span className="text-[11px]" style={{ color: D?'rgba(255,255,255,0.28)':'#9ca3af' }}>{relTime(a.created_at)}</span>
                                {a.posted_by_name && (
                                  <>
                                    <span className="text-[11px]" style={{ color: D?'rgba(255,255,255,0.15)':'#d1d5db' }}>·</span>
                                    <span className="text-[11px] font-medium" style={{ color:'#818cf8' }}>{a.posted_by_name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User chip */}
              <div ref={userMenuRef} className="relative">
                <button onClick={() => setUserMenuOpen(p=>!p)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-2xl transition-all duration-150"
                  style={{
                    background: userMenuOpen ? chipHovBg : chipBg,
                    border: `1.5px solid ${chipBdr}`,
                    boxShadow: userMenuOpen ? '0 4px 14px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={e => { if (!userMenuOpen) e.currentTarget.style.background=chipHovBg; }}
                  onMouseLeave={e => { if (!userMenuOpen) e.currentTarget.style.background=chipBg; }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black flex-shrink-0"
                    style={{ background:'linear-gradient(135deg,var(--primary),var(--primary-hover))', boxShadow:'0 2px 6px var(--primary-shadow)' }}>
                    {initials}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-bold leading-none" style={{ color: chipNm }}>{user?.full_name}</p>
                    <p className="text-[10px] mt-0.5 capitalize" style={{ color: chipRole }}>
                      {roleLbl[user?.role] || user?.role}
                    </p>
                  </div>
                  <ChevronRight size={13} className={`transition-transform duration-200 ${userMenuOpen?'rotate-90':''}`}
                    style={{ color: D?'rgba(100,116,139,0.60)':'rgba(148,163,184,0.70)' }}/>
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl z-50 overflow-hidden"
                    style={{ background:dropBg, border:`1.5px solid ${dropBdr}`,
                      boxShadow:'0 16px 48px rgba(0,0,0,0.20), 0 4px 12px rgba(0,0,0,0.10)',
                      backdropFilter:'blur(20px)' }}>

                    {/* User info */}
                    <div className="px-4 py-3.5" style={{ borderBottom:`1px solid ${dropDivBdr}` }}>
                      <p className="text-sm font-bold" style={{ color: dropNm }}>{user?.full_name}</p>
                      <p className="text-xs mt-0.5" style={{ color: dropEmail }}>{user?.email}</p>
                      <span className="inline-flex mt-1.5 items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
                        style={{ background:'rgba(99,102,241,0.12)', color:'var(--primary)' }}>
                        {roleLbl[user?.role] || user?.role}
                      </span>
                    </div>

                    {user?.role === 'admin' && (
                      <button onClick={()=>{ navigate('/settings'); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-all"
                        style={{ color: dropItmC }}
                        onMouseEnter={e => { e.currentTarget.style.background=dropItmHov; }}
                        onMouseLeave={e => { e.currentTarget.style.background=''; }}>
                        <Settings size={14} style={{ color: D?'rgba(100,116,139,0.60)':'#94a3b8' }}/>
                        Settings
                      </button>
                    )}

                    <button onClick={()=>{ logout(); navigate('/login'); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-all"
                      style={{ color:'#ef4444', borderTop:`1px solid ${dropDivBdr}` }}
                      onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background=''; }}>
                      <LogOut size={14}/>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ── Main ─ margin ─────────────────────────────────────────────── */}
        <main className="flex-1 p-5 sm:p-7">{children}</main>

        {/* ── Footer ────────────────────────────────────────────── */}
        <footer className="px-6 py-3 flex items-center justify-between"
          style={{ borderTop:`1px solid ${footBdr}`, background:footBg, backdropFilter:'blur(8px)' }}>
          <span className="text-xs" style={{ color:footClr }}>{barangayName} — Management Information System</span>
          <span className="text-xs" style={{ color:footClr }}>&copy; {new Date().getFullYear()}</span>
        </footer>
      </div>

      <AnnouncementPopup/>
    </div>
  );
}
