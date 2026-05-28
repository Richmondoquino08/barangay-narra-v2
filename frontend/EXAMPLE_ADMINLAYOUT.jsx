// EXAMPLE: Updated AdminLayout.jsx with All Routes
// This shows where to add the role-specific routes we created

import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Dashboard from '../pages/Dashboard';

// ✅ NEW: Import role-based dashboards
import SecretaryDashboard from '../pages/SecretaryDashboard';
import CaptainDashboard from '../pages/CaptainDashboard';
import TreasurerDashboard from '../pages/TreasurerDashboard';

// ✅ EXISTING: Common pages
import Residents from '../pages/Residents';
import Requests from '../pages/Requests';
import ResidentProfile from '../pages/ResidentProfile';

// ✅ NEW: Import role-specific pages
import FinanceReports from '../pages/FinanceReports';
import BlotterManagement from '../pages/BlotterManagement';

// ✅ NEW: Import utilities
import { fetchProfile } from '../api/auth';
import { clearToken } from '../utils/auth';
import { ROLES } from '../utils/roles';
import ProtectedRoute from '../components/ProtectedRoute';

export default function AdminLayout() {
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile()
      .then((data) => setProfile(data.user))
      .catch(() => {
        clearToken();
        navigate('/login');
      });
  }, [navigate]);

  // ✅ NEW: Function to return correct dashboard based on role
  const getRoleDashboard = () => {
    switch (profile?.role) {
      case ROLES.SECRETARY:
        return <SecretaryDashboard />;
      case ROLES.CAPTAIN:
        return <CaptainDashboard />;
      case ROLES.TREASURER:
        return <TreasurerDashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex">
        {/* ✅ UPDATED: Pass userRole to Sidebar */}
        <Sidebar userRole={profile?.role} />
        
        <div className="flex-1 p-4 lg:p-6">
          {/* ✅ UPDATED: Header now shows role */}
          <Header user={profile} />
          
          <div className="mt-4">
            <Routes>
              {/* ===== ROLE-BASED DASHBOARDS ===== */}
              {/* Each role gets their own dashboard on "/" route */}
              <Route path="/" element={getRoleDashboard()} />

              {/* ===== COMMON ROUTES (All Roles) ===== */}
              {/* These are accessible to all authenticated users */}
              <Route path="/residents" element={<Residents />} />
              <Route path="/residents/:id" element={<ResidentProfile />} />
              <Route path="/requests" element={<Requests />} />

              {/* ===== SECRETARY-ONLY ROUTES ===== */}
              {/* 
                Example: Announcements page accessible to Secretary and Admin
                
                To add: Create src/pages/Announcements.jsx, then add:
              */}
              {/*
              <Route
                path="/announcements"
                element={
                  <ProtectedRoute 
                    requiredRoles={[ROLES.SECRETARY, ROLES.ADMIN]}
                    userRole={profile?.role}
                    fallbackPath="/"
                  >
                    <Announcements />
                  </ProtectedRoute>
                }
              />
              */}

              {/* ===== CAPTAIN-ONLY ROUTES ===== */}
              {/* Blotter Management - Captain and Admin only */}
              <Route
                path="/blotter"
                element={
                  <ProtectedRoute 
                    requiredRoles={[ROLES.CAPTAIN, ROLES.ADMIN]}
                    userRole={profile?.role}
                    fallbackPath="/"
                  >
                    <BlotterManagement />
                  </ProtectedRoute>
                }
              />

              {/* ===== TREASURER-ONLY ROUTES ===== */}
              {/* Finance Reports - Treasurer and Admin only */}
              <Route
                path="/finance-reports"
                element={
                  <ProtectedRoute 
                    requiredRoles={[ROLES.TREASURER, ROLES.ADMIN]}
                    userRole={profile?.role}
                    fallbackPath="/"
                  >
                    <FinanceReports />
                  </ProtectedRoute>
                }
              />

              {/* ===== ADMIN-ONLY ROUTES ===== */}
              {/* 
                Example: Settings page accessible to Admin only
                
                To add: Create src/pages/AdminSettings.jsx, then add:
              */}
              {/*
              <Route
                path="/settings"
                element={
                  <ProtectedRoute 
                    requiredRoles={ROLES.ADMIN}
                    userRole={profile?.role}
                    fallbackPath="/"
                  >
                    <AdminSettings />
                  </ProtectedRoute>
                }
              />
              */}

              {/* 404 Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}

/*
================================================================================
QUICK REFERENCE: How to Add New Routes
================================================================================

1. COMMON ROUTE (All users):
   <Route path="/path" element={<Component />} />

2. SINGLE ROLE ROUTE:
   <Route
     path="/path"
     element={
       <ProtectedRoute 
         requiredRoles={ROLES.SECRETARY}
         userRole={profile?.role}
       >
         <Component />
       </ProtectedRoute>
     }
   />

3. MULTIPLE ROLES:
   <Route
     path="/path"
     element={
       <ProtectedRoute 
         requiredRoles={[ROLES.SECRETARY, ROLES.ADMIN]}
         userRole={profile?.role}
       >
         <Component />
       </ProtectedRoute>
     }
   />

================================================================================
COMPONENT IMPORT TEMPLATE
================================================================================

Add to top of file:
import ComponentName from '../pages/ComponentName';

Then add route below.

================================================================================
SIDEBAR INTEGRATION
================================================================================

For the new route to appear in sidebar, add to Sidebar.jsx:

case ROLES.SECRETARY:
  return [
    ...baseLinks,
    { label: 'Your Link', to: '/your-path' },  ← Add here
  ];

================================================================================
*/
