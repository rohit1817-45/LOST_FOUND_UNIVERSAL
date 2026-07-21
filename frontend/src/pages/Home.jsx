import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CaseCard } from '@/components/CaseCard';
import { MapView } from '@/components/MapView';
import { MapLegend } from '@/components/MapLegend';
import { PawPrint, ShieldCheck, Users, Bell, MapPin, ArrowRight } from 'lucide-react';

export default function Home({ onReport }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, recovered: 0 });
  const nav = useNavigate();

  useEffect(() => {
    let mounted = true;
    api.get('/cases?limit=8')
      .then(({ data }) => { if (mounted) setItems(data.items || []); })
      .catch((e) => { console.error('[home] recent cases failed:', e?.response?.data || e?.message); });
    api.get('/admin/stats')
      .then(({ data }) => { if (mounted) setStats(data); })
      .catch(() => { /* non-admins are expected to get 403 here */ });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="relative">
      <section className="hero-hope relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 pt-14 pb-16 lg:pt-24 lg:pb-24 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 backdrop-blur px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Community. NGOs. Police. One trusted network.
            </div>
            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight">Bringing families back together.</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-[60ch]">Report a lost or found pet, or a missing or found person in India. ULFN routes your report to nearby citizens, verified NGO shelters, and police stations — and intelligently matches lost with found in seconds.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={onReport} data-testid="hero-report-button">Report now</Button>
              <Button size="lg" variant="outline" onClick={() => nav('/browse')} data-testid="hero-browse-button"><MapPin className="h-4 w-4 mr-2" />Browse the map</Button>
            </div>
            <div className="mt-6 flex items-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-emerald-600" />Verified NGOs & Police</span>
              <span className="flex items-center gap-1"><Bell className="h-4 w-4 text-primary" />Smart alerts</span>
              <span className="flex items-center gap-1"><Users className="h-4 w-4 text-primary" />Free for citizens</span>
            </div>
          </div>
          <div className="relative h-[380px] lg:h-[460px] rounded-2xl overflow-hidden border shadow-lg">
            <MapView items={items} height="100%" />
            <MapLegend />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Recent reports</h2>
            <p className="text-muted-foreground text-sm">Freshly submitted cases in your community.</p>
          </div>
          <Link to="/browse" className="text-sm text-primary hover:underline">See all <ArrowRight className="inline h-4 w-4" /></Link>
        </div>
        {items.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="h-64 animate-pulse bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.slice(0, 8).map((it) => (
              <CaseCard key={it.case_id} item={it} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-secondary/50">
        <div className="container mx-auto px-4 sm:px-6 py-14 lg:py-20 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h2 className="text-3xl font-semibold">How ULFN works</h2>
            <p className="mt-3 text-muted-foreground">One centralized platform replaces scattered posters, group chats, and social media. Everyone works from the same trusted source of truth.</p>
          </div>
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
            {[
              { title: 'Report in 30 seconds', body: 'Type, description, location and photos. Auto-geolocation and drag-to-adjust map.' },
              { title: 'Smart matching', body: 'Our engine compares species, breed, color, description, distance, and time to find likely matches.' },
              { title: 'Verified partners', body: 'NGOs and police apply and are manually verified. Only they see role-specific queues.' },
              { title: 'Private messaging', body: 'Communicate through the app — no phone numbers exposed. Share images and location.' },
            ].map((c) => (
              <Card key={c.title} className="p-5">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center"><PawPrint className="h-5 w-5" /></div>
                <div className="mt-3 font-semibold">{c.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{c.body}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 py-14">
        <div className="rounded-2xl border p-8 lg:p-12 bg-card flex flex-col lg:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-semibold">Every second matters.</h3>
            <p className="text-muted-foreground mt-2">File a report and let the network do the searching for you.</p>
          </div>
          <div className="flex gap-3">
            <Button size="lg" onClick={onReport} data-testid="cta-report-button">Report now</Button>
            <Button size="lg" variant="outline" onClick={() => nav('/apply?kind=ngo')}>Apply as NGO</Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-sm text-muted-foreground">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} Universal Lost & Found Network</span>
          <div className="flex gap-4">
            <Link to="/browse">Browse</Link>
            <Link to="/how-it-works">How it Works</Link>
            <Link to="/apply?kind=ngo">For NGOs</Link>
            <Link to="/apply?kind=police">For Police</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
