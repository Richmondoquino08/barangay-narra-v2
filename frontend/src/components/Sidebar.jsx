import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  LayoutDashboard, Users, FileText, DollarSign, ClipboardList,
  AlertTriangle, Megaphone, FolderOpen, Settings, LogOut,
  ChevronRight, Moon, Sun
} from 'lucide-react';

const menuItems = [
  { label: 'Dashboard',     path: '/dashboard',     icon: LayoutDashboard, roles: ['admin','secretary','captain','treasurer'], section: 'main' },
  { label: 'Residents',     path: '/residents',     icon: Users,           roles: ['admin','secretary'],                       section: 'records' },
  { label: 'Certificates',  path: '/certificates',  icon: FileText,        roles: ['admin','secretary'],                       section: 'records' },
  { label: 'Requests',      path: '/requests',      icon: ClipboardList,   roles: ['admin','secretary','captain'],              section: 'records' },
  { label: 'Blotter',       path: '/blotter',       icon: AlertTriangle,   roles: ['admin','captain'],                         section: 'records' },
  { label: 'Finance',       path: '/finance',       icon: DollarSign,      roles: ['admin','treasurer'],                       section: 'finance' },
  { label: 'Announcements', path: '/announcements', icon: Megaphone,       roles: ['admin','secretary','captain','treasurer'], section: 'comm' },
  { label: 'Documents',     path: '/documents',     icon: FolderOpen,      roles: ['admin','secretary'],                       section: 'comm' },
  { label: 'Users',         path: '/users',         icon: Users,           roles: ['admin'],                                   section: 'admin' },
  { label: 'Settings',      path: '/settings',      icon: Settings,        roles: ['admin'],                                   section: 'admin' },
];

const sectionLabels = {
  records: 'Records',
  finance: 'Finance',
  comm:    'Communication',
  admin:   'Administration',
};

export default function Sidebar({ isOpen, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();
  const { darkMode, toggleDark, logo, barangayName } = useTheme();

  const isActive = path => location.pathname === path;
  const initials = user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';
  const roleLabel = { admin: 'Administrator', secretary: 'Secretary', captain: 'Captain', treasurer: 'Treasurer' };

  const visible = menuItems.filter(item => hasRole(item.roles));
  const renderedSections = new Set();

  return (
    <>
      <aside className={`${isOpen ? 'w-64' : 'w-16'} bg-gray-900 text-white flex flex-col transition-all duration-300 min-h-screen flex-shrink-0 shadow-xl z-40 relative`}>

        {/* Logo */}
        <div className={`flex items-center ${isOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-4 border-b border-white/10`}>
          {logo
            ? <img src={logo} alt="Logo" className="w-9 h-9 rounded-xl object-cover flex-shrink-0 shadow" />
            : <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg text-white font-bold text-sm">B</div>
          }
          {isOpen && (
            <div className="min-w-0">
              <p className="font-bold text-sm leading-none truncate">{barangayName}</p>
              <p className="text-gray-400 text-[10px] mt-0.5">Management System</p>
            </div>
          )}
        </div>

        {/* User chip */}
        {isOpen && (
          <div className="mx-3 mt-3 px-3 py-2.5 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-bold flex-shrink-0">{initials}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate leading-none">{user?.full_name}</p>
                <p className="text-gray-400 text-[10px] mt-0.5 capitalize">{roleLabel[user?.role] || user?.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {visible.map(item => {
            const showSection = sectionLabels[item.section] && !renderedSections.has(item.section);
            if (showSection) renderedSections.add(item.section);
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <React.Fragment key={item.path}>
                {showSection && isOpen && (
                  <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest px-3 pt-3 pb-1">
                    {sectionLabels[item.section]}
                  </p>
                )}
                <button
                  onClick={() => navigate(item.path)}
                  title={!isOpen ? item.label : undefined}
                  className={`w-full flex items-center ${isOpen ? 'gap-3 px-3' : 'justify-center px-2'} py-2.5 rounded-xl transition-all text-sm font-medium
                    ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                >
                  <Icon size={17} className="flex-shrink-0" />
                  {isOpen && <><span className="flex-1 text-left">{item.label}</span>{active && <ChevronRight size={13} className="opacity-60" />}</>}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Dark mode toggle */}
        <div className="px-2 pb-2 border-t border-white/10 pt-2">
          <button
            onClick={toggleDark}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`w-full flex items-center ${isOpen ? 'gap-3 px-3' : 'justify-center px-2'} py-2.5 rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition text-sm font-medium`}
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            {isOpen && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className={`w-full flex items-center ${isOpen ? 'gap-3 px-3' : 'justify-center px-2'} py-2.5 rounded-xl text-gray-400 hover:bg-rose-900/40 hover:text-rose-400 transition text-sm font-medium mt-0.5`}
          >
            <LogOut size={17} />
            {isOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {isOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onToggle} />}
    </>
  );
}