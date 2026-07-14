import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PawPrint } from 'lucide-react';

export default function AuthCallback() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    if (processed.current) return; processed.current = true;
    const hash = window.location.hash || '';
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const sessionId = params.get('session_id');
    if (!sessionId) { nav('/login', { replace: true }); return; }
    (async () => {
      try {
        const { data } = await api.post('/auth/oauth/session', { session_id: sessionId });
        setUser(data.user);
        // Clear hash to avoid re-processing
        window.history.replaceState(null, '', '/dashboard');
        nav('/dashboard', { replace: true, state: { user: data.user } });
      } catch (e) {
        nav('/login', { replace: true, state: { error: 'OAuth session invalid' } });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center"><PawPrint className="h-4 w-4 animate-pulse" /></span>
        Finishing sign in…
      </div>
    </div>
  );
}
