import { ApiError } from "../api/httpClient";
import i18n from "../i18n/i18n";

type ErrorContext = "auth" | "verify" | "network" | "default";

type BackendError = {
  errorCode?: string;
  error_code?: string;
  message?: string;
};

function looksLikeJson(str: string): boolean {
  const trimmed = str.trim();
  return (trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"));
}

function looksTechnical(str: string): boolean {
  return /^[A-Z_]{4,}$/.test(str) || str.includes("Error") || str.includes("Exception") || str.startsWith("org.") || str.startsWith("java.") || /at\s+\S+\(/.test(str);
}

function parseBackendError(json: string): BackendError | null {
  try {
    const obj = JSON.parse(json);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      return obj as BackendError;
    }
  } catch {
    return null;
  }
  return null;
}

function backendMessage(error: BackendError): string | null {
  const code = error.errorCode ?? error.error_code;
  if (code) {
    const key = `error.${code}`;
    const translated = i18n.t(key);
    if (translated !== key) return translated;
  }
  if (error.message && !looksTechnical(error.message) && error.message.length < 200) {
    return error.message.trim();
  }
  return null;
}

export function getUserFriendlyError(error: unknown, context: ErrorContext = "default"): string {
  const fallbackKey = `error.fallback.${context}`;
  if (error instanceof ApiError) {
    const raw = error.message;

    if (looksLikeJson(raw)) {
      const parsed = parseBackendError(raw);
      const message = parsed ? backendMessage(parsed) : null;
      return message ?? i18n.t(fallbackKey);
    }

    if (raw && !looksTechnical(raw) && raw.length < 200) {
      return raw;
    }

    return i18n.t(fallbackKey);
  }

  if (error instanceof TypeError && error.message.includes("fetch")) {
    return i18n.t("error.fallback.network");
  }

  if (error instanceof Error && error.message && !looksTechnical(error.message) && error.message.length < 200) {
    return error.message;
  }

  return i18n.t(fallbackKey);
}
