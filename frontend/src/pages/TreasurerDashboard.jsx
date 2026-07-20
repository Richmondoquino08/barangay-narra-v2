import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { financeAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import NoAccessModal from '../components/NoAccessModal';
import { ROUTE_ROLES, ROUTE_LABELS } from '../utils/routeRoles';
import {
  TrendingUp, TrendingDown, Wallet, ChevronRight,
  BarChart2, Shield, DollarSign,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const FINANCE_ACTIONS = [
  { label: 'Petty Cash Fund',      path: '/finance/pcf'         },
  { label: 'Cash Vouchers',        path: '/finance/sppcv'       },
  { label: 'Obligations (RAO)',    path: '/finance/rao'         },
  { label: 'Obligation Request',   path: '/finance/obr'         },
  { label: 'Purchase Request',     path: '/finance/pr'          },
  { label: 'Purchase Order',       path: '/finance/po'          },
  { label: 'Inspection & Accept.', path: '/finance/iar'         },
  { label: 'Disbursement Voucher', path: '/finance/dv'          },
  { label: 'CRDR (Cashbook)',      path: '/finance/crdr'        },
  { label: 'Cash in Bank',         path: '/finance/chbr'        },
  { label: 'Checks Issued',        path: '/finance/checks'      },
  { label: 'Collections',          path: '/finance/collections' },
];

const OTHER_ACTIONS = [
  { label: 'Reports',   path: '/reports',   icon: BarChart2,  color: '#6366F1' },
  { label: 'Officials', path: '/officials', icon: Shield,     color: '#8B5CF6' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function AmountTooltip({ active, payload, isDark }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className={`text-xs px-3 py-2 rounded-lg shadow-lg border ${isDark ? 'bg-[#1a1d27] border-[#2e334a] text-slate-200' : 'bg-white border-gray-200 text-gray-800'}`}>
      <p className="font-semibold mb-0.5">{d.payload.name}</p>
      <p style={{ color: d.payload.color }}>
        ₱{Number(d.value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}

export default function TreasurerDashboard() {
  const { user, hasRole }    = useAuth();
  const { darkMode: isDark } = useTheme();
  const navigate             = useNavigate();

  const [stats,   setStats]   = useState({});
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [noAccessModal, setNoAccessModal] = useState({ open: false, feature: '' });

  useEffect(() => {
    async function load() {
      try {
        const [st, list] = await Promise.allSettled([
          financeAPI.getStats(),
          financeAPI.getAll({ limit: 8 }),
        ]);
        setStats(st.value?.data?.stats || {});
        setRecent(list.value?.data?.finances || []);
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

  const fmt = n => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const totalIncome  = Number(stats.total_income)      || 0;
  const totalExpense = Number(stats.total_expense)     || 0;
  const balance      = totalIncome - totalExpense;
  const collected    = Number(stats.total_collected)   || 0;
  const disbursed    = Number(stats.total_disbursed)   || 0;
  const obligations  = Number(stats.total_obligations) || 0;

  const chartData = [
    { name: 'Income',  value: totalIncome,          color: '#10B981' },
    { name: 'Expense', value: totalExpense,          color: '#F43F5E' },
    { name: 'Balance', value: Math.max(balance, 0), color: '#6366F1' },
  ];

  const bd   = isDark ? 'border-[#2e334a]' : 'border-gray-200';
  const bg   = isDark ? 'bg-[#0d1117]'     : 'bg-white';
  const txt  = isDark ? 'text-slate-100'   : 'text-gray-900';
  const sub  = isDark ? 'text-slate-500'   : 'text-gray-400';
  const hov  = isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-gray-50/70';
  const divC = isDark ? 'divide-[#2e334a]' : 'divide-gray-200';
  const axTick = { fontSize: 10, fill: isDark ? '#64748b' : '#9ca3af' };

  const BADGE_CLS = {
    emerald: 'bg-emerald-50  text-emerald-600  dark:bg-emerald-900/20  dark:text-emerald-400',
    rose:    'bg-rose-50     text-rose-600     dark:bg-rose-900/20     dark:text-rose-400',
    indigo:  'bg-indigo-50   text-indigo-600   dark:bg-indigo-900/20   dark:text-indigo-400',
    teal:    'bg-teal-50     text-teal-600     dark:bg-teal-900/20     dark:text-teal-400',
  };

  const firstName  = user?.full_name?.split(' ')[0] || 'Treasurer';
  const todayLabel = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const statCells = [
    { label: 'Total Income',  value: loading ? '...' : fmt(totalIncome),  badge: 'All time income',   bColor: 'emerald', icon: TrendingUp   },
    { label: 'Total Expenses',value: loading ? '...' : fmt(totalExpense), badge: 'All time expense',  bColor: 'rose',    icon: TrendingDown },
    { label: 'Net Balance',   value: loading ? '...' : fmt(balance),      badge: balance >= 0 ? 'Surplus' : 'Deficit', bColor: balance >= 0 ? 'indigo' : 'rose', icon: DollarSign },
  ];

  return (
    <div className="w-full space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-xl font-bold ${txt}`}>{greeting()}, {firstName}</h1>
          <p className={`text-sm mt-0.5 ${sub}`}>{todayLabel}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
          <Wallet size={11} /> Treasurer
        </span>
      </div>

      {/* Main bordered grid */}
      <div className={`border ${bd} rounded-xl overflow-hidden ${bg}`}>

        {/* Row 1 — Financial stat cells */}
        <div className={`grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 divide-x ${divC}`}>
          {statCells.map(cell => {
            const Icon = cell.icon;
            return (
              <button key={cell.label} onClick={() => guardedNavigate('/finance')}
                className={`p-5 sm:p-6 text-left transition-colors ${hov}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${sub}`}>{cell.label}</p>
                <p className={`text-2xl sm:text-3xl font-bold mt-2 tabular-nums leading-none ${txt} break-all`}>{cell.value}</p>
                <div className="mt-3">
                  <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium ${BADGE_CLS[cell.bColor]}`}>
                    {cell.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Row 2 — Finance chart + Recent Transactions */}
        <div className={`border-t ${bd} grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 divide-x ${divC}`}>

          {/* Finance Overview gradient chart */}
          <div className="p-5 sm:p-6">
            <div className="mb-1">
              <p className={`text-sm font-semibold ${txt}`}>Finance Overview</p>
              <p className={`text-xs mt-0.5 ${sub}`}>Income, expenses & net balance</p>
            </div>
            <div className="h-52 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barSize={72}>
                  <defs>
                    {chartData.map((d, i) => (
                      <linearGradient key={d.name} id={`tg${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={d.color} stopOpacity={0.88} />
                        <stop offset="100%" stopColor={d.color} stopOpacity={0.04} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis dataKey="name" tick={axTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axTick} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`} />
                  <Tooltip content={<AmountTooltip isDark={isDark} />}
                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((d, i) => <Cell key={d.name} fill={`url(#tg${i})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`text-sm font-semibold ${txt}`}>Recent Transactions</p>
                <p className={`text-xs mt-0.5 ${sub}`}>Latest finance entries</p>
              </div>
              <button onClick={() => guardedNavigate('/finance')}
                className={`text-xs flex items-center gap-0.5 transition-colors ${isDark ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700'}`}>
                View all <ChevronRight size={12} />
              </button>
            </div>
            {recent.length === 0 ? (
              <div className={`py-8 text-center text-sm ${sub}`}>
                <DollarSign size={24} className="mx-auto mb-2 opacity-30" />
                No transactions yet
              </div>
            ) : (
              <div className={`divide-y ${divC}`}>
                {recent.map(r => (
                  <div key={r.id} className={`flex items-center justify-between py-2.5 ${hov} transition-colors`}>
                    <div className="min-w-0 mr-3 flex-1">
                      <p className={`text-xs font-medium truncate ${txt}`}>{r.description}</p>
                      <p className={`text-[11px] mt-0.5 ${sub}`}>{fmtDate(r.transaction_date)}</p>
                    </div>
                    <span className={`text-xs font-semibold flex-shrink-0 ${r.transaction_type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {r.transaction_type === 'income' ? '+' : '-'}{fmt(r.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 3 — Sub-stat tiles: Collections, Disbursed, Obligations */}
        <div className={`border-t ${bd} grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 divide-x ${divC}`}>
          {[
            { label: 'Total Collected',   value: collected,   color: '#10B981', bg: isDark ? 'bg-emerald-900/10' : 'bg-emerald-50/60', badge: 'Collections' },
            { label: 'Total Disbursed',   value: disbursed,   color: '#F43F5E', bg: isDark ? 'bg-rose-900/10'    : 'bg-rose-50/60',    badge: 'Disbursements' },
            { label: 'Total Obligations', value: obligations, color: '#F59E0B', bg: isDark ? 'bg-amber-900/10'   : 'bg-amber-50/60',   badge: 'Obligations' },
          ].map(s => (
            <div key={s.label} className={`p-5 sm:p-6 ${s.bg}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wider`} style={{ color: s.color }}>{s.label}</p>
              <p className={`text-xl sm:text-2xl font-bold mt-2 tabular-nums break-all ${txt}`}>
                {loading ? '...' : fmt(s.value)}
              </p>
              <p className="text-[11px] mt-1.5 font-medium" style={{ color: s.color }}>{s.badge}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Finance Forms Quick Access */}
      <div className={`border ${bd} rounded-xl overflow-hidden ${bg}`}>
        <div className={`px-5 py-3.5 border-b ${bd}`}>
          <p className={`text-[11px] font-bold uppercase tracking-widest ${sub}`}>Finance Forms</p>
        </div>
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-y divide-x ${divC}`}>
          {FINANCE_ACTIONS.map(a => (
            <button key={a.path} onClick={() => guardedNavigate(a.path)}
              className={`px-4 py-3 text-left text-xs font-medium transition-colors ${hov} ${txt}`}>
              {a.label}
            </button>
          ))}
        </div>
        <div className={`border-t ${bd} grid grid-cols-2 sm:grid-cols-3 divide-y sm:divide-y-0 divide-x ${divC}`}>
          {OTHER_ACTIONS.map(a => {
            const Icon = a.icon;
            return (
              <button key={a.path} onClick={() => guardedNavigate(a.path)}
                className={`flex items-center gap-2.5 px-4 py-3 text-left transition-colors ${hov}`}>
                <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: `${a.color}1a` }}>
                  <Icon size={11} style={{ color: a.color }} />
                </div>
                <span className={`text-xs font-medium ${txt}`}>{a.label}</span>
              </button>
            );
          })}
          <button onClick={() => guardedNavigate('/cheque-print')}
            className={`flex items-center gap-2.5 px-4 py-3 text-left transition-colors ${hov}`}>
            <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: '#10B9811a' }}>
              <BarChart2 size={11} style={{ color: '#10B981' }} />
            </div>
            <span className={`text-xs font-medium ${txt}`}>Cheque Print</span>
          </button>
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
