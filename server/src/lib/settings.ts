import { all, run } from '../db';

/** Configurações gerais editáveis pelo administrador. */
export const SETTING_DEFAULTS = {
  platform_name: 'Multiverso Rio Pomba Valley',
  platform_tagline: 'Cursos gratuitos para a juventude da Zona da Mata',
  support_email: 'contato@multiverso.rpv',
  allow_registration: 'true',
  abandonment_days: '30',
  active_days: '7',
  certificate_signer_name: 'Instituto Energisa',
  certificate_signer_role: 'Rio Pomba Valley',
  points_lesson: '10',
  points_exercise: '5',
  points_quiz_pass: '30',
  points_course_complete: '100',
  points_daily_study: '5',
  points_quest_daily: '15',
  points_quest_weekly: '60',
  points_quest_chest: '30',
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export function getSettings(): Record<SettingKey, string> {
  const rows = all<{ key: string; value: string }>('SELECT key, value FROM settings');
  const result: Record<string, string> = { ...SETTING_DEFAULTS };
  for (const r of rows) if (r.key in SETTING_DEFAULTS) result[r.key] = r.value;
  return result as Record<SettingKey, string>;
}

export function getSetting(key: SettingKey): string {
  return getSettings()[key];
}

export const getNumberSetting = (key: SettingKey) => Number(getSetting(key)) || 0;

export function saveSettings(values: Partial<Record<SettingKey, string>>) {
  for (const [key, value] of Object.entries(values)) {
    if (!(key in SETTING_DEFAULTS) || value === undefined) continue;
    run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, String(value));
  }
}
