import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Search, Loader2 } from "lucide-react";
import { load } from "@2gis/mapgl";

interface MapLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onChange: (lat: number, lng: number, address?: string, cityName?: string) => void;
  readOnly?: boolean;
}

const ALMATY_CENTER: [number, number] = [43.238, 76.945];
const API_KEY = import.meta.env.VITE_TWOGIS_API_KEY || "";

interface GeocodingSuggestion {
  name: string;
  fullName: string;
  lat: number;
  lng: number;
  cityName?: string;
}

interface GeocodingItem {
  name?: string;
  full_name?: string;
  full_address_name?: string;
  address_name?: string;
  point?: { lat: number; lon: number };
  adm_div?: Array<{ name?: string; type?: string }>;
}

function getAddress(item: GeocodingItem) {
  return item.full_address_name || item.full_name || item.address_name || item.name || "";
}

function getCityName(item: GeocodingItem) {
  const division = item.adm_div?.find(part => {
    const type = part.type?.toLowerCase() || "";
    return type.includes("city") || type.includes("settlement");
  });
  return division?.name || item.adm_div?.[0]?.name;
}

export default function MapLocationPicker({ initialLat, initialLng, onChange, readOnly }: MapLocationPickerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapglRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const internalChangeRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const resolveLocation = useCallback(async (lat: number, lng: number) => {
    if (!API_KEY) {
      onChangeRef.current(lat, lng);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        key: API_KEY,
        fields: "items.point,items.adm_div,items.full_address_name",
      });
      const response = await fetch(`https://catalog.api.2gis.com/3.0/items/geocode?${params}`);
      if (!response.ok) throw new Error("Reverse geocoding failed");
      const data = await response.json();
      const item = data.result?.items?.[0] as GeocodingItem | undefined;
      onChangeRef.current(lat, lng, item ? getAddress(item) : undefined, item ? getCityName(item) : undefined);
    } catch {
      onChangeRef.current(lat, lng);
    } finally {
      setSearching(false);
    }
  }, []);

  const center: [number, number] = selected
    ? [selected.lat, selected.lng]
    : ALMATY_CENTER;

  const placeMarker = useCallback((lat: number, lng: number) => {
    if (!mapglRef.current || !mapRef.current) return;
    if (markerRef.current) {
      markerRef.current.destroy();
    }
    const marker = new mapglRef.current.Marker(mapRef.current, {
      coordinates: [lng, lat],
      draggable: !readOnly,
    });
    markerRef.current = marker;

    if (!readOnly) {
      marker.on("dragend", () => {
        const coords = marker.getCoordinates();
        internalChangeRef.current = true;
        setSelected({ lat: coords[1], lng: coords[0] });
        void resolveLocation(coords[1], coords[0]);
      });
    }
  }, [readOnly, resolveLocation]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError("");
      try {
        const mapgl = await load();
        if (cancelled || !containerRef.current) return;
        mapglRef.current = mapgl;

        const map = new mapgl.Map(containerRef.current, {
          center: [center[1], center[0]],
          zoom: 15,
          key: API_KEY,
        });
        mapRef.current = map;

        placeMarker(center[0], center[1]);

        if (!readOnly) {
          map.on("click", (e: { lngLat: number[] }) => {
            const [lng, lat] = e.lngLat;
            internalChangeRef.current = true;
            setSelected({ lat, lng });
            void resolveLocation(lat, lng);
            placeMarker(lat, lng);
          });
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load map");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
      markerRef.current?.destroy();
      mapRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (internalChangeRef.current) {
      internalChangeRef.current = false;
      return;
    }
    if (!mapRef.current || !mapglRef.current) return;
    if (initialLat == null || initialLng == null) return;
    const lat = initialLat;
    const lng = initialLng;
    setSelected({ lat, lng });
    mapRef.current.setCenter([lng, lat]);
    placeMarker(lat, lng);
  }, [initialLat, initialLng]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || !API_KEY) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://catalog.api.2gis.com/3.0/items/geocode?q=${encodeURIComponent(query)}&key=${API_KEY}&fields=items.point,items.adm_div,items.full_address_name`
      );
      if (!res.ok) throw new Error("Geocoding failed");
      const data = await res.json();
      const items: GeocodingSuggestion[] = (data.result?.items || [])
        .filter((item: GeocodingItem) => item.point)
        .map((item: GeocodingItem) => ({
          name: item.name || "",
          fullName: getAddress(item),
          lat: item.point!.lat,
          lng: item.point!.lon,
          cityName: getCityName(item),
        }));
      setSuggestions(items.slice(0, 5));
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const onSearchInput = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(value), 400);
  };

  const selectSuggestion = (s: GeocodingSuggestion) => {
    internalChangeRef.current = true;
    setSelected({ lat: s.lat, lng: s.lng });
    onChange(s.lat, s.lng, s.fullName, s.cityName);
    setSearchQuery(s.fullName);
    setSuggestions([]);

    if (mapRef.current) {
      mapRef.current.setCenter([s.lng, s.lat]);
      placeMarker(s.lat, s.lng);
    }
  };

  if (!API_KEY) {
    return (
      <div style={{
        height: 350, width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "var(--fcw-color-surface)", borderRadius: "var(--fcw-radius-md)",
        border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
        color: "var(--fcw-color-text-tertiary)", fontSize: "var(--fcw-font-size-body-s)",
      }}>
        {t("business.branch.noMapKey")}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        height: 350, width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "var(--fcw-color-surface)", borderRadius: "var(--fcw-radius-md)",
        border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
        color: "var(--fcw-color-text-tertiary)", fontSize: "var(--fcw-font-size-body-s)",
      }}>
        {error}
      </div>
    );
  }

  return (
    <div className="fcw-flex-col" style={{ gap: "0.5rem", width: "100%" }}>
      {!readOnly && (
        <div style={{ position: "relative" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              color: "var(--fcw-color-text-tertiary)", pointerEvents: "none",
            }} />
            <input
              className="fcw-input"
              placeholder={t("business.branch.searchPlace")}
              value={searchQuery}
              onChange={e => onSearchInput(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
            {searching && <Loader2 size={14} className="fcw-spin" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fcw-color-text-tertiary)" }} />}
          </div>
          {suggestions.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
              backgroundColor: "var(--fcw-color-surface)", borderRadius: "var(--fcw-radius-md)",
              border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
              boxShadow: "var(--fcw-shadow-lg)", overflow: "hidden",
            }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="fcw-btn fcw-btn-ghost"
                  style={{ width: "100%", justifyContent: "flex-start", padding: "0.5rem 0.75rem", borderRadius: 0 }}
                  onClick={() => selectSuggestion(s)}
                >
                  <MapPin size={14} style={{ flexShrink: 0, marginRight: "0.5rem", color: "var(--fcw-color-primary)" }} />
                  <span className="fcw-body-s" style={{ textAlign: "left" }}>{s.fullName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ position: "relative", width: "100%", height: 350 }}>
        {loading && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "var(--fcw-color-surface)", borderRadius: "var(--fcw-radius-md)",
            border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)", zIndex: 2,
          }}>
            <Loader2 size={24} className="fcw-spin" style={{ color: "var(--fcw-color-primary)" }} />
          </div>
        )}
        <div
          ref={containerRef}
          style={{
            width: "100%", height: "100%",
            borderRadius: "var(--fcw-radius-md)",
            border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
            overflow: "hidden",
            opacity: loading ? 0 : 1,
          }}
        />
      </div>
    </div>
  );
}
