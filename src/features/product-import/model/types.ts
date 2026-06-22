export type TargetField =
  | 'NAME'
  | 'CATEGORY_LABEL'
  | 'DESCRIPTION'
  | 'SKU'
  | 'PRICE'
  | 'TAGS'
  | 'IGNORE'
  | 'APPEND_TO_DESCRIPTION'
  | 'CHARACTERISTIC';

export type ImportMapping = {
  sourceColumn: string;
  targetField: TargetField;
  characteristicName?: string;
};

export type ImportRow = {
  rowNumber: number;
  rawData: Record<string, string>;
  status: 'VALID' | 'INVALID' | 'WARNING';
  errors: string[];
  warnings: string[];
};

export type ImportStep = 'upload' | 'mapping' | 'preview' | 'done';

export type ImportSession = {
  step: ImportStep;
  branchId: string;
  branchName: string;
  rawColumns: string[];
  sampleRows: Record<string, string>[];
  rawRows: Record<string, string>[];
  mappings: ImportMapping[];
  previewRows: ImportRow[];
  importedCount: number;
};
