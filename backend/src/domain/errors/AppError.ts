export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function badRequest(message: string, details?: Record<string, unknown>) {
  return new AppError("BAD_REQUEST", 400, message, details);
}

export function unauthorized(message = "Unauthorized") {
  return new AppError("UNAUTHORIZED", 401, message);
}

export function forbidden(message = "Forbidden") {
  return new AppError("FORBIDDEN", 403, message);
}

export function notFound(message = "Not found") {
  return new AppError("NOT_FOUND", 404, message);
}

export function conflict(message: string, details?: Record<string, unknown>) {
  return new AppError("CONFLICT", 409, message, details);
}

export function tooLarge(message = "Payload too large") {
  return new AppError("PAYLOAD_TOO_LARGE", 413, message);
}

