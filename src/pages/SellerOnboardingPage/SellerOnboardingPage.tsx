import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { buildRoute, ROUTES } from "../../app/routes";
import { listCities } from "../../shared/api/askClient";
import {
  completeSellerOnboarding,
  type SellerOnboardingData,
} from "../../shared/api/sellerOnboardingClient";
import { Card } from "../../shared/ui/Card/Card";
import { Loading } from "../../shared/ui/Loading/Loading";

const DRAFT_KEY = "ask.sellerOnboardingDraft";
const SOURCE_TYPES = [
  "TELEGRAM", "INSTAGRAM", "KASPI", "OZON", "WEBSITE", "EXCEL",
  "CSV", "PDF", "MARKDOWN", "TXT", "NOTES", "OTHER",
];

const INITIAL_DATA: SellerOnboardingData = {
  businessName: "",
  countryCode: "KZ",
  legalForm: "KZ_IP",
  legalIdentifier: "",
  legalName: "",
  preferredContactChannel: "WHATSAPP",
  preferredContactValue: "",
  pickupAvailable: false,
  deliveryScope: "NO_DELIVERY",
  selectedCityIds: [],
  deliveryTermsRu: "",
  deliveryTermsKk: "",
  deliveryTermsEn: "",
  catalogSetupMode: "MANUAL",
  catalogSources: [],
  sourceLinks: "",
  sourceNotes: "",
  locale: "ru",
  legalAccepted: false,
};

