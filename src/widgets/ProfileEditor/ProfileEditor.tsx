import { useState } from "react";
import { Globe, Instagram, MessageCircle } from "lucide-react";
import { Card } from "../../shared/ui/Card/Card";
import type { BrandProfileDto } from "../../shared/api/dto";

interface ProfileEditorProps {
  profile: BrandProfileDto;
  onChange: (profile: BrandProfileDto) => void;
  onSave: () => Promise<void>;
  busy: boolean;
  readOnly?: boolean;
}

export function ProfileEditor({ profile, onChange, onSave, busy, readOnly }: ProfileEditorProps) {
  const [avatarShape, setAvatarShape] = useState<"circle" | "square">("circle");
  const update = (patch: Partial<BrandProfileDto>) => onChange({ ...profile, ...patch });

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
            <h2 className="fcw-h3" style={{ margin: 0 }}>{profile.businessName || "Brand Profile"}</h2>
            <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.25rem 0 0 0" }}>
              {profile.description || "Read-only access to business data."}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto" }}>
      <Card padding="lg">
        <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
          {/* Avatar preview + shape toggle */}
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
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                Circle
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
                Square
              </button>
            </div>
          </div>

          <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
            <span className="fcw-label">Logo URL</span>
            <input className="fcw-input" value={profile.logoUrl || ""} onChange={e => update({ logoUrl: e.target.value })} placeholder="https://..." />
          </label>

          <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
            <span className="fcw-label">Description</span>
            <textarea className="fcw-textarea" value={profile.description || ""} onChange={e => update({ description: e.target.value })} rows={3} />
          </label>

          <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
            <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
              <span className="fcw-label fcw-flex fcw-items-center" style={{ gap: "0.375rem" }}><Globe size={12} />Website</span>
              <input className="fcw-input" value={profile.websiteUrl || ""} onChange={e => update({ websiteUrl: e.target.value })} placeholder="https://..." />
            </label>
            <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
              <span className="fcw-label fcw-flex fcw-items-center" style={{ gap: "0.375rem" }}><Instagram size={12} />Instagram</span>
              <input className="fcw-input" value={profile.instagramUrl || ""} onChange={e => update({ instagramUrl: e.target.value })} placeholder="https://instagram.com/..." />
            </label>
            <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
              <span className="fcw-label fcw-flex fcw-items-center" style={{ gap: "0.375rem" }}><MessageCircle size={12} />Telegram</span>
              <input className="fcw-input" value={profile.telegramUrl || ""} onChange={e => update({ telegramUrl: e.target.value })} placeholder="https://t.me/..." />
            </label>
          </div>

          <button className="fcw-btn fcw-btn-primary" onClick={onSave} disabled={busy}>
            Save Profile
          </button>
        </div>
      </Card>
    </div>
  );
}
