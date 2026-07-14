import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MapView } from '@/components/MapView';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { CaseCard } from '@/components/CaseCard';
import { TYPE_LABEL, STATUS_LABEL, timeAgo, niceDate, isLost, isPerson } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { MapPin, Clock, MessageSquare, Bookmark, ShieldCheck, RefreshCw, Building2, Flag, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [statusPick, setStatusPick] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/cases/${id}`);
      setData(data);
    } catch (e) {
      toast.error('Case not found');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-12 text-center">Case not found</div>;
  const c = data.case;
  const lost = isLost(c.type);
  const person = isPerson(c.type);

  const canModerate = user && (user.role === 'admin' || (user.role === 'ngo' && !person) || (user.role === 'police' && person) || user.user_id === c.reporter_id);

  const startMessage = async () => {
    if (!user) return nav('/login');
    if (user.user_id === c.reporter_id) return toast('You can\'t message yourself.');
    if (!msg.trim()) return;
    setSending(true);
    try {
      const { data: r } = await api.post('/messages', { to_user_id: c.reporter_id, case_id: c.case_id, text: msg });
      toast.success('Message sent');
      setMsg('');
      nav('/messages');
    } catch (e) {
      toast.error('Could not send message');
    } finally { setSending(false); }
  };

  const bookmark = async () => { try { await api.post(`/bookmarks/${c.case_id}`); toast.success('Saved to bookmarks'); } catch {} };
  const rematch = async () => { try { const { data: r } = await api.post(`/cases/${c.case_id}/rematch`); toast.success(`Recomputed: ${r.matches?.length || 0} matches`); load(); } catch {} };
  const updateStatus = async (val) => {
    try { await api.patch(`/cases/${c.case_id}`, { status: val }); toast.success('Status updated'); load(); } catch (e) { toast.error(e?.response?.data?.detail || 'Update failed'); }
  };
  const verifyCase = async () => { try { await api.post(`/admin/cases/${c.case_id}/verify`); toast.success('Case verified'); load(); } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } };
  const markSpam = async () => { try { await api.post(`/admin/cases/${c.case_id}/mark-spam`); toast.success('Marked as spam'); load(); } catch (e) { toast.error('Failed'); } };
  const assignSelf = async () => { try { const kind = user.role === 'ngo' ? 'ngo' : 'police'; await api.post(`/cases/${c.case_id}/assign?kind=${kind}`); toast.success('Case assigned to you'); load(); } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); } };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${lost ? 'bg-red-600' : 'bg-emerald-600'} text-white`}>{TYPE_LABEL[c.type]}</Badge>
          <Badge variant="secondary">{STATUS_LABEL[c.status]}</Badge>
          {c.verified && <Badge className="bg-emerald-600 text-white">Verified</Badge>}
          {c.priority && c.priority !== 'normal' && <Badge variant="destructive">{c.priority.toUpperCase()}</Badge>}
          <span className="text-xs text-muted-foreground case-id ml-auto">{c.case_id}</span>
        </div>

        <div>
          <h1 className="text-3xl font-semibold">{c.name || c.breed || TYPE_LABEL[c.type]}</h1>
          <div className="text-sm text-muted-foreground mt-1">{[c.species, c.breed, c.color, c.age].filter(Boolean).join(' · ')}</div>
        </div>

        {c.photos?.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {c.photos.map((p, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted"><img src={p.data_url} alt="" className="h-full w-full object-cover" /></div>
            ))}
          </div>
        ) : null}

        <Card className="p-5">
          <div className="text-sm font-medium mb-2">Description</div>
          <p className="text-sm whitespace-pre-line">{c.description}</p>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-medium mb-2">Location</div>
          <div className="text-sm text-muted-foreground mb-3 flex items-center gap-1"><MapPin className="h-4 w-4" />{c.location?.address || `${c.location?.lat?.toFixed(4)}, ${c.location?.lng?.toFixed(4)}`}</div>
          <div className="h-[280px] rounded-lg overflow-hidden border"><MapView items={[c]} height="100%" center={[c.location?.lat, c.location?.lng]} /></div>
        </Card>

        <Tabs defaultValue="matches">
          <TabsList>
            <TabsTrigger value="matches" data-testid="tab-matches">Matches ({data.matches?.length || 0})</TabsTrigger>
            <TabsTrigger value="nearby" data-testid="tab-nearby">Nearby ({data.nearby?.length || 0})</TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
          </TabsList>
          <TabsContent value="matches" className="pt-4">
            {data.matches?.length === 0 && <div className="text-sm text-muted-foreground">No matches yet. Try recomputing.</div>}
            <div className="grid sm:grid-cols-2 gap-3">
              {(data.matches || []).map((m) => (
                <Card key={m.candidate_id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Distance: {m.distance_km} km</div>
                    <ConfidenceBadge confidence={m.confidence} score={m.score} />
                  </div>
                  <div className="flex gap-3">
                    {m.candidate_summary?.first_photo && <img src={m.candidate_summary.first_photo} alt="" className="h-16 w-16 object-cover rounded" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{m.candidate_summary?.name || m.candidate_summary?.breed || TYPE_LABEL[m.candidate_summary?.type]}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{m.candidate_summary?.description}</div>
                    </div>
                  </div>
                  <Link className="text-xs text-primary hover:underline" to={`/cases/${m.candidate_id}`}>Open match →</Link>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="nearby" className="pt-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(data.nearby || []).map((n) => <CaseCard key={n.case_id} item={n} />)}
            </div>
          </TabsContent>
          <TabsContent value="timeline" className="pt-4">
            <ol className="relative border-l-2 border-muted ml-2 space-y-4">
              {(data.timeline || []).map((t, i) => (
                <li key={i} className="ml-4">
                  <div className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-primary" />
                  <div className="text-sm font-medium">{t.event}</div>
                  <div className="text-xs text-muted-foreground">{niceDate(t.created_at)} · {timeAgo(t.created_at)}</div>
                </li>
              ))}
            </ol>
          </TabsContent>
        </Tabs>
      </div>

      <aside className="space-y-4">
        <Card className="p-5 space-y-3">
          <div className="text-sm font-medium">Reporter</div>
          <div className="text-sm">{c.reporter_name || 'Anonymous'}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Reported {timeAgo(c.created_at)}</div>
          {user && user.user_id !== c.reporter_id ? (
            <div className="space-y-2">
              <Textarea rows={3} placeholder="Send a private message about this case…" value={msg} onChange={(e) => setMsg(e.target.value)} data-testid="case-detail-message-textarea" />
              <Button className="w-full" onClick={startMessage} disabled={sending || !msg.trim()} data-testid="case-detail-message-button"><MessageSquare className="h-4 w-4 mr-2" />Send private message</Button>
            </div>
          ) : !user ? (
            <Button className="w-full" onClick={() => nav('/login')}>Sign in to contact</Button>
          ) : (
            <div className="text-xs text-muted-foreground">This is your report.</div>
          )}
          <div className="flex gap-2">
            {user && <Button variant="outline" size="sm" onClick={bookmark} data-testid="case-detail-bookmark-button"><Bookmark className="h-4 w-4 mr-1" />Save</Button>}
            <Button variant="outline" size="sm" onClick={rematch} data-testid="case-detail-rematch-button"><RefreshCw className="h-4 w-4 mr-1" />Recompute matches</Button>
          </div>
        </Card>

        {canModerate && (
          <Card className="p-5 space-y-3">
            <div className="text-sm font-medium">Actions</div>
            {user.role === 'ngo' && !person && !c.assigned_ngo_id && (
              <Button variant="secondary" className="w-full" onClick={assignSelf} data-testid="case-assign-ngo"><Building2 className="h-4 w-4 mr-2" />Accept rescue</Button>
            )}
            {user.role === 'police' && person && !c.assigned_police_id && (
              <Button variant="secondary" className="w-full" onClick={assignSelf} data-testid="case-assign-police"><ShieldCheck className="h-4 w-4 mr-2" />Take investigation</Button>
            )}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Update status</div>
              <Select value={statusPick} onValueChange={(v) => { setStatusPick(v); updateStatus(v); }}>
                <SelectTrigger data-testid="case-status-select"><SelectValue placeholder="Choose new status" /></SelectTrigger>
                <SelectContent>
                  {(person ? ['under_investigation','located','closed','searching','match_confirmed'] : ['searching','possible_match','match_confirmed','recovered','closed']).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {user.role === 'admin' && (
              <div className="flex gap-2">
                <Button size="sm" onClick={verifyCase} data-testid="case-admin-verify"><CheckCircle className="h-4 w-4 mr-1" />Verify</Button>
                <Button size="sm" variant="destructive" onClick={markSpam} data-testid="case-admin-spam"><Flag className="h-4 w-4 mr-1" />Spam</Button>
              </div>
            )}
          </Card>
        )}
      </aside>
    </div>
  );
}