function readDraft(): SellerOnboardingData {
  try {
    const draft = sessionStorage.getItem(DRAFT_KEY);
    return draft ? { ...INITIAL_DATA, ...JSON.parse(draft) } : INITIAL_DATA;
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
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    listCities().then(setCities).catch(() => setCities([]));
  }, []);

  if (!state.sessionReady) {
    return <Loading />;
  }

  if (!state.authenticated) {
    return <Navigate to={ROUTES.auth} replace />;
  }

  const update = <K extends keyof SellerOnboardingData>(
    key: K,
    value: SellerOnboardingData[K],
  ) => setData(current => ({ ...current, [key]: value }));

  const toggleSource = (source: string) => {
    update("catalogSources", data.catalogSources.includes(source)
      ? data.catalogSources.filter(item => item !== source)
      : [...data.catalogSources, source]);
  };

  const toggleCity = (cityId: string) => {
    update("selectedCityIds", data.selectedCityIds.includes(cityId)
      ? data.selectedCityIds.filter(item => item !== cityId)
      : [...data.selectedCityIds, cityId]);
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await completeSellerOnboarding({
        ...data,
        locale: i18n.resolvedLanguage?.split("-")[0] ?? "ru",
      });
      sessionStorage.removeItem(DRAFT_KEY);
      await actions.refreshSession();
      const businessRoute = buildRoute(ROUTES.business, { businessId: result.businessId });
      navigate(result.startRoute === "MANAGED_IMPORT" && result.conversationId
        ? `${businessRoute}?conversationId=${encodeURIComponent(result.conversationId)}`
        : businessRoute);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("seller.error"));
    } finally {
      setBusy(false);
    }
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
                <select className="fcw-input" value={data.legalForm} onChange={event => update("legalForm", event.target.value as SellerOnboardingData["legalForm"])}>
                  <option value="KZ_IP">{t("seller.legalForm.KZ_IP")}</option>
                  <option value="KZ_TOO">{t("seller.legalForm.KZ_TOO")}</option>
                  <option value="NONE">{t("seller.legalForm.NONE")}</option>
                </select>
                {data.legalForm !== "NONE" && (
                  <>
                    <input className="fcw-input" value={data.legalIdentifier} onChange={event => update("legalIdentifier", event.target.value)} placeholder={data.legalForm === "KZ_IP" ? t("seller.iin") : t("seller.bin")} />
                    <input className="fcw-input" value={data.legalName} onChange={event => update("legalName", event.target.value)} placeholder={data.legalForm === "KZ_IP" ? t("seller.ipName") : t("seller.tooName")} />
                  </>
                )}
                <select className="fcw-input" value={data.preferredContactChannel} onChange={event => update("preferredContactChannel", event.target.value as SellerOnboardingData["preferredContactChannel"])}>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="TELEGRAM">Telegram</option>
                  <option value="EMAIL">Email</option>
                </select>
                <input
                  className="fcw-input"
                  value={data.preferredContactValue}
                  onChange={event => update("preferredContactValue", event.target.value)}
                  placeholder={t(`seller.contactValue.${data.preferredContactChannel}`)}
                />
              </div>
            )}

            {step === 2 && (
              <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                <label className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                  <input type="checkbox" checked={data.pickupAvailable} onChange={event => update("pickupAvailable", event.target.checked)} />
                  {t("seller.pickup")}
                </label>
                <select className="fcw-input" value={data.deliveryScope} onChange={event => update("deliveryScope", event.target.value as SellerOnboardingData["deliveryScope"])}>
                  {["NO_DELIVERY", "SELECTED_CITIES", "KAZAKHSTAN", "WORLDWIDE", "CONTACT_SELLER"].map(scope => (
                    <option key={scope} value={scope}>{t(`seller.delivery.${scope}`)}</option>
                  ))}
                </select>
                {data.deliveryScope === "SELECTED_CITIES" && (
                  <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                    {cities.map(city => (
                      <label key={city.id} className="fcw-btn fcw-btn-secondary fcw-btn-sm">
                        <input type="checkbox" checked={data.selectedCityIds.includes(city.id)} onChange={() => toggleCity(city.id)} />
                        {city.name}
                      </label>
                    ))}
                  </div>
                )}
                <textarea className="fcw-input" value={data.deliveryTermsRu} onChange={event => update("deliveryTermsRu", event.target.value)} placeholder={t("seller.deliveryTerms")} rows={4} />
              </div>
            )}

            {step === 3 && (
              <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                <label className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                  <input type="radio" checked={data.catalogSetupMode === "MANUAL"} onChange={() => update("catalogSetupMode", "MANUAL")} />
                  {t("seller.catalog.MANUAL")}
                </label>
                <label className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                  <input type="radio" checked={data.catalogSetupMode === "ASK_MANAGED_IMPORT"} onChange={() => update("catalogSetupMode", "ASK_MANAGED_IMPORT")} />
                  {t("seller.catalog.ASK_MANAGED_IMPORT")}
                </label>
                {data.catalogSetupMode === "ASK_MANAGED_IMPORT" && (
                  <>
                    <div className="fcw-flex fcw-items-start fcw-radius-md" style={{ gap: "0.5rem", padding: "0.75rem", background: "var(--fcw-color-surface-secondary)" }}>
                      <Info size={18} />
                      <p className="fcw-body-s">{t("seller.managedInfo")}</p>
                    </div>
                    <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                      {SOURCE_TYPES.map(source => (
                        <label key={source} className="fcw-btn fcw-btn-secondary fcw-btn-sm">
                          <input type="checkbox" checked={data.catalogSources.includes(source)} onChange={() => toggleSource(source)} />
                          {source}
                        </label>
                      ))}
                    </div>
                    <textarea className="fcw-input" value={data.sourceLinks} onChange={event => update("sourceLinks", event.target.value)} placeholder={t("seller.sourceLinks")} rows={3} />
                    <textarea className="fcw-input" value={data.sourceNotes} onChange={event => update("sourceNotes", event.target.value)} placeholder={t("seller.sourceNotes")} rows={3} />
                  </>
                )}
              </div>
            )}

            {step === 4 && (
              <label className="fcw-flex fcw-items-start" style={{ gap: "0.5rem" }}>
                <input type="checkbox" checked={data.legalAccepted} onChange={event => update("legalAccepted", event.target.checked)} />
                <span className="fcw-body-s">
                  {t("seller.legal")}{" "}
                  <a href="/legal/user-terms">{t("auth.legal.userTerms")}</a>,{" "}
                  <a href="/legal/privacy">{t("auth.legal.privacy")}</a>,{" "}
                  <a href="/legal/seller-terms">{t("seller.sellerTerms")}</a>
                  {data.catalogSetupMode === "ASK_MANAGED_IMPORT" && (
                    <> {t("auth.legal.and")} <a href="/legal/import-service">{t("seller.importTerms")}</a></>
                  )}
                </span>
              </label>
            )}

            {error && <p className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>{error}</p>}
            <div className="fcw-flex-between">
              <button className="fcw-btn fcw-btn-ghost" disabled={step === 1} onClick={() => setStep(current => current - 1)}>
                <ChevronLeft size={16} />{t("seller.back")}
              </button>
              {step < 4 ? (
                <button className="fcw-btn fcw-btn-primary" onClick={() => setStep(current => current + 1)}>
                  {t("seller.next")}<ChevronRight size={16} />
                </button>
              ) : (
                <button className="fcw-btn fcw-btn-primary" disabled={!data.legalAccepted || busy} onClick={submit}>
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
