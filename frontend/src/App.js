import React, { useState } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import { TopNav } from '@/components/TopNav';
import { ReportWizard } from '@/components/ReportWizard';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import Home from '@/pages/Home';
import Browse from '@/pages/Browse';
import CaseDetail from '@/pages/CaseDetail';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import AuthCallback from '@/pages/AuthCallback';
import UserDashboard from '@/pages/UserDashboard';
import NgoDashboard from '@/pages/NgoDashboard';
import PoliceDashboard from '@/pages/PoliceDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import Messages from '@/pages/Messages';
import NotificationsPage from '@/pages/NotificationsPage';
import Apply from '@/pages/Apply';
import Profile from '@/pages/Profile';
import HowItWorks from '@/pages/HowItWorks';

function AppShell() {
  const location = useLocation();
  const [wizardOpen, setWizardOpen] = useState(false);
  const { user } = useAuth() || {};

  // Handle OAuth callback fragment on any route
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  const openWizard = () => setWizardOpen(true);

  return (
    <div className="min-h-screen">
      <TopNav onReport={openWizard} />
      <Routes>
        <Route path="/" element={<Home onReport={openWizard} />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            {user?.role === 'ngo' ? <NgoDashboard /> : user?.role === 'police' ? <PoliceDashboard /> : user?.role === 'admin' ? <AdminDashboard /> : <UserDashboard />}
          </ProtectedRoute>
        } />
        <Route path="/ngo" element={<ProtectedRoute roles={['ngo']}><NgoDashboard /></ProtectedRoute>} />
        <Route path="/police" element={<ProtectedRoute roles={['police']}><PoliceDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/apply" element={<ProtectedRoute><Apply /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="*" element={<div className="container mx-auto p-16 text-center"><h1 className="text-3xl font-semibold">Page not found</h1></div>} />
      </Routes>
      <ReportWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      <Toaster position="top-center" richColors />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
