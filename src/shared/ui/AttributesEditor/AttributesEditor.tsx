import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type AttributeRow = {
  id: string;
  key: string;
  value: string;
};

type AttributesEditorProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

function readRows(value: string): AttributeRow[] {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return [];
    return Object.entries(parsed).map(([key, entryValue], index) => ({
      id: `${key}-${index}`,
      key,
      value: typeof entryValue === "string" ? entryValue : JSON.stringify(entryValue),
    }));
  } catch {
    return [];
  }
}

function readValue(value: string): unknown {
  const normalized = value.trim();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  if (/^-?\d+([.,]\d+)?$/.test(normalized)) return Number(normalized.replace(",", "."));
  return value;
}

function writeRows(rows: AttributeRow[]) {
  const entries = rows
    .filter(row => row.key.trim())
    .map(row => [row.key.trim(), readValue(row.value)] as const);
  return entries.length > 0 ? JSON.stringify(Object.fromEntries(entries), null, 2) : "";
}

export function AttributesEditor({ value, onChange, label = "Дополнительные характеристики" }: AttributesEditorProps) {
  const parsedRows = useMemo(() => readRows(value), [value]);
  const [rows, setRows] = useState<AttributeRow[]>(parsedRows);

  useEffect(() => {
    if (writeRows(rows) !== writeRows(parsedRows)) setRows(parsedRows);
  }, [parsedRows]);

  const update = (nextRows: AttributeRow[]) => {
    setRows(nextRows);
    onChange(writeRows(nextRows));
  };

  return (
    <div className="ask-attributes-editor">
      <div className="ask-attributes-editor__header">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => setRows(current => [...current, { id: `attribute-${Date.now()}`, key: "", value: "" }])}
        >
          <Plus size={15} />
          Добавить
        </button>
      </div>

      {rows.length === 0 && (
        <button
          type="button"
          className="ask-attributes-editor__empty"
          onClick={() => setRows([{ id: `attribute-${Date.now()}`, key: "", value: "" }])}
        >
          Добавьте цвет, размер, материал или другую характеристику
        </button>
      )}

      {rows.map((row, index) => (
        <div className="ask-attributes-editor__row" key={row.id}>
          <input
            className="ask-field"
            value={row.key}
            placeholder="Характеристика"
            onChange={event => update(rows.map((item, rowIndex) => (
              rowIndex === index ? { ...item, key: event.target.value } : item
            )))}
          />
          <input
            className="ask-field"
            value={row.value}
            placeholder="Значение"
            onChange={event => update(rows.map((item, rowIndex) => (
              rowIndex === index ? { ...item, value: event.target.value } : item
            )))}
          />
          <button type="button" onClick={() => update(rows.filter((_, rowIndex) => rowIndex !== index))} aria-label="Удалить характеристику">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
