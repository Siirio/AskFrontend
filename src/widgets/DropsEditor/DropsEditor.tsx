import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Calendar, Check, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import { EditorProgress, EditorSection, EntityEditor } from "../../shared/ui/EntityEditor/EntityEditor";
import type { BrandDropDto } from "../../shared/api/dto";

function formatDateShort(value?: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-KZ", { day: "2-digit", month: "short" }).format(new Date(value));
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "drops.statusActive",
  CANCELLED: "drops.statusCancelled",
  ENDED: "drops.statusCompleted",
};

interface DropsEditorProps {
  drops: BrandDropDto[];
  onCreate: (data: Partial<BrandDropDto>, coverFile: File | null) => Promise<void>;
  onCancel: (drop: BrandDropDto) => Promise<void>;
  onDelete: (drop: BrandDropDto) => Promise<void>;
  busy: boolean;
  readOnly?: boolean;
  openRequest?: number;
  onAiEnrichment?: (drop: BrandDropDto) => Promise<void>;
  aiEnrichmentBusy?: boolean;
}

interface DropForm {
  name: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  tags: string;
  coverFile: File | null;
  discountPercent: string;
  discountAmount: string;
  currency: string;
}

const emptyForm: DropForm = {
  name: "",
  type: "NEW_COLLECTION",
  description: "",
  startDate: "",
  endDate: "",
  tags: "",
  coverFile: null,
  discountPercent: "",
  discountAmount: "",
  currency: "KZT",
};

