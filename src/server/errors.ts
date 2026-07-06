export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export function badRequest(code: string, message: string): ApiError {
  return new ApiError(400, code, message);
}

export function notFound(code: string, message: string): ApiError {
  return new ApiError(404, code, message);
}

export function serviceUnavailable(code: string, message: string): ApiError {
  return new ApiError(503, code, message);
}
