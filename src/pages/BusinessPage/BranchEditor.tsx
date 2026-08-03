import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import MapLocationPicker from "../../widgets/MapLocationPicker/MapLocationPicker";
import { EditorDisclosure, EditorProgress, EditorSection, EntityEditor } from "../../shared/ui/EntityEditor/EntityEditor";
import type { BranchFormState } from "./types";

type BranchEditorProps = {
  open: boolean;
  form: BranchFormState;
  cities: Array<{ id: string; name: string }>;
  onChange: Dispatch<SetStateAction<BranchFormState>>;
  onClose: () => void;
  onCreate: () => Promise<void>;
  t: (key: string, params?: Record<string, unknown>) => string;
};

const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export function BranchEditor({ open, form, cities, onChange, onClose, onCreate, t }: BranchEditorProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const addressReady = Boolean(form.name.trim() && form.address && (form.cityId || form.cityName) && form.latitude != null && form.longitude != null);
  const resolvedAddress = [form.cityName || cities.find(city => city.id === form.cityId)?.name, form.address].filter(Boolean).join(", ");

  const footer = step === 0 ? (
    <>
      <button className="fcw-btn fcw-btn-secondary" onClick={onClose}>{t("business.cancel")}</button>
      <button className="fcw-btn fcw-btn-primary" onClick={() => setStep(1)} disabled={!addressReady}>
        {t("business.continue")}<ArrowRight size={16} />
      </button>
    </>
  ) : (
    <>
      <button className="fcw-btn fcw-btn-secondary" onClick={() => setStep(0)}><ArrowLeft size={16} />{t("business.back")}</button>
      <button className="fcw-btn fcw-btn-primary" onClick={onCreate} disabled={!addressReady}>
        <Check size={16} />{t("business.branch.add")}
      </button>
    </>
  );

  return (
    <EntityEditor
      open={open}
      variant="workspace"
      eyebrow={t("business.branches")}
      title={t("business.branch.add")}
      description={t("business.branch.editorDescription")}
      onClose={onClose}
      closeLabel={t("business.cancel")}
      footer={footer}
    >
      <EditorProgress steps={[t("business.branch.stepAddress"), t("business.branch.stepHours")]} current={step} />
      {step === 0 ? (
        <EditorSection title={t("business.branch.locationTitle")} description={t("business.branch.locationDescription")}>
          <div className="ask-editor-field">
            <label className="ask-editor-required">{t("business.branch.name")}</label>
            <input className="fcw-input" autoFocus placeholder={t("business.branch.namePlaceholder")} value={form.name} onChange={event => onChange(current => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="ask-editor-field">
            <label className="ask-editor-required">{t("business.branch.location")}</label>
            <MapLocationPicker
              initialLat={form.latitude ?? undefined}
              initialLng={form.longitude ?? undefined}
              onChange={(latitude, longitude, address, cityName) => {
                onChange(current => ({
                  ...current,
                  latitude,
                  longitude,
                  address: address || current.address,
                  cityId: "",
                  cityName: cityName || "",
                }));
              }}
            />
            {resolvedAddress && <div className="ask-editor-location-result"><strong>{t("business.branch.selectedAddress")}</strong><span>{resolvedAddress}</span></div>}
          </div>
          <div className="ask-editor-field">
            <label>{t("business.branch.addressDetails")}</label>
            <input className="fcw-input" placeholder={t("business.branch.addressDetails")} value={form.addressDetails} onChange={event => onChange(current => ({ ...current, addressDetails: event.target.value }))} />
          </div>
        </EditorSection>
      ) : (
        <>
          <EditorSection title={t("business.branch.hoursTitle")} description={t("business.branch.hoursDescription")}>
            <div className="ask-editor-field" style={{ maxWidth: 340 }}>
              <label>{t("business.branch.timeZoneId")}</label>
              <input type="text" className="fcw-input" placeholder={t("business.branch.timeZonePlaceholder")} value={form.timeZoneId} onChange={event => onChange(current => ({ ...current, timeZoneId: event.target.value }))} />
            </div>
            <div className="ask-editor-hours">
              {form.weeklyHours.map((hours, index) => (
                <div className="ask-editor-hours__row" key={`${hours.dayOfWeek}-${index}`}>
                  <select className="fcw-input" value={hours.dayOfWeek} onChange={event => onChange(current => ({ ...current, weeklyHours: current.weeklyHours.map((row, rowIndex) => rowIndex === index ? { ...row, dayOfWeek: event.target.value } : row) }))}>
                    <option value="">—</option>
                    {days.map(day => <option key={day} value={day}>{t(`business.branch.day.${day.toLowerCase()}`)}</option>)}
                  </select>
                  <input type="time" className="fcw-input" value={hours.opensAt} aria-label={t("business.branch.opensAt")} onChange={event => onChange(current => ({ ...current, weeklyHours: current.weeklyHours.map((row, rowIndex) => rowIndex === index ? { ...row, opensAt: event.target.value } : row) }))} />
                  <span>—</span>
                  <input type="time" className="fcw-input" value={hours.closesAt} aria-label={t("business.branch.closesAt")} onChange={event => onChange(current => ({ ...current, weeklyHours: current.weeklyHours.map((row, rowIndex) => rowIndex === index ? { ...row, closesAt: event.target.value } : row) }))} />
                  <button type="button" className="fcw-btn fcw-btn-ghost fcw-btn-icon" aria-label={t("business.deleteAria")} onClick={() => onChange(current => ({ ...current, weeklyHours: current.weeklyHours.filter((_, rowIndex) => rowIndex !== index) }))}><Trash2 size={15} /></button>
                </div>
              ))}
              <button type="button" className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => onChange(current => ({ ...current, weeklyHours: [...current.weeklyHours, { dayOfWeek: "", opensAt: "", closesAt: "" }] }))}>
                <Plus size={15} />{t("business.branch.addHoursRow")}
              </button>
            </div>
          </EditorSection>
          <EditorSection title={t("seller.pickup")} description={t("seller.pickupDescription")}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.pickupAvailable}
                onChange={event => onChange(current => ({ ...current, pickupAvailable: event.target.checked }))}
              />
              <span>{t("business.branch.pickupAvailable")}</span>
            </label>
          </EditorSection>
          <EditorDisclosure title={t("business.branch.specialHours")} description={t("business.branch.specialHoursDescription")}>
            <div className="ask-editor-hours">
              {form.specialHours.map((hours, index) => (
                <div className="ask-editor-special-hours" key={`${hours.date}-${index}`}>
                  <input type="date" className="fcw-input" value={hours.date} onChange={event => onChange(current => ({ ...current, specialHours: current.specialHours.map((row, rowIndex) => rowIndex === index ? { ...row, date: event.target.value } : row) }))} />
                  <label>
                    <input type="checkbox" checked={hours.closed} onChange={event => onChange(current => ({ ...current, specialHours: current.specialHours.map((row, rowIndex) => rowIndex === index ? { ...row, closed: event.target.checked } : row) }))} />
                    {t("business.branch.closedAllDay")}
                  </label>
                  {!hours.closed && (
                    <>
                      <input type="time" className="fcw-input" value={hours.opensAt} onChange={event => onChange(current => ({ ...current, specialHours: current.specialHours.map((row, rowIndex) => rowIndex === index ? { ...row, opensAt: event.target.value } : row) }))} />
                      <input type="time" className="fcw-input" value={hours.closesAt} onChange={event => onChange(current => ({ ...current, specialHours: current.specialHours.map((row, rowIndex) => rowIndex === index ? { ...row, closesAt: event.target.value } : row) }))} />
                    </>
                  )}
                  <button type="button" className="fcw-btn fcw-btn-ghost fcw-btn-icon" aria-label={t("business.deleteAria")} onClick={() => onChange(current => ({ ...current, specialHours: current.specialHours.filter((_, rowIndex) => rowIndex !== index) }))}><Trash2 size={15} /></button>
                </div>
              ))}
              <button type="button" className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => onChange(current => ({ ...current, specialHours: [...current.specialHours, { date: "", closed: false, opensAt: "", closesAt: "" }] }))}>
                <Plus size={15} />{t("business.branch.addHoursRow")}
              </button>
            </div>
          </EditorDisclosure>
          <div className="ask-editor-summary" style={{ marginTop: 24 }}>
            <div><small>{t("business.branch.name")}</small><strong>{form.name}</strong></div>
            <div><small>{t("business.branch.address")}</small><strong>{resolvedAddress}</strong></div>
          </div>
        </>
      )}
    </EntityEditor>
  );
}
