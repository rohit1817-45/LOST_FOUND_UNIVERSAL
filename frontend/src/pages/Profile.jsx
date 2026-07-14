import React from 'react';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  if (!user) return null;
  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 max-w-xl">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16"><AvatarImage src={user.picture} /><AvatarFallback>{(user.name || '?').slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
          <div>
            <div className="text-xl font-semibold">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <div className="mt-2 flex gap-2">
              <Badge variant="secondary">{user.role}</Badge>
              {user.verified && <Badge className="bg-emerald-600 text-white">Verified</Badge>}
              {user.org_name && <Badge variant="outline">{user.org_name}</Badge>}
            </div>
          </div>
        </div>
        <div className="mt-6 space-y-2 text-sm">
          <div><span className="text-muted-foreground">Provider:</span> {user.auth_provider}</div>
          <div><span className="text-muted-foreground">Joined:</span> {new Date(user.created_at).toLocaleDateString()}</div>
          <div><span className="text-muted-foreground">User ID:</span> <span className="case-id text-xs">{user.user_id}</span></div>
        </div>
        <div className="mt-6 flex gap-2">
          {user.role === 'user' && <Button variant="outline" onClick={() => nav('/apply?kind=ngo')}>Apply as NGO</Button>}
          {user.role === 'user' && <Button variant="outline" onClick={() => nav('/apply?kind=police')}>Apply as Police</Button>}
          <Button variant="destructive" onClick={async () => { await logout(); nav('/'); }}>Log out</Button>
        </div>
      </Card>
    </div>
  );
}
