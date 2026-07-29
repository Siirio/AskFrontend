import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Image, Instagram, Loader2, Mail, MapPin, MessageCircle, Palette, Phone, Truck, Upload } from "lucide-react";
import { Card } from "../../shared/ui/Card/Card";
import type { BrandProfileDto } from "../../shared/api/dto";
import { uploadBusinessProfileCover, uploadBusinessProfileLogo } from "../../shared/api/askClient";
import { DeliveryCitySelector } from "../../shared/ui/DeliveryCitySelector/DeliveryCitySelector";

const BRAND_COLOR_PRESETS = [
  "#e8824e", "#4e8ce8", "#e84e4e", "#4ee882",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b",
  "#84cc16", "#6b7280", "#1e293b", "#0f172a",
];

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return "https://" + trimmed;
}

interface ProfileEditorProps {
  profile: BrandProfileDto;
  onChange: (profile: BrandProfileDto) => void;
  onSave: () => Promise<void>;
  busy: boolean;
  readOnly?: boolean;
  fieldErrors?: { field: string; message: string }[];
}

export function ProfileEditor({ profile, onChange, onSave, busy, readOnly, fieldErrors }: ProfileEditorProps) {
  const { t } = useTranslation();
  const [avatarShape, setAvatarShape] = useState<"circle" | "square">("circle");
  const [mediaBusy, setMediaBusy] = useState<"logo" | "cover" | null>(null);
  const [mediaError, setMediaError] = useState("");
  const update = (patch: Partial<BrandProfileDto>) => onChange({ ...profile, ...patch });

  const [mediaPreview, setMediaPreview] = useState<{logo?: string; cover?: string}>({});

  const fieldError = (field: string) => {
    const err = fieldErrors?.find(e => e.field === field);
    return err ? err.message : null;
  };

  const handleUrlBlur = (field: "instagramUrl" | "telegramUrl" | "websiteUrl") => {
    const value = profile[field];
    if (value) {
      const normalized = normalizeUrl(value);
      if (normalized !== value) update({ [field]: normalized });
    }
  };

  const uploadMedia = async (kind: "logo" | "cover", file?: File) => {
    if (!file || !profile.businessId) return;
    setMediaBusy(kind);
    setMediaError("");
    const objectUrl = URL.createObjectURL(file);
    const previewField = kind === "logo" ? "logoUrl" : "coverUrl";
    setMediaPreview(prev => ({ ...prev, [kind]: objectUrl }));
    try {
      const updated = kind === "logo"
        ? await uploadBusinessProfileLogo(profile.businessId, file)
        : await uploadBusinessProfileCover(profile.businessId, file);
      onChange({ ...profile, [previewField]: updated[previewField] });
      setMediaPreview(prev => ({ ...prev, [kind]: undefined }));
    } catch (error) {
      setMediaPreview(prev => ({ ...prev, [kind]: undefined }));
      setMediaError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setMediaBusy(null);
      URL.revokeObjectURL(objectUrl);
    }
  };

  if (readOnly) {
    return (
      <Card padding="lg" style={{ maxWidth: "480px", margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--fcw-space-md)", textAlign: "center" }}>
          <div
            style={{
              width: "72px", height: "72px",
              borderRadius: avatarShape === "circle" ? "50%" : "var(--fcw-radius-lg)",
              backgroundColor: profile.brandColor || "#e8824e",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {profile.logoUrl ? <img src={profile.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
          </div>
          <div>
            <h2 className="fcw-h3" style={{ margin: 0 }}>{profile.businessName || t("profileEditor.brandProfile")}</h2>
            <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.25rem 0 0 0" }}>
              {profile.description || t("profileEditor.readOnlyAccess")}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="ask-profile-editor">
      <div className="ask-profile-editor__grid" style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(320px, 1fr)", gap: "var(--fcw-space-lg)" }}>
        <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "80px", height: "80px",
                borderRadius: avatarShape === "circle" ? "50%" : "var(--fcw-radius-lg)",
                backgroundColor: profile.brandColor || "#e8824e",
                overflow: "hidden",
                border: "2px solid var(--fcw-color-border)",
              }}
            >
              {mediaPreview.logo || profile.logoUrl ? (
                <img src={mediaPreview.logo || profile.logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "28px", fontWeight: 700 }}>
                  {(profile.businessName || "B")[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="fcw-glassmorph-segmented" style={{ display: "inline-flex", gap: 0 }}>
              <button
                className={`fcw-btn fcw-btn-sm ${avatarShape === "circle" ? "fcw-glassmorph-selected-seg" : ""}`}
                style={{
                  background: avatarShape === "circle" ? undefined : "transparent",
                  color: avatarShape === "circle" ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
                  border: "none", boxShadow: "none",
                }}
                onClick={() => setAvatarShape("circle")}
              >
                {t("profileEditor.circle")}
              </button>
              <button
                className={`fcw-btn fcw-btn-sm ${avatarShape === "square" ? "fcw-glassmorph-selected-seg" : ""}`}
                style={{
                  background: avatarShape === "square" ? undefined : "transparent",
                  color: avatarShape === "square" ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
                  border: "none", boxShadow: "none",
                }}
                onClick={() => setAvatarShape("square")}
              >
                {t("profileEditor.square")}
              </button>
            </div>
          </div>

          <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
            <span className="fcw-label fcw-flex fcw-items-center" style={{ gap: "0.375rem" }}><Palette size={12} />{t("profileEditor.brandColor")}</span>
            <div className="fcw-flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
              {BRAND_COLOR_PRESETS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => update({ brandColor: color })}
                  style={{
                    width: 32, height: 32, borderRadius: "var(--fcw-radius-md)", backgroundColor: color,
                    border: profile.brandColor === color ? "2px solid var(--fcw-color-text)" : "2px solid transparent",
                    cursor: "pointer", transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.15)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                />
              ))}
              <div className="fcw-flex fcw-items-center" style={{ gap: "0.25rem", marginLeft: "0.25rem" }}>
                <input
                  type="color"
                  value={profile.brandColor || "#e8824e"}
                  onChange={e => update({ brandColor: e.target.value })}
                  style={{ width: 28, height: 28, border: "none", borderRadius: "var(--fcw-radius-sm)", cursor: "pointer", padding: 0 }}
                />
                <span className="fcw-label" style={{ fontSize: "0.75rem" }}>{profile.brandColor || "#e8824e"}</span>
              </div>
            </div>
          </label>

          <div className="ask-profile-media-fields">
            <label>
              <span><Upload size={14} /> Логотип</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => uploadMedia("logo", event.target.files?.[0])} disabled={mediaBusy !== null} />
              <strong>{mediaBusy === "logo" ? <Loader2 className="fcw-animate-spin" size={16} /> : "Выбрать файл"}</strong>
            </label>
            <label>
              <span><Image size={14} /> Обложка</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => uploadMedia("cover", event.target.files?.[0])} disabled={mediaBusy !== null} />
              <strong>{mediaBusy === "cover" ? <Loader2 className="fcw-animate-spin" size={16} /> : "Выбрать файл"}</strong>
            </label>
          </div>
          {mediaError && <p className="fcw-body-s" style={{ color: "var(--fcw-color-error)", margin: 0 }}>{mediaError}</p>}
        </div>

        <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
          <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
            <span className="fcw-label">{t("profileEditor.description")}</span>
            <textarea className="fcw-textarea" value={profile.description || ""} onChange={e => update({ description: e.target.value })} rows={3} />
          </label>

          <div className="profile-delivery-fields">
            <div>
              <span className="fcw-label fcw-flex fcw-items-center" style={{ gap: "0.375rem" }}>
                <Truck size={13} />{t("profileEditor.delivery")}
              </span>
              <select
                className="fcw-input"
                value={profile.deliveryCoverage || "NO_DELIVERY"}
                onChange={event => update({
                  deliveryCoverage: event.target.value as NonNullable<BrandProfileDto["deliveryCoverage"]>,
                  deliveryCities: event.target.value === "SELECTED_CITIES" ? profile.deliveryCities || [] : [],
                })}
              >
                {(["NO_DELIVERY", "SELECTED_CITIES", "KAZAKHSTAN", "WORLDWIDE"] as const).map(coverage => (
                  <option key={coverage} value={coverage}>{t(`seller.delivery.${coverage}`)}</option>
                ))}
              </select>
            </div>
            {profile.deliveryCoverage === "SELECTED_CITIES" && (
              <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                <span className="fcw-label fcw-flex fcw-items-center" style={{ gap: "0.375rem" }}>
                  <MapPin size={13} />{t("seller.deliveryCities")}
                </span>
                <DeliveryCitySelector
                  values={profile.deliveryCities || []}
                  onChange={deliveryCities => update({ deliveryCities })}
                />
              </label>
            )}
          </div>

          <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
            <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
              <span className="fcw-label fcw-flex fcw-items-center" style={{ gap: "0.375rem" }}><Phone size={12} />Телефон</span>
              <input
                className="fcw-input"
                value={profile.number || ""}
                type="tel"
                onChange={e => update({ number: e.target.value })}
                placeholder="+7 (700) 000-00-00"
              />
              {fieldError("number") && <span className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>{fieldError("number")}</span>}
            </label>
            <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
              <span className="fcw-label fcw-flex fcw-items-center" style={{ gap: "0.375rem" }}><Mail size={12} />Email</span>
              <input className="fcw-input" type="email" value={profile.email || ""} onChange={e => update({ email: e.target.value })} placeholder="hello@business.kz" />
              {fieldError("email") && <span className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>{fieldError("email")}</span>}
            </label>
            <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
              <span className="fcw-label fcw-flex fcw-items-center" style={{ gap: "0.375rem" }}><Globe size={12} />{t("profileEditor.website")}</span>
              <input
                className="fcw-input"
                value={profile.websiteUrl || ""}
                onChange={e => update({ websiteUrl: e.target.value })}
                onBlur={() => handleUrlBlur("websiteUrl")}
                placeholder="https://..."
              />
              {fieldError("websiteUrl") && <span className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>{fieldError("websiteUrl")}</span>}
            </label>
            <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
              <span className="fcw-label fcw-flex fcw-items-center" style={{ gap: "0.375rem" }}><Instagram size={12} />{t("profileEditor.instagram")}</span>
              <input
                className="fcw-input"
                value={profile.instagramUrl || ""}
                onChange={e => update({ instagramUrl: e.target.value })}
                onBlur={() => handleUrlBlur("instagramUrl")}
                placeholder="https://instagram.com/..."
              />
              {fieldError("instagramUrl") && <span className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>{fieldError("instagramUrl")}</span>}
            </label>
            <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
              <span className="fcw-label fcw-flex fcw-items-center" style={{ gap: "0.375rem" }}><MessageCircle size={12} />{t("profileEditor.telegram")}</span>
              <input
                className="fcw-input"
                value={profile.telegramUrl || ""}
                onChange={e => update({ telegramUrl: e.target.value })}
                onBlur={() => handleUrlBlur("telegramUrl")}
                placeholder="https://t.me/..."
              />
              {fieldError("telegramUrl") && <span className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>{fieldError("telegramUrl")}</span>}
            </label>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "var(--fcw-space-lg)" }}>
        <button className="fcw-btn fcw-btn-primary" onClick={onSave} disabled={busy}>
          {t("profileEditor.save")}
        </button>
      </div>
    </Card>
  );
}
