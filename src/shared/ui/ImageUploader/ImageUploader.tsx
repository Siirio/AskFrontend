import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Trash2, RefreshCw } from "lucide-react";

function compressImage(file: File, maxW = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxW || h > maxW) {
        const ratio = Math.min(maxW / w, maxW / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

type Props = {
  value: string;
  onChange: (dataUrl: string) => void;
  onRemove: () => void;
  maxSizeMB?: number;
};

export function ImageUploader({ value, onChange, onRemove, maxSizeMB = 2 }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(t("business.toast.imageTooLarge"));
      return;
    }

    setLoading(true);
    try {
      const dataUrl = await compressImage(file);
      onChange(dataUrl);
    } catch {
      setError(t("business.toast.imageProcessingError"));
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      {value ? (
        <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
          <img src={value} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
          <div style={{
            position: "absolute", top: 8, right: 8, display: "flex", gap: 6,
          }}>
            <button
              type="button"
              className="fcw-btn fcw-btn-sm"
              style={{ background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 6 }}
              onClick={() => fileRef.current?.click()}
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              className="fcw-btn fcw-btn-sm"
              style={{ background: "rgba(220,38,38,0.8)", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 6 }}
              onClick={onRemove}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            width: "100%", padding: "28px 16px", borderRadius: 10,
            border: "2px dashed var(--fcw-border)", background: "var(--fcw-surface)",
            cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 6, color: "var(--fcw-muted)",
          }}
        >
          {loading ? (
            <span style={{ fontSize: 14 }}>...</span>
          ) : (
            <>
              <Camera size={24} />
              <span style={{ fontSize: 13 }}>{t("imageUploader.addPhoto")}</span>
            </>
          )}
        </button>
      )}
      {error && (
        <div style={{ color: "var(--fcw-danger)", fontSize: 12, marginTop: 4 }}>{error}</div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFile}
      />
    </div>
  );
}
