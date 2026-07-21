import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const AuthCtx = createContext(null);

async function fetchProfile() {
  try {
    const { data } = await api.get('/auth/me');
    return data;
  } catch (error) {
    // Surface real errors instead of hiding them; caller decides what to do.
    console.error('[auth] fetchProfile failed:', {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Guard so we don't re-fetch the profile on TOKEN_REFRESHED / USER_UPDATED
  // events (those keep firing during normal use and cause races).
  const lastUserIdRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          const p = await fetchProfile();
          if (!mounted) return;
          if (p) {
            lastUserIdRef.current = p.user_id;
            setUser(p);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        lastUserIdRef.current = null;
        setUser(null);
        return;
      }

      // Only refetch profile when the user identity actually changed. Ignore
      // TOKEN_REFRESHED / USER_UPDATED / INITIAL_SESSION for the same user
      // (which fire frequently and were causing race conditions).
      const uid = session.user?.id;
      if (uid && uid !== lastUserIdRef.current) {
        const p = await fetchProfile();
        if (!mounted) return;
        if (p) {
          lastUserIdRef.current = p.user_id;
          setUser(p);
        }
      }
    });

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  const loginEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // The auth listener will pick up SIGNED_IN and load the profile once,
    // but we also fetch here and set state synchronously so navigation after
    // login has an immediate `user` (no flicker back to /login).
    const p = await fetchProfile();
    if (p) {
      lastUserIdRef.current = p.user_id;
      setUser(p);
    } else {
      // Backend up but profile not loadable -> raise a real error so the UI
      // can stop the spinner instead of hanging forever.
      throw new Error('Signed in, but the backend is unreachable. Please retry in a few seconds.');
    }
    return p;
  };

  const register = async (name, email, password) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) throw error;
    const { data } = await supabase.auth.getSession();
    if (!data?.session) {
      const { error: err2 } = await supabase.auth.signInWithPassword({ email, password });
      if (err2) throw err2;
    }
    const p = await fetchProfile();
    if (p) {
      lastUserIdRef.current = p.user_id;
      setUser(p);
    }
    return p;
  };

  const loginWithGoogle = async () => {
    const redirectTo = window.location.origin + '/auth/callback';
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    lastUserIdRef.current = null;
    setUser(null);
  };

  const refresh = async () => {
    const p = await fetchProfile();
    if (p) setUser(p);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, loginEmail, register, loginWithGoogle, logout, refresh, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
