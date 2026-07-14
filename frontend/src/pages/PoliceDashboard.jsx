import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { KpiCard } from '@/components/KpiCard';
import { CaseCard } from '@/components/CaseCard';
import { Card } from '@/components/ui/card';
import { ShieldCheck, AlertOctagon, ListChecks, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MapView } from '@/components/MapView';

export default function PoliceDashboard() {
  const [data, setData] = useState({ queue: [], critical: [], resolved: [] });
  useEffect(() => { api.get('/police/queue').then(({ data }) => setData(data)).catch(() => {}); }, []);
  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Police command center</h1>
        <p className="text-sm text-muted-foreground">Missing persons, critical alerts, and resolved cases.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Missing/Found persons" value={data.queue.length} icon={ListChecks} />
        <KpiCard label="Critical alerts" value={data.critical.length} icon={AlertOctagon} />
        <KpiCard label="Resolved by you" value={data.resolved.length} icon={CheckCircle2} />
        <KpiCard label="Verified Police" value={"✓"} icon={ShieldCheck} />
      </div>
      <Card className="h-[380px] overflow-hidden">
        <MapView items={data.queue} height="100%" />
      </Card>
      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue" data-testid="police-tab-queue">Investigation queue</TabsTrigger>
          <TabsTrigger value="critical" data-testid="police-tab-critical">Critical</TabsTrigger>
          <TabsTrigger value="resolved" data-testid="police-tab-resolved">Resolved</TabsTrigger>
        </TabsList>
        <TabsContent value="queue" className="pt-4">
          <Grid items={data.queue} empty="No open person cases." />
        </TabsContent>
        <TabsContent value="critical" className="pt-4">
          <Grid items={data.critical} empty="No critical cases." />
        </TabsContent>
        <TabsContent value="resolved" className="pt-4">
          <Grid items={data.resolved} empty="No resolved cases yet." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
function Grid({ items, empty }) {
  if (!items?.length) return <Card className="p-10 text-center text-muted-foreground">{empty}</Card>;
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{items.map((i) => <CaseCard key={i.case_id} item={i} />)}</div>;
}
