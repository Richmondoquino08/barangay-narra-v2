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
import BlotterManagement from './pages/BlotterManagement';
import Announcements from './pages/Announcements';
import Documents from './pages/Documents';
import Settings from './pages/Settings';
import Officials from './pages/Officials';
import Projects from './pages/Projects';
import Assets from './pages/Assets';
import SocialPrograms from './pages/SocialPrograms';
import DRRM from './pages/DRRM';
import Reports from './pages/Reports';
import ChequePrint from './pages/ChequePrint';
import BarangayID from './pages/finance/BarangayID';
import Kidlat from './pages/finance/Kidlat';
import TripTicket from './pages/finance/TripTicket';
import PettyCashFund from './pages/finance/PettyCashFund';
import PettyCashVoucher from './pages/finance/PettyCashVoucher';
import RAO from './pages/finance/RAO';
import ObligationRequest from './pages/finance/procurement/ObligationRequest';
import PurchaseRequest from './pages/finance/procurement/PurchaseRequest';
import PurchaseOrder from './pages/finance/procurement/PurchaseOrder';
import InspectionAcceptance from './pages/finance/procurement/InspectionAcceptance';
import RequisitionIssue from './pages/finance/procurement/RequisitionIssue';
import DisbursementVoucher from './pages/finance/procurement/DisbursementVoucher';
import CRDR from './pages/finance/CRDR';
import CHBR from './pages/finance/CHBR';
import ChecksIssued from './pages/finance/ChecksIssued';
import ItemizedCollections from './pages/finance/ItemizedCollections';
import TransmittalLetter from './pages/finance/TransmittalLetter';
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

const ROLE_DASHBOARD = {
  captain:   '/captain-dashboard',
  secretary: '/secretary-dashboard',
  treasurer: '/treasurer-dashboard',
};

function SmartDashboard() {
  const { user } = useAuth();
  const dest = ROLE_DASHBOARD[user?.role];
  if (dest) return <Navigate to={dest} replace />;
  return <AdminDashboard />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Dashboards */}
      <Route path="/dashboard" element={<ProtectedRoute><AdminLayout><SmartDashboard /></AdminLayout></ProtectedRoute>} />
      <Route path="/captain-dashboard"   element={wrap(CaptainDashboard,   ['captain','admin'])} />
      <Route path="/secretary-dashboard" element={wrap(SecretaryDashboard, ['secretary','admin'])} />
      <Route path="/treasurer-dashboard" element={wrap(TreasurerDashboard, ['treasurer','admin'])} />

      {/* Records */}
      <Route path="/residents"    element={wrap(Residents,         ['admin','secretary'])} />
      <Route path="/residents/:id" element={wrap(ResidentProfile,  ['admin','secretary'])} />
      <Route path="/certificates" element={wrap(Certificates,      ['admin','secretary'])} />
      <Route path="/blotter"      element={wrap(BlotterManagement, ['admin','captain','secretary'])} />

      {/* Finance */}
      <Route path="/finance"       element={wrap(Finance,      ['admin','treasurer'])} />
      <Route path="/cheque-print" element={wrap(ChequePrint,  ['admin','treasurer'])} />
      <Route path="/reports"       element={wrap(Reports,      ['admin','treasurer','secretary','captain'])} />

      {/* Finance Forms */}
      <Route path="/finance/brgy-id" element={wrap(BarangayID, ['admin','treasurer','secretary'])} />
      <Route path="/finance/kidlat"  element={wrap(Kidlat,     ['admin','treasurer','secretary'])} />
      <Route path="/finance/trip"    element={wrap(TripTicket, ['admin','treasurer','secretary'])} />
      <Route path="/finance/pcf"     element={wrap(PettyCashFund,    ['admin','treasurer'])} />
      <Route path="/finance/sppcv"   element={wrap(PettyCashVoucher, ['admin','treasurer'])} />
      <Route path="/finance/rao"     element={wrap(RAO, ['admin','treasurer'])} />

      {/* Finance — Procurement Chain (ObR -> PR -> PO -> IAR -> RIS -> DV) */}
      <Route path="/finance/obr" element={wrap(ObligationRequest,   ['admin','treasurer'])} />
      <Route path="/finance/pr"  element={wrap(PurchaseRequest,     ['admin','treasurer','secretary'])} />
      <Route path="/finance/po"  element={wrap(PurchaseOrder,       ['admin','treasurer'])} />
      <Route path="/finance/iar" element={wrap(InspectionAcceptance,['admin','treasurer'])} />
      <Route path="/finance/ris" element={wrap(RequisitionIssue,    ['admin','treasurer','secretary'])} />
      <Route path="/finance/dv"  element={wrap(DisbursementVoucher, ['admin','treasurer'])} />

      {/* Finance — Cashbook Registers & Collections */}
      <Route path="/finance/crdr"        element={wrap(CRDR,                ['admin','treasurer'])} />
      <Route path="/finance/chbr"        element={wrap(CHBR,                ['admin','treasurer'])} />
      <Route path="/finance/checks"      element={wrap(ChecksIssued,        ['admin','treasurer'])} />
      <Route path="/finance/collections" element={wrap(ItemizedCollections, ['admin','treasurer'])} />
      <Route path="/finance/transmittal" element={wrap(TransmittalLetter,   ['admin','treasurer','secretary'])} />

      {/* Infrastructure */}
      <Route path="/officials" element={wrap(Officials, ['admin','secretary','captain','treasurer'])} />
      <Route path="/projects"  element={wrap(Projects,  ['admin','secretary'])} />
      <Route path="/assets"    element={wrap(Assets,    ['admin','secretary'])} />

      {/* Social Services */}
      <Route path="/social"    element={wrap(SocialPrograms, ['admin','secretary'])} />
      <Route path="/drrm"      element={wrap(DRRM,           ['admin','captain','secretary'])} />

      {/* Communication */}
      <Route path="/announcements" element={wrap(Announcements)} />
      <Route path="/documents"     element={wrap(Documents,  ['admin','secretary'])} />

      {/* Admin */}
      <Route path="/users"    element={wrap(Users,    ['admin'])} />
      <Route path="/settings" element={wrap(Settings, ['admin'])} />

      <Route path="/"  element={<Navigate to="/dashboard" replace />} />
      <Route path="*"  element={<Navigate to="/dashboard" replace />} />
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