import { defineConfig } from 'drizzle-kit';

// DATABASE_URL only needs to be set to actually run db:generate/db:migrate
// against a real Supabase project — see README.md "Database & Auth setup".
export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
