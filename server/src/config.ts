import fs from 'node:fs';
import path from 'node:path';

const serverRoot = path.resolve(import.meta.dirname, '..');
const envFile = path.join(serverRoot, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const env = process.env;

export const config = {
  isProd: env.NODE_ENV === 'production',
  port: Number(env.PORT ?? 3333),
  appUrl: (env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  jwtSecret: env.JWT_SECRET ?? 'dev-secret-change-me',
  jwtExpiresIn: '7d',
  dbPath: path.resolve(serverRoot, env.DATABASE_PATH ?? 'data/multiverso.db'),
  uploadsDir: path.resolve(serverRoot, env.UPLOADS_DIR ?? 'uploads'),
  webDist: path.resolve(serverRoot, '../web/dist'),
  migrationsDir: path.resolve(serverRoot, 'src/db/migrations'),
  timezone: env.APP_TIMEZONE ?? 'America/Sao_Paulo',
  admin: {
    name: env.ADMIN_NAME ?? 'Administrador Multiverso',
    email: env.ADMIN_EMAIL ?? 'admin@multiverso.rpv',
    password: env.ADMIN_PASSWORD ?? 'admin12345',
  },
  smtp: {
    host: env.SMTP_HOST ?? '',
    port: Number(env.SMTP_PORT ?? 587),
    secure: env.SMTP_SECURE === 'true',
    user: env.SMTP_USER ?? '',
    pass: env.SMTP_PASS ?? '',
  },
  mailFrom: env.MAIL_FROM ?? 'Multiverso Rio Pomba Valley <nao-responda@multiverso.rpv>',
};

if (config.isProd && config.jwtSecret === 'dev-secret-change-me') {
  console.error('[config] JWT_SECRET não definido em produção. Defina-o no arquivo .env.');
  process.exit(1);
}
