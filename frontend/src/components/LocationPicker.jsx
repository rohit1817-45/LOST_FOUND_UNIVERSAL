import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Locate, Search } from 'lucide-react';
import { INDIA_CENTER, INDIA_ZOOM } from '@/lib/format';

const userIcon = L.divIcon({ className: 'ulfn-icon-wrap', html: `<span class="ulfn-marker ulfn-marker-user"></span>`, iconSize: [28, 28], iconAnchor: [14, 14] });

function ClickHandler({ onPick }) {
  useMapEvents({ click(e) { onPick({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
  return null;
}

function Recenter({ pos }) {
  const map = useMap();
  useEffect(() => { if (pos) map.setView(pos, Math.max(map.getZoom(), 13)); }, [pos, map]);
  return null;
}

function Invalidator() {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 120);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [map]);
  return null;
}

export function LocationPicker({ value, onChange }) {
  const [pos, setPos] = useState(value ? [value.lat, value.lng] : null);
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => { if (value) setPos([value.lat, value.lng]); }, [value]);

  // Auto-geolocate on mount
  useEffect(() => {
    if (!pos && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const next = { lat: p.coords.latitude, lng: p.coords.longitude };
          setPos([next.lat, next.lng]);
          onChange({ ...next, address: value?.address || '', country: 'India' });
        },
        () => {},
        { timeout: 6000 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reverseGeocode(lat, lng) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`);
      const j = await r.json();
      const addr = j.address || {};
      return {
        address: j.display_name || '',
        city: addr.city || addr.town || addr.village || addr.county || '',
        state: addr.state || '',
        country: addr.country || 'India',
      };
    } catch { return { address: '' }; }
  }

  async function searchAddress() {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`);
      const arr = await r.json();
      if (arr && arr[0]) {
        const lat = parseFloat(arr[0].lat); const lng = parseFloat(arr[0].lon);
        setPos([lat, lng]);
        onChange({ lat, lng, address: arr[0].display_name, country: 'India' });
      }
    } finally { setSearching(false); }
  }

  async function handlePick(next) {
    setPos([next.lat, next.lng]);
    const rev = await reverseGeocode(next.lat, next.lng);
    onChange({ ...next, ...rev });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input data-testid="report-location-search-input" placeholder="Search an address in India (e.g. Bandra, Mumbai)" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchAddress(); } }} />
        <Button type="button" variant="secondary" onClick={searchAddress} disabled={searching} data-testid="report-location-search-button"><Search className="h-4 w-4 mr-1" /> Search</Button>
        <Button type="button" variant="outline" onClick={() => { navigator.geolocation?.getCurrentPosition((p) => handlePick({ lat: p.coords.latitude, lng: p.coords.longitude })); }} data-testid="report-location-locate-button"><Locate className="h-4 w-4" /></Button>
      </div>
      <div className="h-[280px] w-full rounded-lg overflow-hidden border">
        <MapContainer center={pos || INDIA_CENTER} zoom={pos ? 13 : INDIA_ZOOM} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer attribution='&copy; OSM' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
          <Invalidator />
          <ClickHandler onPick={handlePick} />
          {pos && (
            <>
              <Marker position={pos} icon={userIcon} draggable eventHandlers={{ dragend: (e) => { const ll = e.target.getLatLng(); handlePick({ lat: ll.lat, lng: ll.lng }); } }} />
              <Recenter pos={pos} />
            </>
          )}
        </MapContainer>
      </div>
      {value?.address && (
        <div className="text-xs text-muted-foreground" data-testid="report-location-address">{value.address}</div>
      )}
    </div>
  );
}
