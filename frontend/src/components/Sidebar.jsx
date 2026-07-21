import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  LayoutDashboard, Users, FileText, DollarSign, ClipboardList,
  AlertTriangle, Megaphone, FolderOpen, LogOut,
  ChevronRight, Shield, HardHat, Package, Heart,
  AlertOctagon, BarChart2, Printer, ChevronLeft, Zap, X, Car, Wallet, Receipt, BookOpen,
  FileSignature, ShoppingCart, PackageCheck, Boxes, Banknote,
  BookText, Landmark, FileStack, Coins, Mail, Trash2, ShieldCheck
} from 'lucide-react';

const SECTION_ICONS = {
  records:        '📋',
  finance:        '💰',
  infrastructure: '🏗️',
  social:         '❤️',
  comm:           '📢',
  admin:          '⚙️',
};

const menuItems = [
  { key: 'dashboard',     label: 'Dashboard',       path: '/dashboard',    icon: LayoutDashboard, section: 'main',           color: '#6366f1' },
  { key: 'residents',     label: 'Residents',        path: '/residents',    icon: Users,           section: 'records',        color: '#3b82f6' },
  { key: 'certificates',  label: 'Certificates',     path: '/certificates', icon: FileText,        section: 'records',        color: '#8b5cf6' },
  { key: 'verify_certificate', label: 'Verify Certificate', path: '/certificates/verify', icon: ShieldCheck, section: 'records', color: '#22c55e' },

  { key: 'blotter',       label: 'Blotter',          path: '/blotter',      icon: AlertTriangle,   section: 'records',        color: '#f59e0b' },
  { key: 'finance',       label: 'Finance',          path: '/finance',      icon: DollarSign,      section: 'finance',        color: '#10b981' },
  { key: 'cheque_print',  label: 'Cheque Print',     path: '/cheque-print', icon: Printer,         section: 'finance',        color: '#14b8a6' },
  { key: 'reports',       label: 'Reports',          path: '/reports',      icon: BarChart2,       section: 'finance',        color: '#22c55e' },
  { key: 'fin_brgy_id',   label: 'Barangay ID',      path: '/finance/brgy-id', icon: FileText,     section: 'finance',        color: '#0ea5e9' },
  { key: 'fin_kidlat',    label: 'KIDLAT Members',   path: '/finance/kidlat',  icon: Shield,       section: 'finance',        color: '#8b5cf6' },
  { key: 'fin_trip',      label: 'Trip Ticket',      path: '/finance/trip',    icon: Car,          section: 'finance',        color: '#f97316' },
  { key: 'fin_pcf',       label: 'Petty Cash Fund',  path: '/finance/pcf',     icon: Wallet,       section: 'finance',        color: '#06b6d4' },
  { key: 'fin_sppcv',     label: 'Petty Cash Vouchers', path: '/finance/sppcv', icon: Receipt,     section: 'finance',        color: '#84cc16' },
  { key: 'fin_rao',       label: 'RAO (Obligations)', path: '/finance/rao',   icon: BookOpen,     section: 'finance',        color: '#6366f1' },
  { key: 'fin_obr',       label: 'Obligation Request', path: '/finance/obr',  icon: FileSignature, section: 'finance',       color: '#6366f1' },
  { key: 'fin_pr',        label: 'Purchase Request',  path: '/finance/pr',    icon: ClipboardList, section: 'finance',       color: '#3b82f6' },
  { key: 'fin_po',        label: 'Purchase Order',    path: '/finance/po',    icon: ShoppingCart,  section: 'finance',       color: '#7c6cff' },
  { key: 'fin_iar',       label: 'Inspection & Acceptance', path: '/finance/iar', icon: PackageCheck, section: 'finance',   color: '#0ea5e9' },
  { key: 'fin_ris',       label: 'Requisition & Issue', path: '/finance/ris', icon: Boxes,         section: 'finance',       color: '#f59e0b' },
  { key: 'fin_dv',        label: 'Disbursement Voucher', path: '/finance/dv', icon: Banknote,      section: 'finance',       color: '#10b981' },
  { key: 'fin_crdr',      label: 'CRDR (Cashbook)',   path: '/finance/crdr',        icon: BookText,  section: 'finance',      color: '#6366f1' },
  { key: 'fin_chbr',      label: 'Cash in Bank (CHBR)', path: '/finance/chbr',      icon: Landmark,  section: 'finance',      color: '#0ea5e9' },
  { key: 'fin_checks',    label: 'Checks Issued (SCkI)', path: '/finance/checks',   icon: FileStack, section: 'finance',      color: '#7c6cff' },
  { key: 'fin_collections', label: 'Itemized Collections', path: '/finance/collections', icon: Coins, section: 'finance',    color: '#eab308' },
  { key: 'fin_transmittal', label: 'Transmittal Letter', path: '/finance/transmittal', icon: Mail,   section: 'finance',     color: '#f97316' },
  { key: 'officials',    label: 'Officials',        path: '/officials',    icon: Shield,          section: 'infrastructure', color: '#f97316' },
  { key: 'projects',      label: 'Projects',         path: '/projects',     icon: HardHat,         section: 'infrastructure', color: '#eab308' },
  { key: 'assets',        label: 'Assets',           path: '/assets',       icon: Package,         section: 'infrastructure', color: '#a855f7' },
  { key: 'social',        label: 'Social Programs',  path: '/social',       icon: Heart,           section: 'social',         color: '#ec4899' },
  { key: 'bdrrm',         label: 'BDRRM',            path: '/drrm',         icon: AlertOctagon,    section: 'social',         color: '#ef4444' },
  { key: 'announcements', label: 'Announcements',    path: '/announcements',icon: Megaphone,       section: 'comm',           color: '#f59e0b' },
  { key: 'documents',     label: 'Documents',        path: '/documents',    icon: FolderOpen,      section: 'comm',           color: '#64748b' },
  { key: 'trash',         label: 'Trash',            path: '/trash',        icon: Trash2,          section: 'comm',           color: '#94a3b8' },
  { key: '_users',        label: 'Users',            path: '/users',        icon: Users,           section: 'admin', adminOnly: true, color: '#6366f1' },
];

