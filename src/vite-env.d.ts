interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GEOCODING_API_URL?: string;
  readonly VITE_MAP_TILE_URL?: string;
  readonly VITE_MANAGED_IMPORT_PRICE_KZT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
