import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const AuthCtx = createContext(null);

async function fetchProfile() {
  try {
    const { data } = await api.get("/auth/me");
    return data;
  } catch (error) {

    console.error("========== FETCH PROFILE FAILED ==========");
    console.error("Message:", error.message);

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response:", error.response.data);
    } else if (error.request) {
      console.error("No response received from backend.");
      console.error(error.request);
    } else {
      console.error(error);
    }

    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        const p = await fetchProfile();
        if (mounted) setUser(p);
      }
      if (mounted) setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session) {
        const p = await fetchProfile();
        if (mounted) setUser(p);
      } else {
        setUser(null);
      }
    });
    return () => { mounted = false; sub.subscription?.unsubscribe?.(); };
  }, []);

  const loginEmail = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const p = await fetchProfile();
    setUser(p);
    return p;
  };

  const register = async (name, email, password) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) throw error;
    // Depending on Supabase settings, sign-in may or may not be automatic.
    const { data } = await supabase.auth.getSession();
    if (!data?.session) {
      // try password login (works if email confirmation is disabled in Supabase project settings)
      const { error: err2 } = await supabase.auth.signInWithPassword({ email, password });
      if (err2) throw err2;
    }
    const p = await fetchProfile();
    setUser(p);
    return p;
  };

  const loginWithGoogle = async () => {
    const redirectTo = window.location.origin + '/auth/callback';
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const refresh = async () => {
    const p = await fetchProfile();
    setUser(p);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, loginEmail, register, loginWithGoogle, logout, refresh, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() { return useContext(AuthCtx); }
