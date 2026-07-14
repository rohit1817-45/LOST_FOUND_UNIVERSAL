import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { timeAgo } from '@/lib/format';
import { useAuth } from '@/lib/auth';

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await api.get('/notifications');
        if (!mounted) return;
        setItems(data.items || []);
        setUnread(data.unread || 0);
      } catch {}
    };
    load();
    const t = setInterval(load, 20000);
    return () => { mounted = false; clearInterval(t); };
  }, [user]);

  const markAll = async () => {
    try { await api.post('/notifications/read-all'); setUnread(0); setItems((x) => x.map((i) => ({ ...i, read_at: new Date().toISOString() }))); } catch {}
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="notification-bell-button">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-red-600 text-white p-0 flex items-center justify-center text-[10px]">{unread}</Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-auto" data-testid="notification-dropdown">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={markAll} data-testid="notification-mark-all-read">Mark all read</Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</div>
        ) : (
          items.slice(0, 15).map((n) => (
            <Link key={n.notif_id} to={n.case_id ? `/cases/${n.case_id}` : n.conversation_id ? '/messages' : '/notifications'} className={`block px-3 py-2 hover:bg-muted ${!n.read_at ? 'bg-muted/60' : ''}`}>
              <div className="text-sm font-medium">{n.title}</div>
              {n.body && <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>}
              <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</div>
            </Link>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
