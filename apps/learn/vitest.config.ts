import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

// Runs against a real local MySQL test database (learn_with_shahid_test),
// never the dev or a production database — see tests/globalSetup.ts.
export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './tests/globalSetup.ts',
    // All test files share one real MySQL database and each resets it
    // in beforeEach — running files in parallel races truncation against
    // other files' queries. Not worth a throwaway database per worker for
    // this V1 suite's size.
    fileParallelism: false,
    env: {
      // The app's own narrow runtime user (matches what's actually
      // deployed) — see src/db/apply-grants.ts. globalSetup.ts uses
      // TEST_DATABASE_URL (a full-privilege connection) separately, only
      // to run the migrator, which needs DDL this user deliberately lacks.
      DATABASE_URL: process.env.TEST_APP_DATABASE_URL ?? 'mysql://learn_app:learn_app_password@127.0.0.1:3306/learn_with_shahid_test',
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
