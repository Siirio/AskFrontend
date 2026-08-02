import type { CatalogImageDto } from "../api/dto";

export const CATALOG_IMAGE_LIMIT = 3;

export type CatalogImageDraft = {
  key: string;
  persistedId?: string;
  url?: string;
  file?: File;
};

type ImageFile = {
  type: string;
};

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function acceptCatalogImageFiles<T extends ImageFile>(currentCount: number, files: Iterable<T>) {
  const remaining = Math.max(0, CATALOG_IMAGE_LIMIT - currentCount);
  return Array.from(files)
    .filter(file => ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase()))
    .slice(0, remaining);
}

export function moveCatalogImage<T>(images: readonly T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0
      || fromIndex >= images.length || toIndex >= images.length) {
    return [...images];
  }
  const next = [...images];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function toCatalogImageDrafts(images: CatalogImageDto[] | undefined): CatalogImageDraft[] {
  return (images ?? []).map(image => ({
    key: `persisted:${image.id}`,
    persistedId: image.id,
    url: image.url,
  }));
}
