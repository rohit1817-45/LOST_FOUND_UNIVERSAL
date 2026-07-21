import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { timeAgo } from '@/lib/format';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const load = async () => {
    try {
      const { data } = await api.get('/notifications');
      setItems(data.items || []);
    } catch (e) {
      console.error('[notifications] load failed:', e?.response?.data || e?.message);
      toast.error('Could not load notifications', { description: e?.response?.data?.detail || e?.message });
    }
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  const readAll = async () => {
    try {
      await api.post('/notifications/read-all');
      toast.success('Marked all read');
      load();
    } catch (e) {
      console.error('[notifications] readAll failed:', e?.message);
      toast.error('Could not mark notifications as read');
    }
  };
  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <Button variant="outline" onClick={readAll}>Mark all read</Button>
      </div>
      {items.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Nothing here yet.</Card>
      ) : (
        items.map((n) => (
          <Link key={n.notif_id} to={n.conversation_id ? `/messages?c=${n.conversation_id}` : n.case_id ? `/cases/${n.case_id}` : '/notifications'}>
            <Card className={`p-4 hover:bg-muted transition-colors ${!n.read_at ? 'border-primary/40' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{n.title}</div>
                  {n.body && <div className="text-sm text-muted-foreground">{n.body}</div>}
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{timeAgo(n.created_at)}</div>
              </div>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
