import React from 'react';
import { useAuth } from '@/lib/auth';
import { Navigate, useLocation } from 'react-router-dom';

export function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="h-[60vh] flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (roles && roles.length && !roles.includes(user.role) && user.role !== 'admin') {
    return <div className="p-10 text-center"><h2 className="text-xl font-semibold">Forbidden</h2><p className="text-muted-foreground mt-2">Your role ({user.role}) doesn't have access to this page.</p></div>;
  }
  return children;
}
