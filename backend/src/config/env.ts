import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string(),
  OPENAI_API_KEY: z.string(),
  CORS_ORIGIN: z.string().default('*'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
