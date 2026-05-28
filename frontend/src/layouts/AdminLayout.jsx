import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />

          {/* Content */}
          <div className="bg-gray-50 min-h-screen">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
