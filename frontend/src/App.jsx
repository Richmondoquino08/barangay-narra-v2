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
import AdminLayout from './layouts/AdminLayout';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Role-Based Route Component
function RoleBasedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, hasRole } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Role-specific Dashboards */}
      <Route
        path="/captain-dashboard"
        element={
          <RoleBasedRoute allowedRoles={['captain', 'admin']}>
            <AdminLayout>
              <CaptainDashboard />
            </AdminLayout>
          </RoleBasedRoute>
        }
      />
      <Route
        path="/secretary-dashboard"
        element={
          <RoleBasedRoute allowedRoles={['secretary', 'admin']}>
            <AdminLayout>
              <SecretaryDashboard />
            </AdminLayout>
          </RoleBasedRoute>
        }
      />
      <Route
        path="/treasurer-dashboard"
        element={
          <RoleBasedRoute allowedRoles={['treasurer', 'admin']}>
            <AdminLayout>
              <TreasurerDashboard />
            </AdminLayout>
          </RoleBasedRoute>
        }
      />

      {/* Users Management - Admin Only */}
      <Route
        path="/users"
        element={
          <RoleBasedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <Users />
            </AdminLayout>
          </RoleBasedRoute>
        }
      />

      {/* Residents Management */}
      <Route
        path="/residents"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'secretary']}>
            <AdminLayout>
              <Residents />
            </AdminLayout>
          </RoleBasedRoute>
        }
      />
      <Route
        path="/residents/:id"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'secretary']}>
            <AdminLayout>
              <ResidentProfile />
            </AdminLayout>
          </RoleBasedRoute>
        }
      />

      {/* Certificates Management */}
      <Route
        path="/certificates"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'secretary']}>
            <AdminLayout>
              <Certificates />
            </AdminLayout>
          </RoleBasedRoute>
        }
      />

      {/* Finance Management */}
      <Route
        path="/finance"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'treasurer']}>
            <AdminLayout>
              <Finance />
            </AdminLayout>
          </RoleBasedRoute>
        }
      />

      {/* Requests Management */}
      <Route
        path="/requests"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'secretary', 'captain']}>
            <AdminLayout>
              <Requests />
            </AdminLayout>
          </RoleBasedRoute>
        }
      />

      {/* Blotter Management */}
      <Route
        path="/blotter"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'captain']}>
            <AdminLayout>
              <BlotterManagement />
            </AdminLayout>
          </RoleBasedRoute>
        }
      />

      {/* Catch all - redirect to dashboard */}
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
