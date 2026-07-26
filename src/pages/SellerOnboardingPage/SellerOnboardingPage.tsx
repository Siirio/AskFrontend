import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Briefcase, Check, ChevronLeft, ChevronRight, FileUp, Handshake, Info, Package, ShieldCheck } from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { buildRoute, ROUTES } from "../../app/routes";
import { acceptLegalDocuments } from "../../shared/api/legalClient";
import {
  completeSellerOnboarding,
  type SellerOnboardingData,
} from "../../shared/api/sellerOnboardingClient";
import { Card } from "../../shared/ui/Card/Card";
import { CategoryAutocomplete } from "../../shared/ui/CategoryAutocomplete/CategoryAutocomplete";
import { Loading } from "../../shared/ui/Loading/Loading";
import { hasValidBusinessVerificationSource, isValidHttpUrl } from "../../shared/utils/validation";

const DRAFT_KEY = "ask.sellerOnboardingDraft";
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

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  }, [data]);

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
      await actions.refreshSession();
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
              {step < 3 ? (
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
