export type Product = {
  id: string;
  businessId: string;
  branchId: string;
  name: string;
  categoryLabel?: string;
  description?: string;
  sku?: string;
  tags: string[];
  characteristicsJson: Record<string, string>;
  price?: number | null;
  enabled: boolean;
  sourceType: 'MANUAL' | 'IMPORT' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
};
