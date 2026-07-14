// Environment access lives here and nowhere else (architecture §6).
// NEXT_PUBLIC_ because the same value must be readable in client code (D7).
export const env = {
  /** Base URL of the AskBackend API, no trailing slash. Default: local backend (ASK_SERVER_PORT 2020). */
  apiBaseUrl: (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:2020").replace(/\/+$/, ""),
} as const;
