import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { PawPrint } from 'lucide-react';

export default function AuthCallback() {
  const nav = useNavigate();

  useEffect(() => {
    let t;
    (async () => {
      // supabase-js auto-processes the URL hash when detectSessionInUrl=true
      // just wait briefly then decide where to go.
      t = setTimeout(async () => {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          nav('/dashboard', { replace: true });
        } else {
          nav('/login', { replace: true, state: { error: 'OAuth session invalid' } });
        }
      }, 400);
    })();
    return () => t && clearTimeout(t);
  }, [nav]);

  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center"><PawPrint className="h-4 w-4 animate-pulse" /></span>
        Finishing sign in…
      </div>
    </div>
  );
}
