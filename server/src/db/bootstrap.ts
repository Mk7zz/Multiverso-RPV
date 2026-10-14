import { config } from '../config';
import { syncBadges } from '../lib/gamification';
import { hashPassword } from '../lib/security';
import { get, migrate, run } from './index';

/** Executado na inicialização: migrações, medalhas e garantia de um administrador. */
export function bootstrap() {
  migrate();
  syncBadges();
  if (!get("SELECT id FROM users WHERE role = 'admin'")) {
    run(
      "INSERT INTO users (name, email, password_hash, role, municipality) VALUES (?, ?, ?, 'admin', 'Rio Pomba')",
      config.admin.name,
      config.admin.email,
      hashPassword(config.admin.password),
    );
    console.log(`[db] administrador criado: ${config.admin.email} (altere a senha após o primeiro acesso)`);
  }
}
