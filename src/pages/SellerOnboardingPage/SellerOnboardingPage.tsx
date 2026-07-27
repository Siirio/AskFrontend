import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Check, ChevronLeft, ChevronRight, FileUp, Globe2, Handshake, Info, MapPin, Package, PackageX, Plus, ShieldCheck, Store, Trash2, Truck } from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { buildRoute, ROUTES } from "../../app/routes";
import { acceptLegalDocuments } from "../../shared/api/legalClient";
import {
  completeSellerOnboarding,
  type SellerOnboardingData,
} from "../../shared/api/sellerOnboardingClient";
import { listCities, createBranch } from "../../shared/api/askClient";
import MapLocationPicker from "../../widgets/MapLocationPicker/MapLocationPicker";
import { Card } from "../../shared/ui/Card/Card";
import { CategoryAutocomplete } from "../../shared/ui/CategoryAutocomplete/CategoryAutocomplete";
import { Loading } from "../../shared/ui/Loading/Loading";
import { hasValidBusinessVerificationSource, isValidHttpUrl } from "../../shared/utils/validation";

const DRAFT_KEY = "ask.sellerOnboardingDraft";
const BRANCH_DRAFTS_KEY = "ask.sellerOnboardingBranchDrafts";

type BranchDraft = {
  id: string;
  name: string;
  address: string;
  addressDetails: string;
  cityId: string;
  latitude: number | null;
  longitude: number | null;
};
const SOURCE_LINKS = [
  ["twoGisUrl", "seller.verification.twoGisUrl", "2GIS"],
  ["kaspiUrl", "seller.verification.kaspiUrl", "Kaspi"],
  ["ozonUrl", "seller.verification.ozonUrl", "Ozon"],
  ["wildberriesUrl", "seller.verification.wildberriesUrl", "Wildberries"],
  ["websiteUrl", "seller.verification.websiteUrl", "Сайт"],
  ["instagramUrl", "seller.verification.instagramUrl", "Instagram"],
  ["telegramUrl", "seller.verification.telegramUrl", "Telegram"],
] as const satisfies ReadonlyArray<readonly [
  keyof Pick<SellerOnboardingData, "twoGisUrl" | "kaspiUrl" | "ozonUrl" | "wildberriesUrl" | "websiteUrl" | "instagramUrl" | "telegramUrl">,
  string,
  string,
]>;

const INITIAL_DATA: SellerOnboardingData = {
  businessName: "",
  categoryId: "",
  categoryName: "",
  countryCode: "KZ",
  legalForm: "NONE",
  legalIdentifier: "",
  legalName: "",
  catalogSetupMode: "MANUAL",
  businessScope: "BOTH",
  onlineOnly: false,
  deliveryCoverage: "NO_DELIVERY",
  deliveryCities: [],
  pickupAvailable: false,
  locale: "ru",
  twoGisUrl: "",
  kaspiUrl: "",
  ozonUrl: "",
  wildberriesUrl: "",
  websiteUrl: "",
  instagramUrl: "",
  telegramUrl: "",
};

function readDraft(): SellerOnboardingData {
  try {
    const draft = sessionStorage.getItem(DRAFT_KEY);
    if (!draft) return INITIAL_DATA;
    const restored = { ...INITIAL_DATA, ...JSON.parse(draft) } as SellerOnboardingData;
    if (restored.legalForm !== "NONE" && !restored.legalIdentifier) {
      restored.legalForm = "NONE";
    }
    if (!restored.categoryName && "categoryLabel" in restored) {
      restored.categoryName = (restored as SellerOnboardingData & { categoryLabel?: string }).categoryLabel ?? "";
    }
    return restored;
  } catch {
    return INITIAL_DATA;
  }
}

