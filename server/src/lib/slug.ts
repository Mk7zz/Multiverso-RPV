import { get } from '../db';

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Gera slug único para a tabela informada (trails | courses). */
export function uniqueSlug(table: 'trails' | 'courses', text: string, ignoreId?: number): string {
  const base = slugify(text) || 'item';
  let slug = base;
  for (let i = 2; get(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`, slug, ignoreId ?? 0); i++) {
    slug = `${base}-${i}`;
  }
  return slug;
}
