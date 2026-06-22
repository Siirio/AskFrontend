import type { ImportMapping, ImportRow } from '../model/types';
import type { Product } from '@/entities/product/model/types';
import { normalizeRows, mapToProducts } from '../model/mappers';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type ParseResult = {
  columns: string[];
  sampleRows: Record<string, string>[];
  rawRows: Record<string, string>[];
  totalRows: number;
};

export const mockParseExcel = async (
  columns: string[],
  sampleRows: Record<string, string>[],
  rawRows: Record<string, string>[],
): Promise<ParseResult> => {
  await delay(600);
  return { columns, sampleRows, rawRows, totalRows: rawRows.length };
};

export type PreviewResult = {
  previewRows: ImportRow[];
  ignoredColumns: string[];
  appendToDescColumns: string[];
  characteristicColumns: { source: string; name: string }[];
  totalRows: number;
  validCount: number;
  invalidCount: number;
  warningCount: number;
};

export const mockSaveMapping = async (
  rawRows: Record<string, string>[],
  mappings: ImportMapping[],
  branchId: string,
): Promise<PreviewResult> => {
  await delay(500);
  const previewRows = normalizeRows(rawRows, mappings, branchId);

  const ignoredColumns = mappings
    .filter((m) => m.targetField === 'IGNORE')
    .map((m) => m.sourceColumn);

  const appendToDescColumns = mappings
    .filter((m) => m.targetField === 'APPEND_TO_DESCRIPTION')
    .map((m) => m.sourceColumn);

  const characteristicColumns = mappings
    .filter((m) => m.targetField === 'CHARACTERISTIC')
    .map((m) => ({ source: m.sourceColumn, name: m.characteristicName || m.sourceColumn }));

  return {
    previewRows,
    ignoredColumns,
    appendToDescColumns,
    characteristicColumns,
    totalRows: previewRows.length,
    validCount: previewRows.filter((r) => r.status === 'VALID').length,
    invalidCount: previewRows.filter((r) => r.status === 'INVALID').length,
    warningCount: previewRows.filter((r) => r.status === 'WARNING').length,
  };
};

export type ApproveResult = {
  products: Product[];
  count: number;
};

export const mockApproveImport = async (
  previewRows: ImportRow[],
  mappings: ImportMapping[],
  branchId: string,
): Promise<ApproveResult> => {
  await delay(700);
  const products = mapToProducts(previewRows, mappings, branchId);
  return { products, count: products.length };
};
