import { env } from "@/shared/config/env";
import { ApiError, type ApiErrorBody } from "./apiError";
import { tokenStorage } from "./tokenStorage";

/**
 * The ONE HTTP implementation (§7) — every slice's api.ts is built on it;
 * components never call fetch or an endpoint URL themselves (P1.2).
 *
 * Callable from server AND client code (D7): plain fetch, no React, no DOM —
 * the only browser API (localStorage) sits behind tokenStorage, which no-ops
 * on the server. Platform-neutral by design (D5).
 *
 * NO domain endpoints live here. The backend speaks camelCase JSON
 * (kz.ask.shared.api.dto), so no key transforms are needed — adding one would
 * be dead code (P8.1).
 */

type QueryValue = string | number | boolean | null | undefined;

export type RequestOptions = {
  /** Query parameters; null/undefined entries are omitted. */
  query?: Record<string, QueryValue>;
  /** JSON-serialized request body. */
  body?: unknown;
  /** Extra headers, merged over the defaults. */
  headers?: HeadersInit;
  /** Abort signal. */
  signal?: AbortSignal;
};

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(env.apiBaseUrl + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function readErrorBody(
  response: Response,
): Promise<ApiErrorBody | undefined> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return undefined; // non-JSON error body — the status still tells the story
  }
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const token = tokenStorage.get();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body: string | undefined;
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(buildUrl(path, options.query), {
    method,
    headers,
    body,
    signal: options.signal,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorBody(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const httpClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, options),
  post: <T>(path: string, options?: RequestOptions) =>
    request<T>("POST", path, options),
  put: <T>(path: string, options?: RequestOptions) =>
    request<T>("PUT", path, options),
  patch: <T>(path: string, options?: RequestOptions) =>
    request<T>("PATCH", path, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, options),
};
