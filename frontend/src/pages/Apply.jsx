import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Building2, ShieldCheck } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';

export default function Apply() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [kind, setKind] = useState(sp.get('kind') || 'ngo');
  const [form, setForm] = useState({ org_name: '', registration_no: '', address: '', contact_phone: '', contact_email: '', department: '', badge_id: '', jurisdiction: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState([]);

  useEffect(() => { if (user) api.get('/verifications/mine').then(({ data }) => setMine(data.items || [])).catch(() => {}); }, [user]);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await api.post('/verifications/apply', { kind, ...form });
      toast.success('Application submitted', { description: 'A platform admin will review it shortly.' });
      nav('/dashboard');
    } catch (err) {
      toast.error('Application failed', { description: err?.response?.data?.detail || 'Try again' });
    } finally { setBusy(false); }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Apply as verified organization</h1>
        <p className="text-sm text-muted-foreground">Verified NGOs and Police get access to role-specific dashboards and queues.</p>
      </div>
      <Tabs value={kind} onValueChange={setKind}>
        <TabsList>
          <TabsTrigger value="ngo" data-testid="apply-tab-ngo"><Building2 className="h-4 w-4 mr-1" />NGO / Shelter</TabsTrigger>
          <TabsTrigger value="police" data-testid="apply-tab-police"><ShieldCheck className="h-4 w-4 mr-1" />Police</TabsTrigger>
        </TabsList>
        <TabsContent value="ngo">
          <Card className="p-5">
            <form onSubmit={submit} className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Organization name *</Label><Input required value={form.org_name} onChange={(e) => setForm({ ...form, org_name: e.target.value })} data-testid="apply-orgname-input" /></div>
              <div><Label>Registration #</Label><Input value={form.registration_no} onChange={(e) => setForm({ ...form, registration_no: e.target.value })} data-testid="apply-regno-input" /></div>
              <div><Label>Contact phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
              <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div className="col-span-2"><Label>Contact email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
              <div className="col-span-2"><Label>Notes / links to documents</Label><Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="col-span-2"><Button type="submit" disabled={busy} className="w-full" data-testid="apply-submit-button">{busy ? 'Submitting…' : 'Submit application'}</Button></div>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="police">
          <Card className="p-5">
            <form onSubmit={submit} className="grid grid-cols-2 gap-3">
              <div><Label>Department *</Label><Input required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} data-testid="apply-department-input" /></div>
              <div><Label>Badge / Officer ID</Label><Input value={form.badge_id} onChange={(e) => setForm({ ...form, badge_id: e.target.value })} data-testid="apply-badge-input" /></div>
              <div className="col-span-2"><Label>Jurisdiction</Label><Input value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} /></div>
              <div><Label>Contact phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
              <div><Label>Official email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
              <div className="col-span-2"><Label>Notes</Label><Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="col-span-2"><Button type="submit" disabled={busy} className="w-full" data-testid="apply-submit-button">{busy ? 'Submitting…' : 'Submit application'}</Button></div>
            </form>
          </Card>
        </TabsContent>
      </Tabs>

      {mine.length > 0 && (
        <Card className="mt-6 p-4">
          <div className="font-medium mb-2">My applications</div>
          {mine.map((m) => (
            <div key={m.request_id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
              <div>{m.kind.toUpperCase()} · {m.org_name || m.department}</div>
              <div className="text-xs uppercase text-primary">{m.status}</div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
