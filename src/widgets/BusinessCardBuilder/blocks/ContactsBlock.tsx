import { useState } from "react";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import type { CardBlockConfig, ContactItem } from "../types";

const PROVIDER_OPTIONS = [
  { key: "TELEGRAM", label: "Telegram", icon: "T" },
  { key: "INSTAGRAM", label: "Instagram", icon: "I" },
  { key: "WHATSAPP", label: "WhatsApp", icon: "W" },
  { key: "PHONE", label: "Phone", icon: "P" },
  { key: "SITE", label: "Website", icon: "S" },
  { key: "EMAIL", label: "Email", icon: "E" },
];

interface Props {
  config: CardBlockConfig;
  isEditing: boolean;
  onChange: (patch: Partial<CardBlockConfig>) => void;
}

export function ContactsBlock({ config, isEditing, onChange }: Props) {
  const contacts = config.contacts || [];
  const [editId, setEditId] = useState<string | null>(null);

  const addContact = () => {
    const c: ContactItem = { localId: `ct-${crypto.randomUUID()}`, provider: "TELEGRAM", url: "", label: "Telegram" };
    onChange({ contacts: [...contacts, c] });
    setEditId(c.localId);
  };

  const removeContact = (localId: string) => {
    onChange({ contacts: contacts.filter(c => c.localId !== localId) });
  };

  return (
    <div
      style={{
        padding: "1.5rem",
        borderRadius: "var(--fcw-radius-lg)",
        backgroundColor: config.backgroundColor || "var(--fcw-color-surface-secondary)",
        color: config.textColor || "var(--fcw-color-text)",
        fontFamily: config.fontFamily === "serif" ? "Georgia, serif" : config.fontFamily === "mono" ? "'JetBrains Mono', monospace" : "inherit",
        textAlign: config.alignment || "left",
      }}
    >
      <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 1rem 0" }}>Contacts</h3>

      {contacts.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--fcw-color-text-tertiary)", border: "1px dashed var(--fcw-color-border)", borderRadius: "var(--fcw-radius-md)" }}>
          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
              <span className="fcw-body-s">No contact links</span>
              <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={addContact}><Plus size={14} /> Add Contact</button>
            </div>
          ) : (
            <span className="fcw-body-s">No contacts displayed</span>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem" }}>
          {contacts.map(contact => (
            <div
              key={contact.localId}
              style={{
                backgroundColor: "var(--fcw-color-surface)",
                borderRadius: "var(--fcw-radius-md)",
                border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                padding: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  backgroundColor: "var(--fcw-color-primary)",
                  color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: "0.75rem", flexShrink: 0,
                }}
              >
                {PROVIDER_OPTIONS.find(p => p.key === contact.provider)?.icon || "?"}
              </div>
              {editId === contact.localId ? (
                <div className="fcw-flex-col" style={{ gap: "0.25rem", flex: 1 }}>
                  <select
                    className="fcw-input"
                    value={contact.provider}
                    onChange={e => onChange({ contacts: contacts.map(c => c.localId === contact.localId ? { ...c, provider: e.target.value } : c) })}
                    style={{ height: 28, fontSize: "0.6875rem", padding: "0 0.25rem" }}
                  >
                    {PROVIDER_OPTIONS.map(p => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </select>
                  <input className="fcw-input" defaultValue={contact.url} placeholder="URL"
                    style={{ height: 28, fontSize: "0.6875rem" }}
                    onBlur={e => onChange({ contacts: contacts.map(c => c.localId === contact.localId ? { ...c, url: e.target.value } : c) })}
                  />
                  <input autoFocus className="fcw-input" defaultValue={contact.label} placeholder="Label"
                    style={{ height: 28, fontSize: "0.75rem" }}
                    onBlur={e => { onChange({ contacts: contacts.map(c => c.localId === contact.localId ? { ...c, label: e.target.value } : c) }); setEditId(null); }}
                    onKeyDown={e => { if (e.key === "Enter") { onChange({ contacts: contacts.map(c => c.localId === contact.localId ? { ...c, label: (e.target as HTMLInputElement).value } : c) }); setEditId(null); } if (e.key === "Escape") setEditId(null); }}
                  />
                </div>
              ) : (
                <div
                  className="fcw-body-s fcw-weight-medium"
                  style={{ flex: 1, cursor: isEditing ? "text" : "default" }}
                  onClick={() => isEditing && setEditId(contact.localId)}
                >
                  {contact.label}
                </div>
              )}
              <ExternalLink size={12} style={{ color: "var(--fcw-color-text-tertiary)" }} />
              {isEditing && (
                <button
                  className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm"
                  style={{ position: "absolute", top: 2, right: 2, color: "var(--fcw-color-error)", padding: 2 }}
                  onClick={() => removeContact(contact.localId)}
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          ))}
          {isEditing && (
            <button
              className="fcw-btn fcw-btn-ghost fcw-btn-sm"
              style={{ border: "1px dashed var(--fcw-color-border)", borderRadius: "var(--fcw-radius-md)", minHeight: 52 }}
              onClick={addContact}
            >
              <Plus size={14} /> Add
            </button>
          )}
        </div>
      )}
    </div>
  );
}
