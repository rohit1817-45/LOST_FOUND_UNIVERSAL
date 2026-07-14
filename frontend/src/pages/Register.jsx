import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PawPrint } from 'lucide-react';

export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await register(name, email, password);
      nav('/dashboard', { replace: true });
    } catch (err) {
      toast.error('Sign up failed', { description: err?.message || 'Please try again.' });
    } finally { setBusy(false); }
  };

  const googleLogin = async () => { try { await loginWithGoogle(); } catch (e) { toast.error('Google sign-in failed'); } };

  return (
    <div className="min-h-[calc(100vh-64px)] grid place-items-center px-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center"><PawPrint className="h-5 w-5" /></span>
          <div>
            <div className="font-semibold">Join the network</div>
            <div className="text-xs text-muted-foreground">Reporting cases is free, safe, and takes seconds.</div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required data-testid="auth-name-input" /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="auth-email-input" /></div>
          <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} data-testid="auth-password-input" /></div>
          <Button type="submit" className="w-full" disabled={busy} data-testid="auth-register-submit">{busy ? 'Creating account…' : 'Create account'}</Button>
        </form>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" /></div>
        <Button variant="outline" className="w-full" onClick={googleLogin} data-testid="auth-google-button">Continue with Google</Button>
        <div className="text-sm text-center mt-4 text-muted-foreground">Already registered? <Link to="/login" className="text-primary hover:underline">Sign in</Link></div>
      </Card>
    </div>
  );
}
