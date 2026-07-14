import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { KpiCard } from '@/components/KpiCard';
import { CaseCard } from '@/components/CaseCard';
import { Card } from '@/components/ui/card';
import { Building2, Activity, CheckCircle2, ListChecks } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function NgoDashboard() {
  const [data, setData] = useState({ nearby: [], accepted: [], completed: [] });
  useEffect(() => { api.get('/ngo/queue').then(({ data }) => setData(data)).catch(() => {}); }, []);
  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">NGO command center</h1>
        <p className="text-sm text-muted-foreground">Nearby pet reports, active rescues, and closed cases.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Nearby pet cases" value={data.nearby.length} icon={ListChecks} />
        <KpiCard label="Active rescues" value={data.accepted.filter((c) => !['recovered','closed'].includes(c.status)).length} icon={Activity} />
        <KpiCard label="Completed" value={data.completed.length} icon={CheckCircle2} />
        <KpiCard label="Verified NGO" value={"✓"} icon={Building2} />
      </div>
      <Tabs defaultValue="nearby">
        <TabsList>
          <TabsTrigger value="nearby" data-testid="ngo-tab-nearby">Nearby</TabsTrigger>
          <TabsTrigger value="active" data-testid="ngo-tab-active">Active</TabsTrigger>
          <TabsTrigger value="completed" data-testid="ngo-tab-completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="nearby" className="pt-4">
          <Grid items={data.nearby} empty="No nearby cases at the moment." />
        </TabsContent>
        <TabsContent value="active" className="pt-4">
          <Grid items={data.accepted} empty="You haven't accepted any rescues yet." />
        </TabsContent>
        <TabsContent value="completed" className="pt-4">
          <Grid items={data.completed} empty="No completed rescues yet." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
function Grid({ items, empty }) {
  if (!items?.length) return <Card className="p-10 text-center text-muted-foreground">{empty}</Card>;
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{items.map((i) => <CaseCard key={i.case_id} item={i} />)}</div>;
}
