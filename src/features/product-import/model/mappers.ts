import type { ImportMapping, ImportRow } from './types';
import type { Product } from '@/entities/product/model/types';
import { BUSINESS_ID } from './defaults';

export const normalizeRows = (
  rawRows: Record<string, string>[],
  mappings: ImportMapping[],
  branchId: string,
): ImportRow[] => {
  return rawRows.map((raw, idx) => {
    const rowNumber = idx + 1;
    const errors: string[] = [];
    const warnings: string[] = [];

    const nameMapping = mappings.find((m) => m.targetField === 'NAME');
    const name = nameMapping ? raw[nameMapping.sourceColumn]?.trim() : '';
    if (!name) {
      errors.push('Название товара обязательно');
    }

    const priceMapping = mappings.find((m) => m.targetField === 'PRICE');
    let price: number | null = null;
    if (priceMapping) {
      const priceRaw = raw[priceMapping.sourceColumn]?.trim();
      if (priceRaw) {
        const parsed = parseFloat(priceRaw.replace(/[^0-9.]/g, ''));
        if (isNaN(parsed)) {
          warnings.push(`Не удалось распознать цену: "${priceRaw}"`);
        } else {
          price = parsed;
        }
      }
    }

    let status: ImportRow['status'] = 'VALID';
    if (errors.length > 0) status = 'INVALID';
    else if (warnings.length > 0) status = 'WARNING';

    return {
      rowNumber,
      rawData: raw,
      status,
      errors,
      warnings,
    };
  });
};

export const mapToProducts = (
  importRows: ImportRow[],
  mappings: ImportMapping[],
  branchId: string,
): Product[] => {
  const now = new Date().toISOString();

  return importRows
    .filter((r) => r.status !== 'INVALID')
    .map((r) => {
      const getVal = (targetField: string): string =>
        mappings.find((m) => m.targetField === targetField)
          ? (r.rawData[mappings.find((m) => m.targetField === targetField)!.sourceColumn] ?? '')
          : '';

      const name = getVal('NAME').trim();
      const categoryLabel = getVal('CATEGORY_LABEL').trim() || undefined;
      let description = getVal('DESCRIPTION').trim() || undefined;
      const sku = getVal('SKU').trim() || undefined;
      const tagsRaw = getVal('TAGS').trim();
      const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];

      const appendMappings = mappings.filter((m) => m.targetField === 'APPEND_TO_DESCRIPTION');
      for (const am of appendMappings) {
        const val = r.rawData[am.sourceColumn]?.trim();
        if (val) {
          description = description
            ? description + '\n' + am.sourceColumn + ': ' + val
            : am.sourceColumn + ': ' + val;
        }
      }

      const characteristicsJson: Record<string, string> = {};
      const charMappings = mappings.filter((m) => m.targetField === 'CHARACTERISTIC');
      for (const cm of charMappings) {
        const val = r.rawData[cm.sourceColumn]?.trim();
        if (val) {
          characteristicsJson[cm.characteristicName || cm.sourceColumn] = val;
        }
      }

      return {
        id: 'prod-' + Date.now() + '-' + r.rowNumber,
        businessId: BUSINESS_ID,
        branchId,
        name,
        categoryLabel,
        description,
        sku,
        tags,
        characteristicsJson,
        price: null,
        enabled: true,
        sourceType: 'IMPORT' as const,
        createdAt: now,
        updatedAt: now,
      };
    });
};
