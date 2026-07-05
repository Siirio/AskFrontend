import { Layout, Sparkles, MapPin, Briefcase, MessageCircle, Image, AlignLeft } from "lucide-react";
import type { CardBlockType } from "./types";

interface Props {
  onSelect: (type: CardBlockType) => void;
  onClose: () => void;
}

const BLOCK_TYPES: { type: CardBlockType; label: string; icon: React.ReactNode }[] = [
  { type: "HERO", label: "Hero", icon: <Layout size={16} /> },
  { type: "DROPS", label: "Drops", icon: <Sparkles size={16} /> },
  { type: "BRANCHES", label: "Branches", icon: <MapPin size={16} /> },
  { type: "SERVICES", label: "Services", icon: <Briefcase size={16} /> },
  { type: "CONTACTS", label: "Contacts", icon: <MessageCircle size={16} /> },
  { type: "GALLERY", label: "Gallery", icon: <Image size={16} /> },
  { type: "ABOUT", label: "About", icon: <AlignLeft size={16} /> },
];

export function AddBlockPopover({ onSelect, onClose }: Props) {
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={onClose} />
      <div
        style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginTop: "0.5rem",
          zIndex: 100,
          padding: "0.5rem",
          borderRadius: "var(--fcw-radius-lg)",
          border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
          backgroundColor: "var(--fcw-color-surface)",
          boxShadow: "var(--fcw-shadow-xl)",
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "0.25rem",
          minWidth: 200,
        }}
      >
        {BLOCK_TYPES.map(bt => (
          <button
            key={bt.type}
            className="fcw-btn fcw-btn-ghost fcw-btn-sm"
            style={{ justifyContent: "flex-start", gap: "0.5rem", padding: "0.5rem 0.75rem" }}
            onClick={() => onSelect(bt.type)}
          >
            {bt.icon}
            <span className="fcw-body-s">{bt.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
