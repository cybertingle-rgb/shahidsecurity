import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './db/schema/index.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.ADMIN_DATABASE_URL ?? 'mysql://root@127.0.0.1:3306/shahid_security_admin_dev',
  },
});
