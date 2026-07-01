import { ApiError } from "../api/httpClient";

type ErrorContext = "auth" | "verify" | "network" | "default";

type BackendError = {
  errorCode?: string;
  error_code?: string;
  message?: string;
};

const FALLBACKS: Record<ErrorContext, string> = {
  auth: "Не удалось войти. Проверьте данные и попробуйте снова.",
  verify: "Не удалось подтвердить код. Проверьте код и попробуйте снова.",
  network: "Не удалось выполнить запрос. Проверьте соединение.",
  default: "Что-то пошло не так. Попробуйте еще раз.",
};

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Неверный email или пароль.",
  ACCOUNT_NOT_ACTIVE: "Аккаунт не активен.",
  ACCESS_DENIED: "Недостаточно прав для этого действия.",
  VALIDATION_ERROR: "Проверьте заполненные поля.",
  MALFORMED_REQUEST: "Некорректный формат запроса.",
  CITY_NOT_FOUND: "Город не найден.",
  BRANCH_NOT_FOUND: "Филиал не найден.",
  STAFF_NOT_FOUND: "Сотрудник не найден.",
  EMAIL_ALREADY_REGISTERED: "Email уже зарегистрирован.",
  EMAIL_ALREADY_EXISTS: "Пользователь с таким email уже существует.",
  PHONE_ALREADY_REGISTERED: "Телефон уже зарегистрирован.",
  CHALLENGE_NOT_FOUND: "Код подтверждения не найден.",
  CHALLENGE_EXPIRED: "Код подтверждения истек.",
  CHALLENGE_MAX_ATTEMPTS: "Превышено количество попыток.",
  CHALLENGE_INVALID_CODE: "Неверный код подтверждения.",
  DATA_CONFLICT: "Данные конфликтуют с текущим состоянием.",
  FILE_TOO_LARGE: "Размер файла превышает допустимый лимит.",
  INTERNAL_ERROR: "Внутренняя ошибка сервера. Попробуйте позже.",
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
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  if (error.message && !looksTechnical(error.message) && error.message.length < 200) {
    return error.message.trim();
  }
  return null;
}

export function getUserFriendlyError(error: unknown, context: ErrorContext = "default"): string {
  if (error instanceof ApiError) {
    const raw = error.message;

    if (looksLikeJson(raw)) {
      const parsed = parseBackendError(raw);
      const message = parsed ? backendMessage(parsed) : null;
      return message ?? FALLBACKS[context];
    }

    if (raw && !looksTechnical(raw) && raw.length < 200) {
      return raw;
    }

    return FALLBACKS[context];
  }

  if (error instanceof TypeError && error.message.includes("fetch")) {
    return FALLBACKS.network;
  }

  if (error instanceof Error && error.message && !looksTechnical(error.message) && error.message.length < 200) {
    return error.message;
  }

  return FALLBACKS[context];
}
