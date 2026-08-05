"use client";

import "leaflet/dist/leaflet.css";

import { useCallback, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

import type { SearchMapArea } from "../model";

/** Almaty — the product's home city, and the same default the branch picker
 *  uses. A map that opens on the ocean is a worse first impression than one
 *  that opens somewhere the customer probably is. */
const DEFAULT_CENTER: [number, number] = [43.238, 76.945];
const DEFAULT_ZOOM = 11;

/**
 * Reports the viewport bounds on every settle, plus once on mount **only when
 * the caller has no area yet** — see the effect below for why a restored area
 * must not be re-reported.
 *
 * `moveend` covers panning AND the tail of a zoom, so `zoomend` is not also
 * subscribed: Leaflet fires both for one gesture and the second would push a
 * duplicate box for no new information.
 */
function ReportBounds({
  onChange,
  hasRestoredArea,
}: {
  onChange: (area: SearchMapArea) => void;
  /** True when the map opened on a box the customer had already applied. */
  hasRestoredArea: boolean;
}) {
  const map = useMap();

  // Read through a ref so the mount effect below can hold an empty dependency
  // list without going stale on a caller that passes an inline arrow.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const emit = useCallback(() => {
    const b = map.getBounds();
    onChangeRef.current({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
  }, [map]);

  useMapEvents({ moveend: emit });

  // The initial box, before any interaction — in an EFFECT, once, and ONLY when
  // the caller has no area yet.
  //
  // **Emitting over a RESTORED area silently widened it.** Leaflet fits
  // `bounds` to the nearest whole zoom level, so the viewport it settles on is
  // usually LARGER than the box it was given. Reporting that back would replace
  // the customer's saved area with the fitted one, and every reopen would widen
  // it again — a search area that grows on its own, which is exactly the drift
  // the `bounds` fix was meant to end. A restored map already has its box; it
  // has nothing to tell the caller until the customer moves it, and `moveend`
  // covers that.
  //
  // The first version called `map.whenReady(emit)` during RENDER, reasoning
  // that bounds are meaningless until Leaflet has measured its container. That
  // is true, and it still caused an infinite loop (React error #185): `emit`
  // sets state in the parent, the parent re-renders this component, render
  // calls `whenReady` again, and round it goes. A state setter must never run
  // during render, whatever the value it is waiting for. `whenReady` survives
  // INSIDE the effect, where the timing concern is real and the loop is not.
  useEffect(() => {
    if (hasRestoredArea) return;
    map.whenReady(emit);
  }, [map, emit, hasRestoredArea]);

  return null;
}

/**
 * The map-area filter's Leaflet surface — PRODUCT_VISION §4 filter 3, "search
 * by map area". Split out so `MapAreaField` can load it via
 * `next/dynamic(..., { ssr: false })`: Leaflet touches `window` at import time,
 * which breaks SSR (D7). Never import this outside that dynamic boundary.
 *
 * **Deliberately NOT a reuse of `business-cabinet`'s `BranchMapCanvas`**, and
 * not a parameterized version of it. That one picks a POINT — a branch's
 * `@NotNull` lat/lng — and this one reports the VIEWPORT as a bounding box.
 * Same library, same tiles, different question, so they are two components
 * (D8: same looks → copy; P6.3: never one component serving two contracts). It
 * also could not be imported across the slice boundary in any case (R2).
 *
 * The customer's search area IS what they can see. There is no drawn rectangle
 * to drag, because a box separate from the viewport means two things on screen
 * claiming to be "the area" and a customer reconciling them.
 */
export default function MapAreaCanvas({
  area,
  onChange,
}: {
  area: SearchMapArea | null;
  onChange: (area: SearchMapArea) => void;
}) {
  // Re-open on the saved BOX, not merely its centre. Centre + a fixed zoom
  // restores the right place at the wrong scale, so the viewport — which IS the
  // filter — silently differs from the box that produced the results on screen,
  // and the next `moveend` would overwrite the saved area with that drift.
  // Leaflet's `bounds` fits the exact rectangle, so what is framed is what was
  // searched. Only the unfiltered first open falls back to centre + zoom.
  const bounds: [[number, number], [number, number]] | undefined = area
    ? [
        [area.south, area.west],
        [area.north, area.east],
      ]
    : undefined;

  return (
    <MapContainer
      {...(bounds
        ? { bounds }
        : { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM })}
      scrollWheelZoom
      className="neu-map-frame h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ReportBounds onChange={onChange} hasRestoredArea={area !== null} />
    </MapContainer>
  );
}
