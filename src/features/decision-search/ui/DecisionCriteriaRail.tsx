import { useTranslation } from "react-i18next";
import type { DecisionCriterionDto } from "../../../shared/api/dto";

type Props = {
  hardConstraints: DecisionCriterionDto[];
  preferences: DecisionCriterionDto[];
  relaxations: DecisionCriterionDto[];
  onRelax: (criterion: DecisionCriterionDto) => void;
  onChangeCriteria: () => void;
};

export function DecisionCriteriaRail({ hardConstraints, preferences, relaxations, onRelax, onChangeCriteria }: Props) {
  const { t } = useTranslation();
  const allCriteria = [...hardConstraints, ...preferences];

  return (
    <aside className="decision-criteria-rail">
      <section className="decision-criteria-rail__section">
        <h3>{t("decision.important")}</h3>
        {allCriteria.length === 0 && <p className="decision-criteria-rail__empty">—</p>}
        <ul className="decision-criteria-rail__list">
          {allCriteria.map(c => (
            <li key={c.key} className="decision-criteria-rail__item">
              <span className="decision-criteria-rail__marker" data-status="active" />
              <div className="decision-criteria-rail__criterion">
                <span className="decision-criteria-rail__criterion-label">
                  {c.values.length > 0 ? c.values.join(", ") : c.label}
                </span>
                {c.unit && <span className="decision-criteria-rail__criterion-unit">{c.unit}</span>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {relaxations.length > 0 && (
        <section className="decision-criteria-rail__section">
          <h3>{t("decision.relax")}</h3>
          <ul className="decision-criteria-rail__list">
            {relaxations.map(c => (
              <li key={c.key} className="decision-criteria-rail__item is-relaxable">
                <button type="button" onClick={() => onRelax(c)}>
                  <span className="decision-criteria-rail__criterion-label">
                    {c.values.length > 0 ? c.values.join(", ") : c.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button type="button" className="decision-criteria-rail__edit ask-secondary-button" onClick={onChangeCriteria}>
        {t("decision.changeCriteria")}
      </button>
    </aside>
  );
}
