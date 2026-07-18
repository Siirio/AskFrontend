import { env } from "@/shared/config/env";
import { ApiError, type ApiErrorBody } from "./apiError";
import { camelizeKeys, snakifyKeys } from "./caseTransform";
import { tokenStorage } from "./tokenStorage";

/**
 * The ONE HTTP implementation (§7) — every slice's api.ts is built on it;
 * components never call fetch or an endpoint URL themselves (P1.2).
 *
 * Callable from server AND client code (D7): plain fetch, no React, no DOM —
 * the only browser API (localStorage) sits behind tokenStorage, which no-ops
 * on the server. Platform-neutral by design (D5).
 *
 * NO domain endpoints live here. The backend's WIRE format is snake_case
 * (D20 — proven on live integration 2026-07-17); this client is the one place
 * that knows it: request bodies snakify, response bodies camelize, and every
 * slice speaks camelCase only. Query params are never transformed (Spring
 * binds them by Java parameter name).
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
    return camelizeKeys(await response.json()) as ApiErrorBody;
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
    body = JSON.stringify(snakifyKeys(options.body));
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

  // Success bodies are JSON per contract, but the transport must not leak a
  // raw SyntaxError (its one error type is ApiError, §7): a proxy/CDN blank
  // 200 or an endpoint answering 200-with-empty-body degrades instead of
  // crashing the first caller that isn't wrapped in try/catch.
  const text = await response.text();
  if (text === "") {
    return undefined as T;
  }
  try {
    return camelizeKeys(JSON.parse(text)) as T;
  } catch {
    throw new ApiError(response.status, {
      message: "Response body was not valid JSON",
    });
  }
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
