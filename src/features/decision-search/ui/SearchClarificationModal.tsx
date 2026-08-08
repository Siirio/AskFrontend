import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../../../shared/ui/Modal/Modal";
import type { ClarificationFieldDto, DecisionContextDto } from "../../../shared/api/dto";

type Props = {
  open: boolean;
  onClose: () => void;
  fields: ClarificationFieldDto[];
  prefilledContext?: DecisionContextDto | null;
  mode: "ITEM" | "SERVICE";
  onSubmit: (context: DecisionContextDto) => void;
  onSkip: () => void;
};

export function SearchClarificationModal({ open, onClose, fields, prefilledContext, mode, onSubmit, onSkip }: Props) {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [customText, setCustomText] = useState("");
  const visibleFields = fields.slice(0, 4);

  const setAnswer = useCallback((fieldId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleSubmit = () => {
    const hardConstraints: import("../../../shared/api/dto").DecisionCriterionDto[] = [];
    const preferences: import("../../../shared/api/dto").DecisionCriterionDto[] = [];

    visibleFields.forEach(f => {
      const answer = answers[f.id];
      if (!answer || (Array.isArray(answer) && answer.length === 0)) return;
      const criterion = {
        key: f.criterionKey,
        label: f.label,
        operator: f.type === "RANGE" ? "BETWEEN" : "EQ",
        values: Array.isArray(answer) ? answer : [answer],
      };
      if (f.required) {
        hardConstraints.push(criterion);
      } else {
        preferences.push(criterion);
      }
    });

    onSubmit({
      hardConstraints,
      preferences,
      useCases: prefilledContext?.useCases ?? [],
      exclusions: prefilledContext?.exclusions ?? [],
      customText: customText.trim() || undefined,
    });
  };

  const handleSkip = () => {
    onSkip();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={t("clarification.title")} size="md">
      <div className="clarification-modal">
        <p className="clarification-modal__subtitle">
          {mode === "SERVICE" ? t("clarification.subtitleService") : t("clarification.subtitle")}
        </p>

        <div className="clarification-modal__fields">
          {visibleFields.map(field => (
            <div key={field.id} className="clarification-modal__field">
              <label className="clarification-modal__field-label">
                {field.label}
                {field.required && <span className="clarification-modal__required">*</span>}
              </label>

              {field.type === "RANGE" && (
                <div className="clarification-modal__range">
                  <input
                    type="range"
                    min={field.min ?? 0}
                    max={field.max ?? 100}
                    value={typeof answers[field.id] === "string" ? answers[field.id] as string : field.min ?? 0}
                    onChange={e => setAnswer(field.id, e.target.value)}
                  />
                  <span className="clarification-modal__range-value">
                    {typeof answers[field.id] === "string" ? answers[field.id] : field.min ?? 0}
                    {field.unit ? ` ${field.unit}` : ""}
                  </span>
                </div>
              )}

              {field.type === "SINGLE_SELECT" && (
                <div className="clarification-modal__pills">
                  {field.options.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      className={`clarification-modal__pill${answers[field.id] === opt ? " is-active" : ""}`}
                      onClick={() => setAnswer(field.id, opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {field.type === "MULTI_SELECT" && (
                <div className="clarification-modal__chips">
                  {field.options.map(opt => {
                    const selected = Array.isArray(answers[field.id]) ? (answers[field.id] as string[]) : [];
                    const active = selected.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={`clarification-modal__chip${active ? " is-active" : ""}`}
                        onClick={() => {
                          if (active) {
                            setAnswer(field.id, selected.filter(v => v !== opt));
                          } else {
                            setAnswer(field.id, [...selected, opt]);
                          }
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="clarification-modal__custom">
          <label className="clarification-modal__field-label">
            {t("clarification.whatElse")}
            <span className="clarification-modal__hint">{t("clarification.whatElseHint")}</span>
          </label>
          <textarea
            className="clarification-modal__custom-input"
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            placeholder={mode === "SERVICE" ? t("clarification.whatElsePlaceholderService") : t("clarification.whatElsePlaceholderItem")}
            rows={3}
            maxLength={500}
          />
          <span className="clarification-modal__char-count">{customText.length}/500</span>
        </div>

        <div className="clarification-modal__actions">
          <button type="button" className="ask-secondary-button" onClick={handleSkip}>
            {t("clarification.skip")}
          </button>
          <button type="button" className="ask-primary-button" onClick={handleSubmit}>
            {t("clarification.submit")}
          </button>
        </div>
        <p className="clarification-modal__skip-hint">{t("clarification.skipHint")}</p>
      </div>
    </Modal>
  );
}
