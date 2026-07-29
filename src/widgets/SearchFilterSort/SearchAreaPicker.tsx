import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { SearchMapBounds } from "../../shared/api/askClient";

type SearchAreaPickerProps = {
  value?: SearchMapBounds;
  onChange: (bounds: SearchMapBounds) => void;
};

const DEFAULT_CENTER: L.LatLngExpression = [43.238, 76.945];
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function toSearchBounds(bounds: L.LatLngBounds): SearchMapBounds {
  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest(),
  };
}

export function SearchAreaPicker({ value, onChange }: SearchAreaPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true });
    L.tileLayer(TILE_URL, { attribution: MAP_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    if (value) {
      map.fitBounds([[value.south, value.west], [value.north, value.east]]);
    } else {
      map.setView(DEFAULT_CENTER, 10);
    }
    const publishBounds = () => onChangeRef.current(toSearchBounds(map.getBounds()));
    map.on("moveend", publishBounds);
    mapRef.current = map;
    window.setTimeout(() => {
      map.invalidateSize();
      publishBounds();
    }, 0);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="search-area-picker" />;
}
