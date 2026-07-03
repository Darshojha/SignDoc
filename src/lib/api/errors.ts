import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "invalid_request"
  | "unauthorized"
  | "forbidden"
  | "envelope_not_signable"
  | "file_too_large"
  | "unsupported_file_type"
  | "not_found"
  | "internal_error";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  invalid_request: 400,
  unauthorized: 401,
  forbidden: 403,
  envelope_not_signable: 409,
  file_too_large: 413,
  unsupported_file_type: 415,
  not_found: 404,
  internal_error: 500,
};

export function apiError(
  code: ApiErrorCode,
  message: string,
  field: string | null = null,
) {
  return NextResponse.json(
    { error: { code, message, field } },
    { status: STATUS_BY_CODE[code] },
  );
}
