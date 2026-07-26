import { Upload, Plus, MessageCircle, Sparkles, Loader2, Edit3, Check } from "lucide-react";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import { Loading } from "../../shared/ui/Loading/Loading";
import { Select } from "../../shared/ui/Select/Select";
import { CategoryAutocomplete } from "../../shared/ui/CategoryAutocomplete/CategoryAutocomplete";
import { AttributesEditor } from "../../shared/ui/AttributesEditor/AttributesEditor";
import { EditorDisclosure, EditorSection, EntityEditor } from "../../shared/ui/EntityEditor/EntityEditor";
import type { ServicesTabProps } from "./types";

export function ServicesTab(props: ServicesTabProps) {
  const {
    services, servicesBusy, showServiceForm, editService, serviceForm, setServiceForm,
    managedImportItems, aiEnrichmentBusy,
    isWorker, isOwner, isManager, isPlatformWorkspace,
    setShowServiceForm, setManagedImportDialogScope, setManagedImportChat,
    setEditService, setImportMode, setSection,
    handleCreateService, handleUpdateService,
    resetServiceForm, handleAiEnrichment,
    t,
  } = props;

  return (
    <div className="ask-catalog-tab">
      <div className="fcw-flex-between ask-catalog-tab__header" style={{ marginBottom: "var(--fcw-space-md)" }}>
        <h2 className="fcw-h2" style={{ margin: 0 }}>{t("business.services")}</h2>
        {!isWorker && (
          <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
            {!isPlatformWorkspace && (isOwner || isManager) && (
              managedImportItems.SERVICE ? (
                <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => setManagedImportChat(managedImportItems.SERVICE)}>
                  <MessageCircle size={16} />{t("managedImport.openChat")}
                </button>
              ) : (
                <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => setManagedImportDialogScope("SERVICE")}>
                  <MessageCircle size={16} />{t("managedImport.requestServices")}
                </button>
              )
            )}
            <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => { setImportMode("SERVICE"); setSection("import"); }}>
              <Upload size={16} />{t("business.import.titleServices")}
            </button>
            <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => { resetServiceForm(); setShowServiceForm(true); }}>
              <Plus size={16} />{t("business.service.add")}
            </button>
          </div>
        )}
      </div>

      {servicesBusy && <Loading size="sm" text={t("business.loadingServices")} />}

      {!servicesBusy && services.length === 0 && !showServiceForm && (
        <EmptyState
          title={t("business.noServices")}
          description={t("business.noServicesDesc")}
          action={!isWorker ? (
            <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => setShowServiceForm(true)}>
              <Plus size={16} />{t("business.service.add")}
            </button>
          ) : undefined}
        />
      )}

      <EntityEditor
        open={showServiceForm && !editService}
        title={t("business.service.add")}
        eyebrow={t("business.services")}
        description={t("business.service.editorDescription")}
        onClose={resetServiceForm}
        closeLabel={t("business.cancel")}
        footer={(
          <>
            <button className="fcw-btn fcw-btn-secondary" onClick={resetServiceForm}>{t("business.cancel")}</button>
            <button
              className="fcw-btn fcw-btn-primary"
              onClick={handleCreateService}
              disabled={!serviceForm.name.trim() || (!serviceForm.categoryId && !serviceForm.categoryLabel.trim())}
            >
              <Check size={16} />{t("business.service.add")}
            </button>
          </>
        )}
      >
        <EditorSection title={t("business.service.mainDetails")} description={t("business.service.mainDetailsDescription")}>
          <div className="ask-editor-grid">
            <div className="ask-editor-field ask-editor-field--wide">
              <label className="ask-editor-required">{t("business.service.name")}</label>
              <input className="fcw-input" maxLength={255} autoFocus placeholder={t("business.service.namePlaceholder")} value={serviceForm.name} onChange={event => setServiceForm(form => ({ ...form, name: event.target.value }))} />
            </div>
            <div className="ask-editor-field ask-editor-field--wide">
              <label className="ask-editor-required">{t("business.service.category")}</label>
              <CategoryAutocomplete value={serviceForm.categoryLabel} categoryId={serviceForm.categoryId || null} onChange={(label, categoryId) => setServiceForm(form => ({ ...form, categoryLabel: label, categoryId: categoryId || "" }))} type="SERVICE" placeholder={t("business.service.categoryPlaceholder")} />
            </div>
            <div className="ask-editor-field">
              <label>{t("business.service.price")}</label>
              <div style={{ position: "relative" }}>
                <input className="fcw-input" type="text" inputMode="decimal" placeholder={t("business.service.pricePlaceholder")} value={serviceForm.basePrice} onChange={event => setServiceForm(form => ({ ...form, basePrice: event.target.value }))} style={{ paddingRight: 34 }} />
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--fcw-color-text-tertiary)", fontSize: "0.8rem" }}>{t("business.product.priceSuffix")}</span>
              </div>
            </div>
            <div className="ask-editor-field">
              <label>{t("business.service.mode")}</label>
              <Select options={[{ value: "ON_DEMAND", label: t("business.service.onDemand") }, { value: "SCHEDULED", label: t("business.service.scheduled") }]} value={serviceForm.serviceMode} onChange={value => setServiceForm(form => ({ ...form, serviceMode: value as "ON_DEMAND" | "SCHEDULED" }))} />
            </div>
            {serviceForm.serviceMode === "SCHEDULED" && (
              <div className="ask-editor-field ask-editor-field--wide">
                <label>{t("business.service.schedule")}</label>
                <input className="fcw-input" value={serviceForm.scheduleText} onChange={event => setServiceForm(form => ({ ...form, scheduleText: event.target.value }))} placeholder={t("business.service.schedule")} />
                <span className="ask-editor-hint">{t("business.service.scheduleHint")}</span>
              </div>
            )}
          </div>
        </EditorSection>
        <EditorDisclosure title={t("business.additional")} description={t("business.service.additionalDescription")}>
          <div className="ask-editor-field">
            <label>{t("business.service.description")}</label>
            <textarea className="fcw-textarea" maxLength={2000} rows={4} placeholder={t("business.service.descriptionPlaceholder")} value={serviceForm.description} onChange={event => setServiceForm(form => ({ ...form, description: event.target.value }))} />
          </div>
          <AttributesEditor value={serviceForm.attributesText} onChange={attributesText => setServiceForm(form => ({ ...form, attributesText }))} />
        </EditorDisclosure>
      </EntityEditor>

      {!servicesBusy && (
        <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
          {services.map(s => (
            <div key={s.serviceOfferingId} style={{
              display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
              padding: "0.5rem 0.75rem",
              backgroundColor: "var(--fcw-color-surface)",
              border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
              borderRadius: "var(--fcw-radius-md)",
            }}>
              {editService?.serviceOfferingId === s.serviceOfferingId ? (
                <div className="fcw-flex-col" style={{ gap: "0.75rem", width: "100%" }}>
                  <div className="fcw-flex-col" style={{ gap: "0.25rem", maxWidth: "260px" }}>
                    <label className="fcw-label">{t("business.service.schedule")}</label>
                    <Select options={[{ value: "ON_DEMAND", label: "ON_DEMAND" }, { value: "SCHEDULED", label: "SCHEDULED" }]} value={serviceForm.serviceMode} onChange={v => setServiceForm(v2 => ({ ...v2, serviceMode: v as "ON_DEMAND" | "SCHEDULED" }))} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(110px, 160px) minmax(110px, 160px)", gap: "0.75rem" }}>
                    <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                      <label className="fcw-label">{t("business.service.name")}</label>
                      <input className="fcw-input" maxLength={255} value={serviceForm.name} onChange={e => setServiceForm(v => ({ ...v, name: e.target.value }))} placeholder={t("business.service.namePlaceholder")} />
                    </div>
                    <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                      <label className="fcw-label">{t("business.service.price")}</label>
                      <input className="fcw-input" type="text" inputMode="decimal" value={serviceForm.basePrice} onChange={e => setServiceForm(v => ({ ...v, basePrice: e.target.value }))} placeholder={t("business.service.pricePlaceholder")} />
                    </div>
                    {serviceForm.serviceMode === "SCHEDULED" && (
                      <input className="fcw-input" value={serviceForm.scheduleText} onChange={e => setServiceForm(v => ({ ...v, scheduleText: e.target.value }))} placeholder={t("business.service.schedule")} />
                    )}
                  </div>
                  <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                    <label className="fcw-label">{t("business.service.description")}</label>
                    <textarea className="fcw-textarea" maxLength={2000} rows={2} value={serviceForm.description} onChange={e => setServiceForm(v => ({ ...v, description: e.target.value }))} placeholder={t("business.service.descriptionPlaceholder")} />
                  </div>
                  <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                    <label className="fcw-label">{t("business.service.category")}</label>
                    <CategoryAutocomplete value={serviceForm.categoryLabel} categoryId={serviceForm.categoryId || null} onChange={(label, categoryId) => setServiceForm(value => ({ ...value, categoryLabel: label, categoryId: categoryId || "" }))} type="SERVICE" />
                  </div>
                  <AttributesEditor value={serviceForm.attributesText} onChange={attributesText => setServiceForm(value => ({ ...value, attributesText }))} />
                  <label className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                    <input type="checkbox" checked={serviceForm.isActive} onChange={e => setServiceForm(value => ({ ...value, isActive: e.target.checked }))} />
                    <span className="fcw-body-s">{t("business.service.active")}</span>
                  </label>
                  <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                    <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleUpdateService}><Check size={14} />{t("business.save")}</button>
                    {isPlatformWorkspace && (
                      <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => handleAiEnrichment("SERVICE", [s.serviceOfferingId])} disabled={aiEnrichmentBusy}>
                        <Sparkles size={14} />AI enrichment
                      </button>
                    )}
                    <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={resetServiceForm}>{t("business.cancel")}</button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="fcw-body fcw-weight-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: "120px" }}>{s.name}</span>
                  {s.serviceMode === "SCHEDULED" && (
                    <span className="fcw-label" style={{ color: "var(--fcw-color-text-tertiary)", flexShrink: 0 }}>{s.scheduleText || s.serviceMode}</span>
                  )}
                  {!s.isActive && (
                    <span className="fcw-label" style={{ color: "var(--fcw-color-text-tertiary)", flexShrink: 0 }}>{t("business.inactive")}</span>
                  )}
                  <div style={{ flex: 1 }} />
                  <span className="fcw-body fcw-weight-bold" style={{ color: "var(--fcw-color-primary)", whiteSpace: "nowrap" }}>
                    {s.basePrice > 0 ? `${s.basePrice.toLocaleString("ru-KZ")} ₸` : "—"}
                  </span>
                  {!isWorker && (
                    <div className="fcw-flex" style={{ gap: "0.25rem" }}>
                      <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={() => {
                        setEditService(s);
                        setServiceForm({ name: s.name, description: s.description || "", basePrice: s.basePrice > 0 ? String(s.basePrice) : "", categoryId: s.categoryId || "", categoryLabel: s.categoryLabel || "", serviceMode: s.serviceMode, scheduleText: s.scheduleText || "", attributesText: s.attributes ? JSON.stringify(s.attributes, null, 2) : "", isActive: s.isActive });
                        setShowServiceForm(true);
                      }} aria-label={t("business.editAria")}>
                        <Edit3 size={14} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
