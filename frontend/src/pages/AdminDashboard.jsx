import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersAPI, residentsAPI, certificatesAPI, financeAPI, blotterAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Badge from '../components/Badge';
import NoAccessModal from '../components/NoAccessModal';
import { ROUTE_ROLES, ROUTE_LABELS } from '../utils/routeRoles';
import {
  Users, FileText, DollarSign, TrendingUp, AlertTriangle,
  Shield, HardHat, Package, Heart, AlertOctagon, BarChart2, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';

const CERT_TYPE_LABELS = {
  barangay_clearance:   'Clearance',   residency:           'Residency',
  indigency:            'Indigency',   business_permit:     'Business',
  good_moral:           'Good Moral',  ftjs:                'FTJS',
  no_income:            'No Income',   senior_citizen_cert: 'Senior',
  pwd_cert:             'PWD',         cohabitation:        'Cohabitation',
  guardianship:         'Guardianship', travel_permit:      'Travel',
};

const MODULES = [
  { label: 'Residents',       path: '/residents',    icon: Users,         color: '#3B82F6' },
  { label: 'Certificates',    path: '/certificates', icon: FileText,      color: '#8B5CF6' },
  { label: 'Blotter',         path: '/blotter',      icon: AlertTriangle, color: '#EF4444' },
  { label: 'Finance',         path: '/finance',      icon: DollarSign,    color: '#10B981' },
  { label: 'Reports',         path: '/reports',      icon: BarChart2,     color: '#6366F1' },
  { label: 'Officials',       path: '/officials',    icon: Shield,        color: '#F97316' },
  { label: 'Projects',        path: '/projects',     icon: HardHat,       color: '#EAB308' },
  { label: 'Assets',          path: '/assets',       icon: Package,       color: '#06B6D4' },
  { label: 'Social Programs', path: '/social',       icon: Heart,         color: '#EC4899' },
  { label: 'BDRRM',           path: '/drrm',         icon: AlertOctagon,  color: '#DC2626' },
  { label: 'Users',           path: '/users',        icon: Users,         color: '#64748B' },
];

const fmt     = n => Number(n || 0).toLocaleString('en-PH');
const peso    = n => `₱${fmt(n)}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

function BarTooltip({ active, payload, isDark }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className={`text-xs px-3 py-2 rounded-lg shadow-lg border ${isDark ? 'bg-[#1a1d27] border-[#2e334a] text-slate-200' : 'bg-white border-gray-200 text-gray-800'}`}>
      <p className="font-semibold mb-0.5">{d.payload.name}</p>
      <p style={{ color: d.payload.color }}>{d.payload.isAmount ? peso(d.value) : fmt(d.value)}</p>
    </div>
  );
}

function PieTooltip({ active, payload, isDark }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className={`text-xs px-3 py-2 rounded-lg shadow-lg border ${isDark ? 'bg-[#1a1d27] border-[#2e334a] text-slate-200' : 'bg-white border-gray-200 text-gray-800'}`}>
      <p className="font-semibold mb-0.5">{d.name}</p>
      <p style={{ color: d.payload.color }}>{fmt(d.value)}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, hasRole }    = useAuth();
  const { darkMode: isDark } = useTheme();
  const navigate             = useNavigate();

  const [stats,       setStats]       = useState({ residents: 0, users: 0, certificates: {}, finance: {} });
  const [blotters,    setBlotters]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [recentCerts, setRecentCerts] = useState([]);
  const [noAccessModal, setNoAccessModal] = useState({ open: false, feature: '' });

  const [residentTags, setResidentTags] = useState({ voter: 0, senior: 0, pwd: 0, fourps: 0 });

  useEffect(() => {
    async function load() {
      try {
        const [res, usr, cert, fin, blt, certsRes, voterRes, seniorRes, pwdRes, fourpsRes] = await Promise.allSettled([
          residentsAPI.getAll(1, 1),
          usersAPI.getAll(),
          certificatesAPI.getStats(),
          financeAPI.getStats(),
          blotterAPI.getAll({ status: 'pending' }),
          certificatesAPI.getAll({ limit: 5 }),
          residentsAPI.getAll(1, 1, { voter_status: true }),
          residentsAPI.getAll(1, 1, { senior_citizen: true }),
          residentsAPI.getAll(1, 1, { is_pwd: true }),
          residentsAPI.getAll(1, 1, { is_4ps: true }),
        ]);
        setStats({
          residents:    res.value?.data?.total           || 0,
          users:        usr.value?.data?.users?.length   || 0,
          certificates: cert.value?.data?.stats          || {},
          finance:      fin.value?.data?.stats           || {},
        });
        setBlotters(blt.value?.data?.records || []);
        setRecentCerts(certsRes.value?.data?.certificates || []);
        setResidentTags({
          voter:  voterRes.value?.data?.total  || 0,
          senior: seniorRes.value?.data?.total || 0,
          pwd:    pwdRes.value?.data?.total    || 0,
          fourps: fourpsRes.value?.data?.total || 0,
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

  const totalIssued  = Number(stats.certificates.total)       || 0;
  const issuedToday  = Number(stats.certificates.issued_today) || 0;
  const totalIncome  = Number(stats.finance.total_income)     || 0;
  const totalExpense = Number(stats.finance.total_expense)    || 0;
  const balance      = totalIncome - totalExpense;
  const blotterCount = blotters.length;

  const financeData = [
    { name: 'Income',      value: totalIncome,                                   color: '#10B981', isAmount: true },
    { name: 'Expense',     value: totalExpense,                                  color: '#F43F5E', isAmount: true },
    { name: 'Collected',   value: Number(stats.finance.total_collected)  || 0,  color: '#3B82F6', isAmount: true },
    { name: 'Disbursed',   value: Number(stats.finance.total_disbursed)  || 0,  color: '#F59E0B', isAmount: true },
    { name: 'Obligations', value: Number(stats.finance.total_obligations)|| 0,  color: '#8B5CF6', isAmount: true },
  ];

  // Resident tag breakdown for the donut chart
  const tagData = [
    { name: 'Reg. Voters',     value: residentTags.voter,  color: '#3B82F6' },
    { name: 'Senior Citizens', value: residentTags.senior, color: '#10B981' },
    { name: 'PWD',             value: residentTags.pwd,    color: '#8B5CF6' },
    { name: '4Ps Members',     value: residentTags.fourps, color: '#F59E0B' },
  ];
  const pieData  = tagData.filter(d => d.value > 0);
  const pieTotal = stats.residents; // center shows total residents

  const bd   = isDark ? 'border-[#2e334a]' : 'border-gray-200';
  const bg   = isDark ? 'bg-[#0d1117]'     : 'bg-white';
  const txt  = isDark ? 'text-slate-100'   : 'text-gray-900';
  const sub  = isDark ? 'text-slate-500'   : 'text-gray-400';
  const hov  = isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-gray-50/70';
  const divC = isDark ? 'divide-[#2e334a]' : 'divide-gray-200';

  const axTick       = { fontSize: 10, fill: isDark ? '#64748b' : '#9ca3af' };
  const tooltipCursor = { fill: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)' };

  const BADGE_CLS = {
    blue:    'bg-blue-50    text-blue-600    dark:bg-blue-900/20    dark:text-blue-400',
    violet:  'bg-violet-50  text-violet-600  dark:bg-violet-900/20  dark:text-violet-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    rose:    'bg-rose-50    text-rose-600    dark:bg-rose-900/20    dark:text-rose-400',
    gray:    'bg-gray-100   text-gray-400    dark:bg-white/5        dark:text-slate-500',
  };

  const statCells = [
    { label: 'Total Residents',     value: loading ? '...' : fmt(stats.residents), badge: 'Registered',                                                  bColor: 'blue',    path: '/residents'    },
    { label: 'Certificates Issued', value: loading ? '...' : fmt(totalIssued),     badge: issuedToday > 0 ? `↑ ${issuedToday} today` : 'None today',   bColor: issuedToday > 0 ? 'emerald' : 'gray', path: '/certificates' },
    { label: 'Active Blotters',     value: loading ? '...' : String(blotterCount), badge: blotterCount > 0 ? 'Under review' : 'None active',            bColor: blotterCount > 0 ? 'rose' : 'gray',   path: '/blotter'      },
    { label: 'System Users',        value: loading ? '...' : String(stats.users),  badge: 'Registered users',                                            bColor: 'violet',  path: '/users'        },
  ];

  return (
    <div className="w-full space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-bold ${txt}`}>Dashboard</h1>
          <p className={`text-sm mt-0.5 ${sub}`}>
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${isDark ? 'border-[#2e334a] text-slate-400' : 'border-gray-200 text-gray-500 bg-white'}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
          System Online
        </div>
      </div>

      {/* Main bordered grid */}
      <div className={`border ${bd} rounded-xl overflow-hidden ${bg}`}>

        {/* Row 1 — Stat Cells */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 divide-y divide-x ${divC}`}>
          {statCells.map(cell => (
            <button key={cell.path + cell.label} onClick={() => guardedNavigate(cell.path)}
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

        {/* Row 2 — Charts */}
        <div className={`border-t ${bd} grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 divide-x ${divC}`}>

          {/* Left: Financial Overview bar chart */}
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className={`text-sm font-semibold ${txt}`}>Financial Overview</p>
                <p className={`text-xs mt-0.5 ${sub}`}>Income, expenses &amp; collections</p>
              </div>
              <button onClick={() => guardedNavigate('/finance')}
                className={`text-xs flex items-center gap-0.5 transition-colors ${isDark ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700'}`}>
                View <ChevronRight size={12} />
              </button>
            </div>
            <div className="h-52 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barSize={36}>
                  <defs>
                    {financeData.map((d, i) => (
                      <linearGradient key={d.name} id={`fg${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={d.color} stopOpacity={0.88} />
                        <stop offset="100%" stopColor={d.color} stopOpacity={0.04} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis dataKey="name" tick={axTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axTick} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip content={<BarTooltip isDark={isDark} />} cursor={tooltipCursor} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {financeData.map((d, i) => <Cell key={d.name} fill={`url(#fg${i})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right: Resident Profile — breakdown by tags */}
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className={`text-sm font-semibold ${txt}`}>Resident Profile</p>
                <p className={`text-xs mt-0.5 ${sub}`}>Breakdown by classification tags</p>
              </div>
              <button onClick={() => guardedNavigate('/residents')}
                className={`text-xs flex items-center gap-0.5 transition-colors ${isDark ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700'}`}>
                More details <ChevronRight size={12} />
              </button>
            </div>
            <div className="flex items-center gap-6 mt-4 h-44">
              {/* Donut — fixed size so we can overlay the center label */}
              <div className="relative flex-shrink-0" style={{ width: 176, height: 176 }}>
                <PieChart width={176} height={176}>
                  <Pie
                    data={pieData.length ? pieData : [{ name: 'No data', value: 1, color: isDark ? '#2e334a' : '#e5e7eb' }]}
                    cx={88} cy={88}
                    innerRadius={54} outerRadius={80}
                    paddingAngle={pieData.length > 1 ? 3 : 0}
                    dataKey="value" strokeWidth={0}
                  >
                    {(pieData.length ? pieData : [{ color: isDark ? '#2e334a' : '#e5e7eb' }]).map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip isDark={isDark} />} />
                </PieChart>
                {/* Center: total residents */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className={`text-2xl font-black tabular-nums leading-none ${txt}`}>
                    {loading ? '...' : fmt(pieTotal)}
                  </p>
                  <p className={`text-[10px] mt-1.5 font-medium ${sub}`}>total residents</p>
                </div>
              </div>

              {/* Legend — vertical bar + name + count */}
              <div className="flex flex-col justify-center gap-4 flex-1">
                {tagData.map(d => (
                  <div key={d.name} className="flex items-center gap-3">
                    <div className="w-[3px] h-7 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] ${sub} truncate leading-none`}>{d.name}</p>
                      <p className={`text-sm font-bold tabular-nums mt-0.5 leading-none ${txt}`}>
                        {loading ? '...' : fmt(d.value)}
                      </p>
                    </div>
                    {pieTotal > 0 && (
                      <p className={`text-[11px] tabular-nums flex-shrink-0 font-medium ${sub}`}>
                        {Math.round((d.value / pieTotal) * 100)}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row 3 — Activity panels */}
        <div className={`border-t ${bd} grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 divide-x ${divC}`}>

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
            {recentCerts.length === 0 ? (
              <div className={`py-8 text-center text-sm ${sub}`}>
                <FileText size={28} className="mx-auto mb-2 opacity-25" />
                No certificates yet
              </div>
            ) : (
              <>
                <div className={`grid grid-cols-3 pb-2 border-b ${bd}`}>
                  <p className={`text-[11px] font-semibold ${sub}`}>Resident</p>
                  <p className={`text-[11px] font-semibold ${sub}`}>Type</p>
                  <p className={`text-[11px] font-semibold text-right ${sub}`}>Amount</p>
                </div>
                <div className={`divide-y ${divC}`}>
                  {recentCerts.map(c => (
                    <div key={c.id} className={`grid grid-cols-3 py-2.5 ${hov} transition-colors`}>
                      <p className={`text-xs font-medium truncate pr-2 ${txt}`}>{c.resident_name}</p>
                      <p className={`text-xs truncate pr-2 ${sub}`}>{CERT_TYPE_LABELS[c.certificate_type] || c.certificate_type}</p>
                      <p className={`text-xs font-semibold text-right tabular-nums ${c.fee ? 'text-emerald-600 dark:text-emerald-400' : sub}`}>
                        {c.fee ? peso(c.fee) : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Active Blotters */}
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`text-sm font-semibold ${txt}`}>Active Blotters</p>
                <p className={`text-xs mt-0.5 ${sub}`}>{blotterCount} case{blotterCount !== 1 ? 's' : ''} under review</p>
              </div>
              <button onClick={() => guardedNavigate('/blotter')}
                className={`text-xs flex items-center gap-0.5 transition-colors ${isDark ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700'}`}>
                View all <ChevronRight size={12} />
              </button>
            </div>
            {blotters.length === 0 ? (
              <div className={`py-8 text-center text-sm ${sub}`}>
                <AlertTriangle size={28} className="mx-auto mb-2 opacity-25" />
                No active blotters
              </div>
            ) : (
              <div className={`divide-y ${divC}`}>
                {blotters.slice(0, 5).map(b => (
                  <div key={b.id} className={`flex items-center justify-between py-2.5 ${hov} transition-colors`}>
                    <div className="min-w-0 flex-1 mr-2">
                      <p className={`text-xs font-medium truncate ${txt}`}>{b.incident_type}</p>
                      <p className={`text-[11px] mt-0.5 font-mono ${sub}`}>{b.case_number}</p>
                    </div>
                    <Badge status={b.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Finance Health */}
          <div className="p-5 sm:p-6">
            <div className="mb-4">
              <p className={`text-sm font-semibold ${txt}`}>Finance Health</p>
              <p className={`text-xs mt-0.5 ${sub}`}>Summary of financial standing</p>
            </div>
            <div className={`space-y-0 divide-y ${divC}`}>
              {[
                { label: 'Total Income',    value: totalIncome,       color: '#10B981', prefix: '+' },
                { label: 'Total Expenses',  value: totalExpense,      color: '#F43F5E', prefix: '-' },
                { label: 'Net Balance',     value: Math.abs(balance), color: balance >= 0 ? '#10B981' : '#F43F5E', prefix: balance >= 0 ? '+' : '-' },
                { label: 'Collections',     value: Number(stats.finance.total_collected)   || 0, color: '#3B82F6', prefix: '' },
                { label: 'Disbursed',       value: Number(stats.finance.total_disbursed)   || 0, color: '#F59E0B', prefix: '' },
              ].map(row => (
                <div key={row.label} className={`flex items-center justify-between py-2.5 ${hov} transition-colors`}>
                  <p className={`text-xs ${sub}`}>{row.label}</p>
                  <p className="text-xs font-bold tabular-nums" style={{ color: row.color }}>
                    {row.prefix}{peso(row.value)}
                  </p>
                </div>
              ))}
            </div>
            <div className={`pt-3 mt-1 border-t ${bd}`}>
              <button onClick={() => guardedNavigate('/finance')}
                className={`text-xs flex items-center gap-0.5 transition-colors ${isDark ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700'}`}>
                View Finance <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className={`border ${bd} rounded-xl overflow-hidden ${bg} p-5`}>
        <p className={`text-[11px] font-bold uppercase tracking-widest mb-4 ${sub}`}>Quick Access</p>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-1">
          {MODULES.map(m => {
            const Icon    = m.icon;
            const allowed = ROUTE_ROLES[m.path];
            const ok      = !allowed || hasRole(allowed);
            return (
              <button key={m.path} onClick={() => guardedNavigate(m.path)} title={m.label}
                className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-lg transition-colors ${ok ? hov : 'opacity-35'}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${m.color}1a` }}>
                  <Icon size={15} style={{ color: m.color }} />
                </div>
                <span className={`text-[10px] font-medium leading-tight text-center ${sub}`}>{m.label}</span>
              </button>
            );
          })}
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
