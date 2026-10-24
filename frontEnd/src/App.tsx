import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { HomePage } from './pages/public/HomePage';
import { DestinationsCatalogPage } from './pages/public/DestinationsCatalogPage';
import { DestinationDetailPage } from './pages/public/DestinationDetailPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { OwnerDashboard } from './pages/dashboard/OwnerDashboard';
import { ManagerDashboard } from './pages/dashboard/ManagerDashboard';
import { AgentDashboard } from './pages/dashboard/AgentDashboard';
import { ClientDashboard } from './pages/dashboard/ClientDashboard';
import { ReportsPage } from './pages/dashboard/ReportsPage';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes with Navbar and Footer */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/destinations" element={<DestinationsCatalogPage />} />
        <Route path="/destinations/:slug" element={<DestinationDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Dashboard Routes with Sidebar and Header */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route path="owner" element={<OwnerDashboard />} />
        <Route path="manager" element={<ManagerDashboard />} />
        <Route path="agent" element={<AgentDashboard />} />
        <Route path="client" element={<ClientDashboard />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
