import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { KpiCard } from '@/components/KpiCard';
import { CaseCard } from '@/components/CaseCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PawPrint, Bell, Bookmark, MapPin, MessageSquare, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function UserDashboard() {
  const [mine, setMine] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [conv, setConv] = useState(0);
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    api.get('/cases/mine').then(({ data }) => setMine(data.items || [])).catch(() => {});
    api.get('/bookmarks').then(({ data }) => setBookmarks(data.items || [])).catch(() => {});
    api.get('/notifications').then(({ data }) => setNotifCount(data.unread || 0)).catch(() => {});
    api.get('/conversations').then(({ data }) => setConv(data.items?.length || 0)).catch(() => {});
    api.get('/saved-searches').then(({ data }) => setSaved(data.items || [])).catch(() => {});
  }, []);

  const active = mine.filter((c) => !['recovered', 'closed', 'located', 'spam'].includes(c.status));
  const resolved = mine.filter((c) => ['recovered', 'closed', 'located', 'match_confirmed'].includes(c.status));
  const matches = mine.reduce((n, c) => n + (c.status === 'possible_match' ? 1 : 0), 0);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your dashboard</h1>
          <p className="text-sm text-muted-foreground">Track your reports, matches, and messages.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Active reports" value={active.length} icon={PawPrint} />
        <KpiCard label="Possible matches" value={matches} icon={Search} />
        <KpiCard label="Unread notifications" value={notifCount} icon={Bell} />
        <KpiCard label="Conversations" value={conv} icon={MessageSquare} />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" data-testid="user-tab-active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="resolved" data-testid="user-tab-resolved">Resolved ({resolved.length})</TabsTrigger>
          <TabsTrigger value="bookmarks" data-testid="user-tab-bookmarks">Saved ({bookmarks.length})</TabsTrigger>
          <TabsTrigger value="searches" data-testid="user-tab-searches">Saved searches ({saved.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="pt-4">
          {active.length === 0 ? <Empty title="No active reports" cta="Report now" href="/browse" /> : <Grid items={active} />}
        </TabsContent>
        <TabsContent value="resolved" className="pt-4">
          {resolved.length === 0 ? <Empty title="No resolved cases yet" /> : <Grid items={resolved} />}
        </TabsContent>
        <TabsContent value="bookmarks" className="pt-4">
          {bookmarks.length === 0 ? <Empty title="No saved cases" cta="Browse the map" href="/browse" /> : <Grid items={bookmarks} />}
        </TabsContent>
        <TabsContent value="searches" className="pt-4">
          {saved.length === 0 ? <Empty title="No saved searches" /> : (
            <div className="grid sm:grid-cols-2 gap-3">
              {saved.map((s) => (
                <Card key={s.search_id} className="p-4">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{JSON.stringify(s.filters)}</div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Empty({ title, cta, href }) {
  return (
    <Card className="p-10 text-center">
      <div className="text-lg font-medium">{title}</div>
      {cta && <Link to={href}><Button className="mt-3">{cta}</Button></Link>}
    </Card>
  );
}

function Grid({ items }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{items.map((i) => <CaseCard key={i.case_id} item={i} />)}</div>;
}
