import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

const legendItems = [
  { color: '#E23D3D', label: 'Lost' },
  { color: '#1F9D63', label: 'Found' },
  { color: '#2B6DEB', label: 'You' },
  { color: '#7C3AED', label: 'Match' },
  { color: '#F59E0B', label: 'Selected' },
];

export function MapLegend() {
  const [open, setOpen] = useState(true);
  return (
    <div className="absolute bottom-4 right-4 z-[400]">
      <Card className="p-2 shadow-lg">
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} className="w-full justify-between" data-testid="map-legend-toggle">
          Legend {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
        {open && (
          <div className="px-2 pb-2 pt-1 space-y-1.5" data-testid="map-legend-panel">
            {legendItems.map((l) => (
              <div key={l.label} className="flex items-center gap-2 text-xs">
                <span className="h-3 w-3 rounded-full border-2 border-white shadow" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
