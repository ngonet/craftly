export const CORS_METHODS = ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] as const;

export const CORS_ALLOWED_HEADERS = ['Authorization', 'Content-Type', 'X-Request-Id'] as const;

export const CORS_MAX_AGE_SECONDS = 86400;

export function resolveAllowedOrigins(corsOrigin: string): string[] {
  return corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function resolveAllowedOrigin(
  allowedOrigins: readonly string[],
  originHeader: string | undefined,
): string | null {
  if (!originHeader) return null;

  return allowedOrigins.includes(originHeader) ? originHeader : null;
}

export function createCorsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': CORS_METHODS.join(','),
    'Access-Control-Allow-Headers': CORS_ALLOWED_HEADERS.join(', '),
    'Access-Control-Max-Age': String(CORS_MAX_AGE_SECONDS),
    Vary: 'Origin',
  };
}
