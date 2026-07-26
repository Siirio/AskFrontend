import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, FileSpreadsheet, FileText, Loader2, PackageCheck, Upload } from "lucide-react";
import { Card } from "../../shared/ui/Card/Card";
import { Select } from "../../shared/ui/Select/Select";
import { ApiError } from "../../shared/api/httpClient";
import {
  approveAutodumpDraft,
  approveProductImport,
  getAutodumpSession,
  mapProductImport,
  publishAutodumpSession,
  rejectAutodumpDraft,
  uploadProductImport,
  type AutodumpDraftDto,
  type ProductImportMappingEntry,
  type ProductImportPreviewResponse,
  type ProductImportTargetField,
  type ProductImportUploadResponse,
} from "../../shared/api/askClient";

type ImportStep = "upload" | "mapping" | "preview";
type ImportMode = "table" | "autodump";

interface BranchOption {
  id: string;
  name: string;
}

interface ProductImportWizardProps {
  businessId: string;
  branches: BranchOption[];
  activeBranchId: string;
  onBranchChange: (branchId: string) => void;
  onBackToProducts: () => void;
  onImported: () => void;
  importMode: "ITEM" | "SERVICE";
  allowAiTools: boolean;
}

const PRODUCT_FIELD_OPTIONS: { value: ProductImportTargetField; label: string }[] = [
  { value: "IGNORE", label: "Игнорировать" },
  { value: "NAME", label: "Название товара" },
  { value: "CATEGORY_LABEL", label: "Категория" },
  { value: "SKU", label: "SKU / код" },
  { value: "PRICE", label: "Цена" },
  { value: "DESCRIPTION", label: "Описание" },
  { value: "TAGS", label: "Теги" },
  { value: "APPEND_TO_DESCRIPTION", label: "Добавить в описание" },
  { value: "CHARACTERISTIC", label: "Сделать характеристикой" },
];

const SERVICE_FIELD_OPTIONS: { value: ProductImportTargetField; label: string }[] = [
  { value: "IGNORE", label: "Игнорировать" },
  { value: "NAME", label: "Название услуги" },
  { value: "CATEGORY_LABEL", label: "Категория" },
  { value: "PRICE", label: "Базовая цена" },
  { value: "DESCRIPTION", label: "Описание" },
  { value: "TAGS", label: "Теги" },
  { value: "APPEND_TO_DESCRIPTION", label: "Добавить в описание" },
  { value: "CHARACTERISTIC", label: "Сделать характеристикой" },
];

const PRODUCT_RECOMMENDED_COLUMNS = [
  ["Название товара", "Наименование, Название, Товар, Name, Product"],
  ["Категория", "Категория товара, Группа, Category"],
  ["Артикул / код товара", "SKU, ШК, Код, Арт, Article, Barcode"],
  ["Цена", "Цена продажи, Розница, Стоимость, Price"],
  ["Описание", "Описание товара, Description"],
  ["Теги", "Метки, Tags"],
];

const SERVICE_RECOMMENDED_COLUMNS = [
  ["Название услуги", "Наименование, Название, Услуга, Name, Service"],
  ["Категория", "Категория услуги, Группа, Category"],
  ["Базовая цена", "Цена, Стоимость, Base Price, Price"],
  ["Длительность", "Время выполнения, Длительность, Duration, Minutes"],
  ["Описание", "Описание услуги, Сценарий, Description"],
  ["Теги", "Метки, Tags"],
];

const PRODUCT_DEMO_TABLE_ROWS = [
  ["Optimum Nutrition Предтреник 60 капсул", "Спортивное питание", "ON-001", "15 900", "Энергия перед тренировкой, 60 капсул", "спорт; предтрен"],
  ["Maxler Whey Protein 900 г", "Спортивное питание", "MX-014", "24 900", "Сывороточный протеин, ваниль", "протеин; фитнес"],
];

const SERVICE_DEMO_TABLE_ROWS = [
  ["Стрижка мужская", "Парикмахерские услуги", "5 000", "30 мин", "Классическая мужская стрижка с мытьём головы", "стрижка; мужской зал"],
  ["Маникюр с покрытием", "Ногтевой сервис", "12 000", "90 мин", "Аппаратный маникюр + гель-лак", "маникюр; гель-лак"],
];

