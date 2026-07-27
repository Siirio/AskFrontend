import { getAccessToken } from "./authTokenStore";
import { parseResponseBody } from "./responseBody";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function transformKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(transformKeys);
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[snakeToCamel(key)] = transformKeys(value);
    }
    return result;
  }
  return obj;
}

function camelToSnake(key: string): string {
  return key.replace(/([A-Z])/g, (_, c) => "_" + c.toLowerCase());
}

export function camelToSnakeKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnakeKeys);
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[camelToSnake(key)] = camelToSnakeKeys(value);
    }
    return result;
  }
  return obj;
}

function getCookie(name: string): string | null {
  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split("; ")
    .find(item => item.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

export function getCsrfHeaders(): Record<string, string> {
  const token = getCookie("XSRF-TOKEN");
  return token ? { "X-XSRF-TOKEN": token } : {};
}

export function getAuthHeaders(): Record<string, string> {
  const accessToken = getAccessToken();
  return accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : getCsrfHeaders();
}

export class ApiError extends Error {
  status: number;
  errorCode: string | null;

  constructor(status: number, message: string, errorCode: string | null = null) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const accessToken = options.auth ? getAccessToken() : null;

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (!accessToken && options.method && options.method !== "GET") {
    Object.assign(headers, getCsrfHeaders());
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(camelToSnakeKeys(options.body)) : undefined,
    credentials: accessToken ? "omit" : "include",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message = text;
    let errorCode: string | null = null;
    try {
      const json = JSON.parse(text);
      if (json.message) message = json.message;
      errorCode = json.error_code || json.errorCode || null;
    } catch {
      // not JSON, use raw text
    }
    throw new ApiError(response.status, message, errorCode);
  }

  const json = await parseResponseBody(response);
  return transformKeys(json) as T;
}
