import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { residentsAPI, blotterAPI, drrmAPI, announcementsAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Badge from '../components/Badge';
import NoAccessModal from '../components/NoAccessModal';
import { ROUTE_ROLES, ROUTE_LABELS } from '../utils/routeRoles';
import {
  Users, AlertTriangle, AlertOctagon,
  Shield, BarChart2, Megaphone, ChevronRight, Bell, CheckCircle,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const QUICK_ACTIONS = [
  { label: 'Blotter',       path: '/blotter',       icon: AlertTriangle, color: '#EF4444' },
  { label: 'DRRM',          path: '/drrm',          icon: AlertOctagon,  color: '#DC2626' },
  { label: 'Officials',     path: '/officials',     icon: Shield,        color: '#8B5CF6' },
  { label: 'Reports',       path: '/reports',       icon: BarChart2,     color: '#6366F1' },
  { label: 'Announcements', path: '/announcements', icon: Megaphone,     color: '#0EA5E9' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function severityColor(severity) {
  const s = (severity || '').toLowerCase();
  if (s === 'critical' || s === 'high') return '#EF4444';
  if (s === 'medium') return '#F59E0B';
  return '#3B82F6';
}

function BarTooltip({ active, payload, isDark }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className={`text-xs px-3 py-2 rounded-lg shadow-lg border ${isDark ? 'bg-[#1a1d27] border-[#2e334a] text-slate-200' : 'bg-white border-gray-200 text-gray-800'}`}>
      <p className="font-semibold mb-0.5">{d.payload.name}</p>
      <p style={{ color: d.payload.color }}>{d.value} cases</p>
    </div>
  );
}

export default function CaptainDashboard() {
  const { user, hasRole }    = useAuth();
  const { darkMode: isDark } = useTheme();
  const navigate             = useNavigate();

  const [data, setData] = useState({
    residents: 0,
    blotters: [], pendingBltCount: 0,
    incidents: [], incidentCount: 0,
    announcements: [],
  });
  const [loading, setLoading]           = useState(true);
  const [noAccessModal, setNoAccessModal] = useState({ open: false, feature: '' });

  useEffect(() => {
    async function load() {
      try {
        const [res, blt, drm, ann] = await Promise.allSettled([
          residentsAPI.getAll(1, 1),
          blotterAPI.getAll({ status: 'pending' }),
          drrmAPI.getAll({}),
          announcementsAPI.getAll(),
        ]);
        const allBlotters      = blt.value?.data?.records       || [];
        const allIncidents     = drm.value?.data?.incidents     || [];
        const allAnnouncements = ann.value?.data?.announcements || [];
        setData({
          residents:       res.value?.data?.total || 0,
          blotters:        allBlotters.slice(0, 5),
          pendingBltCount: allBlotters.length,
          incidents:       allIncidents.slice(0, 4),
          incidentCount:   allIncidents.length,
          announcements:   allAnnouncements.slice(0, 5),
        });
      } catch (_) {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  function guardedNavigate(path) {
    const allowed = ROUTE_ROLES[path];
    if (!allowed || hasRole(allowed)) navigate(path);
    else setNoAccessModal({ open: true, feature: ROUTE_LABELS[path] || path });
  }

  const bd   = isDark ? 'border-[#2e334a]' : 'border-gray-200';
  const bg   = isDark ? 'bg-[#0d1117]'     : 'bg-white';
  const txt  = isDark ? 'text-slate-100'   : 'text-gray-900';
  const sub  = isDark ? 'text-slate-500'   : 'text-gray-400';
  const hov  = isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-gray-50/70';
  const divC = isDark ? 'divide-[#2e334a]' : 'divide-gray-200';
  const axTick = { fontSize: 10, fill: isDark ? '#64748b' : '#9ca3af' };

  const BADGE_CLS = {
    blue:    'bg-blue-50    text-blue-600    dark:bg-blue-900/20    dark:text-blue-400',
    rose:    'bg-rose-50    text-rose-600    dark:bg-rose-900/20    dark:text-rose-400',
    orange:  'bg-orange-50  text-orange-600  dark:bg-orange-900/20  dark:text-orange-400',
    amber:   'bg-amber-50   text-amber-600   dark:bg-amber-900/20   dark:text-amber-400',
    sky:     'bg-sky-50     text-sky-600     dark:bg-sky-900/20     dark:text-sky-400',
    gray:    'bg-gray-100   text-gray-400    dark:bg-white/5        dark:text-slate-500',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  };

  const safetyData = [
    { name: 'Blotters',  value: data.pendingBltCount, color: '#EF4444' },
    { name: 'Incidents', value: data.incidentCount,   color: '#DC2626' },
  ];

  const firstName  = user?.full_name?.split(' ')[0] || 'Captain';
  const todayLabel = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const statCells = [
    { label: 'Total Residents',   value: loading ? '...' : String(data.residents),       badge: 'Registered',                                                  bColor: 'blue',                                            path: '/residents'    },
    { label: 'Active Blotters',   value: loading ? '...' : String(data.pendingBltCount), badge: data.pendingBltCount > 0 ? 'Under review' : 'None active',    bColor: data.pendingBltCount > 0 ? 'rose'   : 'gray',      path: '/blotter'      },
    { label: 'DRRM Incidents',    value: loading ? '...' : String(data.incidentCount),   badge: data.incidentCount > 0 ? 'On record' : 'All clear',           bColor: data.incidentCount > 0   ? 'orange' : 'gray',      path: '/drrm'         },
    { label: 'Announcements',     value: loading ? '...' : String(data.announcements.length), badge: 'Latest posted',                                          bColor: 'sky',                                             path: '/announcements'},
  ];

  return (
    <div className="w-full space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-xl font-bold ${txt}`}>{greeting()}, {firstName}</h1>
          <p className={`text-sm mt-0.5 ${sub}`}>{todayLabel}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <Users size={11} /> Barangay Captain
        </span>
      </div>

      {/* Main bordered grid */}
      <div className={`border ${bd} rounded-xl overflow-hidden ${bg}`}>

        {/* Row 1 — Stat cells */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 divide-y divide-x ${divC}`}>
          {statCells.map(cell => (
            <button key={cell.label} onClick={() => guardedNavigate(cell.path)}
              className={`p-5 sm:p-6 text-left transition-colors ${hov}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wider ${sub}`}>{cell.label}</p>
              <p className={`text-3xl sm:text-4xl font-bold mt-2 tabular-nums leading-none ${txt}`}>{cell.value}</p>
              <div className="mt-3">
                <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium ${BADGE_CLS[cell.bColor]}`}>
                  {cell.badge}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Row 2 — Public Safety chart + Active Blotters list */}
        <div className={`border-t ${bd} grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 divide-x ${divC}`}>

          {/* Public Safety Overview chart */}
          <div className="p-5 sm:p-6">
            <div className="mb-1">
              <p className={`text-sm font-semibold ${txt}`}>Public Safety Overview</p>
              <p className={`text-xs mt-0.5 ${sub}`}>Active cases across safety modules</p>
            </div>
            <div className="h-52 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={safetyData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barSize={80}>
                  <defs>
                    {safetyData.map((d, i) => (
                      <linearGradient key={d.name} id={`cg${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={d.color} stopOpacity={0.88} />
                        <stop offset="100%" stopColor={d.color} stopOpacity={0.04} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis dataKey="name" tick={axTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axTick} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<BarTooltip isDark={isDark} />}
                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {safetyData.map((d, i) => <Cell key={d.name} fill={`url(#cg${i})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Active Blotters list */}
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`text-sm font-semibold ${txt}`}>Active Blotter Cases</p>
                <p className={`text-xs mt-0.5 ${sub}`}>Cases pending resolution</p>
              </div>
              <button onClick={() => guardedNavigate('/blotter')}
                className={`text-xs flex items-center gap-0.5 transition-colors ${isDark ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700'}`}>
                View all <ChevronRight size={12} />
              </button>
            </div>
            {data.blotters.length === 0 ? (
              <div className={`py-8 text-center text-sm ${sub}`}>
                <CheckCircle size={24} className="mx-auto mb-2 text-emerald-400 opacity-60" />
                No active blotters
              </div>
            ) : (
              <div className={`divide-y ${divC}`}>
                {data.blotters.map(b => (
                  <div key={b.id} className={`flex items-center justify-between py-2.5 ${hov} transition-colors`}>
                    <div className="min-w-0 mr-3 flex-1">
                      <p className={`text-xs font-medium truncate ${txt}`}>{b.incident_type}</p>
                      <p className={`text-[11px] font-mono mt-0.5 ${sub}`}>{b.case_number}</p>
                    </div>
                    <Badge status={b.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 3 — DRRM Incidents + Announcements + Quick Actions */}
        <div className={`border-t ${bd} grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 divide-x ${divC}`}>

          {/* DRRM Incidents */}
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`text-sm font-semibold ${txt}`}>DRRM Incidents</p>
                <p className={`text-xs mt-0.5 ${sub}`}>Recent emergency records</p>
              </div>
              <button onClick={() => guardedNavigate('/drrm')}
                className={`text-xs flex items-center gap-0.5 transition-colors ${isDark ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700'}`}>
                View all <ChevronRight size={12} />
              </button>
            </div>
            {data.incidents.length === 0 ? (
              <div className={`py-6 text-center text-sm ${sub}`}>
                <AlertOctagon size={24} className="mx-auto mb-2 opacity-25" />
                No incidents recorded
              </div>
            ) : (
              <div className={`divide-y ${divC}`}>
                {data.incidents.map(inc => (
                  <div key={inc.id} className={`flex items-center gap-2.5 py-2.5 ${hov} transition-colors`}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: severityColor(inc.severity) }} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium truncate ${txt}`}>{inc.incident_type}</p>
                      <p className={`text-[11px] mt-0.5 ${sub}`}>{fmtDate(inc.created_at)}</p>
                    </div>
                    <span className="text-[10px] font-semibold capitalize flex-shrink-0"
                      style={{ color: severityColor(inc.severity) }}>
                      {inc.severity || inc.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Announcements */}
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`text-sm font-semibold ${txt}`}>Announcements</p>
                <p className={`text-xs mt-0.5 ${sub}`}>Latest posted</p>
              </div>
              <button onClick={() => guardedNavigate('/announcements')}
                className={`text-xs flex items-center gap-0.5 transition-colors ${isDark ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700'}`}>
                View all <ChevronRight size={12} />
              </button>
            </div>
            {data.announcements.length === 0 ? (
              <div className={`py-6 text-center text-sm ${sub}`}>
                <Bell size={24} className="mx-auto mb-2 opacity-25" />
                No announcements
              </div>
            ) : (
              <div className={`divide-y ${divC}`}>
                {data.announcements.map(a => (
                  <div key={a.id} className={`py-2.5 ${hov} transition-colors`}>
                    <p className={`text-xs font-medium truncate ${txt}`}>{a.title}</p>
                    <p className={`text-[11px] mt-0.5 ${sub}`}>{fmtDate(a.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="p-5 sm:p-6">
            <p className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${sub}`}>Quick Actions</p>
            <div className="space-y-1">
              {QUICK_ACTIONS.map(a => {
                const Icon    = a.icon;
                const allowed = ROUTE_ROLES[a.path];
                const ok      = !allowed || hasRole(allowed);
                return (
                  <button key={a.path} onClick={() => guardedNavigate(a.path)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} ${!ok ? 'opacity-40' : ''}`}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: `${a.color}1a` }}>
                      <Icon size={12} style={{ color: a.color }} />
                    </div>
                    <span className={`text-xs font-medium flex-1 truncate ${txt}`}>{a.label}</span>
                    <ChevronRight size={11} className={sub} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <NoAccessModal
        open={noAccessModal.open}
        feature={noAccessModal.feature}
        onClose={() => setNoAccessModal({ open: false, feature: '' })}
      />
    </div>
  );
}
