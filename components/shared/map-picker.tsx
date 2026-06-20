'use client';

import * as React from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet's default marker uses bundled image assets that webpack can't resolve.
// Point at the CDN-hosted images so the marker actually renders.
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
  /** Map height in pixels. Default 320. */
  height?: number;
  /** Initial zoom. Default 7 (whole Uzbekistan). */
  zoom?: number;
}

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;

function ClickHandler({
  onChange,
}: {
  onChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onChange(round6(e.latlng.lat), round6(e.latlng.lng));
    },
  });
  return null;
}

function RecenterOnExternalChange({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();
  React.useEffect(() => {
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      map.setView([latitude, longitude], map.getZoom(), { animate: true });
    }
  }, [latitude, longitude, map]);
  return null;
}

export function MapPicker({
  latitude,
  longitude,
  onChange,
  height = 320,
  zoom = 7,
}: MapPickerProps) {
  const center: [number, number] = [
    Number.isFinite(latitude) ? latitude : 41.311081,
    Number.isFinite(longitude) ? longitude : 64.585262,
  ];

  return (
    <div
      className="overflow-hidden rounded-lg border border-border"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={center}
          icon={markerIcon}
          draggable
          eventHandlers={{
            dragend(e) {
              const pos = e.target.getLatLng();
              onChange(round6(pos.lat), round6(pos.lng));
            },
          }}
        />
        <ClickHandler onChange={onChange} />
        <RecenterOnExternalChange latitude={center[0]} longitude={center[1]} />
      </MapContainer>
    </div>
  );
}
