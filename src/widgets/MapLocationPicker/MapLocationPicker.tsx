import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Search, Loader2 } from "lucide-react";

interface MapLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onChange: (lat: number, lng: number) => void;
  readOnly?: boolean;
}

const ALMATY_CENTER: [number, number] = [43.238, 76.945];
const API_KEY = import.meta.env.VITE_TWOGIS_API_KEY || "";

interface GeocodingSuggestion {
  name: string;
  fullName: string;
  lat: number;
  lng: number;
}

export default function MapLocationPicker({ initialLat, initialLng, onChange, readOnly }: MapLocationPickerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ destroy(): void } | null>(null);
  const markerRef = useRef<{ setCoordinates(coords: [number, number]): void; destroy(): void } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const center: [number, number] = selected
    ? [selected.lat, selected.lng]
    : ALMATY_CENTER;

  const placeMarker = useCallback(async (lat: number, lng: number, mapgl: any, map: any) => {
    if (markerRef.current) {
      markerRef.current.destroy();
    }
    const marker = new mapgl.Marker(map, {
      coordinates: [lng, lat],
      draggable: !readOnly,
    });
    markerRef.current = marker;

    if (!readOnly) {
      marker.on("dragend", () => {
        const coords = marker.getCoordinates();
        setSelected({ lat: coords[1], lng: coords[0] });
        onChange(coords[1], coords[0]);
      });
    }
  }, [readOnly, onChange]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError("");
      try {
        const mapgl = await import("@2gis/mapgl");
        if (cancelled || !containerRef.current) return;

        const map = new (mapgl as any).Map(containerRef.current, {
          center: [center[1], center[0]],
          zoom: 15,
          key: API_KEY,
        });
        mapRef.current = map;

        await placeMarker(center[0], center[1], mapgl, map);

        if (!readOnly) {
          map.on("click", (e: { lngLat: [number, number] }) => {
            const [lng, lat] = e.lngLat;
            setSelected({ lat, lng });
            onChange(lat, lng);
            placeMarker(lat, lng, mapgl, map);
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

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || !API_KEY) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://catalog.api.2gis.com/3.0/items/geocode?q=${encodeURIComponent(query)}&key=${API_KEY}&fields=items.point`
      );
      if (!res.ok) throw new Error("Geocoding failed");
      const data = await res.json();
      const items: GeocodingSuggestion[] = (data.result?.items || [])
        .filter((item: any) => item.point)
        .map((item: any) => ({
          name: item.name || "",
          fullName: item.full_name || item.name || "",
          lat: item.point.lat,
          lng: item.point.lon,
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

  const selectSuggestion = async (s: GeocodingSuggestion) => {
    setSelected({ lat: s.lat, lng: s.lng });
    onChange(s.lat, s.lng);
    setSearchQuery(s.fullName);
    setSuggestions([]);

    if (mapRef.current) {
      try {
        const mapgl = await import("@2gis/mapgl");
        const map = mapRef.current as any;
        map.setCenter([s.lng, s.lat]);
        await placeMarker(s.lat, s.lng, mapgl, map);
      } catch { /* map not ready */ }
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
