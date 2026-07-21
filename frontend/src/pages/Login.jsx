import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PawPrint } from 'lucide-react';

export default function Login() {
  const { loginEmail, loginWithGoogle } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await loginEmail(email, password);
      const to = loc.state?.from?.pathname || '/dashboard';
      nav(to, { replace: true });
    } catch (err) {
      const isTimeout = err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '');
      toast.error('Login failed', {
        description: isTimeout
          ? 'The backend is waking up (Render free-tier cold start). Please retry in ~30s.'
          : err?.message || 'Check your credentials.',
      });
    } finally { setBusy(false); }
  };

  const googleLogin = async () => {
    try { await loginWithGoogle(); } catch (e) { toast.error('Google sign-in failed', { description: e?.message }); }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] grid place-items-center px-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center"><PawPrint className="h-5 w-5" /></span>
          <div>
            <div className="font-semibold">Welcome back</div>
            <div className="text-xs text-muted-foreground">Sign in to file reports, message, and manage cases.</div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="auth-email-input" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="auth-password-input" />
          </div>
          <Button type="submit" className="w-full" disabled={busy} data-testid="auth-login-submit">{busy ? 'Signing in…' : 'Sign in'}</Button>
        </form>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" onClick={googleLogin} data-testid="auth-google-button">Continue with Google</Button>
        <div className="text-sm text-center mt-4 text-muted-foreground">
          No account? <Link to="/register" className="text-primary hover:underline">Sign up</Link>
        </div>
        <div className="mt-4 text-[11px] text-muted-foreground bg-muted rounded-md p-2">
          Demo accounts (all password <span className="case-id">Demo1234!</span>): demo@ulfn.app · ngo@ulfn.app · police@ulfn.app · admin@ulfn.app
        </div>
      </Card>
    </div>
  );
}
