import { ApiError } from "../api/httpClient";

type ErrorContext = "auth" | "verify" | "network" | "default";

const FALLBACKS: Record<ErrorContext, string> = {
  auth: "Не удалось войти. Проверьте данные и попробуйте снова.",
  verify: "Не удалось подтвердить код. Проверьте код и попробуйте снова.",
  network: "Не удалось выполнить запрос. Проверьте соединение.",
  default: "Что-то пошло не так. Попробуйте еще раз.",
};

function looksLikeJson(str: string): boolean {
  const trimmed = str.trim();
  return (trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"));
}

function looksTechnical(str: string): boolean {
  return /^[A-Z_]{4,}$/.test(str) || str.includes("Error") || str.includes("Exception") || str.startsWith("org.") || str.startsWith("java.") || /at\s+\S+\(/.test(str);
}

function extractBackendMessage(json: string): string | null {
  try {
    const obj = JSON.parse(json);
    if (obj && typeof obj === "object" && typeof obj.message === "string" && obj.message.length > 0) {
      return obj.message.trim();
    }
  } catch {
    // not valid JSON
  }
  return null;
}

export function getUserFriendlyError(error: unknown, context: ErrorContext = "default"): string {
  if (error instanceof ApiError) {
    const raw = error.message;

    if (looksLikeJson(raw)) {
      const backendMessage = extractBackendMessage(raw);
      if (backendMessage && !looksTechnical(backendMessage) && backendMessage.length < 200) {
        return backendMessage;
      }
      return FALLBACKS[context];
    }

    if (raw && !looksTechnical(raw) && raw.length < 200) {
      return raw;
    }

    return FALLBACKS[context];
  }

  // Network error (TypeError: Failed to fetch, etc.)
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return FALLBACKS.network;
  }

  return FALLBACKS[context];
}
