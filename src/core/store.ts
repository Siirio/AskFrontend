import { create } from 'zustand';
import type { Product } from '@/entities/product/model/types';
import type { ImportSession, ImportMapping, ImportRow, ImportStep } from '@/features/product-import/model/types';

type ProductSlice = {
  products: Product[];
  addProducts: (products: Product[]) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  toggleEnabled: (id: string) => void;
};

type ImportSlice = {
  importSession: ImportSession;
  setStep: (step: ImportStep) => void;
  setImportSession: (session: Partial<ImportSession>) => void;
  setMappings: (mappings: ImportMapping[]) => void;
  updateMapping: (columnIndex: number, mapping: ImportMapping) => void;
  setPreviewRows: (rows: ImportRow[]) => void;
  setImportedCount: (count: number) => void;
  resetImport: () => void;
};

const emptySession: ImportSession = {
  step: 'upload',
  branchId: '',
  branchName: '',
  rawColumns: [],
  sampleRows: [],
  rawRows: [],
  mappings: [],
  previewRows: [],
  importedCount: 0,
};

export const useStore = create<ProductSlice & ImportSlice>((set) => ({
  products: [],

  addProducts: (products) =>
    set((s) => ({ products: [...s.products, ...products] })),

  updateProduct: (id, patch) =>
    set((s) => ({
      products: s.products.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
      ),
    })),

  deleteProduct: (id) =>
    set((s) => ({ products: s.products.filter((p) => p.id !== id) })),

  toggleEnabled: (id) =>
    set((s) => ({
      products: s.products.map((p) =>
        p.id === id ? { ...p, enabled: !p.enabled, updatedAt: new Date().toISOString() } : p,
      ),
    })),

  importSession: { ...emptySession },

  setStep: (step) =>
    set((s) => ({ importSession: { ...s.importSession, step } })),

  setImportSession: (session) =>
    set((s) => ({ importSession: { ...s.importSession, ...session } })),

  setMappings: (mappings) =>
    set((s) => ({ importSession: { ...s.importSession, mappings } })),

  updateMapping: (columnIndex, mapping) =>
    set((s) => {
      const updated = [...s.importSession.mappings];
      updated[columnIndex] = mapping;
      return { importSession: { ...s.importSession, mappings: updated } };
    }),

  setPreviewRows: (rows) =>
    set((s) => ({ importSession: { ...s.importSession, previewRows: rows } })),

  setImportedCount: (count) =>
    set((s) => ({ importSession: { ...s.importSession, importedCount: count } })),

  resetImport: () =>
    set({ importSession: { ...emptySession } }),
}));

export const selectProductsByBranch = (branchId: string) => (state: ProductSlice) =>
  state.products.filter((p) => p.branchId === branchId);

export const searchProducts = (branchId: string, query: string) => (state: ProductSlice) => {
  if (!query.trim()) return state.products.filter((p) => p.branchId === branchId);

  const q = query.toLowerCase();
  return state.products.filter((p) => {
    if (p.branchId !== branchId) return false;
    if (p.name.toLowerCase().includes(q)) return true;
    if (p.categoryLabel?.toLowerCase().includes(q)) return true;
    if (p.description?.toLowerCase().includes(q)) return true;
    if (p.sku?.toLowerCase().includes(q)) return true;
    if (p.tags.some((t) => t.toLowerCase().includes(q))) return true;

    const chars = p.characteristicsJson;
    for (const key of Object.keys(chars)) {
      if (key.toLowerCase().includes(q)) return true;
      if (chars[key].toLowerCase().includes(q)) return true;
    }

    return false;
  });
};
