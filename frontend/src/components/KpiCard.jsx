import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function KpiCard({ label, value, icon: Icon, hint, className, testid }) {
  return (
    <Card className={cn('overflow-hidden', className)} data-testid={testid || 'dashboard-kpi-card'}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}
