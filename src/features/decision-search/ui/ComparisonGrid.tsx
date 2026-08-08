import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import type { CompareItemDto, CompareGroupDto } from "../../../shared/api/dto";

type Props = {
  items: CompareItemDto[];
  groups: CompareGroupDto[];
  onlyDifferences: boolean;
  onRemove: (resultId: string) => void;
};

function cellClass(status: string): string {
  switch (status) {
    case "BEST": return "comparison-grid__cell is-best";
    case "PARTIAL": return "comparison-grid__cell is-partial";
    case "FAIL": return "comparison-grid__cell is-fail";
    default: return "comparison-grid__cell is-unknown";
  }
}

export function ComparisonGrid({ items, groups, onlyDifferences, onRemove }: Props) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const visibleGroups = onlyDifferences
    ? groups.filter(g => g.rows.some(r => r.isDifferent))
    : groups;

  return (
    <div className="comparison-grid__wrapper">
      <div className="comparison-grid" style={{ gridTemplateColumns: `200px repeat(${items.length}, minmax(140px, 1fr))` }}>
        <div className="comparison-grid__corner" />

        {items.map(item => (
          <div key={item.resultId} className="comparison-grid__header">
            <button
              type="button"
              className="comparison-grid__remove-btn"
              onClick={() => onRemove(item.resultId)}
              aria-label={`Убрать ${item.title}`}
            >
              <X size={14} />
            </button>
            {item.image && (
              <img className="comparison-grid__header-img" src={item.image} alt={item.title} loading="lazy" />
            )}
            <span className="comparison-grid__header-title">{item.title}</span>
            {item.price != null && (
              <span className="comparison-grid__header-price">
                {new Intl.NumberFormat("ru-KZ").format(item.price)} {item.currency === "KZT" || !item.currency ? "₸" : item.currency}
              </span>
            )}
            {item.verdict && <span className="comparison-grid__header-verdict">{item.verdict}</span>}
          </div>
        ))}

        {visibleGroups.map(group => {
          const isCollapsed = collapsed[group.key] ?? false;
          const visibleRows = onlyDifferences
            ? group.rows.filter(r => r.isDifferent)
            : group.rows;

          return (
            <div key={group.key} className="comparison-grid__group" style={{ display: "contents" }}>
              <button
                type="button"
                className="comparison-grid__group-label"
                onClick={() => toggleGroup(group.key)}
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                {group.label}
              </button>
              {items.map((_, i) => (
                <div key={i} className="comparison-grid__group-spacer" />
              ))}

              {!isCollapsed && visibleRows.map(row => (
                <div key={row.key} className="comparison-grid__row" style={{ display: "contents" }}>
                  <div className="comparison-grid__row-label">{row.label}</div>
                  {items.map(item => {
                    const val = row.values.find(v => v.resultId === item.resultId);
                    return (
                      <div key={item.resultId} className={cellClass(val?.status ?? "UNKNOWN")}>
                        {val?.value || t("comparison.noData")}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
