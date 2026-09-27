import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

// Runs against a real local Postgres test database (learn_with_shahid_test),
// never the dev or a production database — see tests/setup.ts.
export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './tests/globalSetup.ts',
    // All test files share one real Postgres database and each resets it
    // in beforeEach — running files in parallel races truncation against
    // other files' queries. Not worth a throwaway database per worker for
    // this V1 suite's size.
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://learn_dev:learn_dev_password@localhost:5432/learn_with_shahid_test',
      SESSION_SECRET: 'test-only-session-secret-not-for-real-use-32chars',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NODE_ENV: 'test',
    },
  },
  resolve: {
    alias: {
      '@': `${rootDir}src`,
    },
  },
});