export function DropsEditor({ drops, onCreate, onCancel, onDelete, busy, readOnly, openRequest, onAiEnrichment, aiEnrichmentBusy }: DropsEditorProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<DropForm>(emptyForm);
  const [editorOpen, setEditorOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const update = (patch: Partial<DropForm>) => setForm(current => ({ ...current, ...patch }));

  const dropTypes = [
    { key: "NEW_COLLECTION", label: t("drops.typeNewCollection"), description: t("drops.typeNewCollectionDesc") },
    { key: "LIMITED_RELEASE", label: t("drops.typeLimitedRelease"), description: t("drops.typeLimitedReleaseDesc") },
    { key: "SEASONAL", label: t("drops.typeSeasonal"), description: t("drops.typeSeasonalDesc") },
    { key: "DISCOUNT", label: t("drops.typePromo"), description: t("drops.typePromoDesc") },
  ];

  const openEditor = () => {
    setForm(emptyForm);
    setStep(0);
    setSaveState("idle");
    setErrorMessage("");
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setStep(0);
    setSaveState("idle");
    setErrorMessage("");
  };

  useEffect(() => {
    if (!openRequest || readOnly) return;
    openEditor();
  }, [openRequest, readOnly]);

  const datesValid = !form.startDate || !form.endDate || new Date(form.endDate) > new Date(form.startDate);

  const goForward = () => {
    if (step === 0 && !form.name.trim()) {
      setErrorMessage(t("drops.nameRequired"));
      return;
    }
    if (step === 1 && !datesValid) {
      setErrorMessage(t("drops.errorDateOrder"));
      return;
    }
    setErrorMessage("");
    setStep(current => Math.min(current + 1, 2));
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !datesValid) {
      setSaveState("error");
      setErrorMessage(!form.name.trim() ? t("drops.nameRequired") : t("drops.errorDateOrder"));
      return;
    }
    setSaveState("saving");
    setErrorMessage("");
    try {
      const hasDiscount = form.type === "DISCOUNT";
      await onCreate({
        name: form.name.trim(),
        type: form.type,
        status: "ACTIVE",
        description: form.description.trim(),
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        tags: form.tags.split(",").map(tag => tag.trim()).filter(Boolean),
        discountPercent: hasDiscount && form.discountPercent ? Number(form.discountPercent) : undefined,
        discountAmount: hasDiscount && form.discountAmount ? Number(form.discountAmount) : undefined,
        currency: hasDiscount ? form.currency : undefined,
        isActive: true,
      }, form.coverFile);
      setSaveState("saved");
      closeEditor();
    } catch (error: unknown) {
      setSaveState("error");
      setErrorMessage(error instanceof Error ? error.message : t("drops.errorCreate"));
    }
  };

  const selectedType = dropTypes.find(type => type.key === form.type);
  const footer = step < 2 ? (
    <>
      <button className="fcw-btn fcw-btn-secondary" onClick={step === 0 ? closeEditor : () => setStep(current => current - 1)}>
        {step > 0 && <ArrowLeft size={16} />}{step === 0 ? t("business.cancel") : t("business.back")}
      </button>
      <button className="fcw-btn fcw-btn-primary" onClick={goForward} disabled={step === 0 && !form.name.trim()}>
        {t("business.continue")}<ArrowRight size={16} />
      </button>
    </>
  ) : (
    <>
      <button className="fcw-btn fcw-btn-secondary" onClick={() => setStep(1)}><ArrowLeft size={16} />{t("business.back")}</button>
      <button className="fcw-btn fcw-btn-primary" onClick={handleCreate} disabled={busy || saveState === "saving"}>
        {saveState === "saving" ? <Loader2 className="fcw-animate-spin" size={16} /> : <Check size={16} />}
        {saveState === "saving" ? t("drops.saving") : t("drops.create")}
      </button>
    </>
  );

  return (
    <div>
      <div className="fcw-flex-between" style={{ marginBottom: "var(--fcw-space-md)" }}>
        <div>
          <h2 className="fcw-h2" style={{ margin: 0 }}>{t("business.events")}</h2>
          <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.25rem 0 0" }}>
            {t("business.activeDrops", { count: drops.filter(drop => drop.status === "ACTIVE").length })}
          </p>
        </div>
        {!readOnly && <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={openEditor}><Plus size={16} />{t("drops.create")}</button>}
      </div>

      {drops.length === 0 ? (
        <EmptyState
          title={t("drops.empty")}
          description={t("drops.emptyDesc")}
          icon={<Sparkles size={36} style={{ color: "var(--fcw-color-text-tertiary)" }} />}
          action={!readOnly ? <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={openEditor}><Plus size={16} />{t("drops.create")}</button> : undefined}
        />
      ) : (
        <div className="ask-drop-list">
          {drops.map(drop => {
            const type = dropTypes.find(item => item.key === drop.type);
            return (
              <div className="ask-drop-row" key={drop.id}>
                <span className="ask-drop-row__mark" />
                <div className="ask-drop-row__identity">
                  <strong>{drop.name}</strong>
                  <span>{type?.label || drop.type}</span>
                </div>
                <span className="ask-drop-row__dates"><Calendar size={14} />{formatDateShort(drop.startDate)}{drop.endDate && ` — ${formatDateShort(drop.endDate)}`}</span>
                <span className="ask-drop-row__status">{t(STATUS_LABELS[drop.status] || "drops.statusActive")}</span>
                <div className="ask-drop-row__actions">
                  {onAiEnrichment && <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={() => onAiEnrichment(drop)} disabled={aiEnrichmentBusy} aria-label="AI enrichment">{aiEnrichmentBusy ? <Loader2 className="fcw-animate-spin" size={15} /> : <Sparkles size={15} />}</button>}
                  {!readOnly && drop.status === "ACTIVE" && (
                    <>
                      <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={() => onCancel(drop)} aria-label={t("drops.cancel")}><X size={15} /></button>
                      <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={() => onDelete(drop)} aria-label={t("drops.delete")}><Trash2 size={15} /></button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EntityEditor
        open={editorOpen}
        variant="workspace"
        eyebrow={t("business.events")}
        title={t("drops.newDrop")}
        description={t("drops.editorDescription")}
        onClose={closeEditor}
        closeLabel={t("business.cancel")}
        footer={footer}
      >
        <EditorProgress steps={[t("drops.stepDetails"), t("drops.stepPublication"), t("drops.stepReview")]} current={step} />
        {step === 0 && (
          <EditorSection title={t("drops.detailsTitle")} description={t("drops.detailsDescription")}>
            <div className="ask-drop-types">
              {dropTypes.map(type => (
                <button type="button" key={type.key} className={form.type === type.key ? "is-selected" : ""} onClick={() => update({ type: type.key })}>
                  <strong>{type.label}</strong>
                  <span>{type.description}</span>
                </button>
              ))}
            </div>
            <div className="ask-editor-field">
              <label className="ask-editor-required">{t("drops.name")}</label>
              <input className="fcw-input" autoFocus value={form.name} onChange={event => update({ name: event.target.value })} placeholder={t("drops.namePlaceholder")} />
            </div>
            <div className="ask-editor-field">
              <label>{t("drops.description")}</label>
              <textarea className="fcw-textarea" rows={4} value={form.description} onChange={event => update({ description: event.target.value })} />
            </div>
          </EditorSection>
        )}
        {step === 1 && (
          <EditorSection title={t("drops.publicationTitle")} description={t("drops.publicationDescription")}>
            <div className="ask-editor-grid">
              <div className="ask-editor-field">
                <label>{t("drops.start")}</label>
                <input type="datetime-local" className="fcw-input" value={form.startDate} onChange={event => update({ startDate: event.target.value })} />
              </div>
              <div className="ask-editor-field">
                <label>{t("drops.end")}</label>
                <input type="datetime-local" className="fcw-input" value={form.endDate} onChange={event => update({ endDate: event.target.value })} />
              </div>
              <div className="ask-editor-field ask-editor-field--wide">
                <label>{t("drops.coverUrl")}</label>
                <input
                  className="fcw-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={event => update({ coverFile: event.target.files?.[0] ?? null })}
                />
              </div>
              <div className="ask-editor-field ask-editor-field--wide">
                <label>{t("drops.tags")}</label>
                <input className="fcw-input" value={form.tags} onChange={event => update({ tags: event.target.value })} placeholder={t("drops.tagsPlaceholder")} />
              </div>
              {form.type === "DISCOUNT" && (
                <>
                  <div className="ask-editor-field">
                    <label>{t("drops.discountPercent")}</label>
                    <input className="fcw-input" type="number" min="1" max="100" value={form.discountPercent} onChange={event => update({ discountPercent: event.target.value })} />
                  </div>
                  <div className="ask-editor-field">
                    <label>{t("drops.discountAmount")}</label>
                    <input className="fcw-input" type="number" min="1" value={form.discountAmount} onChange={event => update({ discountAmount: event.target.value })} />
                  </div>
                </>
              )}
            </div>
          </EditorSection>
        )}
        {step === 2 && (
          <EditorSection title={t("drops.reviewTitle")} description={t("drops.reviewDescription")}>
            <div className="ask-editor-summary">
              <div><small>{t("drops.type")}</small><strong>{selectedType?.label}</strong></div>
              <div><small>{t("drops.name")}</small><strong>{form.name}</strong></div>
              <div><small>{t("drops.start")}</small><strong>{form.startDate ? formatDateShort(form.startDate) : t("drops.noDate")}</strong></div>
              <div><small>{t("drops.end")}</small><strong>{form.endDate ? formatDateShort(form.endDate) : t("drops.noDate")}</strong></div>
            </div>
            {form.description && <p className="fcw-body fcw-text-secondary" style={{ margin: 0 }}>{form.description}</p>}
          </EditorSection>
        )}
        {errorMessage && <p className="fcw-body-s" style={{ color: "var(--fcw-color-error)", margin: "18px 0 0" }}>{errorMessage}</p>}
      </EntityEditor>
    </div>
  );
}
