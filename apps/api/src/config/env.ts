// Environment validation — runs ONCE at process startup.
// Fails fast with a clear message if required vars are missing or malformed.
// This prevents "works locally, breaks in prod" cases from silent env typos.

import { z } from 'zod';

const optionalEnvString = () =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    },
    z.string().min(1).optional(),
  );

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .default('info'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),

    // Prisma — see .env.example for the pooler vs direct distinction.
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),

    // Supabase JWT verification.
    SUPABASE_JWT_ISSUER: z.string().url(),
    SUPABASE_JWT_AUDIENCE: z.string().default('authenticated'),
    SUPABASE_JWKS_URL: optionalEnvString().pipe(z.string().url().optional()),
    SUPABASE_JWT_SECRET: optionalEnvString(),
  })
  .refine(
    (data) => Boolean(data.SUPABASE_JWKS_URL) || Boolean(data.SUPABASE_JWT_SECRET),
    {
      message: 'must provide either SUPABASE_JWKS_URL or SUPABASE_JWT_SECRET',
      path: ['SUPABASE_JWKS_URL'],
    },
  );

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;

  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const flat = result.error.flatten().fieldErrors;
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment configuration:');
    for (const [key, errs] of Object.entries(flat)) {
      // eslint-disable-next-line no-console
      console.error(`  - ${key}: ${errs?.join(', ')}`);
    }
    throw new Error('environment validation failed');
  }

  cached = result.data;
  return cached;
}
