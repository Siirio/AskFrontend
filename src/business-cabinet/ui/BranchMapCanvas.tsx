"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

/** Almaty — the ASK product's home city and a sane default center when the
 *  seller has not dropped a pin yet. */
const DEFAULT_CENTER: [number, number] = [43.238, 76.945];
const DEFAULT_ZOOM = 12;
const PICKED_ZOOM = 15;
/** Wide enough to show a whole city once its place is chosen, tight enough
 *  that the seller is not asked to find their street from orbit. */
const PLACE_ZOOM = 12;

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

/**
 * Re-centres the map when the seller changes the registry PLACE.
 *
 * `MapContainer`'s `center` is an initial value — Leaflet ignores it after
 * mount — so picking "г. Шымкент" left the map sitting on the Almaty default
 * and the seller was asked to drop a pin on the wrong city. Moving the view is
 * necessarily imperative.
 *
 * Guarded by the coordinate itself rather than by a render: `setView` fires a
 * `moveend`, and re-running on every render would fight the seller's own
 * panning.
 */
function RecenterOn({ focus }: { focus: { lat: number; lng: number } | null }) {
  const map = useMap();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!focus) return;
    const key = `${focus.lat},${focus.lng}`;
    if (last.current === key) return;
    last.current = key;
    map.setView([focus.lat, focus.lng], PLACE_ZOOM);
  }, [focus, map]);

  return null;
}

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
  focus,
  onPick,
}: {
  position: { lat: number; lng: number } | null;
  /** Where the chosen registry place is, for framing the map before a pin
   *  exists. Ignored once the seller has dropped one — their pin outranks a
   *  geocoded guess at the city centre. */
  focus: { lat: number; lng: number } | null;
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
      <RecenterOn focus={position ? null : focus} />
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
