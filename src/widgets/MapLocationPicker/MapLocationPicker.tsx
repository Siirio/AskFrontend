import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, MapPin, Search } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { resolveMapLocationInput } from "../../shared/geo/mapLocationResolver";

interface MapLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onChange: (lat: number, lng: number, address?: string, cityName?: string) => void;
  readOnly?: boolean;
}

interface GeocodingResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
}

const DEFAULT_CENTER: L.LatLngExpression = [43.238, 76.945];
const DEFAULT_ZOOM = 15;
const GEOCODING_URL = import.meta.env.VITE_GEOCODING_API_URL ?? "https://nominatim.openstreetmap.org";
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function cityName(result: GeocodingResult) {
  return result.address?.city
    ?? result.address?.town
    ?? result.address?.village
    ?? result.address?.municipality;
}

export default function MapLocationPicker({ initialLat, initialLng, onChange, readOnly = false }: MapLocationPickerProps) {
  const { t, i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const updateMarker = useCallback((lat: number, lng: number, pan = true) => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = L.marker([lat, lng], {
      draggable: !readOnly,
      icon: L.divIcon({
        className: "",
        html: '<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;background:#e8824e;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);transform:rotate(-45deg)"></span>',
        iconSize: [22, 22],
        iconAnchor: [11, 22],
      }),
    }).addTo(map);
    if (!readOnly) {
      markerRef.current.on("dragend", () => {
        const position = markerRef.current?.getLatLng();
        if (position) onChangeRef.current(position.lat, position.lng);
      });
    }
    if (pan) map.setView([lat, lng], Math.max(map.getZoom(), DEFAULT_ZOOM));
  }, [readOnly]);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const params = new URLSearchParams({
        format: "jsonv2",
        lat: String(lat),
        lon: String(lng),
        addressdetails: "1",
        "accept-language": i18n.language,
      });
      const response = await fetch(`${GEOCODING_URL}/reverse?${params}`);
      if (!response.ok) throw new Error();
      const result = await response.json() as GeocodingResult;
      onChangeRef.current(lat, lng, result.display_name, cityName(result));
      setQuery(result.display_name);
    } catch {
      onChangeRef.current(lat, lng);
    }
  }, [i18n.language]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initialCenter: L.LatLngExpression = initialLat != null && initialLng != null
      ? [initialLat, initialLng]
      : DEFAULT_CENTER;
    const map = L.map(containerRef.current).setView(initialCenter, DEFAULT_ZOOM);
    L.tileLayer(TILE_URL, { attribution: MAP_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    if (initialLat != null && initialLng != null) updateMarker(initialLat, initialLng, false);
    if (!readOnly) {
      map.on("click", event => {
        updateMarker(event.latlng.lat, event.latlng.lng, false);
        void reverseGeocode(event.latlng.lat, event.latlng.lng);
      });
    }
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [readOnly, reverseGeocode, updateMarker]);

  useEffect(() => {
    if (initialLat == null || initialLng == null) return;
    updateMarker(initialLat, initialLng);
  }, [initialLat, initialLng, updateMarker]);

  const search = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    setError("");
    try {
      if (/^https?:\/\//i.test(query.trim())) {
        const resolved = await resolveMapLocationInput(query.trim());
        if (resolved) {
          updateMarker(resolved.latitude, resolved.longitude);
          await reverseGeocode(resolved.latitude, resolved.longitude);
          return;
        }
      }
      const params = new URLSearchParams({
        format: "jsonv2",
        q: query.trim(),
        limit: "1",
        addressdetails: "1",
        "accept-language": i18n.language,
      });
      const response = await fetch(`${GEOCODING_URL}/search?${params}`);
      if (!response.ok) throw new Error();
      const [result] = await response.json() as GeocodingResult[];
      if (!result) {
        setError(t("business.branch.locationNotFound"));
        return;
      }
      const lat = Number(result.lat);
      const lng = Number(result.lon);
      updateMarker(lat, lng);
      onChangeRef.current(lat, lng, result.display_name, cityName(result));
      setQuery(result.display_name);
    } catch {
      setError(t("business.branch.locationNotFound"));
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="fcw-flex-col" style={{ gap: "0.5rem", width: "100%" }}>
      {!readOnly && (
        <div className="fcw-flex" style={{ gap: "0.5rem" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <MapPin size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fcw-color-text-tertiary)", pointerEvents: "none" }} />
            <input
              className="fcw-input"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void search(); } }}
              placeholder={t("business.branch.searchPlace")}
              style={{ paddingLeft: 32 }}
            />
          </div>
          <button className="fcw-btn fcw-btn-secondary" type="button" onClick={() => void search()} disabled={searching || !query.trim()}>
            {searching ? <Loader2 className="fcw-spin" size={16} /> : <Search size={16} />}
            {t("business.branch.findPlace")}
          </button>
        </div>
      )}
      {error && <span className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>{error}</span>}
      <div ref={containerRef} style={{ width: "100%", height: 350, borderRadius: "var(--fcw-radius-md)", border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)", overflow: "hidden" }} />
    </div>
  );
}