function getDemoTableRows(mode: "ITEM" | "SERVICE") {
  return mode === "ITEM" ? PRODUCT_DEMO_TABLE_ROWS : SERVICE_DEMO_TABLE_ROWS;
}

function isAutodumpFile(file: File) {
  return /\.(txt|md|pdf)$/i.test(file.name);
}

function getFieldOptions(mode: "ITEM" | "SERVICE") {
  return mode === "ITEM" ? PRODUCT_FIELD_OPTIONS : SERVICE_FIELD_OPTIONS;
}

function getRecommendedColumns(mode: "ITEM" | "SERVICE") {
  return mode === "ITEM" ? PRODUCT_RECOMMENDED_COLUMNS : SERVICE_RECOMMENDED_COLUMNS;
}

function normalizeUploadResponse(value: ProductImportUploadResponse | { sessionId?: string; status?: string; draftsCreated?: number }) {
  return value as ProductImportUploadResponse & { sessionId?: string };
}

function fieldLabel(field: ProductImportTargetField, mode: "ITEM" | "SERVICE") {
  return getFieldOptions(mode).find(option => option.value === field)?.label || field;
}

function rowTitle(row: ProductImportPreviewResponse["rows"][number]) {
  return row.normalizedData.NAME || row.normalizedData.SKU || `Строка ${row.rowNumber}`;
}

function draftTitle(draft: AutodumpDraftDto) {
  return draft.normalizedTitle || draft.title || "Без названия";
}

