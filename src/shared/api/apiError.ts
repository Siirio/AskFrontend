/** One entry of the backend's field-level validation errors. */
export type ApiErrorDetail = {
  field: string;
  message: string;
};

/**
 * The AskBackend error contract — mirrors kz.ask.shared.api.dto.ErrorResponse,
 * produced by the backend's GlobalExceptionHandler for every error response.
 * The backend is the data authority: this shape is read, never invented (P9.4).
 */
export type ApiErrorBody = {
  timestamp?: string;
  errorCode?: string;
  message?: string;
  detail?: string;
  errors?: ApiErrorDetail[];
};

/**
 * The ONE error the transport throws (§7). Carries the HTTP status and the
 * backend's ErrorResponse fields when a body was readable.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errorCode?: string;
  readonly detail?: string;
  readonly errors: ApiErrorDetail[];

  constructor(status: number, body?: ApiErrorBody) {
    super(body?.message ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = body?.errorCode;
    this.detail = body?.detail;
    this.errors = body?.errors ?? [];
  }
}
