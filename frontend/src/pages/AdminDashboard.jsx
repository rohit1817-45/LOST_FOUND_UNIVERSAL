import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { KpiCard } from '@/components/KpiCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PawPrint, Users, ShieldCheck, TrendingUp, AlertOctagon, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { toast } from 'sonner';
import { TYPE_LABEL, STATUS_LABEL, timeAgo, niceDate } from '@/lib/format';
import { Link } from 'react-router-dom';

const COLORS = ['#0891b2', '#f97316', '#059669', '#f59e0b', '#dc2626'];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [cases, setCases] = useState([]);

  const load = async () => {
    try {
      const [s, v, u, a, c] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/verifications?status=pending'),
        api.get('/admin/users'),
        api.get('/admin/audit'),
        api.get('/admin/cases'),
      ]);
      setStats(s.data); setPending(v.data.items || []); setUsers(u.data.items || []); setAudit(a.data.items || []); setCases(c.data.items || []);
    } catch (e) {
      toast.error('Could not load admin data');
    }
  };
  useEffect(() => { load(); }, []);

  const monthly = useMemo(() => stats?.monthly || [], [stats]);
  const byType = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.by_type).map(([k, v]) => ({ name: TYPE_LABEL[k], value: v }));
  }, [stats]);

  const approve = async (id) => { await api.post(`/admin/verifications/${id}/approve`); toast.success('Approved'); load(); };
  const reject = async (id) => { const r = window.prompt('Reason?') || ''; await api.post(`/admin/verifications/${id}/reject`, { reason: r }); toast.info('Rejected'); load(); };
  const verifyCase = async (id) => { await api.post(`/admin/cases/${id}/verify`); toast.success('Verified'); load(); };
  const spamCase = async (id) => { await api.post(`/admin/cases/${id}/mark-spam`); toast.info('Marked as spam'); load(); };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin console</h1>
        <p className="text-sm text-muted-foreground">Platform-wide analytics, verifications, users, and audit logs.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total reports" value={stats?.total ?? '–'} icon={PawPrint} />
        <KpiCard label="Recovered" value={stats?.recovered ?? '–'} icon={CheckCircle} hint={`${stats?.recovery_rate ?? 0}% rate`} />
        <KpiCard label="Pending NGO" value={stats?.pending_ngo ?? '–'} icon={ShieldCheck} />
        <KpiCard label="Pending Police" value={stats?.pending_police ?? '–'} icon={ShieldCheck} />
        <KpiCard label="Pending reports" value={stats?.pending_reports ?? '–'} icon={AlertOctagon} />
        <KpiCard label="Users" value={stats?.users ?? '–'} icon={Users} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="font-medium mb-3">Reports over time</div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#0891b2" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <div className="font-medium mb-3">By case type</div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byType} innerRadius={40} outerRadius={80} dataKey="value" label>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="verifications">
        <TabsList>
          <TabsTrigger value="verifications" data-testid="admin-tab-verifications">Verifications ({pending.length})</TabsTrigger>
          <TabsTrigger value="cases" data-testid="admin-tab-cases">Cases</TabsTrigger>
          <TabsTrigger value="users" data-testid="admin-tab-users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="audit" data-testid="admin-tab-audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="verifications" className="pt-4">
          <Card>
            <Table data-testid="verification-queue-table">
              <TableHeader><TableRow><TableHead>Applicant</TableHead><TableHead>Kind</TableHead><TableHead>Org</TableHead><TableHead>Applied</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {pending.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No pending applications</TableCell></TableRow>}
                {pending.map((r) => (
                  <TableRow key={r.request_id} data-testid="verification-queue-row">
                    <TableCell><div className="font-medium">{r.applicant_name}</div><div className="text-xs text-muted-foreground">{r.applicant_email}</div></TableCell>
                    <TableCell><Badge variant="secondary">{r.kind.toUpperCase()}</Badge></TableCell>
                    <TableCell><div>{r.org_name}</div><div className="text-xs text-muted-foreground">{r.department || r.registration_no}</div></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => approve(r.request_id)} data-testid="admin-verify-ngo-approve-button">Approve</Button>
                      <Button size="sm" variant="destructive" className="ml-2" onClick={() => reject(r.request_id)} data-testid="admin-verify-ngo-reject-button">Reject</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="cases" className="pt-4">
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Case</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Verified</TableHead><TableHead>Reporter</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {cases.slice(0, 40).map((c) => (
                  <TableRow key={c.case_id}>
                    <TableCell><Link to={`/cases/${c.case_id}`} className="font-medium hover:underline">{c.name || c.breed || TYPE_LABEL[c.type]}</Link><div className="text-xs case-id text-muted-foreground">{c.case_id}</div></TableCell>
                    <TableCell><Badge variant="secondary">{TYPE_LABEL[c.type]}</Badge></TableCell>
                    <TableCell><Badge>{STATUS_LABEL[c.status]}</Badge></TableCell>
                    <TableCell>{c.verified ? <Badge className="bg-emerald-600 text-white">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                    <TableCell className="text-xs">{c.reporter_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{niceDate(c.created_at)}</TableCell>
                    <TableCell className="text-right">
                      {!c.verified && <Button size="sm" onClick={() => verifyCase(c.case_id)}>Verify</Button>}
                      {c.status !== 'spam' && <Button size="sm" variant="destructive" className="ml-2" onClick={() => spamCase(c.case_id)}>Spam</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="pt-4">
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-xs">{u.email}</TableCell>
                    <TableCell><Badge variant="secondary">{u.role}</Badge>{u.verified && <Badge className="ml-1 bg-emerald-600 text-white">verified</Badge>}</TableCell>
                    <TableCell>{u.suspended ? <Badge variant="destructive">Suspended</Badge> : <Badge variant="outline">Active</Badge>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{niceDate(u.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="pt-4">
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead></TableRow></TableHeader>
              <TableBody>
                {audit.map((a) => (
                  <TableRow key={a.log_id}>
                    <TableCell className="text-xs">{niceDate(a.created_at)} · {timeAgo(a.created_at)}</TableCell>
                    <TableCell className="text-xs case-id">{a.actor_id}</TableCell>
                    <TableCell><Badge variant="secondary">{a.action}</Badge></TableCell>
                    <TableCell className="text-xs case-id">{a.target}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
