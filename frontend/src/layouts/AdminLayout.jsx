import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import AnnouncementPopup from '../components/AnnouncementPopup';
import { Bell, Search, Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useAuth();
  const { darkMode, toggleDark, barangayName } = useTheme();

  const initials = user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';

  return (
    <div className="min-h-screen flex font-sans">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white dark:bg-[#1a1d27] backdrop-blur border-b border-gray-100 dark:border-[#2e334a] px-5 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 lg:hidden transition">
              <Menu size={20} />
            </button>
            <div className="relative hidden sm:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input placeholder="Quick search…"
                className="pl-9 pr-4 py-1.5 text-sm bg-slate-100 dark:bg-[#22263a] border border-transparent dark:border-[#2e334a] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 w-52 text-gray-800 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 transition" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark mode quick toggle */}
            <button onClick={toggleDark}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-yellow-400 transition"
              title={darkMode ? 'Light mode' : 'Dark mode'}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* User chip */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-gray-200 dark:border-gray-700">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-none">{user?.full_name}</p>
                <p className="text-xs text-gray-400 capitalize mt-0.5">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 animate-fade-in">
          {children}
        </main>

        <footer className="px-5 py-3 text-xs text-gray-400 dark:text-slate-500 border-t border-gray-100 dark:border-[#2e334a] bg-white dark:bg-[#1a1d27] text-center">
          {barangayName} &copy; {new Date().getFullYear()} — Management Information System
        </footer>
      </div>

      {/* Global announcement popup */}
      <AnnouncementPopup />
    </div>
  );
}