export function ProductImportWizard({ businessId, branches, activeBranchId, onBranchChange, onBackToProducts, onImported, importMode, allowAiTools }: ProductImportWizardProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [fileMode, setFileMode] = useState<ImportMode>("table");
  const [file, setFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<ProductImportUploadResponse | null>(null);
  const [mappings, setMappings] = useState<ProductImportMappingEntry[]>([]);
  const [preview, setPreview] = useState<ProductImportPreviewResponse | null>(null);
  const [drafts, setDrafts] = useState<AutodumpDraftDto[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const isProduct = importMode === "ITEM";
  const itemLabel = isProduct ? "товар" : "услуга";
  const itemLabelPlural = isProduct ? "товаров" : "услуг";
  const itemLabelAccusative = isProduct ? "товары" : "услуги";
  const branchName = branches.find(branch => branch.id === activeBranchId)?.name || "Весь бизнес";
  const nameMapped = mappings.some(mapping => mapping.targetField === "NAME");
  const characteristics = mappings.filter(mapping => mapping.targetField === "CHARACTERISTIC");
  const ignored = mappings.filter(mapping => mapping.targetField === "IGNORE");

  const sampleByColumn = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const row of upload?.sampleRows || []) {
      for (const [key, value] of Object.entries(row)) {
        if (!result[key]) result[key] = [];
        if (value && result[key].length < 3) result[key].push(value);
      }
    }
    return result;
  }, [upload]);

  const reset = () => {
    setStep("upload");
    setFileMode("table");
    setFile(null);
    setUpload(null);
    setMappings([]);
    setPreview(null);
    setDrafts([]);
    setSessionId("");
    setMessage("");
  };

  const setSelectedFile = (nextFile: File) => {
    const allowed = allowAiTools
      ? /\.(xlsx|txt|md|pdf)$/i.test(nextFile.name)
      : /\.xlsx$/i.test(nextFile.name);
    if (!allowed) {
      setFile(null);
      setMessage(allowAiTools
        ? "Поддерживаются Excel, TXT, MD и PDF"
        : "Для бизнес-кабинета доступен только импорт Excel");
      return;
    }
    setFile(nextFile);
    setMessage("");
    setFileMode(isAutodumpFile(nextFile) ? "autodump" : "table");
  };

  const uploadFile = async (nextFile = file) => {
    if (!nextFile || !businessId || (isAutodumpFile(nextFile) && !activeBranchId)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = normalizeUploadResponse(await uploadProductImport(businessId, activeBranchId || undefined, nextFile, importMode));
      if (allowAiTools && isAutodumpFile(nextFile)) {
        const nextSessionId = response.sessionId || "";
        setFileMode("autodump");
        setSessionId(nextSessionId);
        if (nextSessionId) {
          const session = await getAutodumpSession(activeBranchId, nextSessionId);
          setDrafts(session.drafts || []);
        }
        setStep("preview");
      } else {
        const nextMappings = (response.columns || []).map(column => ({
          sourceColumn: column.sourceColumn,
          targetField: column.suggestedTargetField || "IGNORE",
          characteristicName: column.suggestedTargetField === "CHARACTERISTIC" ? column.sourceColumn : undefined,
        }));
        setFileMode("table");
        setUpload(response);
        setMappings(nextMappings);
        setStep("mapping");
      }
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Не удалось загрузить файл");
    } finally {
      setBusy(false);
    }
  };

  const continueToPreview = async () => {
    if (!upload || !businessId || !nameMapped) return;
    setBusy(true);
    setMessage("");
    try {
      const nextPreview = await mapProductImport(businessId, upload.importId, mappings);
      setPreview(nextPreview);
      setStep("preview");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Не удалось собрать предпросмотр");
    } finally {
      setBusy(false);
    }
  };

  const importTableRows = async () => {
    if (!upload || !businessId) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await approveProductImport(businessId, upload.importId);
      setMessage(`Импортировано ${itemLabelPlural}: ${result.productsCreated}`);
      onImported();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Не удалось импортировать товары");
    } finally {
      setBusy(false);
    }
  };

  const importDrafts = async () => {
    if (!activeBranchId || !sessionId) return;
    setBusy(true);
    setMessage("");
    try {
      const keepType = isProduct ? "PRODUCT" : "SERVICE";
      const skipType = isProduct ? "SERVICE" : "PRODUCT";
      const keepDrafts = drafts.filter(draft => (draft.itemType || "PRODUCT").toUpperCase() === keepType);
      const skipDrafts = drafts.filter(draft => (draft.itemType || "").toUpperCase() === skipType);
      await Promise.all(keepDrafts.map(draft => approveAutodumpDraft(activeBranchId, sessionId, draft.id)));
      await Promise.all(skipDrafts.map(draft => rejectAutodumpDraft(activeBranchId, sessionId, draft.id)));
      const result = await publishAutodumpSession(activeBranchId, sessionId);
      setMessage(`Опубликовано ${itemLabelPlural}: ${result.published}`);
      onImported();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Не удалось опубликовать AI draft");
    } finally {
      setBusy(false);
    }
  };

  const updateMapping = (sourceColumn: string, targetField: ProductImportTargetField) => {
    setMappings(current => current.map(mapping => mapping.sourceColumn === sourceColumn
      ? { ...mapping, targetField, characteristicName: targetField === "CHARACTERISTIC" ? mapping.characteristicName || sourceColumn : undefined }
      : mapping));
  };

  const setCharacteristicName = (sourceColumn: string, characteristicName: string) => {
    setMappings(current => current.map(mapping => mapping.sourceColumn === sourceColumn ? { ...mapping, characteristicName } : mapping));
  };

  return (
    <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-lg)" }}>
      <div className="fcw-flex-between" style={{ gap: "1rem", flexWrap: "wrap" }}>
        <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={onBackToProducts}>
          <ArrowLeft size={16} />Назад к {itemLabelPlural}
        </button>
        <div className="fcw-glassmorph-segmented" style={{ display: "inline-flex", gap: 0 }}>
          {["Загрузка", "Сопоставление", "Превью"].map((label, index) => {
            const activeIndex = step === "upload" ? 0 : step === "mapping" ? 1 : 2;
            return (
              <span
                key={label}
                className="fcw-body-s"
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: "var(--fcw-radius-md)",
                  color: index <= activeIndex ? "var(--fcw-color-text)" : "var(--fcw-color-text-tertiary)",
                  background: index === activeIndex ? "color-mix(in srgb, var(--fcw-color-primary) 14%, transparent)" : "transparent",
                }}
              >
                {label}
              </span>
            );
          })}
        </div>
        <span className="fcw-body-s fcw-text-secondary">{branchName}</span>
      </div>

      {step === "upload" && (
        <Card padding="lg">
          <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-lg)" }}>
            <div>
              <h2 className="fcw-h2" style={{ margin: 0 }}>Импорт {itemLabelPlural} из Excel</h2>
              <p className="fcw-body fcw-text-secondary" style={{ margin: "0.35rem 0 0" }}>
                Область импорта: {branchName}. Филиал можно указать позже.
              </p>
            </div>
            <div
              onDragOver={event => event.preventDefault()}
              onDrop={event => {
                event.preventDefault();
                const nextFile = event.dataTransfer.files[0];
                if (nextFile) setSelectedFile(nextFile);
              }}
              style={{
                border: "1px dashed var(--fcw-color-border-strong)",
                borderRadius: "var(--fcw-radius-lg)",
                padding: "2rem",
                backgroundColor: "var(--fcw-color-surface-secondary)",
                textAlign: "center",
              }}
            >
              {fileMode === "autodump" ? <FileText size={32} style={{ color: "var(--fcw-color-primary)" }} /> : <FileSpreadsheet size={32} style={{ color: "var(--fcw-color-primary)" }} />}
              <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: "0.75rem 0 0" }}>
                {allowAiTools
                  ? `Загрузите Excel, TXT, MD или PDF с ${itemLabelPlural}`
                  : `Загрузите файл Excel (.xlsx) с ${itemLabelPlural}`}
              </h3>
              <label className="fcw-btn fcw-btn-primary fcw-btn-sm" style={{ display: "inline-flex" }}>
                <Upload size={14} />
                Выбрать файл
                <input
                  type="file"
                  accept={allowAiTools ? ".xlsx,.txt,.md,.pdf" : ".xlsx"}
                  onChange={event => {
                    const nextFile = event.target.files?.[0];
                    if (nextFile) setSelectedFile(nextFile);
                  }}
                  style={{ display: "none" }}
                />
              </label>
              {file && (
                <div className="fcw-body-s" style={{ marginTop: "0.75rem", color: "var(--fcw-color-text-secondary)" }}>
                  {file.name}
                </div>
              )}
            </div>

            {file && (
              <button className="fcw-btn fcw-btn-primary" onClick={() => uploadFile()} disabled={busy || !businessId || (fileMode === "autodump" && !activeBranchId)} style={{ width: "100%" }}>
                {busy ? <Loader2 className="fcw-animate-spin" size={16} /> : <PackageCheck size={16} />}
                Превратить в {itemLabelAccusative}
              </button>
            )}

            <div
              className="fcw-body-s"
              style={{
                display: "flex",
                gap: "0.75rem",
                padding: "0.875rem",
                borderRadius: "var(--fcw-radius-md)",
                background: "color-mix(in srgb, var(--fcw-color-warning) 12%, transparent)",
                color: "var(--fcw-color-text-secondary)",
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0, color: "var(--fcw-color-warning)" }} />
              <span>Вы заполняете данные для витрины. Не включайте остатки, закупочные цены, поставщиков, маржинальность и другие внутренние данные бизнеса.</span>
            </div>


            <div className="fcw-flex" style={{ gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
              <Select
                options={[{ value: "", label: "Весь бизнес" }, ...branches.map(branch => ({ value: branch.id, label: branch.name }))]}
                value={activeBranchId}
                onChange={onBranchChange}
                style={{ width: "min(100%, 320px)" }}
              />
            </div>
          </div>
        </Card>
      )}

      {step === "mapping" && upload && (
        <Card padding="lg">
          <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
            <div>
              <h2 className="fcw-h2" style={{ margin: 0 }}>Сопоставление колонок</h2>
              <p className="fcw-body fcw-text-secondary" style={{ margin: "0.35rem 0 0" }}>
                Сопоставьте Excel-колонки с полями {itemLabelPlural}. Название {itemLabel} обязательно.
              </p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 0.5rem", minWidth: 720 }}>
                <thead>
                  <tr className="fcw-label" style={{ color: "var(--fcw-color-text-tertiary)", textAlign: "left" }}>
                    <th style={{ padding: "0 0.75rem" }}>Колонка Excel</th>
                    <th style={{ padding: "0 0.75rem" }}>Поле Ask</th>
                    <th style={{ padding: "0 0.75rem" }}>Пример значений</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map(mapping => (
                    <tr key={mapping.sourceColumn} style={{ background: "var(--fcw-color-surface-secondary)" }}>
                      <td className="fcw-body-s fcw-weight-semibold" style={{ padding: "0.75rem", borderRadius: "var(--fcw-radius-md) 0 0 var(--fcw-radius-md)" }}>
                        {mapping.sourceColumn}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <select
                          className="fcw-input"
                          value={mapping.targetField}
                          onChange={event => updateMapping(mapping.sourceColumn, event.target.value as ProductImportTargetField)}
                          style={{
                            minWidth: 220,
                            borderColor: mapping.targetField !== "IGNORE" ? "var(--fcw-color-primary)" : "var(--fcw-color-border)",
                            background: mapping.targetField !== "IGNORE" ? "color-mix(in srgb, var(--fcw-color-primary) 8%, var(--fcw-color-surface))" : undefined,
                          }}
                        >
                          {getFieldOptions(importMode).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        {mapping.targetField === "CHARACTERISTIC" && (
                          <input
                            className="fcw-input"
                            value={mapping.characteristicName || mapping.sourceColumn}
                            onChange={event => setCharacteristicName(mapping.sourceColumn, event.target.value)}
                            style={{ marginTop: "0.5rem", minWidth: 220 }}
                          />
                        )}
                      </td>
                      <td className="fcw-body-s fcw-text-secondary" style={{ padding: "0.75rem", borderRadius: "0 var(--fcw-radius-md) var(--fcw-radius-md) 0" }}>
                        {(sampleByColumn[mapping.sourceColumn] || []).join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!nameMapped && <p className="fcw-body-s" style={{ color: "var(--fcw-color-error)", margin: 0 }}>Нужно выбрать колонку с названием {itemLabel}.</p>}
            <div className="fcw-flex-between" style={{ gap: "0.75rem" }}>
              <button className="fcw-btn fcw-btn-secondary" onClick={() => setStep("upload")}>Назад</button>
              <button className="fcw-btn fcw-btn-primary" onClick={continueToPreview} disabled={busy || !nameMapped}>
                {busy ? <Loader2 className="fcw-animate-spin" size={16} /> : <Check size={16} />}
                Продолжить
              </button>
            </div>
          </div>
        </Card>
      )}

      {step === "preview" && fileMode === "table" && preview && (
        <Card padding="lg">
          <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
            <div>
              <h2 className="fcw-h2" style={{ margin: 0 }}>Превью импорта</h2>
              <p className="fcw-body fcw-text-secondary" style={{ margin: "0.35rem 0 0" }}>Проверьте данные перед импортом</p>
            </div>
            <div className="fcw-flex" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
              <div className="fcw-glassmorph-card" style={{ padding: "1rem", minWidth: 140 }}>
                <div className="fcw-h2" style={{ margin: 0 }}>{preview.validRows}</div>
                <div className="fcw-body-s fcw-text-secondary">Готово</div>
              </div>
              {characteristics.length > 0 && (
                <div className="fcw-flex-col" style={{ gap: "0.5rem", flex: 1 }}>
                  <span className="fcw-label">Характеристики ({characteristics.length})</span>
                  <div className="fcw-flex" style={{ gap: "0.375rem", flexWrap: "wrap" }}>
                    {characteristics.map(mapping => <span key={mapping.sourceColumn} className="fcw-label" style={{ padding: "0.25rem 0.5rem", borderRadius: "var(--fcw-radius-full)", background: "var(--fcw-color-surface-secondary)" }}>{mapping.sourceColumn} = {mapping.characteristicName || mapping.sourceColumn}</span>)}
                  </div>
                </div>
              )}
              {ignored.length > 0 && (
                <div className="fcw-flex-col" style={{ gap: "0.5rem", flex: 1 }}>
                  <span className="fcw-label">Игнорируются</span>
                  <div className="fcw-flex" style={{ gap: "0.375rem", flexWrap: "wrap" }}>
                    {ignored.map(mapping => <span key={mapping.sourceColumn} className="fcw-label" style={{ padding: "0.25rem 0.5rem", borderRadius: "var(--fcw-radius-full)", background: "var(--fcw-color-surface-secondary)", color: "var(--fcw-color-text-tertiary)" }}>{mapping.sourceColumn}</span>)}
                  </div>
                </div>
              )}
            </div>
            <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
              {preview.rows.slice(0, 20).map(row => (
                <div key={row.rowId} className="fcw-flex-between" style={{ gap: "1rem", padding: "0.75rem", borderRadius: "var(--fcw-radius-md)", background: "var(--fcw-color-surface-secondary)" }}>
                  <div>
                    <div className="fcw-label">Строка {row.rowNumber}</div>
                    <div className="fcw-body-s">{rowTitle(row)}</div>
                    {row.errors.length > 0 && <div className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>{row.errors.join(", ")}</div>}
                  </div>
                  <span className="fcw-label" style={{ color: row.status === "INVALID" ? "var(--fcw-color-error)" : "var(--fcw-color-success)" }}>{row.status === "INVALID" ? "Ошибка" : "OK"}</span>
                </div>
              ))}
            </div>
            <div className="fcw-flex-between" style={{ gap: "0.75rem" }}>
              <button className="fcw-btn fcw-btn-secondary" onClick={() => setStep("mapping")}>Назад</button>
              <button className="fcw-btn fcw-btn-primary" onClick={importTableRows} disabled={busy || preview.validRows === 0}>
                {busy ? <Loader2 className="fcw-animate-spin" size={16} /> : <PackageCheck size={16} />}
                Импортировать {preview.validRows}
              </button>
            </div>
          </div>
        </Card>
      )}

      {step === "preview" && fileMode === "autodump" && (
        <Card padding="lg">
          <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
            <div>
              <h2 className="fcw-h2" style={{ margin: 0 }}>AI Dumping превью</h2>
              <p className="fcw-body fcw-text-secondary" style={{ margin: "0.35rem 0 0" }}>
                AI превратил файл в черновики {itemLabelPlural}. {isProduct ? "Услуги" : "Товары"} из этого сценария не публикуются.
              </p>
            </div>
            <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
              {drafts.map(draft => (
                <div key={draft.id} className="fcw-flex-between" style={{ gap: "1rem", padding: "0.75rem", borderRadius: "var(--fcw-radius-md)", background: "var(--fcw-color-surface-secondary)" }}>
                  <div>
                    <div className="fcw-label">{(draft.itemType || "PRODUCT").toUpperCase() === (isProduct ? "SERVICE" : "PRODUCT") ? (isProduct ? "Услуга пропущена" : "Товар пропущен") : (isProduct ? "Товар" : "Услуга")}</div>
                    <div className="fcw-body-s fcw-weight-semibold">{draftTitle(draft)}</div>
                    <div className="fcw-body-s fcw-text-secondary">{draft.categoryLabel || draft.subcategoryLabel || draft.description || "Без описания"}</div>
                  </div>
                  <span className="fcw-body-s fcw-weight-semibold">{draft.priceText || (draft.price ? `${draft.price} ₸` : "—")}</span>
                </div>
              ))}
            </div>
            <div className="fcw-flex-between" style={{ gap: "0.75rem" }}>
              <button className="fcw-btn fcw-btn-secondary" onClick={reset}>Назад</button>
              <button className="fcw-btn fcw-btn-primary" onClick={importDrafts} disabled={busy || drafts.length === 0}>
                {busy ? <Loader2 className="fcw-animate-spin" size={16} /> : <PackageCheck size={16} />}
                Импортировать {itemLabelAccusative}
              </button>
            </div>
          </div>
        </Card>
      )}

      {message && (
        <div className="fcw-body-s" style={{ color: message.includes("Не удалось") ? "var(--fcw-color-error)" : "var(--fcw-color-text-secondary)" }}>
          {message}
        </div>
      )}
    </div>
  );
}
