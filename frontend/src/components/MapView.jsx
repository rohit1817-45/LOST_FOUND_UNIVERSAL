import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { TYPE_LABEL, isLost } from '@/lib/format';

function iconFor(type, selected) {
  const cls = selected ? 'ulfn-marker ulfn-marker-selected' : isLost(type) ? 'ulfn-marker ulfn-marker-lost' : 'ulfn-marker ulfn-marker-found';
  return L.divIcon({ className: 'ulfn-icon-wrap', html: `<span class="${cls}"></span>`, iconSize: [28, 28], iconAnchor: [14, 14] });
}

function userIcon() {
  return L.divIcon({ className: 'ulfn-icon-wrap', html: `<span class="ulfn-marker ulfn-marker-user"></span>`, iconSize: [28, 28], iconAnchor: [14, 14] });
}

function matchIcon() {
  return L.divIcon({ className: 'ulfn-icon-wrap', html: `<span class="ulfn-marker ulfn-marker-match"></span>`, iconSize: [28, 28], iconAnchor: [14, 14] });
}

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom || 12, { duration: 0.7 });
  }, [center, zoom, map]);
  return null;
}

export function MapView({ items = [], selectedId, onSelect, center, radiusKm, showUser, userPos, matches = [], height = '100%' }) {
  const initial = center || (items[0]?.location ? [items[0].location.lat, items[0].location.lng] : [37.7749, -122.4194]);
  return (
    <MapContainer center={initial} zoom={11} style={{ height, width: '100%' }} scrollWheelZoom data-testid="map-container">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png"
      />
      <FlyTo center={center} zoom={12} />
      {showUser && userPos && (
        <Marker position={userPos} icon={userIcon()}>
          <Popup>Your location</Popup>
        </Marker>
      )}
      {center && radiusKm ? (
        <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: '#0891b2', fillOpacity: 0.05 }} />
      ) : null}
      <MarkerClusterGroup chunkedLoading>
        {items.map((it) => (
          <Marker
            key={it.case_id}
            position={[it.location?.lat || 0, it.location?.lng || 0]}
            icon={iconFor(it.type, selectedId === it.case_id)}
            eventHandlers={{ click: () => onSelect && onSelect(it) }}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 700 }}>{TYPE_LABEL[it.type]}</div>
                <div>{it.name || it.breed || it.species || 'Case'}</div>
                <div style={{ color: '#666', fontSize: 12 }}>{it.location?.address}</div>
                <a href={`/cases/${it.case_id}`} style={{ color: '#0891b2' }}>Open details</a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
      {matches.map((m) => (
        <Marker key={`m-${m.candidate_id}`} position={[m.candidate_summary?.location?.lat || 0, m.candidate_summary?.location?.lng || 0]} icon={matchIcon()}>
          <Popup>Match ({m.confidence})</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