export function SellerOnboardingPage() {
  const { state, actions } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SellerOnboardingData>(() => readDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [addedSourceKeys, setAddedSourceKeys] = useState<Array<(typeof SOURCE_LINKS)[number][0]>>(() =>
    SOURCE_LINKS.filter(([key]) => Boolean(data[key])).map(([key]) => key),
  );

  // Branch drafts for self-pickup during onboarding
  const [branchDrafts, setBranchDrafts] = useState<BranchDraft[]>(() => {
    try {
      const stored = sessionStorage.getItem(BRANCH_DRAFTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [draftForm, setDraftForm] = useState<BranchDraft>({
    id: "", name: "", address: "", addressDetails: "", cityId: "", latitude: null, longitude: null,
  });

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    sessionStorage.setItem(BRANCH_DRAFTS_KEY, JSON.stringify(branchDrafts));
  }, [branchDrafts]);

  useEffect(() => {
    listCities().then(setCities).catch(() => setCities([]));
  }, []);

  function normalizeCityName(value: string) {
    return value
      .toLocaleLowerCase()
      .replace(/^(\u0433\.?|\u0433\u043e\u0440\u043e\u0434)\s*/u, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  const addBranchDraft = () => {
    if (!draftForm.name.trim() || draftForm.latitude == null || draftForm.longitude == null) return;
    const newDraft: BranchDraft = {
      ...draftForm,
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    setBranchDrafts(current => [...current, newDraft]);
    setDraftForm({ id: "", name: "", address: "", addressDetails: "", cityId: "", latitude: null, longitude: null });
    if (!data.pickupAvailable) {
      update("pickupAvailable", true);
    }
  };

  const removeBranchDraft = (id: string) => {
    setBranchDrafts(current => {
      const next = current.filter(d => d.id !== id);
      if (next.length === 0) {
        update("pickupAvailable", false);
      }
      return next;
    });
  };

  if (!state.sessionReady) {
    return <Loading />;
  }

  if (!state.authenticated) {
    return <Navigate to={ROUTES.auth} replace />;
  }

  if (state.session?.businessMemberships?.length) {
    return <Navigate to={buildRoute(ROUTES.business, { businessId: state.session.businessMemberships[0].businessId })} replace />;
  }

  const update = <K extends keyof SellerOnboardingData>(
    key: K,
    value: SellerOnboardingData[K],
  ) => setData(current => ({ ...current, [key]: value }));

  const selectCategory = (label: string, categoryId: string | null) => {
    if (!categoryId) {
      return;
    }
    setData(current => ({ ...current, categoryId, categoryName: label }));
  };

  const addSource = (key: (typeof SOURCE_LINKS)[number][0]) => {
    setAddedSourceKeys(current => current.includes(key) ? current : [...current, key]);
  };

  const removeSource = (key: (typeof SOURCE_LINKS)[number][0]) => {
    setAddedSourceKeys(current => current.filter(item => item !== key));
    update(key, "");
  };

  const verificationSources = Object.fromEntries(
    SOURCE_LINKS.map(([key]) => [key, data[key]]),
  );

  const validateBusinessDetails = () => {
    if (!data.businessName.trim() || (!data.categoryId && !data.categoryName.trim())) {
      setError(t("seller.validation.businessContact"));
      return false;
    }
    if (data.legalForm !== "NONE" && (!/^[0-9]{12}$/.test(data.legalIdentifier) || !data.legalName.trim())) {
      setError(t("seller.validation.legalDetails"));
      return false;
    }
    if (data.legalForm === "NONE" && !hasValidBusinessVerificationSource(verificationSources)) {
      setError(t("seller.validation.verificationSource"));
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validateBusinessDetails()) {
      setStep(1);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const locale = i18n.resolvedLanguage?.split("-")[0] ?? "ru";
      await acceptLegalDocuments(["SELLER_TERMS", "PERSONAL_DATA_CONSENT"], locale);
      const result = await completeSellerOnboarding({
        ...data,
        locale,
      });
      sessionStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem(BRANCH_DRAFTS_KEY);
      await actions.refreshSession();
      // Create drafted branches
      for (const draft of branchDrafts) {
        if (!draft.latitude || !draft.longitude) continue;
        try {
          await createBranch(result.businessId, {
            name: draft.name,
            address: draft.address,
            addressDetails: draft.addressDetails || undefined,
            cityId: draft.cityId || undefined,
            latitude: draft.latitude,
            longitude: draft.longitude,
            pickupAvailable: true,
          });
        } catch {
          // Branch creation failed — continue with others
        }
      }
      const businessRoute = buildRoute(ROUTES.business, { businessId: result.businessId });
      if (data.catalogSetupMode === "ASK_MANAGED_IMPORT") {
        const sourceUrls = Object.fromEntries(Object.entries({
          TWO_GIS: data.twoGisUrl,
          KASPI: data.kaspiUrl,
          OZON: data.ozonUrl,
          WILDBERRIES: data.wildberriesUrl,
          WEBSITE: data.websiteUrl,
          INSTAGRAM: data.instagramUrl,
          TELEGRAM: data.telegramUrl,
        }).filter(([, value]) => value.trim()));
        sessionStorage.setItem(`ask.managedImportSources.${result.businessId}`, JSON.stringify(sourceUrls));
        navigate(`${businessRoute}?managedImport=${encodeURIComponent(data.businessScope)}`);
        return;
      }
      navigate(businessRoute);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("seller.error"));
    } finally {
      setBusy(false);
    }
  };

  const goNext = () => {
    setError("");
    if (step === 1 && !validateBusinessDetails()) {
      return;
    }
    if (step === 3 && data.deliveryCoverage === "SELECTED_CITIES" && data.deliveryCities.length === 0) {
      setError(t("seller.validation.deliveryCities"));
      return;
    }
    setStep(current => current + 1);
  };

  return (
    <main id="main-content">
      <div className="fcw-container" style={{ maxWidth: 820, paddingTop: "var(--fcw-space-xl)", paddingBottom: "var(--fcw-space-xl)" }}>
        <Card padding="lg">
          <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
            <div>
              <p className="fcw-label fcw-text-tertiary">{t("seller.progress", { step })}</p>
              <h1 className="fcw-h2">{t(`seller.step${step}.title`)}</h1>
            </div>

            {step === 1 && (
              <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                <input className="fcw-input" value={data.businessName} onChange={event => update("businessName", event.target.value)} placeholder={t("seller.businessName")} />
                <CategoryAutocomplete
                  value={data.categoryName}
                  categoryId={data.categoryId || null}
                  onChange={selectCategory}
                  onInputChange={categoryName => setData(current => ({ ...current, categoryId: "", categoryName }))}
                  type="BUSINESS"
                  placeholder={t("seller.category", { defaultValue: "Выберите категорию бизнеса" })}
                />
                <select className="fcw-input" value={data.legalForm} onChange={event => update("legalForm", event.target.value as SellerOnboardingData["legalForm"])}>
                  <option value="KZ_IP">{t("seller.legalForm.KZ_IP")}</option>
                  <option value="KZ_TOO">{t("seller.legalForm.KZ_TOO")}</option>
                  <option value="NONE">{t("seller.legalForm.NONE")}</option>
                </select>
                {data.legalForm !== "NONE" && (
                  <>
                    <input
                      className="fcw-input"
                      inputMode="numeric"
                      maxLength={12}
                      value={data.legalIdentifier}
                      onChange={event => update("legalIdentifier", event.target.value.replace(/\D/g, "").slice(0, 12))}
                      placeholder={data.legalForm === "KZ_IP" ? t("seller.iin") : t("seller.bin")}
                    />
                    <input className="fcw-input" value={data.legalName} onChange={event => update("legalName", event.target.value)} placeholder={t("seller.legalName")} />
                  </>
                )}
                <label className="seller-online-only-toggle">
                  <input
                    type="checkbox"
                    checked={data.onlineOnly}
                    onChange={event => update("onlineOnly", event.target.checked)}
                  />
                  <span>
                    <strong>{t("seller.onlineOnly")}</strong>
                    <small>{t("seller.onlineOnly.description")}</small>
                  </span>
                </label>
                {data.legalForm === "NONE" && (
                  <div className="fcw-flex-col" style={{ gap: "0.5rem", marginTop: "0.5rem" }}>
                    <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                      <span className="fcw-label">{t("seller.verification.title")}</span>
                      <span className="fcw-body-xs fcw-text-tertiary">{t("seller.verification.description")}</span>
                    </div>
                    {addedSourceKeys.map(key => {
                      const [, translationKey, fallback] = SOURCE_LINKS.find(([sourceKey]) => sourceKey === key)!;
                      return (
                        <div key={key} className="fcw-flex" style={{ gap: "0.5rem" }}>
                          <input
                            className="fcw-input"
                            type="url"
                            value={data[key]}
                            aria-invalid={Boolean(data[key]) && !isValidHttpUrl(data[key])}
                            onChange={event => update(key, event.target.value)}
                            placeholder={t(translationKey, { defaultValue: fallback })}
                          />
                          <button type="button" className="fcw-btn fcw-btn-ghost" onClick={() => removeSource(key)} aria-label={t("common.remove", { defaultValue: "Удалить" })}>×</button>
                        </div>
                      );
                    })}
                    {SOURCE_LINKS.some(([key]) => !addedSourceKeys.includes(key)) && (
                      <select className="fcw-input" value="" onChange={event => addSource(event.target.value as (typeof SOURCE_LINKS)[number][0])}>
                        <option value="">{t("seller.verification.addSource", { defaultValue: "Добавить ссылку для проверки" })}</option>
                        {SOURCE_LINKS.filter(([key]) => !addedSourceKeys.includes(key)).map(([key, translationKey, fallback]) => (
                          <option key={key} value={key}>{t(translationKey, { defaultValue: fallback })}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="seller-catalog-step">
                <div>
                  <h3>{t("seller.businessScope.title")}</h3>
                  <p>{t("seller.businessScope.description")}</p>
                </div>
                <div className="seller-scope-options">
                  {([
                    ["ITEM", Package],
                    ["SERVICE", Briefcase],
                    ["BOTH", Handshake],
                  ] as const).map(([scope, Icon]) => (
                    <button
                      key={scope}
                      type="button"
                      className={data.businessScope === scope ? "is-selected" : ""}
                      onClick={() => update("businessScope", scope)}
                    >
                      <Icon size={20} />
                      <span>{t(`seller.businessScope.${scope}`)}</span>
                      <small>{t(`seller.businessScope.${scope}.description`)}</small>
                    </button>
                  ))}
                </div>

                <div className="seller-import-choice">
                  <button
                    type="button"
                    className={data.catalogSetupMode === "MANUAL" ? "is-selected" : ""}
                    onClick={() => update("catalogSetupMode", "MANUAL")}
                  >
                    <Check size={18} />
                    <span>
                      <strong>{t("seller.catalog.MANUAL")}</strong>
                      <small>{t("seller.catalog.manualDescription")}</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={data.catalogSetupMode === "ASK_MANAGED_IMPORT" ? "is-selected" : ""}
                    onClick={() => update("catalogSetupMode", "ASK_MANAGED_IMPORT")}
                  >
                    <FileUp size={18} />
                    <span>
                      <strong>{t("seller.catalog.ASK_MANAGED_IMPORT")}</strong>
                      <small>{t("seller.catalog.managedDescription", { catalog: t(`seller.businessScope.${data.businessScope}`) })}</small>
                    </span>
                  </button>
                </div>
                {data.catalogSetupMode === "ASK_MANAGED_IMPORT" && (
                  <div className="seller-managed-import-details">
                    <div className="fcw-flex fcw-items-start" style={{ gap: "0.5rem" }}>
                      <Info size={18} />
                      <div>
                        <strong>{t("seller.managedBenefitTitle")}</strong>
                        <p className="fcw-body-s">{t(data.businessScope === "BOTH" ? "seller.managedInfoBoth" : "seller.managedInfo")}</p>
                        <span className="fcw-label">{t("managedImport.priceEstimate")}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="seller-delivery-step">
                <div>
                  <h3>{t("seller.delivery.title")}</h3>
                  <p>{t("seller.delivery.description")}</p>
                </div>
                <div className="seller-delivery-options">
                  {([
                    ["NO_DELIVERY", PackageX],
                    ["SELECTED_CITIES", MapPin],
                    ["KAZAKHSTAN", Truck],
                    ["WORLDWIDE", Globe2],
                  ] as const).map(([coverage, Icon]) => (
                    <button
                      key={coverage}
                      type="button"
                      className={data.deliveryCoverage === coverage ? "is-selected" : ""}
                      onClick={() => update("deliveryCoverage", coverage)}
                    >
                      <Icon size={20} />
                      <span>{t(`seller.delivery.${coverage}`)}</span>
                    </button>
                  ))}
                </div>
                {data.deliveryCoverage === "SELECTED_CITIES" && (
                  <label className="fcw-flex-col" style={{ gap: "0.35rem" }}>
                    <span className="fcw-label">{t("seller.deliveryCities")}</span>
                    <input
                      className="fcw-input"
                      defaultValue={data.deliveryCities.join(", ")}
                      onChange={event => update("deliveryCities", event.target.value
                        .split(",")
                        .map(city => city.trim())
                        .filter(Boolean))}
                      placeholder={t("seller.deliveryCities.placeholder")}
                    />
                    <small className="fcw-body-xs fcw-text-tertiary">{t("seller.deliveryCities.description")}</small>
                  </label>
                )}
                <button
                  type="button"
                  className={`seller-pickup-option${data.pickupAvailable ? " is-selected" : ""}`}
                  onClick={() => setShowPickupModal(true)}
                >
                  <span className="seller-pickup-icon"><Store size={22} /></span>
                  <span>
                    <strong>{t("seller.pickup")}</strong>
                    <small>{t("seller.pickupDescription")}</small>
                  </span>
                  <span className="seller-pickup-status">
                    {data.pickupAvailable && <Check size={15} />}
                    {branchDrafts.length > 0
                      ? `${branchDrafts.length} ${t("business.branches").toLowerCase()}`
                      : t(data.pickupAvailable ? "seller.pickupEnabled" : "seller.pickupDisabled")}
                  </span>
                </button>
              </div>
            )}

            <AnimatePresence>
              {showPickupModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: "fixed", inset: 0, zIndex: 1000,
                    display: "flex", alignItems: "flex-start", justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.5)", overflow: "auto", padding: "2rem 1rem",
                  }}
                  onClick={() => setShowPickupModal(false)}
                >
                  <Card padding="lg" style={{ maxWidth: 640, width: "100%" }} onClick={e => e.stopPropagation()}>
                    <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
                      <div>
                        <h2 className="fcw-h3" style={{ margin: 0 }}>{t("seller.pickupBranchModal.title")}</h2>
                        <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.25rem 0 0 0" }}>
                          {t("seller.pickupBranchModal.description")}
                        </p>
                      </div>

                      {branchDrafts.length > 0 && (
                        <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                          {branchDrafts.map(draft => (
                            <div key={draft.id} style={{
                              display: "flex", alignItems: "center", gap: "0.5rem",
                              padding: "0.5rem 0.75rem",
                              backgroundColor: "var(--fcw-color-surface)",
                              border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                              borderRadius: "var(--fcw-radius-md)",
                            }}>
                              <MapPin size={16} style={{ color: "var(--fcw-color-primary)", flexShrink: 0 }} />
                              <span className="fcw-body fcw-weight-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {draft.name}
                              </span>
                              <span className="fcw-body-s fcw-text-secondary" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {[cities.find(c => c.id === draft.cityId)?.name, draft.address].filter(Boolean).join(", ") || "—"}
                              </span>
                              <div style={{ flex: 1 }} />
                              <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" style={{ color: "var(--fcw-color-error)" }}
                                onClick={() => removeBranchDraft(draft.id)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                        <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                          <label className="fcw-label">{t("business.branch.name")}</label>
                          <input className="fcw-input" placeholder={t("business.branch.namePlaceholder")}
                            value={draftForm.name}
                            onChange={e => setDraftForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                          <label className="fcw-label">{t("business.branch.location")}</label>
                          <MapLocationPicker
                            initialLat={draftForm.latitude ?? undefined}
                            initialLng={draftForm.longitude ?? undefined}
                            onChange={(latitude, longitude, address, cityName) => {
                              const cityId = cities.find(city =>
                                normalizeCityName(city.name) === normalizeCityName(cityName || "")
                              )?.id || "";
                              setDraftForm(f => ({ ...f, latitude, longitude, address: address || f.address, cityId: cityId || f.cityId }));
                            }}
                          />
                          {draftForm.address && (
                            <span className="fcw-body-s fcw-text-secondary">
                              {[cities.find(c => c.id === draftForm.cityId)?.name, draftForm.address].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </div>
                        <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                          <label className="fcw-label">{t("business.branch.addressDetails")}</label>
                          <input className="fcw-input" placeholder={t("business.branch.addressDetails")}
                            value={draftForm.addressDetails}
                            onChange={e => setDraftForm(f => ({ ...f, addressDetails: e.target.value }))} />
                        </div>
                        <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={addBranchDraft}
                          disabled={!draftForm.name.trim() || draftForm.latitude == null}>
                          <Plus size={14} />{t("seller.pickupBranchModal.addBranch")}
                        </button>
                      </div>

                      <div className="fcw-flex fcw-justify-end" style={{ gap: "0.5rem" }}>
                        <button className="fcw-btn fcw-btn-ghost" onClick={() => setShowPickupModal(false)}>
                          {t("business.cancel")}
                        </button>
                        <button className="fcw-btn fcw-btn-primary" onClick={() => setShowPickupModal(false)}>
                          {t("seller.pickupBranchModal.done")}
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {step === 4 && (
              <div className="seller-confirmation-step">
                <div className="seller-confirmation-summary">
                  <div>
                    <span>{t("seller.confirmation.business")}</span>
                    <strong>{data.businessName || t("seller.confirmation.notSpecified")}</strong>
                  </div>
                  <div>
                    <span>{t("seller.confirmation.catalog")}</span>
                    <strong>{t(`seller.businessScope.${data.businessScope}`)}</strong>
                  </div>
                  <div>
                    <span>{t("seller.confirmation.setup")}</span>
                    <strong>{t(`seller.catalog.${data.catalogSetupMode}`)}</strong>
                  </div>
                  <div>
                    <span>{t("seller.confirmation.delivery")}</span>
                    <strong>
                      {t(`seller.delivery.${data.deliveryCoverage}`)}
                      {data.deliveryCoverage === "SELECTED_CITIES" && data.deliveryCities.length > 0
                        ? `: ${data.deliveryCities.join(", ")}`
                        : ""}
                    </strong>
                  </div>
                  <div>
                    <span>{t("seller.confirmation.pickup")}</span>
                    <strong>{branchDrafts.length > 0
                      ? `${branchDrafts.length} ${t("business.branches").toLowerCase()}`
                      : t("seller.pickupDisabled")}</strong>
                  </div>
                </div>
                <label className="seller-confirmation-legal">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={event => setTermsAccepted(event.target.checked)}
                  />
                  <span>
                    <ShieldCheck size={20} />
                    <span>
                      <strong>{t("seller.confirmation.legalTitle")}</strong>
                      <small>{t("seller.confirmation.legalDescription")}</small>
                    </span>
                  </span>
                </label>
              </div>
            )}

            {error && <p className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>{error}</p>}
            <div className="fcw-flex-between">
              <button className="fcw-btn fcw-btn-ghost" disabled={step === 1} onClick={() => setStep(current => current - 1)}>
                <ChevronLeft size={16} />{t("seller.back")}
              </button>
              {step < 4 ? (
                <button className="fcw-btn fcw-btn-primary" onClick={goNext}>
                  {t("seller.next")}<ChevronRight size={16} />
                </button>
              ) : (
                <button className="fcw-btn fcw-btn-primary" disabled={busy || !termsAccepted} onClick={submit}>
                  <Check size={16} />{t("seller.complete")}
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
