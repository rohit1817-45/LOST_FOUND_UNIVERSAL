import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { CaseCard } from '@/components/CaseCard';
import { MapView } from '@/components/MapView';
import { MapLegend } from '@/components/MapLegend';
import { Search as SearchIcon, Filter, Locate } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

const TYPE_OPTIONS = [
  { v: 'lost_pet', label: 'Lost pets' },
  { v: 'found_pet', label: 'Found pets' },
  { v: 'missing_person', label: 'Missing persons' },
  { v: 'found_person', label: 'Found persons' },
];

export default function Browse() {
  const [q, setQ] = useState('');
  const [types, setTypes] = useState(['lost_pet', 'found_pet', 'missing_person', 'found_person']);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [center, setCenter] = useState(null);
  const [radiusKm, setRadiusKm] = useState(50);
  const [useRadius, setUseRadius] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (types.length && types.length < 4) params.set('type', types.join(','));
      if (q.trim()) params.set('q', q.trim());
      if (useRadius && center) { params.set('lat', center[0]); params.set('lng', center[1]); params.set('radius_km', radiusKm); }
      params.set('limit', 120);
      const { data } = await api.get(`/cases?${params.toString()}`);
      setItems(data.items || []);
    } catch (e) {
      // Root cause of "Browse randomly becomes empty": this used to be a silent
      // failure (try/finally, no catch). Now we surface it so the user knows
      // and old items stay on screen instead of vanishing.
      console.error('[browse] fetchList failed:', e?.response?.data || e?.message);
      toast.error('Could not load reports', {
        description: e?.response?.data?.detail || e?.message || 'Please retry in a moment.',
      });
    } finally { setLoading(false); }
  }, [q, types, useRadius, center, radiusKm]);

  // Debounce the search so typing doesn't fire an API request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => { fetchList(); }, 300);
    return () => clearTimeout(t);
  }, [fetchList]);

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition((p) => {
      setCenter([p.coords.latitude, p.coords.longitude]); setUseRadius(true);
    });
  };

  const toggleType = (v) => setTypes((arr) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col lg:flex-row">
      <div className="lg:w-[440px] xl:w-[520px] border-r flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input className="pl-8" placeholder="brown labrador, poodle, red collar…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchList()} data-testid="browse-search-input" />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Filters" data-testid="browse-filter-button"><Filter className="h-4 w-4" /></Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="space-y-3">
                  <div className="text-sm font-medium">Case types</div>
                  {TYPE_OPTIONS.map((o) => (
                    <label key={o.v} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={types.includes(o.v)} onCheckedChange={() => toggleType(o.v)} data-testid={`browse-filter-${o.v}`} />
                      {o.label}
                    </label>
                  ))}
                  <div className="pt-2">
                    <div className="flex items-center gap-2 text-sm font-medium">Radius search</div>
                    <label className="flex items-center gap-2 text-sm mt-2">
                      <Checkbox checked={useRadius} onCheckedChange={(v) => setUseRadius(!!v)} data-testid="browse-radius-toggle" />
                      Only within {radiusKm} km of a point
                    </label>
                    <div className="mt-2"><Slider min={5} max={300} step={5} value={[radiusKm]} onValueChange={([v]) => setRadiusKm(v)} data-testid="browse-radius-slider" /></div>
                    <Button variant="outline" size="sm" className="mt-2" onClick={useMyLocation} data-testid="browse-use-my-location"><Locate className="h-3 w-3 mr-1" />Use my location</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((o) => (
              <Badge key={o.v} variant={types.includes(o.v) ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => toggleType(o.v)}>{o.label}</Badge>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {loading && items.length === 0 && [...Array(4)].map((_, i) => <Card key={i} className="h-40 animate-pulse bg-muted" />)}
          {items.length === 0 && !loading && <div className="text-center text-sm text-muted-foreground p-6">No matches. Try broadening your filters.</div>}
          {items.map((it) => (
            <div key={it.case_id} onMouseEnter={() => setSelectedId(it.case_id)}>
              <CaseCard item={it} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 relative">
        <MapView items={items} selectedId={selectedId} onSelect={(it) => setSelectedId(it.case_id)} center={center} radiusKm={useRadius ? radiusKm : null} userPos={center} showUser={!!center} />
        <MapLegend />
      </div>
    </div>
  );
}