const sectionLabels = {
  records: 'Records', finance: 'Finance', infrastructure: 'Infrastructure',
  social: 'Social Services', comm: 'Communication', admin: 'Administration',
};

export default function Sidebar({ isOpen, onToggle, isMobile = false, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { darkMode, toggleDark, logo, barangayName, rolePermissions } = useTheme();
  const [hovered, setHovered] = useState(null);

  const isAdmin  = user?.role === 'admin';

  const ROLE_DASHBOARD_PATHS = {
    captain:   '/captain-dashboard',
    secretary: '/secretary-dashboard',
    treasurer: '/treasurer-dashboard',
  };
  const dashboardPath = ROLE_DASHBOARD_PATHS[user?.role] || '/dashboard';

  const isActive = path => location.pathname === path ||
    (path !== '/dashboard' && !path.endsWith('-dashboard') && location.pathname.startsWith(path));

  const initials   = user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';
  const roleLabel  = { admin:'Administrator', secretary:'Secretary', captain:'Punong Barangay', treasurer:'Treasurer' };
  const roleColors = { admin:'#6366f1', secretary:'#10b981', captain:'#3b82f6', treasurer:'#f59e0b' };
  const roleColor  = roleColors[user?.role] || '#6366f1';

  const visible = menuItems.filter(item => {
    if (item.adminOnly) return isAdmin;
    if (isAdmin) return true;
    return (rolePermissions?.[user?.role] ?? []).includes(item.key);
  }).map(item => item.key === 'dashboard' ? { ...item, path: dashboardPath } : item);
  const renderedSections = new Set();

  // ── Theme tokens ───────────────────────────────────────────────
  const D = darkMode;
  const bg        = D ? 'linear-gradient(160deg,#0d0f18 0%,#111827 45%,#0d1117 100%)'
                      : 'linear-gradient(160deg,#ffffff 0%,#f5f7ff 100%)';
  const sideBox   = D ? '4px 0 32px rgba(0,0,0,0.35), 1px 0 0 rgba(255,255,255,0.04)'
                      : '4px 0 24px rgba(0,0,0,0.07), 1px 0 0 rgba(0,0,0,0.05)';
  const divider   = D ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.07)';
  const chipBg    = D ? 'rgba(255,255,255,0.04)'  : 'rgba(0,0,0,0.04)';
  const chipBdr   = D ? 'rgba(255,255,255,0.07)'  : 'rgba(0,0,0,0.07)';
  const nameColor = D ? '#f1f5f9' : '#0f172a';
  const secColor  = D ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.25)';
  const inactiveC = D ? 'rgba(255,255,255,0.38)' : 'rgba(71,85,105,0.75)';
  const hovBg     = D ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const hovC      = D ? 'rgba(255,255,255,0.80)' : '#1e293b';
  const hovBdr    = D ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const btmC      = D ? 'rgba(255,255,255,0.35)' : 'rgba(71,85,105,0.65)';
  const iconBg    = D ? 'rgba(255,255,255,0.06)'  : 'rgba(0,0,0,0.05)';
  const collapseC = D ? 'rgba(255,255,255,0.25)'  : 'rgba(71,85,105,0.40)';

  return (
    <>
      <aside
        className={
          isMobile
            ? 'w-64 flex flex-col h-screen fixed left-0 top-0 z-50 overflow-hidden'
            : `${isOpen ? 'w-64' : 'w-[70px]'} flex flex-col transition-all duration-300 ease-in-out h-screen sticky top-0 flex-shrink-0 z-40 overflow-hidden`
        }
        style={{
          background: bg,
          boxShadow: sideBox,
          transform: isMobile ? (isOpen ? 'translateX(0)' : 'translateX(-100%)') : undefined,
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s ease',
        }}
      >
        {/* ── Logo / Brand ──────────────────────────────────────── */}
        <div className={`flex-shrink-0 flex items-center ${isOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-4 relative`}
          style={{ borderBottom: divider }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background:`radial-gradient(ellipse at 30% 50%,${roleColor}15 0%,transparent 70%)` }}/>

          {logo ? (
            <img src={logo} alt="Logo" className="w-10 h-10 rounded-2xl object-cover flex-shrink-0"
              style={{ boxShadow:`0 0 0 2px ${D?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'}` }}/>
          ) : (
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-white"
              style={{ background:`linear-gradient(135deg,${roleColor},${roleColor}99)`, boxShadow:`0 4px 14px ${roleColor}55` }}>
              <Zap size={18} fill="white" stroke="none"/>
            </div>
          )}

          {isOpen && (
            <div className="min-w-0 flex-1">
              <p className="font-black text-sm leading-none truncate tracking-tight" style={{ color: nameColor }}>{barangayName}</p>
              <p className="text-[10px] mt-1 font-medium tracking-widest uppercase" style={{ color: D?'rgba(255,255,255,0.28)':'rgba(0,0,0,0.28)' }}>MIS Portal</p>
            </div>
          )}

          {isOpen && (
            <button onClick={isMobile ? onClose : onToggle}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all"
              style={{ color: collapseC }}
              onMouseEnter={e => { e.currentTarget.style.background=hovBg; e.currentTarget.style.color=hovC; }}
              onMouseLeave={e => { e.currentTarget.style.background=''; e.currentTarget.style.color=collapseC; }}>
              {isMobile ? <X size={15}/> : <ChevronLeft size={14}/>}
            </button>
          )}
        </div>

        {/* ── User chip ──────────────────────────────────────────── */}
        {isOpen ? (
          <div className="flex-shrink-0 mx-3 mt-3 p-3 rounded-2xl relative overflow-hidden"
            style={{ background: chipBg, border:`1px solid ${chipBdr}` }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background:`radial-gradient(ellipse at 0% 50%,${roleColor}18 0%,transparent 60%)` }}/>
            <div className="flex items-center gap-2.5 relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-black flex-shrink-0 text-white"
                style={{ background:`linear-gradient(135deg,${roleColor},${roleColor}aa)`, boxShadow:`0 4px 12px ${roleColor}55` }}>
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate leading-none" style={{ color: nameColor }}>{user?.full_name}</p>
                <p className="text-[10px] mt-1 font-semibold px-1.5 py-0.5 rounded-md inline-block"
                  style={{ background:`${roleColor}22`, color: roleColor }}>
                  {roleLabel[user?.role] || user?.role}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-shrink-0 flex justify-center mt-3 px-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-black text-white"
              style={{ background:`linear-gradient(135deg,${roleColor},${roleColor}aa)`, boxShadow:`0 4px 12px ${roleColor}55` }}>
              {initials}
            </div>
          </div>
        )}

        {/* ── Navigation ─────────────────────────────────────────── */}
        <nav className="sidebar-nav flex-1 px-2 py-3 overflow-y-auto overflow-x-hidden min-h-0 space-y-0.5">
          {visible.map(item => {
            const showSection = sectionLabels[item.section] && !renderedSections.has(item.section);
            if (showSection) renderedSections.add(item.section);
            const Icon   = item.icon;
            const active = isActive(item.path);
            const isHov  = hovered === item.path && !active;
            const ic     = item.color || 'var(--primary)';

            return (
              <React.Fragment key={item.path}>
                {showSection && isOpen && (
                  <div className="flex items-center gap-2 px-3 pt-5 pb-2">
                    <span className="text-base leading-none" style={{ filter:'grayscale(0.2)' }}>
                      {SECTION_ICONS[item.section] || '•'}
                    </span>
                    <span className="text-[9px] font-black uppercase"
                      style={{ color: secColor, letterSpacing:'0.15em' }}>
                      {sectionLabels[item.section]}
                    </span>
                  </div>
                )}

                <button
                  onClick={() => { navigate(item.path); if (isMobile) onClose?.(); }}
                  title={!isOpen ? item.label : undefined}
                  onMouseEnter={() => setHovered(item.path)}
                  onMouseLeave={() => setHovered(null)}
                  className={`w-full flex items-center ${isOpen ? 'gap-3 px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative overflow-hidden`}
                  style={active ? {
                    background:`linear-gradient(135deg,${ic}28 0%,${ic}15 100%)`,
                    color: ic,
                    border:`1px solid ${ic}30`,
                    boxShadow:`0 2px 12px ${ic}20, inset 0 1px 0 ${ic}18`,
                  } : isHov ? {
                    background: hovBg,
                    color: hovC,
                    border:`1px solid ${hovBdr}`,
                  } : {
                    color: inactiveC,
                    border:'1px solid transparent',
                  }}>
                  {/* Active left bar */}
                  {active && (
                    <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                      style={{ background:ic, boxShadow:`0 0 8px ${ic}` }}/>
                  )}

                  {/* Icon container */}
                  <div className={`flex-shrink-0 ${isOpen?'w-7 h-7':'w-9 h-9'} rounded-lg flex items-center justify-center`}
                    style={active ? { background:`${ic}22`, boxShadow:`0 2px 8px ${ic}28` }
                           : isHov ? { background: iconBg } : {}}>
                    <Icon size={15} style={{ color: active ? ic : 'inherit' }}/>
                  </div>

                  {isOpen && (
                    <>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {active && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background:ic, boxShadow:`0 0 6px ${ic}` }}/>}
                    </>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* ── Bottom ─────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-2 pb-3 pt-2 space-y-0.5" style={{ borderTop: divider }}>

          <button onClick={() => { logout(); navigate('/login'); onClose?.(); }} title="Sign Out"
            className={`w-full flex items-center ${isOpen?'gap-3 px-3':'justify-center px-0'} py-2.5 rounded-xl text-sm font-semibold transition-all duration-150`}
            style={{ color: btmC, border:'1px solid transparent' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.10)'; e.currentTarget.style.color='#ef4444'; e.currentTarget.style.borderColor='rgba(239,68,68,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.background=''; e.currentTarget.style.color=btmC; e.currentTarget.style.borderColor='transparent'; }}>
            <div className={`flex-shrink-0 ${isOpen?'w-7 h-7':'w-9 h-9'} rounded-lg flex items-center justify-center`}
              style={{ background:'rgba(239,68,68,0.08)' }}>
              <LogOut size={14}/>
            </div>
            {isOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {isMobile && isOpen && (
        <div className="fixed inset-0 z-40"
          style={{ background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)' }}
          onClick={onClose}/>
      )}
    </>
  );
}
