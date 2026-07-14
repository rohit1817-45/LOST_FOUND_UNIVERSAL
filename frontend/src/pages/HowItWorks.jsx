import React from 'react';
import { Card } from '@/components/ui/card';
import { PawPrint, Search, Users, ShieldCheck } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    { icon: PawPrint, title: 'Report a case', body: 'Choose Lost or Found (Pet or Person), pin the location, add photos, submit. Under 30 seconds.' },
    { icon: Search, title: 'Smart matching', body: 'Our engine compares species, breed, color, description, distance, and time to find likely reunions.' },
    { icon: Users, title: 'Community response', body: 'Nearby users, verified NGOs and Police receive alerts about relevant cases.' },
    { icon: ShieldCheck, title: 'Verified partners', body: 'NGO shelters and police departments are manually verified. Every action is auditable.' },
  ];
  return (
    <div className="container mx-auto px-4 sm:px-6 py-14 max-w-4xl">
      <h1 className="text-4xl font-semibold">How ULFN works</h1>
      <p className="text-muted-foreground mt-3">A single trusted network replacing scattered posters and social posts.</p>
      <div className="grid sm:grid-cols-2 gap-4 mt-8">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.title} className="p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center"><Icon className="h-5 w-5" /></div>
              <div className="mt-3 font-semibold text-lg">{s.title}</div>
              <p className="text-sm text-muted-foreground mt-1">{s.body}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
