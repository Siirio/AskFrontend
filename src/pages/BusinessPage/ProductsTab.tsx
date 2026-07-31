import { Upload, Plus, MessageCircle, Sparkles, Loader2, ChevronLeft, ChevronRight, Edit3, Trash2, Check } from "lucide-react";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import { Loading } from "../../shared/ui/Loading/Loading";
import { CategoryAutocomplete } from "../../shared/ui/CategoryAutocomplete/CategoryAutocomplete";
import { AttributesEditor } from "../../shared/ui/AttributesEditor/AttributesEditor";
import { EditorDisclosure, EditorSection, EntityEditor } from "../../shared/ui/EntityEditor/EntityEditor";
import type { ProductsTabProps } from "./types";

export function ProductsTab(props: ProductsTabProps) {
  const {
    businessId, products, productsTotal, productsPage, productsLoadingPage,
    showProductForm, editProduct, productForm, setProductForm,
    activeBranchId, branches, selectedProductOfferIds,
    managedImportItems, aiEnrichmentBusy,
    isWorker, isOwner, isManager, isPlatformWorkspace, reduced,
    setShowProductForm, setSelectedProductOfferIds,
    setManagedImportDialogScope, setManagedImportChat,
    setEditProduct, setImportMode, setSection,
    handleCreateProduct, handleUpdateProduct, handleDeleteProduct,
    resetProductForm, handleAiEnrichment,
    t,
  } = props;

  const activeBranch = branches.find(b => b.id === activeBranchId);

  return (
    <div className="ask-catalog-tab">
      <div className="fcw-flex-between ask-catalog-tab__header" style={{ marginBottom: "var(--fcw-space-md)" }}>
        <div>
          <h2 className="fcw-h2" style={{ margin: 0 }}>{t("business.products")}</h2>
          {productsTotal > 0 && (
            <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.25rem 0 0 0" }}>{t("business.total", { count: productsTotal })}</p>
          )}
        </div>
        {!isWorker && (
          <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
            {!isPlatformWorkspace && (isOwner || isManager) && (
              managedImportItems.ITEM ? (
                <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => setManagedImportChat(managedImportItems.ITEM)}>
                  <MessageCircle size={16} />
                  {t("managedImport.openChat")}
                </button>
              ) : (
                <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => setManagedImportDialogScope("ITEM")}>
                  <MessageCircle size={16} />
                  {t("managedImport.requestProducts")}
                </button>
              )
            )}
            {isPlatformWorkspace && selectedProductOfferIds.size > 0 && (
              <button
                className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                onClick={() => handleAiEnrichment("PRODUCT", Array.from(selectedProductOfferIds))}
                disabled={aiEnrichmentBusy}
              >
                {aiEnrichmentBusy ? <Loader2 size={16} className="fcw-spin" /> : <Sparkles size={16} />}
                AI enrichment ({selectedProductOfferIds.size})
              </button>
            )}
            <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => { setImportMode("ITEM"); setSection("import"); }}>
              <Upload size={16} />{t("business.import.title")}
            </button>
            <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => { resetProductForm(); setShowProductForm(true); }}>
              <Plus size={16} />{t("business.product.add")}
            </button>
          </div>
        )}
      </div>

      {products.length === 0 && productsLoadingPage && <Loading size="sm" text={t("business.loadingProducts")} />}

      {!productsLoadingPage && products.length === 0 && !showProductForm && (
        <EmptyState
          title={t("business.noProducts")}
          description={t("business.noProductsDesc")}
          action={!isWorker ? (
            <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => setShowProductForm(true)}>
              <Plus size={16} />{t("business.product.add")}
            </button>
          ) : undefined}
        />
      )}

      <EntityEditor
        open={showProductForm && !editProduct}
        title={t("business.product.add")}
        eyebrow={t("business.products")}
        description={t("business.product.editorDescription")}
        onClose={resetProductForm}
        closeLabel={t("business.cancel")}
        footer={(
          <>
            <button className="fcw-btn fcw-btn-secondary" onClick={resetProductForm}>{t("business.cancel")}</button>
            <button
              className="fcw-btn fcw-btn-primary"
              onClick={handleCreateProduct}
              disabled={!productForm.name.trim() || (!productForm.categoryId && !productForm.categoryLabel.trim())}
            >
              <Check size={16} />{t("business.product.add")}
            </button>
          </>
        )}
      >
        <EditorSection title={t("business.product.mainDetails")} description={t("business.product.mainDetailsDescription")}>
          <div className="ask-editor-grid">
            <div className="ask-editor-field ask-editor-field--wide">
              <label className="ask-editor-required">{t("business.product.name")}</label>
              <input className="fcw-input" maxLength={255} autoFocus placeholder={t("business.product.namePlaceholder")} value={productForm.name} onChange={event => setProductForm(form => ({ ...form, name: event.target.value }))} />
            </div>
            <div className="ask-editor-field ask-editor-field--wide">
              <label className="ask-editor-required">{t("business.product.category")}</label>
              <CategoryAutocomplete value={productForm.categoryLabel} categoryId={productForm.categoryId || null} onChange={(label, categoryId) => setProductForm(form => ({ ...form, categoryLabel: label, categoryId: categoryId || "" }))} type="ITEM" placeholder={t("business.product.categoryPlaceholder")} />
            </div>
            <div className="ask-editor-field">
              <label>{t("business.product.price")}</label>
              <div style={{ position: "relative" }}>
                <input className="fcw-input" type="text" inputMode="decimal" placeholder={t("business.product.pricePlaceholder")} value={productForm.price} onChange={event => setProductForm(form => ({ ...form, price: event.target.value }))} style={{ paddingRight: 34 }} />
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--fcw-color-text-tertiary)", fontSize: "0.8rem" }}>{t("business.product.priceSuffix")}</span>
              </div>
            </div>
            <div className="ask-editor-field">
              <label>{t("business.branches")}</label>
              <div className="fcw-input" style={{ display: "flex", alignItems: "center", color: "var(--fcw-color-text-secondary)" }}>
                {activeBranch?.name || t("business.allBranches")}
              </div>
            </div>
            <div className="ask-editor-field ask-editor-field--wide">
              <label>{t("business.product.deepLink")}</label>
              <input className="fcw-input" type="url" value={productForm.deepLink} onChange={event => setProductForm(form => ({ ...form, deepLink: event.target.value }))} placeholder={t("business.product.deepLinkPlaceholder")} />
              <span className="ask-editor-hint">{t("business.product.deepLinkHint")}</span>
            </div>
          </div>
        </EditorSection>
        <EditorDisclosure title={t("business.additional")} description={t("business.product.additionalDescription")}>
          <div className="ask-editor-field">
            <label>{t("business.product.description")}</label>
            <textarea className="fcw-textarea" maxLength={2000} rows={4} placeholder={t("business.product.descriptionPlaceholder")} value={productForm.description} onChange={event => setProductForm(form => ({ ...form, description: event.target.value }))} />
          </div>
          <div className="ask-editor-field">
            <label>{t("business.product.tags")}</label>
            <input className="fcw-input" value={productForm.tags} onChange={event => setProductForm(form => ({ ...form, tags: event.target.value }))} placeholder={t("business.product.tagsPlaceholder")} />
          </div>
          <AttributesEditor value={productForm.attributesText} onChange={attributesText => setProductForm(form => ({ ...form, attributesText }))} />
        </EditorDisclosure>
      </EntityEditor>

      {(products.length > 0 || showProductForm) && (
        <div className="fcw-flex-col" style={{ gap: "0.25rem", minHeight: 440, opacity: productsLoadingPage ? 0.6 : 1, transition: "opacity 150ms" }}>
          {products.length > 0 && (
            <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
              {products.map(p => (
                <div key={p.productId} style={{
                  display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "var(--fcw-color-surface)",
                  border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                  borderRadius: "var(--fcw-radius-md)",
                }}>
                  {editProduct?.productId === p.productId ? (
                    <div className="fcw-flex-col" style={{ gap: "0.75rem", width: "100%" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(110px, 160px)", gap: "0.75rem" }}>
                        <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                          <label className="fcw-label">{t("business.product.name")}</label>
                          <input className="fcw-input" maxLength={255} value={productForm.name} onChange={e => setProductForm(v => ({ ...v, name: e.target.value }))} placeholder={t("business.product.namePlaceholder")} />
                        </div>
                        <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                          <label className="fcw-label">{t("business.product.price")}</label>
                          <input className="fcw-input" type="text" inputMode="decimal" value={productForm.price} onChange={e => setProductForm(v => ({ ...v, price: e.target.value }))} placeholder={t("business.product.pricePlaceholder")} />
                        </div>
                      </div>
                      <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                        <label className="fcw-label">{t("business.product.description")}</label>
                        <textarea className="fcw-textarea" maxLength={2000} rows={2} value={productForm.description} onChange={e => setProductForm(v => ({ ...v, description: e.target.value }))} placeholder={t("business.product.descriptionPlaceholder")} />
                      </div>
                      <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                        <label className="fcw-label">{t("business.product.category")}</label>
                        <CategoryAutocomplete value={productForm.categoryLabel} categoryId={productForm.categoryId || null} onChange={(label, categoryId) => setProductForm(value => ({ ...value, categoryLabel: label, categoryId: categoryId || "" }))} type="ITEM" />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                          <span className="fcw-label">{t("business.product.deepLink")}</span>
                          <input className="fcw-input" type="url" value={productForm.deepLink} onChange={e => setProductForm(v => ({ ...v, deepLink: e.target.value }))} />
                        </label>
                        <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                          <span className="fcw-label">{t("business.product.tags")}</span>
                          <input className="fcw-input" value={productForm.tags} onChange={e => setProductForm(v => ({ ...v, tags: e.target.value }))} />
                        </label>
                      </div>
                      <label className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                        <input type="checkbox" checked={productForm.isActive} onChange={e => setProductForm(value => ({ ...value, isActive: e.target.checked }))} />
                        <span className="fcw-body-s">{t("business.product.active")}</span>
                      </label>
                      <AttributesEditor value={productForm.attributesText} onChange={attributesText => setProductForm(value => ({ ...value, attributesText }))} />
                      <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                        <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleUpdateProduct}><Check size={14} />{t("business.save")}</button>
                        {isPlatformWorkspace && (
                          <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => handleAiEnrichment("PRODUCT", [p.productId])} disabled={aiEnrichmentBusy}>
                            <Sparkles size={14} />AI enrichment
                          </button>
                        )}
                        <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={resetProductForm}>{t("business.cancel")}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isPlatformWorkspace && (
                        <label className="fcw-flex fcw-items-center" style={{ gap: "0.25rem", flexShrink: 0 }}>
                          <input type="checkbox" checked={selectedProductOfferIds.has(p.productId)} onChange={() => {
                            const next = new Set(selectedProductOfferIds);
                            next.has(p.productId) ? next.delete(p.productId) : next.add(p.productId);
                            setSelectedProductOfferIds(next);
                          }} />
                        </label>
                      )}
                      <span className="fcw-body fcw-weight-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: "120px" }}>{p.name}</span>
                      {p.categoryLabel && <span className="fcw-body-xs fcw-text-tertiary" style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{p.categoryLabel}</span>}
                      {!p.isActive && <span className="fcw-label" style={{ color: "var(--fcw-color-text-tertiary)", flexShrink: 0 }}>{t("business.inactive")}</span>}
                      {activeBranch && p.branchId !== activeBranch.id && <span className="fcw-label" style={{ color: "var(--fcw-color-warning)", flexShrink: 0 }}>{activeBranch.name}</span>}
                      <div style={{ flex: 1 }} />
                      <span className="fcw-body fcw-weight-bold" style={{ color: "var(--fcw-color-primary)", whiteSpace: "nowrap" }}>{p.price > 0 ? `${p.price.toLocaleString("ru-KZ")} ₸` : "—"}</span>
                      {!isWorker && (
                        <div className="fcw-flex" style={{ gap: "0.25rem" }}>
                          <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={() => {
                            setEditProduct(p);
                            setProductForm({ name: p.name, description: p.description || "", deepLink: p.deepLink || "", price: p.price > 0 ? String(p.price) : "", categoryId: p.categoryId || "", categoryLabel: p.categoryLabel || "", tags: (p.tags || []).join(", "), attributesText: p.attributes ? JSON.stringify(p.attributes, null, 2) : "", isActive: p.isActive });
                            setShowProductForm(true);
                          }} aria-label={t("business.editAria")}>
                            <Edit3 size={14} />
                          </button>
                          <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={() => handleDeleteProduct(p)} aria-label={t("business.deleteAria")}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {productsTotal > 10 && (
            <div className="fcw-flex fcw-items-center fcw-justify-between" style={{ gap: "0.75rem", marginTop: "0.5rem" }}>
              <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" disabled={productsPage === 0} onClick={() => props.setProductsPage(productsPage - 1)}>
                <ChevronLeft size={16} />{t("results.pagination.previous")}
              </button>
              <span className="fcw-body-s fcw-text-secondary">{t("results.pagination.summary", { page: productsPage + 1, total: Math.ceil(productsTotal / 10) })}</span>
              <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" disabled={(productsPage + 1) * 10 >= productsTotal} onClick={() => props.setProductsPage(productsPage + 1)}>
                {t("results.pagination.next")}<ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
