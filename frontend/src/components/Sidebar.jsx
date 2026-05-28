import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar({ isOpen, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊', roles: ['admin', 'secretary', 'captain', 'treasurer'] },
    { label: 'Residents', path: '/residents', icon: '👥', roles: ['admin', 'secretary'] },
    { label: 'Certificates', path: '/certificates', icon: '📄', roles: ['admin', 'secretary'] },
    { label: 'Finance', path: '/finance', icon: '💰', roles: ['admin', 'treasurer'] },
    { label: 'Requests', path: '/requests', icon: '📋', roles: ['admin', 'secretary', 'captain'] },
    { label: 'Blotter', path: '/blotter', icon: '⚠️', roles: ['admin', 'captain'] },
    { label: 'Users', path: '/users', icon: '🔐', roles: ['admin'] },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrator',
      secretary: 'Secretary',
      captain: 'Captain',
      treasurer: 'Treasurer'
    };
    return labels[role] || role;
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`${
          isOpen ? 'w-64' : 'w-20'
        } bg-gradient-to-b from-blue-700 to-blue-900 text-white transition-all duration-300 min-h-screen flex flex-col shadow-lg`}
      >
        {/* Logo Section */}
        <div className="p-4 border-b border-blue-600 flex items-center justify-between">
          {isOpen && <h1 className="text-xl font-bold">Barangay</h1>}
          <button
            onClick={onToggle}
            className="p-1 hover:bg-blue-600 rounded transition"
          >
            {isOpen ? '←' : '→'}
          </button>
        </div>

        {/* User Info */}
        {isOpen && (
          <div className="p-4 border-b border-blue-600">
            <p className="text-sm font-semibold truncate">{user?.full_name}</p>
            <p className="text-xs text-blue-200">{getRoleLabel(user?.role)}</p>
          </div>
        )}

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            if (!hasRole(item.roles)) return null;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                  isActive(item.path)
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-blue-600 text-blue-100'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {isOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-blue-600">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-red-600 transition text-red-200 hover:text-white"
          >
            <span className="text-xl">🚪</span>
            {isOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
