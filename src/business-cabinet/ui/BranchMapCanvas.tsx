"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

/** Almaty — the ASK product's home city and a sane default center when the
 *  seller has not dropped a pin yet. */
const DEFAULT_CENTER: [number, number] = [43.238, 76.945];
const DEFAULT_ZOOM = 12;
const PICKED_ZOOM = 15;

/** A div icon, not an image asset: Leaflet's default marker PNGs resolve
 *  relative to the bundler's asset pipeline and break under Next.js without
 *  extra wiring. `.neu-map-pin` (design-system/neumorphism.css) is the one
 *  visual source instead — the accent gradient fill, the same non-text-fill
 *  category as an avatar or a switch track. */
const pinIcon = L.divIcon({
  className: "",
  html: '<span class="neu-map-pin"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function ClickToPlace({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * The Leaflet/OpenStreetMap surface itself — split from `BranchMapModal` so
 * the modal can load it via `next/dynamic(..., { ssr: false })`. Leaflet
 * touches `window` at import time (tile/marker layers), which breaks SSR;
 * this file is never imported outside that dynamic boundary.
 */
export default function BranchMapCanvas({
  position,
  onPick,
}: {
  position: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const center: [number, number] = position
    ? [position.lat, position.lng]
    : DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={position ? PICKED_ZOOM : DEFAULT_ZOOM}
      scrollWheelZoom
      className="neu-map-frame h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickToPlace onPick={onPick} />
      {position ? (
        <Marker
          position={[position.lat, position.lng]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = (e.target as L.Marker).getLatLng();
              onPick(lat, lng);
            },
          }}
        />
      ) : null}
    </MapContainer>
  );
}
