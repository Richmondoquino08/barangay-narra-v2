import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import CaptainDashboard from './pages/CaptainDashboard';
import SecretaryDashboard from './pages/SecretaryDashboard';
import TreasurerDashboard from './pages/TreasurerDashboard';
import Residents from './pages/Residents';
import ResidentProfile from './pages/ResidentProfile';
import Users from './pages/Users';
import Certificates from './pages/Certificates';
import Finance from './pages/Finance';
import Requests from './pages/Requests';
import BlotterManagement from './pages/BlotterManagement';
import Announcements from './pages/Announcements';
import Documents from './pages/Documents';
import Settings from './pages/Settings';
import AdminLayout from './layouts/AdminLayout';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function RoleBasedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, hasRole } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasRole(allowedRoles)) return <Navigate to="/dashboard" replace />;
  return children;
}

function wrap(Component, roles) {
  if (roles) {
    return (
      <RoleBasedRoute allowedRoles={roles}>
        <AdminLayout><Component /></AdminLayout>
      </RoleBasedRoute>
    );
  }
  return (
    <ProtectedRoute>
      <AdminLayout><Component /></AdminLayout>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={wrap(AdminDashboard)} />
      <Route path="/captain-dashboard" element={wrap(CaptainDashboard, ['captain', 'admin'])} />
      <Route path="/secretary-dashboard" element={wrap(SecretaryDashboard, ['secretary', 'admin'])} />
      <Route path="/treasurer-dashboard" element={wrap(TreasurerDashboard, ['treasurer', 'admin'])} />

      <Route path="/users" element={wrap(Users, ['admin'])} />
      <Route path="/residents" element={wrap(Residents, ['admin', 'secretary'])} />
      <Route path="/residents/:id" element={wrap(ResidentProfile, ['admin', 'secretary'])} />
      <Route path="/certificates" element={wrap(Certificates, ['admin', 'secretary'])} />
      <Route path="/finance" element={wrap(Finance, ['admin', 'treasurer'])} />
      <Route path="/requests" element={wrap(Requests, ['admin', 'secretary', 'captain'])} />
      <Route path="/blotter" element={wrap(BlotterManagement, ['admin', 'captain'])} />
      <Route path="/announcements" element={wrap(Announcements)} />
      <Route path="/documents" element={wrap(Documents, ['admin', 'secretary'])} />
      <Route path="/settings" element={wrap(Settings, ['admin'])} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}