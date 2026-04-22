// Fastify plugin: validates Supabase JWTs using `jose`.
//
// Registered once at server bootstrap. Routes opt-in by attaching
// `fastify.authenticate` as a preHandler:
//
//     fastify.get('/products', { preHandler: fastify.authenticate }, handler);
//
// Verification strategy (auto-selected at plugin init):
//   1. JWKS (asymmetric, rotating keys) — preferred, via SUPABASE_JWKS_URL.
//   2. HS256 shared secret — legacy fallback, via SUPABASE_JWT_SECRET.
//
// `createRemoteJWKSet` caches keys in-memory and refetches on `kid` miss,
// so it stays efficient across warm Fluid Compute invocations.

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import {
  type JWTPayload,
  createRemoteJWKSet,
  decodeProtectedHeader,
  errors as joseErrors,
  jwtVerify,
} from 'jose';
import { getPrismaClient } from '../../../infrastructure/prisma/client.js';

// ─────────────────────────────────────────────────────────────
// Public types — augment Fastify's request/instance
// ─────────────────────────────────────────────────────────────

export interface AuthenticatedUser {
  /** Supabase auth.users.id — maps 1:1 to our local users.id */
  id: string;
  email: string;
  /** Supabase role claim, usually "authenticated" */
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthenticatedUser;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
}

// ─────────────────────────────────────────────────────────────
// Plugin options
// ─────────────────────────────────────────────────────────────

export interface AuthPluginOptions {
  /** JWKS endpoint URL — asymmetric, recommended. */
  jwksUrl?: string;
  /** HS256 shared secret — legacy fallback. */
  jwtSecret?: string;
  /** Expected `iss` claim, e.g. https://<ref>.supabase.co/auth/v1 */
  issuer: string;
  /** Expected `aud` claim. Defaults to Supabase's "authenticated". */
  audience?: string;
}

// ─────────────────────────────────────────────────────────────
// Error — Fastify respects `statusCode` on thrown errors.
// ─────────────────────────────────────────────────────────────

class UnauthorizedError extends Error {
  readonly statusCode = 401;
  readonly code = 'UNAUTHORIZED';
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// ─────────────────────────────────────────────────────────────
// Payload shape guard
// ─────────────────────────────────────────────────────────────

interface SupabaseJWTPayload extends JWTPayload {
  sub: string;
  email?: string;
  role?: string;
}

function isSupabasePayload(payload: JWTPayload): payload is SupabaseJWTPayload {
  return typeof payload.sub === 'string' && payload.sub.length > 0;
}

function resolveUserEmail(payload: SupabaseJWTPayload): string {
  if (typeof payload.email === 'string' && payload.email.length > 0) {
    return payload.email;
  }

  return `user-${payload.sub}@local.invalid`;
}

// ─────────────────────────────────────────────────────────────
// Plugin implementation
// ─────────────────────────────────────────────────────────────

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (fastify, opts) => {
  const { jwksUrl, jwtSecret, issuer, audience = 'authenticated' } = opts;
  const prisma = getPrismaClient();

  if (!jwksUrl && !jwtSecret) {
    throw new Error(
      'auth plugin: either `jwksUrl` or `jwtSecret` must be provided ' +
        '(check SUPABASE_JWKS_URL / SUPABASE_JWT_SECRET)',
    );
  }

  // Build the verification function ONCE at plugin init, not per request.
  // Keeps the hot path tight and the JWKS cache alive for the process.
  let verifyToken: (token: string) => Promise<SupabaseJWTPayload>;
  const verificationMode = jwksUrl ? 'jwks' : 'jwt-secret';

  if (jwksUrl) {
    const jwks = createRemoteJWKSet(new URL(jwksUrl));
    verifyToken = async (token) => {
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        audience,
        algorithms: ['RS256', 'ES256'],
      });
      if (!isSupabasePayload(payload)) {
        throw new UnauthorizedError('invalid token payload: missing sub');
      }
      return payload;
    };
  } else {
    const secret = new TextEncoder().encode(jwtSecret);
    verifyToken = async (token) => {
      const { payload } = await jwtVerify(token, secret, {
        issuer,
        audience,
        algorithms: ['HS256'],
      });
      if (!isSupabasePayload(payload)) {
        throw new UnauthorizedError('invalid token payload: missing sub');
      }
      return payload;
    };
  }

  fastify.log.info(
    {
      verificationMode,
      issuer,
      audience,
      jwksUrl,
    },
    'auth: initialized token verifier',
  );

  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    const header = request.headers.authorization;

    if (!header || !header.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedError('missing bearer token');
    }

    const token = header.slice(7).trim();
    if (!token) {
      throw new UnauthorizedError('empty bearer token');
    }

    const tokenHeader = (() => {
      try {
        const protectedHeader = decodeProtectedHeader(token);
        return {
          alg: protectedHeader.alg,
          ...(typeof protectedHeader.kid === 'string' ? { kid: protectedHeader.kid } : {}),
          ...(typeof protectedHeader.typ === 'string' ? { typ: protectedHeader.typ } : {}),
        };
      } catch (err) {
        return {
          decodeError: err instanceof Error ? err.message : 'unknown protected header decode error',
        };
      }
    })();

    let payload: SupabaseJWTPayload;

    try {
      payload = await verifyToken(token);
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;

      if (err instanceof joseErrors.JWTExpired) {
        fastify.log.warn(
          {
            errName: err.name,
            errMessage: err.message,
            verificationMode,
            tokenHeader,
          },
          'auth: token expired',
        );
        throw new UnauthorizedError('token expired');
      }
      if (
        err instanceof joseErrors.JWTClaimValidationFailed ||
        err instanceof joseErrors.JWTInvalid ||
        err instanceof joseErrors.JWSInvalid ||
        err instanceof joseErrors.JWSSignatureVerificationFailed
      ) {
        fastify.log.warn(
          {
            errName: err.name,
            errMessage: err.message,
            verificationMode,
            issuer,
            audience,
            tokenHeader,
          },
          'auth: token verification failed',
        );
        throw new UnauthorizedError('invalid token');
      }

      // Unknown failure — log server-side, keep the client message generic.
      fastify.log.error(
        {
          err,
          verificationMode,
          issuer,
          audience,
          tokenHeader,
        },
        'auth: unexpected verification error',
      );
      throw new UnauthorizedError('authentication failed');
    }

    const email = resolveUserEmail(payload);

    try {
      await prisma.user.upsert({
        where: { id: payload.sub },
        update: { email },
        create: {
          id: payload.sub,
          email,
        },
      });
    } catch (err) {
      fastify.log.error({ err, userId: payload.sub }, 'auth: failed to sync local user');
      throw err;
    }

    request.user = {
      id: payload.sub,
      email,
      role: payload.role ?? 'authenticated',
    };
  });
};

export default fp(authPlugin, {
  name: 'craftly-auth',
  fastify: '5.x',
});
