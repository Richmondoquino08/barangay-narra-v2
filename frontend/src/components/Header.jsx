import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header({ onSidebarToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

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
    <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onSidebarToggle}
            className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
          >
            ☰
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Barangay Management System</h1>
            <p className="text-sm text-gray-600">Welcome back, {user?.full_name}</p>
          </div>
        </div>

        {/* Right Section - User Menu */}
        <div className="flex items-center gap-4 relative">
          <div className="text-right">
            <p className="font-semibold text-gray-800">{user?.full_name}</p>
            <p className="text-sm text-gray-600">{getRoleLabel(user?.role)}</p>
          </div>

          {/* User Avatar Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold flex items-center justify-center hover:shadow-lg transition"
            >
              {user?.full_name?.charAt(0).toUpperCase()}
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="p-4 border-b border-gray-200">
                  <p className="font-semibold text-gray-800">{user?.full_name}</p>
                  <p className="text-sm text-gray-600">{user?.email}</p>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => navigate('/profile')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition"
                  >
                    👤 Profile
                  </button>
                  <button
                    onClick={() => navigate('/change-password')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition"
                  >
                    🔑 Change Password
                  </button>
                  <button
                    onClick={() => navigate('/settings')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition"
                  >
                    ⚙️ Settings
                  </button>
                </div>
                <div className="p-2 border-t border-gray-200">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition font-semibold"
                  >
                    🚪 Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
