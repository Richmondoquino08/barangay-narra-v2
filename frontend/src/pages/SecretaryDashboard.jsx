import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { residentsAPI, certificatesAPI, blotterAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Badge from '../components/Badge';
import NoAccessModal from '../components/NoAccessModal';
import { ROUTE_ROLES, ROUTE_LABELS } from '../utils/routeRoles';
import {
  Users, FileText, AlertTriangle,
  AlertOctagon, BarChart2, ChevronRight, CheckCircle,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CERT_LABELS = {
  barangay_clearance:  'Clearance',
  residency:           'Residency',
  indigency:           'Indigency',
  business_permit:     'Business Permit',
  good_moral:          'Good Moral',
  ftjs:                'FTJS',
  no_income:           'No Income',
  senior_citizen_cert: 'Senior Citizen',
  pwd_cert:            'PWD',
  cohabitation:        'Cohabitation',
  guardianship:        'Guardianship',
  travel_permit:       'Travel Permit',
};

const QUICK_ACTIONS = [
  { label: 'Residents',    path: '/residents',    icon: Users,         color: '#3B82F6' },
  { label: 'Certificates', path: '/certificates', icon: FileText,      color: '#8B5CF6' },
  { label: 'Blotter',      path: '/blotter',      icon: AlertTriangle, color: '#EF4444' },
  { label: 'DRRM',         path: '/drrm',         icon: AlertOctagon,  color: '#DC2626' },
  { label: 'Reports',      path: '/reports',      icon: BarChart2,     color: '#6366F1' },
];

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function BarTooltip({ active, payload, isDark }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className={`text-xs px-3 py-2 rounded-lg shadow-lg border ${isDark ? 'bg-[#1a1d27] border-[#2e334a] text-slate-200' : 'bg-white border-gray-200 text-gray-800'}`}>
      <p className="font-semibold mb-0.5">{d.payload.name}</p>
      <p style={{ color: d.payload.color }}>{d.value}</p>
    </div>
  );
}

export default function SecretaryDashboard() {
  const { user, hasRole }    = useAuth();
  const { darkMode: isDark } = useTheme();
  const navigate             = useNavigate();

  const [data, setData] = useState({
    residents:      0,
    certStats:      {},
    recentCerts:    [],
    activeBlotters: 0,
    blotterList:    [],
  });
  const [loading, setLoading]           = useState(true);
  const [noAccessModal, setNoAccessModal] = useState({ open: false, feature: '' });

  useEffect(() => {
    async function load() {
      try {
        const [res, statRes, certsRes, blotRes] = await Promise.allSettled([
          residentsAPI.getAll(1, 1),
          certificatesAPI.getStats(),
          certificatesAPI.getAll({ limit: 5 }),
          blotterAPI.getAll({ status: 'pending' }),
        ]);
        const allBlotters = blotRes.value?.data?.records || [];
        setData({
          residents:      res.value?.data?.total || 0,
          certStats:      statRes.value?.data?.stats || {},
          recentCerts:    certsRes.value?.data?.certificates || [],
          activeBlotters: allBlotters.length,
          blotterList:    allBlotters.slice(0, 4),
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
    violet:  'bg-violet-50  text-violet-600  dark:bg-violet-900/20  dark:text-violet-400',
    blue:    'bg-blue-50    text-blue-600    dark:bg-blue-900/20    dark:text-blue-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    rose:    'bg-rose-50    text-rose-600    dark:bg-rose-900/20    dark:text-rose-400',
    gray:    'bg-gray-100   text-gray-400    dark:bg-white/5        dark:text-slate-500',
  };

  const totalCerts = Number(data.certStats.total)        || 0;
  const certsToday = Number(data.certStats.issued_today) || 0;

  const recordsData = [
    { name: 'Total Certs', value: totalCerts,         color: '#8B5CF6' },
    { name: 'Today',       value: certsToday,         color: '#10B981' },
    { name: 'Blotters',    value: data.activeBlotters, color: '#EF4444' },
  ];

  const firstName  = user?.full_name?.split(' ')[0] || 'Secretary';
  const todayLabel = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const statCells = [
    { label: 'Total Residents',   value: loading ? '...' : String(data.residents),   badge: 'Registered',                                             bColor: 'blue',                                          path: '/residents'    },
    { label: 'Total Certs',       value: loading ? '...' : String(totalCerts),        badge: 'All time',                                               bColor: 'violet',                                        path: '/certificates' },
    { label: 'Certs Today',       value: loading ? '...' : String(certsToday),        badge: certsToday > 0 ? 'Issued today' : 'None yet',            bColor: certsToday > 0       ? 'emerald' : 'gray',       path: '/certificates' },
    { label: 'Active Blotters',   value: loading ? '...' : String(data.activeBlotters), badge: data.activeBlotters > 0 ? 'Under review' : 'All clear', bColor: data.activeBlotters > 0 ? 'rose' : 'gray',      path: '/blotter'      },
  ];

  return (
    <div className="w-full space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-xl font-bold ${txt}`}>{greeting()}, {firstName}</h1>
          <p className={`text-sm mt-0.5 ${sub}`}>{todayLabel}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
          <FileText size={11} /> Secretary
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

        {/* Row 2 — Records chart + Recent Certificates */}
        <div className={`border-t ${bd} grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 divide-x ${divC}`}>

          {/* Records Overview chart */}
          <div className="p-5 sm:p-6">
            <div className="mb-1">
              <p className={`text-sm font-semibold ${txt}`}>Records Overview</p>
              <p className={`text-xs mt-0.5 ${sub}`}>Certificates issued &amp; blotter activity</p>
            </div>
            <div className="h-52 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recordsData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barSize={72}>
                  <defs>
                    {recordsData.map((d, i) => (
                      <linearGradient key={d.name} id={`sg${i}`} x1="0" y1="0" x2="0" y2="1">
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
                    {recordsData.map((d, i) => <Cell key={d.name} fill={`url(#sg${i})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Certificates */}
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`text-sm font-semibold ${txt}`}>Recent Certificates</p>
                <p className={`text-xs mt-0.5 ${sub}`}>Last 5 issued</p>
              </div>
              <button onClick={() => guardedNavigate('/certificates')}
                className={`text-xs flex items-center gap-0.5 transition-colors ${isDark ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700'}`}>
                View all <ChevronRight size={12} />
              </button>
            </div>
            {data.recentCerts.length === 0 ? (
              <div className={`py-8 text-center text-sm ${sub}`}>
                <CheckCircle size={24} className="mx-auto mb-2 opacity-30" />
                No certificates yet
              </div>
            ) : (
              <div className={`divide-y ${divC}`}>
                {data.recentCerts.map(c => (
                  <div key={c.id} className={`flex items-center justify-between py-2.5 ${hov} transition-colors`}>
                    <div className="min-w-0 mr-3 flex-1">
                      <p className={`text-xs font-medium truncate ${txt}`}>{c.resident_name}</p>
                      <p className={`text-[11px] mt-0.5 ${sub}`}>
                        {CERT_LABELS[c.certificate_type] || c.certificate_type} · {fmtDate(c.created_at)}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-500 flex-shrink-0">
                      {c.fee && Number(c.fee) > 0 ? `₱${Number(c.fee).toLocaleString()}` : 'Free'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 3 — Active Blotters + Finance Forms + Quick Actions */}
        <div className={`border-t ${bd} grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 divide-x ${divC}`}>

          {/* Active Blotters */}
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`text-sm font-semibold ${txt}`}>Active Blotters</p>
                <p className={`text-xs mt-0.5 ${sub}`}>{data.activeBlotters} open case{data.activeBlotters !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => guardedNavigate('/blotter')}
                className={`text-xs flex items-center gap-0.5 transition-colors ${isDark ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700'}`}>
                View all <ChevronRight size={12} />
              </button>
            </div>
            {data.blotterList.length === 0 ? (
              <div className={`py-6 text-center text-sm ${sub}`}>
                <CheckCircle size={24} className="mx-auto mb-2 text-emerald-400 opacity-60" />
                No active blotters
              </div>
            ) : (
              <div className={`divide-y ${divC}`}>
                {data.blotterList.map(b => (
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

          {/* Finance Forms (secretary accessible) */}
          <div className="p-5 sm:p-6">
            <p className={`text-sm font-semibold mb-4 ${txt}`}>Finance Forms</p>
            <div className={`divide-y ${divC}`}>
              {[
                { label: 'Barangay ID',       path: '/finance/brgy-id'     },
                { label: 'KIDLAT Members',     path: '/finance/kidlat'      },
                { label: 'Trip Ticket',        path: '/finance/trip'        },
                { label: 'Purchase Request',   path: '/finance/pr'          },
                { label: 'Requisition & Issue',path: '/finance/ris'         },
                { label: 'Transmittal Letter', path: '/finance/transmittal' },
              ].map(f => (
                <button key={f.path} onClick={() => guardedNavigate(f.path)}
                  className={`w-full flex items-center justify-between py-2.5 text-left transition-colors ${hov}`}>
                  <span className={`text-xs font-medium ${txt}`}>{f.label}</span>
                  <ChevronRight size={11} className={sub} />
                </button>
              ))}
            </div>
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
