import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

// Runs against a real local MySQL test database
// (shahid_security_admin_test), never the dev or production database —
// see tests/globalSetup.ts. Same pattern as apps/learn/vitest.config.ts.
export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './tests/globalSetup.ts',
    // Shared test database, truncated between tests — not safe to
    // parallelize across files for this suite's size.
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.TEST_APP_DATABASE_URL ?? 'mysql://admin_dev:admin_dev_password@127.0.0.1:3306/shahid_security_admin_test',
      SESSION_SECRET: 'test-only-session-secret-not-for-real-use-32chars',
      TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
      NEXT_PUBLIC_APP_URL: 'http://localhost:3200',
      NODE_ENV: 'test',
    },
  },
  resolve: {
    alias: {
      '@': `${rootDir}src`,
    },
  },
});
